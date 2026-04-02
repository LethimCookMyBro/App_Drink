"use client";

export const GAME_SESSION_KEYS = {
  started: "wongtaek-game-started",
  roomCode: "wongtaek-room-code",
  players: "wongtaek-players",
  customQuestions: "wongtaek-custom-questions",
  stats: "wongtaek-game-stats",
  rounds: "wongtaek-rounds",
  resumePath: "wongtaek-game-resume-path",
} as const;

export interface StoredPlayerStat {
  name: string;
  drinkCount: number;
  questionsAnswered: number;
}

export interface ActiveGameSessionSnapshot {
  isActive: boolean;
  roomCode: string;
  players: string[];
  playerCount: number;
  resumePath: string;
}

const MAX_REASONABLE_DRINKS = 99;
const MAX_REASONABLE_QUESTIONS = 999;
const MAX_REASONABLE_ROUNDS = 999;

function getStoredPlayers(): string[] {
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

export function hasActiveGameSession(): boolean {
  if (typeof window === "undefined") return false;

  const gameStarted =
    window.localStorage.getItem(GAME_SESSION_KEYS.started) === "true";

  return gameStarted && getStoredPlayers().length > 0;
}

export function setGameResumePath(path: string): void {
  if (typeof window === "undefined" || !isGameRoute(path)) return;

  window.localStorage.setItem(GAME_SESSION_KEYS.resumePath, path);
}

export function getGameLaunchHref(): string {
  return hasActiveGameSession() ? getStoredResumePath() : "/create";
}

export function getActiveGameSessionSnapshot(): ActiveGameSessionSnapshot {
  const players = getStoredPlayers();
  const isActive = hasActiveGameSession();

  return {
    isActive,
    roomCode: isActive ? getStoredRoomCode() : "",
    players: isActive ? players : [],
    playerCount: isActive ? players.length : 0,
    resumePath: isActive ? getStoredResumePath() : "/create",
  };
}

export function markGameSessionStarted(
  roomCode?: string,
  resumePath = "/game/modes",
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(GAME_SESSION_KEYS.started, "true");
  window.localStorage.removeItem(GAME_SESSION_KEYS.stats);
  window.localStorage.removeItem(GAME_SESSION_KEYS.rounds);
  setGameResumePath(resumePath);
  if (roomCode) {
    window.localStorage.setItem(GAME_SESSION_KEYS.roomCode, roomCode);
  }
}

export function clearActiveGameSession(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(GAME_SESSION_KEYS.started);
  window.localStorage.removeItem(GAME_SESSION_KEYS.roomCode);
  window.localStorage.removeItem(GAME_SESSION_KEYS.players);
  window.localStorage.removeItem(GAME_SESSION_KEYS.customQuestions);
  window.localStorage.removeItem(GAME_SESSION_KEYS.resumePath);
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
