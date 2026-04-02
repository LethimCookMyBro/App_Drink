"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel, BottomNav } from "@/components/ui";
import { useGameStore, VibeLevel } from "@/store/gameStore";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  getActiveGameSessionSnapshot,
  type ActiveGameSessionSnapshot,
} from "@/lib/gameSession";

export default function WelcomePage() {
  const { vibeLevel, setVibeLevel } = useGameStore();
  const { settings, isLoaded } = useUserSettings();
  const is18PlusEnabled = isLoaded ? settings.is18Plus : false;
  const [activeGame, setActiveGame] = useState<ActiveGameSessionSnapshot>({
    isActive: false,
    roomCode: "",
    players: [],
    playerCount: 0,
    resumePath: "/create",
  });
  const currentVibe =
    !is18PlusEnabled && vibeLevel === "chaos" ? "tipsy" : vibeLevel;

  // Check if 18+ mode is enabled in settings
  useEffect(() => {
    if (!isLoaded) return;
    if (!is18PlusEnabled && vibeLevel === "chaos") {
      setVibeLevel("tipsy");
    }
  }, [is18PlusEnabled, isLoaded, setVibeLevel, vibeLevel]);

  useEffect(() => {
    setActiveGame(getActiveGameSessionSnapshot());
  }, []);

  // Build vibe options based on 18+ setting
  const vibeOptions: {
    value: VibeLevel;
    emoji: string;
    label: string;
    description: string;
  }[] = [
    {
      value: "chilling",
      emoji: "🧊",
      label: "ชิลล์ๆ",
      description: "เบาๆ วอร์มวง",
    },
    {
      value: "tipsy",
      emoji: "🍻",
      label: "เริ่มเดือด",
      description: "กำลังดี",
    },
    // Only show 18+ option if enabled in settings
    ...(is18PlusEnabled
      ? [
          {
            value: "chaos" as VibeLevel,
            emoji: "🔥",
            label: "เดือดสุด 18+",
            description: "ระวังตัวด้วย",
          },
        ]
      : []),
  ];

  const handleVibeChange = (vibe: VibeLevel) => {
    setVibeLevel(vibe);
  };

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-28">
      {/* Header */}
      <header className="flex items-center justify-end gap-2 px-4 pt-6 pb-2 sm:px-6 lg:px-8 lg:pt-8">
        {/* Feedback Button */}
        <Link href="/feedback">
          <button className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-md transition hover:bg-primary/30">
            <span className="material-symbols-outlined text-xl">
              bug_report
            </span>
          </button>
        </Link>
        <Link href="/settings">
          <button className="flex size-10 items-center justify-center rounded-full bg-white/5 text-white backdrop-blur-md transition hover:bg-white/10">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-8 pb-10 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12">
        <motion.div
          className="mb-6 relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(130px,26vw,180px)] text-primary/5 select-none"
          >
            local_bar
          </span>
          <h1 className="relative text-[clamp(4.75rem,20vw,7.5rem)] font-black leading-[0.85] tracking-tight text-white drop-shadow-[0_0_15px_rgba(199,61,245,0.6)] sm:text-[clamp(5.5rem,18vw,8.5rem)] lg:text-[clamp(6.5rem,12vw,9rem)]">
            วง
            <br />
            แตก
          </h1>
        </motion.div>
        <motion.p
          className="text-lg font-medium tracking-wide text-white/60 sm:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          เกมวงเหล้าเพื่อนสนิท
        </motion.p>
      </section>

      {/* Vibe Selector */}
      <section className="mx-auto mb-6 w-full px-4 sm:px-6 lg:mb-8 lg:max-w-3xl lg:px-8">
        <label className="mb-4 block text-center text-sm font-bold tracking-widest text-white/40 uppercase">
          เลือกระดับความเดือด
        </label>
        <GlassPanel className="p-1.5 sm:p-2">
          <div className="flex w-full rounded-xl relative">
            {vibeOptions.map((option) => (
              <motion.label
                key={option.value}
                className="group relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl py-3 transition-all duration-300 z-10 sm:py-4 lg:py-5"
                whileTap={{ scale: 0.95 }}
              >
                <input
                  type="radio"
                  name="vibe"
                  value={option.value}
                  checked={currentVibe === option.value}
                  onChange={() => handleVibeChange(option.value)}
                  className="peer sr-only"
                />
                {/* Animated Background Indicator - Liquid Glass Effect */}
                {currentVibe === option.value && (
                  <motion.div
                    layoutId="vibeIndicator"
                    className={`absolute inset-0 rounded-xl ${
                      option.value === "chilling"
                        ? "bg-gradient-to-br from-white/15 to-white/5 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        : option.value === "tipsy"
                          ? "bg-gradient-to-br from-primary/90 to-purple-900/90 shadow-[0_0_30px_rgba(199,61,245,0.4)]"
                          : "bg-gradient-to-br from-neon-red/90 to-red-900/90 shadow-[0_0_30px_rgba(255,0,64,0.4)]"
                    }`}
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 1,
                    }}
                    style={{
                      backdropFilter: "blur(12px)",
                    }}
                  />
                )}
                <motion.span
                  className="z-10 text-2xl mb-1"
                  animate={{
                    scale: currentVibe === option.value ? 1.15 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  {option.emoji}
                </motion.span>
                <span
                  className={`z-10 text-[11px] sm:text-sm font-bold transition-colors text-center leading-tight ${
                    currentVibe === option.value
                      ? "text-white"
                      : "text-white/50"
                  }`}
                >
                  {option.label}
                </span>
              </motion.label>
            ))}
          </div>
        </GlassPanel>
        {!is18PlusEnabled && (
          <p className="text-center text-white/30 text-xs mt-3">
            <Link href="/settings" className="underline hover:text-primary">
              เปิดโหมด 18+
            </Link>{" "}
            ในหน้าตั้งค่าเพื่อปลดล็อคระดับเดือดสุด
          </p>
        )}
      </section>

      {activeGame.isActive && (
        <section className="mx-auto mb-6 w-full px-4 sm:px-6 lg:max-w-3xl lg:px-8">
          <GlassPanel className="border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_22px_rgba(199,61,245,0.18)]">
                <span className="material-symbols-outlined text-3xl">
                  sports_esports
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                  มีเกมค้างอยู่
                </p>
                <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
                  เล่นต่อได้เลย ไม่ต้องเริ่มใหม่ทุกครั้ง
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  ตอนนี้มี {activeGame.playerCount} คนในวง
                  {activeGame.roomCode ? ` • ห้อง ${activeGame.roomCode}` : ""}
                  ถ้าจะเปลี่ยนรายชื่อ ให้กดเริ่มเกมใหม่แทน
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeGame.players.slice(0, 4).map((player) => (
                    <span
                      key={player}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75"
                    >
                      {player}
                    </span>
                  ))}
                  {activeGame.playerCount > 4 && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/45">
                      +{activeGame.playerCount - 4} คน
                    </span>
                  )}
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>
      )}

      {/* Action Button */}
      <section className="mx-auto w-full px-4 sm:px-6 lg:max-w-xl lg:px-8">
        {activeGame.isActive ? (
          <div className="space-y-3">
            <Link href={activeGame.resumePath} className="block">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                icon="sports_esports"
                iconPosition="left"
              >
                เล่นต่อ
              </Button>
            </Link>
            <Link href="/create" className="block">
              <Button
                variant="outline"
                size="lg"
                fullWidth
                icon="refresh"
                iconPosition="left"
              >
                เริ่มเกมใหม่
              </Button>
            </Link>
          </div>
        ) : (
          <Link href="/create" className="block">
            <Button
              variant="primary"
              size="xl"
              fullWidth
              icon="play_arrow"
              iconPosition="left"
            >
              เริ่มเกมเลย
            </Button>
          </Link>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-8 flex flex-col items-center gap-4 text-center pb-8 sm:pb-10">
        <div className="h-px w-12 bg-white/10" />
        <p className="text-[11px] font-medium text-white/30 tracking-wide">
          v2.4.0 • ดื่มอย่างรับผิดชอบ
        </p>
      </footer>

      <BottomNav />
    </main>
  );
}
