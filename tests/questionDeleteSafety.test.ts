import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePermanentDeleteEligibility,
  type QuestionDeleteReferenceCounts,
} from "../src/backend/questionDeleteSafety";

function counts(
  overrides: Partial<QuestionDeleteReferenceCounts> = {},
): QuestionDeleteReferenceCounts {
  return {
    gameEventReferences: 0,
    activeSessionReferences: 0,
    completedSessionReferences: 0,
    ...overrides,
  };
}

test("allows permanent delete when no references exist", () => {
  const result = evaluatePermanentDeleteEligibility(counts());
  assert.equal(result.allowed, true);
});

test("rejects when any historical GameEvent references the question", () => {
  const result = evaluatePermanentDeleteEligibility(
    counts({ gameEventReferences: 1 }),
  );
  assert.equal(result.allowed, false);
  if (result.allowed) return;
  assert.equal(result.code, "QUESTION_HAS_HISTORY");
  assert.match(result.message, /ประวัติ/);
  assert.equal(result.counts.gameEventReferences, 1);
});

test("rejects when an active GameSession references the question", () => {
  const result = evaluatePermanentDeleteEligibility(
    counts({ activeSessionReferences: 2 }),
  );
  assert.equal(result.allowed, false);
  if (result.allowed) return;
  assert.equal(result.code, "QUESTION_IN_ACTIVE_SESSION");
  assert.match(result.message, /กำลัง|ใช้งานอยู่/);
  assert.equal(result.counts.activeSessionReferences, 2);
});

test("rejects when a completed session still snapshots the question", () => {
  const result = evaluatePermanentDeleteEligibility(
    counts({ completedSessionReferences: 4 }),
  );
  assert.equal(result.allowed, false);
  if (result.allowed) return;
  assert.equal(result.code, "QUESTION_HAS_HISTORY");
  assert.equal(result.counts.completedSessionReferences, 4);
});

test("rejects when multiple reference kinds are present", () => {
  const result = evaluatePermanentDeleteEligibility(
    counts({
      gameEventReferences: 3,
      activeSessionReferences: 1,
      completedSessionReferences: 0,
    }),
  );
  assert.equal(result.allowed, false);
  if (result.allowed) return;
  // Active session takes priority in the message so the operator knows
  // a live game would break if the row were destroyed.
  assert.equal(result.code, "QUESTION_IN_ACTIVE_SESSION");
  assert.deepEqual(result.counts, {
    gameEventReferences: 3,
    activeSessionReferences: 1,
    completedSessionReferences: 0,
  });
});

test("never reports allowed when any reference count is non-zero", () => {
  const one = counts({ gameEventReferences: 1 });
  const two = counts({ activeSessionReferences: 1 });
  const three = counts({ completedSessionReferences: 1 });
  for (const input of [one, two, three]) {
    const result = evaluatePermanentDeleteEligibility(input);
    assert.equal(
      result.allowed,
      false,
      `expected rejection for ${JSON.stringify(input)}`,
    );
  }
});
