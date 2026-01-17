"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { GAME_MODES, getRandomMode } from "@/config/gameConstants";
import { useSoundEffects } from "@/hooks";

export default function GameModesPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrollLocked, setIsScrollLocked] = useState(false);
  const lastScrollTime = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  const { vibrateShort } = useSoundEffects({
    enabled: true,
    hapticEnabled: true,
  });

  // Calculate card width
  const getCardWidth = useCallback(() => {
    if (typeof window === "undefined") return 340;
    return Math.min(window.innerWidth * 0.85, 384) + 24; // card width + gap
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!scrollRef.current) return;
      const cardWidth = getCardWidth();
      const targetScroll = index * cardWidth;

      scrollRef.current.scrollTo({
        left: targetScroll,
        behavior: smooth ? "smooth" : "auto",
      });
      setCurrentIndex(index);
      vibrateShort();
    },
    [getCardWidth, vibrateShort],
  );

  // Handle scroll end to detect current card
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrollLocked) return;

    const now = Date.now();
    if (now - lastScrollTime.current < 50) return;
    lastScrollTime.current = now;

    const cardWidth = getCardWidth();
    const scrollLeft = scrollRef.current.scrollLeft;
    const newIndex = Math.round(scrollLeft / cardWidth);

    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < GAME_MODES.length
    ) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, getCardWidth, isScrollLocked]);

  // Touch handlers for swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndTime = Date.now();
    const deltaX = touchEndX - touchStartX.current;
    const deltaTime = touchEndTime - touchStartTime.current;

    // Fast swipe detection
    const velocity = Math.abs(deltaX) / deltaTime;

    // If swiping RIGHT (going back) and it's a fast swipe from last card
    if (
      deltaX > 50 &&
      velocity > 0.5 &&
      currentIndex === GAME_MODES.length - 1
    ) {
      // Fast scroll back to first card
      setIsScrollLocked(true);
      scrollToIndex(0, true);
      setTimeout(() => setIsScrollLocked(false), 500);
      return;
    }

    // Normal scroll behavior - one card at a time
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && currentIndex < GAME_MODES.length - 1) {
        // Swipe left - go forward one
        scrollToIndex(currentIndex + 1);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go back one (or to start if fast from end)
        scrollToIndex(currentIndex - 1);
      }
    } else {
      // Snap to current
      scrollToIndex(currentIndex);
    }
  };

  // Initial scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "auto" });
    }
  }, []);

  const handleSelectMode = (route: string) => {
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
      <header className="glass-panel sticky top-0 z-50 w-full px-4 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
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
      </header>

      {/* Horizontal Scroll Cards */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto no-scrollbar flex items-center py-6 px-4 sm:px-6 gap-6 w-full"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
            <div className="relative flex-1 flex flex-col p-5 sm:p-6 z-10">
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
              <div className="flex-1 flex items-center justify-center mb-4">
                <motion.span
                  className={`material-symbols-outlined ${mode.color} text-[100px] drop-shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {mode.icon}
                </motion.span>
              </div>

              {/* Title and Description */}
              <div className="text-center mb-5">
                <h2
                  className={`text-2xl sm:text-3xl font-black ${mode.color} drop-shadow-md mb-3 whitespace-pre-line leading-tight`}
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

      {/* Bottom Navigation with dots */}
      <div className="flex flex-col items-center py-4 gap-3">
        <div className="flex gap-2">
          {GAME_MODES.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <div className="text-white/40 text-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">swipe</span>
          เลื่อนเพื่อดูโหมดอื่น
        </div>
      </div>
    </main>
  );
}
