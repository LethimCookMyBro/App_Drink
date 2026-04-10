"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT,
  GAME_SESSION_CHANGED_EVENT,
  getActiveGameSessionSnapshot,
  type ActiveGameSessionSnapshot,
} from "@/frontend/game/gameSession";

export function useActiveGameSession() {
  const [activeGame, setActiveGame] = useState<ActiveGameSessionSnapshot>(
    () =>
      typeof window === "undefined"
        ? EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT
        : getActiveGameSessionSnapshot(),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const refreshActiveGame = useCallback(() => {
    setActiveGame(getActiveGameSessionSnapshot());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const syncActiveGame = () => {
      refreshActiveGame();
    };

    syncActiveGame();
    window.addEventListener("storage", syncActiveGame);
    window.addEventListener(GAME_SESSION_CHANGED_EVENT, syncActiveGame);

    return () => {
      window.removeEventListener("storage", syncActiveGame);
      window.removeEventListener(GAME_SESSION_CHANGED_EVENT, syncActiveGame);
    };
  }, [refreshActiveGame]);

  return { activeGame, isHydrated, refreshActiveGame };
}

export default useActiveGameSession;
