import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Sparkles, Search, X, ExternalLink, CheckCircle, Loader, Link2, Copy, Globe, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { FeedbackItem, FeedbackCategory, FeedbackSource, FeedbackStatus, Project } from "../data/mockData";
import { Modal, ConfirmDialog } from "./Modal";
import { SimpleSelect } from "./SimpleSelect";
import { getErrorMessage } from "../../services/api";
import type { FeedbackCreateRequest } from "../../types/feedback";
import type { AnalysisRunDto, FeedbackAnalysisRequest } from "../../types/analysis";

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
  onSave: (text: string, category: FeedbackCategory) => Promise<void>;
  onAnalyze: () => Promise<void>;
}

function FeedbackDetail({ item, onClose, onArchive, onSave, onAnalyze }: FeedbackDetailProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editCat, setEditCat] = useState<FeedbackCategory>(item.category);
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
          <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Feedback Content</p>
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
            { label: "Source", value: `${sourceIcon[item.source] ?? ""} ${item.source}` },
            ...(item.sourceReference ? [{ label: "Reference", value: item.sourceReference }] : []),
            ...(item.userSegment ? [{ label: "Segment", value: item.userSegment }] : []),
            ...(item.context ? [{ label: "Context", value: item.context }] : []),
            { label: "Date", value: item.date },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-2">
              <span style={{ fontSize: "11.5px", color: "#94A3B8", flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: "12px", color: "var(--foreground)", textAlign: "right" }}>{value}</span>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>Category</span>
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
            <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>Signal / Noise</span>
            <span style={{ fontSize: "12px", fontWeight: 500, color: item.isNoise ? "#DC2626" : "#059669" }}>
              {item.isNoise ? "Likely noise" : "Useful signal"}
            </span>
          </div>

          {item.userNeedId && (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>Linked Need</span>
              <span className="flex items-center gap-1" style={{ fontSize: "12px", color: "#1E3A8A", fontWeight: 500 }}>
                {item.userNeedId} <ExternalLink size={10} />
              </span>
            </div>
          )}
        </div>

        {/* AI info */}
        {item.status === "Analyzed" ? (
          <div className="rounded-lg p-3" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={11} style={{ color: "#1E3A8A" }} />
              <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#1E3A8A", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Analyzed</p>
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
        ) : (
          <div className="rounded-lg p-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <p style={{ fontSize: "11.5px", color: "#92400E", marginBottom: "8px" }}>This feedback has not been AI-analyzed yet.</p>
            <button onClick={async () => {
              if (analyzing) return;
              setAnalyzing(true);
              try { await onAnalyze(); } finally { setAnalyzing(false); }
            }} disabled={analyzing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white hover:opacity-90 disabled:opacity-60 transition-all"
              style={{ background: "#1E3A8A", fontSize: "12px", fontWeight: 500 }}>
              {analyzing ? <Loader size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {analyzing ? "Analyzing..." : "Analyze this feedback"}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={async () => {
              if (!editText.trim() || saving) return;
              setSaving(true);
              setSaveError(null);
              try {
                await onSave(editText.trim(), editCat);
                setEditing(false);
                toast.success("Changes saved");
              } catch (error) {
                setSaveError(getErrorMessage(error, "Unable to save feedback."));
              } finally {
                setSaving(false);
              }
            }}
              disabled={saving || !editText.trim()}
              className="flex-1 py-2 rounded-md text-white text-center hover:opacity-90"
              style={{ background: "#059669", fontSize: "12.5px", fontWeight: 500 }}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setEditText(item.text); setEditCat(item.category); }}
              className="px-3 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "12.5px" }}>Cancel</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="flex-1 py-2 rounded-md border hover:bg-gray-50 text-center"
              style={{ borderColor: "var(--border)", fontSize: "12.5px", color: "#374151" }}>Edit</button>
            <button onClick={onArchive} className="flex-1 py-2 rounded-md border hover:bg-red-50 text-center"
              style={{ borderColor: "#FCA5A5", fontSize: "12.5px", color: "#DC2626" }}>Archive</button>
          </div>
        )}
        {saveError && <p style={{ fontSize: "11.5px", color: "#DC2626" }}>{saveError}</p>}
      </div>
    </div>
  );
}

// ─── Public Form Modal ────────────────────────────────────────────────────────

interface PublicFormProps {
  project: Project;
  onClose: () => void;
  onSubmit: (text: string, context: string, userSegment: string) => void;
}

function PublicForm({ project, onClose, onSubmit }: PublicFormProps) {
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [userType, setUserType] = useState("Applicant");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      onSubmit(text.trim(), context, userType);
    }, 800);
  };

  return (
    <Modal title="" onClose={onClose} width="480px">
      {submitted ? (
        <div className="flex flex-col items-center py-12 px-6">
          <CheckCircle size={40} style={{ color: "#059669", marginBottom: "12px" }} />
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#059669", marginBottom: "6px" }}>Thank you!</p>
          <p style={{ fontSize: "13px", color: "#64748B" }}>Your feedback has been submitted.</p>
        </div>
      ) : (
        <>
          <div className="px-6 pt-4 pb-2 border-b" style={{ borderColor: "var(--border)", background: "#F8FAFC" }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: "#1E3A8A", fontSize: "11px", fontWeight: 700 }}>
                {project.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{project.name}</p>
                <p style={{ fontSize: "11.5px", color: "#64748B" }}>User Feedback</p>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#64748B" }}>Help us improve your experience. Your feedback goes directly to our product team.</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                Your feedback <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
                placeholder="Share what you experienced, found confusing, or would like to see improved..."
                className="w-full rounded-md border px-3 py-2 outline-none resize-none"
                style={{ borderColor: text.trim() ? "var(--border)" : text === "" ? "var(--border)" : "#DC2626", fontSize: "13px", background: "#F8FAFC" }} />
            </div>
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                Where did you experience this?
              </label>
              <select value={context} onChange={(e) => setContext(e.target.value)}
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }}>
                <option value="">Select page or area...</option>
                <option>Admissions</option>
                <option>Programs</option>
                <option>Tuition</option>
                <option>Registration</option>
                <option>Navigation</option>
                <option>Student Services</option>
                <option>News</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>
                Who are you?
              </label>
              <select value={userType} onChange={(e) => setUserType(e.target.value)}
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }}>
                <option>Applicant</option>
                <option>Student</option>
                <option>Parent</option>
                <option>Staff</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!text.trim()}
              className="flex-1 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: "#1E3A8A", fontSize: "13px", fontWeight: 500 }}>Submit Feedback</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Public Link Panel ────────────────────────────────────────────────────────

interface PublicLinkPanelProps {
  project: Project;
  onClose: () => void;
  onOpenForm: () => void;
}

function PublicLinkPanel({ project, onClose, onOpenForm }: PublicLinkPanelProps) {
  const [enabled, setEnabled] = useState(true);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const url = `reqforge.app/f/${slug}`;

  const handleCopy = () => { navigator.clipboard.writeText(url).catch(() => {}); toast.success("Link copied"); };

  return (
    <Modal title="Public Feedback Link" subtitle="Collect feedback directly from end users" onClose={onClose} width="480px">
      <div className="px-5 py-5 space-y-4">
        {/* Status + URL */}
        <div className="rounded-xl border p-4" style={{ background: "#F8FAFC", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>Status</span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full" style={{ background: enabled ? "#ECFDF5" : "#F1F5F9", fontSize: "11px", fontWeight: 600, color: enabled ? "#059669" : "#64748B" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: enabled ? "#059669" : "#94A3B8" }} />
              {enabled ? "Active" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg border" style={{ borderColor: "#BFDBFE", background: "#EFF6FF" }}>
            <Globe size={13} style={{ color: "#1E3A8A", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#1E3A8A", fontFamily: "var(--font-mono)", flex: 1 }} className="truncate">{url}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)" }}>
            <Copy size={16} style={{ color: "#1E3A8A" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#374151" }}>Copy Link</span>
          </button>
          <button onClick={onOpenForm} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)" }}>
            <ExternalLink size={16} style={{ color: "#1E3A8A" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#374151" }}>Open Form</span>
          </button>
          <button onClick={() => setConfirmDisable(true)} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border hover:bg-red-50 transition-colors" style={{ borderColor: enabled ? "#FCA5A5" : "var(--border)" }}>
            <X size={16} style={{ color: enabled ? "#DC2626" : "#94A3B8" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 500, color: enabled ? "#DC2626" : "#94A3B8" }}>{enabled ? "Disable" : "Enable"}</span>
          </button>
        </div>

        <p style={{ fontSize: "11.5px", color: "#94A3B8", lineHeight: 1.5 }}>
          End users can submit feedback without a ReqForge account. Submissions appear in your Feedback Inbox with source "Public Feedback Form".
        </p>
      </div>

      {confirmDisable && (
        <ConfirmDialog
          title={enabled ? "Disable Public Feedback Link?" : "Enable Public Feedback Link?"}
          message={enabled ? "The form will stop accepting new submissions." : "The form will be ready to accept new submissions."}
          confirmLabel={enabled ? "Disable" : "Enable"}
          confirmDanger={enabled}
          onConfirm={() => { setEnabled(!enabled); setConfirmDisable(false); toast.success(enabled ? "Public link disabled" : "Public link enabled"); }}
          onCancel={() => setConfirmDisable(false)}
        />
      )}
    </Modal>
  );
}

// ─── Analyze Modal ────────────────────────────────────────────────────────────

interface AnalyzeModalProps {
  newCount: number;
  onClose: () => void;
  onRun: (payload: FeedbackAnalysisRequest, signal: AbortSignal) => Promise<AnalysisRunDto>;
  onViewNeeds?: () => void;
}

function AnalyzeModal({ newCount, onClose, onRun, onViewNeeds }: AnalyzeModalProps) {
  const [step, setStep] = useState<"config" | "loading" | "done" | "error">("config");
  const [result, setResult] = useState({ analyzed: 0, groups: 0, needs: 0 });
  const [runError, setRunError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = async () => {
    setStep("loading");
    setRunError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const analysisRun = await onRun({ mode: "NEW_ONLY" }, controller.signal);
      const output = analysisRun.output_json;
      const analyzed = output?.feedback_results?.length ?? newCount;
      const needs = output?.candidate_needs?.length ?? 0;
      setResult({ analyzed, groups: 0, needs });
      setStep("done");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRunError(getErrorMessage(error, "Feedback analysis failed."));
      setStep("error");
    } finally {
      controllerRef.current = null;
    }
  };

  const finish = () => { onViewNeeds ? onViewNeeds() : onClose(); };

  return (
    <Modal title="Analyze Feedback" onClose={step === "loading" ? undefined : onClose} width="420px">
      {step === "config" && (
        <>
          <div className="px-5 py-5 space-y-4">
            <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>
              AI will classify feedback, detect noise, group similar records and suggest Candidate User Needs.
            </p>
            <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: "#1E3A8A", background: "#EFF6FF" }}>
              <input type="radio" checked readOnly className="mt-0.5" />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>Analyze all new feedback ({newCount})</p>
                <p style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2px" }}>Process all feedback records with status New</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>Cancel</button>
            <button onClick={run} disabled={newCount === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: "#1E3A8A", fontSize: "13px", fontWeight: 500 }}>
              <Sparkles size={13} /> Start Analysis
            </button>
          </div>
        </>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center py-12 px-6">
          <Loader size={32} className="animate-spin mb-4" style={{ color: "#1E3A8A" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>
            Analyzing {newCount} feedback record{newCount !== 1 ? "s" : ""}...
          </p>
          <div className="space-y-1.5 mt-4 w-full">
            {["Classifying feedback", "Detecting noise", "Grouping similar records", "Extracting Candidate User Needs"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" style={{ animationDelay: `${i * 0.2}s` }} />
                <span style={{ fontSize: "12px", color: "#64748B" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "done" && (
        <>
          <div className="px-5 py-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} style={{ color: "#059669" }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#059669" }}>Analysis completed</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Feedback analyzed", value: result.analyzed },
                { label: "Related groups found", value: result.groups },
                { label: "Candidate User Needs", value: result.needs },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border p-3 text-center" style={{ background: "#F8FAFC", borderColor: "var(--border)" }}>
                  <p style={{ fontSize: "22px", fontWeight: 700, color: "#1E3A8A", letterSpacing: "-0.04em" }}>{s.value}</p>
                  <p style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px", lineHeight: 1.3 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "12px", color: "#64748B" }}>
              Feedback status updated to <strong>Analyzed</strong>. Check User Needs to review results.
            </p>
          </div>
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>Close</button>
            <button onClick={finish} className="flex-1 py-2 rounded-md text-white hover:opacity-90"
              style={{ background: "#1E3A8A", fontSize: "13px", fontWeight: 500 }}>View User Needs →</button>
          </div>
        </>
      )}

      {step === "error" && (
        <>
          <div className="px-5 py-8">
            <div className="flex items-center gap-3 mb-3">
              <X size={22} style={{ color: "#DC2626" }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#DC2626" }}>Analysis failed</p>
            </div>
            <p style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.6 }}>{runError}</p>
          </div>
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50" style={{ borderColor: "var(--border)", fontSize: "13px" }}>Close</button>
            <button onClick={() => void run()} className="flex-1 py-2 rounded-md text-white hover:opacity-90" style={{ background: "#1E3A8A", fontSize: "13px", fontWeight: 500 }}>Retry</button>
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
  onLoadFeedbackDetail: (feedbackId: string) => Promise<FeedbackItem>;
  onSaveFeedback: (feedbackId: string, content: string, category: FeedbackCategory) => Promise<FeedbackItem>;
  onArchiveFeedback: (feedbackId: string) => Promise<FeedbackItem>;
  onAddFeedback: (item: FeedbackItem) => void;
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
  onRecordFeedback, onLoadFeedbackDetail, onSaveFeedback, onArchiveFeedback,
  onAddFeedback, onAnalyzeFeedback, onNavigate,
  showAddModal = false, showImportModal = false, showPublicLinkModal = false,
  onCloseAddModal, onCloseImportModal, onClosePublicLinkModal,
}: FeedbackManagementProps) {
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
  const [showPublicForm, setShowPublicForm] = useState(false);

  const [importStep, setImportStep] = useState<"idle" | "uploading" | "done">("idle");

  const showRecord = showAddModal || localShowRecord;
  const showImport = showImportModal || localShowImport;
  const showPublicLinkVisible = showPublicLink || showPublicLinkModal;
  const closeRecord = () => { setLocalShowRecord(false); onCloseAddModal?.(); setRecordForm(emptyRecord()); setRecordError(""); setRecordSubmitError(null); };
  const closeImport = () => { setLocalShowImport(false); onCloseImportModal?.(); setImportStep("idle"); };
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
        feedback_date: parseFeedbackDate(recordForm.collectedDate),
      });
      closeRecord();
      toast.success("Feedback recorded successfully");
    } catch (error) {
      setRecordSubmitError(getErrorMessage(error, "Unable to record feedback."));
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
    const toastId = toast.loading("Loading feedback details...");
    try {
      setSelected(await onLoadFeedbackDetail(item.id));
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load feedback details."), { id: toastId });
    } finally {
      setDetailLoadingId(null);
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
      toast.error(getErrorMessage(error, "Feedback analysis failed."), { id: toastId });
      throw error;
    }
  };

  const handleImport = () => {
    setImportStep("uploading");
    setTimeout(() => {
      setImportStep("done");
      const now = "Aug 19, 2026";
      const ts = Date.now();
      const templates = [
        { text: "The event calendar is very hard to navigate on mobile.", category: "Usability" as const, context: "Event Calendar" },
        { text: "Please send email notifications about admission application status.", category: "Feature Request" as const },
        { text: "Faculty photos are missing for some departments.", category: "Bug" as const, context: "Faculty Directory" },
        { text: "The scholarship page has not been updated for the new academic year.", category: "Complaint" as const, context: "Scholarship Info" },
        { text: "I cannot find the course registration deadline on the website.", category: "Usability" as const, context: "Registration" },
        { text: "The search function returns too many irrelevant results.", category: "Usability" as const },
        { text: "News section lacks filtering by category or date.", category: "Feature Request" as const, context: "News" },
        { text: "The tuition calculator is broken on Safari.", category: "Bug" as const, context: "Tuition" },
        { text: "Student services page loads very slowly.", category: "Usability" as const, context: "Student Services" },
        { text: "It would be helpful to have a chatbot for common questions.", category: "Suggestion" as const },
        { text: "The admissions checklist is confusing and not step-by-step.", category: "Usability" as const, context: "Admissions" },
        { text: "Contact information for departments is hard to find.", category: "Usability" as const },
        { text: "PDF documents are not mobile-friendly.", category: "Usability" as const },
        { text: "I had trouble submitting my application because the form timed out.", category: "Bug" as const, context: "Registration" },
        { text: "The campus map does not load on older browsers.", category: "Bug" as const },
        { text: "Add a dark mode option for the student portal.", category: "Feature Request" as const },
        { text: "Line spacing in program descriptions is too tight to read comfortably.", category: "Usability" as const, context: "Programs" },
        { text: "There is no way to compare multiple programs side by side.", category: "Feature Request" as const, context: "Programs" },
        { text: "The homepage hero image makes text above the fold unreadable.", category: "Usability" as const },
        { text: "International student requirements are buried too deep in the site structure.", category: "Usability" as const, context: "Admissions" },
      ];
      const batch: FeedbackItem[] = templates.map((t, i) => ({
        id: `FB-IMP-${ts}-${i + 1}`,
        projectId: project.id,
        text: t.text,
        category: t.category,
        source: "Survey" as const,
        status: "New" as const,
        date: now,
        isNoise: false,
        context: t.context,
      }));
      batch.forEach((b) => onAddFeedback(b));
      setTimeout(() => { closeImport(); toast.success("20 feedback records imported"); }, 600);
    }, 2000);
  };

  const handlePublicFormSubmit = (text: string, context: string, userSegment: string) => {
    const now = "Just now";
    const isAdmissionsReadability = text.toLowerCase().includes("admissions") || (context === "Admissions" && text.toLowerCase().includes("small"));
    const newItem: FeedbackItem = {
      id: isAdmissionsReadability ? "FB-129" : `FB-${String(feedback.length + 200).padStart(3, "0")}`,
      projectId: project.id,
      text,
      category: "Usability",
      source: "Public Feedback Form",
      status: "New",
      date: now,
      isNoise: false,
      userSegment: userSegment || undefined,
      context: context || undefined,
    };
    onAddFeedback(newItem);
    setShowPublicForm(false);
    toast.success("Feedback submitted");
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5">

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 style={{ fontSize: "19px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>Feedback Inbox</h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>User feedback collected for this project.</p>
            </div>
            <div className="flex items-center gap-2">
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
              <button onClick={() => setShowAnalyze(true)} disabled={newCount === 0}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                style={{ borderColor: newCount > 0 ? "#1E3A8A" : "var(--border)", fontSize: "13px", fontWeight: 500, color: newCount > 0 ? "#1E3A8A" : "var(--foreground)" }}>
                <Sparkles size={13} style={{ color: "#1E3A8A" }} />
                {newCount > 0 ? `Analyze ${newCount} New Feedback` : "Analyze Feedback"}
              </button>
              <button onClick={() => setLocalShowRecord(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-white hover:opacity-90 transition-all whitespace-nowrap"
                style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}>
                <Plus size={14} /> Record Feedback
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total", value: feedback.length, color: "#1E3A8A", bg: "#EFF6FF", filter: "All" },
              { label: "New", value: newCount, color: "#D97706", bg: "#FFFBEB", filter: "New" },
              { label: "Analyzed", value: analyzedCount, color: "#059669", bg: "#ECFDF5", filter: "Analyzed" },
              { label: "Archived", value: archivedCount, color: "#64748B", bg: "#F1F5F9", filter: "Archived" },
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
              <input type="text" placeholder="Search feedback..." value={search} onChange={(e) => setSearch(e.target.value)}
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

          {/* Feedback List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <Loader size={22} className="animate-spin" style={{ color: "#1E3A8A", marginBottom: "8px" }} />
              <p style={{ fontSize: "13px", color: "#64748B" }}>Loading feedback...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B" }}>Unable to load feedback</p>
              <p style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "4px", marginBottom: "10px" }}>{loadError}</p>
              <button onClick={() => void onRetry()} style={{ fontSize: "12.5px", color: "#1E3A8A" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <Search size={20} style={{ color: "#CBD5E1", marginBottom: "8px" }} />
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B" }}>No feedback found</p>
              <button onClick={() => { setSearch(""); setCategoryFilter("All Categories"); setSourceFilter("All Sources"); setStatusFilter("All"); }}
                style={{ fontSize: "12.5px", color: "#1E3A8A", marginTop: "6px" }}>Clear filters</button>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                    {["ID", "Feedback", "Source", "Date", "Status", ""].map((col) => (
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
                            {fb.isNoise && <span className="px-1.5 py-0 rounded" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "10px", fontWeight: 600 }}>Noise</span>}
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
                            <span style={{ fontSize: "12px", fontWeight: 500, color: statusDot[fb.status] }}>{fb.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={(e) => { e.stopPropagation(); setArchiveTarget(fb); }}>
                            <MoreHorizontal size={14} style={{ color: "#CBD5E1" }} />
                          </button>
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
          onSave={async (text, category) => {
            const updated = await onSaveFeedback(selected.id, text, category);
            setSelected(updated);
          }}
          onAnalyze={() => handleAnalyzeSingle(selected)}
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
        <Modal title="Import Feedback" subtitle="Upload a CSV or Excel file to bulk-import feedback records" onClose={closeImport}>
          <div className="px-5 py-5">
            {importStep === "idle" && (
              <div>
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center mb-4 cursor-pointer hover:bg-blue-50 transition-colors"
                  style={{ borderColor: "#BFDBFE" }} onClick={handleImport}>
                  <Upload size={24} style={{ color: "#1E3A8A", marginBottom: "8px" }} />
                  <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--foreground)", marginBottom: "4px" }}>Click to upload or drag and drop</p>
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>CSV or Excel (.xlsx) — max 10 MB</p>
                </div>
                <div className="space-y-2">
                  {["student_survey_august.xlsx", "feedback_batch_aug2026.csv"].map((name) => (
                    <button key={name} onClick={handleImport}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border hover:bg-gray-50 transition-colors"
                      style={{ borderColor: "var(--border)" }}>
                      <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                        <Upload size={13} style={{ color: "#1E3A8A" }} />
                      </div>
                      <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{name}</span>
                      <span style={{ fontSize: "11.5px", color: "#94A3B8", marginLeft: "auto" }}>Recent</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {importStep === "uploading" && (
              <div className="flex flex-col items-center py-8">
                <Loader size={28} className="animate-spin mb-4" style={{ color: "#1E3A8A" }} />
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "4px" }}>Importing student_survey_august.xlsx</p>
                <p style={{ fontSize: "12.5px", color: "#94A3B8" }}>Processing 20 records...</p>
              </div>
            )}
            {importStep === "done" && (
              <div className="flex flex-col items-center py-8">
                <CheckCircle size={28} style={{ color: "#059669", marginBottom: "8px" }} />
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#059669" }}>Import successful</p>
                <p style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "4px" }}>20 feedback records added to the Feedback Inbox</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Analyze Modal */}
      {showAnalyze && (
        <AnalyzeModal
          newCount={newCount}
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
          onOpenForm={() => { setShowPublicLink(false); onClosePublicLinkModal?.(); setShowPublicForm(true); }}
        />
      )}

      {/* Public Form Preview */}
      {showPublicForm && (
        <PublicForm
          project={project}
          onClose={() => setShowPublicForm(false)}
          onSubmit={handlePublicFormSubmit}
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
