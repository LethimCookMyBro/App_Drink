"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button, GamePauseButton, Timer } from "@/components/ui";
import {
  useStoredGamePlayers,
  useSoundEffects,
  usePlayerQueue,
  useQuestionPool,
  type GameQuestion,
} from "@/hooks";
import { useGameStore } from "@/store/gameStore";
import { GAME_SETTINGS, getQuestionLevelForVibe } from "@/config/gameConstants";
import {
  buildStoredPlayerStats,
  getPlayerCount,
  incrementPlayerCount,
  type PlayerCountMap,
  syncPlayerCountMap,
} from "@/lib/gamePlayerStats";
import {
  clearActiveGameSession,
  completeStoredGameSession,
  recordCompletedGameRound,
  saveGameSummary,
} from "@/lib/gameSession";

export default function TruthOrDarePage() {
  const router = useRouter();
  const { vibeLevel } = useGameStore();
  const is18PlusEnabled = vibeLevel === "chaos";
  const { hasStartedGame, players, isReady } =
    useStoredGamePlayers("/game/truth-or-dare");
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(
    null,
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [playerDrinks, setPlayerDrinks] = useState<PlayerCountMap>({});
  const [timerKey, setTimerKey] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isRoundSyncing, setIsRoundSyncing] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPlayerDrinks((current) => syncPlayerCountMap(players, current));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [players]);

  const { currentPlayer, getNextPlayer, playerTurnCount } = usePlayerQueue({
    players: isReady ? players : ["Loading"],
    avoidRepeats: true,
  });
  const activePlayerName = currentPlayer || players[0] || "";
  const activePlayerDrinks = getPlayerCount(playerDrinks, activePlayerName);

  const { getQuestionForPlayer, markQuestionAnswered, isLoading } =
    useQuestionPool({
      mode: "truth-or-dare",
      level: getQuestionLevelForVibe(vibeLevel),
      is18PlusEnabled,
      players: isReady ? players : ["Loading"],
    });

  const {
    playNewQuestion,
    playDrink,
    playCountdown,
    playTimeUp,
    vibrateLong,
    vibrateShort,
  } = useSoundEffects();

  useEffect(() => {
    if (!currentQuestion && !isLoading && isReady && players.length > 0) {
      const q = getQuestionForPlayer(currentPlayer);
      if (q) {
        const timeoutId = window.setTimeout(() => {
          setCurrentQuestion(q);
          playNewQuestion();
        }, 0);

        return () => window.clearTimeout(timeoutId);
      }
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

  const handleComplete = async () => {
    if (!currentPlayer) return;
    if (isRoundSyncing || isEndingGame) return;

    setIsRoundSyncing(true);

    try {
      await recordCompletedGameRound(roundNumber, 0);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "ไม่สามารถบันทึกรอบเกมลงเซิร์ฟเวอร์ได้",
      );
      setIsRoundSyncing(false);
      return;
    }

    if (currentQuestion) {
      markQuestionAnswered(currentPlayer, currentQuestion.id);
    }
    vibrateShort();
    nextCard();
  };

  const handleGiveUp = async () => {
    if (!activePlayerName) return;
    if (isRoundSyncing || isEndingGame) return;

    setIsRoundSyncing(true);

    try {
      await recordCompletedGameRound(roundNumber, 2);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "ไม่สามารถบันทึกรอบเกมลงเซิร์ฟเวอร์ได้",
      );
      setIsRoundSyncing(false);
      return;
    }

    if (currentQuestion) {
      markQuestionAnswered(currentPlayer, currentQuestion.id);
    }
    setPlayerDrinks((prev) => incrementPlayerCount(prev, activePlayerName, 2));
    playDrink();
    vibrateLong();
    nextCard();
  };

  const nextCard = () => {
    setIsTimerPaused(false);
    setTimeout(() => {
      const nextIdx = getNextPlayer();
      const nextPlayer = players[nextIdx] || currentPlayer;
      const q = getQuestionForPlayer(nextPlayer);
      if (q) {
        setCurrentQuestion(q);
      }
      setRoundNumber((prev) => prev + 1);
      setTimerKey((prev) => prev + 1);
      playNewQuestion();
      setIsRoundSyncing(false);
    }, 300);
  };

  const handleTimerComplete = () => {
    playTimeUp();
    void handleGiveUp();
  };

  const handleTimerWarning = () => {
    playCountdown();
  };

  const handleEndGame = async () => {
    if (isEndingGame || isRoundSyncing) return;

    setIsEndingGame(true);

    const summaryStats = buildStoredPlayerStats(
      players,
      playerDrinks,
      playerTurnCount,
    );
    const completion = await completeStoredGameSession();
    if (!completion.ok) {
      window.alert(completion.error || "ไม่สามารถปิดเกมบนเซิร์ฟเวอร์ได้");
      setIsEndingGame(false);
      return;
    }

    saveGameSummary(summaryStats, completion.roundCount);
    clearActiveGameSession();
    router.push("/game/summary");
  };

  const toggleTimerPaused = () => {
    setIsTimerPaused((current) => !current);
  };

  if (hasStartedGame === null) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center px-6">
        <div className="animate-pulse text-center text-white/40">กำลังโหลด...</div>
      </main>
    );
  }

  if (!hasStartedGame || !isReady || players.length === 0) {
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
          <Button
            onClick={() => router.push("/create")}
            variant="primary"
            size="lg"
            icon="play_arrow"
            iconPosition="left"
          >
            เริ่มเกมเลย
          </Button>
        </div>
      </main>
    );
  }

  const isTruth = currentQuestion?.type === "TRUTH";

  return (
    <main className="container-mobile min-h-[100dvh] flex flex-col overflow-hidden bg-surface">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-neon-red/10 to-transparent pointer-events-none z-0 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 w-full">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pb-2 pt-6 sm:px-5 sm:pt-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => router.push("/game/modes")}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[28px]">
                arrow_back
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold tracking-[0.22em] text-primary">
              รอบ {roundNumber}
            </div>
            <GamePauseButton
              isPaused={isTimerPaused}
              onToggle={toggleTimerPaused}
            />
            <button
              onClick={handleEndGame}
              disabled={isEndingGame || isRoundSyncing}
              className="flex items-center gap-2 rounded-full border border-neon-red/35 bg-neon-red/14 px-4 py-2 text-sm font-bold text-neon-red transition-colors hover:bg-neon-red/22"
            >
              <span className="material-symbols-outlined text-lg">stop</span>
              จบเกม
            </button>
          </div>
          <Link
            href="/settings"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[28px]">
              settings
            </span>
          </Link>
        </div>
      </header>

      {/* Card */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-3 pt-2 sm:px-5 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
        <div className="mb-4 flex w-full items-start justify-between gap-4 lg:mb-0 lg:w-[17rem] lg:flex-col lg:justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
              ตาของ
            </p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {activePlayerName?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold leading-none tracking-tight">
                  {activePlayerName}
                </h2>
                <span className="text-white/40 text-xs">
                  🍺 {activePlayerDrinks} แก้ว
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase">
              โหมด
            </p>
            <p className="text-lg font-bold text-white">Truth or Dare</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-sm lg:text-left">
            <p className="text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase">
              สรุปตานี้
            </p>
            <p className="text-sm text-white/70">รอบ {roundNumber}</p>
            <p className="text-sm text-white/70">ดื่ม {activePlayerDrinks} แก้ว</p>
          </div>
        </div>

        <div className="w-full relative flex flex-col lg:max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion?.id ?? "pending-question"}
              className={`
                relative flex-1 w-full min-h-[24rem] max-h-[66dvh] lg:min-h-[31rem] rounded-3xl border
                ${isTruth ? "border-neon-blue shadow-neon-blue" : "border-neon-red shadow-neon-red"}
                bg-[#1a0f1a] flex flex-col overflow-hidden ring-1 ring-inset ring-white/10
              `}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.4 }}
            >
              {/* Top Badge */}
              <div
                className={`relative h-24 bg-gradient-to-b ${
                  isTruth ? "from-neon-blue/20" : "from-neon-red/20"
                } to-transparent p-4 sm:p-5 flex items-start justify-between gap-3 z-20`}
              >
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold ${isTruth ? "text-neon-blue" : "text-neon-red"} tracking-widest mb-0.5`}
                  >
                    {isTruth ? "คำถาม" : "ภารกิจ"}
                  </span>
                  <div
                    className={`flex items-center gap-2 ${isTruth ? "text-neon-blue" : "text-neon-red"}`}
                  >
                    <span
                      className={`material-symbols-outlined text-4xl drop-shadow-[0_0_12px_${
                        isTruth ? "rgba(0,240,255,0.6)" : "rgba(255,0,64,0.6)"
                      }]`}
                    >
                      {isTruth ? "psychology_alt" : "local_fire_department"}
                    </span>
                    <span
                      className={`text-2xl sm:text-3xl font-bold tracking-tighter ${isTruth ? "text-glow" : "text-glow-red"}`}
                    >
                      {isTruth ? "ความจริง" : "คำท้า"}
                    </span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full border ${
                    isTruth
                      ? "border-neon-blue/40 bg-neon-blue/10 text-neon-blue"
                      : "border-neon-red/40 bg-neon-red/10 text-neon-red"
                  } text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shrink-0`}
                >
                  {isTruth ? "เปิดใจ 💙" : "เผ็ดร้อน 🔥"}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-5 py-5 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center relative z-10">
                <motion.div
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 ${
                    isTruth ? "bg-neon-blue/20" : "bg-neon-red/20"
                  } rounded-full blur-[60px] pointer-events-none`}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="relative max-w-[24ch] text-xl sm:text-2xl lg:text-[2rem] font-bold leading-relaxed text-white drop-shadow-md tracking-tight">
                  {currentQuestion?.text ?? ""}
                </p>
                <div className="mt-6">
                  <Timer
                    key={timerKey}
                    duration={GAME_SETTINGS.defaultTimerDuration}
                    onComplete={handleTimerComplete}
                    onWarning={handleTimerWarning}
                    isPaused={isTimerPaused || !currentQuestion || isLoading}
                    size="md"
                  />
                </div>
                <GamePauseButton
                  isPaused={isTimerPaused}
                  onToggle={toggleTimerPaused}
                  className="mt-4 min-w-[10.5rem] justify-center self-center text-sm shadow-[0_0_24px_rgba(251,255,0,0.16)]"
                />
                {isTimerPaused && (
                  <div className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70">
                    เวลาถูกหยุดไว้ กดเล่นต่อเมื่อพร้อม
                  </div>
                )}
              </div>

              {/* Bottom Gradient */}
              <div className="h-1/4 relative overflow-hidden mt-auto border-t border-white/5">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-[#1a0f1a]/80 to-transparent z-10" />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Card Stack Effect */}
          <div className="absolute -bottom-3 left-6 right-6 h-4 bg-surface border border-white/10 rounded-b-3xl -z-10 opacity-60" />
          <div className="absolute -bottom-6 left-10 right-10 h-4 bg-surface border border-white/5 rounded-b-3xl -z-20 opacity-30" />
        </div>
      </div>

      {isLoading && (
        <div className="text-white/40 text-sm text-center pb-2">
          กำลังโหลดคำถาม...
        </div>
      )}

      {/* Buttons */}
      <footer className="relative z-20 w-full bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 pb-6 pt-4 sm:px-5 lg:flex-row lg:px-8">
          <Button
            onClick={() => void handleComplete()}
            variant="primary"
            size="xl"
            fullWidth
            icon="check_circle"
            className="lg:flex-1"
            disabled={isRoundSyncing || isEndingGame}
          >
            ทำเสร็จแล้ว
          </Button>

          <button
            onClick={() => void handleGiveUp()}
            disabled={isRoundSyncing || isEndingGame}
            className="group relative w-full h-14 rounded-xl border border-white/10 bg-white/5 text-white/60 font-medium text-base tracking-wide overflow-hidden active:scale-[0.98] transition-all hover:bg-white/10 hover:border-white/20 hover:text-white lg:flex-1"
          >
            <span className="relative flex items-center justify-between px-5 w-full h-full">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">close</span>
              ยอมแพ้
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-red/10 border border-neon-red/20">
              <span className="material-symbols-outlined text-neon-red text-lg">
                local_bar
              </span>
              <span className="text-neon-red text-sm font-bold uppercase tracking-wider">
                ดื่ม x2
              </span>
            </span>
            </span>
          </button>
        </div>
      </footer>
    </main>
  );
}
