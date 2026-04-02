"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface GoogleAuthButtonProps {
  label: string;
  callbackUrl?: string;
}

export function GoogleAuthButton({
  label,
  callbackUrl = "/profile",
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      await signIn("google", { callbackUrl });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-3 font-semibold text-slate-900 transition-all hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
      >
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.64Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3A7.18 7.18 0 0 1 12 19.27a7.14 7.14 0 0 1-6.7-4.93H1.32v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.3 14.34A7.2 7.2 0 0 1 4.9 12c0-.81.14-1.6.4-2.34v-3.1H1.32A12 12 0 0 0 0 12c0 1.93.46 3.75 1.32 5.44l3.98-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.73c1.76 0 3.35.6 4.6 1.79l3.45-3.45C17.94 1.09 15.23 0 12 0 7.31 0 3.25 2.69 1.32 6.56l3.98 3.1A7.14 7.14 0 0 1 12 4.73Z"
        />
      </svg>
      <span>{isLoading ? "กำลังเชื่อมต่อ Google..." : label}</span>
    </button>
  );
}
