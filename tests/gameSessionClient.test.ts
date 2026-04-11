import assert from "node:assert/strict";
import test from "node:test";
import {
  completeStoredGameSession,
  fetchRoomGameSnapshot,
  GAME_SESSION_KEYS,
  markGameSessionStarted,
  recordCompletedGameRound,
  refreshStoredActiveGameSession,
  tryRecordCompletedGameRound,
} from "../src/frontend/game/gameSession";

type MockResponse = {
  ok: boolean;
  status?: number;
  body: unknown;
};

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? (this.values.get(key) ?? null) : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

function createRoomPayload(input?: {
  customQuestions?: Array<{
    id: string;
    sessionId: string | null;
    text: string;
    type: string;
    level: number;
    is18Plus: boolean;
  }>;
  session?: Partial<{
    id: string;
    mode: string;
    status: string;
    resumePath: string | null;
    roundCount: number;
    totalDrinks: number;
    currentPlayerId: string | null;
    currentQuestionId: string | null;
    currentQuestionText: string | null;
    currentQuestionType: string | null;
    currentQuestionLevel: number | null;
    currentQuestionIs18Plus: boolean;
    currentQuestionIsCustom: boolean;
    currentTurnToken: string | null;
    startedAt: string;
    endedAt: string | null;
  }>;
}) {
  const activeSession = {
    id: "session_active",
    mode: "MIXED",
    status: "ACTIVE",
    resumePath: "/game/modes",
    roundCount: 3,
    totalDrinks: 4,
    currentPlayerId: "player_1",
    currentQuestionId: "question_1",
    currentQuestionText: "คำถามแรก",
    currentQuestionType: "QUESTION",
    currentQuestionLevel: 2,
    currentQuestionIs18Plus: false,
    currentQuestionIsCustom: false,
    currentTurnToken: "turn_1",
    startedAt: "2026-04-11T00:00:00.000Z",
    endedAt: null,
    ...input?.session,
  };

  return {
    room: {
      code: "ABCD",
      name: "Test Room",
      maxPlayers: 8,
      difficulty: 3,
      is18Plus: false,
      players: [
        {
          id: "player_1",
          name: "Host",
          isHost: true,
          isReady: true,
          drinkCount: 1,
          skipCount: 0,
        },
        {
          id: "player_2",
          name: "Guest",
          isHost: false,
          isReady: true,
          drinkCount: 2,
          skipCount: 1,
        },
      ],
      customQuestions: input?.customQuestions ?? [],
      activeSession,
    },
    activeSession,
    canManageLobby: true,
  };
}

function setupBrowserEnv() {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const storage = new MemoryStorage();
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const previousEvent = globalThis.Event;

  if (typeof previousEvent === "undefined") {
    globalThis.Event = class Event {
      type: string;

      constructor(type: string) {
        this.type = type;
      }
    } as typeof Event;
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      localStorage: storage,
      addEventListener(type: string, listener: (event: Event) => void) {
        const typedListeners = listeners.get(type) ?? new Set();
        typedListeners.add(listener);
        listeners.set(type, typedListeners);
      },
      removeEventListener(type: string, listener: (event: Event) => void) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((listener) => listener(event));
        return true;
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
    },
  });

  return {
    storage,
    restore() {
      if (typeof previousWindow === "undefined") {
        delete (globalThis as { window?: Window }).window;
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          writable: true,
          value: previousWindow,
        });
      }

      if (typeof previousFetch === "undefined") {
        delete (globalThis as { fetch?: typeof fetch }).fetch;
      } else {
        globalThis.fetch = previousFetch;
      }

      if (typeof previousEvent === "undefined") {
        delete (globalThis as { Event?: typeof Event }).Event;
      } else {
        globalThis.Event = previousEvent;
      }
    },
  };
}

function mockFetchSequence(responses: readonly MockResponse[]) {
  const requests: Array<{
    url: string;
    method: string;
    body?: string;
  }> = [];
  let index = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = responses[index++];
    assert.ok(response, `Unexpected fetch call for ${String(input)}`);

    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    requests.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: async () => response.body,
    } as Response;
  }) as typeof fetch;

  return requests;
}

test("refresh resumes current turn from server state", async () => {
  const browser = setupBrowserEnv();

  try {
    markGameSessionStarted("ABCD", "/game/modes", "session_active");
    const payload = createRoomPayload({
      session: {
        resumePath: "/game/play?mode=vote",
        currentPlayerId: "player_2",
        currentQuestionId: "question_9",
        currentQuestionText: "ใครโดนโหวตมากสุด?",
        currentQuestionType: "VOTE",
      },
    });

    mockFetchSequence([
      { ok: true, body: payload },
      { ok: true, body: payload },
    ]);

    const room = await fetchRoomGameSnapshot("ABCD", "session_active");
    const snapshot = await refreshStoredActiveGameSession();

    assert.equal(room?.activeSession?.currentPlayerId, "player_2");
    assert.equal(room?.activeSession?.currentQuestionText, "ใครโดนโหวตมากสุด?");
    assert.deepEqual(snapshot, {
      isActive: true,
      roomCode: "ABCD",
      sessionId: "session_active",
      players: ["Host", "Guest"],
      playerCount: 2,
      resumePath: "/game/play?mode=vote",
    });
    assert.equal(
      browser.storage.getItem(GAME_SESSION_KEYS.resumePath),
      "/game/play?mode=vote",
    );
  } finally {
    browser.restore();
  }
});

test("custom room questions persist across refresh", async () => {
  const browser = setupBrowserEnv();

  try {
    const payload = createRoomPayload({
      customQuestions: [
        {
          id: "custom_1",
          sessionId: "session_active",
          text: "คำถามวงเอง",
          type: "QUESTION",
          level: 2,
          is18Plus: false,
        },
      ],
    });

    mockFetchSequence([
      { ok: true, body: payload },
      { ok: true, body: payload },
    ]);

    const first = await fetchRoomGameSnapshot("ABCD");
    const second = await fetchRoomGameSnapshot("ABCD");

    assert.deepEqual(first?.customQuestions, second?.customQuestions);
    assert.equal(second?.customQuestions[0]?.id, "custom_1");
    assert.equal(second?.customQuestions[0]?.text, "คำถามวงเอง");
  } finally {
    browser.restore();
  }
});

test("second client sees updated current turn after polling refresh", async () => {
  const browser = setupBrowserEnv();

  try {
    mockFetchSequence([
      {
        ok: true,
        body: createRoomPayload({
          session: {
            currentPlayerId: "player_1",
            currentQuestionId: "question_1",
            currentQuestionText: "คำถามแรก",
          },
        }),
      },
      {
        ok: true,
        body: createRoomPayload({
          session: {
            roundCount: 4,
            totalDrinks: 5,
            currentPlayerId: "player_2",
            currentQuestionId: "question_2",
            currentQuestionText: "คำถามถัดไป",
            currentTurnToken: "turn_2",
          },
        }),
      },
    ]);

    const first = await fetchRoomGameSnapshot("ABCD", "session_active");
    const second = await fetchRoomGameSnapshot("ABCD", "session_active");

    assert.equal(first?.activeSession?.currentPlayerId, "player_1");
    assert.equal(second?.activeSession?.currentPlayerId, "player_2");
    assert.equal(second?.activeSession?.currentQuestionText, "คำถามถัดไป");
    assert.equal(second?.activeSession?.roundCount, 4);
    assert.equal(second?.activeSession?.currentTurnToken, "turn_2");
  } finally {
    browser.restore();
  }
});

test("progress request includes the authoritative turn token and request id", async () => {
  const browser = setupBrowserEnv();

  try {
    markGameSessionStarted("ABCD", "/game/modes", "session_active");
    const requests = mockFetchSequence([
      {
        ok: true,
        body: {
          success: true,
          outcome: "applied",
          session: {
            roundCount: 4,
            totalDrinks: 5,
          },
        },
      },
    ]);

    const result = await recordCompletedGameRound("ANSWERED", 0, "turn_1");
    const requestBody = JSON.parse(requests[0]?.body ?? "{}") as Record<string, unknown>;

    assert.equal(requests[0]?.url, "/api/rooms/ABCD/progress");
    assert.equal(requestBody.sessionId, "session_active");
    assert.equal(requestBody.turnToken, "turn_1");
    assert.equal(typeof requestBody.requestId, "string");
    assert.ok(String(requestBody.requestId).length >= 10);
    assert.equal(result.outcome, "applied");
  } finally {
    browser.restore();
  }
});

test("retries of the same client action reuse the same request id", async () => {
  const browser = setupBrowserEnv();

  try {
    markGameSessionStarted("ABCD", "/game/modes", "session_active");
    const requests = mockFetchSequence([
      {
        ok: false,
        status: 500,
        body: {
          error: "temporary failure",
        },
      },
      {
        ok: true,
        body: {
          success: true,
          outcome: "applied",
          session: {
            roundCount: 4,
            totalDrinks: 5,
          },
        },
      },
    ]);

    await assert.rejects(
      () => recordCompletedGameRound("ANSWERED", 0, "turn_1"),
      /temporary failure/,
    );

    const result = await recordCompletedGameRound("ANSWERED", 0, "turn_1");
    const firstBody = JSON.parse(requests[0]?.body ?? "{}") as Record<string, unknown>;
    const secondBody = JSON.parse(requests[1]?.body ?? "{}") as Record<string, unknown>;

    assert.equal(firstBody.requestId, secondBody.requestId);
    assert.equal(result.outcome, "applied");
  } finally {
    browser.restore();
  }
});

test("stale progress responses resync without surfacing a generic failure", async () => {
  const browser = setupBrowserEnv();

  try {
    markGameSessionStarted("ABCD", "/game/modes", "session_active");
    mockFetchSequence([
      {
        ok: false,
        status: 409,
        body: {
          error: "ตาปัจจุบันถูกอัปเดตแล้ว",
          code: "STALE_TURN",
          session: {
            roundCount: 4,
            totalDrinks: 5,
          },
        },
      },
    ]);

    const result = await tryRecordCompletedGameRound("ANSWERED", 0, "turn_1");

    assert.deepEqual(result, {
      ok: true,
      outcome: "stale",
      roundCount: 4,
      totalDrinks: 5,
    });
  } finally {
    browser.restore();
  }
});

test("complete returns a server-derived summary payload", async () => {
  const browser = setupBrowserEnv();

  try {
    markGameSessionStarted("ABCD", "/game/modes", "session_active");
    const requests = mockFetchSequence([
      {
        ok: true,
        body: {
          success: true,
          session: {
            roundCount: 4,
            totalDrinks: 6,
          },
          summary: {
            totalRounds: 4,
            totalDrinks: 6,
            players: [
              {
                id: "player_1",
                name: "Host",
                drinkCount: 2,
                questionsAnswered: 2,
              },
              {
                id: "player_2",
                name: "Guest",
                drinkCount: 4,
                questionsAnswered: 2,
              },
            ],
          },
        },
      },
    ]);

    const completion = await completeStoredGameSession();

    assert.equal(requests[0]?.url, "/api/rooms/ABCD/complete");
    assert.deepEqual(JSON.parse(requests[0]?.body ?? "{}"), {
      sessionId: "session_active",
    });
    assert.equal(completion.ok, true);
    if (completion.ok) {
      assert.deepEqual(completion.summary, {
        sessionId: "session_active",
        roomCode: "ABCD",
        totalRounds: 4,
        totalDrinks: 6,
        players: [
          {
            id: "player_1",
            name: "Host",
            drinkCount: 2,
            questionsAnswered: 2,
          },
          {
            id: "player_2",
            name: "Guest",
            drinkCount: 4,
            questionsAnswered: 2,
          },
        ],
      });
    }
  } finally {
    browser.restore();
  }
});
