giimport { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { LanguageProvider } from "./i18n/LanguageContext";
import { Sidebar, GlobalSidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ProjectsPage } from "./components/ProjectsPage";
import { Dashboard } from "./components/Dashboard";
import { FeedbackManagement } from "./components/FeedbackManagement";
import { UserNeeds } from "./components/UserNeeds";
import { Requirements } from "./components/Requirements";
import { Analysis } from "./components/Analysis";
import {
  INITIAL_REQUIREMENTS,
  INITIAL_ISSUES, INITIAL_ACTIVITIES,
} from "./data/mockData";
import type {
  Project, Platform, FeedbackItem, FeedbackCategory, FeedbackSource,
  UserNeed, Requirement, RequirementIssue,
} from "./data/mockData";
import type { CreateProjectFormData } from "./components/ProjectsPage";
import { getErrorMessage } from "../services/api";
import {
  createProject as createProjectRequest,
  getProject,
  listProjects,
} from "../services/projects";
import type { ProjectDto } from "../types/project";
import {
  archiveFeedback as archiveFeedbackRequest,
  createFeedback as createFeedbackRequest,
  getFeedback as getFeedbackRequest,
  listFeedback,
  updateFeedback as updateFeedbackRequest,
} from "../services/feedback";
import type { FeedbackCreateRequest, FeedbackDto } from "../types/feedback";
import { pollAnalysisRun, startFeedbackAnalysis } from "../services/analysis";
import type { AnalysisRunDto, FeedbackAnalysisRequest } from "../types/analysis";
import {
  confirmNeed as confirmNeedRequest,
  getNeed as getNeedRequest,
  listNeeds,
  rejectNeed as rejectNeedRequest,
  updateNeed as updateNeedRequest,
} from "../services/needs";
import type {
  UserNeedDetailDto,
  UserNeedDto,
  UserNeedUpdateRequest,
  UserNeedViewModel,
} from "../types/userNeed";

type Screen = "dashboard" | "feedback" | "user-needs" | "requirements" | "analysis";

const supportedPlatforms: Platform[] = ["Web", "Mobile", "Desktop", "Web + Mobile", "Other"];
const supportedFeedbackSources: FeedbackSource[] = [
  "Interview", "Survey", "Usability Test", "App Review", "Support", "Email",
  "Public Feedback Form", "Manual Record", "Other",
];
const feedbackCategories: Record<string, FeedbackCategory> = {
  USABILITY: "Usability",
  FEATURE_REQUEST: "Feature Request",
  BUG: "Bug",
  COMPLAINT: "Complaint",
  SUGGESTION: "Suggestion",
  NON_FUNCTIONAL: "Non-functional",
};

function toUiProject(project: ProjectDto): Project {
  const platform = supportedPlatforms.includes(project.platform as Platform)
    ? (project.platform as Platform)
    : "Other";

  return {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    platform,
    status: "Active",
    feedbackCount: 0,
    needsCount: 0,
    requirementsCount: 0,
    openIssues: 0,
    updatedAt: project.updated_at.slice(0, 10),
    goal: project.goal ?? undefined,
    targetUsers: project.target_users ?? undefined,
  };
}

function toUiFeedback(feedback: FeedbackDto): FeedbackItem {
  const normalizedSource = (feedback.source ?? "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
  const source = supportedFeedbackSources.find(
    (item) => item.toLowerCase() === normalizedSource,
  ) ?? "Other";
  const categoryKey = (feedback.category ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const status = feedback.status === "ANALYZED"
    ? "Analyzed"
    : feedback.status === "ARCHIVED"
      ? "Archived"
      : "New";
  const dateValue = feedback.feedback_date ?? feedback.created_at;
  const parsedDate = new Date(dateValue);

  return {
    id: feedback.id,
    projectId: feedback.project_id,
    text: feedback.content,
    category: feedbackCategories[categoryKey] ?? "Unclassified",
    source,
    status,
    date: Number.isNaN(parsedDate.getTime())
      ? ""
      : new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(parsedDate),
    isNoise: feedback.is_noise,
  };
}

function toUiNeed(need: UserNeedDto, evidenceCount = 0): UserNeedViewModel {
  const score = need.confidence === null ? null : Number(need.confidence);
  const confidence = score !== null && score >= 0.8
    ? "High"
    : score !== null && score >= 0.5
      ? "Medium"
      : "Low";

  return {
    id: need.id,
    projectId: need.project_id,
    title: need.title,
    description: need.description,
    status: need.status === "CONFIRMED" ? "Confirmed" : need.status === "REJECTED" ? "Rejected" : "Candidate",
    confidence,
    confidenceScore: Number.isFinite(score) ? score : null,
    feedbackIds: [],
    evidenceCount,
  };
}

export default function App() {
  // Top-level view
  const [view, setView] = useState<"projects" | "workspace">("projects");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>("dashboard");

  // Global data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [allFeedback, setAllFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [allNeeds, setAllNeeds] = useState<UserNeedViewModel[]>([]);
  const [needsLoading, setNeedsLoading] = useState(false);
  const [needsError, setNeedsError] = useState<string | null>(null);
  const [allRequirements, setAllRequirements] = useState<Requirement[]>(INITIAL_REQUIREMENTS);
  const [allIssues, setAllIssues] = useState<RequirementIssue[]>(INITIAL_ISSUES);
  const [activities] = useState(INITIAL_ACTIVITIES);

  // Global modal flags (triggered from Dashboard quick actions)
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [showImportFeedback, setShowImportFeedback] = useState(false);
  const [showGenerateReqs, setShowGenerateReqs] = useState(false);
  const [showPublicLinkFromDash, setShowPublicLinkFromDash] = useState(false);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const response = await listProjects();
      setProjects(response.data.map(toUiProject));
    } catch (error) {
      setProjectsError(getErrorMessage(error, "Unable to load projects."));
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadFeedback = useCallback(async (projectId: string) => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const response = await listFeedback(projectId);
      setAllFeedback(response.data.map(toUiFeedback));
    } catch (error) {
      setAllFeedback([]);
      setFeedbackError(getErrorMessage(error, "Unable to load feedback."));
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  const loadNeeds = useCallback(async (projectId: string) => {
    setNeedsLoading(true);
    setNeedsError(null);
    try {
      const response = await listNeeds(projectId);
      setAllNeeds(response.data.map((need) => toUiNeed(need)));
    } catch (error) {
      setAllNeeds([]);
      setNeedsError(getErrorMessage(error, "Unable to load user needs."));
    } finally {
      setNeedsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!activeProject) {
      setAllFeedback([]);
      setFeedbackError(null);
      setFeedbackLoading(false);
      setAllNeeds([]);
      setNeedsError(null);
      setNeedsLoading(false);
      return;
    }
    void Promise.all([loadFeedback(activeProject.id), loadNeeds(activeProject.id)]);
  }, [activeProject?.id, loadFeedback, loadNeeds]);

  // Derived — data for current project
  const proj = activeProject!;
  const projectFeedback = activeProject ? allFeedback.filter((f) => f.projectId === activeProject.id) : [];
  const projectNeeds = activeProject ? allNeeds.filter((n) => n.projectId === activeProject.id) : [];
  const projectRequirements = activeProject ? allRequirements.filter((r) => r.projectId === activeProject.id) : [];
  const projectIssues = activeProject ? allIssues.filter((i) => i.projectId === activeProject.id) : [];
  const projectActivities = activeProject ? activities.filter((a) => a.projectId === activeProject.id) : [];

  // Updaters
  const addFeedback = (item: FeedbackItem) => setAllFeedback((prev) => [item, ...prev]);
  const updateFeedback = (id: string, changes: Partial<FeedbackItem>) =>
    setAllFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, ...changes } : f)));

  const recordFeedback = async (payload: FeedbackCreateRequest): Promise<void> => {
    if (!activeProject) throw new Error("No active project selected.");
    await createFeedbackRequest(activeProject.id, payload);
    await loadFeedback(activeProject.id);
  };

  const loadFeedbackDetail = async (feedbackId: string): Promise<FeedbackItem> =>
    toUiFeedback(await getFeedbackRequest(feedbackId));

  const saveFeedback = async (
    feedbackId: string,
    content: string,
    category: FeedbackCategory,
  ): Promise<FeedbackItem> => {
    const updated = toUiFeedback(await updateFeedbackRequest(feedbackId, { content }));
    const withUiCategory = { ...updated, category };
    setAllFeedback((prev) => prev.map((item) => (item.id === feedbackId ? withUiCategory : item)));
    return withUiCategory;
  };

  const archiveFeedback = async (feedbackId: string): Promise<FeedbackItem> => {
    const archived = toUiFeedback(await archiveFeedbackRequest(feedbackId));
    setAllFeedback((prev) => prev.map((item) => (item.id === feedbackId ? archived : item)));
    return archived;
  };

  const analyzeFeedback = async (
    payload: FeedbackAnalysisRequest,
    signal?: AbortSignal,
  ): Promise<AnalysisRunDto> => {
    if (!activeProject) throw new Error("No active project selected.");
    const accepted = await startFeedbackAnalysis(activeProject.id, payload);
    const run = await pollAnalysisRun(accepted.analysis_run_id, { signal });
    if (run.status === "FAILED") {
      throw new Error(run.error_message || "Feedback analysis failed.");
    }
    await Promise.all([loadFeedback(activeProject.id), loadNeeds(activeProject.id)]);
    return run;
  };

  const loadNeedDetail = async (needId: string): Promise<UserNeedDetailDto> =>
    getNeedRequest(needId);

  const replaceNeed = (need: UserNeedDto, evidenceCount = 0): UserNeedViewModel => {
    const mapped = toUiNeed(need, evidenceCount);
    setAllNeeds((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
    return mapped;
  };

  const saveNeed = async (needId: string, payload: UserNeedUpdateRequest): Promise<UserNeedViewModel> =>
    replaceNeed(await updateNeedRequest(needId, payload));

  const confirmNeed = async (needId: string): Promise<UserNeedViewModel> =>
    replaceNeed(await confirmNeedRequest(needId));

  const rejectNeed = async (needId: string): Promise<UserNeedViewModel> =>
    replaceNeed(await rejectNeedRequest(needId));

  const updateRequirement = (id: string, changes: Partial<Requirement>) =>
    setAllRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  const addRequirements = (reqs: Requirement[]) => setAllRequirements((prev) => [...prev, ...reqs]);

  const updateIssue = (id: string, changes: Partial<RequirementIssue>) =>
    setAllIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  const openProject = async (project: Project) => {
    const toastId = toast.loading("Loading project...");
    try {
      const detail = toUiProject(await getProject(project.id));
      setProjects((prev) => prev.map((item) => (item.id === detail.id ? detail : item)));
      setActiveProject(detail);
      setActiveScreen("dashboard");
      setView("workspace");
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load project details."), { id: toastId });
    }
  };

  const backToProjects = () => {
    setView("projects");
    setActiveProject(null);
    setShowAddFeedback(false);
    setShowImportFeedback(false);
    setShowGenerateReqs(false);
    setShowPublicLinkFromDash(false);
  };

  const createProject = async (data: CreateProjectFormData): Promise<Project> => {
    const created = await createProjectRequest({
      name: data.name,
      description: data.description,
      goal: data.goal || null,
      target_users: data.targetUsers || null,
      platform: data.platform,
    });
    const newProj = toUiProject(created);
    setProjects((prev) => [newProj, ...prev]);
    return newProj;
  };

  const navigate = (screen: string) => {
    setActiveScreen(screen as Screen);
    // If navigating to feedback and showAddFeedback was triggered from dashboard, keep it
  };

  if (view === "projects" || !activeProject) {
    return (
      <LanguageProvider>
        <div className="flex h-screen overflow-hidden" style={{ fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)" }}>
          <GlobalSidebar onGoToProjects={() => {}} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar />
            <ProjectsPage
              projects={projects}
              loading={projectsLoading}
              loadError={projectsError}
              onRetry={loadProjects}
              onOpenProject={openProject}
              onCreateProject={createProject}
            />
          </div>
          <Toaster position="bottom-right" richColors />
        </div>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)" }}>
      <Sidebar
        project={proj}
        allProjects={projects}
        onSwitchProject={openProject}
        activeScreen={activeScreen}
        onNavigate={(s) => setActiveScreen(s)}
        onBackToProjects={backToProjects}
        feedbackCount={projectFeedback.filter((f) => f.status === "New").length}
        needsCount={projectNeeds.filter((n) => n.status === "Candidate").length}
        openIssues={projectIssues.filter((i) => i.status === "Open").length}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          project={proj}
          activeScreen={activeScreen}
          onBackToProjects={backToProjects}
        />

        <div className="flex flex-1 overflow-hidden" style={{ background: "var(--background)" }}>
          {activeScreen === "dashboard" && (
            <Dashboard
              project={proj}
              feedback={projectFeedback}
              needs={projectNeeds}
              requirements={projectRequirements}
              activities={projectActivities}
              onNavigate={navigate}
              onOpenAddFeedback={() => { setActiveScreen("feedback"); setShowAddFeedback(true); }}
              onOpenImport={() => { setActiveScreen("feedback"); setShowImportFeedback(true); }}
              onRunAnalysis={() => { setActiveScreen("feedback"); }}
              onOpenGenerateReqs={() => { setActiveScreen("requirements"); setShowGenerateReqs(true); }}
              onOpenPublicLink={() => { setActiveScreen("feedback"); setShowPublicLinkFromDash(true); }}
            />
          )}

          {activeScreen === "feedback" && (
            <FeedbackManagement
              project={proj}
              feedback={projectFeedback}
              loading={feedbackLoading}
              loadError={feedbackError}
              onRetry={() => loadFeedback(proj.id)}
              onRecordFeedback={recordFeedback}
              onLoadFeedbackDetail={loadFeedbackDetail}
              onSaveFeedback={saveFeedback}
              onArchiveFeedback={archiveFeedback}
              onAddFeedback={addFeedback}
              onAnalyzeFeedback={analyzeFeedback}
              onNavigate={navigate}
              showAddModal={showAddFeedback}
              showImportModal={showImportFeedback}
              onCloseAddModal={() => setShowAddFeedback(false)}
              onCloseImportModal={() => setShowImportFeedback(false)}
              showPublicLinkModal={showPublicLinkFromDash}
              onClosePublicLinkModal={() => setShowPublicLinkFromDash(false)}
            />
          )}

          {activeScreen === "user-needs" && (
            <UserNeeds
              needs={projectNeeds}
              feedback={projectFeedback}
              requirements={projectRequirements}
              loading={needsLoading}
              loadError={needsError}
              onRetry={() => loadNeeds(proj.id)}
              onLoadNeedDetail={loadNeedDetail}
              onSaveNeed={saveNeed}
              onConfirmNeed={confirmNeed}
              onRejectNeed={rejectNeed}
            />
          )}

          {activeScreen === "requirements" && (
            <Requirements
              requirements={projectRequirements}
              needs={projectNeeds}
              feedback={projectFeedback}
              issues={projectIssues}
              onUpdateRequirement={updateRequirement}
              onAddRequirements={addRequirements}
              onUpdateIssue={updateIssue}
              projectId={proj.id}
              showGenerateModal={showGenerateReqs}
              onCloseGenerateModal={() => setShowGenerateReqs(false)}
            />
          )}

          {activeScreen === "analysis" && (
            <Analysis
              requirements={projectRequirements}
              issues={projectIssues}
              needs={projectNeeds}
              feedback={projectFeedback}
              onUpdateIssue={updateIssue}
            />
          )}
        </div>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
    </LanguageProvider>
  );
}
