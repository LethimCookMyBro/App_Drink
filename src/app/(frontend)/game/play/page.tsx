"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button, GamePauseButton, Timer } from "@/frontend/components/ui";
import {
  finalizeStoredGameSummary,
  tryRecordCompletedGameRound,
} from "@/frontend/game/gameSession";
import {
  useStoredGamePlayers,
  useSoundEffects,
} from "@/frontend/hooks";
import { GAME_SETTINGS } from "@/shared/config/gameConstants";

export const dynamic = "force-dynamic";

type GameCardType = "QUESTION" | "TRUTH" | "DARE" | "CHAOS" | "VOTE";

interface QuestionVisualTheme {
  eyebrow: string;
  title: string;
  icon: string;
  accentClass: string;
  pillClass: string;
  cardClass: string;
  heroClass: string;
  frameClass: string;
  helperText: string;
  doneLabel: string;
  doneHint: string;
  skipLabel: string;
  skipHint: string;
}

const QUESTION_THEMES: Record<GameCardType, QuestionVisualTheme> = {
  QUESTION: {
    eyebrow: "คำถาม",
    title: "วงแตก",
    icon: "psychology_alt",
    accentClass: "text-primary",
    pillClass:
      "border-primary/40 bg-primary/12 text-primary shadow-[0_0_20px_rgba(199,61,245,0.22)]",
    cardClass:
      "border-primary/35 bg-[radial-gradient(circle_at_top,_rgba(199,61,245,0.24),_transparent_45%),linear-gradient(180deg,rgba(49,20,65,0.96),rgba(20,10,27,0.98))]",
    heroClass: "from-primary/35 via-fuchsia-500/10 to-transparent",
    frameClass: "shadow-[0_0_45px_rgba(199,61,245,0.18)]",
    helperText: "ตอบให้สุด แล้วค่อยส่งไม้ต่อ",
    doneLabel: "ตอบแล้ว",
    doneHint: "ตาต่อไป",
    skipLabel: "ข้าม",
    skipHint: "ดื่ม x1",
  },
  TRUTH: {
    eyebrow: "คำถาม",
    title: "ความจริง",
    icon: "verified",
    accentClass: "text-neon-blue",
    pillClass:
      "border-neon-blue/40 bg-neon-blue/10 text-neon-blue shadow-[0_0_24px_rgba(0,255,255,0.18)]",
    cardClass:
      "border-neon-blue/45 bg-[linear-gradient(180deg,rgba(13,25,48,0.94),rgba(28,14,34,0.98))]",
    heroClass: "from-neon-blue/20 via-transparent to-transparent",
    frameClass: "shadow-[0_0_65px_rgba(0,255,255,0.12)]",
    helperText: "เปิดใจตรงๆ หรือยอมรับบทลงโทษ",
    doneLabel: "ตอบแล้ว",
    doneHint: "ตรงไปตรงมา",
    skipLabel: "ยอมแพ้",
    skipHint: "ดื่ม x1",
  },
  DARE: {
    eyebrow: "ภารกิจ",
    title: "คำท้า",
    icon: "local_fire_department",
    accentClass: "text-neon-red",
    pillClass:
      "border-neon-red/40 bg-neon-red/12 text-neon-red shadow-[0_0_24px_rgba(255,0,64,0.22)]",
    cardClass:
      "border-neon-red/40 bg-[linear-gradient(180deg,rgba(53,11,24,0.94),rgba(26,10,20,0.98))]",
    heroClass: "from-neon-red/20 via-transparent to-transparent",
    frameClass: "shadow-[0_0_65px_rgba(255,0,64,0.12)]",
    helperText: "กล้าทำก็ไปต่อ ไม่กล้าก็ดื่ม",
    doneLabel: "ทำเสร็จแล้ว",
    doneHint: "ไปต่อ",
    skipLabel: "ยอมแพ้",
    skipHint: "ดื่ม x2",
  },
  CHAOS: {
    eyebrow: "กฎบังคับ",
    title: "โหมดโกลาหล",
    icon: "bolt",
    accentClass: "text-[#ffb400]",
    pillClass:
      "border-[#ff5f5f]/30 bg-[#ff5f5f]/12 text-[#ffcc66] shadow-[0_0_22px_rgba(255,98,0,0.22)]",
    cardClass:
      "border-neon-red/45 bg-[linear-gradient(180deg,rgba(49,10,18,0.96),rgba(22,7,12,0.98))]",
    heroClass: "from-neon-red/18 via-transparent to-transparent",
    frameClass: "shadow-[0_0_80px_rgba(255,0,64,0.12)]",
    helperText: "ตานี้ไม่มีคำว่าปลอดภัย",
    doneLabel: "ไปต่อ",
    doneHint: "รับชะตา",
    skipLabel: "ยอมแพ้",
    skipHint: "ดื่ม x2",
  },
  VOTE: {
    eyebrow: "โหวต",
    title: "เสียงข้างมาก",
    icon: "how_to_vote",
    accentClass: "text-neon-green",
    pillClass:
      "border-neon-green/40 bg-neon-green/10 text-neon-green shadow-[0_0_24px_rgba(128,255,0,0.18)]",
    cardClass:
      "border-neon-green/35 bg-[linear-gradient(180deg,rgba(12,37,18,0.94),rgba(18,16,25,0.98))]",
    heroClass: "from-neon-green/14 via-transparent to-transparent",
    frameClass: "shadow-[0_0_55px_rgba(128,255,0,0.1)]",
    helperText: "ใครโดนเลือกมากสุด เตรียมรับแรงกดดัน",
    doneLabel: "โหวตแล้ว",
    doneHint: "ตาต่อไป",
    skipLabel: "ไม่โหวต",
    skipHint: "ดื่ม x1",
  },
};

function getQuestionType(questionType: string | null | undefined): GameCardType {
  if (questionType === "TRUTH") return "TRUTH";
  if (questionType === "DARE") return "DARE";
  if (questionType === "CHAOS") return "CHAOS";
  if (questionType === "VOTE") return "VOTE";
  return "QUESTION";
}

function getSkipPenalty(type: GameCardType): number {
  if (type === "DARE" || type === "CHAOS") {
    return 2;
  }

  return 1;
}

function GamePlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "question";
  const normalizedMode =
    mode === "random" || mode === "vote" || mode === "question"
      ? mode
      : "question";
  const resumePath = `/game/play?mode=${normalizedMode}`;
  const {
    hasStartedGame,
    players,
    isReady,
    room,
  } = useStoredGamePlayers(resumePath);

  const [timerKey, setTimerKey] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isRoundSyncing, setIsRoundSyncing] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);

  const {
    playNewQuestion,
    playCountdown,
    playTimeUp,
    playDrink,
    vibrateShort,
    vibrateLong,
  } = useSoundEffects();
  const activeSession = room?.activeSession ?? null;
  const activePlayer =
    room?.players.find((player) => player.id === activeSession?.currentPlayerId) ??
    null;
  const activePlayerName = activePlayer?.name ?? players[0] ?? "";
  const activePlayerDrinks = activePlayer?.drinkCount ?? 0;
  const roundNumber = (activeSession?.roundCount ?? 0) + 1;
  const questionType = getQuestionType(activeSession?.currentQuestionType);
  const theme = QUESTION_THEMES[questionType];
  const skipPenalty = getSkipPenalty(questionType);

  useEffect(() => {
    if (activeSession?.currentQuestionText) {
      playNewQuestion();
    }
  }, [activeSession?.currentQuestionId, activeSession?.currentQuestionText, playNewQuestion]);

  const handleSkip = async () => {
    if (!activePlayerName) return;
    if (isRoundSyncing || isEndingGame) return;

    setIsRoundSyncing(true);

    const syncResult = await tryRecordCompletedGameRound("SKIPPED", skipPenalty);
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

  const handleDone = async () => {
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

  const handleTimerComplete = () => {
    playTimeUp();
    void handleSkip();
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
        <div className="animate-pulse text-center text-white/40">
          กำลังโหลด...
        </div>
      </main>
    );
  }

  if (!hasStartedGame || !isReady || players.length === 0) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20">
            <span className="material-symbols-outlined text-5xl text-primary">
              sports_esports
            </span>
          </div>
          <div>
            <h1 className="mb-2 text-2xl font-bold text-white">
              ยังไม่ได้เริ่มเกม
            </h1>
            <p className="text-sm text-white/60">
              กรุณากด &quot;เริ่มเกมเลย&quot; จากหน้าหลักก่อน
              <br />
              เพื่อตั้งค่าผู้เล่นและเริ่มเกม
            </p>
          </div>
          <Link href="/create">
            <Button
              variant="primary"
              size="lg"
              icon="play_arrow"
              iconPosition="left"
            >
              เริ่มเกมเลย
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!activeSession || !activeSession.currentQuestionText) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center px-6">
        <div className="animate-pulse text-center text-white/40">
          กำลังซิงก์สถานะเกม...
        </div>
      </main>
    );
  }

  const showHazardStyle = questionType === "CHAOS";

  return (
    <main className="container-mobile relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#09050d]">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute inset-x-0 top-0 h-[45vh] bg-gradient-to-b ${theme.heroClass}`}
        />
        <div className="absolute left-1/2 top-[36%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-12%] h-[20rem] w-[20rem] rounded-full bg-neon-red/12 blur-[120px]" />
      </div>

      <header className="relative z-20 w-full px-4 pb-2 pt-6 sm:px-5 sm:pt-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            onClick={() => router.push("/game/modes")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[30px]">
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

          <button
            onClick={() => router.push("/settings")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[28px]">
              settings
            </span>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-between px-4 pb-5 sm:px-5 lg:px-8">
        <div className="flex flex-col items-center gap-4 pt-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`player-${activeSession.currentPlayerId}-${activeSession.roundCount}`}
              initial={{ opacity: 0, y: -12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.92 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/25 blur-2xl" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-black/80 bg-gradient-to-br from-[#6a5cff] to-[#8e2cff] shadow-[0_0_40px_rgba(199,61,245,0.48)]">
                  <span className="text-5xl font-black text-white">
                    {activePlayerName?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#25112d] bg-[#7a4bff] px-4 py-1 text-sm font-black text-white shadow-[0_0_14px_rgba(122,75,255,0.5)]">
                  ตาเล่น
                </div>
              </div>
              <div>
                <h2 className="text-[2.05rem] font-black leading-none tracking-tight text-white">
                  {activePlayerName}
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  🍺 {activePlayerDrinks} แก้ว
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeSession.currentQuestionText && (
              <motion.div
                key={`${activeSession.currentQuestionId}-${activeSession.roundCount}`}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={{ duration: 0.32 }}
                className={`relative w-full overflow-hidden rounded-[2rem] border ${theme.cardClass} ${theme.frameClass}`}
              >
                {showHazardStyle && (
                  <div className="absolute inset-x-0 top-0 h-4 bg-[repeating-linear-gradient(135deg,rgba(255,0,64,0.95)_0,rgba(255,0,64,0.95)_18px,transparent_18px,transparent_30px)] opacity-90" />
                )}

                <div className="relative flex min-h-[23rem] flex-col p-5 sm:min-h-[25rem] sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-[0.28em] ${theme.accentClass}`}>
                        {theme.eyebrow}
                      </p>
                      <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${theme.pillClass}`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {theme.icon}
                        </span>
                        <span>{theme.title}</span>
                        {activeSession.currentQuestionIs18Plus && (
                          <span className="rounded-full bg-neon-red px-2 py-0.5 text-[10px] font-black text-white">
                            18+
                          </span>
                        )}
                      </div>
                    </div>

                    {normalizedMode === "random" && (
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                        สุ่ม
                      </div>
                    )}
                  </div>

                  {showHazardStyle && (
                    <div className="mt-5 flex items-center justify-center gap-2">
                      {[1, 2, 3].map((item) => (
                        <span
                          key={item}
                          className="material-symbols-outlined text-3xl text-[#ffb400]"
                        >
                          warning
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    {showHazardStyle ? (
                      <>
                        <p className="mb-4 max-w-2xl text-2xl font-black leading-tight text-white sm:text-3xl">
                          {activeSession.currentQuestionText.split("\n")[0]}
                        </p>
                        <div className="relative w-full max-w-[30rem] px-4 py-4">
                          <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-neon-red" />
                          <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-neon-red" />
                          <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-neon-red" />
                          <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-neon-red" />
                          <h1 className="text-[2.7rem] font-black uppercase leading-[0.95] tracking-[-0.05em] text-white drop-shadow-[3px_3px_0_rgba(0,255,255,0.9)] sm:text-[4rem]">
                            ดื่มให้หมดแล้ว!
                          </h1>
                        </div>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/65">
                          <span className="material-symbols-outlined text-neon-red">
                            lock
                          </span>
                          กฎบังคับ
                        </div>
                      </>
                    ) : (
                      <h1 className="max-w-[22ch] text-[2rem] font-black leading-tight tracking-tight text-white sm:text-[2.45rem]">
                        {activeSession.currentQuestionText}
                      </h1>
                    )}

                    <div className="mt-8">
                      <Timer
                        key={timerKey}
                        duration={GAME_SETTINGS.defaultTimerDuration}
                        onComplete={handleTimerComplete}
                        onWarning={handleTimerWarning}
                        isPaused={isTimerPaused}
                        size="lg"
                      />
                    </div>
                    <GamePauseButton
                      isPaused={isTimerPaused}
                      onToggle={toggleTimerPaused}
                      className="mt-4 min-w-[10.5rem] justify-center text-sm shadow-[0_0_24px_rgba(251,255,0,0.16)]"
                    />
                    {isTimerPaused && (
                      <div className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70">
                        เวลาถูกหยุดไว้ กดเล่นต่อเมื่อพร้อม
                      </div>
                    )}
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/8 bg-black/18 px-4 py-3 text-center text-sm text-white/55">
                    {theme.helperText}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="pt-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Button
              onClick={() => void handleSkip()}
              variant="neon-red"
              size="xl"
              className="flex min-h-[5.6rem] flex-col items-center justify-center"
              disabled={isRoundSyncing || isEndingGame}
            >
              <span className="material-symbols-outlined mb-1 text-3xl text-white">
                local_bar
              </span>
              <span className="text-xl font-black tracking-tight text-white">
                {theme.skipLabel}
              </span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                {questionType === "CHAOS"
                  ? `ดื่ม x${skipPenalty}`
                  : theme.skipHint}
              </span>
            </Button>

            <Button
              onClick={() => void handleDone()}
              variant={questionType === "CHAOS" ? "primary" : "neon-green"}
              size="xl"
              className="flex min-h-[5.6rem] flex-col items-center justify-center"
              disabled={isRoundSyncing || isEndingGame}
            >
              <span
                className={`material-symbols-outlined mb-1 text-3xl ${
                  questionType === "CHAOS" ? "text-white" : "text-black"
                }`}
              >
                {questionType === "CHAOS" ? "arrow_forward" : "check_circle"}
              </span>
              <span
                className={`text-xl font-black tracking-tight ${
                  questionType === "CHAOS" ? "text-white" : "text-black"
                }`}
              >
                {theme.doneLabel}
              </span>
              <span
                className={`mt-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                  questionType === "CHAOS" ? "text-white/70" : "text-black/55"
                }`}
              >
                {theme.doneHint}
              </span>
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}

function GamePlayLoading() {
  return (
    <main className="container-mobile flex min-h-screen flex-col items-center justify-center">
      <div className="flex animate-pulse flex-col items-center gap-4">
        <div className="h-24 w-24 rounded-full bg-white/10" />
        <div className="h-6 w-40 rounded bg-white/10" />
        <div className="h-48 w-full max-w-md rounded-2xl bg-white/10" />
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
