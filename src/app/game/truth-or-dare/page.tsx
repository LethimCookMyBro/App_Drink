"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";

const truthQuestions = [
  "เคยโกหกแฟนเรื่องอะไรที่หนักที่สุด?",
  "ความลับที่ไม่เคยบอกใครคืออะไร?",
  "เคยแอบชอบเพื่อนในกลุ่มบ้างไหม?",
  "เรื่องที่อายที่สุดในชีวิตคืออะไร?",
];

const dares = [
  "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
  "ทักแชทหาคนที่ไม่ได้คุยมา 1 ปี ด้วยสติกเกอร์แปลกๆ",
  "โพสต์ IG Story ร้องเพลงสักท่อน",
  "ให้คนในวงเลือกผู้ติดตามใน IG แล้วกดไลค์รูปเก่าสุด",
];

type CardType = "truth" | "dare";

export default function TruthOrDarePage() {
  const router = useRouter();
  const [cardType, setCardType] = useState<CardType>("dare");
  const [currentContent, setCurrentContent] = useState(dares[0]);
  const [roundNumber, setRoundNumber] = useState(4);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleComplete = () => {
    nextCard();
  };

  const handleGiveUp = () => {
    // Player drinks x2
    nextCard();
  };

  const nextCard = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const newType: CardType = Math.random() > 0.5 ? "truth" : "dare";
      const list = newType === "truth" ? truthQuestions : dares;
      const randomIndex = Math.floor(Math.random() * list.length);

      setCardType(newType);
      setCurrentContent(list[randomIndex]);
      setRoundNumber((prev) => prev + 1);
      setIsAnimating(false);
    }, 300);
  };

  const isTruth = cardType === "truth";

  return (
    <main className="container-mobile h-[100dvh] flex flex-col overflow-hidden bg-surface">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-neon-red/10 to-transparent pointer-events-none z-0 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 pt-10 pb-2">
        <div className="flex flex-col">
          <span className="text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
            ตาของ
          </span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white/20 to-white/5 border border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-white/80">
                person
              </span>
            </div>
            <h2 className="text-xl font-bold leading-none tracking-tight">
              ALEX
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-neon-red text-xs font-bold tracking-widest uppercase mb-1 drop-shadow-[0_0_8px_rgba(255,0,60,0.8)]">
            รอบที่ {roundNumber}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-6 rounded-full bg-neon-red shadow-[0_0_8px_rgba(255,0,60,1)]" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
          </div>
        </div>
      </header>

      {/* Card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-5 w-full">
        <div className="w-full h-full max-h-[65vh] relative flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentContent}
              className={`
                relative flex-1 w-full rounded-3xl border 
                ${
                  isTruth
                    ? "border-neon-blue shadow-neon-blue"
                    : "border-neon-red shadow-neon-red"
                }
                bg-[#1a0f1a] flex flex-col overflow-hidden ring-1 ring-inset ring-white/10
              `}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.4 }}
            >
              {/* Top Badge */}
              <div
                className={`relative h-24 bg-gradient-to-b ${
                  isTruth ? "from-neon-blue/20" : "from-neon-red/20"
                } to-transparent p-6 flex items-start justify-between z-20`}
              >
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold ${
                      isTruth ? "text-neon-blue" : "text-neon-red"
                    } tracking-widest mb-0.5`}
                  >
                    {isTruth ? "คำถาม" : "ภารกิจ"}
                  </span>
                  <div
                    className={`flex items-center gap-2 ${
                      isTruth ? "text-neon-blue" : "text-neon-red"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[36px] drop-shadow-[0_0_12px_${
                        isTruth ? "rgba(0,240,255,0.6)" : "rgba(255,0,64,0.6)"
                      }]`}
                    >
                      {isTruth ? "psychology_alt" : "local_fire_department"}
                    </span>
                    <span
                      className={`text-4xl font-bold tracking-tighter ${
                        isTruth ? "text-glow" : "text-glow-red"
                      }`}
                    >
                      {isTruth ? "ความจริง" : "คำท้า"}
                    </span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full border ${
                    isTruth
                      ? "border-neon-blue/40 bg-neon-blue/10 text-neon-blue"
                      : "border-neon-red/40 bg-neon-red/10 text-neon-red"
                  } text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm`}
                >
                  {isTruth ? "เปิดใจ 💙" : "เผ็ดร้อน 🔥"}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-8 py-4 flex flex-col justify-center items-center text-center relative z-10">
                <motion.div
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 ${
                    isTruth ? "bg-neon-blue/20" : "bg-neon-red/20"
                  } rounded-full blur-[60px] pointer-events-none`}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="relative text-2xl md:text-3xl font-bold leading-[1.3] text-white drop-shadow-md tracking-tight">
                  {currentContent}
                </p>
              </div>

              {/* Bottom Gradient */}
              <div className="h-1/4 relative overflow-hidden mt-auto border-t border-white/5">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-[#1a0f1a]/80 to-transparent z-10" />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Card Stack Effect */}
          <div className="absolute -bottom-3 left-6 right-6 h-4 bg-surface border border-white/10 rounded-b-3xl -z-10 opacity-60" />
          <div className="absolute -bottom-6 left-10 right-10 h-4 bg-surface border border-white/5 rounded-b-3xl -z-20 opacity-30" />
        </div>
      </div>

      {/* Buttons */}
      <footer className="relative z-20 px-6 pb-10 pt-4 flex flex-col gap-4 w-full bg-gradient-to-t from-background via-background/95 to-transparent">
        <Button
          onClick={handleComplete}
          variant="primary"
          size="xl"
          fullWidth
          icon="check_circle"
        >
          ทำเสร็จแล้ว
        </Button>

        <button
          onClick={handleGiveUp}
          className="group relative w-full h-16 rounded-xl border border-white/10 bg-white/5 text-white/60 font-medium text-base tracking-wide overflow-hidden active:scale-[0.98] transition-all hover:bg-white/10 hover:border-white/20 hover:text-white"
        >
          <span className="relative flex items-center justify-between px-6 w-full h-full">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
              ยอมแพ้
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-red/10 border border-neon-red/20">
              <span className="material-symbols-outlined text-neon-red text-[16px]">
                local_bar
              </span>
              <span className="text-neon-red text-xs font-bold uppercase tracking-wider">
                ดื่ม x2
              </span>
            </span>
          </span>
        </button>
      </footer>
    </main>
  );
}
