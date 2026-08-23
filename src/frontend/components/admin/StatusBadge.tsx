"use client";

import { ReactNode } from "react";

export type AdminBadgeTone = "neutral" | "primary" | "blue" | "green" | "red" | "yellow";

const TONE_STYLES: Record<AdminBadgeTone, string> = {
  neutral: "border-white/10 bg-white/5 text-white/60",
  primary: "border-primary/30 bg-primary/10 text-primary",
  blue: "border-neon-blue/25 bg-neon-blue/10 text-neon-blue",
  green: "border-neon-green/25 bg-neon-green/10 text-neon-green",
  red: "border-neon-red/30 bg-neon-red/10 text-neon-red",
  yellow: "border-neon-yellow/25 bg-neon-yellow/10 text-neon-yellow",
};

interface StatusBadgeProps {
  tone?: AdminBadgeTone;
  /** Small leading dot; use only when colour carries meaning */
  dot?: boolean;
  children: ReactNode;
}

export function StatusBadge({ tone = "neutral", dot = false, children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${TONE_STYLES[tone]}`}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
