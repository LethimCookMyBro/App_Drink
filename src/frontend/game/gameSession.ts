"use client";

import {
  buildStoredPlayerStats,
  type PlayerCountMap,
} from "@/frontend/game/gamePlayerStats";

export const GAME_SESSION_KEYS = {
  started: "wongtaek-game-started",
  roomCode: "wongtaek-room-code",
  sessionId: "wongtaek-game-session-id",
  players: "wongtaek-players",
  customQuestions: "wongtaek-custom-questions",
  stats: "wongtaek-game-stats",
  rounds: "wongtaek-rounds",
  resumePath: "wongtaek-game-resume-path",
} as const;

export const GAME_SESSION_CHANGED_EVENT = "wongtaek-game-session-changed";

export interface StoredPlayerStat {
  name: string;
  drinkCount: number;
  questionsAnswered: number;
}

export interface ActiveGameSessionSnapshot {
  isActive: boolean;
  roomCode: string;
  sessionId: string;
  players: string[];
  playerCount: number;
  resumePath: string;
}

export type PersistedGameMode =
  | "QUESTION"
  | "VOTE"
  | "TRUTH_OR_DARE"
  | "CHAOS"
  | "MIXED";

const MAX_REASONABLE_DRINKS = 99;
const MAX_REASONABLE_DRINK_DELTA = 10;
const MAX_REASONABLE_QUESTIONS = 999;
const MAX_REASONABLE_ROUNDS = 999;

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

export function getStoredPlayerNames(): string[] {
  if (typeof window === "undefined") return [];

  const rawPlayers = window.localStorage.getItem(GAME_SESSION_KEYS.players);
  if (!rawPlayers) return [];

  try {
    const parsed = JSON.parse(rawPlayers);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isGameRoute(path: string): boolean {
  return path.startsWith("/game");
}

function getStoredResumePath(): string {
  if (typeof window === "undefined") return "/game/modes";

  const storedPath = window.localStorage.getItem(GAME_SESSION_KEYS.resumePath);
  if (!storedPath || !isGameRoute(storedPath)) {
    return "/game/modes";
  }

  return storedPath;
}

function getStoredRoomCode(): string {
  if (typeof window === "undefined") return "";

  const storedRoomCode = window.localStorage.getItem(GAME_SESSION_KEYS.roomCode);
  return typeof storedRoomCode === "string" ? storedRoomCode : "";
}

export function getStoredGameSessionId(): string {
  if (typeof window === "undefined") return "";

  const storedSessionId = window.localStorage.getItem(GAME_SESSION_KEYS.sessionId);
  return typeof storedSessionId === "string" ? storedSessionId : "";
}

export function hasActiveGameSession(): boolean {
  if (typeof window === "undefined") return false;

  const gameStarted =
    window.localStorage.getItem(GAME_SESSION_KEYS.started) === "true";

  return gameStarted && getStoredPlayerNames().length > 0;
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
  const players = getStoredPlayerNames();
  const isActive = hasActiveGameSession();

  if (!isActive) {
    return EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT;
  }

  return {
    isActive: true,
    roomCode: getStoredRoomCode(),
    sessionId: getStoredGameSessionId(),
    players,
    playerCount: players.length,
    resumePath: getStoredResumePath(),
  };
}

export function markGameSessionStarted(
  roomCode?: string,
  resumePath = "/game/modes",
  sessionId?: string,
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(GAME_SESSION_KEYS.started, "true");
  window.localStorage.removeItem(GAME_SESSION_KEYS.stats);
  window.localStorage.removeItem(GAME_SESSION_KEYS.rounds);
  setGameResumePath(resumePath);
  if (roomCode) {
    window.localStorage.setItem(GAME_SESSION_KEYS.roomCode, roomCode);
  }
  if (sessionId) {
    window.localStorage.setItem(GAME_SESSION_KEYS.sessionId, sessionId);
  } else {
    window.localStorage.removeItem(GAME_SESSION_KEYS.sessionId);
  }
  dispatchGameSessionChanged();
}

export function clearActiveGameSession(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(GAME_SESSION_KEYS.started);
  window.localStorage.removeItem(GAME_SESSION_KEYS.roomCode);
  window.localStorage.removeItem(GAME_SESSION_KEYS.sessionId);
  window.localStorage.removeItem(GAME_SESSION_KEYS.players);
  window.localStorage.removeItem(GAME_SESSION_KEYS.customQuestions);
  window.localStorage.removeItem(GAME_SESSION_KEYS.resumePath);
  dispatchGameSessionChanged();
}

export function resetGameSessionForRestart(): void {
  if (typeof window === "undefined") return;

  clearActiveGameSession();
  clearGameSummary();
}

export function clearGameSummary(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(GAME_SESSION_KEYS.stats);
  window.localStorage.removeItem(GAME_SESSION_KEYS.rounds);
}

function sanitizeCount(
  value: unknown,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

export function normalizeStoredPlayerStats(
  rawStats: unknown,
  fallbackPlayers: string[] = [],
): StoredPlayerStat[] {
  if (!Array.isArray(rawStats)) {
    return fallbackPlayers.map((name) => ({
      name,
      drinkCount: 0,
      questionsAnswered: 0,
    }));
  }

  const stats = rawStats
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const name =
        typeof entry.name === "string" ? entry.name.trim().slice(0, 50) : "";
      if (!name) return null;

      return {
        name,
        drinkCount: sanitizeCount(entry.drinkCount, MAX_REASONABLE_DRINKS),
        questionsAnswered: sanitizeCount(
          entry.questionsAnswered,
          MAX_REASONABLE_QUESTIONS,
        ),
      };
    })
    .filter((entry): entry is StoredPlayerStat => entry !== null);

  if (stats.length > 0) {
    return stats;
  }

  return fallbackPlayers.map((name) => ({
    name,
    drinkCount: 0,
    questionsAnswered: 0,
  }));
}

export function saveGameSummary(
  rawStats: StoredPlayerStat[],
  rawRounds: number,
): void {
  if (typeof window === "undefined") return;

  const normalizedStats = normalizeStoredPlayerStats(rawStats);
  const normalizedRounds = sanitizeCount(rawRounds, MAX_REASONABLE_ROUNDS);

  window.localStorage.setItem(
    GAME_SESSION_KEYS.stats,
    JSON.stringify(normalizedStats),
  );
  window.localStorage.setItem(
    GAME_SESSION_KEYS.rounds,
    normalizedRounds.toString(),
  );
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
    throw new Error(data?.error || "เกิดข้อผิดพลาดในการบันทึกสถานะเกม");
  }

  if (!data) {
    throw new Error("เซิร์ฟเวอร์ไม่ส่งข้อมูลกลับมา");
  }

  return data;
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
  existingSessionId?: string,
): Promise<string> {
  const data = await postRoomSessionRequest<{
    sessionId: string;
  }>(roomCode, "start", {
    mode,
    ...(existingSessionId ? { sessionId: existingSessionId } : {}),
  });

  if (!data.sessionId) {
    throw new Error("ไม่พบ session ที่สร้างสำเร็จ");
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(GAME_SESSION_KEYS.sessionId, data.sessionId);
    dispatchGameSessionChanged();
  }

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
    getStoredGameSessionId() || undefined,
  );
}

export interface StoredGameSessionMetrics {
  roundCount: number;
  totalDrinks: number;
}

export async function recordCompletedGameRound(
  roundNumber: number,
  drinkDelta = 0,
): Promise<StoredGameSessionMetrics> {
  const roomCode = getStoredRoomCode();
  const sessionId = getStoredGameSessionId();

  if (!roomCode || !sessionId) {
    throw new Error("ไม่พบ session เกมที่กำลังเล่น");
  }

  const data = await postRoomSessionRequest<{
    success: boolean;
    session: StoredGameSessionMetrics;
  }>(roomCode, "progress", {
    sessionId,
    roundNumber: sanitizeCount(roundNumber, MAX_REASONABLE_ROUNDS),
    drinkDelta: sanitizeCount(drinkDelta, MAX_REASONABLE_DRINK_DELTA),
  });

  return {
    roundCount: sanitizeCount(
      data.session?.roundCount,
      MAX_REASONABLE_ROUNDS,
    ),
    totalDrinks: sanitizeCount(
      data.session?.totalDrinks,
      MAX_REASONABLE_DRINKS * 20,
    ),
  };
}

export async function tryRecordCompletedGameRound(
  roundNumber: number,
  drinkDelta = 0,
): Promise<
  | ({ ok: true } & StoredGameSessionMetrics)
  | { ok: false; error: string }
> {
  try {
    const metrics = await recordCompletedGameRound(roundNumber, drinkDelta);
    return { ok: true, ...metrics };
  } catch (error) {
    return {
      ok: false,
      error: normalizeApiErrorMessage(
        error,
        "ไม่สามารถบันทึกรอบเกมลงเซิร์ฟเวอร์ได้",
      ),
    };
  }
}

export async function completeStoredGameSession(
): Promise<
  | ({ ok: true } & StoredGameSessionMetrics)
  | { ok: false; error?: string }
> {
  const roomCode = getStoredRoomCode();
  const sessionId = getStoredGameSessionId();

  if (!roomCode || !sessionId) {
    return { ok: true, roundCount: 0, totalDrinks: 0 };
  }

  try {
    const data = await postRoomSessionRequest<{
      success: boolean;
      session: StoredGameSessionMetrics;
    }>(roomCode, "complete", {
      sessionId,
    });
    return {
      ok: true,
      roundCount: sanitizeCount(
        data.session?.roundCount,
        MAX_REASONABLE_ROUNDS,
      ),
      totalDrinks: sanitizeCount(
        data.session?.totalDrinks,
        MAX_REASONABLE_DRINKS * 20,
      ),
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

export async function finalizeStoredGameSummary(
  players: string[],
  playerDrinks: PlayerCountMap,
  playerTurnCount: PlayerCountMap,
): Promise<
  | ({ ok: true } & StoredGameSessionMetrics)
  | { ok: false; error: string }
> {
  const completion = await completeStoredGameSession();
  if (!completion.ok) {
    return {
      ok: false,
      error: completion.error || "ไม่สามารถบันทึกผลเกมลงเซิร์ฟเวอร์ได้",
    };
  }

  saveGameSummary(
    buildStoredPlayerStats(players, playerDrinks, playerTurnCount),
    completion.roundCount,
  );
  clearActiveGameSession();

  return completion;
}
