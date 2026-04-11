import assert from "node:assert/strict";
import test from "node:test";
import { toRoomSummary } from "../src/backend/apiFilter";

test("room summary exposes active session state when selected", () => {
  const startedAt = new Date("2026-04-11T00:00:00.000Z");
  const room = toRoomSummary({
    code: "ABCD",
    name: "Test Room",
    maxPlayers: 8,
    isActive: true,
    players: [
      {
        id: "player_1",
        name: "Host",
        isHost: true,
        isReady: true,
      },
    ],
    sessions: [
      {
        id: "session_1",
        mode: "MIXED",
        status: "ACTIVE",
        resumePath: "/game/modes",
        roundCount: 3,
        totalDrinks: 4,
        currentPlayerId: "player_1",
        currentQuestionId: "question_1",
        currentQuestionText: "ถามจริงหรือกล้า?",
        currentQuestionType: "TRUTH",
        currentQuestionLevel: 2,
        currentQuestionIs18Plus: false,
        currentQuestionIsCustom: false,
        currentTurnToken: "turn_1",
        startedAt,
        endedAt: null,
      },
    ],
  });

  assert.equal(room.activeSession?.id, "session_1");
  assert.equal(room.activeSession?.resumePath, "/game/modes");
  assert.equal(room.activeSession?.roundCount, 3);
  assert.equal(room.activeSession?.totalDrinks, 4);
  assert.equal(room.activeSession?.currentPlayerId, "player_1");
  assert.equal(room.activeSession?.currentQuestionText, "ถามจริงหรือกล้า?");
  assert.equal(room.activeSession?.currentTurnToken, "turn_1");
});

test("room summary only exposes custom questions for the active session", () => {
  const room = toRoomSummary({
    code: "WXYZ",
    name: "Active Room",
    maxPlayers: 6,
    players: [
      {
        id: "player_1",
        name: "Host",
        isHost: true,
        isReady: true,
      },
    ],
    questions: [
      {
        id: "custom_pending",
        sessionId: null,
        text: "pending",
        type: "QUESTION",
        level: 2,
        is18Plus: false,
      },
      {
        id: "custom_active",
        sessionId: "session_active",
        text: "active",
        type: "QUESTION",
        level: 2,
        is18Plus: false,
      },
    ],
    sessions: [
      {
        id: "session_active",
        mode: "MIXED",
        status: "ACTIVE",
        resumePath: "/game/play?mode=question",
        roundCount: 1,
        totalDrinks: 0,
        currentPlayerId: "player_1",
        currentQuestionId: "custom_active",
        currentQuestionText: "active",
        currentQuestionType: "QUESTION",
        currentQuestionLevel: 2,
        currentQuestionIs18Plus: false,
        currentQuestionIsCustom: true,
        currentTurnToken: "turn_active",
        startedAt: new Date("2026-04-11T00:00:00.000Z"),
        endedAt: null,
      },
    ],
  });

  assert.equal(room.customQuestions?.length, 1);
  assert.equal(room.customQuestions?.[0]?.id, "custom_active");
});
