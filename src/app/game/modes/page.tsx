"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { GAME_MODES, getRandomMode } from "@/config/gameConstants";

export default function GameModesPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelectMode = (route: string) => {
    // Handle random mode
    if (route === "random") {
      const randomMode = getRandomMode();
      router.push(randomMode.route);
      return;
    }
    router.push(route);
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[#141414]">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 w-full px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[32px]">
            local_bar
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(199,61,245,0.6)]">
            เลือกโหมดการเล่น
          </h1>
        </div>
        <Link href="/settings">
          <button className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-white/80 text-[28px]">
              settings
            </span>
          </button>
        </Link>
      </header>

      {/* Horizontal Scroll Cards */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto no-scrollbar flex items-center py-6 px-6 gap-6 w-full snap-x snap-mandatory"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div className="w-1 shrink-0" />

        {GAME_MODES.map((mode, index) => (
          <motion.div
            key={mode.id}
            className={`
              snap-center relative shrink-0 w-[85vw] max-w-sm h-[65vh] rounded-2xl border-2 
              ${mode.borderColor} bg-card/90 ${mode.shadowClass} 
              flex flex-col overflow-hidden group
            `}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Background gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-b ${mode.bgGradient} opacity-20`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-card z-0" />

            {/* Content */}
            <div className="relative flex-1 flex flex-col p-6 z-10">
              {/* Top bar */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-xs font-bold ${mode.color} uppercase tracking-wider`}
                >
                  {mode.id === "random" ? "ลุ้นกันเลย" : "ระดับความมันส์"}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <span
                      key={level}
                      className={`material-symbols-outlined text-lg ${
                        level <= mode.difficulty ? mode.color : "text-white/10"
                      } ${level <= mode.difficulty ? "material-symbols-filled" : ""}`}
                    >
                      local_fire_department
                    </span>
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div className="flex-1 flex items-center justify-center mb-4">
                <motion.span
                  className={`material-symbols-outlined ${mode.color} text-[80px] drop-shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {mode.icon}
                </motion.span>
              </div>

              {/* Title and Description */}
              <div className="text-center mb-6">
                <h2
                  className={`text-3xl font-black ${mode.color} drop-shadow-md mb-3 whitespace-pre-line leading-tight`}
                >
                  {mode.name}
                </h2>
                <p className="text-white/60 text-sm leading-relaxed line-clamp-3">
                  {mode.description}
                </p>
              </div>

              {/* Play Button */}
              <Button
                onClick={() => handleSelectMode(mode.route)}
                variant={
                  mode.id === "chaos"
                    ? "neon-red"
                    : mode.id === "truth-or-dare"
                      ? "neon-green"
                      : mode.id === "random"
                        ? "primary"
                        : "outline"
                }
                size="lg"
                icon="play_arrow"
                iconPosition="right"
                fullWidth
                className={
                  mode.id === "vote" || mode.id === "question"
                    ? mode.borderColor
                    : ""
                }
              >
                เริ่มเกม
              </Button>
            </div>
          </motion.div>
        ))}

        <div className="w-1 shrink-0" />
      </div>

      {/* Bottom Navigation Hint */}
      <div className="text-center py-4 text-white/40 text-sm">
        <span className="material-symbols-outlined text-lg align-middle mr-1">
          swipe
        </span>
        เลื่อนเพื่อดูโหมดอื่น
      </div>
    </main>
  );
}
