"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassPanel, Button, BottomNav } from "@/components/ui";
import Link from "next/link";

type FeedbackType = "BUG" | "FEATURE";

export default function FeedbackPage() {
  const router = useRouter();
  const [type, setType] = useState<FeedbackType>("BUG");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("กรุณากรอกหัวข้อ");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          details: details.trim() || undefined,
          contact: contact.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("ไม่สามารถส่งข้อมูลได้ ลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="container-mobile min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            ขอบคุณสำหรับ Feedback!
          </h1>
          <p className="text-white/60">กำลังกลับหน้าหลัก...</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <header className="flex items-center p-4 pt-8 gap-4">
        <Link href="/">
          <button className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors text-white">
            <span className="material-symbols-outlined text-3xl">
              arrow_back
            </span>
          </button>
        </Link>
        <div>
          <h1 className="text-white text-xl font-bold">
            แจ้งปัญหา / ขอฟีเจอร์
          </h1>
          <p className="text-white/40 text-sm">ส่งความคิดเห็นถึงผู้ดูแลระบบ</p>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 mt-4 space-y-6">
        {/* Type Selection */}
        <div>
          <label className="block text-white/60 text-sm mb-3 font-medium">
            ประเภท <span className="text-neon-red">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("BUG")}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                type === "BUG"
                  ? "border-neon-red bg-neon-red/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <span className="material-symbols-outlined text-3xl text-neon-red">
                bug_report
              </span>
              <span className="text-white font-medium">🐛 แจ้งบัค</span>
              <span className="text-white/40 text-xs">พบปัญหาในระบบ</span>
            </button>
            <button
              type="button"
              onClick={() => setType("FEATURE")}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                type === "FEATURE"
                  ? "border-neon-yellow bg-neon-yellow/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <span className="material-symbols-outlined text-3xl text-neon-yellow">
                lightbulb
              </span>
              <span className="text-white font-medium">💡 ขอฟีเจอร์</span>
              <span className="text-white/40 text-xs">อยากให้มีสิ่งใหม่</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">
            หัวข้อ <span className="text-neon-red">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น อยากได้แผนที่แบบออฟไลน์"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary focus:outline-none transition-colors"
            maxLength={100}
          />
        </div>

        {/* Details */}
        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">
            รายละเอียด
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="อธิบายฟีเจอร์ที่ต้องการ: ใช้งานยังไง, มีประโยชน์อะไร..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary focus:outline-none transition-colors resize-none h-32"
            maxLength={1000}
          />
        </div>

        {/* Contact */}
        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">
            ช่องทางติดต่อกลับ <span className="text-white/30">(ไม่บังคับ)</span>
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="อีเมลหรือเบอร์โทร"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary focus:outline-none transition-colors"
            maxLength={100}
          />
        </div>

        {/* Error */}
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
        <Button
          type="submit"
          variant="primary"
          size="xl"
          fullWidth
          disabled={isSubmitting}
          icon={isSubmitting ? undefined : "send"}
          iconPosition="left"
        >
          {isSubmitting ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
        </Button>

        <p className="text-center text-white/30 text-xs">
          ความคิดเห็นของคุณจะช่วยพัฒนาระบบให้ดียิ่งขึ้น
        </p>
      </form>

      <BottomNav />
    </main>
  );
}
