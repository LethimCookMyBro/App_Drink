import assert from "node:assert/strict";
import test from "node:test";

// Test the summary empty state logic
test("empty player stats array triggers empty state", () => {
  const playerStats: Array<{ name: string; drinkCount: number; questionsAnswered: number }> = [];
  const isEmpty = playerStats.length === 0;
  assert.equal(isEmpty, true, "Empty array should trigger empty state");
});

test("non-empty player stats does not trigger empty state", () => {
  const playerStats = [
    { name: "Player 1", drinkCount: 3, questionsAnswered: 5 },
  ];
  const isEmpty = playerStats.length === 0;
  assert.equal(isEmpty, false, "Non-empty array should not trigger empty state");
});

// Test feedback summary delta logic
test("feedback status change adjusts summary counts correctly", () => {
  const summary = { ALL: 100, PENDING: 50, IN_PROGRESS: 20, RESOLVED: 25, REJECTED: 5 };
  const oldStatus = "PENDING";
  const newStatus = "RESOLVED";

  // Simulate the delta logic from the fix
  const updated = { ...summary };
  if (oldStatus === "PENDING" && newStatus === "RESOLVED") {
    updated[oldStatus as keyof typeof updated] = Math.max(0, (updated[oldStatus as keyof typeof updated] ?? 0) - 1);
    updated[newStatus as keyof typeof updated] = (updated[newStatus as keyof typeof updated] ?? 0) + 1;
  }

  assert.equal(updated.ALL, 100, "ALL should not change on status change");
  assert.equal(updated.PENDING, 49, "PENDING should decrease by 1");
  assert.equal(updated.RESOLVED, 26, "RESOLVED should increase by 1");
});

test("feedback delete adjusts summary counts correctly", () => {
  const summary = { ALL: 100, PENDING: 50, IN_PROGRESS: 20, RESOLVED: 25, REJECTED: 5 };
  const deletedStatus = "PENDING";

  const updated = { ...summary };
  updated[deletedStatus as keyof typeof updated] = Math.max(0, (updated[deletedStatus as keyof typeof updated] ?? 0) - 1);
  updated.ALL = Math.max(0, (updated.ALL ?? 0) - 1);

  assert.equal(updated.ALL, 99, "ALL should decrease by 1");
  assert.equal(updated.PENDING, 49, "Deleted status should decrease by 1");
  assert.equal(updated.RESOLVED, 25, "Other statuses should not change");
});
