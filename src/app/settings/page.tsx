"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";

export default function SettingsPage() {
  const { soundEnabled, vibrationEnabled, vibeLevel, setVibeLevel } =
    useGameStore();

  const [sound, setSound] = useState(soundEnabled);
  const [vibration, setVibration] = useState(vibrationEnabled);
  const [is18Plus, setIs18Plus] = useState(false);

  // Load 18+ state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("wongtaek-18plus");
    if (stored === "true") {
      setIs18Plus(true);
    }
  }, []);

  // Save 18+ state to localStorage
  const handle18PlusChange = (checked: boolean) => {
    setIs18Plus(checked);
    localStorage.setItem("wongtaek-18plus", checked.toString());
    // Also update vibe level if turning off
    if (!checked && vibeLevel === "chaos") {
      setVibeLevel("tipsy");
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
          ตั้งค่า
        </h2>
        <div className="flex size-12 shrink-0 items-center justify-center" />
      </header>

      {/* Settings List */}
      <div className="px-5 space-y-4 mt-4">
        {/* Sound */}
        <GlassPanel className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">volume_up</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg leading-tight">
                เสียง
              </span>
              <span className="text-white/40 text-sm">เสียงเอฟเฟกต์ในเกม</span>
            </div>
          </div>
          <label className="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary peer-checked:shadow-neon-purple" />
          </label>
        </GlassPanel>

        {/* Vibration */}
        <GlassPanel className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
              <span className="material-symbols-outlined">vibration</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg leading-tight">
                สั่น
              </span>
              <span className="text-white/40 text-sm">สั่นเมื่อถึงตา</span>
            </div>
          </div>
          <label className="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={vibration}
              onChange={(e) => setVibration(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-blue peer-checked:shadow-neon-blue" />
          </label>
        </GlassPanel>

        {/* 18+ Mode - Main control for adult content */}
        <GlassPanel className="flex items-center justify-between" variant="red">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-red/10 flex items-center justify-center text-neon-red">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                โหมด 18+
                {is18Plus && (
                  <span className="text-[10px] bg-neon-red px-2 py-0.5 rounded-full uppercase">
                    เปิดใช้งาน
                  </span>
                )}
              </span>
              <span className="text-white/40 text-sm">
                เปิดเพื่อใช้คำถามสำหรับผู้ใหญ่
              </span>
            </div>
          </div>
          <label className="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={is18Plus}
              onChange={(e) => handle18PlusChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-red peer-checked:shadow-neon-red" />
          </label>
        </GlassPanel>

        {/* 18+ Warning */}
        {is18Plus && (
          <div className="p-4 rounded-xl bg-neon-red/10 border border-neon-red/20">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-neon-red">
                info
              </span>
              <p className="text-white/60 text-sm">
                โหมด 18+ จะเปิดใช้งานคำถามที่มีเนื้อหาสำหรับผู้ใหญ่
                ซึ่งอาจรวมถึงเนื้อหารุนแรง คำถามส่วนตัว และภารกิจที่ท้าทาย
              </p>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px w-full bg-white/10 my-6" />

        {/* About Section */}
        <GlassPanel className="flex flex-col gap-4">
          <h3 className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase">
            เกี่ยวกับ
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-white/80">เวอร์ชัน</span>
            <span className="text-primary font-mono">v2.4.0</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-white/80">ผู้พัฒนา</span>
            <span className="text-white/60">Wong Taek Team</span>
          </div>

          <Link
            href="/admin"
            className="flex items-center justify-between py-2 hover:bg-white/5 -mx-4 px-4 rounded-lg transition-colors"
          >
            <span className="text-white/80">Admin Panel</span>
            <span className="material-symbols-outlined text-white/40">
              chevron_right
            </span>
          </Link>
        </GlassPanel>

        {/* Warning */}
        <div className="text-center py-4">
          <p className="text-white/30 text-xs">
            ⚠️ โปรดดื่มอย่างรับผิดชอบ
            <br />
            แอปนี้เหมาะสำหรับผู้ที่มีอายุ 18 ปีขึ้นไป
          </p>
        </div>
      </div>
    </main>
  );
}
