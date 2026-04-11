"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GamePauseButton, Timer } from "@/frontend/components/ui";
import { useSoundEffects, useStoredGamePlayers } from "@/frontend/hooks";
import { GAME_SETTINGS } from "@/shared/config/gameConstants";
import {
  finalizeStoredGameSummary,
  tryRecordCompletedGameRound,
} from "@/frontend/game/gameSession";

export default function ChaosModePage() {
  const router = useRouter();
  const { hasStartedGame, players, isReady, room } =
    useStoredGamePlayers("/game/chaos");
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
  const ruleText = activeSession?.currentQuestionText ?? "";
  const roundNumber = (activeSession?.roundCount ?? 0) + 1;

  const {
    playNewQuestion,
    playDrink,
    playCountdown,
    playTimeUp,
    vibratePattern,
  } = useSoundEffects();

  useEffect(() => {
    if (activeSession?.currentQuestionText) {
      playNewQuestion();
    }
  }, [activeSession?.currentQuestionId, activeSession?.currentQuestionText, playNewQuestion]);

  const handleNext = async () => {
    if (!activePlayerName) return;
    if (isRoundSyncing || isEndingGame) return;

    setIsRoundSyncing(true);
    const syncResult = await tryRecordCompletedGameRound("DRANK", 1);
    if (!syncResult.ok) {
      window.alert(syncResult.error);
      setIsRoundSyncing(false);
      return;
    }

    playDrink();
    vibratePattern([50, 30, 100]);
    setIsTimerPaused(false);
    setTimerKey((prev) => prev + 1);
    setIsRoundSyncing(false);
  };

  const handleTimerComplete = () => {
    playTimeUp();
    void handleNext();
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
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center bg-[#0a050b] px-6">
        <div className="animate-pulse text-center text-white/40">กำลังโหลด...</div>
      </main>
    );
  }

  if (!hasStartedGame || !isReady || players.length === 0) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center bg-[#0a050b] px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-24 h-24 rounded-full bg-neon-red/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-neon-red">
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
          <button
            onClick={() => router.push("/create")}
            className="px-6 py-3 rounded-2xl bg-neon-red text-black font-bold"
          >
            เริ่มเกมเลย
          </button>
        </div>
      </main>
    );
  }

  if (!activeSession || !ruleText) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center bg-[#0a050b] px-6">
        <div className="animate-pulse text-center text-white/40">
          กำลังซิงก์สถานะเกม...
        </div>
      </main>
    );
  }

  return (
    <main className="container-mobile min-h-[100dvh] flex flex-col relative overflow-hidden bg-[#0a050b]">
      <div className="fixed inset-0 z-50 pointer-events-none crt-overlay opacity-30 mix-blend-overlay" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-red/20 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-between p-4 safe-area-bottom sm:px-5 lg:px-8">
        <div className="w-full flex flex-col gap-4 pt-4 sm:pt-6">
          <div className="flex items-center justify-between gap-3 px-1 sm:px-2">
            <button
              onClick={() => router.push("/game/modes")}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[28px]">
                arrow_back
              </span>
            </button>
            <div className="flex flex-wrap items-center justify-center gap-2">
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
          <div className="flex items-center justify-between gap-3 px-1 sm:px-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-red to-orange-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {activePlayerName?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">
                  ตาของ
                </p>
                <p className="text-white text-lg font-bold">{activePlayerName}</p>
                <p className="text-white/40 text-xs">🍺 {activePlayerDrinks} แก้ว</p>
              </div>
            </div>
            <div className="rounded-full border border-[#ffb400]/30 bg-[#ffb400]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#ffcc66]">
              chaos live
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 py-8">
          <div className="w-full max-w-4xl rounded-[2rem] border border-neon-red/45 bg-[linear-gradient(180deg,rgba(49,10,18,0.96),rgba(22,7,12,0.98))] p-8 shadow-[0_0_80px_rgba(255,0,64,0.12)]">
            <div className="mb-6 flex items-center justify-center gap-2">
              {[1, 2, 3].map((item) => (
                <span
                  key={item}
                  className="material-symbols-outlined text-3xl text-[#ffb400]"
                >
                  warning
                </span>
              ))}
            </div>
            <h1 className="text-center text-[2.4rem] sm:text-[3.6rem] font-black uppercase leading-[0.95] tracking-[-0.05em] text-white drop-shadow-[3px_3px_0_rgba(0,255,255,0.9)]">
              {ruleText}
            </h1>
            <div className="mt-8 flex justify-center">
              <Timer
                key={timerKey}
                duration={GAME_SETTINGS.defaultTimerDuration}
                onComplete={handleTimerComplete}
                onWarning={handleTimerWarning}
                isPaused={isTimerPaused}
                size="lg"
              />
            </div>
            <div className="mt-6 text-center">
              <GamePauseButton
                isPaused={isTimerPaused}
                onToggle={toggleTimerPaused}
              />
            </div>
          </div>
        </div>

        <div className="pb-4">
          <button
            onClick={() => void handleNext()}
            disabled={isEndingGame || isRoundSyncing}
            className="w-full rounded-[2rem] border border-[#ffb400]/30 bg-[#ffb400]/12 px-6 py-5 text-lg font-black uppercase tracking-[0.24em] text-[#ffcc66] transition-colors hover:bg-[#ffb400]/18"
          >
            ไปตาต่อไป
          </button>
        </div>
      </div>
    </main>
  );
}
