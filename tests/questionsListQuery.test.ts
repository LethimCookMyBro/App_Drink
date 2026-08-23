import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuestionsListOrderBy,
  buildQuestionsListWhere,
  parseQuestionsListQuery,
  QUESTION_LIST_MAX_LIMIT,
} from "../src/backend/questionsListQuery";

function parse(query: string) {
  return parseQuestionsListQuery(new URLSearchParams(query));
}

test("defaults to active questions ordered by newest", () => {
  const result = parse("");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.query.q, "");
  assert.equal(result.query.type, null);
  assert.equal(result.query.level, null);
  assert.equal(result.query.is18Plus, null);
  assert.equal(result.query.status, "active");
  assert.equal(result.query.sort, "newest");
  assert.equal(result.query.limit, 50);

  const where = buildQuestionsListWhere(result.query);
  assert.deepEqual(where, { isActive: true });
});

test("builds independent dimension filters", () => {
  const result = parse("q=เพื่อน&type=DARE&level=3&is18Plus=true&status=all");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.query.q, "เพื่อน");
  assert.equal(result.query.type, "DARE");
  assert.equal(result.query.level, 3);
  assert.equal(result.query.is18Plus, true);
  assert.equal(result.query.status, "all");

  const where = buildQuestionsListWhere(result.query);
  assert.deepEqual(where, {
    type: "DARE",
    level: 3,
    is18Plus: true,
    text: { contains: "เพื่อน", mode: "insensitive" },
  });
});

test("level filter matches exactly instead of a range", () => {
  const result = parse("level=2");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(buildQuestionsListWhere(result.query).level, 2);
});

test("status inactive filters to deactivated rows", () => {
  const result = parse("status=inactive");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(buildQuestionsListWhere(result.query), { isActive: false });
});

test("legacy includeInactive=true maps to status all", () => {
  const result = parse("includeInactive=true");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.query.status, "all");
  const where = buildQuestionsListWhere(result.query);
  assert.equal("isActive" in where, false);
});

test("rejects invalid type, level, rating, status and sort", () => {
  assert.equal(parse("type=NOT_A_TYPE").ok, false);
  assert.equal(parse("level=9").ok, false);
  assert.equal(parse("is18Plus=yes").ok, false);
  assert.equal(parse("status=sometimes").ok, false);
  assert.equal(parse("sort=random").ok, false);
});

test("bounds limit and offset", () => {
  const capped = parse(`limit=${QUESTION_LIST_MAX_LIMIT + 500}&offset=-5`);
  assert.equal(capped.ok, true);
  if (!capped.ok) return;
  assert.equal(capped.query.limit, QUESTION_LIST_MAX_LIMIT);
  assert.equal(capped.query.offset, 0);
});

test("trims search input and supports usage sort", () => {
  const result = parse("q=%20สาว%20&sort=usage");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.query.q, "สาว");
  assert.deepEqual(buildQuestionsListOrderBy(result.query.sort)[0], {
    usageCount: "desc",
  });
});
