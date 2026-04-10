import assert from "node:assert/strict";
import test from "node:test";
import { hasAdminRole, normalizeAdminRole } from "../src/shared/adminRoles";

test("normalizes known admin roles only", () => {
  assert.equal(normalizeAdminRole("MODERATOR"), "MODERATOR");
  assert.equal(normalizeAdminRole("ADMIN"), "ADMIN");
  assert.equal(normalizeAdminRole("SUPER_ADMIN"), "SUPER_ADMIN");
  assert.equal(normalizeAdminRole("UNKNOWN"), null);
});

test("enforces admin role hierarchy", () => {
  assert.equal(hasAdminRole("MODERATOR", "MODERATOR"), true);
  assert.equal(hasAdminRole("ADMIN", "MODERATOR"), true);
  assert.equal(hasAdminRole("SUPER_ADMIN", "ADMIN"), true);
  assert.equal(hasAdminRole("MODERATOR", "ADMIN"), false);
  assert.equal(hasAdminRole(null, "MODERATOR"), false);
});
