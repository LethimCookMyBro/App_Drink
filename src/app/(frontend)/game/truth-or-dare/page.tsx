"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GamePauseButton, Timer } from "@/frontend/components/ui";
import { useSoundEffects, useStoredGamePlayers } from "@/frontend/hooks";
import { GAME_SETTINGS } from "@/shared/config/gameConstants";
import {
  finalizeStoredGameSummary,
  tryRecordCompletedGameRound,
} from "@/frontend/game/gameSession";

export default function TruthOrDarePage() {
  const router = useRouter();
  const { hasStartedGame, players, isReady, room } =
    useStoredGamePlayers("/game/truth-or-dare");
  const [timerKey, setTimerKey] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isRoundSyncing, setIsRoundSyncing] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const activeSession = room?.activeSession ?? null;
  const activePlayer =
    room?.players.find((player) => player.id === activeSession?.currentPlayerId) ??
    null;
  const activePlayerName = activePlayer?.name ?? players[0] ?? "";
  const activePlayerDrinks = activePlayer?.drinkCount ?? 0;
  const questionText = activeSession?.currentQuestionText ?? "";
  const isTruth = activeSession?.currentQuestionType === "TRUTH";
  const roundNumber = (activeSession?.roundCount ?? 0) + 1;

  const {
    playNewQuestion,
    playDrink,
    playCountdown,
    playTimeUp,
    vibrateLong,
    vibrateShort,
  } = useSoundEffects();

  useEffect(() => {
    if (activeSession?.currentQuestionText) {
      playNewQuestion();
    }
  }, [activeSession?.currentQuestionId, activeSession?.currentQuestionText, playNewQuestion]);

  const handleComplete = async () => {
    if (!activePlayerName) return;
    if (isRoundSyncing || isEndingGame) return;

    setIsRoundSyncing(true);
    const syncResult = await tryRecordCompletedGameRound("ANSWERED", 0);
    if (!syncResult.ok) {
      window.alert(syncResult.error);
      setIsRoundSyncing(false);
      return;
    }

    vibrateShort();
    setIsTimerPaused(false);
    setTimerKey((prev) => prev + 1);
    setIsRoundSyncing(false);
  };

  const handleGiveUp = async () => {
    if (!activePlayerName) return;
    if (isRoundSyncing || isEndingGame) return;

    setIsRoundSyncing(true);
    const syncResult = await tryRecordCompletedGameRound("GAVE_UP", 2);
    if (!syncResult.ok) {
      window.alert(syncResult.error);
      setIsRoundSyncing(false);
      return;
    }

    playDrink();
    vibrateLong();
    setIsTimerPaused(false);
    setTimerKey((prev) => prev + 1);
    setIsRoundSyncing(false);
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
    const completion = await finalizeStoredGameSummary();
    if (!completion.ok) {
      window.alert(completion.error || "ไม่สามารถปิดเกมบนเซิร์ฟเวอร์ได้");
      setIsEndingGame(false);
      return;
    }

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

  if (!activeSession || !questionText) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center px-6">
        <div className="animate-pulse text-center text-white/40">
          กำลังซิงก์สถานะเกม...
        </div>
      </main>
    );
  }

  return (
    <main className="container-mobile min-h-[100dvh] flex flex-col overflow-hidden bg-surface">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-neon-red/10 to-transparent pointer-events-none z-0 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none z-0" />

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

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-4 pb-5 sm:px-5 lg:px-8">
        <div className="flex flex-col items-center gap-4 pt-3">
          <motion.div
            key={`${activeSession.currentPlayerId}-${activeSession.roundCount}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-neon-red flex items-center justify-center mb-4 shadow-neon-purple">
              <span className="text-4xl font-bold text-white">
                {activePlayerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-white text-3xl font-bold">{activePlayerName}</h2>
            <p className="text-white/50 mt-2">🍺 {activePlayerDrinks} แก้ว</p>
          </motion.div>

          <motion.div
            key={`${activeSession.currentQuestionId}-${activeSession.roundCount}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-4xl rounded-3xl border-2 p-8 ${
              isTruth
                ? "border-neon-blue/40 bg-gradient-to-br from-neon-blue/10 to-primary/5"
                : "border-neon-red/40 bg-gradient-to-br from-neon-red/10 to-primary/5"
            }`}
          >
            <div className="text-center mb-6">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
                  isTruth
                    ? "bg-neon-blue/20 text-neon-blue"
                    : "bg-neon-red/20 text-neon-red"
                }`}
              >
                {isTruth ? "Truth" : "Dare"}
              </span>
            </div>

            <h1 className="text-white text-2xl sm:text-4xl font-bold text-center leading-tight mb-8">
              {questionText}
            </h1>

            <div className="flex justify-center mb-6">
              <Timer
                key={timerKey}
                duration={GAME_SETTINGS.defaultTimerDuration}
                onComplete={handleTimerComplete}
                onWarning={handleTimerWarning}
                isPaused={isTimerPaused}
                size="lg"
              />
            </div>

            <div className="text-center">
              <GamePauseButton
                isPaused={isTimerPaused}
                onToggle={toggleTimerPaused}
              />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button
            onClick={() => void handleGiveUp()}
            variant="neon-red"
            size="xl"
            className="min-h-[5.5rem]"
            disabled={isRoundSyncing || isEndingGame}
          >
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-3xl mb-1">
                local_bar
              </span>
              <span className="font-bold">ยอมแพ้</span>
            </div>
          </Button>

          <Button
            onClick={() => void handleComplete()}
            variant="primary"
            size="xl"
            className="min-h-[5.5rem]"
            disabled={isRoundSyncing || isEndingGame}
          >
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-3xl mb-1">
                check_circle
              </span>
              <span className="font-bold">ทำสำเร็จ</span>
            </div>
          </Button>
        </div>
      </div>
    </main>
  );
}
