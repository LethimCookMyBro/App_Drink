"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Guard against concurrent refresh calls to prevent request storms
  const isRefreshing = useRef(false);

  const refreshActiveGame = useCallback(async () => {
    // Skip if a refresh is already in-flight
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    setActiveGame(getActiveGameSessionSnapshot());

    try {
      const nextSnapshot = await refreshStoredActiveGameSession();
      setActiveGame(nextSnapshot);
    } finally {
      isRefreshing.current = false;
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => {
      void refreshActiveGame();
    }, 0);

    // For GAME_SESSION_CHANGED_EVENT, only read local snapshot (no fetch)
    // to avoid triggering a re-fetch loop. The 5s poll handles remote sync.
    const syncFromLocalStorage = () => {
      setActiveGame(getActiveGameSessionSnapshot());
    };

    // For cross-tab sync via "storage" event, do a full refresh
    const syncFromStorage = () => {
      void refreshActiveGame();
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(GAME_SESSION_CHANGED_EVENT, syncFromLocalStorage);
    const pollId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshActiveGame();
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshActiveGame();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(
        GAME_SESSION_CHANGED_EVENT,
        syncFromLocalStorage,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(pollId);
    };
  }, [refreshActiveGame]);

  return { activeGame, isHydrated, refreshActiveGame };
}

export default useActiveGameSession;
