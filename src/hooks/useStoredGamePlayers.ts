"use client";

import { useEffect, useState } from "react";
import {
  getStoredPlayerNames,
  hasActiveGameSession,
  setGameResumePath,
} from "@/lib/gameSession";

interface UseStoredGamePlayersResult {
  hasStartedGame: boolean | null;
  players: string[];
  isReady: boolean;
}

export function useStoredGamePlayers(resumePath?: string): UseStoredGamePlayersResult {
  const [hasStartedGame, setHasStartedGame] = useState<boolean | null>(null);
  const [players, setPlayers] = useState<string[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const isSessionActive = hasActiveGameSession();
      const storedPlayers = isSessionActive ? getStoredPlayerNames() : [];
      const hasValidPlayers = isSessionActive && storedPlayers.length > 0;

      setHasStartedGame(hasValidPlayers);
      setPlayers(storedPlayers);

      if (hasValidPlayers && resumePath) {
        setGameResumePath(resumePath);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resumePath]);

  return {
    hasStartedGame,
    players,
    isReady: players.length > 0,
  };
}

export default useStoredGamePlayers;
