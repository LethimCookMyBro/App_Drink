"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel, TurnstileWidget } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";
import { setCurrentUser } from "@/hooks/useUserSettings";

const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function CreateCirclePage() {
  const router = useRouter();
  const { vibeLevel } = useGameStore();

  const [circleName, setCircleName] = useState("สายแข็ง 2024");
  const [playerName, setPlayerName] = useState("");
  const [playerCount, setPlayerCount] = useState(8);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleCreate = async () => {
    const name = playerName.trim() || "ผู้เล่น 1";
    const difficulty =
      vibeLevel === "chilling" ? 1 : vibeLevel === "tipsy" ? 2 : 3;

    setError("");

    if (turnstileEnabled && !turnstileToken) {
      setError("กรุณายืนยันว่าไม่ใช่บอทก่อนสร้างห้อง");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: name,
          name: circleName.trim() || "วงของเรา",
          maxPlayers: playerCount,
          is18Plus: vibeLevel === "chaos",
          difficulty,
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "สร้างห้องไม่สำเร็จ");
        if (turnstileEnabled) {
          setTurnstileResetKey((current) => current + 1);
        }
        return;
      }

      localStorage.setItem("wongtaek-player-name", name);
      localStorage.setItem("wongtaek-room-code", data.room.code);
      localStorage.removeItem("wongtaek-game-started");
      setCurrentUser(name);
      router.push(`/lobby/${data.room.code}`);
    } catch {
      setError("ไม่สามารถสร้างห้องได้ ลองใหม่อีกครั้ง");
      if (turnstileEnabled) {
        setTurnstileResetKey((current) => current + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-32">
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
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
            สร้างวงเหล้า
          </h2>
        </div>
        <Link href="/settings">
          <button className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors text-white/60 hover:text-white">
            <span className="material-symbols-outlined text-[24px]">
              settings
            </span>
          </button>
        </Link>
      </header>

      {/* Crown Icon */}
      <div className="flex flex-col items-center justify-center pt-6 pb-8">
        <motion.div
          className="relative group cursor-pointer"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full opacity-50 animate-pulse" />
          <div className="relative flex items-center justify-center size-20 rounded-full border border-yellow-400/30 bg-gradient-to-b from-yellow-400/10 to-transparent shadow-[0_0_30px_rgba(250,204,21,0.2)]">
            <span className="material-symbols-outlined text-[40px] text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] material-symbols-filled">
              crown
            </span>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
            เจ้าของวง
          </div>
        </motion.div>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 space-y-6">
        {/* Player Name */}
        <div className="flex flex-col gap-3">
          <label className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase ml-1">
            ชื่อของคุณ
          </label>
          <div className="relative">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="ใส่ชื่อของคุณ..."
              className="input-neon text-xl font-bold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/50 material-symbols-outlined">
              person
            </span>
          </div>
        </div>

        {/* Circle Name */}
        <div className="flex flex-col gap-3">
          <label className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase ml-1">
            ชื่อวง
          </label>
          <div className="relative">
            <input
              type="text"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              placeholder="ตั้งชื่อวง..."
              className="input-neon text-xl font-bold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/50 material-symbols-outlined">
              edit
            </span>
          </div>
        </div>

        {/* Player Count */}
        <GlassPanel className="flex flex-col gap-3">
          <label className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase mb-2">
            จำนวนผู้เล่นสูงสุด
          </label>
          <div className="flex items-center justify-between bg-black/20 rounded-xl p-1">
            <motion.button
              onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
              className="size-12 rounded-lg bg-white/5 hover:bg-white/10 active:bg-primary active:text-white flex items-center justify-center text-white/70 transition-all"
              whileTap={{ scale: 0.9 }}
            >
              <span className="material-symbols-outlined">remove</span>
            </motion.button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-white tracking-widest font-mono">
                {String(playerCount).padStart(2, "0")}
              </span>
            </div>
            <motion.button
              onClick={() => setPlayerCount(Math.min(20, playerCount + 1))}
              className="size-12 rounded-lg bg-white/5 hover:bg-white/10 active:bg-primary active:text-white flex items-center justify-center text-white/70 transition-all"
              whileTap={{ scale: 0.9 }}
            >
              <span className="material-symbols-outlined">add</span>
            </motion.button>
          </div>
        </GlassPanel>

        {/* 18+ Info */}
        <div className="text-center text-white/30 text-sm">
          <span className="material-symbols-outlined text-base align-middle mr-1">
            info
          </span>
          เปิดโหมด 18+ ได้ในหน้าตั้งค่า
        </div>

        {error && (
          <p className="rounded-xl border border-neon-red/40 bg-neon-red/10 px-4 py-3 text-center text-sm text-neon-red">
            {error}
          </p>
        )}

        {turnstileEnabled && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <TurnstileWidget
              action="room_create"
              onTokenChange={setTurnstileToken}
              resetKey={turnstileResetKey}
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 w-full p-6 pt-12 bg-gradient-to-t from-[#161118] via-[#161118] to-transparent z-20 max-w-md mx-auto left-1/2 -translate-x-1/2">
        <Button
          onClick={handleCreate}
          variant="primary"
          size="xl"
          fullWidth
          icon="arrow_forward"
          iconPosition="right"
          disabled={isSubmitting || (turnstileEnabled && !turnstileToken)}
        >
          {isSubmitting ? "กำลังสร้างห้อง..." : "สร้างวงเลย"}
        </Button>
      </div>
    </main>
  );
}
