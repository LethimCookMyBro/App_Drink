"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  shadowClass: string;
  bgGradient: string;
  difficulty: number;
  route: string;
}

const gameModes: GameMode[] = [
  {
    id: "question",
    name: "โหมดคำถาม",
    description:
      "รู้จักเพื่อนให้มากขึ้น หรือจะแฉให้หมดเปลือก ที่นี่ไม่มีความลับ",
    icon: "psychology_alt",
    color: "text-neon-blue",
    borderColor: "border-neon-blue",
    shadowClass: "shadow-neon-blue",
    bgGradient: "from-cyan-500/20 to-transparent",
    difficulty: 1,
    route: "/game/play?mode=question",
  },
  {
    id: "vote",
    name: "โหมดโหวต",
    description:
      "ใครมีเกณฑ์จะเป็น...ที่สุด? เสียงข้างมากสั่งดื่ม ประชาธิปไตยมันเจ็บปวด",
    icon: "how_to_vote",
    color: "text-primary",
    borderColor: "border-primary",
    shadowClass: "shadow-neon-purple",
    bgGradient: "from-purple-500/20 to-transparent",
    difficulty: 2,
    route: "/game/play?mode=vote",
  },
  {
    id: "truth-or-dare",
    name: "ความจริง\nหรือท้า",
    description: "จะกล้าทำ หรือจะกระดกช็อต ลังเลเท่ากับอ่อนแอ",
    icon: "visibility",
    color: "text-neon-green",
    borderColor: "border-neon-green",
    shadowClass: "shadow-neon-green",
    bgGradient: "from-green-500/20 to-transparent",
    difficulty: 3,
    route: "/game/truth-or-dare",
  },
  {
    id: "chaos",
    name: "โหมดโกลาหล\n(Chaos)",
    description: "กฎกติกาแบบสุ่ม บทลงโทษสุดโหด ขอให้โชคดี",
    icon: "warning",
    color: "text-neon-red",
    borderColor: "border-neon-red",
    shadowClass: "shadow-neon-red",
    bgGradient: "from-red-500/20 to-transparent",
    difficulty: 5,
    route: "/game/chaos",
  },
];

export default function GameModesPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelectMode = (mode: GameMode) => {
    router.push(mode.route);
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[#141414]">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 w-full px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[32px]">
            local_bar
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(199,61,245,0.6)]">
            เลือกโหมดการเล่น
          </h1>
        </div>
        <Link href="/settings">
          <button className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-white/80 text-[28px]">
              settings
            </span>
          </button>
        </Link>
      </header>

      {/* Horizontal Scroll Cards */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto no-scrollbar flex items-center py-6 px-6 gap-6 w-full snap-x snap-mandatory"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div className="w-1 shrink-0" />

        {gameModes.map((mode, index) => (
          <motion.div
            key={mode.id}
            className={`
              snap-center relative shrink-0 w-[85vw] max-w-sm h-[65vh] rounded-2xl border-2 
              ${mode.borderColor} bg-card/90 ${mode.shadowClass} 
              flex flex-col overflow-hidden group
            `}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Background gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-b ${mode.bgGradient} opacity-20`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-card z-0" />

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-between p-6">
              {/* Difficulty */}
              <div className="flex items-center justify-between">
                <span
                  className={`${mode.color} text-xs font-bold tracking-wider uppercase`}
                >
                  ดีกรีความแรง
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <span
                      key={level}
                      className={`material-symbols-outlined text-sm ${
                        level <= mode.difficulty ? mode.color : "text-white/20"
                      }`}
                    >
                      local_drink
                    </span>
                  ))}
                </div>
              </div>

              {/* Icon & Name */}
              <div className="flex flex-col items-center justify-center gap-6 my-auto text-center">
                <div
                  className={`p-4 rounded-full border ${
                    mode.borderColor
                  }/30 bg-${mode.color.replace(
                    "text-",
                    ""
                  )}/5 shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
                >
                  <span
                    className={`material-symbols-outlined ${mode.color} text-[64px]`}
                    style={{ fontSize: "64px" }}
                  >
                    {mode.icon}
                  </span>
                </div>
                <h2 className="text-4xl font-bold text-white leading-tight tracking-tight drop-shadow-lg whitespace-pre-line">
                  {mode.name}
                </h2>
              </div>

              {/* Description & Button */}
              <div className="flex flex-col gap-6">
                <p className="text-gray-300 text-lg text-center leading-snug px-2">
                  {mode.description}
                </p>
                <Button
                  onClick={() => handleSelectMode(mode)}
                  variant={
                    mode.id === "chaos"
                      ? "neon-red"
                      : mode.id === "truth-or-dare"
                      ? "neon-green"
                      : "primary"
                  }
                  size="lg"
                  fullWidth
                  icon="play_arrow"
                  iconPosition="right"
                  className={mode.shadowClass}
                >
                  เริ่มเกม
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        <div className="w-1 shrink-0" />
      </div>

      {/* Bottom Nav */}
      <nav className="glass-panel w-full border-t border-white/5 pb-6 pt-3 px-6">
        <div className="flex justify-between items-end gap-2 max-w-md mx-auto">
          <Link
            href="/"
            className="flex-1 flex flex-col items-center justify-center gap-1 group"
          >
            <span className="material-symbols-outlined text-white/40 group-hover:text-white transition-colors text-[28px]">
              home
            </span>
            <span className="text-[12px] font-medium tracking-wide text-white/40 group-hover:text-white transition-colors">
              หน้าหลัก
            </span>
          </Link>
          <Link
            href="/game/modes"
            className="flex-1 flex flex-col items-center justify-center gap-1 group"
          >
            <span className="material-symbols-outlined text-primary material-symbols-filled text-[28px]">
              sports_esports
            </span>
            <span className="text-[12px] font-medium tracking-wide text-primary">
              เกม
            </span>
          </Link>
          <Link
            href="/history"
            className="flex-1 flex flex-col items-center justify-center gap-1 group"
          >
            <span className="material-symbols-outlined text-white/40 group-hover:text-white transition-colors text-[28px]">
              history
            </span>
            <span className="text-[12px] font-medium tracking-wide text-white/40 group-hover:text-white transition-colors">
              ประวัติ
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}
