"use client";

import { Icon } from "@/frontend/components/ui/Icon";

interface GamePauseButtonProps {
  isPaused: boolean;
  onToggle: () => void;
  className?: string;
}

export function GamePauseButton({
  isPaused,
  onToggle,
  className = "",
}: GamePauseButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
        isPaused
          ? "border-neon-green/35 bg-neon-green/14 text-neon-green hover:bg-neon-green/22"
          : "border-neon-yellow/35 bg-neon-yellow/10 text-neon-yellow hover:bg-neon-yellow/18"
      } ${className}`}
    >
      <Icon name={isPaused ? "play_arrow" : "pause"} className="text-lg" />
      {isPaused ? "เล่นต่อ" : "หยุดเวลา"}
    </button>
  );
}

export default GamePauseButton;
