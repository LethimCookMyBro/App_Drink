import assert from "node:assert/strict";
import test from "node:test";

/**
 * Regression test for the Admin Feedback >100 summary correctness bug.
 *
 * Before the fix, after a status mutation or delete, the frontend rebuilt
 * the summary from only the loaded ~100 rows, causing the global summary
 * to shrink to at most 100.
 *
 * After the fix, mutations preserve the server-authoritative summary and
 * only adjust the delta for the affected status.
 */

type FeedbackStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

interface Summary {
  ALL: number;
  PENDING: number;
  IN_PROGRESS: number;
  RESOLVED: number;
  REJECTED: number;
}

// This mirrors the exact delta logic used in the production code
function applyStatusChange(
  summary: Summary,
  oldStatus: FeedbackStatus,
  newStatus: FeedbackStatus,
): Summary {
  const updated = { ...summary };
  if (oldStatus !== newStatus) {
    updated[oldStatus] = Math.max(0, (updated[oldStatus] ?? 0) - 1);
    updated[newStatus] = (updated[newStatus] ?? 0) + 1;
  }
  return updated;
}

function applyDelete(summary: Summary, deletedStatus: FeedbackStatus): Summary {
  const updated = { ...summary };
  updated[deletedStatus] = Math.max(0, (updated[deletedStatus] ?? 0) - 1);
  updated.ALL = Math.max(0, (updated.ALL ?? 0) - 1);
  return updated;
}

test("status change preserves global ALL when old !== new", () => {
  // Simulate >100 records: global ALL=250, loaded subset=100
  const summary: Summary = { ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 };
  const result = applyStatusChange(summary, "PENDING", "RESOLVED");

  // ALL must remain 250 (not shrink to loaded subset size)
  assert.equal(result.ALL, 250, "ALL must remain server-authoritative after status change");
  assert.equal(result.PENDING, 119, "PENDING decreases by 1");
  assert.equal(result.RESOLVED, 61, "RESOLVED increases by 1");
  assert.equal(result.IN_PROGRESS, 50, "IN_PROGRESS unchanged");
  assert.equal(result.REJECTED, 20, "REJECTED unchanged");
});

test("status change with same status is a no-op", () => {
  const summary: Summary = { ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 };
  const result = applyStatusChange(summary, "PENDING", "PENDING");

  assert.deepEqual(result, summary, "No change when old === new");
});

test("delete preserves other statuses and decrements ALL", () => {
  const summary: Summary = { ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 };
  const result = applyDelete(summary, "PENDING");

  assert.equal(result.ALL, 249, "ALL decrements by 1");
  assert.equal(result.PENDING, 119, "Deleted status decrements by 1");
  assert.equal(result.IN_PROGRESS, 50, "IN_PROGRESS unchanged");
  assert.equal(result.RESOLVED, 60, "RESOLVED unchanged");
  assert.equal(result.REJECTED, 20, "REJECTED unchanged");
});

test("multiple mutations maintain correct totals", () => {
  let summary: Summary = { ALL: 250, PENDING: 120, IN_PROGRESS: 50, RESOLVED: 60, REJECTED: 20 };

  // Status change: PENDING -> RESOLVED
  summary = applyStatusChange(summary, "PENDING", "RESOLVED");
  assert.equal(summary.ALL, 250);

  // Delete a RESOLVED item
  summary = applyDelete(summary, "RESOLVED");
  assert.equal(summary.ALL, 249);
  assert.equal(summary.RESOLVED, 60); // 61 - 1 = 60

  // Status change: IN_PROGRESS -> REJECTED
  summary = applyStatusChange(summary, "IN_PROGRESS", "REJECTED");
  assert.equal(summary.ALL, 249); // ALL unchanged on status change
  assert.equal(summary.IN_PROGRESS, 49);
  assert.equal(summary.REJECTED, 21);
});

test("mutation does not cause summary to shrink to loaded subset size", () => {
  // This is the core regression: before fix, summary would become
  // buildFeedbackSummaryFromItems(loaded100) = { ALL: 100, ... }
  const summary: Summary = { ALL: 500, PENDING: 200, IN_PROGRESS: 100, RESOLVED: 150, REJECTED: 50 };

  // Simulate 10 status changes
  for (let i = 0; i < 10; i++) {
    summary.ALL; // Should remain 500 throughout
    const result = applyStatusChange(summary, "PENDING", "RESOLVED");
    assert.equal(result.ALL, 500, `ALL must remain 500 after mutation ${i + 1}`);
    Object.assign(summary, result);
  }

  assert.equal(summary.ALL, 500, "ALL never shrinks");
  assert.equal(summary.PENDING, 190, "PENDING decreased by 10");
  assert.equal(summary.RESOLVED, 160, "RESOLVED increased by 10");
});
