"use client";

export const GAME_SESSION_KEYS = {
  started: "wongtaek-game-started",
  roomCode: "wongtaek-room-code",
  players: "wongtaek-players",
  customQuestions: "wongtaek-custom-questions",
  stats: "wongtaek-game-stats",
  rounds: "wongtaek-rounds",
} as const;

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

export function hasActiveGameSession(): boolean {
  if (typeof window === "undefined") return false;

  const gameStarted =
    window.localStorage.getItem(GAME_SESSION_KEYS.started) === "true";

  return gameStarted && getStoredPlayers().length > 0;
}

export function markGameSessionStarted(roomCode?: string): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(GAME_SESSION_KEYS.started, "true");
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
}

export function clearGameSummary(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(GAME_SESSION_KEYS.stats);
  window.localStorage.removeItem(GAME_SESSION_KEYS.rounds);
}
