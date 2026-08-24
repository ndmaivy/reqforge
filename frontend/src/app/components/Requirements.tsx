import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Sparkles, AlertTriangle, CheckCircle, X, ChevronRight, Edit2, Loader, Info, ExternalLink, ChevronDown, Plus, Shield, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { RequirementStatus, RequirementType, RequirementSourceType, FeedbackItem } from "../data/mockData";
import type { AnalysisRunDto } from "../../types/analysis";
import type {
  RequirementCreateRequest,
  RequirementIssueDto,
  RequirementTypeDto,
  RequirementUpdateRequest,
  RequirementViewModel,
} from "../../types/requirement";
import type { UserNeedViewModel } from "../../types/userNeed";
import { getErrorMessage } from "../../services/api";
import { Modal, ConfirmDialog } from "./Modal";
import { SimpleSelect } from "./SimpleSelect";
import { useLanguage } from "../i18n/LanguageContext";

const statusCfg: Record<RequirementStatus, { bg: string; text: string; dot: string }> = {
  Draft: { bg: "#F1F5F9", text: "#64748B", dot: "#64748B" },
  "Needs Review": { bg: "#FFFBEB", text: "#D97706", dot: "#D97706" },
  Approved: { bg: "#ECFDF5", text: "#059669", dot: "#059669" },
  Rejected: { bg: "#FEF2F2", text: "#DC2626", dot: "#DC2626" },
  Archived: { bg: "#F1F5F9", text: "#94A3B8", dot: "#94A3B8" },
};

const typeCfg: Record<RequirementType, { bg: string; text: string }> = {
  Functional: { bg: "#EFF6FF", text: "#1E3A8A" },
  Usability: { bg: "#F5F3FF", text: "#6D28D9" },
  Interaction: { bg: "#ECFEFF", text: "#0E7490" },
  Accessibility: { bg: "#F0FDF4", text: "#15803D" },
  Security: { bg: "#FEF2F2", text: "#DC2626" },
  Performance: { bg: "#FFF7ED", text: "#C2410C" },
  "Non-functional": { bg: "#FFF7ED", text: "#C2410C" },
  Other: { bg: "#F8FAFC", text: "#64748B" },
};

const sourceCfg: Record<RequirementSourceType, { label: string; bg: string; text: string }> = {
  AI_FROM_USER_NEED: { label: "AI from User Need", bg: "#EFF6FF", text: "#1E3A8A" },
  MANUAL: { label: "Manual", bg: "#F1F5F9", text: "#64748B" },
  STAKEHOLDER: { label: "Stakeholder", bg: "#F5F3FF", text: "#6D28D9" },
  POLICY: { label: "Policy", bg: "#FEF2F2", text: "#DC2626" },
  COMPLIANCE: { label: "Compliance", bg: "#FEF3C7", text: "#D97706" },
  EXISTING_SPEC: { label: "Existing Spec", bg: "#F0FDF4", text: "#15803D" },
  TECHNICAL_CONSTRAINT: { label: "Technical Constraint", bg: "#F8FAFC", text: "#475569" },
  OTHER: { label: "Other", bg: "#F8FAFC", text: "#64748B" },
};

const REQ_TYPES: RequirementType[] = ["Functional", "Usability", "Interaction", "Accessibility", "Non-functional"];
const REQ_SOURCE_OPTIONS: { value: RequirementSourceType; label: string }[] = [
  { value: "STAKEHOLDER", label: "Stakeholder Request" },
  { value: "EXISTING_SPEC", label: "Existing Specification" },
  { value: "POLICY", label: "Security Policy" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "TECHNICAL_CONSTRAINT", label: "SLA / Technical Constraint" },
  { value: "MANUAL", label: "Manual Requirement" },
  { value: "OTHER", label: "Other" },
];

function toRequirementTypeDto(type: RequirementType): RequirementTypeDto {
  if (type === "Usability") return "USABILITY";
  if (type === "Interaction") return "INTERACTION";
  if (type === "Accessibility") return "ACCESSIBILITY";
  if (type === "Non-functional") return "NON_FUNCTIONAL";
  return "FUNCTIONAL";
}

function formatRequirementDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface ReqDetailProps {
  req: RequirementViewModel;
  needs: UserNeedViewModel[];
  feedback: FeedbackItem[];
  validationIssues: RequirementIssueDto[];
  issuesLoading: boolean;
  issuesError: string | null;
  actionBusy: boolean;
  onBack: () => void;
  onUpdate: (changes: RequirementUpdateRequest) => Promise<boolean>;
  onApprove: () => Promise<boolean>;
  onReject: () => Promise<boolean>;
  onRetryIssues: () => Promise<void>;
  onValidate: (signal: AbortSignal) => Promise<AnalysisRunDto>;
}

// ─── AI Validation types ───────────────────────────────────────────────────────
type ValidationStatus = "idle" | "running" | "complete" | "outdated" | "error";

// ─── ReqDetail component ───────────────────────────────────────────────────────
function ReqDetail({
  req,
  needs,
  feedback,
  validationIssues,
  issuesLoading,
  issuesError,
  actionBusy,
  onBack,
  onUpdate,
  onApprove,
  onReject,
  onRetryIssues,
  onValidate,
}: ReqDetailProps) {
  const { tr } = useLanguage();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(req.title);
  const [editDesc, setEditDesc] = useState(req.description);
  const [editType, setEditType] = useState<RequirementType>(req.type);

  // AI Validation state
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>(
    req.latestValidationRunId ? (req.validationOutdated ? "outdated" : "complete") : "idle",
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const validationControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setValidationStatus(
      req.latestValidationRunId ? (req.validationOutdated ? "outdated" : "complete") : "idle",
    );
  }, [req.id, req.latestValidationRunId, req.validationOutdated]);

  useEffect(() => () => validationControllerRef.current?.abort(), []);

  // Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [approveWarningOpen, setApproveWarningOpen] = useState(false);

  // Derived
  const sc = statusCfg[req.status];
  const tc = typeCfg[req.type];
  const sourceNeed = needs.find((n) => n.id === req.sourceNeedId);
  const supportingFb = feedback.filter((f) => sourceNeed?.feedbackIds.includes(f.id)).slice(0, 3);
  const openHighIssues = validationIssues.filter((issue) => issue.severity === "HIGH" && issue.status === "OPEN");
  const openIssueCount = validationIssues.filter((issue) => issue.status === "OPEN").length;
  const issueCount = validationIssues.length;

  const rejectReasons = [
    "Incorrect interpretation",
    "Unsupported assumption",
    "Missing important information",
    "Duplicate requirement",
    "Out of scope",
    "Other",
  ];

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleRunValidation = async () => {
    if (validationStatus === "running") return;
    const controller = new AbortController();
    validationControllerRef.current = controller;
    setValidationStatus("running");
    setValidationError(null);
    try {
      const run = await onValidate(controller.signal);
      if (run.status !== "COMPLETED") {
        throw new Error(run.error_message || "Requirement validation failed.");
      }
      setValidationStatus("complete");
      toast.success("AI validation completed");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = getErrorMessage(error, "Requirement validation failed.");
      setValidationError(message);
      setValidationStatus("error");
      toast.error(message);
    } finally {
      validationControllerRef.current = null;
    }
  };

  const handleSave = async () => {
    const saved = await onUpdate({
      title: editTitle.trim(),
      description: editDesc.trim(),
      type: toRequirementTypeDto(editType),
    });
    if (!saved) return;
    setEditing(false);
    if (validationStatus === "complete") {
      setValidationStatus("outdated");
      toast.info("Requirement updated. Run AI Validation again.");
    } else {
      toast.success("Requirement updated.");
    }
  };

  const handleApprove = async () => {
    if (openHighIssues.length > 0) {
      setApproveWarningOpen(true);
    } else {
      if (await onApprove()) toast.success("Requirement approved");
    }
  };

  const handleApproveAnyway = async () => {
    if (await onApprove()) {
      toast.success("Requirement approved with unresolved validation issue");
      setApproveWarningOpen(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (await onReject()) {
      toast.success("Requirement rejected");
      setRejectModalOpen(false);
      onBack();
    }
  };

  const toggleIssue = (id: string) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-5 max-w-7xl mx-auto">
        {/* Top bar: breadcrumb left, approve/reject right */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onBack}
              className="transition-colors hover:opacity-70"
              style={{ fontSize: "13px", color: "#94A3B8" }}
            >
              {tr.nav.requirements}
            </button>
            <ChevronRight size={12} style={{ color: "#CBD5E1" }} />
            <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 500, fontFamily: "var(--font-mono)" }}>
              {req.id}
            </span>
          </div>
          {!editing && (
            <div className="flex items-center gap-2">
              {req.status === "Needs Review" && (
                <button
                  onClick={() => void handleApprove()}
                  disabled={actionBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white hover:opacity-90 disabled:opacity-60 transition-all"
                  style={{ background: "#059669", fontSize: "13px", fontWeight: 500 }}
                >
                  <CheckCircle size={13} /> {tr.requirements.approve}
                </button>
              )}
              {req.status === "Needs Review" && (
                <button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={actionBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-red-50 disabled:opacity-60 transition-colors"
                  style={{ borderColor: "#FCA5A5", fontSize: "13px", color: "#DC2626" }}
                >
                  {tr.requirements.reject}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* ─── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div className="rounded-lg border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#64748B" }}>
                {req.id}
              </span>
              <span
                className="px-2 py-0.5 rounded-md"
                style={{ background: sc.bg, color: sc.text, fontSize: "11px", fontWeight: 600 }}
              >
                {(tr.status as Record<string, string>)[req.status] ?? req.status}
              </span>
              {editing ? (
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as RequirementType)}
                  className="rounded border px-2 py-0.5 outline-none"
                  style={{ fontSize: "12px", borderColor: "var(--border)", background: "#F8FAFC" }}
                >
                  {REQ_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-md"
                  style={{ background: tc.bg, color: tc.text, fontSize: "11px", fontWeight: 500 }}
                >
                  {req.type}
                </span>
              )}
            </div>

            {/* Title / Description */}
            {editing ? (
              <div className="space-y-3 mb-4">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "#1E3A8A", fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border px-3 py-2 outline-none resize-none"
                  style={{ borderColor: "#1E3A8A", fontSize: "13px" }}
                />
              </div>
            ) : (
              <>
                <h2
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "var(--foreground)",
                    letterSpacing: "-0.02em",
                    marginBottom: "10px",
                  }}
                >
                  {req.title}
                </h2>
                <div
                  className="rounded-lg p-4 mb-4"
                  style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}
                >
                  <p style={{ fontSize: "13px", color: "#1E293B", lineHeight: 1.65 }}>{req.description}</p>
                </div>
              </>
            )}

            {/* Metadata */}
            <div className="space-y-2.5 mb-5">
              {[
                { label: tr.requirements.type, value: req.type },
                { label: tr.requirements.status, value: (tr.status as Record<string, string>)[req.status] ?? req.status },
                { label: "Source", value: sourceCfg[req.sourceType ?? 'AI_FROM_USER_NEED']?.label ?? req.sourceType },
                ...(req.sourceType === "AI_FROM_USER_NEED" || !req.sourceType ? [{
                  label: "Source Need",
                  value: sourceNeed ? `${sourceNeed.id} — ${sourceNeed.title}` : req.sourceNeedId ?? "—",
                }] : []),
                ...(req.sourceReference ? [{ label: "Reference", value: req.sourceReference }] : []),
                { label: "Created", value: formatRequirementDate(req.createdAt) },
                { label: "Updated", value: formatRequirementDate(req.updatedAt) },
              ].map((f) => (
                <div key={f.label} className="flex items-start gap-3">
                  <span style={{ fontSize: "12px", color: "#94A3B8", width: "90px", flexShrink: 0 }}>{f.label}</span>
                  <span style={{ fontSize: "12.5px", color: "var(--foreground)" }}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div
              className="flex items-center gap-2 pt-4 border-t flex-wrap"
              style={{ borderColor: "var(--border)" }}
            >
              {editing ? (
                <>
                  <button
                    onClick={() => void handleSave()}
                    disabled={actionBusy || !editTitle.trim() || !editDesc.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-60 transition-all"
                    style={{ background: "#059669", fontSize: "13px", fontWeight: 500 }}
                  >
                    {tr.requirements.save}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditTitle(req.title);
                      setEditDesc(req.description);
                      setEditType(req.type);
                    }}
                    className="px-4 py-2 rounded-md border hover:bg-gray-50"
                    style={{ borderColor: "var(--border)", fontSize: "13px" }}
                  >
                    {tr.requirements.cancel}
                  </button>
                </>
              ) : (
                <>
                  {(req.status === "Draft" || req.status === "Needs Review") && (
                    <button
                      onClick={() => setEditing(true)}
                      disabled={actionBusy}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      style={{ borderColor: "var(--border)", fontSize: "13px" }}
                    >
                      <Edit2 size={12} /> {tr.requirements.edit}
                    </button>
                  )}
                  <button
                    onClick={handleRunValidation}
                    disabled={validationStatus === "running"}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-white hover:opacity-90 disabled:opacity-60 transition-all"
                    style={{ background: "var(--primary)", border: "1.5px solid #60A5FA", fontSize: "13px", fontWeight: 500 }}
                  >
                    {validationStatus === "running" ? (
                      <Loader size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    {validationStatus === "running" ? tr.requirements.validatingStatus : tr.requirements.runValidation}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN — AI Review ──────────────────────────────────── */}
          <div className="rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            {/* Header */}
            <div
              className="flex items-center gap-2 px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <Sparkles size={13} style={{ color: "#1E3A8A" }} />
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>ReqForge AI Review</h3>
            </div>

            <div className="p-5 space-y-4">
              {validationStatus === "running" ? (
                /* ── Running state ── */
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader size={24} className="animate-spin" style={{ color: "#1E3A8A" }} />
                  <p style={{ fontSize: "13px", color: "#64748B", textAlign: "center" }}>
                    {tr.requirements.validatingMsg}
                  </p>
                </div>
              ) : (
                <>
                  {/* ── Outdated warning banner (shown at top) ── */}
                  {validationStatus === "outdated" && (
                    <div
                      className="rounded-lg p-4"
                      style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          size={14}
                          style={{ color: "#D97706", flexShrink: 0, marginTop: "2px" }}
                        />
                        <div className="flex-1">
                          <p
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "#D97706",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              marginBottom: "3px",
                            }}
                          >
                            {tr.requirements.validationOutdated}
                          </p>
                          <p
                            style={{
                              fontSize: "12.5px",
                              color: "#92400E",
                              lineHeight: 1.5,
                              marginBottom: "8px",
                            }}
                          >
                            {tr.requirements.validationOutdatedMsg}
                          </p>
                          <button
                            onClick={handleRunValidation}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white hover:opacity-90 transition-all"
                            style={{ background: "#D97706", fontSize: "12px", fontWeight: 500 }}
                          >
                            <Sparkles size={11} /> {tr.requirements.rerunValidation}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {validationStatus === "complete" || validationStatus === "outdated" || validationStatus === "error" ? (
                    <>
                      {/* Section A — Validation Summary */}
                      <div
                        className="rounded-lg p-4"
                        style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
                      >
                        <p
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#93C5FD",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: "5px",
                          }}
                        >
                          {tr.requirements.summaryLabel}
                        </p>
                        <div className="flex items-center justify-between">
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1E3A8A" }}>
                            {validationStatus === "error" ? "Validation failed" : tr.requirements.validationComplete}
                          </p>
                        </div>
                        <p style={{ fontSize: "12px", color: "#1E3A8A", marginTop: "4px" }}>
                          {validationStatus === "error"
                            ? validationError
                            : issueCount === 0
                              ? tr.requirements.noIssuesFound
                              : `${issueCount} issue${issueCount !== 1 ? "s" : ""} detected — ${
                                  validationIssues.filter((issue) => issue.severity === "HIGH").length
                                } High, ${
                                  validationIssues.filter((issue) => issue.severity === "MEDIUM").length
                                } Medium`}
                        </p>
                      </div>

                      {/* Section B — Source Evidence OR Source Information */}
                      {req.sourceType === "AI_FROM_USER_NEED" || !req.sourceType ? (
                        <div className="rounded-lg p-4" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                          <p style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                            {tr.requirements.sourceEvidenceLabel}
                          </p>
                          {sourceNeed ? (
                            <div>
                              <div className="px-3 py-2 rounded-md mb-2" style={{ background: "#EFF6FF" }}>
                                <span style={{ fontSize: "11.5px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#1E3A8A" }}>{sourceNeed.id}</span>
                                <span style={{ fontSize: "12px", color: "#1E3A8A" }}> — {sourceNeed.title}</span>
                              </div>
                              <p style={{ fontSize: "11.5px", color: "#64748B", marginBottom: "5px" }}>{tr.requirements.supportingFeedback}</p>
                              <div className="space-y-1">
                                {supportingFb.map((fb) => (
                                  <div key={fb.id} className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer hover:opacity-80" style={{ background: "#EFF6FF", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#1E3A8A", fontWeight: 500 }}>
                                      {fb.id} <ExternalLink size={8} />
                                    </span>
                                    <span style={{ fontSize: "11.5px", color: "#64748B" }} className="line-clamp-1">"{fb.text}"</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p style={{ fontSize: "12.5px", color: "#94A3B8" }}>No linked User Need.</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg p-4" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                          <p style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                            Source Information
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md" style={{ background: sourceCfg[req.sourceType].bg, color: sourceCfg[req.sourceType].text, fontSize: "11px", fontWeight: 600 }}>
                                {sourceCfg[req.sourceType].label}
                              </span>
                            </div>
                            {req.sourceReference && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                                <FileText size={12} style={{ color: "#1E3A8A", flexShrink: 0 }} />
                                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#1E3A8A" }}>{req.sourceReference}</span>
                              </div>
                            )}
                            {req.additionalContext && (
                              <p style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5 }}>{req.additionalContext}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section D — Validation Findings */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <AlertTriangle
                            size={12}
                            style={{ color: openIssueCount > 0 ? "#D97706" : "#94A3B8" }}
                          />
                          <p
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#94A3B8",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {tr.requirements.findingsLabel}
                          </p>
                          {openIssueCount > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded-full"
                              style={{
                                background: "#FEF2F2",
                                color: "#DC2626",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              {openIssueCount}
                            </span>
                          )}
                        </div>

                        {issuesLoading ? (
                          <div className="flex items-center gap-2 rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                            <Loader size={13} className="animate-spin" style={{ color: "#1E3A8A" }} />
                            <span style={{ fontSize: "12.5px", color: "#64748B" }}>Loading validation issues...</span>
                          </div>
                        ) : issuesError ? (
                          <div className="rounded-lg border p-4" style={{ background: "#FEF2F2", borderColor: "#FCA5A5" }}>
                            <p style={{ fontSize: "12.5px", color: "#B91C1C" }}>{issuesError}</p>
                            <button onClick={() => void onRetryIssues()} style={{ fontSize: "12px", color: "#1E3A8A", marginTop: "5px" }}>Retry</button>
                          </div>
                        ) : issueCount === 0 ? (
                          <div
                            className="rounded-lg p-4"
                            style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle size={14} style={{ color: "#059669" }} />
                              <p style={{ fontSize: "13px", fontWeight: 500, color: "#059669" }}>
                                {tr.requirements.noIssuesFound}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {validationIssues.map((issue) => {
                              const ss =
                                issue.severity === "HIGH"
                                  ? { bg: "#FEF2F2", color: "#DC2626" }
                                  : issue.severity === "MEDIUM"
                                  ? { bg: "#FEF3C7", color: "#D97706" }
                                  : { bg: "#EFF6FF", color: "#1E3A8A" };
                              const expanded = expandedIssues.has(issue.id);
                              const hasMore = !!(issue.suggestion || issue.confidence !== null);
                              const isClosed = issue.status !== "OPEN";
                              const borderColor = isClosed
                                ? "#E2E8F0"
                                : issue.severity === "HIGH"
                                ? "#FCA5A5"
                                : "#FDE68A";
                              const severityLabel = issue.severity.charAt(0) + issue.severity.slice(1).toLowerCase();
                              return (
                                <div
                                  key={issue.id}
                                  className="rounded-lg p-3.5"
                                  style={{
                                    background: isClosed ? "#F8FAFC" : "#FFF",
                                    border: `1px solid ${borderColor}`,
                                    opacity: isClosed ? 0.8 : 1,
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span
                                      className="px-1.5 py-0.5 rounded"
                                      style={{
                                        background: ss.bg,
                                        color: ss.color,
                                        fontSize: "10px",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {severityLabel}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: 600,
                                        color: "#64748B",
                                        fontFamily: "var(--font-mono)",
                                        letterSpacing: "0.03em",
                                      }}
                                    >
                                      {issue.issue_type.replace(/_/g, " ")}
                                    </span>
                                    {isClosed && (
                                      <span
                                        className="ml-auto flex-shrink-0 px-2 py-0.5 rounded-full"
                                        style={{
                                          background: "#DCFCE7",
                                          color: "#059669",
                                          fontSize: "10px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {issue.status === "RESOLVED" ? tr.requirements.resolvedBadge : "Dismissed"}
                                      </span>
                                    )}
                                  </div>

                                  {issue.evidence && (
                                    <div
                                      className="rounded px-2 py-1 mb-2"
                                      style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}
                                    >
                                      <p style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5 }}>
                                        {issue.evidence}
                                      </p>
                                    </div>
                                  )}

                                  <p
                                    style={{
                                      fontSize: "12.5px",
                                      color: isClosed ? "#64748B" : "#1E293B",
                                      lineHeight: 1.55,
                                    }}
                                  >
                                    {issue.description}
                                  </p>

                                  {hasMore && (
                                    <button
                                      onClick={() => toggleIssue(issue.id)}
                                      className="flex items-center gap-1 mt-1.5 hover:opacity-70 transition-opacity"
                                      style={{ fontSize: "11px", color: "#64748B" }}
                                    >
                                      <ChevronDown
                                        size={12}
                                        style={{
                                          transform: expanded ? "rotate(180deg)" : "none",
                                          transition: "transform 0.15s",
                                        }}
                                      />
                                      {expanded ? tr.requirements.showLess : tr.requirements.showMore}
                                    </button>
                                  )}

                                  {expanded && (
                                    <div className="mt-2 space-y-2">
                                      {issue.suggestion && (
                                        <p
                                          style={{
                                            fontSize: "12px",
                                            color: "#64748B",
                                            lineHeight: 1.55,
                                            fontStyle: "italic",
                                          }}
                                        >
                                          {issue.suggestion}
                                        </p>
                                      )}
                                      {issue.confidence !== null && (
                                        <p style={{ fontSize: "11.5px", color: "#64748B" }}>
                                          Confidence: {Math.round(Number(issue.confidence) * 100)}%
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </>
                  ) : (
                    /* ── Idle placeholder ── */
                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                      <Sparkles size={28} style={{ color: "#CBD5E1" }} />
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#94A3B8" }}>
                        {tr.requirements.noValidationYet}
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#CBD5E1",
                          textAlign: "center",
                          maxWidth: "220px",
                        }}
                      >
                        {tr.requirements.noValidationHint}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Approve Warning Modal ──────────────────────────────────────────── */}
      {approveWarningOpen && (
        <Modal
          title={tr.requirements.approveWithIssuesTitle}
          onClose={() => setApproveWarningOpen(false)}
          width="460px"
        >
          <div className="px-5 py-4 space-y-3">
            <div className="rounded-lg p-4" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
              <p
                style={{ fontSize: "12.5px", fontWeight: 600, color: "#DC2626", marginBottom: "8px" }}
              >
                {openHighIssues.length} high-severity validation issue{openHighIssues.length !== 1 ? "s are" : " is"} still unresolved.
              </p>
              <ul className="space-y-2">
                {openHighIssues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-2">
                    <span style={{ color: "#DC2626", marginTop: "1px", flexShrink: 0 }}>·</span>
                    <p style={{ fontSize: "12px", color: "#7F1D1D", lineHeight: 1.5 }}>
                      <strong>{issue.issue_type.replace(/_/g, " ")}:</strong> {issue.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <button
              onClick={() => setApproveWarningOpen(false)}
              className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}
            >
              {tr.requirements.cancel}
            </button>
            <button
              onClick={() => void handleApproveAnyway()}
              disabled={actionBusy}
              className="px-4 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-60"
              style={{ background: "#DC2626", fontSize: "13px", fontWeight: 500 }}
            >
              {tr.requirements.approveAnyway}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Reject Reason Modal ────────────────────────────────────────────── */}
      {rejectModalOpen && (
        <Modal
          title={tr.requirements.rejectReasonTitle}
          onClose={() => setRejectModalOpen(false)}
          width="480px"
        >
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-2">
              {rejectReasons.map((reason) => (
                <label
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor: rejectReason === reason ? "#DC2626" : "var(--border)",
                    background: rejectReason === reason ? "#FEF2F2" : "#F8FAFC",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: rejectReason === reason ? "#DC2626" : "#CBD5E1" }}
                  >
                    {rejectReason === reason && (
                      <div className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      color: rejectReason === reason ? "#DC2626" : "var(--foreground)",
                      fontWeight: rejectReason === reason ? 500 : 400,
                    }}
                  >
                    {reason}
                  </span>
                </label>
              ))}
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "6px" }}>
                {tr.requirements.rejectNoteLabel}
              </p>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Add a note (optional)..."
                rows={3}
                className="w-full rounded-md border px-3 py-2 outline-none resize-none"
                style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}
            >
              {tr.requirements.cancel}
            </button>
            <button
              onClick={() => void handleRejectConfirm()}
              disabled={!rejectReason || actionBusy}
              className="px-4 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: "#DC2626", fontSize: "13px", fontWeight: 500 }}
            >
              {tr.requirements.confirmRejectBtn}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface RequirementsProps {
  requirements: RequirementViewModel[];
  needs: UserNeedViewModel[];
  feedback: FeedbackItem[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => Promise<void>;
  onGenerateRequirements: (needIds: string[], signal?: AbortSignal) => Promise<AnalysisRunDto>;
  onLoadRequirementDetail: (requirementId: string) => Promise<RequirementViewModel>;
  onCreateRequirement: (payload: RequirementCreateRequest) => Promise<RequirementViewModel>;
  onSaveRequirement: (requirementId: string, payload: RequirementUpdateRequest) => Promise<RequirementViewModel>;
  onApproveRequirement: (requirementId: string) => Promise<RequirementViewModel>;
  onRejectRequirement: (requirementId: string) => Promise<RequirementViewModel>;
  onLoadRequirementIssues: (requirementId: string) => Promise<RequirementIssueDto[]>;
  onValidateRequirement: (
    requirementId: string,
    signal?: AbortSignal,
  ) => Promise<{
    run: AnalysisRunDto;
    requirement: RequirementViewModel;
    issues: RequirementIssueDto[];
  }>;
  showGenerateModal?: boolean;
  onCloseGenerateModal?: () => void;
}

export function Requirements({
  requirements,
  needs,
  feedback,
  loading,
  loadError,
  onRetry,
  onGenerateRequirements,
  onLoadRequirementDetail,
  onCreateRequirement,
  onSaveRequirement,
  onApproveRequirement,
  onRejectRequirement,
  onLoadRequirementIssues,
  onValidateRequirement,
  showGenerateModal = false,
  onCloseGenerateModal,
}: RequirementsProps) {
  const { tr } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(tr.requirements.allStatuses);
  const [typeFilter, setTypeFilter] = useState(tr.requirements.allTypes);
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [confFilter, setConfFilter] = useState(tr.requirements.allConfidence);
  const [selected, setSelected] = useState<RequirementViewModel | null>(null);
  const [localShowGen, setLocalShowGen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [genSelected, setGenSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [busyRequirementId, setBusyRequirementId] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<RequirementIssueDto[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const generationControllerRef = useRef<AbortController | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  // Create Requirement form state
  const emptyCreateForm = () => ({ title: "", description: "", type: "Functional" as RequirementType, sourceOption: "" as RequirementSourceType | "", sourceRef: "", relatedNeedId: "", context: "" });
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [createErrors, setCreateErrors] = useState<Partial<Record<string, string>>>({});
  const [creating, setCreating] = useState(false);

  const showGen = showGenerateModal || localShowGen;
  const closeGen = () => { setLocalShowGen(false); onCloseGenerateModal?.(); setGenSelected(new Set()); };

  const confirmedNeeds = needs.filter((n) => n.status === "Confirmed");

  const filtered = useMemo(() => {
    let list = requirements;
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((r) => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)); }
    if (statusFilter !== tr.requirements.allStatuses) {
      if (statusFilter === tr.status.Draft) list = list.filter((r) => r.status === "Draft");
      else if (statusFilter === "Needs Review") list = list.filter((r) => r.status === "Needs Review");
      else if (statusFilter === tr.status.Approved) list = list.filter((r) => r.status === "Approved");
      else if (statusFilter === tr.status.Rejected) list = list.filter((r) => r.status === "Rejected");
      else if (statusFilter === tr.status.Archived) list = list.filter((r) => r.status === "Archived");
    }
    if (typeFilter !== tr.requirements.allTypes) list = list.filter((r) => r.type === typeFilter);
    if (confFilter !== tr.requirements.allConfidence) list = list.filter((r) => r.confidence === confFilter);
    if (sourceFilter === "AI from User Need") list = list.filter((r) => r.sourceType === "AI_FROM_USER_NEED" || !r.sourceType);
    else if (sourceFilter === "Stakeholder") list = list.filter((r) => r.sourceType === "STAKEHOLDER");
    else if (sourceFilter === "Existing Specification") list = list.filter((r) => r.sourceType === "EXISTING_SPEC");
    else if (sourceFilter === "Security Policy") list = list.filter((r) => r.sourceType === "POLICY");
    else if (sourceFilter === "Compliance") list = list.filter((r) => r.sourceType === "COMPLIANCE");
    else if (sourceFilter === "SLA / Technical") list = list.filter((r) => r.sourceType === "TECHNICAL_CONSTRAINT");
    else if (sourceFilter === "Manual") list = list.filter((r) => r.sourceType === "MANUAL");
    return list;
  }, [requirements, search, statusFilter, typeFilter, confFilter, sourceFilter, tr]);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, confFilter, sourceFilter]);
  useEffect(() => () => generationControllerRef.current?.abort(), []);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleGenerate = async () => {
    if (genSelected.size === 0) { toast.error("Please select at least one User Need"); return; }
    const selectedCount = genSelected.size;
    setGenerating(true);
    const controller = new AbortController();
    generationControllerRef.current = controller;
    try {
      await onGenerateRequirements(Array.from(genSelected), controller.signal);
      setGenerating(false);
      closeGen();
      toast.success(selectedCount === 1 ? "1 candidate requirement generated" : `${selectedCount} candidate requirements generated`);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error(getErrorMessage(error, "Unable to generate requirements."));
      }
    } finally {
      generationControllerRef.current = null;
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    const errs: Partial<Record<string, string>> = {};
    if (!createForm.title.trim()) errs.title = "Title is required";
    if (!createForm.description.trim()) errs.description = "Description is required";
    if (!createForm.sourceOption) errs.sourceOption = "Source is required";
    if (Object.keys(errs).length > 0) { setCreateErrors(errs); return; }
    setCreating(true);
    try {
      await onCreateRequirement({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        type: toRequirementTypeDto(createForm.type),
        need_ids: createForm.relatedNeedId ? [createForm.relatedNeedId] : [],
      });
      setShowCreate(false);
      setCreateForm(emptyCreateForm());
      setCreateErrors({});
      toast.success("Requirement created");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to create requirement."));
    } finally {
      setCreating(false);
    }
  };

  const openRequirement = async (requirementId: string) => {
    if (detailLoadingId) return;
    setDetailLoadingId(requirementId);
    const toastId = toast.loading("Loading requirement details...");
    try {
      const detail = await onLoadRequirementDetail(requirementId);
      setSelected(detail);
      setValidationIssues([]);
      setIssuesError(null);
      void refreshIssues(requirementId);
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load requirement details."), { id: toastId });
    } finally {
      setDetailLoadingId(null);
    }
  };

  const refreshIssues = async (requirementId: string): Promise<void> => {
    setIssuesLoading(true);
    setIssuesError(null);
    try {
      setValidationIssues(await onLoadRequirementIssues(requirementId));
    } catch (error) {
      setIssuesError(getErrorMessage(error, "Unable to load validation issues."));
    } finally {
      setIssuesLoading(false);
    }
  };

  const validateSelected = async (signal: AbortSignal): Promise<AnalysisRunDto> => {
    if (!selected) throw new Error("No requirement selected.");
    const result = await onValidateRequirement(selected.id, signal);
    setSelected(result.requirement);
    setValidationIssues(result.issues);
    setIssuesError(null);
    return result.run;
  };

  const updateSelected = async (payload: RequirementUpdateRequest): Promise<boolean> => {
    if (!selected || busyRequirementId) return false;
    setBusyRequirementId(selected.id);
    try {
      setSelected(await onSaveRequirement(selected.id, payload));
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update requirement."));
      return false;
    } finally {
      setBusyRequirementId(null);
    }
  };

  const approve = async (requirementId: string): Promise<boolean> => {
    if (busyRequirementId) return false;
    setBusyRequirementId(requirementId);
    try {
      const updated = await onApproveRequirement(requirementId);
      if (selected?.id === requirementId) setSelected(updated);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to approve requirement."));
      return false;
    } finally {
      setBusyRequirementId(null);
    }
  };

  const reject = async (requirementId: string): Promise<boolean> => {
    if (busyRequirementId) return false;
    setBusyRequirementId(requirementId);
    try {
      const updated = await onRejectRequirement(requirementId);
      if (selected?.id === requirementId) setSelected(updated);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to reject requirement."));
      return false;
    } finally {
      setBusyRequirementId(null);
    }
  };

  if (selected) {
    return (
      <ReqDetail
        req={selected}
        needs={needs}
        feedback={feedback}
        validationIssues={validationIssues}
        issuesLoading={issuesLoading}
        issuesError={issuesError}
        actionBusy={busyRequirementId === selected.id}
        onBack={() => { setSelected(null); setValidationIssues([]); setIssuesError(null); }}
        onUpdate={updateSelected}
        onApprove={() => approve(selected.id)}
        onReject={() => reject(selected.id)}
        onRetryIssues={() => refreshIssues(selected.id)}
        onValidate={validateSelected}
      />
    );
  }

  const approved = requirements.filter((r) => r.status === "Approved").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 style={{ fontSize: "19px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{tr.requirements.title}</h1>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>{tr.requirements.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)", fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                <Plus size={13} /> Create Requirement
              </button>
              <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-md px-3 py-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#fff", borderColor: "var(--border)", fontSize: "11.5px", color: "#64748B", width: "260px", lineHeight: 1.5 }}>
                Manually add a stakeholder-defined, policy-driven, or externally sourced requirement.
              </div>
            </div>
            <div className="relative group">
              <button onClick={() => setLocalShowGen(true)} className="flex items-center gap-2 px-4 py-2 rounded-2xl text-white hover:opacity-90 transition-all" style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}>
                <Sparkles size={13} /> Generate from User Needs
              </button>
              <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-md px-3 py-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#fff", borderColor: "var(--border)", fontSize: "11.5px", color: "#64748B", width: "260px", lineHeight: 1.5 }}>
                Create candidate requirements from confirmed User Needs and supporting feedback using AI.
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border flex-1" style={{ borderColor: "var(--border)", background: "#fff" }}>
            <Search size={13} style={{ color: "#94A3B8" }} />
            <input type="text" placeholder={tr.requirements.search} value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" style={{ fontSize: "13px" }} />
          </div>
          <SimpleSelect value={statusFilter} options={[tr.requirements.allStatuses, tr.status.Draft, "Needs Review", tr.status.Approved, tr.status.Rejected, tr.status.Archived]} onChange={setStatusFilter} />
          <SimpleSelect value={typeFilter} options={[tr.requirements.allTypes, ...REQ_TYPES]} onChange={setTypeFilter} />
          <SimpleSelect value={sourceFilter} options={["All Sources", "AI from User Need", "Stakeholder", "Existing Specification", "Security Policy", "Compliance", "SLA / Technical", "Manual"]} onChange={setSourceFilter} />
          <SimpleSelect value={confFilter} options={[tr.requirements.allConfidence, "High", "Medium", "Low"]} onChange={setConfFilter} />
          <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>{filtered.length} reqs</span>
        </div>

        {/* Table */}
        {loadError && (
          <div className="mb-3 flex items-center justify-between rounded-lg border px-4 py-3" style={{ background: "#FEF2F2", borderColor: "#FCA5A5" }}>
            <span style={{ fontSize: "12.5px", color: "#B91C1C" }}>{loadError}</span>
            <button onClick={() => void onRetry()} style={{ fontSize: "12px", color: "#1E3A8A", fontWeight: 500 }}>Retry</button>
          </div>
        )}
        <div className="rounded-lg border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                {["ID", "Requirement", "Type", "Source", "Status", "Issues", ""].map((col) => (
                  <th key={col} className="px-4 py-3 text-left" style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748B", letterSpacing: "0.02em" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && requirements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader size={15} className="animate-spin inline" style={{ color: "#1E3A8A" }} />
                  </td>
                </tr>
              )}
              {!loading && requirements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ fontSize: "13px", color: "#64748B" }}>No requirements found.</td>
                </tr>
              )}
              {paginated.map((req, i) => {
                const sc = statusCfg[req.status];
                const tc = typeCfg[req.type];
                return (
                  <tr key={req.id} onClick={() => void openRequirement(req.id)} className="cursor-pointer border-b transition-colors" style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "#fff" : "#FAFBFC", opacity: detailLoadingId === req.id ? 0.65 : 1 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F8FAFC"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "#fff" : "#FAFBFC"; }}
                  >
                    <td className="px-4 py-3.5"><span style={{ fontSize: "11.5px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#64748B" }}>{req.id}</span></td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", marginBottom: "2px" }}>{req.title}</p>
                      <p style={{ fontSize: "11.5px", color: "#94A3B8" }} className="line-clamp-1">{req.description}</p>
                    </td>
                    <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded-md" style={{ background: tc.bg, color: tc.text, fontSize: "11px", fontWeight: 500 }}>{req.type}</span></td>
                    <td className="px-4 py-3.5">
                      {(() => {
                        const src = sourceCfg[req.sourceType ?? "AI_FROM_USER_NEED"];
                        return (
                          <div>
                            <span className="px-1.5 py-0.5 rounded text-nowrap" style={{ background: src.bg, color: src.text, fontSize: "10px", fontWeight: 600 }}>{src.label}</span>
                            {req.sourceNeedId && <p style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", color: "#94A3B8", marginTop: "2px" }}>{req.sourceNeedId}</p>}
                            {req.sourceReference && <p style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", color: "#94A3B8", marginTop: "2px" }}>{req.sourceReference}</p>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                        <span style={{ fontSize: "12px", color: sc.text, fontWeight: 500 }}>{(tr.status as Record<string, string>)[req.status] ?? req.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {req.issueCount > 0 ? (
                        <div className="flex items-center gap-1.5"><AlertTriangle size={12} style={{ color: "#D97706" }} /><span style={{ fontSize: "12px", color: "#D97706", fontWeight: 600 }}>{req.issueCount} open</span></div>
                      ) : (
                        <div className="flex items-center gap-1.5"><CheckCircle size={12} style={{ color: "#059669" }} /><span style={{ fontSize: "12px", color: "#059669" }}>Clean</span></div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {req.status === "Needs Review" && (
                        <button disabled={busyRequirementId !== null} onClick={(e) => { e.stopPropagation(); void approve(req.id).then((succeeded) => { if (succeeded) toast.success("Requirement approved"); }); }} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-60 transition-colors" style={{ fontSize: "11px", color: "#059669" }}>
                          <CheckCircle size={10} /> {tr.requirements.approve}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination + Stats footer */}
        <div className="flex items-center justify-between mt-4">
          {/* Stats pills */}
          <div className="flex items-center gap-2">
            {[
              { label: "Total", value: requirements.length, color: "#64748B", bg: "#F1F5F9" },
              { label: "Approved", value: approved, color: "#059669", bg: "#ECFDF5" },
              { label: "Needs Review", value: requirements.filter((r) => r.status === "Needs Review").length, color: "#D97706", bg: "#FFFBEB" },
              { label: "Draft", value: requirements.filter((r) => r.status === "Draft").length, color: "#1E3A8A", bg: "#EFF6FF" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: s.bg }}>
                <span style={{ fontSize: "12.5px", fontWeight: 600, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: "11px", color: s.color, opacity: 0.6 }}>·</span>
                <span style={{ fontSize: "11.5px", color: s.color, fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Page controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-md border transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border)", fontSize: "12px", color: "#374151" }}
              >← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-md border transition-colors"
                  style={{
                    borderColor: p === page ? "#1E3A8A" : "var(--border)",
                    background: p === page ? "#EFF6FF" : "transparent",
                    fontSize: "12px",
                    fontWeight: p === page ? 600 : 400,
                    color: p === page ? "#1E3A8A" : "#374151",
                  }}
                >{p}</button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-md border transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border)", fontSize: "12px", color: "#374151" }}
              >Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Generate from User Needs Modal */}
      {showGen && (
        <Modal title="Generate Candidate Requirements" subtitle="Create candidate software requirements from confirmed User Needs and supporting evidence." onClose={generating ? undefined : closeGen} width="560px">
          <div className="px-5 py-4">
            {confirmedNeeds.length === 0 ? (
              <p style={{ fontSize: "13.5px", color: "#64748B", textAlign: "center", padding: "20px 0" }}>No confirmed User Needs available. Confirm needs in the User Needs tab first.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p style={{ fontSize: "12.5px", color: "#64748B" }}>{confirmedNeeds.length} confirmed need{confirmedNeeds.length !== 1 ? "s" : ""} — showing by default</p>
                  <button onClick={() => setGenSelected(new Set(confirmedNeeds.map((n) => n.id)))} style={{ fontSize: "12.5px", color: "#1E3A8A", fontWeight: 500 }}>Select All</button>
                </div>
                <div className="space-y-2">
                  {confirmedNeeds.map((need) => {
                    const checked = genSelected.has(need.id);
                    const fbCount = need.evidenceCount;
                    const alreadyCovered = requirements.some((r) => r.sourceNeedIds.includes(need.id) && r.status !== "Rejected");
                    return (
                      <label key={need.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors" style={{ borderColor: checked ? "#1E3A8A" : "var(--border)", background: checked ? "#EFF6FF" : "#F8FAFC" }}>
                        <input type="checkbox" checked={checked} onChange={() => { const n = new Set(genSelected); checked ? n.delete(need.id) : n.add(need.id); setGenSelected(n); }} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#64748B" }}>{need.id}</span>
                            <span style={{ fontSize: "11px", color: "#059669", fontWeight: 500 }}>Confirmed</span>
                            {alreadyCovered && <span className="px-1.5 py-0 rounded-full" style={{ background: "#ECFDF5", color: "#059669", fontSize: "10px", fontWeight: 600 }}>Has requirement</span>}
                          </div>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", marginTop: "2px" }}>{need.title}</p>
                          <p style={{ fontSize: "11.5px", color: "#94A3B8", marginTop: "1px" }}>{fbCount} supporting feedback</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={closeGen} disabled={generating} className="px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-60" style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>Cancel</button>
            <button onClick={() => void handleGenerate()} disabled={generating || genSelected.size === 0} className="flex items-center gap-2 px-4 py-2 rounded-2xl text-white hover:opacity-90 disabled:opacity-60" style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500, border: "1.5px solid #60A5FA" }}>
              {generating ? <><Loader size={12} className="animate-spin" /> Generating...</> : <><Sparkles size={12} /> {genSelected.size > 0 ? `Generate ${genSelected.size} Candidate Requirement${genSelected.size !== 1 ? "s" : ""}` : "Generate"}</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Create Requirement Modal */}
      {showCreate && (
        <Modal title="Create Requirement" subtitle="Add an existing, stakeholder-defined, policy-driven, or manually authored requirement." onClose={() => { setShowCreate(false); setCreateForm(emptyCreateForm()); setCreateErrors({}); }} width="560px">
          <div className="px-5 py-5 space-y-4">
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Title <span style={{ color: "#DC2626" }}>*</span></label>
              <input type="text" value={createForm.title} onChange={(e) => { setCreateForm(f => ({ ...f, title: e.target.value })); setCreateErrors(e2 => ({ ...e2, title: undefined })); }}
                placeholder="e.g. Secure password storage"
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: createErrors.title ? "#DC2626" : "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
              {createErrors.title && <p style={{ fontSize: "11.5px", color: "#DC2626", marginTop: "3px" }}>{createErrors.title}</p>}
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Description <span style={{ color: "#DC2626" }}>*</span></label>
              <textarea value={createForm.description} onChange={(e) => { setCreateForm(f => ({ ...f, description: e.target.value })); setCreateErrors(e2 => ({ ...e2, description: undefined })); }}
                rows={3} placeholder="Describe the capability, behavior, or constraint the system must satisfy..."
                className="w-full rounded-md border px-3 py-2 outline-none resize-none"
                style={{ borderColor: createErrors.description ? "#DC2626" : "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
              {createErrors.description && <p style={{ fontSize: "11.5px", color: "#DC2626", marginTop: "3px" }}>{createErrors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Type <span style={{ color: "#DC2626" }}>*</span></label>
                <select value={createForm.type} onChange={(e) => setCreateForm(f => ({ ...f, type: e.target.value as RequirementType }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }}>
                  {REQ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Source <span style={{ color: "#DC2626" }}>*</span></label>
                <select value={createForm.sourceOption} onChange={(e) => { setCreateForm(f => ({ ...f, sourceOption: e.target.value as RequirementSourceType })); setCreateErrors(e2 => ({ ...e2, sourceOption: undefined })); }}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: createErrors.sourceOption ? "#DC2626" : "var(--border)", fontSize: "13px", background: "#F8FAFC" }}>
                  <option value="">Select source...</option>
                  {REQ_SOURCE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {createErrors.sourceOption && <p style={{ fontSize: "11.5px", color: "#DC2626", marginTop: "3px" }}>{createErrors.sourceOption}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Source Reference <span style={{ fontSize: "11px", color: "#94A3B8" }}>(optional)</span></label>
                <input type="text" value={createForm.sourceRef} onChange={(e) => setCreateForm(f => ({ ...f, sourceRef: e.target.value }))}
                  placeholder="e.g. SEC-POL-004"
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
              </div>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Related User Need <span style={{ fontSize: "11px", color: "#94A3B8" }}>(optional)</span></label>
                <select value={createForm.relatedNeedId} onChange={(e) => setCreateForm(f => ({ ...f, relatedNeedId: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }}>
                  <option value="">None</option>
                  {confirmedNeeds.map((n) => <option key={n.id} value={n.id}>{n.id} — {n.title}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "5px" }}>Additional Context <span style={{ fontSize: "11px", color: "#94A3B8" }}>(optional)</span></label>
              <input type="text" value={createForm.context} onChange={(e) => setCreateForm(f => ({ ...f, context: e.target.value }))}
                placeholder="Background, constraints, or rationale..."
                className="w-full rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: "var(--border)", fontSize: "13px", background: "#F8FAFC" }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => { setShowCreate(false); setCreateForm(emptyCreateForm()); setCreateErrors({}); }} className="px-4 py-2 rounded-md border hover:bg-gray-50" style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}>Cancel</button>
            <button onClick={() => void handleCreate()} disabled={creating} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white hover:opacity-90 disabled:opacity-60" style={{ background: "var(--primary)", fontSize: "13px", fontWeight: 500 }}>
              {creating ? <><Loader size={12} className="animate-spin" /> Creating...</> : <><Plus size={12} /> Create Requirement</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
