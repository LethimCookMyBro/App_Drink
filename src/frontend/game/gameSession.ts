"use client";

export const GAME_SESSION_KEYS = {
  started: "wongtaek-game-started",
  roomCode: "wongtaek-room-code",
  sessionId: "wongtaek-game-session-id",
  resumePath: "wongtaek-game-resume-path",
  summary: "wongtaek-game-summary",
} as const;

export const GAME_SESSION_CHANGED_EVENT = "wongtaek-game-session-changed";
const pendingProgressRequestIds = new Map<string, string>();

export interface ActiveGameSessionSnapshot {
  isActive: boolean;
  roomCode: string;
  sessionId: string;
  players: string[];
  playerCount: number;
  resumePath: string;
}

export interface RoomPlayerSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  drinkCount: number;
  skipCount: number;
}

export interface RoomQuestionSnapshot {
  id: string;
  sessionId: string | null;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
}

export interface SessionSummarySnapshot {
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
}

export interface RoomGameSnapshot {
  code: string;
  name: string;
  maxPlayers: number;
  difficulty: number;
  is18Plus: boolean;
  players: RoomPlayerSnapshot[];
  customQuestions: RoomQuestionSnapshot[];
  activeSession: SessionSummarySnapshot | null;
}

export interface PersistedSummaryPlayer {
  id: string;
  name: string;
  drinkCount: number;
  questionsAnswered: number;
}

export interface StoredPlayerStat {
  name: string;
  drinkCount: number;
  questionsAnswered: number;
}

export interface PersistedGameSummary {
  sessionId: string;
  roomCode: string;
  totalRounds: number;
  totalDrinks: number;
  players: PersistedSummaryPlayer[];
}

export type ProgressSyncOutcome = "applied" | "duplicate" | "stale";

export type PersistedGameMode =
  | "QUESTION"
  | "VOTE"
  | "TRUTH_OR_DARE"
  | "CHAOS"
  | "MIXED";

export type ProgressAction =
  | "ANSWERED"
  | "SKIPPED"
  | "DRANK"
  | "GAVE_UP"
  | "TIMEOUT"
  | "VOTED";

class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly data: Record<string, unknown> | null;

  constructor(
    message: string,
    status: number,
    data: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = typeof data?.code === "string" ? data.code : undefined;
    this.data = data;
  }
}

export const EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT: ActiveGameSessionSnapshot = {
  isActive: false,
  roomCode: "",
  sessionId: "",
  players: [],
  playerCount: 0,
  resumePath: "/create",
};

function dispatchGameSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GAME_SESSION_CHANGED_EVENT));
}

function isGameRoute(path: string): boolean {
  return path.startsWith("/game");
}

function getStringStorageValue(key: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  const value = window.localStorage.getItem(key);
  return typeof value === "string" ? value : "";
}

function getStoredResumePath(): string {
  const storedPath = getStringStorageValue(GAME_SESSION_KEYS.resumePath);
  return isGameRoute(storedPath) ? storedPath : "/game/modes";
}

function getStoredRoomCode(): string {
  return getStringStorageValue(GAME_SESSION_KEYS.roomCode);
}

export function getStoredGameSessionId(): string {
  return getStringStorageValue(GAME_SESSION_KEYS.sessionId);
}

export function hasActiveGameSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(GAME_SESSION_KEYS.started) === "true" &&
    getStoredRoomCode().length > 0 &&
    getStoredGameSessionId().length > 0
  );
}

export function setGameResumePath(path: string): void {
  if (typeof window === "undefined" || !isGameRoute(path)) return;

  if (window.localStorage.getItem(GAME_SESSION_KEYS.resumePath) === path) {
    return;
  }

  window.localStorage.setItem(GAME_SESSION_KEYS.resumePath, path);
  dispatchGameSessionChanged();
}

export function getGameLaunchHref(): string {
  return hasActiveGameSession() ? getStoredResumePath() : "/create";
}

export function getActiveGameSessionSnapshot(): ActiveGameSessionSnapshot {
  if (!hasActiveGameSession()) {
    return EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT;
  }

  return {
    isActive: true,
    roomCode: getStoredRoomCode(),
    sessionId: getStoredGameSessionId(),
    players: [],
    playerCount: 0,
    resumePath: getStoredResumePath(),
  };
}

function normalizeRoomSnapshot(data: unknown): RoomGameSnapshot | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const room = (data as { room?: unknown }).room;
  if (!room || typeof room !== "object") {
    return null;
  }

  const roomRecord = room as {
    code?: unknown;
    name?: unknown;
    maxPlayers?: unknown;
    difficulty?: unknown;
    is18Plus?: unknown;
    players?: unknown;
    customQuestions?: unknown;
    activeSession?: unknown;
  };

  const players = Array.isArray(roomRecord.players)
    ? roomRecord.players.map((player) => {
        const record = player as Record<string, unknown>;
        return {
          id: typeof record.id === "string" ? record.id : "",
          name: typeof record.name === "string" ? record.name : "",
          isHost: record.isHost === true,
          isReady: record.isReady === true,
          drinkCount:
            typeof record.drinkCount === "number" ? record.drinkCount : 0,
          skipCount: typeof record.skipCount === "number" ? record.skipCount : 0,
        };
      })
    : [];

  const customQuestions = Array.isArray(roomRecord.customQuestions)
    ? roomRecord.customQuestions.map((question) => {
        const record = question as Record<string, unknown>;
        return {
          id: typeof record.id === "string" ? record.id : "",
          sessionId: typeof record.sessionId === "string" ? record.sessionId : null,
          text: typeof record.text === "string" ? record.text : "",
          type: typeof record.type === "string" ? record.type : "QUESTION",
          level: typeof record.level === "number" ? record.level : 2,
          is18Plus: record.is18Plus === true,
        };
      })
    : [];

  const activeSessionRecord =
    roomRecord.activeSession && typeof roomRecord.activeSession === "object"
      ? (roomRecord.activeSession as Record<string, unknown>)
      : null;

  return {
    code: typeof roomRecord.code === "string" ? roomRecord.code : "",
    name: typeof roomRecord.name === "string" ? roomRecord.name : "",
    maxPlayers:
      typeof roomRecord.maxPlayers === "number" ? roomRecord.maxPlayers : 0,
    difficulty:
      typeof roomRecord.difficulty === "number" ? roomRecord.difficulty : 3,
    is18Plus: roomRecord.is18Plus === true,
    players,
    customQuestions,
    activeSession: activeSessionRecord
      ? {
          id: typeof activeSessionRecord.id === "string" ? activeSessionRecord.id : "",
          mode:
            typeof activeSessionRecord.mode === "string"
              ? activeSessionRecord.mode
              : "MIXED",
          status:
            typeof activeSessionRecord.status === "string"
              ? activeSessionRecord.status
              : "ACTIVE",
          resumePath:
            typeof activeSessionRecord.resumePath === "string"
              ? activeSessionRecord.resumePath
              : null,
          roundCount:
            typeof activeSessionRecord.roundCount === "number"
              ? activeSessionRecord.roundCount
              : 0,
          totalDrinks:
            typeof activeSessionRecord.totalDrinks === "number"
              ? activeSessionRecord.totalDrinks
              : 0,
          currentPlayerId:
            typeof activeSessionRecord.currentPlayerId === "string"
              ? activeSessionRecord.currentPlayerId
              : null,
          currentQuestionId:
            typeof activeSessionRecord.currentQuestionId === "string"
              ? activeSessionRecord.currentQuestionId
              : null,
          currentQuestionText:
            typeof activeSessionRecord.currentQuestionText === "string"
              ? activeSessionRecord.currentQuestionText
              : null,
          currentQuestionType:
            typeof activeSessionRecord.currentQuestionType === "string"
              ? activeSessionRecord.currentQuestionType
              : null,
          currentQuestionLevel:
            typeof activeSessionRecord.currentQuestionLevel === "number"
              ? activeSessionRecord.currentQuestionLevel
              : null,
          currentQuestionIs18Plus:
            activeSessionRecord.currentQuestionIs18Plus === true,
          currentQuestionIsCustom:
            activeSessionRecord.currentQuestionIsCustom === true,
          currentTurnToken:
            typeof activeSessionRecord.currentTurnToken === "string"
              ? activeSessionRecord.currentTurnToken
              : null,
          startedAt:
            typeof activeSessionRecord.startedAt === "string"
              ? activeSessionRecord.startedAt
              : new Date(0).toISOString(),
          endedAt:
            typeof activeSessionRecord.endedAt === "string"
              ? activeSessionRecord.endedAt
              : null,
        }
      : null,
  };
}

export async function fetchRoomGameSnapshot(
  roomCode: string,
  expectedSessionId?: string,
): Promise<RoomGameSnapshot | null> {
  if (!roomCode) {
    return null;
  }

  const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  const room = normalizeRoomSnapshot(data);
  if (!room) {
    return null;
  }

  if (
    expectedSessionId &&
    room.activeSession &&
    room.activeSession.id !== expectedSessionId
  ) {
    return null;
  }

  return room;
}

export async function refreshStoredActiveGameSession(): Promise<ActiveGameSessionSnapshot> {
  const snapshot = getActiveGameSessionSnapshot();
  if (!snapshot.roomCode || !snapshot.sessionId) {
    return EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT;
  }

  const room = await fetchRoomGameSnapshot(snapshot.roomCode, snapshot.sessionId);
  if (!room?.activeSession || room.activeSession.status !== "ACTIVE") {
    clearActiveGameSession();
    return EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT;
  }

  const resumePath = room.activeSession.resumePath ?? snapshot.resumePath;
  markGameSessionStarted(room.code, resumePath, room.activeSession.id);

  return {
    isActive: true,
    roomCode: room.code,
    sessionId: room.activeSession.id,
    players: room.players.map((player) => player.name),
    playerCount: room.players.length,
    resumePath,
  };
}

export function markGameSessionStarted(
  roomCode?: string,
  resumePath = "/game/modes",
  sessionId?: string,
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(GAME_SESSION_KEYS.started, "true");
  if (roomCode) {
    window.localStorage.setItem(GAME_SESSION_KEYS.roomCode, roomCode);
  }
  if (sessionId) {
    window.localStorage.setItem(GAME_SESSION_KEYS.sessionId, sessionId);
  }
  setGameResumePath(resumePath);
  dispatchGameSessionChanged();
}

export function clearActiveGameSession(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(GAME_SESSION_KEYS.started);
  window.localStorage.removeItem(GAME_SESSION_KEYS.roomCode);
  window.localStorage.removeItem(GAME_SESSION_KEYS.sessionId);
  window.localStorage.removeItem(GAME_SESSION_KEYS.resumePath);
  dispatchGameSessionChanged();
}

export function resetGameSessionForRestart(): void {
  clearActiveGameSession();
  clearGameSummary();
}

export function clearGameSummary(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GAME_SESSION_KEYS.summary);
}

function normalizeApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

async function postRoomSessionRequest<T>(
  roomCode: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(
    `/api/rooms/${encodeURIComponent(roomCode)}/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new ApiRequestError(
      data?.error || "เกิดข้อผิดพลาดในการบันทึกสถานะเกม",
      response.status,
      data,
    );
  }

  if (!data) {
    throw new Error("เซิร์ฟเวอร์ไม่ส่งข้อมูลกลับมา");
  }

  return data;
}

function createProgressRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `progress_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildProgressRequestCacheKey(
  sessionId: string,
  turnToken: string,
  action: ProgressAction,
  drinkDelta: number,
): string {
  return [sessionId, turnToken, action, String(drinkDelta)].join(":");
}

function getOrCreateProgressRequestId(
  sessionId: string,
  turnToken: string,
  action: ProgressAction,
  drinkDelta: number,
): string {
  const cacheKey = buildProgressRequestCacheKey(
    sessionId,
    turnToken,
    action,
    drinkDelta,
  );
  const existingRequestId = pendingProgressRequestIds.get(cacheKey);
  if (existingRequestId) {
    return existingRequestId;
  }

  const requestId = createProgressRequestId();
  pendingProgressRequestIds.set(cacheKey, requestId);
  return requestId;
}

function clearProgressRequestId(
  sessionId: string,
  turnToken: string,
  action: ProgressAction,
  drinkDelta: number,
): void {
  pendingProgressRequestIds.delete(
    buildProgressRequestCacheKey(sessionId, turnToken, action, drinkDelta),
  );
}

function getMetricsFromSessionRecord(
  session: unknown,
): StoredGameSessionMetrics {
  if (!session || typeof session !== "object") {
    return {
      roundCount: 0,
      totalDrinks: 0,
    };
  }

  const record = session as Record<string, unknown>;
  return {
    roundCount:
      typeof record.roundCount === "number" ? record.roundCount : 0,
    totalDrinks:
      typeof record.totalDrinks === "number" ? record.totalDrinks : 0,
  };
}

function getPersistedGameModeForRoute(route: string): PersistedGameMode {
  if (route === "/game/truth-or-dare") {
    return "TRUTH_OR_DARE";
  }

  if (route === "/game/chaos") {
    return "CHAOS";
  }

  if (route.startsWith("/game/play")) {
    const [, queryString = ""] = route.split("?");
    const params = new URLSearchParams(queryString);
    const mode = params.get("mode");

    if (mode === "question") {
      return "QUESTION";
    }

    if (mode === "vote") {
      return "VOTE";
    }
  }

  return "MIXED";
}

export async function startRoomGameSession(
  roomCode: string,
  mode: PersistedGameMode = "MIXED",
  resumePath = "/game/modes",
  existingSessionId?: string,
): Promise<string> {
  const data = await postRoomSessionRequest<{
    sessionId: string;
    session?: { resumePath?: string | null };
  }>(roomCode, "start", {
    mode,
    resumePath,
    ...(existingSessionId ? { sessionId: existingSessionId } : {}),
  });

  if (!data.sessionId) {
    throw new Error("ไม่พบ session ที่สร้างสำเร็จ");
  }

  markGameSessionStarted(
    roomCode,
    data.session?.resumePath || resumePath,
    data.sessionId,
  );
  dispatchGameSessionChanged();

  return data.sessionId;
}

export async function syncStoredGameSessionMode(route: string): Promise<void> {
  const roomCode = getStoredRoomCode();
  if (!roomCode) {
    return;
  }

  await startRoomGameSession(
    roomCode,
    getPersistedGameModeForRoute(route),
    route,
    getStoredGameSessionId() || undefined,
  );
}

export interface StoredGameSessionMetrics {
  roundCount: number;
  totalDrinks: number;
}

export interface StoredGameProgressResult extends StoredGameSessionMetrics {
  outcome: ProgressSyncOutcome;
}

export async function recordCompletedGameRound(
  action: ProgressAction,
  drinkDelta = 0,
  turnToken: string | null,
): Promise<StoredGameProgressResult> {
  const roomCode = getStoredRoomCode();
  const sessionId = getStoredGameSessionId();

  if (!roomCode || !sessionId) {
    throw new Error("ไม่พบ session เกมที่กำลังเล่น");
  }

  if (!turnToken) {
    throw new Error("ไม่พบ turn token ปัจจุบัน");
  }

  const requestId = getOrCreateProgressRequestId(
    sessionId,
    turnToken,
    action,
    drinkDelta,
  );

  const data = await postRoomSessionRequest<{
    success: boolean;
    outcome?: ProgressSyncOutcome;
    session: {
      roundCount?: number;
      totalDrinks?: number;
    };
  }>(roomCode, "progress", {
    sessionId,
    action,
    drinkDelta,
    turnToken,
    requestId,
  });

  clearProgressRequestId(sessionId, turnToken, action, drinkDelta);
  dispatchGameSessionChanged();

  return {
    ...getMetricsFromSessionRecord(data.session),
    outcome: data.outcome === "duplicate" ? "duplicate" : "applied",
  };
}

export async function tryRecordCompletedGameRound(
  action: ProgressAction,
  drinkDelta = 0,
  turnToken: string | null,
): Promise<
  | ({ ok: true } & StoredGameProgressResult)
  | { ok: false; error: string }
> {
  try {
    const metrics = await recordCompletedGameRound(action, drinkDelta, turnToken);
    return { ok: true, ...metrics };
  } catch (error) {
    const sessionId = getStoredGameSessionId();
    if (error instanceof ApiRequestError && error.code === "STALE_TURN") {
      if (sessionId && turnToken) {
        clearProgressRequestId(sessionId, turnToken, action, drinkDelta);
      }
      dispatchGameSessionChanged();
      return {
        ok: true,
        ...getMetricsFromSessionRecord(error.data?.session),
        outcome: "stale",
      };
    }

    return {
      ok: false,
      error: normalizeApiErrorMessage(
        error,
        "ไม่สามารถบันทึกรอบเกมลงเซิร์ฟเวอร์ได้",
      ),
    };
  }
}

function normalizePersistedGameSummary(
  value: unknown,
): PersistedGameSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.sessionId !== "string" ||
    typeof record.roomCode !== "string" ||
    typeof record.totalRounds !== "number" ||
    typeof record.totalDrinks !== "number" ||
    !Array.isArray(record.players)
  ) {
    return null;
  }

  return {
    sessionId: record.sessionId,
    roomCode: record.roomCode,
    totalRounds: record.totalRounds,
    totalDrinks: record.totalDrinks,
    players: record.players
      .map((player) => {
        const entry = player as Record<string, unknown>;
        if (
          typeof entry.id !== "string" ||
          typeof entry.name !== "string" ||
          typeof entry.drinkCount !== "number" ||
          typeof entry.questionsAnswered !== "number"
        ) {
          return null;
        }

        return {
          id: entry.id,
          name: entry.name,
          drinkCount: entry.drinkCount,
          questionsAnswered: entry.questionsAnswered,
        };
      })
      .filter((player): player is PersistedSummaryPlayer => player !== null),
  };
}

export function getStoredGameSummary(): PersistedGameSummary | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSummary = window.localStorage.getItem(GAME_SESSION_KEYS.summary);
  if (!rawSummary) {
    return null;
  }

  try {
    return normalizePersistedGameSummary(JSON.parse(rawSummary));
  } catch {
    return null;
  }
}

function saveGameSummary(summary: PersistedGameSummary): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GAME_SESSION_KEYS.summary, JSON.stringify(summary));
}

export async function completeStoredGameSession(): Promise<
  | ({
      ok: true;
      summary: PersistedGameSummary | null;
    } & StoredGameSessionMetrics)
  | { ok: false; error?: string }
> {
  const roomCode = getStoredRoomCode();
  const sessionId = getStoredGameSessionId();

  if (!roomCode || !sessionId) {
    return {
      ok: true,
      roundCount: 0,
      totalDrinks: 0,
      summary: null,
    };
  }

  try {
    const data = await postRoomSessionRequest<{
      success: boolean;
      session: StoredGameSessionMetrics;
      summary?: {
        totalRounds?: number;
        totalDrinks?: number;
        players?: PersistedSummaryPlayer[];
      } | null;
    }>(roomCode, "complete", {
      sessionId,
    });
    dispatchGameSessionChanged();

    const summary =
      data.summary &&
      typeof data.summary.totalRounds === "number" &&
      typeof data.summary.totalDrinks === "number" &&
      Array.isArray(data.summary.players)
        ? {
            sessionId,
            roomCode,
            totalRounds: data.summary.totalRounds,
            totalDrinks: data.summary.totalDrinks,
            players: data.summary.players,
          }
        : null;

    return {
      ok: true,
      roundCount:
        typeof data.session?.roundCount === "number" ? data.session.roundCount : 0,
      totalDrinks:
        typeof data.session?.totalDrinks === "number" ? data.session.totalDrinks : 0,
      summary,
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeApiErrorMessage(
        error,
        "ไม่สามารถบันทึกผลเกมลงเซิร์ฟเวอร์ได้",
      ),
    };
  }
}

export async function finalizeStoredGameSummary(): Promise<
  | ({ ok: true } & StoredGameSessionMetrics)
  | { ok: false; error: string }
> {
  const roomCode = getStoredRoomCode();
  const completion = await completeStoredGameSession();
  if (!completion.ok) {
    return {
      ok: false,
      error: completion.error || "ไม่สามารถบันทึกผลเกมลงเซิร์ฟเวอร์ได้",
    };
  }

  if (completion.summary) {
    saveGameSummary(completion.summary);
  } else if (roomCode) {
    const room = await fetchRoomGameSnapshot(roomCode);
    if (room?.activeSession === null) {
      clearGameSummary();
    }
  }

  clearActiveGameSession();
  return completion;
}
