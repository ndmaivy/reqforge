import { useState, useMemo } from "react";
import { Search, Plus, Globe, Smartphone, Monitor, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Project, Platform, ProjectStatus } from "../data/mockData";
import { Modal } from "./Modal";
import { SimpleSelect } from "./SimpleSelect";
import { useLanguage } from "../i18n/LanguageContext";
import { getErrorMessage } from "../../services/api";

const platformIcon = (p: Platform) => {
  if (p === "Mobile") return <Smartphone size={12} />;
  if (p === "Desktop") return <Monitor size={12} />;
  return <Globe size={12} />;
};

const statusColor: Record<ProjectStatus, { bg: string; text: string }> = {
  Active: { bg: "#ECFDF5", text: "#059669" },
  Review: { bg: "#FFFBEB", text: "#D97706" },
  Archived: { bg: "#F1F5F9", text: "#64748B" },
};

export interface CreateProjectFormData {
  name: string;
  description: string;
  goal: string;
  targetUsers: string;
  platform: Platform | "";
  mainFeatures: string;
  context: string;
}

const emptyForm = (): CreateProjectFormData => ({
  name: "", description: "", goal: "", targetUsers: "",
  platform: "", mainFeatures: "", context: "",
});

interface ProjectsPageProps {
  projects: Project[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void | Promise<void>;
  onOpenProject: (project: Project) => void | Promise<void>;
  onCreateProject: (data: CreateProjectFormData) => Promise<Project>;
}

export function ProjectsPage({
  projects,
  loading,
  loadError,
  onRetry,
  onOpenProject,
  onCreateProject,
}: ProjectsPageProps) {
  const { tr } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(tr.projects.allStatuses);
  const [platformFilter, setPlatformFilter] = useState<string>(tr.projects.allPlatforms);
  const [sortBy, setSortBy] = useState<string>(tr.projects.recentlyUpdated);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateProjectFormData>(emptyForm());
  const [errors, setErrors] = useState<Partial<CreateProjectFormData>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (statusFilter !== tr.projects.allStatuses) list = list.filter((p) => tr.status[p.status as keyof typeof tr.status] === statusFilter || p.status === statusFilter);
    if (platformFilter !== tr.projects.allPlatforms) list = list.filter((p) => p.platform === platformFilter);
    if (sortBy === tr.projects.nameAZ) list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === tr.projects.mostFeedback) list.sort((a, b) => b.feedbackCount - a.feedbackCount);
    else if (sortBy === tr.projects.mostRequirements) list.sort((a, b) => b.requirementsCount - a.requirementsCount);
    else list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [projects, search, statusFilter, platformFilter, sortBy, tr]);

  const validate = () => {
    const e: Partial<CreateProjectFormData> = {};
    if (!form.name.trim()) e.name = tr.projects.nameRequired;
    if (!form.description.trim()) e.description = tr.projects.descRequired;
    if (!form.platform) e.platform = tr.projects.platformRequired as Platform;
    return e;
  };

  const handleCreate = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const newProject = await onCreateProject({
        name: form.name.trim(),
        description: form.description.trim(),
        platform: form.platform as Platform,
        goal: form.goal.trim(),
        targetUsers: form.targetUsers.trim(),
        mainFeatures: form.mainFeatures.trim(),
        context: form.context.trim(),
      });
      setShowCreate(false);
      setForm(emptyForm());
      setErrors({});
      toast.success(tr.projects.created);
      void onOpenProject(newProject);
    } catch (error) {
      setCreateError(getErrorMessage(error, tr.projects.createError));
    } finally {
      setCreating(false);
    }
  };

  const field = (key: keyof CreateProjectFormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (createError) setCreateError(null);
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--background)" }}>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{tr.projects.title}</h1>
            <p style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "2px" }}>{tr.projects.subtitle}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
            style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}
          >
            <Plus size={14} /> {tr.projects.newProject}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-1"
            style={{ borderColor: "var(--border)", background: "#fff" }}
          >
            <Search size={13} style={{ color: "#94A3B8" }} />
            <input
              type="text"
              placeholder={tr.projects.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: "13px", color: "var(--foreground)" }}
            />
          </div>
          <SimpleSelect value={statusFilter} options={[tr.projects.allStatuses, tr.status.Active, tr.status.Review, tr.status.Archived]} onChange={setStatusFilter} />
          <SimpleSelect value={platformFilter} options={[tr.projects.allPlatforms, "Web", "Mobile", "Desktop", "Web + Mobile", "Other"]} onChange={setPlatformFilter} />
          <SimpleSelect value={sortBy} options={[tr.projects.recentlyUpdated, tr.projects.nameAZ, tr.projects.mostFeedback, tr.projects.mostRequirements]} onChange={setSortBy} />
          <span style={{ fontSize: "12px", color: "#94A3B8", marginLeft: "auto" }}>
            {tr.projects.projectCount(filtered.length)}
          </span>
        </div>

        {/* Project Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-blue-800 border-t-transparent animate-spin mb-4" />
            <p style={{ fontSize: "13.5px", color: "#64748B" }}>{tr.projects.loading}</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>{tr.projects.loadError}</p>
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "14px" }}>{loadError}</p>
            <button
              onClick={() => void onRetry()}
              className="px-4 py-2 rounded-md border hover:bg-gray-50 transition-colors"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#1E3A8A" }}
            >
              {tr.projects.retry}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#EFF6FF" }}>
              <Search size={20} style={{ color: "#1E3A8A" }} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>{tr.projects.noProjectsFound}</p>
            <p style={{ fontSize: "13.5px", color: "#64748B" }}>{tr.projects.noProjectsHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map((project) => {
              const sc = statusColor[project.status];
              return (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project)}
                  className="rounded-2xl border p-5 cursor-pointer transition-all group flex flex-col"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#BFDBFE"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(37,99,235,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                >
                  {/* Card header: logo + status badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 700, letterSpacing: "0" }}
                    >
                      {project.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="px-2 py-0.5 rounded-md shrink-0" style={{ background: sc.bg, color: sc.text, fontSize: "11px", fontWeight: 600 }}>
                      {sc.text === "#059669" ? "Active" : sc.text === "#D97706" ? "Review" : "Archived"}
                    </span>
                  </div>

                  {/* Title — single line with ellipsis */}
                  <h3
                    className="truncate"
                    style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px", lineHeight: 1.3 }}
                    title={project.name}
                  >
                    {project.name}
                  </h3>

                  {/* Description — 2-line clamp */}
                  <p style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5, marginBottom: "12px" }} className="line-clamp-2 flex-1">
                    {project.description}
                  </p>

                  {/* Platform chip */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <span style={{ color: "#94A3B8" }}>{platformIcon(project.platform)}</span>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>{project.platform}</span>
                  </div>

                  {/* Updated date */}
                  <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <p style={{ fontSize: "11px", color: "#94A3B8" }}>Updated {project.updatedAt}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <Modal title={tr.projects.createTitle} subtitle={tr.projects.createSubtitle} onClose={() => { setShowCreate(false); setForm(emptyForm()); setErrors({}); setCreateError(null); }} width="560px">
          <div className="px-5 py-5 space-y-4">
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                {tr.projects.projectName} <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
                placeholder={tr.projects.namePlaceholder}
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: errors.name ? "#DC2626" : "var(--border)", fontSize: "13px", color: "var(--foreground)", background: "#F8FAFC" }}
              />
              {errors.name && <p style={{ fontSize: "11.5px", color: "#DC2626", marginTop: "4px" }}>{errors.name}</p>}
            </div>
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                {tr.projects.description} <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                rows={3}
                placeholder={tr.projects.descPlaceholder}
                className="w-full rounded-md border px-3 py-2 outline-none resize-none"
                style={{ borderColor: errors.description ? "#DC2626" : "var(--border)", fontSize: "13px", color: "var(--foreground)", background: "#F8FAFC" }}
              />
              {errors.description && <p style={{ fontSize: "11.5px", color: "#DC2626", marginTop: "4px" }}>{errors.description}</p>}
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                {tr.projects.platform} <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <select
                value={form.platform}
                onChange={(e) => field("platform", e.target.value)}
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: errors.platform ? "#DC2626" : "var(--border)", fontSize: "13px", color: "var(--foreground)", background: "#F8FAFC" }}
              >
                <option value="">{tr.projects.selectPlatform}</option>
                {["Web", "Mobile", "Desktop", "Web + Mobile", "Other"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {errors.platform && <p style={{ fontSize: "11.5px", color: "#DC2626", marginTop: "4px" }}>{errors.platform}</p>}
            </div>

            {[
              { key: "goal" as const, label: tr.projects.goal, placeholder: tr.projects.goalPlaceholder },
              { key: "targetUsers" as const, label: tr.projects.targetUsers, placeholder: tr.projects.targetUsersPlaceholder },
              { key: "mainFeatures" as const, label: tr.projects.mainFeatures, placeholder: tr.projects.mainFeaturesPlaceholder },
              { key: "context" as const, label: tr.projects.additionalContext, placeholder: tr.projects.contextPlaceholder },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => field(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", color: "var(--foreground)", background: "#F8FAFC" }}
                />
              </div>
            ))}
          </div>
          {createError && (
            <div className="mx-5 mb-4 rounded-md px-3 py-2" style={{ background: "#FEF2F2", color: "#B91C1C", fontSize: "12px" }}>
              {createError}
            </div>
          )}
          <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => { setShowCreate(false); setForm(emptyForm()); setErrors({}); setCreateError(null); }} className="px-4 py-2 rounded-md border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>
              {tr.projects.cancel}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-white transition-all hover:opacity-90 disabled:opacity-70"
              style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}
            >
              {creating ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {tr.projects.creating}
                </>
              ) : tr.projects.create}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
