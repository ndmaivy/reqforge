import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  subtitle?: string;
}

export function Modal({ title, onClose, children, width = "520px", subtitle }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col rounded-xl shadow-xl"
        style={{ background: "#fff", width, maxWidth: "95vw", maxHeight: "90vh", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>{title}</h2>
            {subtitle && <p style={{ fontSize: "12.5px", color: "#64748B", marginTop: "2px" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-4 hover:opacity-70 transition-opacity mt-0.5">
            <X size={16} style={{ color: "#94A3B8" }} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", confirmDanger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
    >
      <div className="rounded-xl shadow-xl" style={{ background: "#fff", width: "400px", border: "1px solid var(--border)" }}>
        <div className="px-5 py-5">
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)", marginBottom: "8px" }}>{title}</h3>
          <p style={{ fontSize: "13.5px", color: "#64748B", lineHeight: 1.5 }}>{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border transition-colors hover:bg-gray-50"
            style={{ borderColor: "var(--border)", fontSize: "13px", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-white transition-all hover:opacity-90"
            style={{ background: confirmDanger ? "#DC2626" : "#1E3A8A", fontSize: "13px", fontWeight: 500 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
