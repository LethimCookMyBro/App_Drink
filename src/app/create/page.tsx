"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";

export default function CreateCirclePage() {
  const router = useRouter();
  const { createRoom, vibeLevel } = useGameStore();

  const [circleName, setCircleName] = useState("สายแข็ง 2024");
  const [playerCount, setPlayerCount] = useState(8);

  const handleCreate = () => {
    // 18+ mode is now controlled via Settings, not here
    createRoom(circleName, "ฉัน", 3, false, playerCount);
    router.push("/lobby/new");
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
      <div className="flex-1 px-5 space-y-8">
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
              className="input-neon text-3xl font-bold"
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
        >
          สร้างวงเลย
        </Button>
      </div>
    </main>
  );
}
