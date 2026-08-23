"use client";

import { useEffect, useState } from "react";
import {
  fetchRoomGameSnapshot,
  GAME_SESSION_CHANGED_EVENT,
  getActiveGameSessionSnapshot,
  getStoredGameSessionId,
  type RoomGameSnapshot,
} from "@/frontend/game/gameSession";

interface UseStoredGamePlayersResult {
  hasStartedGame: boolean | null;
  players: string[];
  isReady: boolean;
  room: RoomGameSnapshot | null;
}

export function useStoredGamePlayers(
  resumePath?: string,
): UseStoredGamePlayersResult {
  const [state, setState] = useState<UseStoredGamePlayersResult>({
    hasStartedGame: null,
    players: [],
    isReady: false,
    room: null,
  });

  useEffect(() => {
    let isCancelled = false;
    let isSyncing = false;

    const syncStoredPlayers = async () => {
      if (isSyncing) return;
      isSyncing = true;

      try {
        const activeGame = getActiveGameSessionSnapshot();
        if (!activeGame.roomCode || !activeGame.sessionId) {
          if (!isCancelled) {
            setState({
              hasStartedGame: false,
              players: [],
              isReady: false,
              room: null,
            });
          }
          return;
        }

        const room = await fetchRoomGameSnapshot(
          activeGame.roomCode,
          getStoredGameSessionId() || undefined,
        );

        if (isCancelled) {
          return;
        }

        const hasActiveSession =
          !!room?.activeSession && room.activeSession.status === "ACTIVE";
        const nextResumePath = room?.activeSession?.resumePath;
        const players = room?.players.map((player) => player.name) ?? [];

        if (resumePath && nextResumePath && nextResumePath !== resumePath) {
          setState({
            hasStartedGame: hasActiveSession,
            players,
            isReady: players.length > 0,
            room,
          });
          return;
        }

        setState({
          hasStartedGame: hasActiveSession,
          players,
          isReady: players.length > 0,
          room,
        });
      } finally {
        isSyncing = false;
      }
    };

    const handleSync = () => {
      void syncStoredPlayers();
    };

    void syncStoredPlayers();
    window.addEventListener("storage", handleSync);
    window.addEventListener(GAME_SESSION_CHANGED_EVENT, handleSync);
    const pollId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      handleSync();
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(GAME_SESSION_CHANGED_EVENT, handleSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(pollId);
    };
  }, [resumePath]);

  return state;
}

export default useStoredGamePlayers;
