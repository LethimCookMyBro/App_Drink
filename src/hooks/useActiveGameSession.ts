"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT,
  getActiveGameSessionSnapshot,
  type ActiveGameSessionSnapshot,
} from "@/lib/gameSession";

export function useActiveGameSession() {
  const [activeGame, setActiveGame] = useState<ActiveGameSessionSnapshot>(
    EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const refreshActiveGame = useCallback(() => {
    setActiveGame(getActiveGameSessionSnapshot());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshActiveGame();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshActiveGame]);

  return { activeGame, isHydrated, refreshActiveGame };
}

export default useActiveGameSession;
