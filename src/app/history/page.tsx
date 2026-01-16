"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlassPanel, BottomNav } from "@/components/ui";

const historyItems = [
  {
    date: "วันนี้ 22:30",
    name: "สายแข็ง 2024",
    players: 6,
    duration: "45 นาที",
  },
  {
    date: "เมื่อวาน 23:15",
    name: "วงเพื่อนเก่า",
    players: 4,
    duration: "30 นาที",
  },
  { date: "12 ม.ค.", name: "ปาร์ตี้ปีใหม่", players: 8, duration: "1 ชม." },
];

export default function HistoryPage() {
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
              12
            </span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              เกมทั้งหมด
            </span>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-neon-blue">48</span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              แก้วที่ดื่ม
            </span>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-neon-green">3.5h</span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              เวลาเล่น
            </span>
          </div>
        </GlassPanel>
      </div>

      {/* History List */}
      <div className="px-5 mt-6 space-y-3">
        <h3 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase ml-1">
          ประวัติล่าสุด
        </h3>

        {historyItems.map((item, index) => (
          <motion.div
            key={index}
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
            </div>
            <span className="material-symbols-outlined text-white/20">
              chevron_right
            </span>
          </motion.div>
        ))}

        {historyItems.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-white/10 mb-4">
              history
            </span>
            <p className="text-white/40">ยังไม่มีประวัติการเล่น</p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
