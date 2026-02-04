"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        const data = await res.json();
        if (data.authenticated) {
          router.push("/admin");
        }
      } catch {
        // Not authenticated, stay on login page
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }

      // Success - redirect to admin
      router.push("/admin");
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <main className="container-mobile min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-white/40">กำลังตรวจสอบ...</div>
      </main>
    );
  }

  return (
    <main className="container-mobile min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-white/40 text-sm mt-2">เข้าสู่ระบบผู้ดูแล</p>
        </div>

        {/* Login Form */}
        <GlassPanel className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-white/60 text-sm mb-2">
                อีเมล
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary focus:outline-none transition-colors"
                placeholder="Username"
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/60 text-sm mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary focus:outline-none transition-colors"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-neon-red/20 border border-neon-red/50 rounded-lg text-neon-red text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>
        </GlassPanel>

        {/* Back to home */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/")}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </motion.div>
    </main>
  );
}
