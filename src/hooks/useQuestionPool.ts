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
  getQuestionForPlayer: (
    playerName: string,
    preferredType?: string,
  ) => GameQuestion | null;
  markQuestionAnswered: (playerName: string, questionId: string) => void;
}

function createAnsweredState(players: string[]): Record<string, Set<string>> {
  return Object.fromEntries(players.map((name) => [name, new Set<string>()]));
}

const QUESTION_TYPE_BY_MODE: Record<string, string> = {
  question: "QUESTION",
  vote: "VOTE",
  "truth-or-dare": "TRUTH",
  chaos: "CHAOS",
  random: "",
};

function pickRandomItem<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function filterQuestions(
  questions: GameQuestion[],
  {
    answered,
    preferredType,
    is18PlusEnabled,
    level,
  }: {
    answered: Set<string>;
    preferredType?: string;
    is18PlusEnabled: boolean;
    level: number;
  },
): GameQuestion[] {
  return questions.filter((question) => {
    if (answered.has(question.id)) return false;
    if (question.is18Plus && !is18PlusEnabled) return false;
    if (question.level > level) return false;
    if (preferredType && question.type !== preferredType) return false;
    return true;
  });
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

function getFallbackQuestionsForMode(mode: string): GameQuestion[] {
  const fallbackByMode: Record<string, GameQuestion[]> = {
    question: fallbackQuestions.filter((question) => question.type === "QUESTION"),
    vote: fallbackQuestions.filter((question) => question.type === "VOTE"),
    "truth-or-dare": fallbackQuestions.filter(
      (question) => question.type === "TRUTH" || question.type === "DARE",
    ),
    chaos: fallbackQuestions.filter((question) => question.type === "CHAOS"),
    random: fallbackQuestions,
  };

  return fallbackByMode[mode]?.length ? fallbackByMode[mode] : fallbackQuestions;
}

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
  >(() => createAnsweredState(players));

  // Track used custom questions (globally)
  const usedCustomQuestionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPlayerAnswered(createAnsweredState(players));
    usedCustomQuestionsRef.current.clear();
  }, [players]);

  useEffect(() => {
    usedCustomQuestionsRef.current.clear();
  }, [customQuestions.length]);

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      const fallbackPool = getFallbackQuestionsForMode(mode);

      try {
        const questionType = QUESTION_TYPE_BY_MODE[mode] ?? "QUESTION";
        const params = new URLSearchParams();
        params.set("count", "50");
        params.set("is18Plus", is18PlusEnabled.toString());
        params.set("level", level.toString());
        if (questionType) {
          params.set("type", questionType);
        }

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

          const combined = [...(truthData.questions || []), ...(dareData.questions || [])];
          setQuestions(combined.length > 0 ? combined : fallbackPool);
        } else {
          const res = await fetch(`/api/questions/random?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setQuestions(
              data.questions?.length > 0 ? data.questions : fallbackPool,
            );
          } else {
            setQuestions(fallbackPool);
          }
        }
      } catch {
        setQuestions(fallbackPool);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [mode, level, is18PlusEnabled]);

  // Get available questions for a specific player (without custom)
  const getAvailableForPlayer = useCallback(
    (playerName: string, preferredType?: string): GameQuestion[] => {
      const answered = playerAnswered[playerName] || new Set<string>();
      return filterQuestions(questions, {
        answered,
        preferredType,
        is18PlusEnabled,
        level,
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
    (playerName: string, preferredType?: string): GameQuestion | null => {
      const availableCustom = getAvailableCustomQuestions();
      const preferredCustomQuestions = preferredType
        ? availableCustom.filter((question) => question.type === preferredType)
        : availableCustom;

      if (
        preferredCustomQuestions.length > 0 &&
        Math.random() < customQuestionChance
      ) {
        const customQ = pickRandomItem(preferredCustomQuestions);
        if (!customQ) {
          return null;
        }
        usedCustomQuestionsRef.current.add(customQ.id);
        return { ...customQ, isCustom: true };
      }

      const available = getAvailableForPlayer(playerName, preferredType);
      const fallbackAvailable = preferredType
        ? getAvailableForPlayer(playerName)
        : available;

      if (available.length === 0) {
        setPlayerAnswered((prev) => ({
          ...prev,
          [playerName]: new Set<string>(),
        }));
        const allAvailable = filterQuestions(questions, {
          answered: new Set<string>(),
          preferredType,
          is18PlusEnabled,
          level,
        });
        const fallbackAll = preferredType
          ? filterQuestions(questions, {
              answered: new Set<string>(),
              is18PlusEnabled,
              level,
            })
          : allAvailable;
        return pickRandomItem(allAvailable) ?? pickRandomItem(fallbackAll);
      }

      if (is18PlusEnabled && Math.random() < GAME_SETTINGS.adult18PlusRatio) {
        const adultQuestions = available.filter((question) => question.is18Plus);
        const prioritizedQuestion = pickRandomItem(adultQuestions);
        if (prioritizedQuestion) {
          return prioritizedQuestion;
        }
      }

      return pickRandomItem(available) ?? pickRandomItem(fallbackAvailable);
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

  return {
    questions,
    isLoading,
    getQuestionForPlayer,
    markQuestionAnswered,
  };
}

export default useQuestionPool;
