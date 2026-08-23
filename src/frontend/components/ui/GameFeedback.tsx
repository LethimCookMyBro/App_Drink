"use client";

import { useEffect } from "react";
import { Icon, type IconName } from "@/frontend/components/ui/Icon";

export type GameFeedbackState = {
  message: string;
  tone: "error" | "info";
} | null;

interface GameFeedbackProps {
  feedback: GameFeedbackState;
  onDismiss: () => void;
}

const TONE_STYLES = {
  error:
    "border-neon-red/40 bg-[#2a0a14]/95 text-neon-red shadow-[0_0_30px_rgba(255,0,64,0.25)]",
  info: "border-neon-blue/40 bg-[#081827]/95 text-neon-blue shadow-[0_0_30px_rgba(0,240,255,0.2)]",
} as const;

const TONE_ICONS: Record<"error" | "info", IconName> = {
  error: "error",
  info: "info",
};

export function GameFeedback({ feedback, onDismiss }: GameFeedbackProps) {
  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  const toneStyle = TONE_STYLES[feedback.tone];

  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`fixed inset-x-4 bottom-28 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium md:bottom-32 ${toneStyle}`}
    >
      <Icon name={TONE_ICONS[feedback.tone]} className="text-lg" />
      <span className="flex-1 leading-snug">{feedback.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="ปิดข้อความแจ้งเตือน"
        className="rounded-full p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
      >
        <Icon name="close" className="text-base" />
      </button>
    </div>
  );
}

export default GameFeedback;
