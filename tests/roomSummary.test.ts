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
        roundCount: 3,
        totalDrinks: 4,
        startedAt,
        endedAt: null,
      },
    ],
  });

  assert.equal(room.activeSession?.id, "session_1");
  assert.equal(room.activeSession?.roundCount, 3);
  assert.equal(room.activeSession?.totalDrinks, 4);
});
