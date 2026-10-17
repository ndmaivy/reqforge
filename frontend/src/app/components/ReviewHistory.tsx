import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Loader, UserRound } from "lucide-react";
import { getErrorMessage } from "../../services/api";
import { listNeedReviewDecisions } from "../../services/needs";
import { listRequirementReviewDecisions } from "../../services/requirements";
import type { ListResponse } from "../../services/api";
import type { ReviewDecisionEventDto, ReviewSubjectTypeDto } from "../../types/reviewDecision";
import { getConfidenceDisplay } from "../../utils/confidence";
import { getReviewDecisionLabel, getReviewHistoryPageCount, getReviewHistoryViewState, getReviewStatusKey } from "../../utils/reviewHistory";
import { useLanguage } from "../i18n/LanguageContext";

const PAGE_SIZE = 20;

interface ReviewHistoryProps {
  projectId: string;
  subjectId: string;
  subjectType: ReviewSubjectTypeDto;
  refreshToken: number;
}

function formatDateTime(value: string, lang: "VI" | "EN"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "VI" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function enumDisplay(value: string, tr: ReturnType<typeof useLanguage>["tr"]): string {
  const review = tr.common.reviewHistory;
  const labels: Record<string, string> = {
    AI: review.ai,
    HUMAN: review.human,
    AI_FROM_USER_NEED: review.aiFromUserNeed,
    MANUAL: review.manual,
    STAKEHOLDER: review.stakeholder,
    POLICY: review.policy,
    COMPLIANCE: review.compliance,
    EXISTING_SPECIFICATION: review.existingSpecification,
    TECHNICAL_CONSTRAINT: review.technicalConstraint,
    OTHER: tr.common.other,
    FUNCTIONAL: tr.requirements.typeFunctional,
    USABILITY: tr.requirements.typeUsability,
    INTERACTION: tr.requirements.typeInteraction,
    ACCESSIBILITY: tr.requirements.typeAccessibility,
    NON_FUNCTIONAL: tr.requirements.typeNonFunctional,
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function confidenceLevelLabel(
  level: ReturnType<typeof getConfidenceDisplay>["level"],
  tr: ReturnType<typeof useLanguage>["tr"],
): string {
  return level === "N/A" ? "N/A" : tr.common[level.toLowerCase() as "high" | "medium" | "low"];
}

function proposalRows(
  snapshot: Record<string, unknown>,
  tr: ReturnType<typeof useLanguage>["tr"],
): Array<{ label: string; value: string }> {
  const review = tr.common.reviewHistory;
  const fieldLabels: Record<string, string> = {
    title: tr.common.title,
    description: tr.common.description,
    status: tr.common.status,
    type: tr.common.type,
    generated_by: review.generatedBy,
    source_type: review.sourceType,
    source_reference: tr.common.reference,
  };
  const hiddenFields = new Set(["id", "confidence", "source_analysis_run_id"]);
  return Object.entries(snapshot)
    .filter(([key, value]) => !hiddenFields.has(key) && value !== null && value !== undefined)
    .map(([key, value]) => {
      const label = fieldLabels[key] ?? key.replaceAll("_", " ");
      let displayValue: string;
      if (key === "status") {
        const statusKey = getReviewStatusKey(String(value));
        displayValue = (tr.status as Record<string, string>)[statusKey] ?? statusKey;
      } else if (typeof value === "string" && /^[A-Z][A-Z0-9_]+$/.test(value)) {
        displayValue = enumDisplay(value, tr);
      } else if (typeof value === "object") {
        displayValue = JSON.stringify(value, null, 2);
      } else {
        displayValue = String(value);
      }
      return { label, value: displayValue };
    });
}

async function loadReviewHistory(
  projectId: string,
  subjectId: string,
  subjectType: ReviewSubjectTypeDto,
  page: number,
): Promise<ListResponse<ReviewDecisionEventDto>> {
  return subjectType === "USER_NEED"
    ? listNeedReviewDecisions(projectId, subjectId, page, PAGE_SIZE)
    : listRequirementReviewDecisions(projectId, subjectId, page, PAGE_SIZE);
}

export function ReviewHistory({ projectId, subjectId, subjectType, refreshToken }: ReviewHistoryProps) {
  const { tr, lang } = useLanguage();
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<ReviewDecisionEventDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const requestToken = useRef(0);
  const historyLabels = tr.common.reviewHistory;
  const pageCount = getReviewHistoryPageCount(total, PAGE_SIZE);
  const viewState = getReviewHistoryViewState({ loading, hasError: error !== null, eventCount: events.length });

  useEffect(() => {
    setPage(1);
  }, [projectId, subjectId, subjectType, refreshToken]);

  useEffect(() => {
    const token = requestToken.current + 1;
    requestToken.current = token;
    setLoading(true);
    setError(null);
    void loadReviewHistory(projectId, subjectId, subjectType, page)
      .then((response) => {
        if (requestToken.current !== token) return;
        setEvents(response.data);
        setTotal(response.meta.total);
      })
      .catch((loadError: unknown) => {
        if (requestToken.current === token) {
          setEvents([]);
          setError(getErrorMessage(loadError, historyLabels.error));
        }
      })
      .finally(() => {
        if (requestToken.current === token) setLoading(false);
      });
    return () => {
      requestToken.current += 1;
    };
  }, [projectId, subjectId, subjectType, page, refreshToken, retryToken, historyLabels.error]);

  const retry = () => setRetryToken((current) => current + 1);
  const decisionLabels = {
    confirmed: historyLabels.confirmed,
    rejected: historyLabels.rejected,
    approved: historyLabels.approved,
    reopened: historyLabels.reopened,
  };

  return (
    <section className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{historyLabels.title}</h3>
      {viewState === "loading" ? (
        <div className="flex items-center gap-2 py-4 text-xs text-slate-500" role="status">
          <Loader size={13} className="animate-spin" /> {historyLabels.loading}
        </div>
      ) : viewState === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3" role="alert">
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={retry} className="mt-2 text-xs font-medium text-blue-800">{tr.common.retry}</button>
        </div>
      ) : viewState === "empty" ? (
        <p className="py-2 text-xs text-slate-500">{historyLabels.empty}</p>
      ) : (
        <>
          <div className="space-y-2.5">
            {events.map((event) => {
              const confidence = getConfidenceDisplay(event.ai_confidence_snapshot);
              const proposal = proposalRows(event.proposal_snapshot, tr);
              const previousKey = getReviewStatusKey(event.previous_status);
              const newKey = getReviewStatusKey(event.new_status);
              return (
                <article key={event.id} className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {getReviewDecisionLabel(event.decision, decisionLabels)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {historyLabels.statusChange}: {(tr.status as Record<string, string>)[previousKey] ?? previousKey}
                        {" → "}{(tr.status as Record<string, string>)[newKey] ?? newKey}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                      <Clock3 size={11} /> {formatDateTime(event.decided_at, lang)}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-1.5 text-[11px] text-slate-600">
                    {event.reviewer_id && <p className="flex items-start gap-1.5"><UserRound size={11} className="mt-0.5 shrink-0" />{historyLabels.reviewerId}: <code className="break-all">{event.reviewer_id}</code></p>}
                    <p>{historyLabels.confidenceSnapshot}: {confidence.percentage === null ? "N/A" : `${confidence.percentage}% (${confidenceLevelLabel(confidence.level, tr)})`}</p>
                    {event.source_analysis_run_id && <p className="break-all">{historyLabels.sourceAnalysisRun}: <code>{event.source_analysis_run_id}</code></p>}
                    {event.review_note && <p className="whitespace-pre-wrap">{historyLabels.reviewNote}: {event.review_note}</p>}
                  </div>

                  <details className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                    <summary className="cursor-pointer text-[11px] font-medium text-blue-800">{historyLabels.proposalSnapshot}</summary>
                    <dl className="mt-2 space-y-2">
                      {proposal.map((entry) => (
                        <div key={entry.label}>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{entry.label}</dt>
                          <dd className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{entry.value}</dd>
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        <div><dt className="text-[10px] text-slate-500">{historyLabels.previousStatus}</dt><dd className="text-xs text-slate-700">{(tr.status as Record<string, string>)[previousKey] ?? previousKey}</dd></div>
                        <div><dt className="text-[10px] text-slate-500">{historyLabels.newStatus}</dt><dd className="text-xs text-slate-700">{(tr.status as Record<string, string>)[newKey] ?? newKey}</dd></div>
                      </div>
                    </dl>
                  </details>
                </article>
              );
            })}
          </div>
          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <span className="text-[11px] text-slate-500">{historyLabels.page(page, pageCount)}</span>
              <div className="flex gap-1">
                <button aria-label={tr.common.previous} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border p-1 disabled:opacity-40" style={{ borderColor: "var(--border)" }}><ChevronLeft size={13} /></button>
                <button aria-label={tr.common.next} disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded border p-1 disabled:opacity-40" style={{ borderColor: "var(--border)" }}><ChevronRight size={13} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
