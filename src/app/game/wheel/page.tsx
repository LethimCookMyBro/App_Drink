"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useSoundEffects } from "@/hooks";
import {
  clearActiveGameSession,
  hasActiveGameSession,
  setGameResumePath,
} from "@/lib/gameSession";

// Punishments list
const punishments = [
  { text: "ดื่มหมดแก้ว!", icon: "local_bar", color: "text-neon-red" },
  { text: "ดื่ม 2 แก้ว!", icon: "sports_bar", color: "text-neon-red" },
  { text: "ทำหน้าตลกให้ทุกคนหัวเราะ", icon: "mood", color: "text-neon-yellow" },
  { text: "ร้องเพลง 1 ท่อน", icon: "mic", color: "text-neon-blue" },
  { text: "เต้นแบบเซ็กซี่", icon: "nightlife", color: "text-neon-pink" },
  { text: "โทรหาแฟนเก่า", icon: "call", color: "text-neon-green" },
  { text: "แชร์ความลับ 1 เรื่อง", icon: "lock_open", color: "text-primary" },
  { text: "ให้คนข้างๆ ตบก้น", icon: "back_hand", color: "text-neon-yellow" },
  {
    text: "ดื่มด้วยมือซ้าย จนจบเกม",
    icon: "pan_tool",
    color: "text-neon-blue",
  },
  { text: "บอกรักคนในวง 1 คน", icon: "favorite", color: "text-neon-pink" },
  { text: "รอดตัว! 🎉", icon: "celebration", color: "text-neon-green" },
  { text: "ทุกคนดื่มพร้อมกัน!", icon: "group", color: "text-neon-red" },
];

export default function PunishmentWheelPage() {
  const router = useRouter();
  const [hasStartedGame, setHasStartedGame] = useState<boolean | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<(typeof punishments)[0] | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const { playDrink, playCelebration, vibratePattern, vibrateLong } =
    useSoundEffects();

  useEffect(() => {
    const activeSession = hasActiveGameSession();
    setHasStartedGame(activeSession);
    if (activeSession) {
      setGameResumePath("/game/wheel");
    }
  }, []);

  const handleEndGame = () => {
    clearActiveGameSession();
    router.push("/");
  };

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    // Random number of full rotations (3-5) plus random final position
    const spins = 3 + Math.random() * 2;
    const finalAngle = Math.random() * 360;
    const totalRotation = rotation + spins * 360 + finalAngle;

    setRotation(totalRotation);

    // Calculate which segment we landed on
    const segmentAngle = 360 / punishments.length;
    const normalizedAngle = (360 - (finalAngle % 360)) % 360;
    const selectedIndex = Math.floor(normalizedAngle / segmentAngle);

    // Wait for animation to complete
    setTimeout(() => {
      setIsSpinning(false);
      setResult(punishments[selectedIndex]);

      if (punishments[selectedIndex].text.includes("รอด")) {
        playCelebration();
      } else {
        playDrink();
        vibrateLong();
      }
    }, 4000);

    // Haptic feedback during spin
    vibratePattern([50, 30, 50, 30, 50, 30, 50, 30, 100, 50, 150]);
  };

  const segmentAngle = 360 / punishments.length;

  if (hasStartedGame === null) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center px-6">
        <div className="animate-pulse text-center text-white/40">กำลังโหลด...</div>
      </main>
    );
  }

  if (!hasStartedGame) {
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

  return (
    <main className="container-mobile min-h-[100dvh] flex flex-col overflow-hidden bg-[#0a050d]">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-6 sm:px-5 sm:pt-8 lg:px-8">
          <Link href="/game/modes">
            <button className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10">
              <span className="material-symbols-outlined text-[28px] text-white/80">
                arrow_back
              </span>
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold tracking-[0.22em] text-primary">
              วงล้อ
            </div>
            <button
              onClick={handleEndGame}
              className="flex items-center gap-2 rounded-full border border-neon-red/35 bg-neon-red/14 px-4 py-2 text-sm font-bold text-neon-red transition-colors hover:bg-neon-red/22"
            >
              <span className="material-symbols-outlined text-lg">stop</span>
              จบ
            </button>
          </div>
          <Link
            href="/settings"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[28px] text-white/80">
              settings
            </span>
          </Link>
        </div>
      </header>

      {/* Wheel */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8">
        <div className="mb-6 w-full max-w-sm text-center lg:mb-0 lg:text-left">
          <p className="text-white/50 text-xs font-bold tracking-[0.24em] uppercase mb-2">
            วงล้อลงโทษ
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            หมุนแล้วรับภารกิจ
          </h2>
          <p className="mt-3 text-sm sm:text-base text-white/60 leading-relaxed">
            จัดเลย์เอาต์ใหม่ให้จอแนวนอนและจอใหญ่เห็นวงล้อ ผลลัพธ์ และปุ่มควบคุมชัดขึ้น โดยคงจังหวะหมุนเดิมไว้
          </p>
        </div>

        <div className="relative flex w-full max-w-md flex-col items-center">
        {/* Pointer */}
        <div className="absolute top-[calc(50%-140px)] sm:top-[calc(50%-156px)] z-20">
          <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_10px_rgba(199,61,245,0.8)]" />
        </div>

        {/* Wheel Container */}
        <motion.div
          ref={wheelRef}
          className="relative w-[17rem] h-[17rem] sm:w-80 sm:h-80 lg:w-[22rem] lg:h-[22rem] rounded-full border-4 border-white/20 shadow-[0_0_60px_rgba(199,61,245,0.3)]"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Segments */}
          {punishments.map((p, i) => {
            const startAngle = i * segmentAngle - 90;
            const hue = (i * 30) % 360;
            return (
              <div
                key={i}
                className="absolute w-full h-full"
                style={{
                  transform: `rotate(${startAngle + segmentAngle / 2}deg)`,
                }}
              >
                <div
                  className="absolute left-1/2 top-0 w-12 h-1/2 origin-bottom flex items-start justify-center pt-4"
                  style={{ transform: "translateX(-50%)" }}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ color: `hsl(${hue}, 80%, 60%)` }}
                  >
                    {p.icon}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[#1a0f1a] border-4 border-primary/50 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-primary text-3xl">
                {isSpinning ? "sync" : "casino"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Result */}
        <AnimatePresence>
          {result && !isSpinning && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 w-full p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center max-w-sm"
            >
              <span
                className={`material-symbols-outlined text-5xl ${result.color} mb-3`}
              >
                {result.icon}
              </span>
              <h2 className="text-white text-2xl font-bold mb-2">
                {result.text}
              </h2>
              <p className="text-white/50 text-sm">ลงโทษเลย!</p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Spin Button */}
      <footer className="relative z-10 w-full">
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-3 sm:px-5 sm:pb-10 lg:px-8">
        <Button
          onClick={spinWheel}
          variant="primary"
          size="xl"
          fullWidth
          disabled={isSpinning}
          icon={isSpinning ? "sync" : "casino"}
          className={isSpinning ? "animate-pulse" : ""}
        >
          {isSpinning ? "กำลังหมุน..." : "หมุนเลย!"}
        </Button>
        </div>
      </footer>
    </main>
  );
}
