"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { GAME_MODES } from "@/config/gameConstants";
import { useActiveGameSession, useSoundEffects } from "@/hooks";
import {
  setGameResumePath,
} from "@/lib/gameSession";

export default function GameModesPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { activeGame, isHydrated, refreshActiveGame } = useActiveGameSession();
  const isAtLastCard = currentIndex === GAME_MODES.length - 1;
  const isGameStarted = activeGame.isActive;

  const { vibrateShort } = useSoundEffects();

  useEffect(() => {
    if (isGameStarted) {
      setGameResumePath("/game/modes");
    }
  }, [isGameStarted]);

  useEffect(() => {
    refreshActiveGame();
  }, [refreshActiveGame]);

  // Detect current card based on scroll position
  const handleScrollEnd = useCallback(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const cardWidth = container.scrollWidth / GAME_MODES.length;
    const newIndex = Math.round(container.scrollLeft / cardWidth);

    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < GAME_MODES.length
    ) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex]);

  // Debounced scroll handler
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollEnd, 100);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScrollEnd]);

  // Jump to first card (for the loop back button)
  const jumpToFirst = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    setCurrentIndex(0);
    vibrateShort();
  };

  // Jump to specific index
  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = container.scrollWidth / GAME_MODES.length;
    container.scrollTo({ left: cardWidth * index, behavior: "smooth" });
    setCurrentIndex(index);
    vibrateShort();
  };

  const handleSelectMode = (route: string) => {
    router.push(route);
  };

  // Show loading state
  if (!isHydrated) {
    return (
      <main className="h-screen flex flex-col items-center justify-center bg-[#141414]">
        <div className="animate-pulse text-white/40">กำลังโหลด...</div>
      </main>
    );
  }

  // Show access denied message if game not started
  if (!isGameStarted) {
    return (
      <main className="h-screen flex flex-col items-center justify-center bg-[#141414] px-6">
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

  return (
    <main className="min-h-[100dvh] flex flex-col overflow-hidden bg-[#141414]">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 w-full border-b border-white/5">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <Link href="/">
            <button className="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95">
              <span className="material-symbols-outlined text-white text-3xl">
                arrow_back
              </span>
            </button>
          </Link>
          <span className="material-symbols-outlined text-primary text-3xl sm:text-4xl">
            local_bar
          </span>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(199,61,245,0.6)]">
            เลือกโหมดการเล่น
          </h1>
        </div>
        <Link href="/settings">
          <button className="flex items-center justify-center p-2.5 rounded-full hover:bg-white/5 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-white/80 text-3xl">
              settings
            </span>
          </button>
        </Link>
        </div>
      </header>

      {activeGame.isActive && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white/70">
            <span className="font-bold text-primary">วงนี้พร้อมเล่นแล้ว</span>
            <span className="ml-2">
              {activeGame.playerCount} คน
              {activeGame.roomCode ? ` • ห้อง ${activeGame.roomCode}` : ""}
              ถ้าจะเปลี่ยนรายชื่อ ให้กลับไปกดเริ่มเกมใหม่
            </span>
          </div>
        </div>
      )}

      {/* Horizontal Scroll Cards - Native snap scroll */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-4 px-4 py-5 sm:gap-6 sm:px-6 md:py-6 lg:px-8 w-full snap-x snap-mandatory"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
        }}
      >
        <div className="w-1 shrink-0" />

        {GAME_MODES.map((mode, index) => (
          <motion.div
            key={mode.id}
            className={`
              snap-center relative shrink-0 w-[88vw] sm:w-[72vw] lg:w-[44vw] xl:w-[32rem]
              min-h-[30rem] h-[70dvh] max-h-[44rem] landscape:w-[70vw] landscape:h-[84dvh] landscape:min-h-[25rem]
              rounded-3xl border-2
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
            <div className="relative flex-1 flex flex-col p-5 sm:p-6 lg:p-7 z-10">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <span
                  className={`text-xs font-bold ${mode.color} uppercase tracking-wider`}
                >
                  {mode.id === "random" ? "ลุ้นกันเลย" : "ระดับความมันส์"}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <span
                      key={level}
                      className={`material-symbols-outlined text-xl ${
                        level <= mode.difficulty ? mode.color : "text-white/10"
                      } ${level <= mode.difficulty ? "material-symbols-filled" : ""}`}
                    >
                      local_fire_department
                    </span>
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div className="flex-1 flex items-center justify-center mb-4 min-h-[9rem]">
                <motion.span
                  className={`material-symbols-outlined ${mode.color} text-[84px] sm:text-[96px] lg:text-[108px] drop-shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {mode.icon}
                </motion.span>
              </div>

              {/* Title and Description */}
              <div className="text-center mb-5 sm:mb-6">
                <h2
                  className={`text-2xl sm:text-3xl lg:text-[2rem] font-black ${mode.color} drop-shadow-md mb-3 whitespace-pre-line leading-tight`}
                >
                  {mode.name}
                </h2>
                <p className="mx-auto max-w-[28rem] text-white/60 text-sm sm:text-base leading-relaxed line-clamp-4">
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

      {/* Bottom Navigation */}
      <div className="border-t border-white/5 bg-black/10 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {GAME_MODES.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-white/20 hover:bg-white/40 w-2"
              }`}
            />
          ))}
        </div>

        {/* Loop back button - only show when at last card */}
        <AnimatePresence>
          {isAtLastCard && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={jumpToFirst}
              className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-full text-primary text-sm font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-lg">replay</span>
              กลับไปโหมดแรก
            </motion.button>
          )}
        </AnimatePresence>

        {!isAtLastCard && (
          <div className="text-white/40 text-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">swipe</span>
            เลื่อนทีละอัน →
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
