"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel, PlayerAvatar } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";

interface LocalPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string)?.toUpperCase() || "GAME";

  const [players, setPlayers] = useState<LocalPlayer[]>([
    { id: "1", name: "ฉัน", isHost: true, isReady: true },
  ]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;

    const newPlayer: LocalPlayer = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      isHost: false,
      isReady: true,
    };

    setPlayers([...players, newPlayer]);
    setNewPlayerName("");
    setShowAddModal(false);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      return; // Need at least 2 players
    }
    // Save players to localStorage for the game to use
    localStorage.setItem(
      "wongtaek-players",
      JSON.stringify(players.map((p) => p.name))
    );
    router.push("/game/modes");
  };

  return (
    <main className="container-mobile h-[100dvh] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-6 flex flex-col items-center justify-center shrink-0">
        <Link href="/" className="absolute top-8 left-6">
          <button className="flex items-center justify-center size-12 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <span className="material-symbols-outlined text-3xl">
              arrow_back
            </span>
          </button>
        </Link>

        <div className="flex flex-col items-center gap-2 mt-4">
          <span className="text-primary font-bold tracking-[0.1em] text-xs uppercase drop-shadow-[0_0_5px_rgba(199,61,245,0.8)]">
            เพิ่มเพื่อนเข้าวง
          </span>
          <div className="flex items-center gap-3">
            <motion.span
              className="block size-2 rounded-full bg-neon-green shadow-[0_0_10px_#80FF00]"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <p className="text-white text-2xl font-bold">
              {players.length} คนในวง
            </p>
          </div>
        </div>
      </header>

      {/* Player List */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2 space-y-3 no-scrollbar">
        <AnimatePresence>
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              className={`
                group relative backdrop-blur-md border rounded-xl p-3 flex items-center gap-4
                ${
                  player.isHost
                    ? "bg-[#2a2430]/80 border-primary/30"
                    : "bg-[#2a2430]/60 border-white/5"
                }
              `}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ delay: index * 0.05 }}
            >
              <PlayerAvatar
                name={player.name}
                isHost={player.isHost}
                isReady={player.isReady}
              />

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold truncate text-white">
                    {player.name}
                  </p>
                  {player.isHost && (
                    <span className="material-symbols-outlined text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] text-xl material-symbols-filled">
                      crown
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">
                  {player.isHost ? "เจ้าของวง" : `ผู้เล่น #${index + 1}`}
                </p>
              </div>

              {/* Remove button (not for host) */}
              {!player.isHost && (
                <button
                  onClick={() => handleRemovePlayer(player.id)}
                  className="size-10 rounded-full bg-white/5 hover:bg-neon-red/20 flex items-center justify-center text-white/40 hover:text-neon-red transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Player Button */}
        <motion.button
          onClick={() => setShowAddModal(true)}
          className="w-full border-2 border-dashed border-white/10 hover:border-primary/50 rounded-xl p-4 flex items-center justify-center gap-2 text-white/40 hover:text-primary transition-all h-[76px]"
          whileTap={{ scale: 0.98 }}
        >
          <span className="material-symbols-outlined text-2xl">person_add</span>
          <p className="font-bold text-lg">เพิ่มเพื่อน</p>
        </motion.button>
      </div>

      {/* Footer */}
      <footer className="relative z-20 p-4 pb-6 bg-gradient-to-t from-[#160d1a] via-[#160d1a] to-transparent">
        {/* Minimum players warning */}
        {players.length < 2 && (
          <div className="mb-4 flex items-center justify-center gap-2 text-neon-yellow text-sm">
            <span className="material-symbols-outlined text-lg">warning</span>
            <span>ต้องมีอย่างน้อย 2 คน</span>
          </div>
        )}

        {/* Start Game Button */}
        <Button
          onClick={handleStartGame}
          variant="primary"
          size="xl"
          fullWidth
          disabled={players.length < 2}
          icon="play_arrow"
          iconPosition="right"
        >
          เริ่มเกมเลย
        </Button>
      </footer>

      {/* Add Player Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="w-full max-w-md bg-surface rounded-t-3xl p-6"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                เพิ่มเพื่อนเข้าวง
              </h2>

              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">
                  ชื่อเพื่อน
                </label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                  placeholder="พิมพ์ชื่อ..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl font-bold placeholder-white/30 focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAddModal(false)}
                  variant="ghost"
                  size="lg"
                  fullWidth
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleAddPlayer}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!newPlayerName.trim()}
                >
                  เพิ่ม
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
