"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel, TurnstileWidget } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";

const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    if (name.trim().length === 0) {
      setError("กรุณากรอกชื่อที่แสดง");
      return;
    }

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข");
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setError("กรุณายืนยันว่าไม่ใช่บอทก่อนสมัครสมาชิก");
      return;
    }

    setIsLoading(true);

    const result = await register(email, password, name.trim(), turnstileToken);

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
    <main className="container-mobile flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
      {/* Logo */}
      <motion.div
        className="mb-8 text-center lg:mb-10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-[clamp(3.5rem,12vw,5.5rem)] font-black text-white drop-shadow-[0_0_15px_rgba(199,61,245,0.6)]">
          วงแตก
        </h1>
        <p className="mt-2 text-white/40 sm:text-lg">เกมวงเหล้าเพื่อนสนิท</p>
      </motion.div>

      {/* Register Form */}
      <motion.div
        className="w-full max-w-md sm:max-w-lg lg:max-w-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassPanel className="p-5 sm:p-6 lg:p-8">
          <h2 className="mb-6 text-center text-xl font-bold text-white sm:text-2xl">
            สมัครสมาชิก
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">
                ชื่อที่แสดง
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-all focus:border-primary/50 focus:bg-white/10 focus:outline-none"
                placeholder="ชื่อของคุณ"
                required
                disabled={isLoading}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-all focus:border-primary/50 focus:bg-white/10 focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-all focus:border-primary/50 focus:bg-white/10 focus:outline-none"
                placeholder="อย่างน้อย 8 ตัวอักษร และมีตัวเลข"
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">
                ยืนยันรหัสผ่าน
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
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
                  action="register"
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
              {isLoading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/40 text-sm">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </GlassPanel>

        {/* Skip registration option */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-white/30 text-sm hover:text-white/50">
            ข้ามการสมัครสมาชิก →
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
