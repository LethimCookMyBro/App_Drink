"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/frontend/components/ui";
import { useActiveGameSession } from "@/frontend/hooks";
import { setCurrentUser } from "@/frontend/hooks/useUserSettings";
import {
  resetGameSessionForRestart,
} from "@/frontend/game/gameSession";

import { Icon } from "@/frontend/components/ui/Icon";

const ROOM_CODE_LENGTH = 8;

export default function JoinCirclePage() {
  const router = useRouter();
  const { activeGame } = useActiveGameSession();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric and uppercase
    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, ROOM_CODE_LENGTH);
    setRoomCode(cleaned);
    setError("");
  };

  const handleJoin = async () => {
    if (roomCode.length !== ROOM_CODE_LENGTH) {
      setError(`Please enter an ${ROOM_CODE_LENGTH}-character room code`);
      return;
    }
    if (!playerName.trim()) {
      setError("กรุณาใส่ชื่อของคุณ");
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ไม่สามารถเข้าร่วมห้องได้");
        return;
      }

      resetGameSessionForRestart();
      localStorage.setItem("wongtaek-player-name", playerName.trim());
      localStorage.setItem("wongtaek-room-code", roomCode);
      setCurrentUser(playerName.trim());
      router.push(`/lobby/${roomCode}`);
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับห้องได้ ลองใหม่อีกครั้ง");
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
            <Icon name="arrow_back" className="text-[28px]" />
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
            <Icon name="confirmation_number" className="text-[56px] text-neon-blue drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
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
              <Icon name="sports_esports" className="text-base" />
              เล่นต่อเกมเดิม
            </Link>
          </div>
        )}

        {/* Room Code */}
        <div className="flex flex-col gap-3">
          <label className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase ml-1">
            รหัสห้อง
          </label>
          <div className="grid grid-cols-4 justify-center gap-3 sm:grid-cols-8">
            {Array.from({ length: ROOM_CODE_LENGTH }, (_, index) => (
              <motion.div
                key={index}
                className={`
                  size-12 rounded-xl border-2 flex items-center justify-center
                  text-xl font-bold font-mono bg-white/5 transition-all sm:size-14 sm:text-2xl
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
            placeholder={`Enter ${ROOM_CODE_LENGTH}-character code`}
            className="opacity-0 absolute -z-10"
            autoFocus
          />
          {/* Visible input for typing */}
          <input
            type="text"
            value={roomCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Type room code here..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.3em] text-white placeholder-white/30 transition-all focus:border-neon-blue focus:ring-0 focus:outline-none sm:text-xl sm:tracking-[0.5em]"
            maxLength={ROOM_CODE_LENGTH}
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
            <Icon name="error" className="text-lg" />
            {error}
          </motion.div>
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
            roomCode.length !== ROOM_CODE_LENGTH ||
            !playerName.trim() ||
            isSubmitting
          }
        >
          {isSubmitting ? "กำลังเข้าห้อง..." : "เข้าร่วมวง"}
        </Button>
      </div>
    </main>
  );
}
