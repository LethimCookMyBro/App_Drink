"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePlayerQueue, useSoundEffects, useStoredGamePlayers } from "@/hooks";
import { useGameStore } from "@/store/gameStore";
import { GamePauseButton, Timer } from "@/components/ui";
import { GAME_SETTINGS } from "@/config/gameConstants";
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

const chaosRules = [
  { target: "ใครที่ใส่เสื้อสีดำ", action: "ดื่มให้หมดแก้ว!" },
  { target: "คนที่อายุน้อยที่สุด", action: "เลือกคนดื่ม 2 แก้ว" },
  { target: "คนที่ถือมือถือ", action: "ดื่มทันทีแล้ววางมือถือ" },
  { target: "ทุกคนในวง", action: "ดื่มพร้อมกัน 3 วิ!" },
  { target: "คนที่หัวเราะก่อน", action: "โดนจี้ 10 ครั้ง" },
  { target: "คนนั่งซ้ายมือ", action: "เลือกเพลงให้ร้อง!" },
  { target: "คนใส่แว่น", action: "ดื่ม 2 แก้ว!" },
  { target: "คนผมยาวสุด", action: "แชร์ความลับ 1 เรื่อง" },
];

const chaosRules18Plus = [
  { target: "คนโสดในวง", action: "เล่าเดทที่แซ่บสุด!" },
  { target: "คนที่เขินง่ายที่สุด", action: "ตอบคำถาม 18+ แบบไม่อ้อมค้อม" },
  { target: "คนที่ชอบปาร์ตี้ที่สุด", action: "เลือกคนจูบแก้วเดียวกัน" },
];

export default function ChaosModePage() {
  const router = useRouter();
  const { vibeLevel } = useGameStore();
  const is18PlusEnabled = vibeLevel === "chaos";
  const { hasStartedGame, players, isReady } =
    useStoredGamePlayers("/game/chaos");
  const [sequence, setSequence] = useState(1);
  const [currentRule, setCurrentRule] = useState(chaosRules[0]);
  const [playerDrinks, setPlayerDrinks] = useState<PlayerCountMap>({});
  const [timerKey, setTimerKey] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isRoundSyncing, setIsRoundSyncing] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);

  const availableRules = useMemo(
    () =>
      is18PlusEnabled ? [...chaosRules, ...chaosRules18Plus] : chaosRules,
    [is18PlusEnabled],
  );

  const {
    playNewQuestion,
    playDrink,
    playCountdown,
    playTimeUp,
    vibratePattern,
  } = useSoundEffects();

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

  const handleNext = async () => {
    if (!activePlayerName) return;
    if (isRoundSyncing || isEndingGame) return;

    setIsRoundSyncing(true);

    try {
      await recordCompletedGameRound(sequence, 1);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "ไม่สามารถบันทึกรอบเกมลงเซิร์ฟเวอร์ได้",
      );
      setIsRoundSyncing(false);
      return;
    }

    setIsTimerPaused(false);
    setPlayerDrinks((prev) => incrementPlayerCount(prev, activePlayerName));
    playDrink();
    vibratePattern([50, 30, 100]);

    setTimeout(() => {
      getNextPlayer();
      const randomIndex = Math.floor(Math.random() * availableRules.length);
      setCurrentRule(availableRules[randomIndex]);
      setSequence((prev) => prev + 1);
      setTimerKey((prev) => prev + 1);
      playNewQuestion();
      setIsRoundSyncing(false);
    }, 300);
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

  return (
    <main className="container-mobile min-h-[100dvh] flex flex-col relative overflow-hidden bg-[#0a050b]">
      {/* CRT Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none crt-overlay opacity-30 mix-blend-overlay" />

      {/* Glow Background */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-red/20 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-between p-4 safe-area-bottom sm:px-5 lg:px-8">
        {/* Top Section */}
        <div className="w-full flex flex-col gap-4 pt-4 sm:pt-6">
          {/* Header with End Game */}
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
                รอบ {sequence}
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

          {/* Hazard Stripe */}
          <div className="w-full h-3 hazard-stripe opacity-80 border-x-4 border-white/20" />

          {/* Warning Icons */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="material-symbols-outlined text-neon-yellow text-5xl material-symbols-filled"
                animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
              >
                warning
              </motion.span>
            ))}
          </div>

          {/* Title */}
          <div className="relative group">
            <div className="absolute inset-0 bg-neon-red blur opacity-20" />
            <h1 className="relative text-center text-neon-yellow text-2xl font-bold tracking-wider uppercase border-y border-neon-yellow/30 py-2 mx-4 bg-[#0a050b]/80 backdrop-blur-sm">
              ⚠️ โหมดโกลาหล! ⚠️
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center gap-5 w-full max-w-4xl mx-auto relative lg:gap-7"
          key={currentRule.target + currentRule.action}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-red/5 to-transparent skew-y-12 pointer-events-none" />

          {/* Target */}
          <p
            className="max-w-3xl text-white/90 text-2xl md:text-3xl lg:text-4xl font-bold text-center uppercase tracking-wide leading-relaxed px-2"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}
          >
            {currentRule.target}
          </p>

          {/* Action */}
          <div className="relative w-full max-w-3xl text-center py-5 sm:py-6">
            <div className="absolute top-0 left-2 w-8 h-8 border-t-4 border-l-4 border-neon-red" />
            <div className="absolute top-0 right-2 w-8 h-8 border-t-4 border-r-4 border-neon-red" />
            <div className="absolute bottom-0 left-2 w-8 h-8 border-b-4 border-l-4 border-neon-red" />
            <div className="absolute bottom-0 right-2 w-8 h-8 border-b-4 border-r-4 border-neon-red" />

            <h2 className="px-6 text-[2.5rem] sm:text-[3rem] md:text-[4rem] lg:text-[4.5rem] leading-[1.05] font-black text-white uppercase tracking-tighter glitch-text transform -rotate-1 whitespace-pre-wrap break-words">
              {currentRule.action}
            </h2>
          </div>

          {/* Mandatory Label */}
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <span className="material-symbols-outlined text-neon-red text-lg">
              lock
            </span>
            <span className="text-sm font-mono text-gray-400 uppercase tracking-widest">
              กฎบังคับ (Mandatory)
            </span>
          </div>
          <Timer
            key={timerKey}
            duration={GAME_SETTINGS.defaultTimerDuration}
            onComplete={handleTimerComplete}
            onWarning={handleTimerWarning}
            isPaused={isTimerPaused}
            size="md"
          />
          <GamePauseButton
            isPaused={isTimerPaused}
            onToggle={toggleTimerPaused}
            className="min-w-[10.5rem] justify-center text-sm shadow-[0_0_24px_rgba(251,255,0,0.16)]"
          />
          {isTimerPaused && (
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70">
              เวลาถูกหยุดไว้ กดเล่นต่อเมื่อพร้อม
            </div>
          )}
        </motion.div>

        {/* Bottom Section */}
        <div className="w-full pb-4 pt-4 flex flex-col items-center gap-4 sm:pb-6">
          <motion.button
            onClick={() => void handleNext()}
            className="relative w-full max-w-3xl group overflow-hidden rounded-xl shadow-[0_0_40px_rgba(255,0,64,0.3)] active:scale-[0.98] transition-transform duration-100"
            whileTap={{ scale: 0.98 }}
            disabled={isRoundSyncing || isEndingGame}
          >
            <div className="absolute inset-0 bg-neon-red" />
            <div className="absolute inset-0 hazard-stripe opacity-10" />
            <div className="relative flex items-center justify-between h-20 px-6 sm:px-8">
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-mono text-black font-bold uppercase tracking-widest opacity-60">
                  Sequence {String(sequence).padStart(2, "0")}
                </span>
                <span className="text-black text-2xl sm:text-3xl font-black uppercase tracking-tight italic">
                  ไปต่อ
                </span>
              </div>
              <div className="w-14 h-14 bg-black/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-black/10">
                <span className="material-symbols-outlined text-black text-3xl font-bold">
                  arrow_forward
                </span>
              </div>
            </div>
          </motion.button>

          <div className="w-1/3 h-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent rounded-full" />
        </div>
      </div>
    </main>
  );
}
