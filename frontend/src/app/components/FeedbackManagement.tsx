import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Sparkles, Search, X, ExternalLink, CheckCircle, Loader, Link2, Copy, Globe, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { FeedbackItem, FeedbackCategory, FeedbackSource, FeedbackStatus, Project } from "../data/mockData";
import { Modal, ConfirmDialog } from "./Modal";
import { SimpleSelect } from "./SimpleSelect";
import { ApiError, getErrorMessage } from "../../services/api";
import type { FeedbackCreateRequest, FeedbackImportResult, SimilarFeedbackDto } from "../../types/feedback";
import type { AnalysisRunDto, FeedbackAnalysisRequest } from "../../types/analysis";
import {
  createPublicForm,
  getPublicForm,
  rotatePublicFormToken,
  updatePublicForm,
} from "../../services/publicFeedback";
import type { PublicFormDto, PublicFormTokenDto } from "../../types/publicFeedback";
import { useLanguage } from "../i18n/LanguageContext";

const FEEDBACK_SOURCES: FeedbackSource[] = [
  "Interview", "Survey", "Usability Test", "App Review",
  "Support", "Email", "Public Feedback Form", "Manual Record", "Other",
];

const CATEGORIES = ["Unclassified", "Usability", "Feature Request", "Bug", "Complaint", "Suggestion", "Non-functional"];

const categoryColors: Record<string, { bg: string; text: string }> = {
  "Unclassified": { bg: "#F1F5F9", text: "#64748B" },
  "Usability": { bg: "#F5F3FF", text: "#6D28D9" },
  "Feature Request": { bg: "#EFF6FF", text: "#1E3A8A" },
  "Bug": { bg: "#FEF2F2", text: "#DC2626" },
  "Complaint": { bg: "#FFF7ED", text: "#C2410C" },
  "Suggestion": { bg: "#F0FDF4", text: "#15803D" },
  "Non-functional": { bg: "#ECFEFF", text: "#0E7490" },
};

const statusDot: Record<FeedbackStatus, string> = {
  New: "#D97706", Analyzed: "#059669", Archived: "#94A3B8",
};

const sourceIcon: Partial<Record<FeedbackSource, string>> = {
  Interview: "🎤", Survey: "📋", "Usability Test": "🖥️", "App Review": "⭐",
  Support: "💬", Email: "✉️", "Public Feedback Form": "🌐", "Manual Record": "📝", Other: "📌",
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface FeedbackDetailProps {
  item: FeedbackItem;
  onClose: () => void;
  onArchive: () => void;
  onSave: (text: string, category: FeedbackCategory, isNoise: boolean) => Promise<void>;
  onAnalyze: () => Promise<void>;
  similar: SimilarFeedbackDto[];
  similarLoading: boolean;
  readOnly: boolean;
}

function FeedbackDetail({ item, onClose, onArchive, onSave, onAnalyze, similar, similarLoading, readOnly }: FeedbackDetailProps) {
  const { tr } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editCat, setEditCat] = useState<FeedbackCategory>(item.category);
  const [editIsNoise, setEditIsNoise] = useState(item.isNoise);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const cc = categoryColors[item.category] || categoryColors["Suggestion"];

  return (
    <div className="w-80 shrink-0 border-l flex flex-col" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", fontFamily: "var(--font-mono)" }}>{item.id}</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusDot[item.status] }} />
            <span style={{ fontSize: "11px", fontWeight: 500, color: statusDot[item.status] }}>{item.status}</span>
          </div>
        </div>
        <button onClick={onClose}><X size={14} style={{ color: "#94A3B8" }} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Content */}
        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{tr.feedback.contentLabel}</p>
          {editing ? (
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4}
              className="w-full rounded-md border px-3 py-2 outline-none resize-none"
              style={{ borderColor: "#1E3A8A", fontSize: "13px", background: "#F8FAFC" }} />
          ) : (
            <p className="rounded-lg p-3" style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.6, background: "#F8FAFC", border: "1px solid var(--border)" }}>
              "{item.text}"
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-2.5">
          {[
            { label: tr.common.source, value: `${sourceIcon[item.source] ?? ""} ${item.source}` },
            ...(item.sourceReference ? [{ label: tr.common.reference, value: item.sourceReference }] : []),
            ...(item.userSegment ? [{ label: tr.common.segment, value: item.userSegment }] : []),
            ...(item.context ? [{ label: tr.common.context, value: item.context }] : []),
            ...(item.notes ? [{ label: "Notes", value: item.notes }] : []),
            { label: tr.common.date, value: item.date },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-2">
              <span style={{ fontSize: "11.5px", color: "#94A3B8", flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: "12px", color: "var(--foreground)", textAlign: "right" }}>{value}</span>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>{tr.common.category}</span>
            {editing ? (
              <select value={editCat} onChange={(e) => setEditCat(e.target.value as FeedbackCategory)}
                className="rounded border px-2 py-0.5 outline-none"
                style={{ fontSize: "11.5px", borderColor: "var(--border)", background: "#F8FAFC" }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <span className="px-2 py-0.5 rounded-md" style={{ background: cc.bg, color: cc.text, fontSize: "11px", fontWeight: 500 }}>{item.category}</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>{tr.feedback.signalNoise}</span>
            {editing ? <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={editIsNoise} onChange={(event) => setEditIsNoise(event.target.checked)} /> Mark as noise</label> : <span style={{ fontSize: "12px", fontWeight: 500, color: item.isNoise ? "#DC2626" : "#059669" }}>{item.isNoise ? tr.feedback.likelyNoise : tr.feedback.usefulSignal}</span>}
          </div>

          {item.userNeedId && (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>{tr.feedback.linkedNeed}</span>
              <span className="flex items-center gap-1" style={{ fontSize: "12px", color: "#1E3A8A", fontWeight: 500 }}>
                {item.userNeedId} <ExternalLink size={10} />
              </span>
            </div>
          )}
        </div>

        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "7px" }}>Similar feedback</p>
          {similarLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500"><Loader size={12} className="animate-spin" /> Loading matches...</div>
          ) : similar.length ? (
            <div className="space-y-2">
              {similar.slice(0, 5).map((match) => (
                <div key={match.feedback.id} className="rounded-lg border p-2.5" style={{ borderColor: "var(--border)", background: "#F8FAFC" }}>
                  <p className="line-clamp-2" style={{ fontSize: "11.5px", lineHeight: 1.45 }}>{match.feedback.content}</p>
                  <p className="mt-1" style={{ fontSize: "10.5px", color: "#64748B" }}>{Math.round(Number(match.score) * 100)}% match</p>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: "11.5px", color: "#94A3B8" }}>No persisted similarity matches yet.</p>}
        </div>

        {/* AI info */}
        {item.status === "Analyzed" ? (
          <div className="rounded-lg p-3" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={11} style={{ color: "#1E3A8A" }} />
              <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#1E3A8A", textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr.feedback.aiAnalyzed}</p>
            </div>
            <p style={{ fontSize: "11.5px", color: "#1E3A8A", lineHeight: 1.5 }}>
              {item.isNoise
                ? "This feedback was classified as noise — low value for requirement extraction."
                : "Feedback was classified and grouped with similar records."}
            </p>
            {item.userNeedId && (
              <button className="mt-2 flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ fontSize: "11.5px", color: "#1E3A8A", fontWeight: 500 }}>
                <ExternalLink size={11} /> View linked User Need
              </button>
            )}
          </div>
        ) : readOnly ? null : (
          <div className="rounded-lg p-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <p style={{ fontSize: "11.5px", color: "#92400E", marginBottom: "8px" }}>{tr.feedback.notAnalyzed}</p>
            <button onClick={async () => {
              if (analyzing) return;
              setAnalyzing(true);
              try { await onAnalyze(); } finally { setAnalyzing(false); }
            }} disabled={analyzing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white hover:opacity-90 disabled:opacity-60 transition-all"
              style={{ background: "#1E3A8A", fontSize: "12px", fontWeight: 500 }}>
              {analyzing ? <Loader size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {analyzing ? tr.feedback.analyzing : tr.feedback.analyzeThis}
            </button>
          </div>
        )}
      </div>

      {!readOnly && <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={async () => {
              if (!editText.trim() || saving) return;
              setSaving(true);
              setSaveError(null);
              try {
                await onSave(editText.trim(), editCat, editIsNoise);
                setEditing(false);
                toast.success(tr.feedback.changesSaved);
              } catch (error) {
                setSaveError(getErrorMessage(error, tr.feedback.saveError));
              } finally {
                setSaving(false);
              }
            }}
              disabled={saving || !editText.trim()}
              className="flex-1 py-2 rounded-md text-white text-center hover:opacity-90"
              style={{ background: "#059669", fontSize: "12.5px", fontWeight: 500 }}>
              {saving ? tr.common.saving : tr.common.save}
            </button>
            <button onClick={() => { setEditing(false); setEditText(item.text); setEditCat(item.category); setEditIsNoise(item.isNoise); }}
              className="px-3 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "12.5px" }}>{tr.common.cancel}</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="flex-1 py-2 rounded-md border hover:bg-gray-50 text-center"
              style={{ borderColor: "var(--border)", fontSize: "12.5px", color: "#374151" }}>{tr.common.edit}</button>
            <button onClick={onArchive} className="flex-1 py-2 rounded-md border hover:bg-red-50 text-center"
              style={{ borderColor: "#FCA5A5", fontSize: "12.5px", color: "#DC2626" }}>{tr.common.archive}</button>
          </div>
        )}
        {saveError && <p style={{ fontSize: "11.5px", color: "#DC2626" }}>{saveError}</p>}
      </div>}
    </div>
  );
}

// ─── Public Link Panel ────────────────────────────────────────────────────────

interface PublicLinkPanelProps {
  project: Project;
  onClose: () => void;
  canManage: boolean;
}

function PublicLinkPanel({ project, onClose, canManage }: PublicLinkPanelProps) {
  const [form, setForm] = useState<PublicFormDto | null>(null);
  const [tokenForm, setTokenForm] = useState<PublicFormTokenDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    getPublicForm(project.id)
      .then(setForm)
      .catch((reason) => {
        if (!(reason instanceof ApiError && reason.status === 404)) setError(getErrorMessage(reason, "Unable to load public form."));
      })
      .finally(() => setLoading(false));
  }, [project.id]);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const created = await createPublicForm(project.id, { title: `${project.name} feedback`, description: `Share feedback about ${project.productName || project.name}.` });
      setForm(created); setTokenForm(created); toast.success("Public feedback form created");
    } catch (reason) { setError(getErrorMessage(reason, "Unable to create public form.")); } finally { setBusy(false); }
  };

  const rotate = async () => {
    setBusy(true); setError(null);
    try { const rotated = await rotatePublicFormToken(project.id); setForm(rotated); setTokenForm(rotated); toast.success("A new public link was generated"); }
    catch (reason) { setError(getErrorMessage(reason, "Unable to rotate public link.")); } finally { setBusy(false); }
  };

  const toggle = async () => {
    if (!form) return;
    setBusy(true); setError(null);
    try { const updated = await updatePublicForm(project.id, { is_active: !form.is_active }); setForm(updated); setConfirmDisable(false); toast.success(updated.is_active ? "Public link enabled" : "Public link disabled"); }
    catch (reason) { setError(getErrorMessage(reason, "Unable to update public form.")); } finally { setBusy(false); }
  };

  const url = tokenForm?.public_url ?? "Generate or rotate the token to reveal a shareable link";
  const handleCopy = () => { if (!tokenForm) return; navigator.clipboard.writeText(tokenForm.public_url).catch(() => {}); toast.success("Link copied"); };

  return (
    <Modal title="Public Feedback Link" subtitle="Collect feedback directly from end users" onClose={onClose} width="480px">
      <div className="px-5 py-5 space-y-4">
        {loading ? <div className="flex justify-center py-8"><Loader className="animate-spin" /></div> : !form ? (
          <div className="rounded-xl border p-5 text-center" style={{ borderColor: "var(--border)" }}><p className="mb-3 text-sm text-slate-600">This project does not have a public feedback form yet.</p>{canManage && <button disabled={busy} onClick={() => void create()} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating..." : "Create public form"}</button>}</div>
        ) : <>
        {/* Status + URL */}
        <div className="rounded-xl border p-4" style={{ background: "#F8FAFC", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>Status</span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full" style={{ background: form.is_active ? "#ECFDF5" : "#F1F5F9", fontSize: "11px", fontWeight: 600, color: form.is_active ? "#059669" : "#64748B" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: form.is_active ? "#059669" : "#94A3B8" }} />
              {form.is_active ? "Active" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg border" style={{ borderColor: "#BFDBFE", background: "#EFF6FF" }}>
            <Globe size={13} style={{ color: "#1E3A8A", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#1E3A8A", fontFamily: "var(--font-mono)", flex: 1 }} className="truncate">{url}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button disabled={!tokenForm} onClick={handleCopy} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border hover:bg-gray-50 disabled:opacity-40 transition-colors" style={{ borderColor: "var(--border)" }}>
            <Copy size={16} style={{ color: "#1E3A8A" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#374151" }}>Copy Link</span>
          </button>
          <button disabled={!tokenForm} onClick={() => tokenForm && window.open(tokenForm.public_url, "_blank", "noopener,noreferrer")} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border hover:bg-gray-50 disabled:opacity-40 transition-colors" style={{ borderColor: "var(--border)" }}>
            <ExternalLink size={16} style={{ color: "#1E3A8A" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#374151" }}>Open Form</span>
          </button>
          <button disabled={busy || !canManage} onClick={() => setConfirmDisable(true)} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border hover:bg-red-50 disabled:opacity-50 transition-colors" style={{ borderColor: form.is_active ? "#FCA5A5" : "var(--border)" }}>
            <X size={16} style={{ color: form.is_active ? "#DC2626" : "#94A3B8" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 500, color: form.is_active ? "#DC2626" : "#64748B" }}>{form.is_active ? "Disable" : "Enable"}</span>
          </button>
        </div>

        <p style={{ fontSize: "11.5px", color: "#94A3B8", lineHeight: 1.5 }}>
          End users can submit feedback without a ReqForge account. Submissions appear in your Feedback Inbox with source "Public Feedback Form".
        </p>
        {canManage && <button disabled={busy} onClick={() => void rotate()} className="w-full rounded-lg border py-2 text-xs font-semibold text-blue-900 disabled:opacity-50" style={{ borderColor: "#BFDBFE" }}>{tokenForm ? "Rotate link token" : "Generate a new shareable link"}</button>}
        </>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </div>

      {confirmDisable && (
        <ConfirmDialog
          title={form?.is_active ? "Disable Public Feedback Link?" : "Enable Public Feedback Link?"}
          message={form?.is_active ? "The form will stop accepting new submissions." : "The form will be ready to accept new submissions."}
          confirmLabel={form?.is_active ? "Disable" : "Enable"}
          confirmDanger={form?.is_active}
          onConfirm={() => void toggle()}
          onCancel={() => setConfirmDisable(false)}
        />
      )}
    </Modal>
  );
}

// ─── Analyze Modal ────────────────────────────────────────────────────────────

interface AnalyzeModalProps {
  feedback: FeedbackItem[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onClose: () => void;
  onRun: (payload: FeedbackAnalysisRequest, signal: AbortSignal) => Promise<AnalysisRunDto>;
  onViewNeeds?: () => void;
}

function AnalyzeModal({ feedback, selectedIds, onSelectedIdsChange, onClose, onRun, onViewNeeds }: AnalyzeModalProps) {
  const { tr } = useLanguage();
  const [step, setStep] = useState<"config" | "loading" | "done" | "error">("config");
  const [result, setResult] = useState({ analyzed: 0, needs: 0 });
  const [runError, setRunError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const available = feedback.filter((item) => item.status !== "Archived");
  const selected = available.filter((item) => selectedIds.has(item.id));

  useEffect(() => () => controllerRef.current?.abort(), []);

  const toggle = (feedbackId: string) => {
    const next = new Set(selectedIds);
    next.has(feedbackId) ? next.delete(feedbackId) : next.add(feedbackId);
    onSelectedIdsChange(next);
  };

  const run = async () => {
    if (!selected.length) return;
    setStep("loading");
    setRunError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const analysisRun = await onRun(
        { mode: "SELECTED", feedback_ids: selected.map((item) => item.id) },
        controller.signal,
      );
      const output = analysisRun.output_json;
      const analyzed = output?.feedback_results?.length ?? selected.length;
      const needs = output?.candidate_needs?.length ?? 0;
      setResult({ analyzed, needs });
      onSelectedIdsChange(new Set());
      setStep("done");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = getErrorMessage(error, tr.feedback.analysisError);
      setRunError(message.toLowerCase().includes("timeout") ? tr.feedback.analysisTimeout : message);
      setStep("error");
    } finally {
      controllerRef.current = null;
    }
  };

  const finish = () => { onViewNeeds ? onViewNeeds() : onClose(); };

  return (
    <Modal title={tr.feedback.analyzeTitle} onClose={onClose} width="620px">
      {step === "config" && (
        <>
          <div className="px-5 py-5 space-y-4">
            <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>
              {tr.feedback.analyzeDescription}
            </p>
            <div className="flex items-center justify-between gap-3">
              <span style={{ fontSize: "12px", color: "#475569" }}>{tr.feedback.selectedForAnalysis(selected.length)}</span>
              <div className="flex gap-2">
                <button onClick={() => onSelectedIdsChange(new Set(available.map((item) => item.id)))} style={{ fontSize: "12px", color: "#1E3A8A" }}>{tr.feedback.selectAll}</button>
                <button onClick={() => onSelectedIdsChange(new Set())} style={{ fontSize: "12px", color: "#64748B" }}>{tr.feedback.clearSelection}</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
              {available.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 last:border-b-0" style={{ borderColor: "#F1F5F9", background: selectedIds.has(item.id) ? "#EFF6FF" : "#fff" }}>
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} className="mt-1" />
                <span className="min-w-0 flex-1"><span className="block line-clamp-2" style={{ fontSize: "12.5px", color: "#0F172A" }}>{item.text}</span><span className="mt-1 block" style={{ fontSize: "11px", color: "#64748B" }}>{item.source} · {item.date} · {tr.status[item.status]}</span></span>
              </label>)}
            </div>
          </div>
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>{tr.common.cancel}</button>
            <button onClick={() => void run()} disabled={!selected.length}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: "#1E3A8A", fontSize: "13px", fontWeight: 500 }}>
              <Sparkles size={13} /> {tr.feedback.analyzeSelected(selected.length)}
            </button>
          </div>
        </>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center py-12 px-6">
          <Loader size={32} className="animate-spin mb-4" style={{ color: "#1E3A8A" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>
            {tr.feedback.analyzingSelected(selected.length)}
          </p>
          <p style={{ fontSize: "12px", color: "#64748B" }}>{tr.feedback.batchProcessing}</p>
        </div>
      )}

      {step === "done" && (
        <>
          <div className="px-5 py-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} style={{ color: "#059669" }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#059669" }}>{tr.feedback.analysisCompleted}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: tr.feedback.feedbackAnalyzed, value: result.analyzed },
                { label: tr.feedback.candidateNeeds, value: result.needs },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border p-3 text-center" style={{ background: "#F8FAFC", borderColor: "var(--border)" }}>
                  <p style={{ fontSize: "22px", fontWeight: 700, color: "#1E3A8A", letterSpacing: "-0.04em" }}>{s.value}</p>
                  <p style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px", lineHeight: 1.3 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "12px", color: "#64748B" }}>
              {tr.feedback.analysisCompletedHint}
            </p>
          </div>
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>{tr.common.close}</button>
            <button onClick={finish} className="flex-1 py-2 rounded-md text-white hover:opacity-90"
              style={{ background: "#1E3A8A", fontSize: "13px", fontWeight: 500 }}>{tr.feedback.viewNeeds}</button>
          </div>
        </>
      )}

      {step === "error" && (
        <>
          <div className="px-5 py-8">
            <div className="flex items-center gap-3 mb-3">
              <X size={22} style={{ color: "#DC2626" }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#DC2626" }}>{tr.feedback.analysisFailed}</p>
            </div>
            <p style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.6 }}>{runError}</p>
          </div>
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50" style={{ borderColor: "var(--border)", fontSize: "13px" }}>{tr.common.close}</button>
            <button onClick={() => void run()} className="flex-1 py-2 rounded-md text-white hover:opacity-90" style={{ background: "#1E3A8A", fontSize: "13px", fontWeight: 500 }}>{tr.common.retry}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FeedbackManagementProps {
  project: Project;
  feedback: FeedbackItem[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void | Promise<void>;
  onRecordFeedback: (payload: FeedbackCreateRequest) => Promise<void>;
  onImportFeedback: (file: File) => Promise<FeedbackImportResult>;
  onLoadFeedbackDetail: (feedbackId: string) => Promise<FeedbackItem>;
  onLoadSimilarFeedback: (feedbackId: string) => Promise<SimilarFeedbackDto[]>;
  onSaveFeedback: (feedbackId: string, content: string, category: FeedbackCategory, isNoise: boolean) => Promise<FeedbackItem>;
  onArchiveFeedback: (feedbackId: string) => Promise<FeedbackItem>;
  onAnalyzeFeedback: (payload: FeedbackAnalysisRequest, signal?: AbortSignal) => Promise<AnalysisRunDto>;
  onNavigate?: (screen: string) => void;
  showAddModal?: boolean;
  showImportModal?: boolean;
  showPublicLinkModal?: boolean;
  onCloseAddModal?: () => void;
  onCloseImportModal?: () => void;
  onClosePublicLinkModal?: () => void;
}

export function FeedbackManagement({
  project, feedback, loading, loadError, onRetry,
  onRecordFeedback, onImportFeedback, onLoadFeedbackDetail, onLoadSimilarFeedback, onSaveFeedback, onArchiveFeedback,
  onAnalyzeFeedback, onNavigate,
  showAddModal = false, showImportModal = false, showPublicLinkModal = false,
  onCloseAddModal, onCloseImportModal, onClosePublicLinkModal,
}: FeedbackManagementProps) {
  const { tr } = useLanguage();
  const canEdit = project.currentUserRole !== "VIEWER" && project.status !== "Archived";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<FeedbackItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [localShowRecord, setLocalShowRecord] = useState(false);
  const [localShowImport, setLocalShowImport] = useState(false);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [showPublicLink, setShowPublicLink] = useState(false);
  const [analysisSelection, setAnalysisSelection] = useState<Set<string>>(new Set());
  const [similarFeedback, setSimilarFeedback] = useState<SimilarFeedbackDto[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const [importStep, setImportStep] = useState<"idle" | "uploading" | "done">("idle");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<FeedbackImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const showRecord = showAddModal || localShowRecord;
  const showImport = showImportModal || localShowImport;
  const showPublicLinkVisible = showPublicLink || showPublicLinkModal;
  const closeRecord = () => { setLocalShowRecord(false); onCloseAddModal?.(); setRecordForm(emptyRecord()); setRecordError(""); setRecordSubmitError(null); };
  const closeImport = () => {
    setLocalShowImport(false);
    onCloseImportModal?.();
    setImportStep("idle");
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
    if (importInputRef.current) importInputRef.current.value = "";
  };
  const closePublicLinkVisible = () => { setShowPublicLink(false); onClosePublicLinkModal?.(); };

  // Record Feedback form
  const emptyRecord = () => ({
    text: "", source: "Interview" as FeedbackSource, userSegment: "",
    sourceReference: "", collectedDate: new Date().toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" }),
    context: "", notes: "",
  });
  const [recordForm, setRecordForm] = useState(emptyRecord());
  const [recordError, setRecordError] = useState("");
  const [recordSubmitError, setRecordSubmitError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const newCount = feedback.filter((f) => f.status === "New").length;
  const analyzedCount = feedback.filter((f) => f.status === "Analyzed").length;
  const archivedCount = feedback.filter((f) => f.status === "Archived").length;

  const filtered = useMemo(() => {
    let list = [...feedback];
    if (statusFilter === "New") list = list.filter((f) => f.status === "New");
    else if (statusFilter === "Analyzed") list = list.filter((f) => f.status === "Analyzed");
    else if (statusFilter === "Archived") list = list.filter((f) => f.status === "Archived");
    else list = list.filter((f) => f.status !== "Archived");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.text.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
    }
    if (categoryFilter !== "All Categories") list = list.filter((f) => f.category === categoryFilter);
    if (sourceFilter !== "All Sources") list = list.filter((f) => f.source === sourceFilter);
    return list;
  }, [feedback, search, categoryFilter, sourceFilter, statusFilter]);

  const parseFeedbackDate = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const vietnameseDate = trimmed.match(/^(\d{1,2})\s+tháng\s+(\d{1,2}),?\s+(\d{4})$/i);
    const parsed = vietnameseDate
      ? new Date(Date.UTC(Number(vietnameseDate[3]), Number(vietnameseDate[2]) - 1, Number(vietnameseDate[1])))
      : new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Collection Date must be a valid date.");
    }
    return parsed.toISOString();
  };

  const handleRecord = async () => {
    if (!recordForm.text.trim()) { setRecordError("Feedback content is required"); return; }
    if (recording) return;
    setRecording(true);
    setRecordSubmitError(null);
    try {
      await onRecordFeedback({
        content: recordForm.text.trim(),
        source: recordForm.source,
        user_segment: recordForm.userSegment.trim() || null,
        context: recordForm.context.trim() || null,
        notes: [recordForm.sourceReference.trim(), recordForm.notes.trim()].filter(Boolean).join(" — ") || null,
        feedback_date: parseFeedbackDate(recordForm.collectedDate),
      });
      closeRecord();
      toast.success(tr.feedback.recordedSuccess);
    } catch (error) {
      setRecordSubmitError(getErrorMessage(error, tr.feedback.recordError));
    } finally {
      setRecording(false);
    }
  };

  const handleOpenFeedback = async (item: FeedbackItem) => {
    if (selected?.id === item.id) {
      setSelected(null);
      return;
    }
    if (detailLoadingId) return;
    setDetailLoadingId(item.id);
    setSimilarLoading(true);
    setSimilarFeedback([]);
    const toastId = toast.loading(tr.feedback.detailLoading);
    try {
      const [detail, similar] = await Promise.all([
        onLoadFeedbackDetail(item.id),
        onLoadSimilarFeedback(item.id),
      ]);
      setSelected(detail);
      setSimilarFeedback(similar);
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(getErrorMessage(error, tr.feedback.detailError), { id: toastId });
    } finally {
      setDetailLoadingId(null);
      setSimilarLoading(false);
    }
  };

  const handleAnalyzeSingle = async (item: FeedbackItem) => {
    const toastId = toast.loading(`Analyzing ${item.id}...`);
    try {
      await onAnalyzeFeedback({ mode: "SELECTED", feedback_ids: [item.id] });
      const refreshed = await onLoadFeedbackDetail(item.id);
      setSelected(refreshed);
      toast.success(`${item.id} analyzed`, { id: toastId });
    } catch (error) {
      toast.error(getErrorMessage(error, tr.feedback.analysisError), { id: toastId });
      throw error;
    }
  };

  const openAnalyzeModal = () => {
    if (!analysisSelection.size) {
      setAnalysisSelection(
        new Set(feedback.filter((item) => item.status === "New").map((item) => item.id)),
      );
    }
    setShowAnalyze(true);
  };

  const toggleAnalysisSelection = (feedbackId: string) => {
    setAnalysisSelection((current) => {
      const next = new Set(current);
      next.has(feedbackId) ? next.delete(feedbackId) : next.add(feedbackId);
      return next;
    });
  };

  const selectImportFile = (file: File | null) => {
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setImportFile(null);
      setImportError(tr.feedback.unsupportedImportFile);
      return;
    }
    setImportFile(file);
    setImportError(null);
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError(tr.feedback.fileRequired);
      return;
    }
    setImportStep("uploading");
    setImportError(null);
    try {
      const result = await onImportFeedback(importFile);
      setImportResult(result);
      setImportStep("done");
      toast.success(tr.feedback.importedSuccess(result.imported_count));
    } catch (error) {
      setImportStep("idle");
      setImportError(getErrorMessage(error, tr.feedback.importError));
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5">

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 style={{ fontSize: "19px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{tr.feedback.inboxTitle}</h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>{tr.feedback.inboxSubtitle}</p>
            </div>
            {canEdit && <div className="flex items-center gap-2">
              <button onClick={() => setShowPublicLink(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors whitespace-nowrap"
                style={{ borderColor: "var(--border)", fontSize: "12.5px", color: "#64748B" }}>
                <Link2 size={12} /> Public Feedback Link
              </button>
              <button onClick={() => setLocalShowImport(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border hover:bg-gray-50 transition-colors whitespace-nowrap"
                style={{ borderColor: "var(--border)", fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                <Upload size={13} style={{ color: "#64748B" }} /> Import
              </button>
              <button onClick={openAnalyzeModal}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                style={{ borderColor: "#1E3A8A", fontSize: "13px", fontWeight: 500, color: "#1E3A8A" }}>
                <Sparkles size={13} style={{ color: "#1E3A8A" }} />
                {analysisSelection.size ? tr.feedback.analyzeSelected(analysisSelection.size) : tr.feedback.analyze}
              </button>
              <button onClick={() => setLocalShowRecord(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-white hover:opacity-90 transition-all whitespace-nowrap"
                style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}>
                <Plus size={14} /> Record Feedback
              </button>
            </div>}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: tr.feedback.total, value: feedback.length, color: "#1E3A8A", bg: "#EFF6FF", filter: "All" },
              { label: tr.status.New, value: newCount, color: "#D97706", bg: "#FFFBEB", filter: "New" },
              { label: tr.status.Analyzed, value: analyzedCount, color: "#059669", bg: "#ECFDF5", filter: "Analyzed" },
              { label: tr.status.Archived, value: archivedCount, color: "#64748B", bg: "#F1F5F9", filter: "Archived" },
            ].map((s) => (
              <button key={s.label} onClick={() => setStatusFilter(s.filter)}
                className="rounded-xl border p-3.5 text-left transition-all hover:shadow-sm"
                style={{ background: statusFilter === s.filter ? s.bg : "var(--card)", borderColor: statusFilter === s.filter ? s.color + "44" : "var(--border)" }}>
                <p style={{ fontSize: "24px", fontWeight: 700, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "11.5px", color: "#64748B", marginTop: "3px" }}>{s.label}</p>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border flex-1"
              style={{ borderColor: "var(--border)", background: "#fff" }}>
              <Search size={13} style={{ color: "#94A3B8" }} />
              <input type="text" placeholder={tr.feedback.search} value={search} onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none flex-1" style={{ fontSize: "13px" }} />
            </div>
            <SimpleSelect value={sourceFilter}
              options={["All Sources", ...FEEDBACK_SOURCES]}
              onChange={setSourceFilter} />
            <SimpleSelect value={categoryFilter}
              options={["All Categories", ...CATEGORIES]}
              onChange={setCategoryFilter} />
            <SimpleSelect value={statusFilter} options={["All", "New", "Analyzed", "Archived"]} onChange={setStatusFilter} />
            <span style={{ fontSize: "11.5px", color: "#94A3B8", marginLeft: "auto" }}>{filtered.length} records</span>
          </div>

          {analysisSelection.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border px-3 py-2" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
              <span style={{ color: "#1E3A8A", fontSize: "12.5px", fontWeight: 500 }}>{tr.feedback.selectedForAnalysis(analysisSelection.size)}</span>
              <button onClick={openAnalyzeModal} className="rounded-md px-3 py-1.5 text-white" style={{ background: "#1E3A8A", fontSize: "12px", fontWeight: 600 }}>{tr.feedback.analyzeSelected(analysisSelection.size)}</button>
            </div>
          )}

          {/* Feedback List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <Loader size={22} className="animate-spin" style={{ color: "#1E3A8A", marginBottom: "8px" }} />
              <p style={{ fontSize: "13px", color: "#64748B" }}>{tr.feedback.loading}</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B" }}>{tr.feedback.loadError}</p>
              <p style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "4px", marginBottom: "10px" }}>{loadError}</p>
              <button onClick={() => void onRetry()} style={{ fontSize: "12.5px", color: "#1E3A8A" }}>{tr.feedback.retry}</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <Search size={20} style={{ color: "#CBD5E1", marginBottom: "8px" }} />
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B" }}>{tr.feedback.noFeedback}</p>
              <button onClick={() => { setSearch(""); setCategoryFilter("All Categories"); setSourceFilter("All Sources"); setStatusFilter("All"); }}
                style={{ fontSize: "12.5px", color: "#1E3A8A", marginTop: "6px" }}>{tr.feedback.clearFilters}</button>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                    {["ID", tr.feedback.feedbackColumn, tr.common.source, tr.common.date, tr.common.status, tr.feedback.analyze, ""].map((col) => (
                      <th key={col} className="px-4 py-3 text-left" style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.04em", textTransform: "uppercase" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((fb, i) => {
                    const cc = categoryColors[fb.category] || categoryColors["Suggestion"];
                    const isSelected = selected?.id === fb.id;
                    return (
                      <tr key={fb.id} onClick={() => void handleOpenFeedback(fb)}
                        className="cursor-pointer border-b transition-colors"
                        style={{ borderColor: "var(--border)", opacity: detailLoadingId === fb.id ? 0.65 : 1, background: isSelected ? "#EFF6FF" : i % 2 === 0 ? "#fff" : "#FAFBFC" }}
                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#F8FAFC"; }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "#fff" : "#FAFBFC"; }}
                      >
                        <td className="px-4 py-3 w-24 shrink-0">
                          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#94A3B8", whiteSpace: "nowrap" }}>{fb.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="px-1.5 py-0 rounded whitespace-nowrap" style={{ background: cc.bg, color: cc.text, fontSize: "10px", fontWeight: 600 }}>{fb.category}</span>
                            {fb.isNoise && <span className="px-1.5 py-0 rounded" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "10px", fontWeight: 600 }}>{tr.feedback.noise}</span>}
                          </div>
                          <p style={{ fontSize: "12.5px", color: "var(--foreground)", lineHeight: 1.4 }} className="line-clamp-2">"{fb.text}"</p>
                          {fb.context && <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{fb.context}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span style={{ fontSize: "12px", color: "#64748B" }}>
                            {sourceIcon[fb.source] ?? ""} {fb.source}
                          </span>
                          {fb.sourceReference && <p style={{ fontSize: "10.5px", color: "#94A3B8", marginTop: "1px" }}>{fb.sourceReference}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span style={{ fontSize: "12px", color: "#64748B" }}>{fb.date}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusDot[fb.status] }} />
                            <span style={{ fontSize: "12px", fontWeight: 500, color: statusDot[fb.status] }}>{tr.status[fb.status]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            role="switch"
                            aria-checked={analysisSelection.has(fb.id)}
                            disabled={fb.status === "Archived"}
                            aria-disabled={!canEdit || fb.status === "Archived"}
                            onClick={(event) => { event.stopPropagation(); if (canEdit) toggleAnalysisSelection(fb.id); }}
                            className="relative h-5 w-9 rounded-full transition-colors disabled:opacity-40"
                            style={{ background: analysisSelection.has(fb.id) ? "#1E3A8A" : "#CBD5E1" }}
                            title={tr.feedback.selectForAnalysis}
                          >
                            <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: analysisSelection.has(fb.id) ? "18px" : "2px" }} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {canEdit && <button onClick={(e) => { e.stopPropagation(); setArchiveTarget(fb); }}>
                            <MoreHorizontal size={14} style={{ color: "#CBD5E1" }} />
                          </button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: "var(--border)", background: "#F8FAFC" }}>
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                  Showing {filtered.length} / {feedback.filter(f => f.status !== "Archived").length} records
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <FeedbackDetail
          item={selected}
          onClose={() => setSelected(null)}
          onArchive={() => setArchiveTarget(selected)}
          onSave={async (text, category, isNoise) => {
            const updated = await onSaveFeedback(selected.id, text, category, isNoise);
            setSelected(updated);
          }}
          onAnalyze={() => handleAnalyzeSingle(selected)}
          similar={similarFeedback}
          similarLoading={similarLoading}
          readOnly={!canEdit}
        />
      )}

      {/* Record Feedback Modal */}
      {showRecord && (
        <Modal title="Record Feedback" subtitle="Log feedback collected from users or external sources" onClose={closeRecord} width="520px">
          <div className="px-5 py-5 space-y-4">
            <p style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5, padding: "10px 12px", background: "#F0F9FF", borderRadius: "8px", border: "1px solid #BAE6FD" }}>
              Record feedback collected from users via interviews, surveys, support requests, usability tests, or other external sources.
            </p>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                Feedback Content <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <textarea value={recordForm.text}
                onChange={(e) => { setRecordForm(f => ({ ...f, text: e.target.value })); setRecordError(""); }}
                rows={3} placeholder="Enter the user's feedback..."
                className="w-full rounded-md border px-3 py-2 outline-none resize-none"
                style={{ borderColor: recordError ? "#DC2626" : "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
              {recordError && <p style={{ fontSize: "11.5px", color: "#DC2626", marginTop: "3px" }}>{recordError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                  Source <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <select value={recordForm.source}
                  onChange={(e) => setRecordForm(f => ({ ...f, source: e.target.value as FeedbackSource }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }}>
                  {FEEDBACK_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>User Segment</label>
                <select value={recordForm.userSegment}
                  onChange={(e) => setRecordForm(f => ({ ...f, userSegment: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }}>
                  <option value="">Select segment...</option>
                  <option>Applicant</option>
                  <option>Student</option>
                  <option>Parent</option>
                  <option>Staff</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Source Reference</label>
                <input type="text" value={recordForm.sourceReference}
                  onChange={(e) => setRecordForm(f => ({ ...f, sourceReference: e.target.value }))}
                  placeholder="e.g. Interview #21"
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
              </div>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Collection Date</label>
                <input type="text" value={recordForm.collectedDate}
                  onChange={(e) => setRecordForm(f => ({ ...f, collectedDate: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Context / Page</label>
              <input type="text" value={recordForm.context}
                onChange={(e) => setRecordForm(f => ({ ...f, context: e.target.value }))}
                placeholder="e.g. Admissions page"
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Additional Notes</label>
              <input type="text" value={recordForm.notes}
                onChange={(e) => setRecordForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
            </div>
          </div>
          {recordSubmitError && (
            <div className="mx-5 mb-4 rounded-md px-3 py-2" style={{ background: "#FEF2F2", color: "#B91C1C", fontSize: "12px" }}>
              {recordSubmitError}
            </div>
          )}
          <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={closeRecord} className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>Cancel</button>
            <button onClick={handleRecord}
              disabled={recording}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-white hover:opacity-90 disabled:opacity-70"
              style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}>
              {recording ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
              {recording ? "Recording..." : "Record Feedback"}
            </button>
          </div>
        </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
        <Modal title={tr.feedback.importTitle} subtitle={tr.feedback.importSubtitle} onClose={closeImport}>
          <div className="px-5 py-5">
            {importStep === "idle" && (
              <div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => selectImportFile(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center mb-4 hover:bg-blue-50 transition-colors"
                  style={{ borderColor: "#BFDBFE" }}
                >
                  <Upload size={24} style={{ color: "#1E3A8A", marginBottom: "8px" }} />
                  <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--foreground)", marginBottom: "4px" }}>{tr.feedback.selectImportFile}</p>
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>{tr.feedback.importHint}</p>
                </button>
                {importFile && (
                  <div className="mb-3 rounded-md border px-3 py-2" style={{ borderColor: "var(--border)", fontSize: "12.5px", color: "#475569" }}>
                    {tr.feedback.selectedFile}: {importFile.name}
                  </div>
                )}
                {importError && (
                  <p className="mb-3 rounded-md px-3 py-2" style={{ background: "#FEF2F2", color: "#B91C1C", fontSize: "12px" }}>{importError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={closeImport} className="rounded-md border px-3 py-2" style={{ borderColor: "var(--border)", color: "#475569", fontSize: "12px" }}>{tr.common.cancel}</button>
                  <button onClick={() => void handleImport()} disabled={!importFile} className="rounded-md px-3 py-2 text-white disabled:opacity-50" style={{ background: "var(--primary)", fontSize: "12px", fontWeight: 600 }}>{tr.feedback.importFile}</button>
                </div>
              </div>
            )}
            {importStep === "uploading" && (
              <div className="flex flex-col items-center py-8">
                <Loader size={28} className="animate-spin mb-4" style={{ color: "#1E3A8A" }} />
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "4px" }}>{tr.feedback.importingFile(importFile?.name ?? "")}</p>
                <p style={{ fontSize: "12.5px", color: "#94A3B8" }}>{tr.feedback.importingHint}</p>
              </div>
            )}
            {importStep === "done" && (
              <div className="flex flex-col items-center py-8">
                <CheckCircle size={28} style={{ color: "#059669", marginBottom: "8px" }} />
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#059669" }}>{tr.feedback.importDone}</p>
                <p style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "4px" }}>{tr.feedback.importedSuccess(importResult?.imported_count ?? 0)}</p>
                <button onClick={closeImport} className="mt-4 rounded-md border px-3 py-2" style={{ borderColor: "var(--border)", color: "#475569", fontSize: "12px" }}>{tr.feedback.close}</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Analyze Modal */}
      {showAnalyze && (
        <AnalyzeModal
          feedback={feedback}
          selectedIds={analysisSelection}
          onSelectedIdsChange={setAnalysisSelection}
          onClose={() => setShowAnalyze(false)}
          onRun={onAnalyzeFeedback}
          onViewNeeds={() => { setShowAnalyze(false); onNavigate?.("user-needs"); }}
        />
      )}

      {/* Public Link Modal */}
      {showPublicLinkVisible && (
        <PublicLinkPanel
          project={project}
          onClose={closePublicLinkVisible}
          canManage={project.currentUserRole === "OWNER"}
        />
      )}

      {/* Archive Confirm */}
      {archiveTarget && (
        <ConfirmDialog
          title="Archive this feedback?"
          message={`"${archiveTarget.text.slice(0, 80)}..." will be moved to the archive.`}
          confirmLabel="Archive"
          confirmDanger
          onConfirm={async () => {
            if (archiving) return;
            setArchiving(true);
            try {
              await onArchiveFeedback(archiveTarget.id);
              setArchiveTarget(null);
              if (selected?.id === archiveTarget.id) setSelected(null);
              toast.success("Feedback archived");
            } catch (error) {
              toast.error(getErrorMessage(error, "Unable to archive feedback."));
            } finally {
              setArchiving(false);
            }
          }}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </div>
  );
}
