"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlassPanel, BottomNav } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";

interface HistoryItem {
  id: string;
  name: string;
  mode: string;
  players: number;
  duration: string;
  date: string;
  roundCount: number;
}

interface UserStats {
  totalGames: number;
  totalDrinks: number;
  totalPlayTime: number;
}

const modeLabels: Record<string, string> = {
  QUESTION: "โหมดคำถาม",
  VOTE: "โหมดโหวต",
  TRUTH_OR_DARE: "ความจริงหรือท้า",
  CHAOS: "โกลาหล",
  MIXED: "ผสม",
};

export default function HistoryPage() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalGames: 0,
    totalDrinks: 0,
    totalPlayTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchHistory();
  }, [checkAuth]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/user/history");
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          setHistoryItems(data.history);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      // Keep default empty state
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <header className="flex items-center p-4 pb-2 justify-between">
        <Link href="/">
          <button className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors text-white">
            <span className="material-symbols-outlined text-[28px]">
              arrow_back
            </span>
          </button>
        </Link>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
          ประวัติการเล่น
        </h2>
        <div className="flex size-12 shrink-0 items-center justify-center" />
      </header>

      {/* Stats Summary */}
      <div className="px-5 mt-4">
        <GlassPanel className="flex justify-around text-center">
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-primary drop-shadow-[0_0_10px_rgba(199,61,245,0.6)]">
              {stats.totalGames}
            </span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              เกมทั้งหมด
            </span>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-neon-blue">
              {stats.totalDrinks}
            </span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              แก้วที่ดื่ม
            </span>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-neon-green">
              {stats.totalPlayTime}h
            </span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              เวลาเล่น
            </span>
          </div>
        </GlassPanel>
      </div>

      {/* Login prompt for non-authenticated users */}
      {!isAuthenticated && !isLoading && (
        <div className="px-5 mt-6">
          <GlassPanel className="p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-white/20 mb-2">
              person_off
            </span>
            <p className="text-white/40 text-sm mb-4">
              เข้าสู่ระบบเพื่อบันทึกและดูประวัติการเล่น
            </p>
            <Link
              href="/login"
              className="text-primary text-sm font-medium hover:underline"
            >
              เข้าสู่ระบบ →
            </Link>
          </GlassPanel>
        </div>
      )}

      {/* History List */}
      <div className="px-5 mt-6 space-y-3">
        <h3 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase ml-1">
          ประวัติล่าสุด
        </h3>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-white/40">กำลังโหลด...</div>
          </div>
        ) : historyItems.length > 0 ? (
          historyItems.map((item, index) => (
            <motion.div
              key={item.id || index}
              className="glass-panel flex items-center gap-4 p-4 rounded-xl border border-white/5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">local_bar</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">{item.name}</h4>
                <p className="text-white/40 text-sm">
                  {item.date} • {item.players} คน • {item.duration}
                </p>
                {item.mode && (
                  <span className="text-primary/60 text-xs">
                    {modeLabels[item.mode] || item.mode}
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined text-white/20">
                chevron_right
              </span>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-white/10 block mb-4">
              history
            </span>
            <p className="text-white/40">ยังไม่มีประวัติการเล่น</p>
            <p className="text-white/30 text-sm mt-2">
              เริ่มเล่นเกมเพื่อบันทึกประวัติ
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
