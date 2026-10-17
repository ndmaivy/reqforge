import assert from "node:assert/strict";
import test from "node:test";
import { getConfidenceDisplay } from "../src/utils/confidence.ts";

test("null confidence is N/A, not Low or zero", () => {
  assert.deepEqual(getConfidenceDisplay(null), { level: "N/A", score: null, percentage: null });
  assert.deepEqual(getConfidenceDisplay(undefined), { level: "N/A", score: null, percentage: null });
});

test("valid confidence uses the specified display thresholds and percentage", () => {
  assert.deepEqual(getConfidenceDisplay(0.8), { level: "High", score: 0.8, percentage: 80 });
  assert.deepEqual(getConfidenceDisplay("0.5"), { level: "Medium", score: 0.5, percentage: 50 });
  assert.deepEqual(getConfidenceDisplay(0.49), { level: "Low", score: 0.49, percentage: 49 });
});

test("invalid confidence is not presented as a calibrated score", () => {
  assert.equal(getConfidenceDisplay(Number.NaN).level, "N/A");
  assert.equal(getConfidenceDisplay(1.1).percentage, null);
});
