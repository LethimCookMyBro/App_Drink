import assert from "node:assert/strict";
import test from "node:test";
import { resolveDeletePolicy } from "../src/backend/questionDeletePolicy";

test("permanent=true rejects with PERMANENT_DELETE_DISABLED", () => {
  const result = resolveDeletePolicy(true);
  assert.equal(result.action, "reject");
  if (result.action !== "reject") return;
  assert.equal(result.code, "PERMANENT_DELETE_DISABLED");
  assert.match(result.reason, /ปิดการลบถาวร/);
  assert.match(result.reason, /ปิดใช้งานคำถามแทน/);
});

test("permanent=true never allows physical delete", () => {
  const result = resolveDeletePolicy(true);
  assert.notEqual(result.action, "deactivate");
  assert.equal(result.action, "reject");
});

test("permanent=false (normal delete) deactivates without physical delete", () => {
  const result = resolveDeletePolicy(false);
  assert.equal(result.action, "deactivate");
});

test("normal delete never references physical deletion", () => {
  const result = resolveDeletePolicy(false);
  assert.equal("code" in result, false);
  assert.equal("reason" in result, false);
});

test("all permanent=true inputs are rejected regardless of other state", () => {
  const cases = [true, Boolean(1), Boolean("true")];
  for (const input of cases) {
    const result = resolveDeletePolicy(input);
    assert.equal(result.action, "reject", `expected reject for ${input}`);
    if (result.action !== "reject") continue;
    assert.equal(result.code, "PERMANENT_DELETE_DISABLED");
  }
});

test("all permanent=false inputs deactivate", () => {
  const cases = [false, Boolean(0), Boolean(null), Boolean(undefined)];
  for (const input of cases) {
    const result = resolveDeletePolicy(input);
    assert.equal(result.action, "deactivate", `expected deactivate for ${input}`);
  }
});
