import { useState } from "react";
import { MessageSquare, Users, FileText, AlertTriangle, Sparkles, TrendingUp, Plus, Upload, ChevronRight, CheckCircle, Circle, Globe } from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import type { Project, FeedbackItem, UserNeed, Requirement, Activity } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";

const trendData = [
  { w: "W1", a: 8, b: 12 }, { w: "W2", b: 15, a: 11 }, { w: "W3", a: 14, b: 19 },
  { w: "W4", a: 18, b: 23 }, { w: "W5", a: 21, b: 27 }, { w: "W6", a: 24, b: 31 }, { w: "W7", a: 27, b: 35 },
];

interface DashboardProps {
  project: Project;
  feedback: FeedbackItem[];
  needs: UserNeed[];
  requirements: Requirement[];
  activities: Activity[];
  onNavigate: (screen: string) => void;
  onOpenAddFeedback: () => void;
  onOpenImport: () => void;
  onRunAnalysis: () => void;
  onOpenGenerateReqs: () => void;
  onOpenPublicLink?: () => void;
}

export function Dashboard({ project, feedback, needs, requirements, activities, onNavigate, onOpenAddFeedback, onOpenImport, onRunAnalysis, onOpenGenerateReqs, onOpenPublicLink }: DashboardProps) {
  const { tr } = useLanguage();
  const approvedCount = requirements.filter((r) => r.status === "Approved").length;
  const openIssues = requirements.reduce((s, r) => s + r.issueCount, 0);
  const confirmedNeeds = needs.filter((n) => n.status === "Confirmed").length;

  const newFeedback = feedback.filter((f) => f.status === "New").length;

  const kpis = [
    { label: "Feedback Inbox", value: feedback.length, delta: `${newFeedback} new`, icon: MessageSquare, color: "#1E3A8A", bg: "#EFF6FF", screen: "feedback" },
    { label: tr.dashboard.userNeeds, value: needs.length, delta: `${confirmedNeeds} ${tr.dashboard.confirmed}`, icon: Users, color: "#7C3AED", bg: "#F5F3FF", screen: "user-needs" },
    { label: tr.dashboard.requirements, value: requirements.length, delta: `${approvedCount} ${tr.dashboard.approved}`, icon: FileText, color: "#059669", bg: "#ECFDF5", screen: "requirements" },
    { label: tr.dashboard.openIssues, value: openIssues, delta: tr.dashboard.needsReview, icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB", screen: "analysis" },
  ];

  const activityIcon: Record<Activity["type"], { color: string; bg: string }> = {
    feedback: { color: "#1E3A8A", bg: "#EFF6FF" },
    need: { color: "#7C3AED", bg: "#F5F3FF" },
    requirement: { color: "#059669", bg: "#ECFDF5" },
    issue: { color: "#D97706", bg: "#FFFBEB" },
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 style={{ fontSize: "19px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{project.name}</h1>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>{project.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRunAnalysis} className="flex items-center gap-2 px-3.5 py-2 rounded-md border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)", fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
              <Sparkles size={13} style={{ color: "#1E3A8A" }} /> {tr.dashboard.analyzeAI}
            </button>
            <button onClick={onOpenAddFeedback} className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-white hover:opacity-90 transition-all" style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}>
              <Plus size={14} /> Record Feedback
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <button key={k.label} onClick={() => onNavigate(k.screen)} className="rounded-lg p-4 border text-left transition-all hover:shadow-sm" style={{ background: "var(--card)", borderColor: "var(--border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#BFDBFE"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: k.bg }}>
                  <Icon size={15} style={{ color: k.color }} />
                </div>
                <p style={{ fontSize: "26px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1, letterSpacing: "-0.04em" }}>{k.value}</p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "3px" }}>{k.label}</p>
                <p style={{ fontSize: "11.5px", color: k.color, fontWeight: 500, marginTop: "4px" }}>{k.delta}</p>
              </button>
            );
          })}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent Activity */}
          <div className="col-span-2 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--foreground)" }}>{tr.dashboard.recentActivity}</h2>
              <button onClick={() => onNavigate("feedback")} className="flex items-center gap-1 text-blue-600 hover:opacity-80 transition-opacity" style={{ fontSize: "12px", fontWeight: 500 }}>
                {tr.dashboard.viewAll} <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {activities.map((act) => {
                const cfg = activityIcon[act.type];
                return (
                  <button key={act.id} onClick={() => act.linkedScreen && onNavigate(act.linkedScreen)} className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 text-left">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--foreground)", flex: 1 }}>{act.text}</p>
                    <span style={{ fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap" }}>{act.date}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)", background: "#F8FAFC" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{tr.dashboard.quickActions}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Record Feedback", icon: Plus, action: onOpenAddFeedback },
                  { label: "Import Feedback", icon: Upload, action: onOpenImport },
                  { label: "Open Public Feedback Form", icon: Globe, action: () => { onNavigate("feedback"); onOpenPublicLink?.(); } },
                  { label: "Analyze New Feedback", icon: Sparkles, action: onRunAnalysis },
                  { label: "Generate Requirements", icon: FileText, action: onOpenGenerateReqs },
                ].map(({ label, icon: Icon, action }) => (
                  <button key={label} onClick={action} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors hover:bg-white" style={{ borderColor: "var(--border)", fontSize: "12px", color: "#374151", background: "#fff" }}>
                    <Icon size={12} style={{ color: "#1E3A8A" }} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trend chart */}
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border flex-1" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} style={{ color: "#1E3A8A" }} />
                  <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Need Trends</h2>
                </div>
                <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", marginTop: "1px" }}>Last 7 weeks</p>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={trendData}>
                    <XAxis dataKey="w" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #E2E8F0" }} />
                    <Area type="monotone" dataKey="b" name="Readability" stroke="#1E3A8A" strokeWidth={1.5} fill="#1E3A8A" fillOpacity={0.12} dot={false} activeDot={{ r: 3 }} />
                    <Area type="monotone" dataKey="a" name="Navigation" stroke="#7C3AED" strokeWidth={1.5} fill="#7C3AED" fillOpacity={0.1} dot={false} activeDot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {[{ label: "Readability", c: "#1E3A8A" }, { label: "Navigation", c: "#7C3AED" }, { label: "Registration", c: "#059669" }].map((i) => (
                    <div key={i.label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: i.c }} />
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{i.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Processing state */}
            <div className="rounded-lg border p-4" style={{ background: "#F0F9FF", borderColor: "#BAE6FD" }}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#1E3A8A" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#1E3A8A" }}>AI Ready</p>
              </div>
              {[
                { label: "Data prepared", done: true },
                { label: "Feedback classified", done: true },
                { label: "Needs identified", done: true },
                { label: "Awaiting validation", done: false, active: true },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 mb-1.5">
                  {s.done ? <CheckCircle size={11} style={{ color: "#059669" }} /> : s.active ? <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" /> : <Circle size={11} style={{ color: "#CBD5E1" }} />}
                  <span style={{ fontSize: "11px", color: s.done ? "#059669" : s.active ? "#1E3A8A" : "#94A3B8", fontWeight: s.active ? 500 : 400 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
