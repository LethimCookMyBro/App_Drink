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

export const dynamic = "force-dynamic";

function GamePlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "question";
  const { vibeLevel, soundEnabled, vibrationEnabled } = useGameStore();

  // State
  const [players, setPlayers] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [is18PlusEnabled, setIs18PlusEnabled] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<GameQuestion[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(
    null,
  );
  const [timerKey, setTimerKey] = useState(0);
  const [playerDrinks, setPlayerDrinks] = useState<Record<string, number>>({});

  // Load players from localStorage on mount
  useEffect(() => {
    const stored18Plus = localStorage.getItem("wongtaek-18plus");
    setIs18PlusEnabled(stored18Plus === "true");

    const savedPlayers = localStorage.getItem("wongtaek-players");
    if (savedPlayers) {
      try {
        const parsed = JSON.parse(savedPlayers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlayers(parsed);
          setPlayerDrinks(
            Object.fromEntries(parsed.map((p: string) => [p, 0])),
          );
          setIsReady(true);
        }
        // If no valid players, isReady stays false -> shows access denied message
      } catch {
        // Parse error, isReady stays false -> shows access denied message
      }
    }
    // If no saved players, isReady stays false -> shows access denied message

    // Load custom questions
    const savedCustom = localStorage.getItem("wongtaek-custom-questions");
    if (savedCustom) {
      try {
        setCustomQuestions(JSON.parse(savedCustom));
      } catch {
        // Ignore
      }
    }
  }, []);

  // Hooks - only initialize when players are ready
  const { currentPlayerIndex, currentPlayer, getNextPlayer, playerTurnCount } =
    usePlayerQueue({
      players: isReady ? players : ["Loading"],
      avoidRepeats: true,
    });

  const { getQuestionForPlayer, markQuestionAnswered, isLoading } =
    useQuestionPool({
      mode,
      level: vibeLevel === "chaos" ? 3 : vibeLevel === "tipsy" ? 2 : 1,
      is18PlusEnabled,
      players: isReady ? players : ["Loading"],
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

  // Initialize first question when ready
  useEffect(() => {
    if (!currentQuestion && !isLoading && isReady && players.length > 0) {
      const q = getQuestionForPlayer(currentPlayer);
      setCurrentQuestion(q);
      playNewQuestion();
    }
  }, [
    currentQuestion,
    isLoading,
    isReady,
    players,
    currentPlayer,
    getQuestionForPlayer,
    playNewQuestion,
  ]);

  const handleSkip = () => {
    setPlayerDrinks((prev) => ({
      ...prev,
      [currentPlayer]: (prev[currentPlayer] || 0) + 1,
    }));
    playDrink();
    vibrateLong();
    nextRound();
  };

  const handleDone = () => {
    if (currentQuestion) {
      markQuestionAnswered(currentPlayer, currentQuestion.id);
    }
    vibrateShort();
    nextRound();
  };

  const nextRound = () => {
    setTimeout(() => {
      const nextIdx = getNextPlayer();
      const nextPlayer = players[nextIdx];
      const newQuestion = getQuestionForPlayer(nextPlayer);

      setCurrentQuestion(newQuestion);
      setRoundNumber((prev) => prev + 1);
      setTimerKey((prev) => prev + 1);
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
    const stats = players.map((name) => ({
      name,
      drinkCount: playerDrinks[name] || 0,
      questionsAnswered: playerTurnCount[name] || 0,
    }));
    localStorage.setItem("wongtaek-game-stats", JSON.stringify(stats));
    localStorage.setItem("wongtaek-rounds", roundNumber.toString());
    router.push("/game/summary");
  };

  // Don't render until players are loaded - show access denied message
  if (!isReady || players.length === 0) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary">
              sports_esports
            </span>
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">
              ยังไม่ได้เริ่มเกม
            </h1>
            <p className="text-white/60 text-sm">
              กรุณากด &quot;เริ่มเกมเลย&quot; จากหน้าหลักก่อน
              <br />
              เพื่อตั้งค่าผู้เล่นและเริ่มเกม
            </p>
          </div>
          <Link href="/">
            <Button variant="primary" size="lg" icon="home" iconPosition="left">
              กลับหน้าหลัก
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const questionType = currentQuestion
    ? QUESTION_TYPES[currentQuestion.type] || QUESTION_TYPES.QUESTION
    : QUESTION_TYPES.QUESTION;

  return (
    <main className="container-mobile min-h-screen flex flex-col overflow-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-neon-red/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-3 sm:p-5 w-full">
        <Link href="/game/modes">
          <button className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95">
            <span className="material-symbols-outlined text-white/80 text-2xl sm:text-3xl">
              arrow_back
            </span>
          </button>
        </Link>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <span className="text-primary text-sm font-bold tracking-widest uppercase text-glow-purple">
                รอบ {roundNumber}
              </span>
            </div>
            <button
              onClick={handleEndGame}
              className="px-3 py-1.5 bg-neon-red/20 hover:bg-neon-red/30 rounded-full border border-neon-red/30 text-neon-red text-sm font-bold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">stop</span>
              จบ
            </button>
          </div>
        </div>

        <Link href="/settings">
          <button className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95">
            <span className="material-symbols-outlined text-white/80 text-2xl sm:text-3xl">
              settings
            </span>
          </button>
        </Link>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-4 gap-5">
        {/* Current Player */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`player-${currentPlayerIndex}`}
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-b from-primary to-transparent opacity-50 blur-lg" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-primary/50 p-1 bg-background shadow-neon-purple">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-bold text-white">
                    {currentPlayer?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-background shadow-lg whitespace-nowrap z-10">
                  ตาเล่น
                </div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
                {currentPlayer}
              </h2>
              <span className="text-white/50 text-sm">
                🍺 {playerDrinks[currentPlayer] || 0} แก้ว
              </span>
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
              <div className="relative bg-[#26182c]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 pt-8 pb-6 rounded-2xl flex flex-col items-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                {/* Question Type Badge */}
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                  <span
                    className={`material-symbols-outlined text-lg ${questionType.color}`}
                  >
                    {questionType.icon}
                  </span>
                  <span
                    className={`text-sm font-bold tracking-wider uppercase ${questionType.color}`}
                  >
                    {questionType.label}
                  </span>
                  {currentQuestion.is18Plus && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neon-red text-white">
                      18+
                    </span>
                  )}
                  {currentQuestion.isCustom && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white">
                      พิเศษ
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <h1 className="text-white text-xl sm:text-2xl leading-relaxed font-bold tracking-tight mb-6 drop-shadow-lg">
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
      <footer className="relative z-20 w-full p-4 pb-6 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-4 w-full">
          <Button
            onClick={handleSkip}
            variant="neon-red"
            size="xl"
            className="flex flex-col items-center justify-center h-24"
          >
            <span className="material-symbols-outlined text-white text-3xl mb-1">
              local_bar
            </span>
            <span className="text-white text-xl font-bold uppercase tracking-wider">
              ข้าม
            </span>
            <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
              (ต้องดื่ม!)
            </span>
          </Button>

          <Button
            onClick={handleDone}
            variant="neon-green"
            size="xl"
            className="flex flex-col items-center justify-center h-24"
          >
            <span className="material-symbols-outlined text-black text-3xl mb-1">
              check_circle
            </span>
            <span className="text-black text-xl font-bold uppercase tracking-wider">
              ตอบแล้ว
            </span>
            <span className="text-black/60 text-[10px] font-bold uppercase tracking-widest mt-1">
              ตาต่อไป
            </span>
          </Button>
        </div>
      </footer>
    </main>
  );
}

function GamePlayLoading() {
  return (
    <main className="container-mobile min-h-screen flex flex-col items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="h-6 w-40 bg-white/10 rounded"></div>
        <div className="h-48 w-full max-w-md bg-white/10 rounded-2xl"></div>
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
