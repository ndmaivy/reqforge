import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, CheckCircle, XCircle, Edit3, X, MessageSquare, ChevronDown, FileText, Loader, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { NeedStatus, ConfidenceLevel, Requirement } from "../data/mockData";
import type {
  FeedbackEvidenceDto,
  UserNeedDetailDto,
  UserNeedUpdateRequest,
  UserNeedViewModel,
} from "../../types/userNeed";
import { getErrorMessage } from "../../services/api";
import { ConfirmDialog, Modal } from "./Modal";
import { SimpleSelect } from "./SimpleSelect";
import { useLanguage } from "../i18n/LanguageContext";

const statusCfg: Record<NeedStatus, { bg: string; text: string }> = {
  Candidate: { bg: "#EFF6FF", text: "#1E3A8A" },
  Confirmed: { bg: "#ECFDF5", text: "#059669" },
  Rejected: { bg: "#FEF2F2", text: "#DC2626" },
};

const confCfg: Record<ConfidenceLevel, { color: string }> = {
  High: { color: "#059669" },
  Medium: { color: "#D97706" },
  Low: { color: "#DC2626" },
};

interface NeedDetailProps {
  need: UserNeedViewModel;
  detail: UserNeedDetailDto | null;
  detailLoading: boolean;
  detailError: string | null;
  actionBusy: boolean;
  requirements: Requirement[];
  onClose: () => void;
  onRetryDetail: () => Promise<void>;
  onConfirm: () => Promise<boolean>;
  onReject: () => Promise<boolean>;
  onSave: (title: string, description: string) => Promise<boolean>;
  onReviewSourceFeedback: () => void;
  onMarkEvidenceReviewed: () => Promise<void>;
  readOnly: boolean;
}

function feedbackStatusLabel(
  status: FeedbackEvidenceDto["status"],
  tr: ReturnType<typeof useLanguage>["tr"],
): string {
  return tr.status[status === "NEW" ? "New" : status === "ANALYZED" ? "Analyzed" : "Archived"];
}

function formatDateTime(value: string | null, lang: "VI" | "EN"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(lang === "VI" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

interface SourceFeedbackModalProps {
  feedback: FeedbackEvidenceDto[];
  onClose: () => void;
}

function SourceFeedbackModal({ feedback, onClose }: SourceFeedbackModalProps) {
  const { tr, lang } = useLanguage();

  return (
    <Modal title={tr.userNeeds.sourceFeedbackTitle} subtitle={tr.userNeeds.sourceFeedbackSubtitle} onClose={onClose} width="620px">
      <div className="px-5 py-5">
        {!feedback.length ? <p style={{ fontSize: "13px", color: "#64748B" }}>{tr.userNeeds.noSourceFeedback}</p> : <div className="max-h-80 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>{feedback.map((item) => <div key={item.id} className="border-b px-3 py-3 last:border-b-0" style={{ borderColor: "#F1F5F9", background: item.is_new ? "#F8FBFF" : "#fff" }}><div className="flex items-start gap-2"><span className="min-w-0 flex-1"><span className="block" style={{ fontSize: "12.5px", color: "#0F172A" }}>{item.content}</span><span className="mt-1 block" style={{ fontSize: "11px", color: "#64748B" }}>{item.source ?? tr.common.none} · {formatDateTime(item.feedback_date, lang)} · {feedbackStatusLabel(item.status, tr)}</span><span className="mt-1 block" style={{ fontSize: "11px", color: "#64748B" }}>{tr.userNeeds.linkedAt}: {formatDateTime(item.linked_at, lang)}</span></span>{item.is_new && <span className="rounded-full px-2 py-0.5" style={{ background: "#DBEAFE", color: "#1D4ED8", fontSize: "10px", fontWeight: 600 }}>{tr.userNeeds.newEvidence}</span>}</div></div>)}</div>}
      </div>
      <div className="flex gap-2 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <button onClick={onClose} className="rounded-md border px-4 py-2" style={{ borderColor: "var(--border)", color: "#475569", fontSize: "13px" }}>{tr.common.close}</button>
      </div>
    </Modal>
  );
}

function NeedDetail({ need, detail, detailLoading, detailError, actionBusy, requirements, onClose, onRetryDetail, onConfirm, onReject, onSave, onReviewSourceFeedback, onMarkEvidenceReviewed, readOnly }: NeedDetailProps) {
  const { tr, lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(need.title);
  const [editDesc, setEditDesc] = useState(need.description);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rejectConfirm, setRejectConfirm] = useState(false);

  const cc = confCfg[need.confidence];
  const sc = statusCfg[need.status];
  const supportingFb = detail?.supporting_feedback ?? [];
  const sortedSupportingFb = [...supportingFb].sort((a, b) => {
    if (a.is_new !== b.is_new) return a.is_new ? -1 : 1;
    return new Date(b.linked_at).getTime() - new Date(a.linked_at).getTime();
  });
  const coveredBy = requirements.filter((r) => r.sourceNeedId === need.id && r.status !== "Rejected");

  return (
    <div className="w-80 shrink-0 border-l flex flex-col" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748B", fontFamily: "var(--font-mono)" }}>{need.id}</span>
        <button onClick={onClose}><X size={14} style={{ color: "#94A3B8" }} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-md" style={{ background: sc.bg, color: sc.text, fontSize: "11px", fontWeight: 600 }}>{tr.status[need.status]}</span>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: cc.color }}>{tr.userNeeds.confidence}: {tr.common[need.confidence.toLowerCase() as "high" | "medium" | "low"]}</span>
        </div>
        {editing ? (
          <>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-md border px-3 py-2 outline-none" style={{ borderColor: "#1E3A8A", fontSize: "13px", fontWeight: 600 }} />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} className="w-full rounded-md border px-3 py-2 outline-none resize-none" style={{ borderColor: "#1E3A8A", fontSize: "12.5px" }} />
          </>
        ) : (
          <>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.35 }}>{need.title}</h3>
            <p style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.6 }}>{need.description}</p>
          </>
        )}

        {/* AI Confidence */}
        <div className="rounded-lg p-3" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} style={{ color: "#1E3A8A" }} />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr.userNeeds.aiConfidence}</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1E3A8A", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
              {need.confidenceScore === null ? "N/A" : `${Math.round(need.confidenceScore * 100)}%`}
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "#E2E8F0" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.round((need.confidenceScore ?? 0) * 100)}%`, background: "#1E3A8A" }} />
          </div>
        </div>

        {/* AI Explanation */}
        <div className="rounded-lg p-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} style={{ color: "#1E3A8A" }} />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#1E3A8A", textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr.userNeeds.aiExplanation}</span>
          </div>
          <p style={{ fontSize: "12px", color: "#1E3A8A", lineHeight: 1.55 }}>
            {supportingFb.length} phản hồi nguồn được nhóm vào nhu cầu người dùng này.
          </p>
        </div>

        {/* Source Feedback */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr.userNeeds.sourceFeedbackSection} ({detail?.evidence_count ?? need.evidenceCount})</p>
            {supportingFb.some((item) => item.is_new) && <button disabled={actionBusy} onClick={() => void onMarkEvidenceReviewed()} style={{ fontSize: "11px", color: "#1D4ED8" }}>{tr.userNeeds.markEvidenceReviewed}</button>}
          </div>
          <div className="space-y-1.5">
            {detailLoading && <div className="flex items-center gap-2 py-2"><Loader size={12} className="animate-spin" /><span style={{ fontSize: "12px", color: "#64748B" }}>{tr.userNeeds.evidenceLoading}</span></div>}
            {detailError && (
              <div className="rounded-md border p-2.5" style={{ borderColor: "#FCA5A5", background: "#FEF2F2" }}>
                <p style={{ fontSize: "11.5px", color: "#B91C1C" }}>{detailError}</p>
                <button onClick={() => void onRetryDetail()} style={{ fontSize: "11.5px", color: "#1E3A8A", marginTop: "4px" }}>{tr.common.retry}</button>
              </div>
            )}
            {sortedSupportingFb.map((fb) => (
              <div key={fb.id}>
                <button className="w-full flex items-center justify-between p-2.5 rounded-md border transition-colors hover:bg-gray-50" style={{ borderColor: fb.is_new ? "#60A5FA" : "var(--border)", background: fb.is_new ? "#F0F7FF" : "#F8FAFC" }}
                  onClick={() => { const n = new Set(expanded); n.has(fb.id) ? n.delete(fb.id) : n.add(fb.id); setExpanded(n); }}
                >
                  <div className="flex items-center gap-2">
                    {fb.is_new && <span className="h-2 w-2 rounded-full" style={{ background: "#2563EB" }} />}
                    <MessageSquare size={11} style={{ color: "#94A3B8" }} />
                    <span className="line-clamp-1 text-left" style={{ fontSize: "11.5px", color: "#0F172A", fontWeight: 500 }}>{fb.content}</span>
                    {fb.is_new && <span className="shrink-0 rounded-full px-2 py-0.5" style={{ background: "#DBEAFE", color: "#1D4ED8", fontSize: "10px", fontWeight: 600 }}>{tr.userNeeds.newEvidence}</span>}
                  </div>
                  <ChevronDown size={11} style={{ color: "#94A3B8", transform: expanded.has(fb.id) ? "rotate(180deg)" : "none" }} />
                </button>
                {expanded.has(fb.id) && (
                  <div className="px-3 py-2 rounded-b-md" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderTop: "none", fontSize: "12px", color: "#1E3A8A", lineHeight: 1.5 }}>
                    <p>"{fb.content}"</p>
                    <p className="mt-1 text-[11px] text-slate-500">{fb.source ?? tr.common.none} · {tr.userNeeds.feedbackDate}: {formatDateTime(fb.feedback_date, lang)} · {feedbackStatusLabel(fb.status, tr)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{tr.userNeeds.linkedAt}: {formatDateTime(fb.linked_at, lang)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Covered by Requirements */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
            {tr.userNeeds.coveredByRequirements}
          </p>
          {coveredBy.length > 0 ? (
            <div className="space-y-1.5">
              {coveredBy.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <FileText size={11} style={{ color: "#059669", flexShrink: 0 }} />
                  <span style={{ fontSize: "11.5px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#059669" }}>{r.id}</span>
                  <span style={{ fontSize: "11.5px", color: "#15803D" }} className="line-clamp-1">{r.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <span style={{ fontSize: "12px", color: "#92400E" }}>{tr.userNeeds.noRequirementsYet}</span>
              {need.status === "Confirmed" && (
                <span className="ml-auto px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#D97706", fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {tr.userNeeds.readyForGeneration}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
        {!readOnly && <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        {editing ? (
          <div className="flex gap-2">
            <button disabled={actionBusy || !editTitle.trim() || !editDesc.trim()} onClick={async () => { if (await onSave(editTitle.trim(), editDesc.trim())) setEditing(false); }} className="flex-1 py-2 rounded-md text-white text-center hover:opacity-90 disabled:opacity-60 transition-all" style={{ background: "#059669", fontSize: "12.5px", fontWeight: 500 }}>{actionBusy ? tr.common.saving : tr.userNeeds.save}</button>
            <button onClick={() => { setEditing(false); setEditTitle(need.title); setEditDesc(need.description); }} className="px-3 py-2 rounded-md border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)", fontSize: "12.5px" }}>{tr.userNeeds.cancel}</button>
          </div>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            <button disabled={detailLoading || supportingFb.length === 0} onClick={onReviewSourceFeedback} className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-blue-50 disabled:opacity-50 transition-colors" style={{ borderColor: "#BFDBFE", color: "#1E3A8A", fontSize: "12px", fontWeight: 500 }}>
              <MessageSquare size={11} /> {tr.userNeeds.reviewSourceFeedback}
            </button>
            {need.status === "Candidate" && (
              <button disabled={actionBusy} onClick={() => void onConfirm()} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:opacity-90 disabled:opacity-60 transition-all" style={{ background: "#059669", fontSize: "12px", fontWeight: 500 }}>
                <CheckCircle size={12} /> {tr.userNeeds.confirm}
              </button>
            )}
            {need.status === "Candidate" && <button disabled={actionBusy} onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60 transition-colors" style={{ borderColor: "var(--border)", fontSize: "12px" }}>
              <Edit3 size={11} /> {tr.userNeeds.edit}
            </button>}
            {need.status === "Candidate" && (
              <button onClick={() => setRejectConfirm(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-red-50 transition-colors" style={{ borderColor: "#FCA5A5", fontSize: "12px", color: "#DC2626" }}>
                <XCircle size={11} /> {tr.userNeeds.reject}
              </button>
            )}
          </div>
        )}
      </div>}

      {rejectConfirm && (
        <ConfirmDialog
          title={tr.userNeeds.rejectTitle}
          message={`"${need.title}" — ${tr.userNeeds.rejectMsg}`}
          confirmLabel={tr.userNeeds.reject}
          confirmDanger
          onConfirm={() => { void onReject().then((succeeded) => { if (succeeded) setRejectConfirm(false); }); }}
          onCancel={() => setRejectConfirm(false)}
        />
      )}
    </div>
  );
}

interface UserNeedsProps {
  needs: UserNeedViewModel[];
  requirements: Requirement[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => Promise<void>;
  onLoadNeedDetail: (needId: string) => Promise<UserNeedDetailDto>;
  onSaveNeed: (needId: string, payload: UserNeedUpdateRequest) => Promise<UserNeedViewModel>;
  onConfirmNeed: (needId: string) => Promise<UserNeedViewModel>;
  onRejectNeed: (needId: string) => Promise<UserNeedViewModel>;
  onMarkEvidenceReviewed: (needId: string) => Promise<void>;
  onDeleteNeed: (needId: string) => Promise<void>;
  destinationNeedId?: string | null;
  onDestinationHandled?: () => void;
  onSearchNeeds?: (query: string) => Promise<void>;
  readOnly?: boolean;
}

export function UserNeeds({
  needs,
  requirements,
  loading,
  loadError,
  onRetry,
  onLoadNeedDetail,
  onSaveNeed,
  onConfirmNeed,
  onRejectNeed,
  onMarkEvidenceReviewed,
  onDeleteNeed,
  destinationNeedId,
  onDestinationHandled,
  onSearchNeeds,
  readOnly = false,
}: UserNeedsProps) {
  const { tr, lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(tr.userNeeds.allStatuses);
  const [confFilter, setConfFilter] = useState<string>(tr.userNeeds.allConfidence);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserNeedDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionNeedId, setActionNeedId] = useState<string | null>(null);
  const [showSourceFeedback, setShowSourceFeedback] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserNeedViewModel | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [navigationHighlightId, setNavigationHighlightId] = useState<string | null>(null);
  const detailRequestId = useRef(0);

  const selected = selectedId ? needs.find((need) => need.id === selectedId) ?? null : null;

  useEffect(() => {
    if (!destinationNeedId || !needs.some((need) => need.id === destinationNeedId)) return;
    setSelectedId(destinationNeedId);
    setNavigationHighlightId(destinationNeedId);
    window.setTimeout(() => document.getElementById(`user-need-${destinationNeedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    void loadDetail(destinationNeedId);
    window.setTimeout(() => setNavigationHighlightId(null), 3500);
    onDestinationHandled?.();
  }, [destinationNeedId, needs]);

  useEffect(() => {
    if (!onSearchNeeds) return;
    const timer = window.setTimeout(() => void onSearchNeeds(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search, onSearchNeeds]);

  const loadDetail = async (needId: string): Promise<void> => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const loaded = await onLoadNeedDetail(needId);
      if (detailRequestId.current === requestId) setDetail(loaded);
    } catch (error) {
      if (detailRequestId.current === requestId) {
        setDetailError(getErrorMessage(error, "Không thể tải chi tiết nhu cầu người dùng."));
      }
    } finally {
      if (detailRequestId.current === requestId) setDetailLoading(false);
    }
  };

  const selectNeed = (needId: string): void => {
    if (selectedId === needId) {
      detailRequestId.current += 1;
      setSelectedId(null);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    setSelectedId(needId);
    setDetail(null);
    void loadDetail(needId);
  };

  const confirm = async (needId: string): Promise<boolean> => {
    if (actionNeedId) return false;
    setActionNeedId(needId);
    try {
      await onConfirmNeed(needId);
      setDetail((current) => current?.id === needId ? { ...current, status: "CONFIRMED" } : current);
      toast.success(tr.userNeeds.confirmedSuccess);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xác nhận nhu cầu người dùng."));
      return false;
    } finally {
      setActionNeedId(null);
    }
  };

  const reject = async (needId: string): Promise<boolean> => {
    if (actionNeedId) return false;
    setActionNeedId(needId);
    try {
      await onRejectNeed(needId);
      setDetail((current) => current?.id === needId ? { ...current, status: "REJECTED" } : current);
      setSelectedId(null);
      toast.success(tr.userNeeds.rejectedSuccess);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể từ chối nhu cầu người dùng."));
      return false;
    } finally {
      setActionNeedId(null);
    }
  };

  const save = async (needId: string, title: string, description: string): Promise<boolean> => {
    if (actionNeedId) return false;
    setActionNeedId(needId);
    try {
      await onSaveNeed(needId, { title, description });
      setDetail((current) => current?.id === needId ? { ...current, title, description } : current);
      toast.success(tr.userNeeds.savedSuccess);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu nhu cầu người dùng."));
      return false;
    } finally {
      setActionNeedId(null);
    }
  };

  const filtered = useMemo(() => {
    let list = needs;
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((n) => n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)); }
    if (statusFilter !== tr.userNeeds.allStatuses) {
      if (statusFilter === tr.status.Candidate) list = list.filter((n) => n.status === "Candidate");
      else if (statusFilter === tr.status.Confirmed) list = list.filter((n) => n.status === "Confirmed");
      else if (statusFilter === tr.status.Rejected) list = list.filter((n) => n.status === "Rejected");
    }
    if (confFilter !== tr.userNeeds.allConfidence) list = list.filter((n) => n.confidence === confFilter);
    return [...list].sort((a, b) => {
      const aNew = a.newEvidenceCount > 0;
      const bNew = b.newEvidenceCount > 0;
      if (aNew !== bNew) return aNew ? -1 : 1;
      if (aNew && bNew) {
        const evidenceOrder = new Date(b.latestEvidenceAt ?? 0).getTime() - new Date(a.latestEvidenceAt ?? 0).getTime();
        if (evidenceOrder !== 0) return evidenceOrder;
      }
      const statusRank = { Candidate: 1, Confirmed: 2, Rejected: 3 };
      const rankOrder = statusRank[a.status] - statusRank[b.status];
      if (rankOrder !== 0) return rankOrder;
      return new Date(b.latestEvidenceAt ?? 0).getTime() - new Date(a.latestEvidenceAt ?? 0).getTime();
    });
  }, [needs, search, statusFilter, confFilter, tr]);

  const confirmed = needs.filter((n) => n.status === "Confirmed").length;
  const candidate = needs.filter((n) => n.status === "Candidate").length;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 style={{ fontSize: "19px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{tr.userNeeds.title}</h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>{tr.userNeeds.subtitle}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-2 mb-5">
            {[
              { label: tr.userNeeds.statTotal, value: needs.length, color: "#64748B", bg: "#F1F5F9" },
              { label: tr.userNeeds.statConfirmed, value: confirmed, color: "#059669", bg: "#ECFDF5" },
              { label: tr.userNeeds.statCandidate, value: candidate, color: "#1E3A8A", bg: "#EFF6FF" },
              { label: tr.userNeeds.statRejected, value: needs.filter((n) => n.status === "Rejected").length, color: "#DC2626", bg: "#FEF2F2" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: s.bg }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: "12px", color: s.color, opacity: 0.75 }}>·</span>
                <span style={{ fontSize: "12px", color: s.color, fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border flex-1" style={{ borderColor: "var(--border)", background: "#fff" }}>
              <Search size={13} style={{ color: "#94A3B8" }} />
              <input type="text" placeholder={tr.userNeeds.search} value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ fontSize: "13px" }} />
            </div>
            <SimpleSelect value={statusFilter} options={[tr.userNeeds.allStatuses, tr.status.Candidate, tr.status.Confirmed, tr.status.Rejected]} onChange={setStatusFilter} />
            <SimpleSelect value={confFilter} options={[tr.userNeeds.allConfidence, "High", "Medium", "Low"]} onChange={setConfFilter} />
            <span style={{ fontSize: "11.5px", color: "#94A3B8", marginLeft: "auto" }}>{filtered.length} needs</span>
          </div>

          {/* Cards */}
          {loadError && (
            <div className="mb-3 flex items-center justify-between rounded-lg border px-4 py-3" style={{ background: "#FEF2F2", borderColor: "#FCA5A5" }}>
              <span style={{ fontSize: "12.5px", color: "#B91C1C" }}>{loadError}</span>
              <button onClick={() => void onRetry()} style={{ fontSize: "12px", color: "#1E3A8A", fontWeight: 500 }}>{tr.common.retry}</button>
            </div>
          )}
          {loading && needs.length === 0 ? (
            <div className="flex items-center justify-center py-16 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <Loader size={14} className="animate-spin" style={{ color: "#1E3A8A" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B" }}>{tr.userNeeds.noNeeds}</p>
              <button onClick={() => { setSearch(""); setStatusFilter(tr.userNeeds.allStatuses); setConfFilter(tr.userNeeds.allConfidence); }} style={{ fontSize: "12.5px", color: "#1E3A8A", marginTop: "6px" }}>{tr.common.clearFilters}</button>
            </div>
          ) : (
            <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${selected ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
              {filtered.map((need) => {
                const sc = statusCfg[need.status];
                const cc = confCfg[need.confidence];
                const isSelected = selectedId === need.id;
                const fbCount = need.evidenceCount;
                const needReqs = requirements.filter((r) => r.sourceNeedId === need.id && r.status !== "Rejected");
                const requirementCount = Math.max(need.requirementCount, needReqs.length);
                const isCovered = requirementCount > 0;
                return (
                  <div key={need.id} onClick={() => selectNeed(need.id)}
                    id={`user-need-${need.id}`}
                    className={`relative flex flex-col rounded-lg border p-4 cursor-pointer transition-all ${navigationHighlightId === need.id ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
                    style={{ background: isSelected ? "#EFF6FF" : need.newEvidenceCount > 0 ? "#F8FBFF" : "var(--card)", borderColor: isSelected ? "#1E3A8A" : need.newEvidenceCount > 0 ? "#93C5FD" : "var(--border)" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = "#BFDBFE"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = need.newEvidenceCount > 0 ? "#2563EB" : "var(--border)"; }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md" style={{ background: sc.bg, color: sc.text, fontSize: "11px", fontWeight: 600 }}>{tr.status[need.status]}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Sparkles size={10} style={{ color: "#1E3A8A" }} />
                        <span style={{ fontSize: "11.5px", fontWeight: 600, color: cc.color }}>{tr.userNeeds.confidence}: {tr.common[need.confidence.toLowerCase() as "high" | "medium" | "low"]}</span>
                      </div>
                    </div>
                    <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--foreground)", marginBottom: "5px", lineHeight: 1.3 }}>{need.title}</h3>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex items-center gap-1.5 whitespace-nowrap" style={{ fontSize: "11.5px", color: "#64748B" }}><MessageSquare size={11} style={{ color: "#94A3B8" }} /> {fbCount} {tr.userNeeds.sourceFeedbackCountLabel}</span>
                        {need.newEvidenceCount > 0 && <span className="flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap" style={{ background: "#DBEAFE", color: "#1D4ED8", fontSize: "10.5px", fontWeight: 600 }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "#2563EB" }} />+{need.newEvidenceCount} {tr.userNeeds.newEvidence}</span>}
                      </div>
                      {need.status === "Confirmed" && <span className="shrink-0 rounded-full px-2 py-0.5" style={{ background: isCovered ? "#DCFCE7" : "#FEF3C7", color: isCovered ? "#15803D" : "#D97706", fontSize: "10px", fontWeight: 600 }}>{isCovered ? tr.userNeeds.requirementCreated : tr.userNeeds.readyForGeneration}</span>}
                    </div>
                    {need.newEvidenceCount > 0 && need.latestEvidenceAt && <p className="mt-1 text-[10.5px] text-blue-700">{tr.userNeeds.updatedAt}: {formatDateTime(need.latestEvidenceAt, lang)}</p>}
                    <div className="mt-auto flex items-center justify-end gap-1 pt-3" onClick={(e) => e.stopPropagation()}>
                        {!readOnly && need.status === "Candidate" && (
                          <button disabled={actionNeedId !== null} onClick={() => void confirm(need.id)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-white disabled:opacity-60 transition-colors" style={{ background: "#059669", fontSize: "11px", fontWeight: 600 }}>
                            <CheckCircle size={10} /> {tr.userNeeds.confirm}
                          </button>
                        )}
                        <button aria-label={tr.userNeeds.moreActions} onClick={() => setOpenMenuId(openMenuId === need.id ? null : need.id)} className="rounded-md border p-1.5 hover:bg-gray-50" style={{ borderColor: "var(--border)", color: "#64748B" }}>
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenuId === need.id && <div className="absolute z-20 mt-2 w-44 rounded-lg border bg-white py-1 shadow-lg" style={{ borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => selectNeed(need.id)} className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50">{tr.userNeeds.viewDetails}</button>
                          <button onClick={() => { selectNeed(need.id); setShowSourceFeedback(true); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50">{tr.userNeeds.reviewSourceFeedback}</button>
                          {!readOnly && need.status === "Candidate" && <button onClick={() => { selectNeed(need.id); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50">{tr.userNeeds.edit}</button>}
                          {!readOnly && need.status === "Candidate" && <button onClick={() => { setOpenMenuId(null); selectNeed(need.id); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50">{tr.userNeeds.reject}</button>}
                          {!readOnly && need.status === "Candidate" && <button onClick={() => { setOpenMenuId(null); setDeleteTarget(need); }} className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">{tr.common.delete}</button>}
                        </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <NeedDetail
          need={selected}
          detail={detail?.id === selected.id ? detail : null}
          detailLoading={detailLoading}
          detailError={detailError}
          actionBusy={actionNeedId === selected.id}
          requirements={requirements}
          onClose={() => { detailRequestId.current += 1; setSelectedId(null); setDetail(null); setDetailError(null); setDetailLoading(false); }}
          onRetryDetail={() => loadDetail(selected.id)}
          onConfirm={() => confirm(selected.id)}
          onReject={() => reject(selected.id)}
          onSave={(title, description) => save(selected.id, title, description)}
          onReviewSourceFeedback={() => setShowSourceFeedback(true)}
          onMarkEvidenceReviewed={async () => { await onMarkEvidenceReviewed(selected.id); await loadDetail(selected.id); }}
          readOnly={readOnly}
        />
      )}
      {showSourceFeedback && selected && detail?.id === selected.id && (
        <SourceFeedbackModal
          feedback={detail.supporting_feedback}
          onClose={() => setShowSourceFeedback(false)}
        />
      )}
      {deleteTarget && <ConfirmDialog title={tr.userNeeds.deleteTitle} message={tr.userNeeds.deleteMessage} confirmLabel={tr.common.delete} confirmDanger onCancel={() => setDeleteTarget(null)} onConfirm={() => { void onDeleteNeed(deleteTarget.id).then(() => { setDeleteTarget(null); if (selectedId === deleteTarget.id) setSelectedId(null); }).catch((error) => toast.error(getErrorMessage(error, tr.userNeeds.deleteError))); }} />}
    </div>
  );
}
