"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

const chaosRules = [
  { target: "ใครที่ใส่เสื้อสีดำ", action: "ดื่มให้หมดแก้ว!" },
  { target: "คนที่อายุน้อยที่สุด", action: "เลือกคนดื่ม 2 แก้ว" },
  { target: "คนที่ถือมือถือ", action: "ดื่มทันทีแล้ววางมือถือ" },
  { target: "ทุกคนในวง", action: "ดื่มพร้อมกัน 3 วิ!" },
  { target: "คนที่หัวเราะก่อน", action: "โดนจี้ 10 ครั้ง" },
];

export default function ChaosModePage() {
  const router = useRouter();
  const [sequence, setSequence] = useState(4);
  const [currentRule, setCurrentRule] = useState(chaosRules[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * chaosRules.length);
      setCurrentRule(chaosRules[randomIndex]);
      setSequence((prev) => prev + 1);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <main className="container-mobile min-h-screen flex flex-col relative overflow-hidden bg-[#0a050b]">
      {/* CRT Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none crt-overlay opacity-30 mix-blend-overlay" />

      {/* Glow Background */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-red/20 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col h-screen justify-between p-4 safe-area-bottom">
        {/* Top Section */}
        <div className="w-full flex flex-col gap-6 pt-8">
          {/* Hazard Stripe */}
          <div className="w-full h-3 hazard-stripe opacity-80 border-x-4 border-white/20" />

          {/* Warning Icons */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="material-symbols-outlined text-neon-yellow text-4xl material-symbols-filled"
                animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
              >
                warning
              </motion.span>
            ))}
          </div>

          {/* Title */}
          <div className="relative group">
            <div className="absolute inset-0 bg-neon-red blur opacity-20" />
            <h1 className="relative text-center text-neon-yellow text-2xl font-bold tracking-wider uppercase border-y border-neon-yellow/30 py-2 mx-4 bg-[#0a050b]/80 backdrop-blur-sm">
              ⚠️ โหมดโกลาหล! ⚠️
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-md mx-auto relative"
          key={currentRule.target + currentRule.action}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-red/5 to-transparent skew-y-12 pointer-events-none" />

          {/* Target */}
          <p
            className="text-white/90 text-2xl md:text-3xl font-bold text-center uppercase tracking-wide leading-relaxed px-2"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}
          >
            {currentRule.target}
          </p>

          {/* Action */}
          <div className="relative w-full text-center py-6">
            <div className="absolute top-0 left-2 w-8 h-8 border-t-4 border-l-4 border-neon-red" />
            <div className="absolute top-0 right-2 w-8 h-8 border-t-4 border-r-4 border-neon-red" />
            <div className="absolute bottom-0 left-2 w-8 h-8 border-b-4 border-l-4 border-neon-red" />
            <div className="absolute bottom-0 right-2 w-8 h-8 border-b-4 border-r-4 border-neon-red" />

            <h2 className="text-[3.5rem] md:text-[4.5rem] leading-[1.1] font-black text-white uppercase tracking-tighter glitch-text transform -rotate-1 whitespace-pre-wrap break-words">
              {currentRule.action}
            </h2>
          </div>

          {/* Mandatory Label */}
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <span className="material-symbols-outlined text-neon-red text-sm">
              lock
            </span>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
              กฎบังคับ (Mandatory)
            </span>
          </div>
        </motion.div>

        {/* Bottom Section */}
        <div className="w-full pb-6 pt-4 flex flex-col items-center gap-4">
          <motion.button
            onClick={handleNext}
            className="relative w-full group overflow-hidden rounded-xl shadow-[0_0_40px_rgba(255,0,64,0.3)] active:scale-[0.98] transition-transform duration-100"
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-neon-red" />
            <div className="absolute inset-0 hazard-stripe opacity-10" />
            <div className="relative flex items-center justify-between h-20 px-8">
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-mono text-black font-bold uppercase tracking-widest opacity-60">
                  Sequence {String(sequence).padStart(2, "0")}
                </span>
                <span className="text-black text-3xl font-black uppercase tracking-tight italic">
                  ไปต่อ
                </span>
              </div>
              <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-black/10">
                <span className="material-symbols-outlined text-black text-3xl font-bold">
                  arrow_forward
                </span>
              </div>
            </div>
          </motion.button>

          <div className="w-1/3 h-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent rounded-full" />
        </div>
      </div>
    </main>
  );
}
