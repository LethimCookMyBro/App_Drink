import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFeedbackStatusDelta,
  applyFeedbackDeleteDelta,
  type FeedbackSummary,
} from "../src/shared/feedbackSummaryDelta";

/**
 * Regression test for the Admin Feedback >100 summary correctness bug.
 *
 * Before the fix, after a status mutation or delete, the frontend rebuilt
 * the summary from only the loaded ~100 rows, causing the global summary
 * to shrink to at most 100.
 *
 * After the fix, mutations preserve the server-authoritative summary and
 * only adjust the delta for the affected status.
 *
 * This test imports the PRODUCTION helper directly, so it cannot go green
 * while production code diverges.
 */

function makeSummary(overrides: Partial<FeedbackSummary> = {}): FeedbackSummary {
  return {
    ALL: 0,
    PENDING: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    REJECTED: 0,
    ...overrides,
  };
}

test("status change preserves global ALL when old !== new", () => {
  // Simulate >100 records: global ALL=250, loaded subset=100
  const summary = makeSummary({ ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 });
  const result = applyFeedbackStatusDelta(summary, "PENDING", "RESOLVED");

  // ALL must remain 250 (not shrink to loaded subset size)
  assert.equal(result.ALL, 250, "ALL must remain server-authoritative after status change");
  assert.equal(result.PENDING, 119, "PENDING decreases by 1");
  assert.equal(result.RESOLVED, 61, "RESOLVED increases by 1");
  assert.equal(result.IN_PROGRESS, 50, "IN_PROGRESS unchanged");
  assert.equal(result.REJECTED, 20, "REJECTED unchanged");
});

test("status change with same status is a no-op", () => {
  const summary = makeSummary({ ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 });
  const result = applyFeedbackStatusDelta(summary, "PENDING", "PENDING");

  assert.deepEqual(result, summary, "No change when old === new");
});

test("delete preserves other statuses and decrements ALL", () => {
  const summary = makeSummary({ ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 });
  const result = applyFeedbackDeleteDelta(summary, "PENDING");

  assert.equal(result.ALL, 249, "ALL decrements by 1");
  assert.equal(result.PENDING, 119, "Deleted status decrements by 1");
  assert.equal(result.IN_PROGRESS, 50, "IN_PROGRESS unchanged");
  assert.equal(result.RESOLVED, 60, "RESOLVED unchanged");
  assert.equal(result.REJECTED, 20, "REJECTED unchanged");
});

test("multiple mutations maintain correct totals", () => {
  let summary = makeSummary({ ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 });

  // Status change: PENDING -> RESOLVED
  summary = applyFeedbackStatusDelta(summary, "PENDING", "RESOLVED");
  assert.equal(summary.ALL, 250);

  // Delete a RESOLVED item
  summary = applyFeedbackDeleteDelta(summary, "RESOLVED");
  assert.equal(summary.ALL, 249);
  assert.equal(summary.RESOLVED, 60); // 61 - 1 = 60

  // Status change: IN_PROGRESS -> REJECTED
  summary = applyFeedbackStatusDelta(summary, "IN_PROGRESS", "REJECTED");
  assert.equal(summary.ALL, 249); // ALL unchanged on status change
  assert.equal(summary.IN_PROGRESS, 49);
  assert.equal(summary.REJECTED, 21);
});

test("mutation does not cause summary to shrink to loaded subset size", () => {
  // This is the core regression: before fix, summary would become
  // buildFeedbackSummaryFromItems(loaded100) = { ALL: 100, ... }
  let summary = makeSummary({ ALL: 500, PENDING: 200, IN_PROGRESS: 100, RESOLVED: 150, REJECTED: 50 });

  // Simulate 10 status changes
  for (let i = 0; i < 10; i++) {
    summary = applyFeedbackStatusDelta(summary, "PENDING", "RESOLVED");
    assert.equal(summary.ALL, 500, `ALL must remain 500 after mutation ${i + 1}`);
  }

  assert.equal(summary.ALL, 500, "ALL never shrinks");
  assert.equal(summary.PENDING, 190, "PENDING decreased by 10");
  assert.equal(summary.RESOLVED, 160, "RESOLVED increased by 10");
});
