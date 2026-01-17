/**
 * useQuestionPool - Smart Question Management
 * โหลด กรอง และจัดการคำถามแบบไม่ซ้ำต่อผู้เล่น
 * Custom questions แทรกสุ่มบ้าง (ไม่ใช่ทุกรอบ)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { GAME_SETTINGS } from "@/config/gameConstants";

export interface GameQuestion {
  id: string;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
  isCustom?: boolean;
}

interface UseQuestionPoolOptions {
  mode: string;
  level?: number;
  is18PlusEnabled: boolean;
  players: string[];
  customQuestions?: GameQuestion[];
  customQuestionChance?: number; // 0-1, chance to show custom question (default 0.3 = 30%)
}

interface UseQuestionPoolReturn {
  questions: GameQuestion[];
  isLoading: boolean;
  getQuestionForPlayer: (playerName: string) => GameQuestion | null;
  markQuestionAnswered: (playerName: string, questionId: string) => void;
  resetPlayerQuestions: (playerName: string) => void;
  resetAllQuestions: () => void;
  answeredCount: Record<string, number>;
}

// Fallback questions
const fallbackQuestions: GameQuestion[] = [
  {
    id: "fb-1",
    text: "ความลับที่ไม่เคยบอกใครคืออะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-2",
    text: "เคยโกหกเพื่อนในวงนี้เรื่องอะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-3",
    text: "ถ้าต้องเลือกคนในวงนี้ไปติดเกาะด้วย เลือกใคร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-4",
    text: "ใครโมโหง่ายที่สุดในวง?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-5",
    text: "ใครน่าจะเป็นเศรษฐีในอนาคต?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-6",
    text: "เคยแอบชอบเพื่อนสนิทไหม?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-7",
    text: "โทรหาคนสุดท้ายในประวัติโทรแล้วบอกรัก",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    id: "fb-8",
    text: "ทุกคนดื่ม! ใครไม่ดื่มต้องตอบคำถาม",
    type: "CHAOS",
    level: 1,
    is18Plus: false,
  },
  {
    id: "fb-9",
    text: "ถ้าต้องเลือกจีบคนในวงได้ 1 คน เลือกใคร?",
    type: "QUESTION",
    level: 3,
    is18Plus: true,
  },
  {
    id: "fb-10",
    text: "เคยทำอะไรน่าอายที่สุด?",
    type: "TRUTH",
    level: 3,
    is18Plus: false,
  },
];

export function useQuestionPool({
  mode,
  level = 3,
  is18PlusEnabled,
  players,
  customQuestions = [],
  customQuestionChance = 0.25, // 25% chance to show custom question
}: UseQuestionPoolOptions): UseQuestionPoolReturn {
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track answered questions per player
  const [playerAnswered, setPlayerAnswered] = useState<
    Record<string, Set<string>>
  >(() => Object.fromEntries(players.map((name) => [name, new Set<string>()])));

  // Track used custom questions (globally)
  const usedCustomQuestionsRef = useRef<Set<string>>(new Set());

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);

      try {
        const modeToType: Record<string, string> = {
          question: "QUESTION",
          vote: "VOTE",
          "truth-or-dare": "TRUTH",
          chaos: "CHAOS",
        };

        const questionType = modeToType[mode] || "QUESTION";
        const params = new URLSearchParams({
          count: "50",
          is18Plus: is18PlusEnabled.toString(),
          level: level.toString(),
          type: questionType,
        });

        if (mode === "truth-or-dare") {
          const [truthRes, dareRes] = await Promise.all([
            fetch(
              `/api/questions/random?count=25&type=TRUTH&is18Plus=${is18PlusEnabled}&level=${level}`,
            ),
            fetch(
              `/api/questions/random?count=25&type=DARE&is18Plus=${is18PlusEnabled}&level=${level}`,
            ),
          ]);

          const truthData = truthRes.ok
            ? await truthRes.json()
            : { questions: [] };
          const dareData = dareRes.ok
            ? await dareRes.json()
            : { questions: [] };

          const combined = [
            ...(truthData.questions || []),
            ...(dareData.questions || []),
          ];
          setQuestions(combined.length > 0 ? combined : fallbackQuestions);
        } else {
          const res = await fetch(`/api/questions/random?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setQuestions(
              data.questions?.length > 0 ? data.questions : fallbackQuestions,
            );
          } else {
            setQuestions(fallbackQuestions);
          }
        }
      } catch {
        setQuestions(fallbackQuestions);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [mode, level, is18PlusEnabled]);

  // Get available questions for a specific player (without custom)
  const getAvailableForPlayer = useCallback(
    (playerName: string): GameQuestion[] => {
      const answered = playerAnswered[playerName] || new Set<string>();

      return questions.filter((q) => {
        if (answered.has(q.id)) return false;
        if (q.is18Plus && !is18PlusEnabled) return false;
        if (q.level > level) return false;
        return true;
      });
    },
    [questions, playerAnswered, is18PlusEnabled, level],
  );

  // Get available custom questions (not used yet)
  const getAvailableCustomQuestions = useCallback((): GameQuestion[] => {
    return customQuestions.filter(
      (q) => !usedCustomQuestionsRef.current.has(q.id),
    );
  }, [customQuestions]);

  // Get a random question for a player
  const getQuestionForPlayer = useCallback(
    (playerName: string): GameQuestion | null => {
      const availableCustom = getAvailableCustomQuestions();

      // Random chance to show custom question (if available)
      if (availableCustom.length > 0 && Math.random() < customQuestionChance) {
        const customQ =
          availableCustom[Math.floor(Math.random() * availableCustom.length)];
        usedCustomQuestionsRef.current.add(customQ.id);
        return { ...customQ, isCustom: true };
      }

      const available = getAvailableForPlayer(playerName);

      if (available.length === 0) {
        // Reset this player's history if they've seen all questions
        setPlayerAnswered((prev) => ({
          ...prev,
          [playerName]: new Set<string>(),
        }));
        const allAvailable = questions.filter(
          (q) => (!q.is18Plus || is18PlusEnabled) && q.level <= level,
        );
        return (
          allAvailable[Math.floor(Math.random() * allAvailable.length)] || null
        );
      }

      // If 18+ enabled, prioritize 18+ questions (80% chance)
      if (is18PlusEnabled && Math.random() < GAME_SETTINGS.adult18PlusRatio) {
        const adultQuestions = available.filter((q) => q.is18Plus);
        if (adultQuestions.length > 0) {
          return adultQuestions[
            Math.floor(Math.random() * adultQuestions.length)
          ];
        }
      }

      return available[Math.floor(Math.random() * available.length)];
    },
    [
      getAvailableForPlayer,
      getAvailableCustomQuestions,
      questions,
      customQuestionChance,
      is18PlusEnabled,
      level,
    ],
  );

  // Mark a question as answered by a player
  const markQuestionAnswered = useCallback(
    (playerName: string, questionId: string) => {
      setPlayerAnswered((prev) => ({
        ...prev,
        [playerName]: new Set([...(prev[playerName] || []), questionId]),
      }));
    },
    [],
  );

  // Reset a player's answered questions
  const resetPlayerQuestions = useCallback((playerName: string) => {
    setPlayerAnswered((prev) => ({
      ...prev,
      [playerName]: new Set<string>(),
    }));
  }, []);

  // Reset all players' answered questions
  const resetAllQuestions = useCallback(() => {
    setPlayerAnswered(
      Object.fromEntries(players.map((name) => [name, new Set<string>()])),
    );
    usedCustomQuestionsRef.current.clear();
  }, [players]);

  // Count answered questions per player
  const answeredCount = Object.fromEntries(
    Object.entries(playerAnswered).map(([name, set]) => [name, set.size]),
  );

  return {
    questions,
    isLoading,
    getQuestionForPlayer,
    markQuestionAnswered,
    resetPlayerQuestions,
    resetAllQuestions,
    answeredCount,
  };
}

export default useQuestionPool;
