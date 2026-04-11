import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProgressEventData,
  chooseNextSessionState,
  sessionNeedsCurrentTurnHydration,
  toSessionStateSnapshot,
} from "../src/backend/gameSessionState";

test("session state snapshot preserves authoritative current-turn fields", () => {
  const snapshot = toSessionStateSnapshot({
    id: "session_1",
    mode: "MIXED",
    status: "ACTIVE",
    resumePath: "/game/modes",
    roundCount: 4,
    totalDrinks: 7,
    durationMs: 120000,
    currentPlayerId: "player_2",
    currentQuestionId: "question_9",
    currentQuestionText: "คำถามปัจจุบัน",
    currentQuestionType: "QUESTION",
    currentQuestionLevel: 2,
    currentQuestionIs18Plus: false,
    currentQuestionIsCustom: true,
    currentTurnToken: "turn_active",
    startedAt: new Date("2026-04-11T00:00:00.000Z"),
    endedAt: null,
  });

  assert.equal(snapshot?.resumePath, "/game/modes");
  assert.equal(snapshot?.currentPlayerId, "player_2");
  assert.equal(snapshot?.currentQuestionText, "คำถามปัจจุบัน");
  assert.equal(snapshot?.currentQuestionIsCustom, true);
  assert.equal(snapshot?.currentTurnToken, "turn_active");
});

test("progress event data records round, drinks, and custom question ids", () => {
  const payload = JSON.parse(
    buildProgressEventData({
      customQuestionId: "custom_1",
      roundNumber: 5,
      drinkDelta: 2,
    }),
  ) as {
    customQuestionId?: string;
    roundNumber: number;
    drinkDelta: number;
  };

  assert.equal(payload.roundNumber, 5);
  assert.equal(payload.drinkDelta, 2);
  assert.equal(payload.customQuestionId, "custom_1");
});

test("legacy session with missing current-turn fields rehydrates correctly", async () => {
  const nextState = await chooseNextSessionState(
    {
      gameSession: {
        findUnique: async () => ({
          id: "session_legacy",
          roomId: "room_1",
          mode: "MIXED",
          roundCount: 0,
          room: {
            difficulty: 3,
            is18Plus: false,
            players: [{ id: "player_1" }, { id: "player_2" }],
            questions: [
              {
                id: "custom_1",
                text: "คำถามจากวง",
                type: "QUESTION",
                level: 2,
                is18Plus: false,
              },
            ],
          },
          events: [],
        }),
      },
      question: {
        findFirst: async () => ({
          id: "question_1",
          text: "คำถามหลัก",
          type: "QUESTION",
          level: 2,
          is18Plus: false,
        }),
      },
    } as never,
    "session_legacy",
  );

  assert.equal(
    sessionNeedsCurrentTurnHydration({
      status: "ACTIVE",
      currentPlayerId: null,
      currentQuestionText: null,
      currentQuestionType: null,
      currentTurnToken: null,
    }),
    true,
  );
  assert.equal(nextState.currentPlayerId, "player_1");
  assert.equal(nextState.currentQuestionId, "custom_1");
  assert.equal(nextState.currentQuestionText, "คำถามจากวง");
  assert.equal(nextState.currentQuestionIsCustom, true);
  assert.equal(typeof nextState.currentTurnToken, "string");
  assert.ok((nextState.currentTurnToken ?? "").length > 0);
});

test("missing question inventory falls back to a safe placeholder turn", async () => {
  const nextState = await chooseNextSessionState(
    {
      gameSession: {
        findUnique: async () => ({
          id: "session_empty",
          roomId: "room_1",
          mode: "QUESTION",
          roundCount: 0,
          room: {
            difficulty: 3,
            is18Plus: false,
            players: [{ id: "player_1" }],
            questions: [],
          },
          events: [],
        }),
      },
      question: {
        findFirst: async () => null,
      },
    } as never,
    "session_empty",
  );

  assert.equal(nextState.currentPlayerId, "player_1");
  assert.equal(nextState.currentQuestionId, null);
  assert.equal(nextState.currentQuestionText, "ยังไม่มีคำถามพร้อมใช้งาน");
  assert.equal(nextState.currentQuestionType, "QUESTION");
  assert.equal(typeof nextState.currentTurnToken, "string");
  assert.ok((nextState.currentTurnToken ?? "").length > 0);
});
