"use client";

import { useEffect, useState } from "react";
import {
  GAME_SESSION_CHANGED_EVENT,
  getStoredPlayerNames,
  hasActiveGameSession,
  setGameResumePath,
} from "@/frontend/game/gameSession";

interface UseStoredGamePlayersResult {
  hasStartedGame: boolean | null;
  players: string[];
  isReady: boolean;
}

function readStoredGamePlayers() {
  const isSessionActive = hasActiveGameSession();
  const players = isSessionActive ? getStoredPlayerNames() : [];
  const hasStartedGame = isSessionActive && players.length > 0;

  return {
    hasStartedGame,
    players,
  };
}

export function useStoredGamePlayers(resumePath?: string): UseStoredGamePlayersResult {
  const [state, setState] = useState(() =>
    typeof window === "undefined"
      ? { hasStartedGame: null as boolean | null, players: [] as string[] }
      : readStoredGamePlayers(),
  );

  useEffect(() => {
    const syncStoredPlayers = () => {
      const nextState = readStoredGamePlayers();
      setState(nextState);

      if (nextState.hasStartedGame && resumePath) {
        setGameResumePath(resumePath);
      }
    };

    syncStoredPlayers();
    window.addEventListener("storage", syncStoredPlayers);
    window.addEventListener(GAME_SESSION_CHANGED_EVENT, syncStoredPlayers);

    return () => {
      window.removeEventListener("storage", syncStoredPlayers);
      window.removeEventListener(GAME_SESSION_CHANGED_EVENT, syncStoredPlayers);
    };
  }, [resumePath]);

  return {
    hasStartedGame: state.hasStartedGame,
    players: state.players,
    isReady: state.players.length > 0,
  };
}

export default useStoredGamePlayers;
