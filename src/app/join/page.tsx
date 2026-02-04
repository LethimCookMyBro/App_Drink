"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel } from "@/components/ui";

export default function JoinCirclePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric and uppercase
    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);
    setRoomCode(cleaned);
    setError("");
  };

  const handleJoin = () => {
    if (roomCode.length !== 4) {
      setError("กรุณาใส่รหัสห้อง 4 ตัว");
      return;
    }
    if (!playerName.trim()) {
      setError("กรุณาใส่ชื่อของคุณ");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("wongtaek-join-name", playerName.trim());
    }
    // TODO: Validate room code with backend
    router.push(`/lobby/${roomCode}`);
  };

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-32 flex flex-col">
      {/* Header */}
      <header className="flex items-center p-4 pb-2 justify-between">
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
      <div className="flex flex-col items-center justify-center pt-12 pb-8">
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
      <div className="flex-1 px-5 space-y-8">
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
                  size-16 rounded-xl border-2 flex items-center justify-center
                  text-3xl font-bold font-mono bg-white/5 transition-all
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
            className="w-full bg-white/5 border border-white/10 text-center text-xl font-bold text-white placeholder-white/30 py-3 px-4 rounded-xl focus:border-neon-blue focus:ring-0 focus:outline-none transition-all uppercase tracking-[0.5em]"
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
            className="input-neon text-2xl font-bold"
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
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 w-full p-6 pt-12 bg-gradient-to-t from-[#161118] via-[#161118] to-transparent z-20 max-w-md mx-auto left-1/2 -translate-x-1/2">
        <Button
          onClick={handleJoin}
          variant="neon-blue"
          size="xl"
          fullWidth
          icon="login"
          iconPosition="right"
          disabled={roomCode.length !== 4 || !playerName.trim()}
        >
          เข้าร่วมวง
        </Button>
      </div>
    </main>
  );
}
