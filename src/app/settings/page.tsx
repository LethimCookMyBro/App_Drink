"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import { THEMES, AVATAR_EMOJIS, type ThemeId } from "@/config/themes";
import { applyTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const {
    userId,
    settings,
    isLoaded,
    setTheme,
    setHapticLevel,
    setSoundEnabled,
    setVibrationEnabled,
    setAvatar,
    setIs18Plus,
  } = useUserSettings();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Handler that also applies theme immediately
  const handleThemeChange = (themeId: ThemeId) => {
    setTheme(themeId);
    applyTheme(themeId);
  };

  // Handler for 18+ mode - syncs to BOTH per-user and global key
  const handle18PlusChange = (enabled: boolean) => {
    setIs18Plus(enabled);
    // Also save to global key for game pages to read
    if (typeof window !== "undefined") {
      localStorage.setItem("wongtaek-18plus", enabled.toString());
    }
  };

  const hapticOptions = [
    { value: "off", label: "ปิด", icon: "do_not_disturb_on" },
    { value: "light", label: "เบา", icon: "vibration" },
    { value: "strong", label: "แรง", icon: "edgesensor_high" },
  ] as const;

  if (!isLoaded) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-white/40">กำลังโหลด...</div>
      </main>
    );
  }

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <header className="flex items-center p-4 pt-8 justify-between">
        <Link href="/">
          <button className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors text-white">
            <span className="material-symbols-outlined text-3xl">
              arrow_back
            </span>
          </button>
        </Link>
        <h2 className="text-white text-xl font-bold leading-tight tracking-tight">
          ตั้งค่า
        </h2>
        <div className="flex size-12 shrink-0 items-center justify-center" />
      </header>

      {/* User indicator */}
      <div className="px-5 mb-4">
        <div className="text-white/40 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">person</span>
          Settings สำหรับ:{" "}
          <span className="text-primary font-bold">{userId}</span>
        </div>
      </div>

      {/* Settings List */}
      <div className="px-5 space-y-4">
        {/* Avatar */}
        <GlassPanel
          className="flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors active:scale-[0.99]"
          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center text-3xl border-2 border-primary/50">
              {settings.avatar}
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg leading-tight">
                อวาตาร์
              </span>
              <span className="text-white/40 text-sm">กดเพื่อเปลี่ยน</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-white/40">
            chevron_right
          </span>
        </GlassPanel>

        {/* Avatar Picker */}
        {showAvatarPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-8 gap-2 p-3 bg-white/5 rounded-xl border border-white/10"
          >
            {AVATAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setAvatar(emoji);
                  setShowAvatarPicker(false);
                }}
                className={`text-2xl p-2 rounded-lg hover:bg-white/10 transition-colors ${
                  settings.avatar === emoji
                    ? "bg-primary/20 ring-2 ring-primary"
                    : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}

        {/* Theme Selector */}
        <div className="space-y-3">
          <h3 className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase px-1">
            ธีม
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(THEMES) as ThemeId[]).map((themeId) => {
              const t = THEMES[themeId];
              const isActive = settings.theme === themeId;
              return (
                <button
                  key={themeId}
                  onClick={() => handleThemeChange(themeId)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full"
                      style={{ background: t.colors.primary }}
                    />
                    <span className="material-symbols-outlined text-white/60">
                      {t.icon}
                    </span>
                    <span className="text-white text-sm font-medium">
                      {t.name.split(" ")[0]}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <span className="material-symbols-outlined text-primary text-lg">
                        check_circle
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Haptic Level */}
        <div className="space-y-3">
          <h3 className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase px-1">
            ความแรงสั่น
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {hapticOptions.map((opt) => {
              const isActive = settings.hapticLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setHapticLevel(opt.value)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    isActive
                      ? "border-neon-blue bg-neon-blue/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${isActive ? "text-neon-blue" : "text-white/60"}`}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={`text-sm font-medium ${isActive ? "text-neon-blue" : "text-white"}`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/10 my-2" />

        {/* Sound */}
        <GlassPanel className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">
                volume_up
              </span>
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
              checked={settings.soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary peer-checked:shadow-neon-purple" />
          </label>
        </GlassPanel>

        {/* Vibration */}
        <GlassPanel className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
              <span className="material-symbols-outlined text-2xl">
                vibration
              </span>
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
              checked={settings.vibrationEnabled}
              onChange={(e) => setVibrationEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-blue peer-checked:shadow-neon-blue" />
          </label>
        </GlassPanel>

        {/* Divider */}
        <div className="h-px w-full bg-white/10 my-2" />

        {/* 18+ Mode */}
        <GlassPanel className="flex items-center justify-between" variant="red">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-red/10 flex items-center justify-center text-neon-red">
              <span className="material-symbols-outlined text-2xl">
                warning
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                โหมด 18+
                {settings.is18Plus && (
                  <span className="text-[10px] bg-neon-red px-2 py-0.5 rounded-full uppercase">
                    เปิด
                  </span>
                )}
              </span>
              <span className="text-white/40 text-sm">คำถามสำหรับผู้ใหญ่</span>
            </div>
          </div>
          <label className="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is18Plus}
              onChange={(e) => handle18PlusChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-red peer-checked:shadow-neon-red" />
          </label>
        </GlassPanel>

        {/* Divider */}
        <div className="h-px w-full bg-white/10 my-2" />

        {/* About Section */}
        <GlassPanel className="flex flex-col gap-4">
          <h3 className="text-white/60 text-xs font-bold tracking-[0.1em] uppercase">
            เกี่ยวกับ
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-white/80">เวอร์ชัน</span>
            <span className="text-primary font-mono">v3.0.0</span>
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
