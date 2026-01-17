/**
 * usePlayerQueue - Fair Player Rotation System
 * ระบบหมุนเวียนผู้เล่นแบบ Fair ไม่ให้คนเดิมโดนบ่อย
 */

import { useState, useCallback, useRef } from "react";

interface UsePlayerQueueOptions {
  players: string[];
  avoidRepeats?: boolean; // หลีกเลี่ยงคนสุดท้ายของรอบก่อนเป็นคนแรกของรอบถัดไป
}

interface UsePlayerQueueReturn {
  currentPlayerIndex: number;
  currentPlayer: string;
  getNextPlayer: () => number;
  resetQueue: () => void;
  playerTurnCount: Record<string, number>;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function usePlayerQueue({
  players,
  avoidRepeats = true,
}: UsePlayerQueueOptions): UsePlayerQueueReturn {
  // Shuffled queue of player indices
  const [queue, setQueue] = useState<number[]>(() =>
    shuffleArray(Array.from({ length: players.length }, (_, i) => i)),
  );
  const [queuePosition, setQueuePosition] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(
    () => queue[0] ?? 0,
  );

  // Track how many times each player has been selected
  const [playerTurnCount, setPlayerTurnCount] = useState<
    Record<string, number>
  >(() => Object.fromEntries(players.map((name) => [name, 0])));

  // Track last player to avoid immediate repeats
  const lastPlayerRef = useRef<number>(-1);

  const getNextPlayer = useCallback(() => {
    if (players.length <= 1) {
      setCurrentPlayerIndex(0);
      return 0;
    }

    let nextPos = queuePosition + 1;
    let newQueue = queue;

    // If we've gone through everyone, reshuffle
    if (nextPos >= queue.length) {
      nextPos = 0;
      newQueue = shuffleArray(
        Array.from({ length: players.length }, (_, i) => i),
      );

      // Avoid immediate repeat: if first of new queue is same as last of old queue
      if (
        avoidRepeats &&
        newQueue[0] === lastPlayerRef.current &&
        newQueue.length > 1
      ) {
        // Swap first with a random position (not first)
        const swapIdx = Math.floor(Math.random() * (newQueue.length - 1)) + 1;
        [newQueue[0], newQueue[swapIdx]] = [newQueue[swapIdx], newQueue[0]];
      }

      setQueue(newQueue);
    }

    const nextPlayerIdx = newQueue[nextPos];
    lastPlayerRef.current = nextPlayerIdx;

    setQueuePosition(nextPos);
    setCurrentPlayerIndex(nextPlayerIdx);

    // Update turn count
    setPlayerTurnCount((prev) => ({
      ...prev,
      [players[nextPlayerIdx]]: (prev[players[nextPlayerIdx]] || 0) + 1,
    }));

    return nextPlayerIdx;
  }, [players, queue, queuePosition, avoidRepeats]);

  const resetQueue = useCallback(() => {
    const newQueue = shuffleArray(
      Array.from({ length: players.length }, (_, i) => i),
    );
    setQueue(newQueue);
    setQueuePosition(0);
    setCurrentPlayerIndex(newQueue[0] ?? 0);
    setPlayerTurnCount(Object.fromEntries(players.map((name) => [name, 0])));
    lastPlayerRef.current = -1;
  }, [players]);

  return {
    currentPlayerIndex,
    currentPlayer: players[currentPlayerIndex] ?? "",
    getNextPlayer,
    resetQueue,
    playerTurnCount,
  };
}

export default usePlayerQueue;
