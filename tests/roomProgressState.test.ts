import assert from "node:assert/strict";
import test from "node:test";
import { GameEventType, Prisma, QuestionType } from "@prisma/client";
import { writeAuthoritativeProgress } from "../src/backend/gameSessionState";

type MutablePlayer = {
  id: string;
  drinkCount: number;
  skipCount: number;
  joinedAt: Date;
};

type MutableQuestion = {
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

type MutableEvent = {
  id: string;
  sessionId: string;
  playerId: string;
  questionId: string | null;
  type: GameEventType;
  turnToken: string | null;
  requestId: string | null;
  data: string | null;
};

type MutableSession = {
  id: string;
  roomId: string;
  mode: "QUESTION";
  status: "ACTIVE";
  resumePath: string;
  roundCount: number;
  totalDrinks: number;
  durationMs: number;
  currentPlayerId: string | null;
  currentQuestionId: string | null;
  currentQuestionText: string | null;
  currentQuestionType: QuestionType | null;
  currentQuestionLevel: number | null;
  currentQuestionIs18Plus: boolean;
  currentQuestionIsCustom: boolean;
  currentTurnToken: string | null;
  startedAt: Date;
  endedAt: Date | null;
};

type ProgressState = {
  session: MutableSession;
  players: MutablePlayer[];
  questions: MutableQuestion[];
  events: MutableEvent[];
  simulateConcurrentWinner: boolean;
};

function createUniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("duplicate", {
    code: "P2002",
    clientVersion: "test",
  });
}

function createProgressState(): ProgressState {
  return {
    session: {
      id: "session_1",
      roomId: "room_1",
      mode: "QUESTION",
      status: "ACTIVE",
      resumePath: "/game/play?mode=question",
      roundCount: 0,
      totalDrinks: 0,
      durationMs: 0,
      currentPlayerId: "player_1",
      currentQuestionId: "question_1",
      currentQuestionText: "คำถามแรก",
      currentQuestionType: QuestionType.QUESTION,
      currentQuestionLevel: 2,
      currentQuestionIs18Plus: false,
      currentQuestionIsCustom: false,
      currentTurnToken: "turn_1",
      startedAt: new Date("2026-04-11T00:00:00.000Z"),
      endedAt: null,
    },
    players: [
      {
        id: "player_1",
        drinkCount: 0,
        skipCount: 0,
        joinedAt: new Date("2026-04-11T00:00:00.000Z"),
      },
      {
        id: "player_2",
        drinkCount: 0,
        skipCount: 0,
        joinedAt: new Date("2026-04-11T00:00:01.000Z"),
      },
    ],
    questions: [
      {
        id: "question_1",
        text: "คำถามแรก",
        type: QuestionType.QUESTION,
        level: 2,
        is18Plus: false,
        isActive: true,
        isPublic: true,
        usageCount: 0,
        createdAt: new Date("2026-04-11T00:00:00.000Z"),
        updatedAt: new Date("2026-04-11T00:00:00.000Z"),
      },
      {
        id: "question_2",
        text: "คำถามถัดไป",
        type: QuestionType.QUESTION,
        level: 2,
        is18Plus: false,
        isActive: true,
        isPublic: true,
        usageCount: 0,
        createdAt: new Date("2026-04-11T00:00:02.000Z"),
        updatedAt: new Date("2026-04-11T00:00:02.000Z"),
      },
    ],
    events: [],
    simulateConcurrentWinner: false,
  };
}

function advanceSessionToNextTurn(state: ProgressState, drinkDelta: number): void {
  state.session.roundCount += 1;
  state.session.totalDrinks += drinkDelta;
  state.session.currentPlayerId = "player_2";
  state.session.currentQuestionId = "question_2";
  state.session.currentQuestionText = "คำถามถัดไป";
  state.session.currentQuestionType = QuestionType.QUESTION;
  state.session.currentQuestionLevel = 2;
  state.session.currentQuestionIs18Plus = false;
  state.session.currentQuestionIsCustom = false;
  state.session.currentTurnToken = "turn_2";
}

function matchesQuestionWhere(
  question: MutableQuestion,
  where: Record<string, unknown> | undefined,
): boolean {
  if (!where) {
    return true;
  }

  if (where.isActive === true && !question.isActive) {
    return false;
  }

  if (where.isPublic === true && !question.isPublic) {
    return false;
  }

  if (
    typeof where.type === "string" &&
    question.type !== where.type
  ) {
    return false;
  }

  const levelFilter = where.level as { lte?: unknown } | undefined;
  if (
    typeof levelFilter?.lte === "number" &&
    question.level > levelFilter.lte
  ) {
    return false;
  }

  if (where.is18Plus === false && question.is18Plus) {
    return false;
  }

  const idFilter = where.id as { notIn?: unknown } | undefined;
  if (
    Array.isArray(idFilter?.notIn) &&
    idFilter.notIn.includes(question.id)
  ) {
    return false;
  }

  return true;
}

function createProgressDb(state = createProgressState()) {
  return {
    state,
    db: {
      gameSession: {
        findFirst: async ({
          where,
        }: {
          where?: { id?: string; roomId?: string };
        }) => {
          if (
            where?.id &&
            where.id !== state.session.id
          ) {
            return null;
          }

          if (
            where?.roomId &&
            where.roomId !== state.session.roomId
          ) {
            return null;
          }

          return { ...state.session };
        },
        findUnique: async () => ({
          ...state.session,
          room: {
            difficulty: 3,
            is18Plus: false,
            players: state.players.map((player) => ({ id: player.id })),
            questions: [],
          },
          events: state.events.map((event) => ({
            questionId: event.questionId,
            data: event.data,
          })),
        }),
        update: async ({
          data,
        }: {
          data: Record<string, unknown>;
        }) => {
          const nextRound = data.roundCount as { increment?: number } | undefined;
          const nextDrinks = data.totalDrinks as { increment?: number } | undefined;

          state.session.roundCount += nextRound?.increment ?? 0;
          state.session.totalDrinks += nextDrinks?.increment ?? 0;
          state.session.durationMs =
            typeof data.durationMs === "number"
              ? data.durationMs
              : state.session.durationMs;
          state.session.currentPlayerId =
            (data.currentPlayerId as string | null | undefined) ??
            state.session.currentPlayerId;
          state.session.currentQuestionId =
            (data.currentQuestionId as string | null | undefined) ??
            state.session.currentQuestionId;
          state.session.currentQuestionText =
            (data.currentQuestionText as string | null | undefined) ??
            state.session.currentQuestionText;
          state.session.currentQuestionType =
            (data.currentQuestionType as QuestionType | null | undefined) ??
            state.session.currentQuestionType;
          state.session.currentQuestionLevel =
            (data.currentQuestionLevel as number | null | undefined) ??
            state.session.currentQuestionLevel;
          state.session.currentQuestionIs18Plus =
            typeof data.currentQuestionIs18Plus === "boolean"
              ? data.currentQuestionIs18Plus
              : state.session.currentQuestionIs18Plus;
          state.session.currentQuestionIsCustom =
            typeof data.currentQuestionIsCustom === "boolean"
              ? data.currentQuestionIsCustom
              : state.session.currentQuestionIsCustom;
          state.session.currentTurnToken =
            (data.currentTurnToken as string | null | undefined) ??
            state.session.currentTurnToken;

          return { ...state.session };
        },
      },
      gameEvent: {
        findFirst: async ({
          where,
        }: {
          where?: { sessionId?: string; requestId?: string | null };
        }) =>
          state.events.find(
            (event) =>
              (!where?.sessionId || event.sessionId === where.sessionId) &&
              (!where?.requestId || event.requestId === where.requestId),
          ) ?? null,
        create: async ({
          data,
        }: {
          data: {
            sessionId: string;
            playerId: string;
            questionId: string | null;
            type: GameEventType;
            turnToken?: string | null;
            requestId?: string | null;
            data?: string | null;
          };
        }) => {
          if (state.simulateConcurrentWinner) {
            state.simulateConcurrentWinner = false;
            state.events.push({
              id: "event_winner",
              sessionId: data.sessionId,
              playerId: data.playerId,
              questionId: data.questionId,
              type: data.type,
              turnToken: data.turnToken ?? null,
              requestId: "other_request",
              data: data.data ?? null,
            });
            advanceSessionToNextTurn(state, 0);
            throw createUniqueConstraintError();
          }

          const hasSameTurn = state.events.some(
            (event) =>
              event.sessionId === data.sessionId &&
              event.turnToken &&
              event.turnToken === (data.turnToken ?? null),
          );
          const hasSameRequest = state.events.some(
            (event) =>
              event.sessionId === data.sessionId &&
              event.requestId &&
              event.requestId === (data.requestId ?? null),
          );

          if (hasSameTurn || hasSameRequest) {
            throw createUniqueConstraintError();
          }

          const event: MutableEvent = {
            id: `event_${state.events.length + 1}`,
            sessionId: data.sessionId,
            playerId: data.playerId,
            questionId: data.questionId,
            type: data.type,
            turnToken: data.turnToken ?? null,
            requestId: data.requestId ?? null,
            data: data.data ?? null,
          };
          state.events.push(event);
          return event;
        },
      },
      question: {
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { usageCount?: { increment?: number } };
        }) => {
          const question = state.questions.find((entry) => entry.id === where.id);
          assert.ok(question);
          question.usageCount += data.usageCount?.increment ?? 0;
          return question;
        },
        findFirst: async ({
          where,
        }: {
          where?: Record<string, unknown>;
        }) =>
          state.questions.find((question) =>
            matchesQuestionWhere(question, where),
          ) ?? null,
      },
      player: {
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            drinkCount?: { increment?: number };
            skipCount?: { increment?: number };
          };
        }) => {
          const player = state.players.find((entry) => entry.id === where.id);
          assert.ok(player);
          player.drinkCount += data.drinkCount?.increment ?? 0;
          player.skipCount += data.skipCount?.increment ?? 0;
          return player;
        },
      },
    } as unknown as Parameters<typeof writeAuthoritativeProgress>[0],
  };
}

test("duplicate submit reuses the first authoritative write", async () => {
  const { db, state } = createProgressDb();

  const first = await writeAuthoritativeProgress(db, {
    roomId: "room_1",
    sessionId: "session_1",
    action: GameEventType.ANSWERED,
    drinkDelta: 0,
    turnToken: "turn_1",
    requestId: "request_1",
  });
  const second = await writeAuthoritativeProgress(db, {
    roomId: "room_1",
    sessionId: "session_1",
    action: GameEventType.ANSWERED,
    drinkDelta: 0,
    turnToken: "turn_1",
    requestId: "request_1",
  });

  assert.equal(first.kind, "updated");
  assert.equal(second.kind, "duplicate");
  assert.equal(state.events.length, 1);
  assert.equal(state.session.roundCount, 1);
  assert.equal(state.session.currentPlayerId, "player_2");
});

test("rapid double click with a stale turn token is rejected safely", async () => {
  const { db, state } = createProgressDb();

  const first = await writeAuthoritativeProgress(db, {
    roomId: "room_1",
    sessionId: "session_1",
    action: GameEventType.SKIPPED,
    drinkDelta: 1,
    turnToken: "turn_1",
    requestId: "request_1",
  });
  const second = await writeAuthoritativeProgress(db, {
    roomId: "room_1",
    sessionId: "session_1",
    action: GameEventType.SKIPPED,
    drinkDelta: 1,
    turnToken: "turn_1",
    requestId: "request_2",
  });

  assert.equal(first.kind, "updated");
  assert.equal(second.kind, "stale");
  assert.equal(state.events.length, 1);
  assert.equal(state.players[0]?.drinkCount, 1);
  assert.equal(state.players[0]?.skipCount, 1);
  assert.notEqual(second.session.currentTurnToken, "turn_1");
  assert.equal(typeof second.session.currentTurnToken, "string");
  assert.ok((second.session.currentTurnToken ?? "").length > 0);
});

test("concurrent same-turn writes collapse to a single authoritative outcome", async () => {
  const { db, state } = createProgressDb();
  state.simulateConcurrentWinner = true;

  const result = await writeAuthoritativeProgress(db, {
    roomId: "room_1",
    sessionId: "session_1",
    action: GameEventType.ANSWERED,
    drinkDelta: 0,
    turnToken: "turn_1",
    requestId: "request_concurrent",
  });

  assert.equal(result.kind, "stale");
  assert.equal(state.events.length, 1);
  assert.equal(result.session.roundCount, 1);
  assert.equal(result.session.currentPlayerId, "player_2");
  assert.equal(result.session.currentTurnToken, "turn_2");
});

test("stale client requests cannot mutate the authoritative turn twice", async () => {
  const { db, state } = createProgressDb();
  advanceSessionToNextTurn(state, 0);

  const result = await writeAuthoritativeProgress(db, {
    roomId: "room_1",
    sessionId: "session_1",
    action: GameEventType.ANSWERED,
    drinkDelta: 0,
    turnToken: "turn_1",
    requestId: "request_stale",
  });

  assert.equal(result.kind, "stale");
  assert.equal(state.events.length, 0);
  assert.equal(result.session.currentPlayerId, "player_2");
  assert.equal(result.session.currentTurnToken, "turn_2");
});
