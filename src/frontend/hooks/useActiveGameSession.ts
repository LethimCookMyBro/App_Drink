"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_ACTIVE_GAME_SESSION_SNAPSHOT,
  GAME_SESSION_CHANGED_EVENT,
  getActiveGameSessionSnapshot,
  refreshStoredActiveGameSession,
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

  const refreshActiveGame = useCallback(async () => {
    setActiveGame(getActiveGameSessionSnapshot());

    try {
      const nextSnapshot = await refreshStoredActiveGameSession();
      setActiveGame(nextSnapshot);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refreshActiveGame();

    const syncActiveGame = () => {
      void refreshActiveGame();
    };

    window.addEventListener("storage", syncActiveGame);
    window.addEventListener(GAME_SESSION_CHANGED_EVENT, syncActiveGame);
    const pollId = window.setInterval(syncActiveGame, 5000);

    return () => {
      window.removeEventListener("storage", syncActiveGame);
      window.removeEventListener(GAME_SESSION_CHANGED_EVENT, syncActiveGame);
      window.clearInterval(pollId);
    };
  }, [refreshActiveGame]);

  return { activeGame, isHydrated, refreshActiveGame };
}

export default useActiveGameSession;
