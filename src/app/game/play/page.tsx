"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button, Timer, GlassPanel } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";

// Question interface
interface GameQuestion {
  id: string;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
}

// Fallback questions when API is unavailable
const fallbackQuestions: GameQuestion[] = [
  {
    id: "1",
    text: "ความลับเรื่องหนึ่งที่คุณปิดบังทุกคนในห้องนี้คืออะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "2",
    text: "เคยโกหกแม่เรื่องอะไรที่ร้ายแรงที่สุด?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    id: "3",
    text: "ถ้าต้องเลือกคนในวงนี้ไปติดเกาะด้วย จะเลือกใคร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "4",
    text: "เรื่องที่ทำแล้วอายที่สุดในชีวิตคืออะไร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    id: "5",
    text: "คนในวงนี้ที่คุณเคยนินทาลับหลังคือใคร?",
    type: "QUESTION",
    level: 3,
    is18Plus: false,
  },
  {
    id: "6",
    text: "อาหารที่แอบกินคนเดียวไม่แบ่งใครคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    id: "7",
    text: "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    id: "8",
    text: "ใครมีเกณฑ์จะเป็นคนรวยที่สุด?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    id: "9",
    text: "ใครที่ใส่เสื้อสีดำ → ดื่มให้หมดแก้ว!",
    type: "CHAOS",
    level: 3,
    is18Plus: false,
  },
  {
    id: "10",
    text: "ถ้าต้องเลือกจีบคนในวงได้ 1 คน เลือกใคร?",
    type: "QUESTION",
    level: 3,
    is18Plus: true,
  },
];

// Player names for demo (will be replaced with actual players from lobby)
const demoPlayers = ["ฉัน", "เพื่อน 1", "เพื่อน 2", "เพื่อน 3", "เพื่อน 4"];

const questionTypeMap: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  QUESTION: { label: "เจาะลึก", icon: "psychology_alt", color: "text-primary" },
  TRUTH: { label: "ความจริง", icon: "verified", color: "text-neon-blue" },
  DARE: {
    label: "ท้าทาย",
    icon: "local_fire_department",
    color: "text-neon-red",
  },
  CHAOS: { label: "โกลาหล", icon: "bolt", color: "text-neon-yellow" },
  VOTE: { label: "โหวต", icon: "how_to_vote", color: "text-neon-green" },
};

export default function GamePlayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "question";
  const { vibeLevel } = useGameStore();

  const [questions, setQuestions] = useState<GameQuestion[]>(fallbackQuestions);
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(
    null
  );
  const [players, setPlayers] = useState<string[]>(demoPlayers);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [is18PlusEnabled, setIs18PlusEnabled] = useState(false);

  // Load 18+ setting and fetch questions
  useEffect(() => {
    const stored = localStorage.getItem("wongtaek-18plus");
    setIs18PlusEnabled(stored === "true");

    // Try to load players from localStorage (set by lobby)
    const savedPlayers = localStorage.getItem("wongtaek-players");
    if (savedPlayers) {
      try {
        const parsed = JSON.parse(savedPlayers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlayers(parsed);
        }
      } catch {
        // Use demo players
      }
    }

    // Fetch questions from API
    fetchQuestions();
  }, [mode]);

  const fetchQuestions = async () => {
    try {
      // Map mode to question type
      const modeToType: Record<string, string> = {
        question: "QUESTION",
        vote: "VOTE",
        "truth-or-dare": "TRUTH,DARE", // Both truth and dare
        chaos: "CHAOS",
      };

      const questionType = modeToType[mode] || "QUESTION";
      const is18Plus = localStorage.getItem("wongtaek-18plus") === "true";

      // Build API URL with filters
      const params = new URLSearchParams({
        count: "50",
        is18Plus: is18Plus.toString(),
      });

      // Add type filter (for truth-or-dare, we'll fetch both and combine)
      if (mode === "truth-or-dare") {
        // Fetch both TRUTH and DARE questions
        const [truthRes, dareRes] = await Promise.all([
          fetch(
            `/api/questions/random?count=25&type=TRUTH&is18Plus=${is18Plus}`
          ),
          fetch(
            `/api/questions/random?count=25&type=DARE&is18Plus=${is18Plus}`
          ),
        ]);

        const truthData = truthRes.ok
          ? await truthRes.json()
          : { questions: [] };
        const dareData = dareRes.ok ? await dareRes.json() : { questions: [] };

        const combined = [
          ...(truthData.questions || []),
          ...(dareData.questions || []),
        ];
        if (combined.length > 0) {
          // Shuffle combined questions
          setQuestions(combined.sort(() => Math.random() - 0.5));
        }
        return;
      }

      params.set("type", questionType);

      const res = await fetch(`/api/questions/random?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
      }
    } catch {
      // Use fallback questions
    }
  };

  // Filter questions based on settings
  const getAvailableQuestions = useCallback(() => {
    return questions.filter((q) => {
      // Filter out used questions
      if (usedQuestionIds.has(q.id)) return false;
      // Filter out 18+ if not enabled
      if (q.is18Plus && !is18PlusEnabled) return false;
      // If chaos mode, include higher level questions
      if (vibeLevel === "chaos") return true;
      // If tipsy, include level 1-2
      if (vibeLevel === "tipsy") return q.level <= 2;
      // Chilling = level 1 only
      return q.level === 1;
    });
  }, [questions, usedQuestionIds, is18PlusEnabled, vibeLevel]);

  // Get random question
  const getRandomQuestion = useCallback(() => {
    const available = getAvailableQuestions();
    if (available.length === 0) {
      // Reset used questions if all have been used
      setUsedQuestionIds(new Set());
      return questions[Math.floor(Math.random() * questions.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }, [getAvailableQuestions, questions]);

  // Get random player (different from current)
  const getRandomPlayer = useCallback(() => {
    if (players.length <= 1) return 0;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * players.length);
    } while (newIndex === currentPlayerIndex && players.length > 1);
    return newIndex;
  }, [players.length, currentPlayerIndex]);

  // Initialize first question
  useEffect(() => {
    if (!currentQuestion && questions.length > 0) {
      setCurrentQuestion(getRandomQuestion());
    }
  }, [currentQuestion, questions, getRandomQuestion]);

  const handleSkip = () => {
    nextRound();
  };

  const handleDone = () => {
    nextRound();
  };

  const nextRound = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const newQuestion = getRandomQuestion();
      if (currentQuestion) {
        setUsedQuestionIds((prev) => new Set([...prev, currentQuestion.id]));
      }
      setCurrentQuestion(newQuestion);
      setCurrentPlayerIndex(getRandomPlayer());
      setRoundNumber((prev) => prev + 1);
      setTimerKey((prev) => prev + 1);
      setIsAnimating(false);
    }, 300);
  };

  const handleTimerComplete = () => {
    handleSkip();
  };

  const currentPlayer = players[currentPlayerIndex];
  const questionType = currentQuestion
    ? questionTypeMap[currentQuestion.type] || questionTypeMap.QUESTION
    : questionTypeMap.QUESTION;

  return (
    <main className="container-mobile min-h-screen flex flex-col overflow-hidden relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-neon-red/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-4 sm:p-6 w-full">
        <Link href="/game/modes">
          <button className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 group">
            <span className="material-symbols-outlined text-white/80 group-hover:text-white text-xl sm:text-[28px]">
              arrow_back
            </span>
          </button>
        </Link>

        <div className="flex flex-col items-center">
          <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
            สถานะเกม
          </span>
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <span className="text-primary text-xs font-bold tracking-widest uppercase text-glow-purple">
              รอบที่ {roundNumber}
            </span>
          </div>
        </div>

        <Link href="/settings">
          <button className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 group">
            <span className="material-symbols-outlined text-white/80 group-hover:text-white text-xl sm:text-[28px]">
              settings
            </span>
          </button>
        </Link>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-4 sm:px-5 gap-4 sm:gap-6">
        {/* Current Player */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayerIndex}
            className="flex flex-col items-center gap-2 sm:gap-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-primary to-transparent opacity-50 blur-md" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-primary/50 p-1 bg-background shadow-neon-purple">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {currentPlayer?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full border-2 border-background shadow-lg whitespace-nowrap z-10">
                  ตาเล่น
                </div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight drop-shadow-md">
                {currentPlayer}
              </h2>
              <p className="text-white/40 text-xs sm:text-sm font-medium uppercase tracking-widest mt-1">
                ตาของ: {currentPlayer}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              className="w-full relative group"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative bg-[#26182c]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 pt-8 sm:pt-10 pb-6 sm:pb-8 rounded-2xl flex flex-col items-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                {/* Question Type Badge */}
                <div
                  className={`mb-4 sm:mb-6 inline-flex items-center gap-2 px-3 py-1 rounded border border-white/10 bg-white/5`}
                >
                  <span
                    className={`material-symbols-outlined text-sm ${questionType.color}`}
                  >
                    {questionType.icon}
                  </span>
                  <span
                    className={`text-xs font-bold tracking-widest uppercase ${questionType.color}`}
                  >
                    {questionType.label}
                  </span>
                  {currentQuestion.is18Plus && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-neon-red text-white">
                      18+
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <h1 className="text-white text-xl sm:text-[26px] leading-[1.3] font-bold tracking-tight mb-6 sm:mb-8 drop-shadow-lg mx-2">
                  {currentQuestion.text}
                </h1>

                {/* Timer */}
                <Timer
                  key={timerKey}
                  duration={30}
                  onComplete={handleTimerComplete}
                  size="lg"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <footer className="relative z-20 w-full p-4 sm:p-5 pb-6 sm:pb-8 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
          <Button
            onClick={handleSkip}
            variant="neon-red"
            size="xl"
            className="flex flex-col items-center justify-center h-20 sm:h-24"
          >
            <span className="material-symbols-outlined text-white text-2xl sm:text-3xl mb-1">
              local_bar
            </span>
            <span className="text-white text-lg sm:text-xl font-bold uppercase tracking-wider leading-none">
              ข้าม
            </span>
            <span className="text-white/70 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1">
              (ต้องดื่ม!)
            </span>
          </Button>

          <Button
            onClick={handleDone}
            variant="neon-green"
            size="xl"
            className="flex flex-col items-center justify-center h-20 sm:h-24"
          >
            <span className="material-symbols-outlined text-black text-2xl sm:text-3xl mb-1">
              check_circle
            </span>
            <span className="text-black text-lg sm:text-xl font-bold uppercase tracking-wider leading-none">
              ตอบแล้ว
            </span>
            <span className="text-black/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1">
              ตาต่อไป
            </span>
          </Button>
        </div>
      </footer>
    </main>
  );
}
