"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, TurnstileWidget } from "@/components/ui";
import { useActiveGameSession } from "@/hooks";
import { setCurrentUser } from "@/hooks/useUserSettings";
import {
  resetGameSessionForRestart,
} from "@/lib/gameSession";

const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function JoinCirclePage() {
  const router = useRouter();
  const { activeGame } = useActiveGameSession();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric and uppercase
    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);
    setRoomCode(cleaned);
    setError("");
  };

  const handleJoin = async () => {
    if (roomCode.length !== 4) {
      setError("กรุณาใส่รหัสห้อง 4 ตัว");
      return;
    }
    if (!playerName.trim()) {
      setError("กรุณาใส่ชื่อของคุณ");
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setError("กรุณายืนยันว่าไม่ใช่บอทก่อนเข้าห้อง");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerName.trim(),
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ไม่สามารถเข้าร่วมห้องได้");
        if (turnstileEnabled) {
          setTurnstileResetKey((current) => current + 1);
        }
        return;
      }

      resetGameSessionForRestart();
      localStorage.setItem("wongtaek-player-name", playerName.trim());
      localStorage.setItem("wongtaek-room-code", roomCode);
      setCurrentUser(playerName.trim());
      router.push(`/lobby/${roomCode}`);
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับห้องได้ ลองใหม่อีกครั้ง");
      if (turnstileEnabled) {
        setTurnstileResetKey((current) => current + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container-mobile flex min-h-screen flex-col overflow-y-auto no-scrollbar pb-32 lg:pb-10">
      {/* Header */}
      <header className="flex items-center justify-between p-4 pb-2 sm:px-6 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-0 lg:pt-6">
        <Link href="/">
          <button className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors text-white">
            <span className="material-symbols-outlined text-[28px]">
              arrow_back
            </span>
          </button>
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold tracking-[0.1em] text-neon-blue uppercase mb-1">
            เข้าร่วม
          </span>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
            ใส่รหัสห้อง
          </h2>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center" />
      </header>

      {/* Icon */}
      <div className="flex flex-col items-center justify-center pt-12 pb-8 lg:pt-8 lg:pb-10">
        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="absolute inset-0 bg-neon-blue/20 blur-xl rounded-full" />
          <div className="relative flex items-center justify-center size-24 rounded-full border border-neon-blue/30 bg-gradient-to-b from-neon-blue/10 to-transparent shadow-neon-blue">
            <span className="material-symbols-outlined text-[56px] text-neon-blue drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
              confirmation_number
            </span>
          </div>
        </motion.div>
      </div>

      {/* Form */}
      <div className="mx-auto flex-1 w-full max-w-2xl space-y-8 px-4 sm:px-6 lg:px-0">
        {activeGame.isActive && (
          <div className="rounded-2xl border border-neon-blue/25 bg-neon-blue/10 px-4 py-4 text-sm text-white/75">
            <p className="font-bold text-neon-blue">มีเกมที่เล่นค้างอยู่</p>
            <p className="mt-1 leading-relaxed text-white/60">
              ถ้าคุณเข้าห้องใหม่ รายชื่อเดิม {activeGame.playerCount} คนจะถูกแทนที่
              ด้วย session ใหม่ทันที
            </p>
            <Link
              href={activeGame.resumePath}
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-neon-blue hover:text-white"
            >
              <span className="material-symbols-outlined text-base">
                sports_esports
              </span>
              เล่นต่อเกมเดิม
            </Link>
          </div>
        )}

        {/* Room Code */}
        <div className="flex flex-col gap-3">
          <label className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase ml-1">
            รหัสห้อง
          </label>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                className={`
                  size-14 rounded-xl border-2 flex items-center justify-center
                  text-2xl font-bold font-mono bg-white/5 transition-all sm:size-16 sm:text-3xl
                  ${
                    roomCode[index]
                      ? "border-neon-blue shadow-neon-blue text-neon-blue"
                      : "border-white/10 text-white/20"
                  }
                `}
                animate={roomCode[index] ? { scale: [1, 1.1, 1] } : {}}
              >
                {roomCode[index] || "•"}
              </motion.div>
            ))}
          </div>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="ใส่รหัส 4 ตัว"
            className="opacity-0 absolute -z-10"
            autoFocus
          />
          {/* Visible input for typing */}
          <input
            type="text"
            value={roomCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="พิมพ์รหัสห้องที่นี่..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.3em] text-white placeholder-white/30 transition-all focus:border-neon-blue focus:ring-0 focus:outline-none sm:text-xl sm:tracking-[0.5em]"
            maxLength={4}
          />
        </div>

        {/* Player Name */}
        <div className="flex flex-col gap-3">
          <label className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase ml-1">
            ชื่อของคุณ
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError("");
            }}
            placeholder="ใส่ชื่อเล่น..."
            className="input-neon text-xl font-bold sm:text-2xl"
          />
        </div>

        {/* Error */}
        {error && (
          <motion.div
            className="flex items-center gap-2 text-neon-red text-sm font-medium"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </motion.div>
        )}

        {turnstileEnabled && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <TurnstileWidget
              action="room_join"
              onTokenChange={setTurnstileToken}
              resetKey={turnstileResetKey}
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md bg-gradient-to-t from-[#161118] via-[#161118] to-transparent p-6 pt-12 sm:px-6 lg:static lg:inset-x-auto lg:mx-auto lg:max-w-2xl lg:bg-transparent lg:p-0 lg:pt-8">
        <Button
          onClick={handleJoin}
          variant="neon-blue"
          size="xl"
          fullWidth
          icon="login"
          iconPosition="right"
          disabled={
            roomCode.length !== 4 ||
            !playerName.trim() ||
            isSubmitting ||
            (turnstileEnabled && !turnstileToken)
          }
        >
          {isSubmitting ? "กำลังเข้าห้อง..." : "เข้าร่วมวง"}
        </Button>
      </div>
    </main>
  );
}
