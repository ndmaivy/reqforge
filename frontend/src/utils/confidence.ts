export type ConfidenceLevel = "High" | "Medium" | "Low" | "N/A";

export interface ConfidenceDisplay {
  level: ConfidenceLevel;
  score: number | null;
  percentage: number | null;
}

export function getConfidenceDisplay(
  value: number | string | null | undefined,
): ConfidenceDisplay {
  if (value === null || value === undefined || value === "") {
    return { level: "N/A", score: null, percentage: null };
  }

  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    return { level: "N/A", score: null, percentage: null };
  }

  return {
    level: score >= 0.8 ? "High" : score >= 0.5 ? "Medium" : "Low",
    score,
    percentage: Math.round(score * 100),
  };
}
