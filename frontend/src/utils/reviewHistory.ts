import type { ReviewDecisionEventDto } from "../types/reviewDecision";

export interface ReviewHistoryLabels {
  confirmed: string;
  rejected: string;
  approved: string;
  reopened: string;
}

export type ReviewHistoryViewState = "loading" | "error" | "empty" | "events";

export function getReviewHistoryViewState(input: {
  loading: boolean;
  hasError: boolean;
  eventCount: number;
}): ReviewHistoryViewState {
  if (input.loading) return "loading";
  if (input.hasError) return "error";
  return input.eventCount === 0 ? "empty" : "events";
}

export function getReviewHistoryPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function getReviewDecisionLabel(
  decision: ReviewDecisionEventDto["decision"],
  labels: ReviewHistoryLabels,
): string {
  const decisionLabels = {
    CONFIRMED: labels.confirmed,
    REJECTED: labels.rejected,
    APPROVED: labels.approved,
    REOPENED: labels.reopened,
  } satisfies Record<ReviewDecisionEventDto["decision"], string>;
  return decisionLabels[decision];
}

export function getReviewStatusKey(status: string): string {
  const statusKeys: Record<string, string> = {
    CANDIDATE: "Candidate",
    CONFIRMED: "Confirmed",
    REJECTED: "Rejected",
    DRAFT: "Draft",
    NEEDS_REVIEW: "Needs Review",
    APPROVED: "Approved",
    ARCHIVED: "Archived",
  };
  return statusKeys[status] ?? status.replaceAll("_", " ");
}
