import { useRef, useEffect, useState } from "react";
import {
  Bell, Sun, Moon, Globe, LogOut, User, ChevronRight, Check,
} from "lucide-react";
import type { Project } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";
import type { Lang } from "../i18n/translations";

type Mode = "light" | "dark";
type Screen = "dashboard" | "feedback" | "user-needs" | "requirements" | "analysis";

const LANGS: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "EN", label: "English", native: "English", flag: "🇺🇸" },
  { code: "VI", label: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
];

interface TopBarProps {
  project?: Project;
  activeScreen?: Screen;
  onBackToProjects?: () => void;
}

export function TopBar({ project, activeScreen, onBackToProjects }: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { lang, setLang, tr } = useLanguage();
  const [mode, setMode] = useState<Mode>("light");
  const [langOpen, setLangOpen] = useState(false);

  // Apply dark mode class to root
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [mode]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLang = LANGS.find((l) => l.code === lang)!;

  const screenLabels: Record<Screen, string> = {
    dashboard: tr.nav.overview,
    feedback: tr.nav.feedback,
    "user-needs": tr.nav.userNeeds,
    requirements: tr.nav.requirements,
    analysis: tr.nav.analysis,
  };

  return (
    <header className="h-13 flex items-center justify-between px-5 shrink-0 border-b" style={{ background: "#fff", borderColor: "var(--border)" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        {project && activeScreen ? (
          <>
            <button
              onClick={onBackToProjects}
              className="transition-opacity hover:opacity-70 whitespace-nowrap"
              style={{ fontSize: "12.5px", color: "#CBD5E1" }}
            >
              {tr.nav.allProjects}
            </button>
            <ChevronRight size={11} style={{ color: "#E2E8F0" }} />
            <button
              onClick={onBackToProjects}
              className="transition-opacity hover:opacity-70 whitespace-nowrap"
              style={{ fontSize: "12.5px", color: "#94A3B8" }}
            >
              {project.name}
            </button>
            <ChevronRight size={11} style={{ color: "#E2E8F0" }} />
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1E3A8A", whiteSpace: "nowrap" }}>
              {screenLabels[activeScreen]}
            </span>
          </>
        ) : (
          <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1E3A8A", whiteSpace: "nowrap" }}>
            {tr.nav.allProjects}
          </span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2.5">
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)" }}>
          <Bell size={14} style={{ color: "#64748B" }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "#1E3A8A" }} />
        </button>

        {/* User avatar + menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => { setUserMenuOpen((o) => !o); setLangOpen(false); }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white ring-2 ring-offset-1 transition-all hover:ring-blue-300"
            style={{ background: "#1E3A8A", fontSize: "11px", fontWeight: 700, ringColor: "transparent" }}
          >
            TA
          </button>

          {userMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 z-50 rounded-xl border shadow-xl overflow-hidden"
              style={{ background: "#fff", borderColor: "var(--border)", width: "240px" }}
            >
              {/* User info */}
              <div className="px-4 py-3.5 border-b" style={{ borderColor: "var(--border)", background: "#F8FAFC" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: "var(--primary)", fontSize: "12px", fontWeight: 700 }}
                  >
                    TA
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>Anh Tran</p>
                    <p style={{ fontSize: "11.5px", color: "#64748B" }}>anh@reqforge.io</p>
                  </div>
                </div>
              </div>

              <div className="py-1.5">
                {/* Profile */}
                <MenuRow icon={<User size={13} />} label={tr.topbar.myProfile} onClick={() => setUserMenuOpen(false)} />

                {/* Divider */}
                <div className="my-1.5 border-t" style={{ borderColor: "#F1F5F9" }} />

                {/* Language selector */}
                <div className="relative">
                  <button
                    onClick={() => setLangOpen((o) => !o)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-gray-50"
                  >
                    <Globe size={13} style={{ color: "#6B7280" }} />
                    <span style={{ fontSize: "13px", color: "#374151", flex: 1, textAlign: "left" }}>{tr.topbar.language}</span>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>{currentLang.flag} {currentLang.code}</span>
                    <ChevronRight size={12} style={{ color: "#CBD5E1" }} />
                  </button>

                  {langOpen && (
                    <div
                      className="absolute right-full top-0 mr-1 rounded-xl border shadow-lg overflow-hidden"
                      style={{ background: "#fff", borderColor: "var(--border)", width: "180px" }}
                    >
                      <div className="px-3 py-2 border-b" style={{ borderColor: "#F1F5F9" }}>
                        <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                          {tr.topbar.selectLanguage}
                        </p>
                      </div>
                      {LANGS.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => { setLang(l.code); setLangOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-gray-50"
                        >
                          <span style={{ fontSize: "16px" }}>{l.flag}</span>
                          <div className="flex-1 text-left">
                            <p style={{ fontSize: "13px", color: "#0F172A", fontWeight: lang === l.code ? 600 : 400 }}>{l.native}</p>
                            <p style={{ fontSize: "11px", color: "#94A3B8" }}>{l.label}</p>
                          </div>
                          {lang === l.code && <Check size={12} style={{ color: "#1E3A8A" }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mode toggle */}
                <div className="px-3.5 py-2 flex items-center gap-2.5">
                  {mode === "light"
                    ? <Sun size={13} style={{ color: "#6B7280" }} />
                    : <Moon size={13} style={{ color: "#6B7280" }} />
                  }
                  <span style={{ fontSize: "13px", color: "#374151", flex: 1 }}>
                    {mode === "light" ? tr.topbar.lightMode : tr.topbar.darkMode}
                  </span>
                  <button
                    onClick={() => setMode((m) => m === "light" ? "dark" : "light")}
                    className="relative flex items-center rounded-full transition-colors"
                    style={{
                      width: "36px", height: "20px",
                      background: mode === "dark" ? "var(--primary)" : "#E2E8F0",
                    }}
                  >
                    <span
                      className="absolute rounded-full bg-white shadow transition-all"
                      style={{
                        width: "14px", height: "14px",
                        left: mode === "dark" ? "19px" : "3px",
                      }}
                    />
                  </button>
                </div>

                {/* Divider */}
                <div className="my-1.5 border-t" style={{ borderColor: "#F1F5F9" }} />

                {/* Sign out */}
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-red-50"
                >
                  <LogOut size={13} style={{ color: "#DC2626" }} />
                  <span style={{ fontSize: "13px", color: "#DC2626" }}>{tr.topbar.signOut}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-gray-50"
    >
      <span style={{ color: "#6B7280" }}>{icon}</span>
      <span style={{ fontSize: "13px", color: "#374151" }}>{label}</span>
    </button>
  );
}
