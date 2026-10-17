import assert from "node:assert/strict";
import test from "node:test";
import {
  getReviewDecisionLabel,
  getReviewHistoryPageCount,
  getReviewHistoryViewState,
} from "../src/utils/reviewHistory.ts";

const labels = {
  confirmed: "Confirmed",
  rejected: "Rejected",
  approved: "Approved",
  reopened: "Reopened",
};

test("review decision history labels multiple decisions including Reopen", () => {
  const decisions = ["CONFIRMED", "REOPENED", "APPROVED"] as const;
  assert.deepEqual(decisions.map((decision) => getReviewDecisionLabel(decision, labels)), [
    "Confirmed",
    "Reopened",
    "Approved",
  ]);
});

test("empty history has an explicit empty state", () => {
  assert.equal(getReviewHistoryViewState({ loading: false, hasError: false, eventCount: 0 }), "empty");
});

test("history loading and error states take precedence over empty state", () => {
  assert.equal(getReviewHistoryViewState({ loading: true, hasError: false, eventCount: 0 }), "loading");
  assert.equal(getReviewHistoryViewState({ loading: false, hasError: true, eventCount: 0 }), "error");
  assert.equal(getReviewHistoryViewState({ loading: false, hasError: false, eventCount: 2 }), "events");
});

test("pagination calculates page count and keeps an empty list on page one", () => {
  assert.equal(getReviewHistoryPageCount(0, 20), 1);
  assert.equal(getReviewHistoryPageCount(20, 20), 1);
  assert.equal(getReviewHistoryPageCount(21, 20), 2);
});
