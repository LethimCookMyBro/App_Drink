"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button, PlayerAvatar } from "@/components/ui";
import {
  markGameSessionStarted,
  startRoomGameSession,
} from "@/lib/gameSession";

interface LocalPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

interface CustomQuestion {
  id: string;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ roomCode: string }>();
  const roomCode =
    typeof params.roomCode === "string" ? params.roomCode.toUpperCase() : "";

  // Players state
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [canManageLobby, setCanManageLobby] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [playerMutationError, setPlayerMutationError] = useState("");
  const [startError, setStartError] = useState("");
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isMutatingPlayers, setIsMutatingPlayers] = useState(false);

  // Custom questions state
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");

  const canAddMore = players.length < maxPlayers;
  const displayRoomName = roomName || "วงของคุณ";

  const applyRoomSnapshot = useCallback(
    (
      room: {
        name: string;
        maxPlayers: number;
        players: LocalPlayer[];
      },
      nextCanManageLobby: boolean,
    ) => {
      setRoomName(room.name);
      setMaxPlayers(room.maxPlayers);
      setPlayers(
        room.players.map((player) => ({
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          isReady: player.isReady,
        })),
      );
      setCanManageLobby(nextCanManageLobby);
    },
    [],
  );

  useEffect(() => {
    const savedCustomQuestions = localStorage.getItem(
      "wongtaek-custom-questions",
    );
    if (savedCustomQuestions) {
      try {
        const parsed = JSON.parse(savedCustomQuestions);
        if (Array.isArray(parsed)) {
          setCustomQuestions(parsed);
        }
      } catch {
        // Ignore malformed local data
      }
    }
  }, []);

  useEffect(() => {
    if (!roomCode) {
      setLoadError("ไม่พบวงนี้");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadRoom = async (showSpinner: boolean) => {
      if (showSpinner) {
        setIsLoading(true);
        setLoadError("");
      }

      try {
        const response = await fetch(`/api/rooms/${roomCode}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "ไม่สามารถโหลดห้องได้");
        }

        if (isCancelled) return;

        const room = data.room as {
          name: string;
          maxPlayers: number;
          players: LocalPlayer[];
        };

        applyRoomSnapshot(room, Boolean(data.canManageLobby));
      } catch (error) {
        if (isCancelled) return;
        if (showSpinner) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "ไม่สามารถโหลดข้อมูลห้องได้",
          );
        }
      } finally {
        if (!isCancelled && showSpinner) {
          setIsLoading(false);
        }
      }
    };

    void loadRoom(true);
    const pollId = window.setInterval(() => {
      void loadRoom(false);
    }, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(pollId);
    };
  }, [applyRoomSnapshot, roomCode]);

  const [duplicateError, setDuplicateError] = useState("");

  const handleAddPlayer = async () => {
    if (!canManageLobby) return;
    if (!newPlayerName.trim()) return;
    if (!canAddMore) return;
    if (isMutatingPlayers) return;

    const nameLower = newPlayerName.trim().toLowerCase();
    const isDuplicate = players.some((p) => p.name.toLowerCase() === nameLower);

    if (isDuplicate) {
      setDuplicateError("ชื่อนี้มีคนใช้แล้ว! กรุณาใช้ชื่ออื่น");
      return;
    }

    setDuplicateError("");
    setPlayerMutationError("");
    setIsMutatingPlayers(true);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/players`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerName: newPlayerName.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            room?: {
              name: string;
              maxPlayers: number;
              players: LocalPlayer[];
            };
            canManageLobby?: boolean;
          }
        | null;

      if (!response.ok || !data?.room) {
        const message = data?.error || "ไม่สามารถเพิ่มผู้เล่นได้";
        if (message.includes("ชื่อ")) {
          setDuplicateError(message);
        } else {
          setPlayerMutationError(message);
        }
        return;
      }

      applyRoomSnapshot(data.room, Boolean(data.canManageLobby));
      setNewPlayerName("");
      setShowAddModal(false);
    } catch {
      setPlayerMutationError("ไม่สามารถเพิ่มผู้เล่นได้ ลองใหม่อีกครั้ง");
    } finally {
      setIsMutatingPlayers(false);
    }
  };

  const handleRemovePlayer = async (id: string) => {
    if (!canManageLobby) return;
    if (isMutatingPlayers) return;

    setDuplicateError("");
    setPlayerMutationError("");
    setIsMutatingPlayers(true);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/players/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            room?: {
              name: string;
              maxPlayers: number;
              players: LocalPlayer[];
            };
            canManageLobby?: boolean;
          }
        | null;

      if (!response.ok || !data?.room) {
        setPlayerMutationError(data?.error || "ไม่สามารถลบผู้เล่นได้");
        return;
      }

      applyRoomSnapshot(data.room, Boolean(data.canManageLobby));
    } catch {
      setPlayerMutationError("ไม่สามารถลบผู้เล่นได้ ลองใหม่อีกครั้ง");
    } finally {
      setIsMutatingPlayers(false);
    }
  };

  const handleAddQuestion = () => {
    if (!canManageLobby) return;
    if (!newQuestion.trim() || newQuestion.length < 5) return;

    const question: CustomQuestion = {
      id: `custom-${Date.now()}`,
      text: newQuestion.trim(),
      type: "QUESTION",
      level: 2,
      is18Plus: false,
    };

    setCustomQuestions([...customQuestions, question]);
    setNewQuestion("");
    setShowQuestionModal(false);
  };

  const handleRemoveQuestion = (id: string) => {
    if (!canManageLobby) return;
    setCustomQuestions(customQuestions.filter((q) => q.id !== id));
  };

  const handleStartGame = async () => {
    if (!canManageLobby) return;
    if (players.length < 2) return;
    if (isStartingGame) return;

    setStartError("");
    setIsStartingGame(true);

    // Save players to localStorage
    localStorage.setItem(
      "wongtaek-players",
      JSON.stringify(players.map((p) => p.name)),
    );

    // Save custom questions to localStorage
    if (customQuestions.length > 0) {
      localStorage.setItem(
        "wongtaek-custom-questions",
        JSON.stringify(customQuestions),
      );
    } else {
      localStorage.removeItem("wongtaek-custom-questions");
    }

    try {
      const sessionId = await startRoomGameSession(roomCode, "MIXED");

      // Set game started flag only after the session is persisted.
      markGameSessionStarted(roomCode, "/game/modes", sessionId);
      router.push("/game/modes");
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "ไม่สามารถเริ่มเกมบนเซิร์ฟเวอร์ได้",
      );
    } finally {
      setIsStartingGame(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container-mobile flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
        <div className="animate-pulse text-center text-white/50">
          <p className="text-lg font-bold">กำลังเปิดวง...</p>
          <p className="mt-2 text-sm">กำลังดึงรายชื่อผู้เล่น</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="container-mobile flex min-h-screen flex-col items-center justify-center px-4 text-center sm:px-6">
        <div className="w-full max-w-sm rounded-3xl border border-neon-red/30 bg-neon-red/10 p-6 sm:max-w-md">
          <span className="material-symbols-outlined text-5xl text-neon-red">
            error
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">
            เข้าห้องไม่สำเร็จ
          </h1>
          <p className="mt-3 text-sm text-white/60">{loadError}</p>
          <div className="mt-6 space-y-3">
            <Link href="/join" className="block">
              <Button variant="primary" fullWidth>
                ลองเข้าห้องใหม่
              </Button>
            </Link>
            <Link href="/create" className="block">
              <Button variant="ghost" fullWidth>
                สร้างห้องใหม่
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-mobile min-h-[100dvh] overflow-hidden lg:h-[100dvh]">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="relative z-10 shrink-0 flex flex-col items-center justify-center pt-8 pb-4 px-2 lg:px-0 lg:pt-6">
          <Link href="/" className="absolute top-8 left-6">
            <button className="flex items-center justify-center size-12 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all">
              <span className="material-symbols-outlined text-3xl">
                arrow_back
              </span>
            </button>
          </Link>

          <div className="flex flex-col items-center gap-2 mt-4">
            <span className="text-primary font-bold tracking-[0.1em] text-xs uppercase drop-shadow-[0_0_5px_rgba(199,61,245,0.8)]">
              {canManageLobby ? "เพิ่มเพื่อนเข้าวง" : "รอเจ้าของวงเริ่มเกม"}
            </span>
            <p className="text-white/70 text-sm font-medium">
              {displayRoomName}
            </p>
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
            <p className="text-white/40 text-sm">(สูงสุด {maxPlayers} คน)</p>
          </div>
        </header>

        <div className="relative z-10 mt-2 grid min-h-0 flex-1 gap-4 px-4 pb-2 no-scrollbar lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)] lg:gap-6 lg:px-0 lg:pb-0">
          {/* Player List */}
          <section className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto no-scrollbar">
              {playerMutationError && (
                <div className="rounded-xl border border-neon-red/30 bg-neon-red/10 px-4 py-3 text-sm text-neon-red">
                  {playerMutationError}
                </div>
              )}
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    className={`
                    group relative flex items-center gap-4 rounded-xl border p-3 backdrop-blur-md
                    ${player.isHost ? "bg-[#2a2430]/80 border-primary/30" : "bg-[#2a2430]/60 border-white/5"}
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

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-lg font-bold text-white sm:text-xl lg:text-2xl">
                          {player.name}
                        </p>
                        {player.isHost && (
                          <span className="material-symbols-outlined material-symbols-filled text-xl text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]">
                            crown
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                        {player.isHost ? "เจ้าของวง" : `ผู้เล่น #${index + 1}`}
                      </p>
                    </div>

                    {canManageLobby && !player.isHost && (
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        disabled={isMutatingPlayers}
                        className="flex size-10 items-center justify-center rounded-full bg-white/5 text-white/40 transition-all hover:bg-neon-red/20 hover:text-neon-red"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Player Button */}
              {canManageLobby ? (
                canAddMore ? (
                  <motion.button
                    onClick={() => {
                      setDuplicateError("");
                      setPlayerMutationError("");
                      setShowAddModal(true);
                    }}
                    className="flex h-[76px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 p-4 text-white/40 transition-all hover:border-primary/50 hover:text-primary"
                    whileTap={{ scale: 0.98 }}
                    disabled={isMutatingPlayers}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      person_add
                    </span>
                    <p className="text-lg font-bold">เพิ่มเพื่อน</p>
                  </motion.button>
                ) : (
                  <div className="flex h-[76px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neon-yellow/30 p-4 text-neon-yellow/70">
                    <span className="material-symbols-outlined text-2xl">
                      group
                    </span>
                    <p className="text-lg font-bold">
                      เต็มแล้ว! ({maxPlayers} คน)
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50">
                  คุณเข้าร่วมห้องนี้แล้ว รอเจ้าของวงกดเริ่มเกมได้เลย
                </div>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                    ห้องนี้
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">
                    {displayRoomName}
                  </h3>
                </div>
                <span className="material-symbols-outlined text-primary">
                  favorite
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-white/40">ผู้เล่น</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {players.length}/{maxPlayers}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-white/40">สถานะ</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {canManageLobby ? "เจ้าของวง" : "ผู้ร่วมวง"}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-white/40">คำถามพิเศษ</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {customQuestions.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-white/40">รูปแบบ</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    เครื่องเดียว
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/45">
                เล่นกันบนมือถือเครื่องเดียวได้เลย ถ้าจะเปลี่ยนชื่อค่อยเริ่มเกมใหม่
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-white/60 text-sm font-bold uppercase tracking-widest">
                  🎯 คำถามพิเศษ ({customQuestions.length})
                </h3>
                {canManageLobby && (
                  <button
                    onClick={() => setShowQuestionModal(true)}
                    className="flex items-center gap-1 text-sm font-bold text-primary hover:opacity-80"
                  >
                    <span className="material-symbols-outlined text-sm">
                      add
                    </span>
                    เพิ่ม
                  </button>
                )}
              </div>

              <div className="mt-3">
                {customQuestions.length === 0 ? (
                  <motion.button
                    onClick={() => canManageLobby && setShowQuestionModal(true)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-4 transition-all ${
                      canManageLobby
                        ? "border-white/10 text-white/30 hover:border-primary/30 hover:text-primary/60"
                        : "border-white/10 text-white/30"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="material-symbols-outlined">lightbulb</span>
                    <span className="text-sm">เพิ่มคำถามของวง (ลับๆ)</span>
                  </motion.button>
                ) : (
                  <div className="space-y-2">
                    {customQuestions.map((q, i) => (
                      <motion.div
                        key={q.id}
                        className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <span className="text-sm font-bold text-primary">
                          #{i + 1}
                        </span>
                        <p className="flex-1 line-clamp-2 text-sm text-white">
                          {q.text}
                        </p>
                        {canManageLobby && (
                          <button
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-white/30 hover:text-neon-red"
                          >
                            <span className="material-symbols-outlined text-lg">
                              close
                            </span>
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="relative z-20 p-4 pb-6 bg-gradient-to-t from-[#160d1a] via-[#160d1a] to-transparent lg:mx-auto lg:w-full lg:max-w-7xl lg:px-6 lg:pb-8 lg:pt-2 lg:bg-transparent">
          {canManageLobby && players.length < 2 && (
            <div className="mb-4 flex items-center justify-center gap-2 text-neon-yellow text-sm">
              <span className="material-symbols-outlined text-lg">warning</span>
              <span>ต้องมีอย่างน้อย 2 คน</span>
            </div>
          )}

          {startError && (
            <div className="mb-4 rounded-2xl border border-neon-red/30 bg-neon-red/10 px-4 py-3 text-center text-sm text-neon-red">
              {startError}
            </div>
          )}

          {canManageLobby ? (
            <Button
              onClick={handleStartGame}
              variant="primary"
              size="xl"
              fullWidth
              disabled={players.length < 2 || isStartingGame}
              icon="play_arrow"
              iconPosition="right"
            >
              {isStartingGame ? "กำลังเริ่มเกม..." : "เริ่มเกมเลย"}
            </Button>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center text-sm text-white/50">
              ห้องนี้พร้อมแล้วเมื่อเจ้าของวงกดเริ่มเกม
            </div>
          )}
        </footer>
      </div>

      {/* Add Player Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-t-3xl bg-surface p-6 sm:max-h-[calc(100dvh-4rem)] sm:rounded-3xl"
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
                  onChange={(e) => {
                    setNewPlayerName(e.target.value);
                    setDuplicateError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void handleAddPlayer()}
                  placeholder="พิมพ์ชื่อ..."
                  className={`w-full bg-white/5 border rounded-xl p-4 text-white text-xl font-bold placeholder-white/30 focus:outline-none ${
                    duplicateError
                      ? "border-neon-red"
                      : "border-white/10 focus:border-primary"
                  }`}
                  autoFocus
                  maxLength={20}
                />
                {duplicateError && (
                  <p className="text-neon-red text-sm mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      error
                    </span>
                    {duplicateError}
                  </p>
                )}
                {!duplicateError && playerMutationError && (
                  <p className="text-neon-red text-sm mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      error
                    </span>
                    {playerMutationError}
                  </p>
                )}
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
                  onClick={() => void handleAddPlayer()}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!newPlayerName.trim() || isMutatingPlayers}
                >
                  {isMutatingPlayers ? "กำลังเพิ่ม..." : "เพิ่ม"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Question Modal */}
      <AnimatePresence>
        {showQuestionModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuestionModal(false)}
          >
            <motion.div
              className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-t-3xl bg-surface p-6 sm:max-h-[calc(100dvh-4rem)] sm:rounded-3xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-2">
                เพิ่มคำถามพิเศษ
              </h2>
              <p className="text-white/40 text-sm mb-6">
                คำถามลับๆ สำหรับวงนี้โดยเฉพาะ จะโผล่แบบสุ่มระหว่างเกม!
              </p>

              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">
                  คำถาม
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="เช่น: ใครเคยโดนแฟนทิ้ง?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-primary resize-none h-24"
                  autoFocus
                  maxLength={200}
                />
                <p className="text-white/30 text-xs mt-1 text-right">
                  {newQuestion.length}/200
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowQuestionModal(false)}
                  variant="ghost"
                  size="lg"
                  fullWidth
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleAddQuestion}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={newQuestion.trim().length < 5}
                >
                  เพิ่มคำถาม
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
