import assert from "node:assert/strict";
import test from "node:test";
import { QuestionType } from "@prisma/client";
import { chooseNextSessionState } from "../src/backend/gameSessionState";

type SelectionQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  level: number;
  is18Plus: boolean;
  isActive: boolean;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type CustomQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  level: number;
  is18Plus: boolean;
};

type SelectionConfig = {
  mode: string;
  difficulty?: number;
  is18Plus?: boolean;
  playerIds?: string[];
  questions: SelectionQuestion[];
  customQuestions?: CustomQuestion[];
  usedQuestionIds?: string[];
  currentQuestionId?: string | null;
};

function makeQuestion(
  id: string,
  type: QuestionType,
  overrides: Partial<SelectionQuestion> = {},
): SelectionQuestion {
  return {
    id,
    text: `คำถาม ${id}`,
    type,
    level: 1,
    is18Plus: false,
    isActive: true,
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(Date.UTC(2026, 0, 1)),
    updatedAt: new Date(Date.UTC(2026, 0, 1)),
    ...overrides,
  };
}

function createSelectionDb(config: SelectionConfig) {
  const state = {
    events: [] as Array<{ questionId: string | null; data: string | null }>,
    lastQuestionWhere: undefined as Record<string, unknown> | undefined,
  };

  const matchesWhere = (
    question: SelectionQuestion,
    where: Record<string, unknown> = {},
  ): boolean => {
    if (where.isActive === true && !question.isActive) return false;
    if (where.isPublic === true && !question.isPublic) return false;

    const typeFilter = where.type as string | { in?: string[] } | undefined;
    if (typeof typeFilter === "string" && question.type !== typeFilter) {
      return false;
    }
    if (
      typeFilter &&
      typeof typeFilter === "object" &&
      Array.isArray(typeFilter.in) &&
      !typeFilter.in.includes(question.type)
    ) {
      return false;
    }

    const levelFilter = where.level as { lte?: number } | undefined;
    if (
      levelFilter &&
      typeof levelFilter.lte === "number" &&
      question.level > levelFilter.lte
    ) {
      return false;
    }

    if (where.is18Plus === false && question.is18Plus) return false;

    const idFilter = where.id as { notIn?: string[] } | undefined;
    if (idFilter && Array.isArray(idFilter.notIn)) {
      if (idFilter.notIn.includes(question.id)) return false;
    }

    return true;
  };

  const db = {
    state,
    config,
    gameSession: {
      findUnique: async () => ({
        id: "session_1",
        roomId: "room_1",
        mode: config.mode,
        roundCount: 0,
        currentQuestionId: config.currentQuestionId ?? null,
        room: {
          difficulty: config.difficulty ?? 3,
          is18Plus: config.is18Plus ?? false,
          players: (config.playerIds ?? ["p1", "p2"]).map((id) => ({ id })),
          questions: (config.customQuestions ?? []).map((question) => ({
            ...question,
          })),
        },
      }),
    },
    gameEvent: {
      findMany: async ({
        where,
      }: {
        where?: Record<string, unknown>;
      } = {}) => {
        if (where?.questionId && typeof where.questionId === "object") {
          return (config.usedQuestionIds ?? []).map((id) => ({
            questionId: id,
            data: null,
          }));
        }
        return [];
      },
    },
    question: {
      findFirst: async ({
        where,
      }: {
        where?: Record<string, unknown>;
      } = {}) => {
        state.lastQuestionWhere = where;
        const candidates = config.questions.filter((question) =>
          matchesWhere(question, where),
        );
        candidates.sort(
          (a, b) =>
            a.usageCount - b.usageCount ||
            a.updatedAt.getTime() - b.updatedAt.getTime() ||
            a.createdAt.getTime() - b.createdAt.getTime(),
        );
        return candidates[0] ?? null;
      },
    },
  } as unknown as Parameters<typeof chooseNextSessionState>[0];

  return { db, state };
}

async function pick(
  config: SelectionConfig,
  increment = 0,
): Promise<Awaited<ReturnType<typeof chooseNextSessionState>>> {
  const { db } = createSelectionDb(config);
  return chooseNextSessionState(db, "session_1", increment);
}

test("QUESTION mode never leaks non-QUESTION types even after pool exhaustion", async () => {
  const result = await pick({
    mode: "QUESTION",
    questions: [
      makeQuestion("q1", QuestionType.QUESTION),
      makeQuestion("t1", QuestionType.TRUTH),
      makeQuestion("d1", QuestionType.DARE),
      makeQuestion("c1", QuestionType.CHAOS),
      makeQuestion("v1", QuestionType.VOTE),
    ],
    usedQuestionIds: ["q1"],
  });

  assert.equal(result.currentQuestionId, "q1");
  assert.equal(result.currentQuestionType, QuestionType.QUESTION);
});

test("VOTE mode stays within VOTE after exhaustion", async () => {
  const result = await pick({
    mode: "VOTE",
    questions: [
      makeQuestion("v1", QuestionType.VOTE),
      makeQuestion("q1", QuestionType.QUESTION),
      makeQuestion("t1", QuestionType.TRUTH),
    ],
    usedQuestionIds: ["v1"],
  });

  assert.equal(result.currentQuestionId, "v1");
  assert.equal(result.currentQuestionType, QuestionType.VOTE);
});

test("CHAOS mode stays within CHAOS after exhaustion", async () => {
  const result = await pick({
    mode: "CHAOS",
    questions: [
      makeQuestion("c1", QuestionType.CHAOS),
      makeQuestion("q1", QuestionType.QUESTION),
      makeQuestion("v1", QuestionType.VOTE),
    ],
    usedQuestionIds: ["c1"],
  });

  assert.equal(result.currentQuestionId, "c1");
  assert.equal(result.currentQuestionType, QuestionType.CHAOS);
});

test("TRUTH_OR_DARE recycles only TRUTH or DARE", async () => {
  for (const exhausted of ["t1", "d1"]) {
    const result = await pick({
      mode: "TRUTH_OR_DARE",
      questions: [
        makeQuestion("t1", QuestionType.TRUTH),
        makeQuestion("d1", QuestionType.DARE),
        makeQuestion("q1", QuestionType.QUESTION),
        makeQuestion("c1", QuestionType.CHAOS),
      ],
      usedQuestionIds: ["t1", "d1"],
      currentQuestionId: exhausted,
    });

    assert.ok(
      result.currentQuestionType === QuestionType.TRUTH ||
        result.currentQuestionType === QuestionType.DARE,
    );
  }
});

test("MIXED mode may rotate through all allowed types", async () => {
  const result = await pick({
    mode: "MIXED",
    questions: [makeQuestion("q1", QuestionType.QUESTION)],
  });

  assert.ok(result.currentQuestionId);
});

test("recycle avoids repeating the current question when alternatives exist", async () => {
  const result = await pick({
    mode: "QUESTION",
    questions: [
      makeQuestion("q1", QuestionType.QUESTION),
      makeQuestion("q2", QuestionType.QUESTION),
    ],
    usedQuestionIds: ["q1", "q2"],
    currentQuestionId: "q1",
  });

  assert.equal(result.currentQuestionId, "q2");
});

test("recycle falls back to the only eligible question when unavoidable", async () => {
  const result = await pick({
    mode: "QUESTION",
    questions: [makeQuestion("only", QuestionType.QUESTION)],
    usedQuestionIds: ["only"],
    currentQuestionId: "only",
  });

  assert.equal(result.currentQuestionId, "only");
});

test("recycle respects room difficulty", async () => {
  const result = await pick({
    mode: "QUESTION",
    difficulty: 2,
    questions: [
      makeQuestion("hard", QuestionType.QUESTION, { level: 3 }),
      makeQuestion("easy", QuestionType.QUESTION, { level: 1 }),
    ],
    usedQuestionIds: ["hard", "easy"],
  });

  assert.equal(result.currentQuestionId, "easy");
});

test("recycle respects the 18+ room flag", async () => {
  const result = await pick({
    mode: "QUESTION",
    is18Plus: false,
    questions: [
      makeQuestion("adult", QuestionType.QUESTION, { is18Plus: true }),
      makeQuestion("safe", QuestionType.QUESTION),
    ],
    usedQuestionIds: ["adult", "safe"],
  });

  assert.equal(result.currentQuestionId, "safe");
});

test("custom questions respect mode type fidelity", async () => {
  const result = await pick({
    mode: "QUESTION",
    questions: [],
    customQuestions: [
      {
        id: "cq_dare",
        text: "ภารกิจจากห้อง",
        type: QuestionType.DARE,
        level: 1,
        is18Plus: false,
      },
      {
        id: "cq_question",
        text: "คำถามจากห้อง",
        type: QuestionType.QUESTION,
        level: 1,
        is18Plus: false,
      },
    ],
  });

  assert.equal(result.currentQuestionId, "cq_question");
  assert.equal(result.currentQuestionIsCustom, true);
});

test("custom questions respect difficulty and 18+ filters", async () => {
  const result = await pick({
    mode: "QUESTION",
    difficulty: 1,
    is18Plus: false,
    questions: [makeQuestion("fallback", QuestionType.QUESTION)],
    customQuestions: [
      {
        id: "cq_hard_adult",
        text: "ยากและ 18+",
        type: QuestionType.QUESTION,
        level: 3,
        is18Plus: true,
      },
    ],
  });

  assert.equal(result.currentQuestionIsCustom, false);
  assert.equal(result.currentQuestionId, "fallback");
});

test("empty eligible inventory returns the placeholder without crashing", async () => {
  const result = await pick({
    mode: "QUESTION",
    questions: [],
  });

  assert.equal(result.currentQuestionId, null);
  assert.equal(result.currentQuestionText, "ยังไม่มีคำถามพร้อมใช้งาน");
});

test("legacy persisted difficulty 4/5 normalizes to effective level cap 3", async () => {
  for (const legacyDifficulty of [4, 5]) {
    const config: SelectionConfig = {
      mode: "QUESTION",
      difficulty: legacyDifficulty,
      questions: [
        makeQuestion("q3", QuestionType.QUESTION, { level: 3 }),
        makeQuestion("q2", QuestionType.QUESTION, { level: 2 }),
      ],
      usedQuestionIds: ["q3", "q2"],
      currentQuestionId: "q3",
    };
    const { db, state } = createSelectionDb(config);
    await chooseNextSessionState(db, "session_1", 0);

    const levelFilter = state.lastQuestionWhere?.level as
      | { lte?: number }
      | undefined;

    assert.equal(
      levelFilter?.lte,
      3,
      `room difficulty ${legacyDifficulty} must query with explicit cap 3`,
    );
  }
});
