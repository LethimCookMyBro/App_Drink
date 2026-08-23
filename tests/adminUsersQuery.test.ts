import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_USERS_DEFAULT_LIMIT,
  parseAdminUsersQuery,
} from "../src/backend/adminUsersQuery";

function parse(query: string) {
  return parseAdminUsersQuery(new URLSearchParams(query));
}

test("uses default pagination without params", () => {
  const result = parse("");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.query.q, "");
  assert.equal(result.query.limit, ADMIN_USERS_DEFAULT_LIMIT);
  assert.equal(result.query.offset, 0);
});

test("keeps trimmed server-side search term", () => {
  const result = parse("q=%20somchai%20");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.query.q, "somchai");
});

test("bounds limit and offset", () => {
  const result = parse("limit=99999&offset=-10");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.query.limit, 100);
  assert.equal(result.query.offset, 0);
});

test("accepts explicit page offsets", () => {
  const result = parse("limit=50&offset=50");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.query.limit, 50);
  assert.equal(result.query.offset, 50);
});
