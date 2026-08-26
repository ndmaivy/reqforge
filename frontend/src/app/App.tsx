import { useCallback, useEffect, useState } from "react";
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
import { Reports } from "./components/Reports";
import { AuthPage } from "./components/AuthPage";
import { PublicFeedbackPage } from "./components/PublicFeedbackPage";
import { ProjectSettings } from "./components/ProjectSettings";
import type {
  Project, Platform, FeedbackItem, FeedbackCategory, FeedbackSource,
  Requirement, RequirementIssue, RequirementStatus, RequirementType, Activity,
} from "./data/mockData";
import type { CreateProjectFormData } from "./components/ProjectsPage";
import {
  clearAccessToken,
  getAccessToken,
  getErrorMessage,
  setAccessToken,
  UNAUTHORIZED_EVENT,
} from "../services/api";
import { getCurrentUser } from "../services/auth";
import type { AuthResponse, AuthUser } from "../types/auth";
import {
  createProject as createProjectRequest,
  archiveProject as archiveProjectRequest,
  getProject,
  leaveProject as leaveProjectRequest,
  listProjects,
  updateProject as updateProjectRequest,
} from "../services/projects";
import type { ProjectDto, ProjectUpdateRequest } from "../types/project";
import {
  archiveFeedback as archiveFeedbackRequest,
  createFeedback as createFeedbackRequest,
  getFeedback as getFeedbackRequest,
  importFeedback as importFeedbackRequest,
  listFeedback,
  listSimilarFeedback,
  updateFeedback as updateFeedbackRequest,
} from "../services/feedback";
import type { FeedbackCreateRequest, FeedbackDto, FeedbackImportResult, SimilarFeedbackDto } from "../types/feedback";
import {
  pollAnalysisRun,
  listAnalysisRuns,
  listConsistencyFindings,
  startFeedbackAnalysis,
  startConsistencyCheck,
  startRequirementGeneration,
  startRequirementValidation,
  transitionConsistencyFinding,
} from "../services/analysis";
import type { AnalysisRunDto, ConsistencyFindingDto, FeedbackAnalysisRequest } from "../types/analysis";
import {
  confirmNeed as confirmNeedRequest,
  getNeedTrends,
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
import {
  approveRequirement as approveRequirementRequest,
  archiveRequirement as archiveRequirementRequest,
  createRequirement as createRequirementRequest,
  dismissRequirementIssue,
  getRequirement as getRequirementRequest,
  getRequirementEvidence,
  listRequirementIssues,
  listRequirements,
  rejectRequirement as rejectRequirementRequest,
  resolveRequirementIssue,
  updateRequirement as updateRequirementRequest,
} from "../services/requirements";
import type {
  RequirementApprovalRequest,
  RequirementCreateRequest,
  RequirementDetailDto,
  RequirementDto,
  RequirementEvidenceDto,
  RequirementIssueDto,
  RequirementTypeDto,
  RequirementUpdateRequest,
  RequirementViewModel,
} from "../types/requirement";

type Screen = "dashboard" | "feedback" | "user-needs" | "requirements" | "analysis" | "reports" | "settings";

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

const feedbackCategoryToDto: Record<FeedbackCategory, string | null> = {
  Unclassified: null,
  Usability: "USABILITY",
  "Feature Request": "FEATURE_REQUEST",
  Bug: "BUG",
  Complaint: "COMPLAINT",
  Suggestion: "SUGGESTION",
  "Non-functional": "NON_FUNCTIONAL",
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
    status: project.status === "ARCHIVED" ? "Archived" : "Active",
    feedbackCount: 0,
    needsCount: 0,
    requirementsCount: 0,
    openIssues: 0,
    updatedAt: project.updated_at.slice(0, 10),
    goal: project.goal ?? undefined,
    targetUsers: project.target_users.join(", ") || undefined,
    mainFeatures: project.main_features.join(", ") || undefined,
    productName: project.product_name ?? undefined,
    additionalContext: project.additional_context ?? undefined,
    currentUserRole: project.current_user_role ?? undefined,
    archivedAt: project.archived_at ?? undefined,
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
    userSegment: feedback.user_segment ?? undefined,
    context: feedback.context ?? undefined,
    notes: feedback.notes ?? undefined,
    publicFormId: feedback.public_form_id ?? undefined,
    submittedById: feedback.submitted_by_id ?? undefined,
    archivedAt: feedback.archived_at ?? undefined,
  };
}

function toUiNeed(
  need: UserNeedDto,
  evidenceCount = 0,
  trend?: string,
): UserNeedViewModel {
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
    trend,
  };
}

const requirementStatuses: Record<RequirementDto["status"], RequirementStatus> = {
  DRAFT: "Draft",
  NEEDS_REVIEW: "Needs Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

const requirementTypes: Record<RequirementTypeDto, RequirementType> = {
  FUNCTIONAL: "Functional",
  USABILITY: "Usability",
  INTERACTION: "Interaction",
  ACCESSIBILITY: "Accessibility",
  NON_FUNCTIONAL: "Non-functional",
};

function toUiRequirement(
  requirement: RequirementDto | RequirementDetailDto,
  previous?: RequirementViewModel,
): RequirementViewModel {
  const score = requirement.confidence === null ? null : Number(requirement.confidence);
  const sourceNeedIds = "needs" in requirement
    ? requirement.needs.map((need) => need.id)
    : previous?.sourceNeedIds ?? [];
  const issueCount = "issues" in requirement
    ? requirement.issues.filter((issue) => issue.status === "OPEN").length
    : previous?.issueCount ?? 0;

  return {
    id: requirement.id,
    projectId: requirement.project_id,
    title: requirement.title,
    description: requirement.description,
    type: requirementTypes[requirement.type],
    status: requirementStatuses[requirement.status],
    confidence: score !== null && score >= 0.8 ? "High" : score !== null && score >= 0.5 ? "Medium" : "Low",
    confidenceScore: Number.isFinite(score) ? score : null,
    issueCount,
    sourceNeedId: sourceNeedIds[0],
    sourceNeedIds,
    sourceType: requirement.source_type,
    sourceReference: requirement.source_reference ?? undefined,
    additionalContext: requirement.additional_context ?? undefined,
    createdAt: requirement.created_at,
    updatedAt: requirement.updated_at,
    validationOutdated: "validation_outdated" in requirement
      ? requirement.validation_outdated
      : previous?.validationOutdated ?? true,
    latestValidationRunId: "latest_validation_run_id" in requirement
      ? requirement.latest_validation_run_id
      : previous?.latestValidationRunId ?? null,
  };
}

function issueType(value: string): RequirementIssue["type"] {
  const normalized = value.toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized.includes("MISSING")) return "Missing Information";
  if (normalized.includes("ASSUMPTION") || normalized.includes("UNSUPPORTED")) return "Unsupported Assumption";
  if (normalized.includes("DRIFT")) return "Intent Drift";
  return "Inconsistency";
}

function issueSeverity(value: string): RequirementIssue["severity"] {
  return value.toUpperCase() === "HIGH" ? "High" : value.toUpperCase() === "MEDIUM" ? "Medium" : "Low";
}

function issueStatus(value: string): RequirementIssue["status"] {
  return value.toUpperCase() === "RESOLVED" ? "Resolved" : value.toUpperCase() === "DISMISSED" ? "Dismissed" : "Open";
}

function toUiRequirementIssue(issue: RequirementIssueDto, projectId: string): RequirementIssue {
  return {
    id: issue.id,
    requirementId: issue.requirement_id,
    projectId,
    type: issueType(issue.issue_type),
    severity: issueSeverity(issue.severity),
    description: issue.description,
    suggestion: issue.suggestion ?? issue.evidence ?? "Review the source evidence and update the requirement.",
    status: issueStatus(issue.status),
    origin: "requirement",
  };
}

function toUiConsistencyFinding(finding: ConsistencyFindingDto): RequirementIssue {
  return {
    id: finding.id,
    requirementId: finding.requirement_id ?? finding.need_id ?? "Project",
    projectId: finding.project_id,
    type: issueType(finding.finding_type),
    severity: issueSeverity(finding.severity),
    description: finding.description,
    suggestion: finding.suggestion ?? finding.evidence ?? "Review this cross-project finding.",
    status: issueStatus(finding.status),
    origin: "consistency",
  };
}

function analysisRunActivity(run: AnalysisRunDto): Activity {
  const operation = run.analysis_type.toLowerCase().replace(/_/g, " ");
  return {
    id: run.id,
    projectId: run.project_id,
    text: `${operation} ${run.status.toLowerCase()}${run.model ? ` with ${run.model}` : ""}`,
    type: run.status === "FAILED" ? "issue" : run.analysis_type === "FEEDBACK_ANALYSIS" ? "feedback" : run.analysis_type === "REQUIREMENT_GENERATION" || run.analysis_type === "REQUIREMENT_VALIDATION" ? "requirement" : "issue",
    linkedScreen: "analysis",
    date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(run.created_at)),
  };
}

function ReqForgeApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
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
  const [allRequirements, setAllRequirements] = useState<RequirementViewModel[]>([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [allIssues, setAllIssues] = useState<RequirementIssue[]>([]);
  const [analysisRuns, setAnalysisRuns] = useState<AnalysisRunDto[]>([]);
  const [consistencyFindings, setConsistencyFindings] = useState<ConsistencyFindingDto[]>([]);

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
      const [response, trends] = await Promise.all([
        listNeeds(projectId),
        getNeedTrends(projectId).catch(() => null),
      ]);
      const trendByNeed = new Map(
        (trends?.series ?? []).map((series) => {
          const trend = series.classification === "RISING"
            ? `↑ ${series.delta} this period`
            : series.classification === "FALLING"
              ? `↓ ${Math.abs(series.delta)} this period`
              : series.classification === "NEW"
                ? "New this period"
                : "→ Stable";
          return [series.need_id, trend] as const;
        }),
      );
      setAllNeeds(response.data.map((need) => toUiNeed(need, 0, trendByNeed.get(need.id))));
    } catch (error) {
      setAllNeeds([]);
      setNeedsError(getErrorMessage(error, "Unable to load user needs."));
    } finally {
      setNeedsLoading(false);
    }
  }, []);

  const loadRequirements = useCallback(async (projectId: string) => {
    setRequirementsLoading(true);
    setRequirementsError(null);
    try {
      const response = await listRequirements(projectId);
      setAllRequirements(response.data.map((requirement) => toUiRequirement(requirement)));
      const issueGroups = await Promise.all(
        response.data.map((requirement) => listRequirementIssues(projectId, requirement.id)),
      );
      setAllIssues(issueGroups.flat().map((issue) => toUiRequirementIssue(issue, projectId)));
    } catch (error) {
      setAllRequirements([]);
      setRequirementsError(getErrorMessage(error, "Unable to load requirements."));
    } finally {
      setRequirementsLoading(false);
    }
  }, []);

  const loadAnalysisData = useCallback(async (projectId: string) => {
    const [runs, findings] = await Promise.all([
      listAnalysisRuns(projectId),
      listConsistencyFindings(projectId),
    ]);
    setAnalysisRuns(runs.data);
    setConsistencyFindings(findings);
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
      setAllRequirements([]);
      setRequirementsError(null);
      setRequirementsLoading(false);
      setAllIssues([]);
      setAnalysisRuns([]);
      setConsistencyFindings([]);
      return;
    }
    void Promise.all([
      loadFeedback(activeProject.id),
      loadNeeds(activeProject.id),
      loadRequirements(activeProject.id),
      loadAnalysisData(activeProject.id),
    ]);
  }, [activeProject?.id, loadAnalysisData, loadFeedback, loadNeeds, loadRequirements]);

  // Derived — data for current project
  const proj = activeProject!;
  const projectFeedback = activeProject ? allFeedback.filter((f) => f.projectId === activeProject.id) : [];
  const projectNeeds = activeProject ? allNeeds.filter((n) => n.projectId === activeProject.id) : [];
  const projectRequirements = activeProject ? allRequirements.filter((r) => r.projectId === activeProject.id) : [];
  const projectIssues = activeProject ? [
    ...allIssues.filter((i) => i.projectId === activeProject.id),
    ...consistencyFindings.filter((finding) => finding.project_id === activeProject.id).map(toUiConsistencyFinding),
  ] : [];
  const projectActivities = activeProject ? analysisRuns.filter((run) => run.project_id === activeProject.id).map(analysisRunActivity) : [];

  // Updaters
  const addFeedback = (item: FeedbackItem) => setAllFeedback((prev) => [item, ...prev]);
  const updateFeedback = (id: string, changes: Partial<FeedbackItem>) =>
    setAllFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, ...changes } : f)));

  const recordFeedback = async (payload: FeedbackCreateRequest): Promise<void> => {
    if (!activeProject) throw new Error("No active project selected.");
    await createFeedbackRequest(activeProject.id, payload);
    await loadFeedback(activeProject.id);
  };

  const importFeedback = async (file: File): Promise<FeedbackImportResult> => {
    if (!activeProject) throw new Error("No active project selected.");
    const result = await importFeedbackRequest(activeProject.id, file);
    await loadFeedback(activeProject.id);
    return result;
  };

  const loadFeedbackDetail = async (feedbackId: string): Promise<FeedbackItem> => {
    if (!activeProject) throw new Error("No active project selected.");
    return toUiFeedback(await getFeedbackRequest(activeProject.id, feedbackId));
  };

  const loadSimilarFeedback = async (feedbackId: string): Promise<SimilarFeedbackDto[]> => {
    if (!activeProject) throw new Error("No active project selected.");
    return listSimilarFeedback(activeProject.id, feedbackId);
  };

  const saveFeedback = async (
    feedbackId: string,
    content: string,
    category: FeedbackCategory,
    isNoise: boolean,
  ): Promise<FeedbackItem> => {
    if (!activeProject) throw new Error("No active project selected.");
    const updated = toUiFeedback(
      await updateFeedbackRequest(activeProject.id, feedbackId, {
        content,
        category: feedbackCategoryToDto[category],
        is_noise: isNoise,
      }),
    );
    setAllFeedback((prev) => prev.map((item) => (item.id === feedbackId ? updated : item)));
    return updated;
  };

  const archiveFeedback = async (feedbackId: string): Promise<FeedbackItem> => {
    if (!activeProject) throw new Error("No active project selected.");
    const archived = toUiFeedback(await archiveFeedbackRequest(activeProject.id, feedbackId));
    setAllFeedback((prev) => prev.map((item) => (item.id === feedbackId ? archived : item)));
    return archived;
  };

  const analyzeFeedback = async (
    payload: FeedbackAnalysisRequest,
    signal?: AbortSignal,
  ): Promise<AnalysisRunDto> => {
    if (!activeProject) throw new Error("No active project selected.");
    const projectId = activeProject.id;
    const accepted = await startFeedbackAnalysis(projectId, payload, crypto.randomUUID());
    const run = await pollAnalysisRun(projectId, accepted.analysis_run_id, { signal });
    if (run.status === "FAILED") {
      throw new Error(run.error_message || "Feedback analysis failed.");
    }
    await Promise.all([loadFeedback(projectId), loadNeeds(projectId)]);
    return run;
  };

  const loadNeedDetail = async (needId: string): Promise<UserNeedDetailDto> => {
    if (!activeProject) throw new Error("No active project selected.");
    return getNeedRequest(activeProject.id, needId);
  };

  const replaceNeed = (need: UserNeedDto, evidenceCount = 0): UserNeedViewModel => {
    const previous = allNeeds.find((item) => item.id === need.id);
    const mapped = toUiNeed(need, evidenceCount || previous?.evidenceCount || 0, previous?.trend);
    setAllNeeds((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
    return mapped;
  };

  const saveNeed = async (needId: string, payload: UserNeedUpdateRequest): Promise<UserNeedViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    return replaceNeed(await updateNeedRequest(activeProject.id, needId, payload));
  };

  const confirmNeed = async (needId: string): Promise<UserNeedViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    return replaceNeed(await confirmNeedRequest(activeProject.id, needId));
  };

  const rejectNeed = async (needId: string): Promise<UserNeedViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    return replaceNeed(await rejectNeedRequest(activeProject.id, needId));
  };

  const storeRequirement = (requirement: RequirementViewModel): RequirementViewModel => {
    setAllRequirements((prev) => {
      const exists = prev.some((item) => item.id === requirement.id);
      return exists
        ? prev.map((item) => (item.id === requirement.id ? requirement : item))
        : [requirement, ...prev];
    });
    return requirement;
  };

  const loadRequirementDetail = async (requirementId: string): Promise<RequirementViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    const current = allRequirements.find((item) => item.id === requirementId);
    return storeRequirement(
      toUiRequirement(await getRequirementRequest(activeProject.id, requirementId), current),
    );
  };

  const createRequirement = async (
    payload: RequirementCreateRequest,
  ): Promise<RequirementViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    const created = await createRequirementRequest(activeProject.id, payload);
    return storeRequirement(
      toUiRequirement(await getRequirementRequest(activeProject.id, created.id)),
    );
  };

  const saveRequirement = async (
    requirementId: string,
    payload: RequirementUpdateRequest,
  ): Promise<RequirementViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    await updateRequirementRequest(activeProject.id, requirementId, payload);
    return loadRequirementDetail(requirementId);
  };

  const approveRequirement = async (
    requirementId: string,
    payload: RequirementApprovalRequest,
  ): Promise<RequirementViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    await approveRequirementRequest(activeProject.id, requirementId, payload);
    return loadRequirementDetail(requirementId);
  };

  const rejectRequirement = async (requirementId: string): Promise<RequirementViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    await rejectRequirementRequest(activeProject.id, requirementId);
    return loadRequirementDetail(requirementId);
  };

  const archiveRequirement = async (requirementId: string): Promise<RequirementViewModel> => {
    if (!activeProject) throw new Error("No active project selected.");
    await archiveRequirementRequest(activeProject.id, requirementId);
    return loadRequirementDetail(requirementId);
  };

  const loadRequirementEvidence = async (
    requirementId: string,
  ): Promise<RequirementEvidenceDto> => {
    if (!activeProject) throw new Error("No active project selected.");
    return getRequirementEvidence(activeProject.id, requirementId);
  };

  const generateRequirements = async (
    needIds: string[],
    signal?: AbortSignal,
  ): Promise<AnalysisRunDto> => {
    if (!activeProject) throw new Error("No active project selected.");
    const projectId = activeProject.id;
    const accepted = await startRequirementGeneration(
      projectId,
      { need_ids: needIds },
      crypto.randomUUID(),
    );
    const run = await pollAnalysisRun(projectId, accepted.analysis_run_id, { signal });
    if (run.status === "FAILED") {
      throw new Error(run.error_message || "Requirement generation failed.");
    }
    await loadRequirements(projectId);
    return run;
  };

  const loadRequirementIssues = async (requirementId: string): Promise<RequirementIssueDto[]> => {
    if (!activeProject) throw new Error("No active project selected.");
    return listRequirementIssues(activeProject.id, requirementId);
  };

  const transitionRequirementIssue = async (
    requirementId: string,
    issueId: string,
    action: "resolve" | "dismiss",
  ): Promise<RequirementIssueDto> => {
    if (!activeProject) throw new Error("No active project selected.");
    return action === "resolve"
      ? resolveRequirementIssue(activeProject.id, requirementId, issueId)
      : dismissRequirementIssue(activeProject.id, requirementId, issueId);
  };

  const validateRequirement = async (
    requirementId: string,
    signal?: AbortSignal,
  ): Promise<{
    run: AnalysisRunDto;
    requirement: RequirementViewModel;
    issues: RequirementIssueDto[];
  }> => {
    if (!activeProject) throw new Error("No active project selected.");
    const projectId = activeProject.id;
    const accepted = await startRequirementValidation(
      projectId,
      requirementId,
      crypto.randomUUID(),
    );
    const run = await pollAnalysisRun(projectId, accepted.analysis_run_id, { signal });
    if (run.status === "FAILED") {
      throw new Error(run.error_message || "Requirement validation failed.");
    }
    const [detail, issues] = await Promise.all([
      getRequirementRequest(projectId, requirementId),
      listRequirementIssues(projectId, requirementId),
    ]);
    const current = allRequirements.find((item) => item.id === requirementId);
    const requirement = storeRequirement(toUiRequirement(detail, current));
    return { run, requirement, issues };
  };

  const runConsistency = async (signal?: AbortSignal): Promise<AnalysisRunDto> => {
    if (!activeProject) throw new Error("No active project selected.");
    const projectId = activeProject.id;
    const accepted = await startConsistencyCheck(projectId, crypto.randomUUID());
    const run = await pollAnalysisRun(projectId, accepted.analysis_run_id, { signal });
    if (run.status === "FAILED") throw new Error(run.error_message || "Consistency check failed.");
    await loadAnalysisData(projectId);
    return run;
  };

  const transitionAnalysisIssue = async (
    issue: RequirementIssue,
    action: "resolve" | "dismiss",
  ): Promise<void> => {
    if (!activeProject) throw new Error("No active project selected.");
    if (issue.origin === "consistency") {
      const updated = await transitionConsistencyFinding(activeProject.id, issue.id, action);
      setConsistencyFindings((current) => current.map((item) => item.id === updated.id ? updated : item));
      return;
    }
    const updated = action === "resolve"
      ? await resolveRequirementIssue(activeProject.id, issue.requirementId, issue.id)
      : await dismissRequirementIssue(activeProject.id, issue.requirementId, issue.id);
    setAllIssues((current) => current.map((item) => item.id === updated.id ? toUiRequirementIssue(updated, activeProject.id) : item));
  };

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
    const splitList = (value: string): string[] =>
      value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
    const created = await createProjectRequest({
      name: data.name,
      description: data.description,
      goal: data.goal || null,
      target_users: splitList(data.targetUsers),
      platform: data.platform,
      main_features: splitList(data.mainFeatures),
      additional_context: data.context || null,
    });
    const newProj = toUiProject(created);
    setProjects((prev) => [newProj, ...prev]);
    return newProj;
  };

  const updateActiveProject = async (payload: ProjectUpdateRequest): Promise<void> => {
    if (!activeProject) throw new Error("No active project selected.");
    const updated = toUiProject(await updateProjectRequest(activeProject.id, payload));
    setActiveProject(updated);
    setProjects((current) => current.map((project) => project.id === updated.id ? updated : project));
  };

  const archiveActiveProject = async (): Promise<void> => {
    if (!activeProject) throw new Error("No active project selected.");
    const updated = toUiProject(await archiveProjectRequest(activeProject.id));
    setProjects((current) => current.map((project) => project.id === updated.id ? updated : project));
    backToProjects();
    toast.success("Project archived");
  };

  const leaveActiveProject = async (): Promise<void> => {
    if (!activeProject) throw new Error("No active project selected.");
    const projectId = activeProject.id;
    await leaveProjectRequest(projectId);
    setProjects((current) => current.filter((project) => project.id !== projectId));
    backToProjects();
    toast.success("You left the project");
  };

  const navigate = (screen: string) => {
    setActiveScreen(screen as Screen);
    // If navigating to feedback and showAddFeedback was triggered from dashboard, keep it
  };

  if (view === "projects" || !activeProject) {
    return (
      <LanguageProvider>
        <div className="flex h-screen overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>
          <GlobalSidebar onGoToProjects={() => {}} user={user} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar user={user} onLogout={onLogout} />
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
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>
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
        user={user}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          project={proj}
          activeScreen={activeScreen}
          onBackToProjects={backToProjects}
          user={user}
          onLogout={onLogout}
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
              readOnly={proj.currentUserRole === "VIEWER" || proj.status === "Archived"}
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
              onImportFeedback={importFeedback}
              onLoadFeedbackDetail={loadFeedbackDetail}
              onLoadSimilarFeedback={loadSimilarFeedback}
              onSaveFeedback={saveFeedback}
              onArchiveFeedback={archiveFeedback}
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
              requirements={projectRequirements}
              loading={needsLoading}
              loadError={needsError}
              onRetry={() => loadNeeds(proj.id)}
              onLoadNeedDetail={loadNeedDetail}
              onSaveNeed={saveNeed}
              onConfirmNeed={confirmNeed}
              onRejectNeed={rejectNeed}
              onAnalyzeSourceFeedback={async (feedbackIds) => {
                await analyzeFeedback({ mode: "SELECTED", feedback_ids: feedbackIds });
              }}
              readOnly={proj.currentUserRole === "VIEWER" || proj.status === "Archived"}
            />
          )}

          {activeScreen === "requirements" && (
            <Requirements
              requirements={projectRequirements}
              needs={projectNeeds}
              feedback={projectFeedback}
              loading={requirementsLoading}
              loadError={requirementsError}
              onRetry={() => loadRequirements(proj.id)}
              onGenerateRequirements={generateRequirements}
              onLoadRequirementDetail={loadRequirementDetail}
              onCreateRequirement={createRequirement}
              onSaveRequirement={saveRequirement}
              onApproveRequirement={approveRequirement}
              onRejectRequirement={rejectRequirement}
              onArchiveRequirement={archiveRequirement}
              onLoadRequirementIssues={loadRequirementIssues}
              onLoadRequirementEvidence={loadRequirementEvidence}
              onTransitionRequirementIssue={transitionRequirementIssue}
              onValidateRequirement={validateRequirement}
              readOnly={proj.currentUserRole === "VIEWER" || proj.status === "Archived"}
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
              runs={analysisRuns.filter((run) => run.project_id === proj.id)}
              onRunConsistency={runConsistency}
              onTransitionIssue={transitionAnalysisIssue}
              readOnly={proj.currentUserRole === "VIEWER" || proj.status === "Archived"}
            />
          )}

          {activeScreen === "reports" && <Reports projectId={proj.id} />}

          {activeScreen === "settings" && (
            <ProjectSettings
              project={proj}
              onUpdate={updateActiveProject}
              onArchive={archiveActiveProject}
              onLeave={leaveActiveProject}
            />
          )}
        </div>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
    </LanguageProvider>
  );
}

export default function App() {
  const publicToken = window.location.pathname.match(/^\/feedback\/([^/]+)\/?$/)?.[1];
  if (publicToken) return <PublicFeedbackPage token={decodeURIComponent(publicToken)} />;

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setSessionLoading(false);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!getAccessToken()) {
        setSessionLoading(false);
        return;
      }
      try {
        setUser(await getCurrentUser());
      } catch {
        clearAccessToken();
        setUser(null);
      } finally {
        setSessionLoading(false);
      }
    };

    void restoreSession();
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const handleAuthenticated = (response: AuthResponse) => {
    setAccessToken(response.access_token);
    setUser(response.user);
    setSessionLoading(false);
  };

  if (sessionLoading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)", fontFamily: "var(--font-sans)" }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-blue-800 border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!user) return <AuthPage onAuthenticated={handleAuthenticated} />;

  return <ReqForgeApp user={user} onLogout={logout} />;
}
