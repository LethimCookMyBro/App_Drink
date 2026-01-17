"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TimerProps {
  duration: number;
  onComplete?: () => void;
  isPaused?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { container: "w-16 h-16", text: "text-2xl", labelSize: "text-[8px]" },
  md: { container: "w-24 h-24", text: "text-3xl", labelSize: "text-[10px]" },
  lg: { container: "w-28 h-28", text: "text-4xl", labelSize: "text-[10px]" },
};

export function Timer({
  duration,
  onComplete,
  isPaused = false,
  size = "md",
  className = "",
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const circumference = 2 * Math.PI * 46; // radius = 46 for viewBox 0 0 100 100
  const progress = (timeLeft / duration) * circumference;
  const strokeDashoffset = circumference - progress;

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onComplete]);

  // Reset timer when duration changes
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  // Determine color based on time left
  const getColor = () => {
    if (timeLeft <= 5) return "#FF0040"; // red
    if (timeLeft <= 10) return "#FBFF00"; // yellow
    return "#c73df5"; // primary
  };

  const color = getColor();

  return (
    <div className={`relative ${sizes[size].container} ${className}`}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-primary/20 blur-xl rounded-full"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Background circle */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="#1e1022"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
      </svg>

      {/* Progress circle */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 100 100"
        style={{ filter: `drop-shadow(0 0 10px ${color}60)` }}
      >
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          initial={false}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>

      {/* Timer text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <motion.span
          key={timeLeft}
          className={`${sizes[size].text} font-bold text-white leading-none tracking-tighter tabular-nums drop-shadow-md`}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {timeLeft}
        </motion.span>
        <span
          className={`${sizes[size].labelSize} text-white/40 font-bold tracking-widest mt-1`}
        >
          วินาที
        </span>
      </div>
    </div>
  );
}

export default Timer;
