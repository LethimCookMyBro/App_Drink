"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel, BottomNav } from "@/components/ui";
import { useGameStore, VibeLevel } from "@/store/gameStore";

export default function WelcomePage() {
  const { vibeLevel, setVibeLevel } = useGameStore();
  const [selectedVibe, setSelectedVibe] = useState<VibeLevel>(vibeLevel);
  const [is18PlusEnabled, setIs18PlusEnabled] = useState(false);

  // Check if 18+ mode is enabled in settings
  useEffect(() => {
    const stored = localStorage.getItem("wongtaek-18plus");
    setIs18PlusEnabled(stored === "true");
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
    setSelectedVibe(vibe);
    setVibeLevel(vibe);
  };

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <header className="flex items-center justify-end gap-2 px-6 pt-6 pb-2">
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
      <section className="flex flex-col items-center justify-center text-center px-6 pt-8 pb-12">
        <motion.div
          className="mb-6 relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] text-primary/5 select-none"
          >
            local_bar
          </span>
          <h1 className="relative text-[7.5rem] font-black leading-[0.85] tracking-tight text-white drop-shadow-[0_0_15px_rgba(199,61,245,0.6)]">
            วง
            <br />
            แตก
          </h1>
        </motion.div>
        <motion.p
          className="text-xl font-medium tracking-wide text-white/60"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          เกมวงเหล้าเพื่อนสนิท
        </motion.p>
      </section>

      {/* Vibe Selector */}
      <section className="px-6 mb-8">
        <label className="mb-4 block text-center text-sm font-bold tracking-widest text-white/40 uppercase">
          เลือกระดับความเดือด
        </label>
        <GlassPanel className="p-1.5">
          <div className="flex w-full rounded-xl">
            {vibeOptions.map((option) => (
              <motion.label
                key={option.value}
                className="group relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl py-4 transition-all duration-300"
                whileTap={{ scale: 0.95 }}
              >
                <input
                  type="radio"
                  name="vibe"
                  value={option.value}
                  checked={selectedVibe === option.value}
                  onChange={() => handleVibeChange(option.value)}
                  className="peer sr-only"
                />
                {/* Background */}
                <div
                  className={`absolute inset-0 hidden rounded-xl peer-checked:block ${
                    option.value === "chilling"
                      ? "bg-white/10 shadow-inner"
                      : option.value === "tipsy"
                        ? "bg-gradient-to-br from-primary/80 to-purple-900 shadow-[0_0_15px_rgba(199,61,245,0.3)]"
                        : "bg-gradient-to-br from-neon-red/80 to-red-900 shadow-[0_0_15px_rgba(255,0,64,0.3)]"
                  }`}
                />
                <span className="z-10 text-2xl mb-1 group-hover:scale-110 transition-transform">
                  {option.emoji}
                </span>
                <span className="z-10 text-xs sm:text-sm font-bold text-white/50 peer-checked:text-white transition-colors text-center leading-tight">
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

      {/* Action Button */}
      <section className="px-6">
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
      </section>

      {/* Footer */}
      <footer className="mt-8 flex flex-col items-center gap-4 text-center pb-8">
        <div className="h-px w-12 bg-white/10" />
        <p className="text-[11px] font-medium text-white/30 tracking-wide">
          v2.4.0 • ดื่มอย่างรับผิดชอบ
        </p>
      </footer>

      <BottomNav />
    </main>
  );
}
