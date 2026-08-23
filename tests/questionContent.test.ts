import assert from "node:assert/strict";
import test from "node:test";
import type { QuestionType } from "@prisma/client";
import {
  QUESTIONS,
  RETIRED_QUESTION_TEXTS,
} from "../prisma/questionData";

const VALID_TYPES: QuestionType[] = [
  "QUESTION",
  "TRUTH",
  "DARE",
  "VOTE",
  "CHAOS",
];

const BANNED_CONTENT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /แฟนเก่า/, reason: "ติดต่อแฟนเก่าเพื่อหลอก/ก่อกวน" },
  { pattern: /ปลดล็อค(มือถือ|โทรศัพท์)/, reason: "บังคับเปิดอุปกรณ์ส่วนตัว" },
  { pattern: /(ให้เพื่อน|ให้คนอื่น).*(ดู|เลือน|ลู่)(มือถือ|โทรศัพท์|แชท|ข้อความ)/, reason: "บังคับเปิดข้อความส่วนตัว" },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, "")
    .replace(/[?!.,"'`~\-_/\\(){}[\]:;]/g, "")
    .replace(/โหวต:/g, "");
}

test("seed content has no normalized duplicate questions", () => {
  const seen = new Map<string, string>();

  for (const question of QUESTIONS) {
    const key = `${normalizeText(question.text)}::${question.type}`;
    const previous = seen.get(key);
    assert.ok(
      !previous,
      `duplicate question detected:\n  "${previous}"\n  "${question.text}"`,
    );
    seen.set(key, question.text);
  }
});

test("seed content uses valid types and levels", () => {
  for (const question of QUESTIONS) {
    assert.ok(
      VALID_TYPES.includes(question.type),
      `"${question.text}" has invalid type ${question.type}`,
    );
    assert.ok(
      Number.isInteger(question.level) && question.level >= 1 && question.level <= 3,
      `"${question.text}" has invalid level ${question.level}`,
    );
  }
});

test("level and 18+ rating are independent dimensions", () => {
  const level3Clean = QUESTIONS.filter(
    (question) => question.level === 3 && !question.is18Plus,
  );
  const level2Adult = QUESTIONS.filter(
    (question) => question.level === 2 && question.is18Plus,
  );

  assert.ok(
    level3Clean.length >= 1,
    "inventory must include a level-3 non-18+ question",
  );
  assert.ok(
    level2Adult.length >= 1,
    "inventory must include a level-2 18+ question",
  );
});

test("seed content contains no banned unsafe dares", () => {
  for (const question of QUESTIONS) {
    for (const { pattern, reason } of BANNED_CONTENT_PATTERNS) {
      assert.doesNotMatch(
        question.text,
        pattern,
        `"${question.text}" violates safety rule: ${reason}`,
      );
    }
  }
});

test("retired unsafe questions are tracked for deactivation", () => {
  assert.ok(RETIRED_QUESTION_TEXTS.length >= 2);

  for (const retiredText of RETIRED_QUESTION_TEXTS) {
    assert.ok(
      !QUESTIONS.some((question) => question.text === retiredText),
      `"${retiredText}" is retired but still present in seed data`,
    );
  }
});

test("every mode has practical coverage for a 15-20 round session", () => {
  const countByType = new Map<string, number>();
  for (const question of QUESTIONS) {
    countByType.set(question.type, (countByType.get(question.type) ?? 0) + 1);
  }

  const minimums: Record<string, number> = {
    QUESTION: 15,
    TRUTH: 8,
    DARE: 8,
    VOTE: 8,
    CHAOS: 6,
  };

  for (const [type, minimum] of Object.entries(minimums)) {
    const count = countByType.get(type) ?? 0;
    assert.ok(
      count >= minimum,
      `${type} inventory too thin: ${count} < ${minimum}`,
    );
  }
});

test("non-18+ pool alone can sustain an all-ages session", () => {
  const allAges = QUESTIONS.filter((question) => !question.is18Plus);
  assert.ok(allAges.length >= 30, "all-ages pool too small");
});
