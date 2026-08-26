import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, MessageSquare, Users, FileText, BarChart3, ClipboardCheck,
  ChevronDown, FolderOpen, Settings, HelpCircle,
  Search, Check, ArrowUpRight,
} from "lucide-react";
import logoImg from "../../imports/image.png";
import type { Project } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";
import type { AuthUser } from "../../types/auth";

type Screen = "dashboard" | "feedback" | "user-needs" | "requirements" | "analysis" | "reports" | "settings";

const ACTIVE_BG = "#EFF6FF";
const ACTIVE_TEXT = "#1E3A8A";
const INACTIVE_TEXT = "#6B7280";
const HOVER_BG = "#F8FAFC";

// ---- Global sidebar (Projects page) ----
interface GlobalSidebarProps {
  onGoToProjects: () => void;
  user: AuthUser;
}

export function GlobalSidebar({ onGoToProjects, user }: GlobalSidebarProps) {
  const { tr } = useLanguage();
  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-full border-r"
      style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      <Logo />

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <SectionLabel>{tr.nav.navigation}</SectionLabel>
        <NavBtn icon={FolderOpen} label={tr.nav.allProjects} active onClick={onGoToProjects} />
        <NavBtn icon={Settings} label={tr.nav.settings} onClick={() => {}} />
        <NavBtn icon={HelpCircle} label={tr.nav.helpDocs} onClick={() => {}} />
      </nav>

      <UserFooter user={user} />
    </aside>
  );
}

// ---- Workspace sidebar ----
interface WorkspaceSidebarProps {
  project: Project;
  allProjects: Project[];
  onSwitchProject: (p: Project) => void;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onBackToProjects: () => void;
  feedbackCount: number;
  needsCount: number;
  openIssues: number;
  user: AuthUser;
}

export function Sidebar({
  project, allProjects, onSwitchProject, activeScreen, onNavigate, onBackToProjects,
  feedbackCount, needsCount, openIssues, user,
}: WorkspaceSidebarProps) {
  const { tr } = useLanguage();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
        setSwitcherSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const otherProjects = allProjects
    .filter((p) => p.id !== project.id)
    .filter((p) => !switcherSearch.trim() || p.name.toLowerCase().includes(switcherSearch.toLowerCase()));

  const workspaceNav: { id: Screen; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: tr.nav.overview, icon: LayoutDashboard },
    { id: "feedback", label: tr.nav.feedback, icon: MessageSquare },
    { id: "user-needs", label: tr.nav.userNeeds, icon: Users },
    { id: "requirements", label: tr.nav.requirements, icon: FileText },
    { id: "analysis", label: tr.nav.analysis, icon: BarChart3 },
    { id: "reports", label: tr.nav.reports, icon: ClipboardCheck },
    { id: "settings", label: tr.nav.settings, icon: Settings },
  ];

  const badges: Partial<Record<Screen, number>> = {
    feedback: feedbackCount,
    "user-needs": needsCount,
    analysis: openIssues,
  };

  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-full border-r"
      style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      <Logo />

      {/* Project switcher */}
      <div ref={switcherRef} className="relative border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={() => { setSwitcherOpen((o) => !o); setSwitcherSearch(""); }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl w-full transition-colors hover:bg-blue-50"
            style={{ background: ACTIVE_BG }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white"
              style={{ background: "var(--primary)", fontSize: "9px", fontWeight: 700 }}
            >
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <p
              className="flex-1 text-left line-clamp-2"
              style={{ fontSize: "12px", fontWeight: 600, color: ACTIVE_TEXT, lineHeight: 1.3 }}
            >
              {project.name}
            </p>
            <ChevronDown
              size={12}
              style={{
                color: "#94A3B8", flexShrink: 0,
                transform: switcherOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </button>
        </div>

        {switcherOpen && (
          <div
            className="absolute left-2 right-2 z-50 rounded-xl border shadow-lg overflow-hidden"
            style={{ top: "calc(100% - 8px)", background: "#fff", borderColor: "var(--border)" }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Search size={11} style={{ color: "#94A3B8" }} />
                <input
                  autoFocus
                  type="text"
                  placeholder={tr.topbar.searchProjects}
                  value={switcherSearch}
                  onChange={(e) => setSwitcherSearch(e.target.value)}
                  className="flex-1 outline-none bg-transparent"
                  style={{ fontSize: "12px", color: "var(--foreground)" }}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#F8FAFC" }}>
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--primary)", fontSize: "8px", fontWeight: 700 }}
                >
                  {project.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 line-clamp-1" style={{ fontSize: "12px", color: "var(--foreground)", fontWeight: 500 }}>
                  {project.name}
                </span>
                <Check size={11} style={{ color: "#1E3A8A" }} />
              </div>
              {otherProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSwitchProject(p); setSwitcherOpen(false); setSwitcherSearch(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 transition-colors hover:bg-gray-50"
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
                    style={{ background: "#64748B", fontSize: "8px", fontWeight: 700 }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left line-clamp-1" style={{ fontSize: "12px", color: "var(--foreground)" }}>
                    {p.name}
                  </span>
                </button>
              ))}
              {otherProjects.length === 0 && switcherSearch && (
                <p className="px-3 py-2.5" style={{ fontSize: "12px", color: "#94A3B8" }}>No projects found</p>
              )}
            </div>
            <div className="border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => { onBackToProjects(); setSwitcherOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-gray-50"
                style={{ fontSize: "12px", color: "#1E3A8A", fontWeight: 500 }}
              >
                <ArrowUpRight size={12} /> {tr.nav.allProjects}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workspace nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        <SectionLabel>{tr.nav.workspace}</SectionLabel>
        {workspaceNav.map(({ id, label, icon: Icon }) => {
          const active = activeScreen === id;
          const badge = badges[id];
          return (
            <NavBtn
              key={id}
              icon={Icon}
              label={label}
              active={active}
              badge={badge}
              onClick={() => onNavigate(id)}
            />
          );
        })}

        <div className="pt-3">
          <SectionLabel>{tr.nav.system}</SectionLabel>
          <NavBtn icon={HelpCircle} label={tr.nav.helpDocs} onClick={() => {}} />
        </div>
      </nav>

      <UserFooter user={user} />
    </aside>
  );
}

// ---- Shared sub-components ----

function Logo() {
  return (
    <div className="px-4 py-3.5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
      <div className="flex items-center gap-2.5">
        <img src={logoImg} alt="ReqForge" className="w-8 h-8 rounded-lg object-cover shrink-0" />
        <span style={{ fontWeight: 700, fontSize: "14.5px", letterSpacing: "-0.02em" }}>
          <span style={{ color: "#60A5FA" }}>Req</span><span style={{ color: "#1E3A8A" }}>Forge</span>
        </span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-2 pb-1"
      style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#CBD5E1" }}
    >
      {children}
    </p>
  );
}

interface NavBtnProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}

function NavBtn({ icon: Icon, label, active = false, badge, onClick }: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors"
      style={{
        background: active ? ACTIVE_BG : "transparent",
        color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = HOVER_BG;
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={14} strokeWidth={active ? 2.5 : 2} />
        <span style={{ fontSize: "13px", fontWeight: active ? 600 : 400 }}>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className="rounded-full px-1.5 py-0.5"
          style={{
            fontSize: "10px",
            fontWeight: 700,
            background: active ? ACTIVE_TEXT + "18" : "#F1F5F9",
            color: active ? ACTIVE_TEXT : "#94A3B8",
            fontFamily: "var(--font-mono)",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function UserFooter({ user }: { user: AuthUser }) {
  const initials = user.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="px-3 py-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
      <button
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors hover:bg-gray-50"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white"
          style={{ background: "var(--primary)", fontSize: "10px", fontWeight: 700 }}
        >
          {initials}
        </div>
        <div className="flex-1 text-left">
          <p className="truncate" style={{ fontSize: "12.5px", fontWeight: 600, color: "#0F172A" }}>{user.full_name}</p>
          <p className="truncate" style={{ fontSize: "11px", color: INACTIVE_TEXT }}>{user.email}</p>
        </div>
        <ChevronDown size={12} style={{ color: "#CBD5E1" }} />
      </button>
    </div>
  );
}
