import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, ArrowRight, Plus, Eye, Check, X, Sparkles, Loader } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Requirement, RequirementIssue, UserNeed, FeedbackItem } from "../data/mockData";
import { SimpleSelect } from "./SimpleSelect";
import { useLanguage } from "../i18n/LanguageContext";
import { getErrorMessage } from "../../services/api";
import type { AnalysisRunDto } from "../../types/analysis";


interface AnalysisProps {
  requirements: Requirement[];
  issues: RequirementIssue[];
  needs: UserNeed[];
  feedback: FeedbackItem[];
  runs: AnalysisRunDto[];
  onRunConsistency: (signal?: AbortSignal) => Promise<AnalysisRunDto>;
  onTransitionIssue: (issue: RequirementIssue, action: "resolve" | "dismiss") => Promise<void>;
  readOnly?: boolean;
}

export function Analysis({ requirements, issues, needs, feedback, runs, onRunConsistency, onTransitionIssue, readOnly = false }: AnalysisProps) {
  const { tr } = useLanguage();
  const SCOPE_ALL = "All";
  const SCOPE_FEEDBACK = "Feedback Analysis";
  const SCOPE_NEEDS = "Need Extraction";
  const SCOPE_GENERATION = "Requirement Generation";
  const SCOPE_VALIDATION = "Requirement Validation";
  const SCOPE_CONSISTENCY = "Consistency Check";
  const scopeOptions = [SCOPE_ALL, SCOPE_FEEDBACK, SCOPE_NEEDS, SCOPE_GENERATION, SCOPE_VALIDATION, SCOPE_CONSISTENCY];
  const [scope, setScope] = useState(SCOPE_ALL);
  const [activeTab, setActiveTab] = useState<"issues" | "coverage">("issues");
  const [runningConsistency, setRunningConsistency] = useState(false);

  const confirmedNeeds = needs.filter((n) => n.status === "Confirmed");
  const coveredNeeds = confirmedNeeds.filter((n) => requirements.some((r) => r.sourceNeedId === n.id && r.status !== "Rejected"));
  const uncoveredNeeds = confirmedNeeds.filter((n) => !requirements.some((r) => r.sourceNeedId === n.id && r.status !== "Rejected"));

  const linkedFb = feedback.filter((f) => f.userNeedId);
  const unlinkedFb = feedback.filter((f) => !f.userNeedId);

  const scopedIssues = useMemo(() => {
    if (scope === SCOPE_ALL || scope === SCOPE_VALIDATION || scope === SCOPE_CONSISTENCY) return issues;
    if (scope === SCOPE_GENERATION) return issues.filter((i) => i.type === "Unsupported Assumption");
    if (scope === SCOPE_NEEDS) return issues.filter((i) => i.type === "Intent Drift");
    return [];
  }, [issues, scope]);

  const openIssues = scopedIssues.filter((i) => i.status === "Open");
  const issueSummary = [
    { label: "Missing Information", count: issues.filter((i) => i.type === "Missing Information").length, color: "#D97706" },
    { label: "Unsupported Assumptions", count: issues.filter((i) => i.type === "Unsupported Assumption").length, color: "#DC2626" },
    { label: "Intent Drift", count: issues.filter((i) => i.type === "Intent Drift").length, color: "#7C3AED" },
    { label: "Inconsistency", count: issues.filter((i) => i.type === "Inconsistency").length, color: "#0891B2" },
  ];

  const confData = [
    { label: "High", value: requirements.filter((r) => r.confidence === "High").length, color: "#059669" },
    { label: "Medium", value: requirements.filter((r) => r.confidence === "Medium").length, color: "#D97706" },
    { label: "Low", value: requirements.filter((r) => r.confidence === "Low").length, color: "#DC2626" },
  ];

  const scopeTitle: Record<string, string> = {
    [SCOPE_ALL]: "All Analysis",
    [SCOPE_FEEDBACK]: "Feedback Analysis",
    [SCOPE_NEEDS]: "Need Extraction",
    [SCOPE_GENERATION]: "Requirement Generation",
    [SCOPE_VALIDATION]: "Requirement Validation",
    [SCOPE_CONSISTENCY]: "Consistency Check",
  };

  const scopeSubtitle: Record<string, string> = {
    [SCOPE_ALL]: "Complete view of all AI analysis activity.",
    [SCOPE_FEEDBACK]: "How feedback was classified and grouped by AI.",
    [SCOPE_NEEDS]: "User Needs identified from feedback patterns.",
    [SCOPE_GENERATION]: "Requirements generated from confirmed User Needs.",
    [SCOPE_VALIDATION]: "Validation findings for requirements against source evidence.",
    [SCOPE_CONSISTENCY]: "Cross-requirement consistency and conflict checks.",
  };

  const severityColors: Record<string, string> = { High: "#DC2626", Medium: "#D97706", Low: "#059669" };
  const latestRun = runs[0];

  const runConsistency = async () => {
    if (runningConsistency) return;
    setRunningConsistency(true);
    try { await onRunConsistency(); toast.success("Consistency check completed"); }
    catch (error) { toast.error(getErrorMessage(error, "Consistency check failed.")); }
    finally { setRunningConsistency(false); }
  };

  const transition = async (issue: RequirementIssue, action: "resolve" | "dismiss") => {
    try { await onTransitionIssue(issue, action); toast.success(action === "resolve" ? "Issue resolved" : "Issue dismissed"); }
    catch (error) { toast.error(getErrorMessage(error, "Unable to update issue.")); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 style={{ fontSize: "19px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{scope === SCOPE_ALL ? tr.analysis.title : scopeTitle[scope]}</h1>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>{scopeSubtitle[scope]}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <Sparkles size={12} style={{ color: "#1E3A8A" }} />
              <span style={{ fontSize: "12.5px", color: "#1E3A8A", fontWeight: 500 }}>{latestRun ? `Updated ${new Date(latestRun.created_at).toLocaleString()}` : "No analysis runs yet"}</span>
            </div>
            {!readOnly && <button onClick={() => void runConsistency()} disabled={runningConsistency} className="flex items-center gap-1.5 rounded-md bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{runningConsistency ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />} Check consistency</button>}
            <SimpleSelect value={scope} options={scopeOptions} onChange={(v) => { setScope(v); setActiveTab("issues"); }} />
          </div>
        </div>

        <div className="mb-5 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}><h3 className="text-sm font-semibold">Analysis run history</h3></div>
          {runs.length ? <div className="divide-y">{runs.slice(0, 8).map((run) => <div key={run.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3 text-xs"><span className="font-medium">{run.analysis_type.replace(/_/g, " ")}</span><span className={run.status === "FAILED" ? "text-red-600" : run.status === "COMPLETED" ? "text-emerald-700" : "text-amber-700"}>{run.status}</span><span className="truncate text-slate-500">{run.model || "—"}</span><span className="text-right text-slate-500">{new Date(run.created_at).toLocaleString()}</span></div>)}</div> : <p className="px-4 py-6 text-center text-xs text-slate-500">No analysis runs for this project.</p>}
        </div>

        {/* Scope-specific context banner */}
        {scope !== SCOPE_ALL && (
          <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <Sparkles size={13} style={{ color: "#1E3A8A", marginTop: "1px", flexShrink: 0 }} />
            <div className="flex-1">
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "#1E3A8A", marginBottom: "3px" }}>{scopeTitle[scope]}</p>
              {scope === SCOPE_FEEDBACK && (
                <p style={{ fontSize: "12px", color: "#1E3A8A" }}>
                  {feedback.length} total feedback · {linkedFb.length} linked to User Needs · {unlinkedFb.length} unlinked · {feedback.filter(f => f.status === "Analyzed").length} analyzed
                </p>
              )}
              {scope === SCOPE_NEEDS && (
                <p style={{ fontSize: "12px", color: "#1E3A8A" }}>
                  {needs.length} User Needs identified · {confirmedNeeds.length} confirmed · {needs.filter(n => n.status === "Candidate").length} candidate
                </p>
              )}
              {scope === SCOPE_GENERATION && (
                <p style={{ fontSize: "12px", color: "#1E3A8A" }}>
                  {requirements.length} requirements generated · {requirements.filter(r => r.status === "Approved").length} approved · {requirements.filter(r => r.status === "Needs Review").length} needs review
                </p>
              )}
              {scope === SCOPE_VALIDATION && (
                <p style={{ fontSize: "12px", color: "#1E3A8A" }}>
                  {openIssues.length} open validation issues across {requirements.length} requirements
                </p>
              )}
              {scope === SCOPE_CONSISTENCY && (
                <p style={{ fontSize: "12px", color: "#1E3A8A" }}>
                  {issues.filter(i => i.type === "Inconsistency").length} cross-requirement inconsistencies detected
                </p>
              )}
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {issueSummary.map((s) => (
            <div key={s.label} className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: "28px", fontWeight: 700, color: s.color, letterSpacing: "-0.04em" }}>{s.count}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + "15" }}>
                  <AlertTriangle size={14} style={{ color: s.color }} />
                </div>
              </div>
              <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Coverage chart */}
          <div className="col-span-2 rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--foreground)", marginBottom: "12px" }}>{tr.analysis.coverageOverview}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px" }}>{tr.analysis.feedbackToNeeds}</p>
                <div className="flex items-end gap-2 mb-2">
                  <span style={{ fontSize: "24px", fontWeight: 700, color: "#059669" }}>{linkedFb.length}</span>
                  <span style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "3px" }}>/ {feedback.length} linked</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((linkedFb.length / Math.max(feedback.length, 1)) * 100)}%`, background: "#059669" }} />
                </div>
                <p style={{ fontSize: "11.5px", color: "#94A3B8", marginTop: "4px" }}>{unlinkedFb.length} unlinked</p>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px" }}>{tr.analysis.needsToReqs}</p>
                <div className="flex items-end gap-2 mb-2">
                  <span style={{ fontSize: "24px", fontWeight: 700, color: coveredNeeds.length === confirmedNeeds.length ? "#059669" : "#D97706" }}>{coveredNeeds.length}</span>
                  <span style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "3px" }}>/ {confirmedNeeds.length} covered</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: confirmedNeeds.length > 0 ? `${Math.round((coveredNeeds.length / confirmedNeeds.length) * 100)}%` : "0%", background: "#1E3A8A" }} />
                </div>
                <p style={{ fontSize: "11.5px", color: "#94A3B8", marginTop: "4px" }}>{uncoveredNeeds.length} without requirements</p>
              </div>
            </div>
          </div>

          {/* Confidence distribution */}
          <div className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--foreground)", marginBottom: "12px" }}>{tr.analysis.confidenceDist}</h3>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={confData} barSize={28}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #E2E8F0" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} shape={(props: any) => {
                  const { x, y, width, height, index } = props;
                  const color = confData[index]?.color ?? "#1E3A8A";
                  return <rect x={x} y={y} width={width} height={Math.max(height, 0)} rx={4} ry={4} fill={color} />;
                }} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-3 mt-1">
              {confData.map((d) => (
                <div key={d.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span style={{ fontSize: "11px", color: "#64748B" }}>{d.label}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b mb-4" style={{ borderColor: "var(--border)" }}>
          {(["issues", "coverage"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2.5 transition-colors"
              style={{ fontSize: "13.5px", fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "#1E3A8A" : "#64748B", borderBottom: activeTab === tab ? "2px solid #1E3A8A" : "2px solid transparent", marginBottom: "-1px" }}>
              {tab === "issues" ? `${tr.analysis.issuesList} (${openIssues.length} open)` : tr.analysis.coverageGaps}
            </button>
          ))}
        </div>

        {activeTab === "issues" ? (
          <div className="rounded-lg border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                  {["Severity", "Type", "Requirement", "Issue", "Suggestion", "Status", "Actions"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left" style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748B", letterSpacing: "0.02em" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopedIssues.map((issue, i) => (
                  <tr key={issue.id} className="border-b" style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "#fff" : "#FAFBFC", opacity: issue.status !== "Open" ? 0.55 : 1 }}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: severityColors[issue.severity] }} />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: severityColors[issue.severity] }}>{issue.severity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-md" style={{ background: "#F8FAFC", border: "1px solid var(--border)", fontSize: "11px", color: "#374151" }}>{issue.type}</span>
                    </td>
                    <td className="px-4 py-4"><span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#1E3A8A" }}>{issue.requirementId}</span></td>
                    <td className="px-4 py-4 max-w-xs"><p style={{ fontSize: "12.5px", color: "var(--foreground)", lineHeight: 1.5 }}>{issue.description}</p></td>
                    <td className="px-4 py-4 max-w-xs">
                      <div className="flex items-start gap-1.5">
                        <ArrowRight size={11} style={{ color: "#059669", marginTop: "2px", flexShrink: 0 }} />
                        <p style={{ fontSize: "12px", color: "#059669", lineHeight: 1.5 }}>{issue.suggestion}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-md" style={{ background: issue.status === "Open" ? "#FEF2F2" : issue.status === "Resolved" ? "#ECFDF5" : "#F1F5F9", color: issue.status === "Open" ? "#DC2626" : issue.status === "Resolved" ? "#059669" : "#64748B", fontSize: "11px", fontWeight: 600 }}>
                        {tr.status[issue.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {!readOnly && issue.status === "Open" && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => void transition(issue, "resolve")} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors" style={{ fontSize: "11.5px", color: "#059669" }}>
                            <Check size={10} /> {tr.analysis.resolve}
                          </button>
                          <button onClick={() => void transition(issue, "dismiss")} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors" style={{ fontSize: "11.5px", color: "#94A3B8" }}>
                            <X size={10} /> {tr.analysis.dismiss}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Coverage gaps */}
            <div className="rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>{tr.analysis.coverageGaps}</h3>
                    <p style={{ fontSize: "12.5px", color: "#64748B", marginTop: "2px" }}>Confirmed User Needs without any corresponding requirement</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} style={{ color: confirmedNeeds.length > 0 ? "#059669" : "#94A3B8" }} />
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#059669" }}>
                      {confirmedNeeds.length > 0 ? Math.round((coveredNeeds.length / confirmedNeeds.length) * 100) : 0}% covered
                    </span>
                  </div>
                </div>
              </div>
              {uncoveredNeeds.length === 0 ? (
                <div className="px-5 py-8 flex flex-col items-center">
                  <CheckCircle size={24} style={{ color: "#059669", marginBottom: "6px" }} />
                  <p style={{ fontSize: "13.5px", fontWeight: 500, color: "#059669" }}>{tr.analysis.noGaps}</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {uncoveredNeeds.map((need) => (
                    <div key={need.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#94A3B8" }}>{need.id}</span>
                          <span className="px-2 py-0.5 rounded-md" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "10.5px", fontWeight: 600 }}>Coverage Gap</span>
                        </div>
                        <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--foreground)" }}>{need.title}</p>
                        <p style={{ fontSize: "12px", color: "#64748B" }}>{need.feedbackIds.length} supporting feedback</p>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white hover:opacity-90 transition-all" style={{ background: "var(--primary)", fontSize: "12px", fontWeight: 500 }}>
                        <Plus size={12} /> {tr.analysis.generateReq}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requirement Sources breakdown */}
            <div className="rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>Requirement Sources</h3>
                <p style={{ fontSize: "12.5px", color: "#64748B", marginTop: "2px" }}>Breakdown of all requirements by their origin</p>
              </div>
              <div className="px-5 py-4">
                {(() => {
                  const srcGroups: { label: string; types: string[]; color: string; bg: string }[] = [
                    { label: "AI from User Need", types: ["AI_FROM_USER_NEED"], color: "#1E3A8A", bg: "#EFF6FF" },
                    { label: "Stakeholder", types: ["STAKEHOLDER"], color: "#7C3AED", bg: "#F5F3FF" },
                    { label: "Security Policy", types: ["POLICY", "COMPLIANCE"], color: "#DC2626", bg: "#FEF2F2" },
                    { label: "Existing Spec / SLA", types: ["EXISTING_SPEC", "TECHNICAL_CONSTRAINT"], color: "#0891B2", bg: "#F0F9FF" },
                    { label: "Manual / Other", types: ["MANUAL", "OTHER"], color: "#64748B", bg: "#F8FAFC" },
                  ];
                  const total = requirements.length || 1;
                  return (
                    <div className="space-y-3">
                      {srcGroups.map((g) => {
                        const count = requirements.filter((r) => g.types.includes(r.sourceType)).length;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={g.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--foreground)" }}>{g.label}</span>
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: "12px", color: "#64748B" }}>{count} req{count !== 1 ? "s" : ""}</span>
                                <span className="px-2 py-0.5 rounded-full" style={{ background: g.bg, color: g.color, fontSize: "11px", fontWeight: 600 }}>{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: "#E2E8F0" }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: g.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Unsupported requirements */}
            <div className="rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>{tr.analysis.unsupported}</h3>
                <p style={{ fontSize: "12.5px", color: "#64748B", marginTop: "2px" }}>Requirements without traceability to a confirmed User Need</p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {requirements.filter((r) => !r.sourceNeedId || !needs.find((n) => n.id === r.sourceNeedId && n.status === "Confirmed")).slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "11.5px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#64748B" }}>{req.id}</span>
                      <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{req.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded-md" style={{ background: "#FFF7ED", color: "#C2410C", fontSize: "11px", fontWeight: 600 }}>Unsupported</span>
                      <button className="px-3 py-1.5 rounded-md border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)", fontSize: "12px", color: "#64748B" }}>
                        <Eye size={12} className="inline mr-1" />Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
