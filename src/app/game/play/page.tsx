"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button, Timer } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";
import {
  usePlayerQueue,
  useQuestionPool,
  useSoundEffects,
  type GameQuestion,
} from "@/hooks";
import { QUESTION_TYPES, GAME_SETTINGS } from "@/config/gameConstants";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Demo players fallback
const demoPlayers = ["ฉัน", "เพื่อน 1", "เพื่อน 2", "เพื่อน 3", "เพื่อน 4"];

function GamePlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "question";
  const { vibeLevel, soundEnabled, vibrationEnabled } = useGameStore();

  // Load players and settings
  const [players, setPlayers] = useState<string[]>(demoPlayers);
  const [is18PlusEnabled, setIs18PlusEnabled] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<GameQuestion[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(
    null,
  );
  const [timerKey, setTimerKey] = useState(0);
  const [playerDrinks, setPlayerDrinks] = useState<Record<string, number>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const stored18Plus = localStorage.getItem("wongtaek-18plus");
    setIs18PlusEnabled(stored18Plus === "true");

    const savedPlayers = localStorage.getItem("wongtaek-players");
    if (savedPlayers) {
      try {
        const parsed = JSON.parse(savedPlayers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlayers(parsed);
          // Initialize drink counts
          setPlayerDrinks(
            Object.fromEntries(parsed.map((p: string) => [p, 0])),
          );
        }
      } catch {
        setPlayerDrinks(Object.fromEntries(demoPlayers.map((p) => [p, 0])));
      }
    }

    // Load custom questions from lobby
    const savedCustom = localStorage.getItem("wongtaek-custom-questions");
    if (savedCustom) {
      try {
        setCustomQuestions(JSON.parse(savedCustom));
      } catch {
        // Ignore
      }
    }
  }, []);

  // Custom hooks
  const { currentPlayerIndex, currentPlayer, getNextPlayer, playerTurnCount } =
    usePlayerQueue({
      players,
      avoidRepeats: true,
    });

  const { getQuestionForPlayer, markQuestionAnswered, isLoading } =
    useQuestionPool({
      mode,
      level: vibeLevel === "chaos" ? 3 : vibeLevel === "tipsy" ? 2 : 1,
      is18PlusEnabled,
      players,
      customQuestions,
    });

  const {
    playNewQuestion,
    playCountdown,
    playTimeUp,
    playDrink,
    vibrateShort,
    vibrateLong,
  } = useSoundEffects({
    enabled: soundEnabled,
    hapticEnabled: vibrationEnabled,
  });

  // Initialize first question
  useEffect(() => {
    if (!currentQuestion && !isLoading && players.length > 0) {
      const q = getQuestionForPlayer(currentPlayer);
      setCurrentQuestion(q);
      playNewQuestion();
    }
  }, [
    currentQuestion,
    isLoading,
    players,
    currentPlayer,
    getQuestionForPlayer,
    playNewQuestion,
  ]);

  const handleSkip = () => {
    // Player skips = must drink
    setPlayerDrinks((prev) => ({
      ...prev,
      [currentPlayer]: (prev[currentPlayer] || 0) + 1,
    }));
    playDrink();
    vibrateLong();
    nextRound();
  };

  const handleDone = () => {
    // Mark question as answered by this player
    if (currentQuestion) {
      markQuestionAnswered(currentPlayer, currentQuestion.id);
    }
    vibrateShort();
    nextRound();
  };

  const nextRound = () => {
    setIsAnimating(true);

    setTimeout(() => {
      const nextIdx = getNextPlayer();
      const nextPlayer = players[nextIdx];
      const newQuestion = getQuestionForPlayer(nextPlayer);

      setCurrentQuestion(newQuestion);
      setRoundNumber((prev) => prev + 1);
      setTimerKey((prev) => prev + 1);
      setIsAnimating(false);
      playNewQuestion();
    }, 300);
  };

  const handleTimerComplete = () => {
    playTimeUp();
    handleSkip();
  };

  const handleTimerWarning = () => {
    playCountdown();
  };

  const handleEndGame = () => {
    // Save stats for summary page
    const stats = players.map((name) => ({
      name,
      drinkCount: playerDrinks[name] || 0,
      questionsAnswered: playerTurnCount[name] || 0,
    }));
    localStorage.setItem("wongtaek-game-stats", JSON.stringify(stats));
    localStorage.setItem("wongtaek-rounds", roundNumber.toString());
    router.push("/game/summary");
  };

  const questionType = currentQuestion
    ? QUESTION_TYPES[currentQuestion.type] || QUESTION_TYPES.QUESTION
    : QUESTION_TYPES.QUESTION;

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
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <span className="text-primary text-xs font-bold tracking-widest uppercase text-glow-purple">
                รอบที่ {roundNumber}
              </span>
            </div>
            <button
              onClick={handleEndGame}
              className="px-2 py-1 bg-neon-red/20 hover:bg-neon-red/30 rounded-full border border-neon-red/30 text-neon-red text-xs font-bold transition-colors"
            >
              จบเกม
            </button>
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
            key={`player-${currentPlayerIndex}`}
            className="flex flex-col items-center gap-2 sm:gap-3"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-white/40 text-xs sm:text-sm font-medium">
                  🍺 {playerDrinks[currentPlayer] || 0} แก้ว
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={`question-${currentQuestion.id}`}
              className="w-full relative"
              initial={{ opacity: 0, scale: 0.9, rotateY: -15, x: 100 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateY: 15, x: -100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="relative bg-[#26182c]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 pt-8 sm:pt-10 pb-6 sm:pb-8 rounded-2xl flex flex-col items-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                {/* Question Type Badge */}
                <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 px-3 py-1 rounded border border-white/10 bg-white/5">
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
                  duration={GAME_SETTINGS.defaultTimerDuration}
                  onComplete={handleTimerComplete}
                  onWarning={handleTimerWarning}
                  size="lg"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="text-white/60 text-sm animate-pulse">
            กำลังโหลดคำถาม...
          </div>
        )}
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

// Loading fallback
function GamePlayLoading() {
  return (
    <main className="container-mobile min-h-screen flex flex-col items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-white/10 rounded-full"></div>
        <div className="h-6 w-32 bg-white/10 rounded"></div>
        <div className="h-40 w-full max-w-md bg-white/10 rounded-2xl"></div>
      </div>
    </main>
  );
}

export default function GamePlayPage() {
  return (
    <Suspense fallback={<GamePlayLoading />}>
      <GamePlayContent />
    </Suspense>
  );
}
