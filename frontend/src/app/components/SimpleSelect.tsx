import { useRef, useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

interface SimpleSelectProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function SimpleSelect({ value, options, onChange, className = "", style }: SimpleSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`} style={style}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md border transition-colors hover:bg-gray-50"
        style={{ borderColor: "var(--border)", background: "#fff", fontSize: "12.5px", color: "#374151", whiteSpace: "nowrap" }}
      >
        {value}
        <ChevronDown size={12} style={{ color: "#9CA3AF", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-full"
          style={{ background: "#fff", borderColor: "var(--border)", minWidth: "160px" }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
              style={{ fontSize: "12.5px", color: value === opt ? "#1E3A8A" : "#374151" }}
            >
              <span className="w-3 shrink-0">
                {value === opt && <Check size={12} style={{ color: "#1E3A8A" }} />}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
