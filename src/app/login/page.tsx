"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel, TurnstileWidget } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";

const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (turnstileEnabled && !turnstileToken) {
      setError("กรุณายืนยันว่าไม่ใช่บอทก่อนเข้าสู่ระบบ");
      return;
    }

    setIsLoading(true);

    const result = await login(email, password, turnstileToken);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "เกิดข้อผิดพลาด");
      if (turnstileEnabled) {
        setTurnstileResetKey((current) => current + 1);
      }
    }

    setIsLoading(false);
  };

  return (
    <main className="container-mobile min-h-screen flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <motion.div
        className="mb-8 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(199,61,245,0.6)]">
          วงแตก
        </h1>
        <p className="text-white/40 mt-2">เกมวงเหล้าเพื่อนสนิท</p>
      </motion.div>

      {/* Login Form */}
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassPanel className="p-6">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            เข้าสู่ระบบ
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                placeholder="example@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <motion.div
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {error}
              </motion.div>
            )}

            {turnstileEnabled && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <TurnstileWidget
                  action="login"
                  onTokenChange={setTurnstileToken}
                  resetKey={turnstileResetKey}
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading || (turnstileEnabled && !turnstileToken)}
            >
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/40 text-sm">
              ยังไม่มีบัญชี?{" "}
              <Link
                href="/register"
                className="text-primary hover:underline font-medium"
              >
                สมัครสมาชิก
              </Link>
            </p>
          </div>
        </GlassPanel>

        {/* Skip login option */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-white/30 text-sm hover:text-white/50">
            ข้ามการเข้าสู่ระบบ →
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
