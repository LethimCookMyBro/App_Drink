"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel, BottomNav } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";

interface UserStats {
  totalGames: number;
  totalDrinks: number;
  totalPlayTime: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, checkAuth } =
    useAuthStore();
  const [stats, setStats] = useState<UserStats>({
    totalGames: 0,
    totalDrinks: 0,
    totalPlayTime: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, [checkAuth]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      // Use default stats
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center">
        <div className="text-white/60">กำลังโหลด...</div>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center p-6">
        <GlassPanel className="p-8 text-center max-w-sm">
          <span className="material-symbols-outlined text-6xl text-white/20 mb-4">
            person_off
          </span>
          <h2 className="text-xl font-bold text-white mb-2">
            ยังไม่ได้เข้าสู่ระบบ
          </h2>
          <p className="text-white/40 mb-6">
            เข้าสู่ระบบเพื่อดูโปรไฟล์และประวัติการเล่น
          </p>
          <div className="space-y-3">
            <Link href="/login" className="block">
              <Button variant="primary" fullWidth>
                เข้าสู่ระบบ
              </Button>
            </Link>
            <Link href="/register" className="block">
              <Button variant="outline" fullWidth>
                สมัครสมาชิก
              </Button>
            </Link>
          </div>
        </GlassPanel>
        <BottomNav />
      </main>
    );
  }

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
          โปรไฟล์
        </h2>
        <div className="flex size-12 shrink-0 items-center justify-center" />
      </header>

      {/* Profile Card */}
      <div className="px-5 mt-4">
        <GlassPanel className="p-6">
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-lg shadow-primary/30">
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <h3 className="text-2xl font-bold text-white">{user.name}</h3>
            <p className="text-white/40 text-sm mt-1">{user.email}</p>
          </motion.div>
        </GlassPanel>
      </div>

      {/* Stats */}
      <div className="px-5 mt-4">
        <GlassPanel className="flex justify-around text-center py-6">
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

      {/* Menu Options */}
      <div className="px-5 mt-6 space-y-3">
        <h3 className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase ml-1">
          ตั้งค่า
        </h3>

        <Link href="/history">
          <motion.div
            className="glass-panel flex items-center gap-4 p-4 rounded-xl border border-white/5"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">history</span>
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold">ประวัติการเล่น</h4>
              <p className="text-white/40 text-sm">ดูเกมที่เคยเล่น</p>
            </div>
            <span className="material-symbols-outlined text-white/20">
              chevron_right
            </span>
          </motion.div>
        </Link>

        <Link href="/settings">
          <motion.div
            className="glass-panel flex items-center gap-4 p-4 rounded-xl border border-white/5 mt-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
              <span className="material-symbols-outlined">settings</span>
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold">ตั้งค่า</h4>
              <p className="text-white/40 text-sm">เสียง, สั่น, โหมด 18+</p>
            </div>
            <span className="material-symbols-outlined text-white/20">
              chevron_right
            </span>
          </motion.div>
        </Link>
      </div>

      {/* Logout Button */}
      <div className="px-5 mt-8">
        <Button
          variant="outline"
          fullWidth
          icon="logout"
          onClick={handleLogout}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          ออกจากระบบ
        </Button>
      </div>

      <BottomNav />
    </main>
  );
}
