import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, GitBranch, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  createBaseline,
  downloadBaselineCsv,
  getBaseline,
  getProjectReport,
  listBaselines,
} from "../../services/reports";
import type { Baseline, BaselineSummary, ProjectReport } from "../../types/report";
import { getErrorMessage } from "../../services/api";
import { useLanguage } from "../i18n/LanguageContext";

interface ReportsProps {
  projectId: string;
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function enumLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function Reports({ projectId }: ReportsProps) {
  const { lang, tr } = useLanguage();
  const [liveReport, setLiveReport] = useState<ProjectReport | null>(null);
  const [baselines, setBaselines] = useState<BaselineSummary[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingBaseline, setOpeningBaseline] = useState<string | null>(null);
  const locale = lang === "VI" ? "vi-VN" : "en-GB";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [report, history] = await Promise.all([getProjectReport(projectId), listBaselines(projectId)]);
      setLiveReport(report);
      setBaselines(history);
    } catch (requestError) {
      setError(getErrorMessage(requestError, tr.reports.loadError));
    } finally {
      setLoading(false);
    }
  }, [projectId, tr.reports.loadError]);

  useEffect(() => {
    setSelectedBaseline(null);
    void refresh();
  }, [refresh]);

  const report = selectedBaseline?.snapshot ?? liveReport;
  const heading = selectedBaseline
    ? `${tr.reports.baseline} v${selectedBaseline.version}`
    : tr.reports.projectReport;
  const executiveSummary = useMemo(() => {
    if (!report) return "";
    return tr.reports.executiveSummary(
      report.feedback.total,
      report.user_needs.confirmed,
      report.requirements.approved,
    );
  }, [report, tr.reports]);

  const createNewBaseline = async () => {
    setCreating(true);
    try {
      const baseline = await createBaseline(projectId);
      setSelectedBaseline(baseline);
      setBaselines((current) => [
        { id: baseline.id, project_id: baseline.project_id, version: baseline.version, created_at: baseline.created_at },
        ...current,
      ]);
      setShowConfirmation(false);
      toast.success(tr.reports.baselineCreated);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, tr.reports.createError));
    } finally {
      setCreating(false);
    }
  };

  const openBaseline = async (baselineId: string) => {
    setOpeningBaseline(baselineId);
    try {
      setSelectedBaseline(await getBaseline(baselineId));
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, tr.reports.loadError));
    } finally {
      setOpeningBaseline(null);
    }
  };

  const exportCsv = async () => {
    if (!selectedBaseline) return;
    try {
      await downloadBaselineCsv(selectedBaseline.id);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, tr.reports.exportError));
    }
  };

  if (loading) {
    return <LoadingState label={tr.reports.loading} />;
  }

  if (error || !report) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-xl border p-5" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
          <p style={{ color: "#B91C1C", fontSize: "13px" }}>{error ?? tr.reports.loadError}</p>
          <button onClick={() => void refresh()} className="mt-3 rounded-md px-3 py-1.5 text-white" style={{ background: "var(--primary)", fontSize: "12px" }}>
            {tr.common.retry}
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { label: tr.reports.feedback, value: report.feedback.total, tone: "#2563EB" },
    { label: tr.reports.confirmedNeeds, value: report.user_needs.confirmed, tone: "#7C3AED" },
    { label: tr.reports.approvedRequirements, value: report.requirements.approved, tone: "#059669" },
    { label: tr.reports.openIssues, value: report.validation.open_issues, tone: "#DC2626" },
  ];

  return (
    <main className="flex-1 overflow-auto p-6">
      <style>{`@media print {
        body * { visibility: hidden; }
        .reqforge-printable-report, .reqforge-printable-report * { visibility: visible; }
        .reqforge-printable-report { position: absolute; inset: 0; width: 100%; padding: 24px !important; }
        .reqforge-report-actions, .reqforge-baseline-history { display: none !important; }
      }`}</style>
      <div className="reqforge-printable-report mx-auto max-w-6xl space-y-5">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1" style={{ fontSize: "11px", color: "#64748B", letterSpacing: "0.08em", fontWeight: 700 }}>
              {tr.reports.projectReport.toUpperCase()}
            </p>
            <h1 style={{ color: "#0F172A", fontSize: "24px", fontWeight: 700 }}>{heading}</h1>
            <p className="mt-1" style={{ color: "#64748B", fontSize: "13px" }}>
              {report.project.name} · {tr.reports.generated} {formatDate(report.project.generated_at, locale)}
            </p>
          </div>
          <div className="reqforge-report-actions flex flex-wrap gap-2">
            {selectedBaseline && (
              <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", color: "#334155", fontSize: "12px", fontWeight: 600 }}>
                <Download size={14} /> {tr.reports.downloadCsv}
              </button>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", color: "#334155", fontSize: "12px", fontWeight: 600 }}>
              <Printer size={14} /> {tr.reports.printReport}
            </button>
            {!selectedBaseline && (
              <button onClick={() => setShowConfirmation(true)} disabled={report.requirements.approved === 0} className="flex items-center gap-2 rounded-lg px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "var(--primary)", fontSize: "12px", fontWeight: 600 }}>
                <ShieldCheck size={14} /> {tr.reports.createBaseline}
              </button>
            )}
            {selectedBaseline && (
              <button onClick={() => setSelectedBaseline(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-white" style={{ background: "var(--primary)", fontSize: "12px", fontWeight: 600 }}>
                <RefreshCw size={14} /> {tr.reports.viewLiveReport}
              </button>
            )}
          </div>
        </section>

        {showConfirmation && (
          <section className="reqforge-report-actions rounded-xl border p-4" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
            <p style={{ color: "#1E3A8A", fontSize: "13px", fontWeight: 600 }}>{tr.reports.createBaseline}</p>
            <p className="mt-1" style={{ color: "#475569", fontSize: "12.5px" }}>{tr.reports.confirmation}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => void createNewBaseline()} disabled={creating} className="rounded-md px-3 py-1.5 text-white disabled:opacity-50" style={{ background: "var(--primary)", fontSize: "12px" }}>
                {creating ? tr.reports.creating : tr.reports.confirmCreate}
              </button>
              <button onClick={() => setShowConfirmation(false)} className="rounded-md border px-3 py-1.5" style={{ borderColor: "var(--border)", fontSize: "12px", color: "#475569" }}>
                {tr.common.cancel}
              </button>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "#64748B", fontSize: "12px" }}>{card.label}</p>
              <p className="mt-1" style={{ color: card.tone, fontSize: "25px", fontWeight: 700 }}>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border bg-white p-5" style={{ borderColor: "var(--border)" }}>
          <h2 style={{ color: "#0F172A", fontSize: "15px", fontWeight: 700 }}>{tr.reports.executiveSummaryTitle}</h2>
          <p className="mt-2" style={{ color: "#475569", fontSize: "13px" }}>{executiveSummary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3" style={{ color: "#1E3A8A", fontSize: "13px", fontWeight: 600 }}>
            <span>{report.feedback.total} {tr.reports.feedback}</span><span>↓</span>
            <span>{report.user_needs.confirmed} {tr.reports.confirmedNeeds}</span><span>↓</span>
            <span>{report.requirements.approved} {tr.reports.approvedRequirements}</span>
          </div>
        </section>

        <ReportSection title={tr.reports.keyUserNeeds} icon={<GitBranch size={15} />}>
          {report.key_user_needs.length === 0 ? <EmptyState label={tr.reports.noConfirmedNeeds} /> : (
            <div className="space-y-3">{report.key_user_needs.map((need) => (
              <article key={need.id} className="rounded-lg border p-4" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex items-start justify-between gap-3"><div><p style={{ color: "#0F172A", fontSize: "13px", fontWeight: 650 }}>{need.title}</p><p className="mt-1" style={{ color: "#64748B", fontSize: "12px" }}>{need.description}</p></div><span className="shrink-0 rounded bg-blue-50 px-2 py-1" style={{ color: "#1E3A8A", fontSize: "11px" }}>{shortId(need.id)}</span></div>
                <p className="mt-3" style={{ color: "#475569", fontSize: "11.5px" }}>{tr.reports.supportingFeedback}: {need.supporting_feedback_count} · {need.supporting_feedback_ids.map(shortId).join(", ") || tr.common.none}</p>
              </article>
            ))}</div>
          )}
        </ReportSection>

        <ReportSection title={tr.reports.approvedRequirementSet} icon={<FileText size={15} />}>
          {report.approved_requirement_set.length === 0 ? <EmptyState label={tr.reports.noApprovedRequirements} /> : (
            <div className="space-y-3">{report.approved_requirement_set.map((requirement) => (
              <article key={requirement.id} className="rounded-lg border p-4" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex items-start justify-between gap-3"><div><p style={{ color: "#0F172A", fontSize: "13px", fontWeight: 650 }}>{requirement.title}</p><p className="mt-1" style={{ color: "#64748B", fontSize: "12px" }}>{requirement.description}</p></div><span className="shrink-0 rounded bg-emerald-50 px-2 py-1" style={{ color: "#047857", fontSize: "11px" }}>{tr.reports.approved}</span></div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1" style={{ color: "#475569", fontSize: "11.5px" }}><span>{tr.common.type}: {enumLabel(requirement.type)}</span><span>{tr.reports.sourceNeeds}: {requirement.source_needs.map((need) => need.title).join(", ") || tr.common.none}</span><span>{tr.reports.supportingFeedback}: {requirement.supporting_feedback_count}</span><span>{tr.reports.openIssues}: {requirement.open_issue_count}</span></div>
              </article>
            ))}</div>
          )}
        </ReportSection>

        <ReportSection title={tr.reports.traceability} icon={<GitBranch size={15} />}>
          {report.traceability_matrix.length === 0 ? <EmptyState label={tr.reports.noTraceability} /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse"><thead><tr style={{ color: "#64748B", fontSize: "11px", textAlign: "left" }}><th className="border-b p-2">{tr.reports.requirement}</th><th className="border-b p-2">{tr.reports.userNeed}</th><th className="border-b p-2">{tr.reports.supportingFeedback}</th></tr></thead><tbody>{report.traceability_matrix.map((row) => <tr key={`${row.requirement_id}-${row.need_id}`} style={{ color: "#334155", fontSize: "12px" }}><td className="border-b p-2">{shortId(row.requirement_id)} · {row.requirement_title}</td><td className="border-b p-2">{shortId(row.need_id)} · {row.need_title}</td><td className="border-b p-2">{row.supporting_feedback_ids.map(shortId).join(", ") || tr.common.none}</td></tr>)}</tbody></table></div>
          )}
        </ReportSection>

        <ReportSection title={tr.reports.outstandingIssues} icon={<ShieldCheck size={15} />}>
          {report.outstanding_issues.length === 0 ? <EmptyState label={tr.reports.noOpenIssues} /> : <div className="space-y-2">{report.outstanding_issues.map((issue) => <article key={issue.id} className="rounded-lg border p-3" style={{ borderColor: "#FDE68A", background: "#FFFBEB" }}><p style={{ color: "#92400E", fontSize: "12px", fontWeight: 650 }}>{issue.requirement_title} · {enumLabel(issue.severity)}</p><p className="mt-1" style={{ color: "#78350F", fontSize: "12px" }}>{issue.description}</p>{issue.suggestion && <p className="mt-1" style={{ color: "#92400E", fontSize: "11.5px" }}>{tr.reports.suggestion}: {issue.suggestion}</p>}</article>)}</div>}
        </ReportSection>

        <section className="reqforge-baseline-history rounded-xl border bg-white p-5" style={{ borderColor: "var(--border)" }}>
          <h2 style={{ color: "#0F172A", fontSize: "15px", fontWeight: 700 }}>{tr.reports.baselineHistory}</h2>
          {baselines.length === 0 ? <p className="mt-3" style={{ color: "#64748B", fontSize: "12.5px" }}>{tr.reports.noBaselines}</p> : <div className="mt-3 space-y-2">{baselines.map((baseline) => <button key={baseline.id} onClick={() => void openBaseline(baseline.id)} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-slate-50" style={{ borderColor: baseline.id === selectedBaseline?.id ? "#93C5FD" : "#E2E8F0" }}><span style={{ color: "#1E3A8A", fontSize: "12.5px", fontWeight: 650 }}>{tr.reports.baseline} v{baseline.version}</span><span style={{ color: "#64748B", fontSize: "11.5px" }}>{openingBaseline === baseline.id ? tr.reports.loading : formatDate(baseline.created_at, locale)}</span></button>)}</div>}
        </section>
      </div>
    </main>
  );
}

function ReportSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-xl border bg-white p-5" style={{ borderColor: "var(--border)" }}><h2 className="mb-4 flex items-center gap-2" style={{ color: "#0F172A", fontSize: "15px", fontWeight: 700 }}>{icon}{title}</h2>{children}</section>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-4" style={{ color: "#64748B", fontSize: "12.5px" }}>{label}</p>;
}

function LoadingState({ label }: { label: string }) {
  return <div className="flex flex-1 items-center justify-center" style={{ color: "#64748B", fontSize: "13px" }}><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-800 border-t-transparent" />{label}</div>;
}
