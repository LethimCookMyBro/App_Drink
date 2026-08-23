"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlassPanel, BottomNav } from "@/frontend/components/ui";
import { useAuthStore } from "@/frontend/store/authStore";

import { Icon } from "@/frontend/components/ui/Icon";

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
  const [loadError, setLoadError] = useState("");

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      const res = await fetch("/api/user/history");
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setLoadError(data?.error || "ไม่สามารถโหลดประวัติการเล่นได้");
        return;
      }

      setHistoryItems(Array.isArray(data?.history) ? data.history : []);
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch {
      setLoadError("ไม่สามารถเชื่อมต่อเพื่อโหลดประวัติได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Wait for auth to resolve before fetching
    if (isAuthenticated === undefined) return;
    if (!isAuthenticated) return;

    const fetchId = window.setTimeout(() => {
      void fetchHistory();
    }, 0);
    return () => {
      window.clearTimeout(fetchId);
    };
  }, [isAuthenticated, fetchHistory]);

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-28">
      {/* Header */}
      <header className="flex items-center justify-between p-4 pb-2 sm:px-6 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-0 lg:pt-10">
        <Link href="/" aria-label="กลับ" className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors text-white">
          <Icon name="arrow_back" className="text-[28px]" aria-hidden="true" />
        </Link>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
          ประวัติการเล่น
        </h2>
        <div className="flex size-12 shrink-0 items-center justify-center" />
      </header>

      {/* Stats Summary */}
      <div className="mx-auto mt-4 w-full max-w-5xl px-4 sm:px-6 lg:px-0">
        <GlassPanel className="flex flex-col gap-4 text-center sm:flex-row sm:items-stretch sm:justify-around sm:gap-0">
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-primary drop-shadow-[0_0_10px_rgba(199,61,245,0.6)]">
              {stats.totalGames}
            </span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              เกมทั้งหมด
            </span>
          </div>
          <div className="hidden h-12 w-px bg-white/10 sm:block" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-neon-blue">
              {stats.totalDrinks}
            </span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              แก้วที่ดื่ม
            </span>
          </div>
          <div className="hidden h-12 w-px bg-white/10 sm:block" />
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
        <div className="mx-auto mt-6 w-full max-w-5xl px-4 sm:px-6 lg:px-0">
          <GlassPanel className="p-6 text-center">
            <Icon name="person_off" className="text-4xl text-white/20 mb-2" />
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
      <div className="mx-auto mt-6 w-full max-w-5xl space-y-3 px-4 sm:px-6 lg:px-0">
        <h3 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase ml-1">
          ประวัติล่าสุด
        </h3>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-white/40">กำลังโหลด...</div>
          </div>
        ) : loadError ? (
          <GlassPanel variant="red" className="p-5 text-center text-neon-red">
            {loadError}
          </GlassPanel>
        ) : historyItems.length > 0 ? (
          historyItems.map((item, index) => (
            <motion.div
              key={item.id || index}
              className="glass-panel flex items-center gap-4 rounded-xl border border-white/5 p-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="local_bar" />
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

            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <Icon name="history" className="text-6xl text-white/10 block mb-4" />
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
