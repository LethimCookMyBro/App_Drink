"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useSoundEffects } from "@/hooks";
import confetti from "canvas-confetti";

interface PlayerStats {
  name: string;
  drinkCount: number;
  questionsAnswered: number;
}

export default function GameSummaryPage() {
  const router = useRouter();
  const { playCelebration } = useSoundEffects({ enabled: true });
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [totalRounds, setTotalRounds] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Load game stats from localStorage
    const savedStats = localStorage.getItem("wongtaek-game-stats");
    const savedRounds = localStorage.getItem("wongtaek-rounds");
    const savedPlayers = localStorage.getItem("wongtaek-players");

    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        setPlayerStats(stats);
      } catch {
        // Use mock data if parse fails
        if (savedPlayers) {
          const players = JSON.parse(savedPlayers);
          setPlayerStats(
            players.map((name: string, index: number) => ({
              name,
              drinkCount: Math.floor(Math.random() * 5) + (index === 0 ? 3 : 0),
              questionsAnswered: Math.floor(Math.random() * 8) + 2,
            })),
          );
        }
      }
    } else if (savedPlayers) {
      const players = JSON.parse(savedPlayers);
      setPlayerStats(
        players.map((name: string, index: number) => ({
          name,
          drinkCount: Math.floor(Math.random() * 5) + (index === 0 ? 3 : 0),
          questionsAnswered: Math.floor(Math.random() * 8) + 2,
        })),
      );
    }

    if (savedRounds) {
      setTotalRounds(parseInt(savedRounds) || 10);
    } else {
      setTotalRounds(10);
    }

    // Trigger celebration
    setTimeout(() => {
      setShowConfetti(true);
      playCelebration();

      // Fire confetti
      if (typeof window !== "undefined") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }, 500);
  }, [playCelebration]);

  // Sort players by drink count (MVP = most drinks)
  const sortedPlayers = [...playerStats].sort(
    (a, b) => b.drinkCount - a.drinkCount,
  );
  const mvp = sortedPlayers[0];
  const survivor = [...playerStats].sort(
    (a, b) => a.drinkCount - b.drinkCount,
  )[0];

  const handlePlayAgain = () => {
    // Clear game stats
    localStorage.removeItem("wongtaek-game-stats");
    localStorage.removeItem("wongtaek-rounds");
    router.push("/game/modes");
  };

  const handleShare = async () => {
    const shareText = `🍺 วงแตกเกม!\n\n🏆 MVP: ${mvp?.name} (${mvp?.drinkCount} แก้ว)\n🛡️ Survivor: ${survivor?.name} (${survivor?.drinkCount} แก้ว)\n\nเล่นกันเถอะ!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "วงแตก - ผลการเล่น",
          text: shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert("คัดลอกแล้ว!");
    }
  };

  return (
    <main className="container-mobile min-h-screen flex flex-col overflow-hidden relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-neon-green/20 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-center p-6 w-full">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex flex-col items-center"
        >
          <span className="material-symbols-outlined text-neon-yellow text-6xl drop-shadow-[0_0_20px_rgba(251,255,0,0.5)] material-symbols-filled">
            emoji_events
          </span>
          <h1 className="text-white text-3xl font-bold mt-2 tracking-tight">
            จบเกม!
          </h1>
          <p className="text-white/60 text-sm mt-1">เล่นไป {totalRounds} รอบ</p>
        </motion.div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 px-4 pb-4 overflow-y-auto no-scrollbar">
        {/* MVP Card */}
        {mvp && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-2 border-neon-yellow/50 rounded-2xl p-5 mb-4 shadow-neon-yellow"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {mvp.name.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -top-1 -right-1 text-2xl">👑</span>
              </div>
              <div className="flex-1">
                <p className="text-neon-yellow text-xs font-bold tracking-widest uppercase">
                  🏆 MVP ประจำวง
                </p>
                <h2 className="text-white text-2xl font-bold">{mvp.name}</h2>
                <p className="text-white/60 text-sm">
                  เจ็บไป {mvp.drinkCount} แก้ว
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Survivor Card */}
        {survivor && survivor.name !== mvp?.name && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-neon-green/30 rounded-2xl p-4 mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-lg font-bold text-white">
                {survivor.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-neon-green text-xs font-bold tracking-widest uppercase">
                  🛡️ Survivor
                </p>
                <h3 className="text-white text-lg font-bold">
                  {survivor.name}
                </h3>
                <p className="text-white/60 text-xs">
                  แค่ {survivor.drinkCount} แก้ว
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* All Players Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4"
        >
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">
            📊 สถิติทุกคน
          </h3>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.name}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-sm font-bold w-6">
                    #{index + 1}
                  </span>
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-neon-red">🍺 {player.drinkCount}</span>
                  <span className="text-white/40">
                    ❓ {player.questionsAnswered}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer Actions */}
      <footer className="relative z-20 w-full p-4 pb-6 max-w-lg mx-auto space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleShare}
            variant="outline"
            size="lg"
            icon="share"
            fullWidth
          >
            แชร์ผล
          </Button>
          <Button
            onClick={handlePlayAgain}
            variant="primary"
            size="lg"
            icon="replay"
            fullWidth
          >
            เล่นอีก!
          </Button>
        </div>
        <Link href="/" className="block">
          <Button variant="ghost" size="lg" fullWidth>
            กลับหน้าหลัก
          </Button>
        </Link>
      </footer>
    </main>
  );
}
