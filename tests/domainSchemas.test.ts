import assert from "node:assert/strict";
import test from "node:test";
import { createRoomSchema } from "../src/shared/schemas";

test("room difficulty domain is normalized to 1..3", () => {
  for (const value of [1, 2, 3]) {
    const parsed = createRoomSchema.safeParse({ hostName: "Host", difficulty: value });
    assert.equal(parsed.success, true, `difficulty ${value} must be accepted`);
  }

  for (const value of [0, 4, 5, -1]) {
    const parsed = createRoomSchema.safeParse({ hostName: "Host", difficulty: value });
    assert.equal(parsed.success, false, `difficulty ${value} must be rejected`);
  }
});

test("create API rejects difficulty 4/5 before persistence (HTTP 400 path)", () => {
  // rooms/route.ts returns jsonError(...,400) when safeParse fails;
  // no clamp exists on the create payload anymore.
  assert.equal(
    createRoomSchema.safeParse({ hostName: "Host", difficulty: 4 }).success,
    false,
  );
  assert.equal(
    createRoomSchema.safeParse({ hostName: "Host", difficulty: 5 }).success,
    false,
  );
});
