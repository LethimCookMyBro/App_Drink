"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button, GlassPanel } from "@/components/ui";
import { validateCustomQuestion } from "@/lib/validation";

interface DeckQuestion {
  id: string;
  text: string;
  type: "QUESTION" | "TRUTH" | "DARE" | "VOTE" | "CHAOS";
  level: 1 | 2 | 3;
}

interface Deck {
  id: string;
  name: string;
  description: string;
  questions: DeckQuestion[];
  createdAt: number;
}

const questionTypes = [
  { value: "QUESTION", label: "คำถาม", icon: "quiz", color: "text-neon-blue" },
  {
    value: "TRUTH",
    label: "ความจริง",
    icon: "psychology",
    color: "text-neon-green",
  },
  {
    value: "DARE",
    label: "ท้า",
    icon: "local_fire_department",
    color: "text-neon-red",
  },
  { value: "VOTE", label: "โหวต", icon: "thumb_up", color: "text-neon-yellow" },
  { value: "CHAOS", label: "โกลาหล", icon: "warning", color: "text-primary" },
] as const;

export default function DeckBuilderPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);

  // New deck form
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");

  // New question form
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] =
    useState<DeckQuestion["type"]>("QUESTION");
  const [newQuestionLevel, setNewQuestionLevel] = useState<1 | 2 | 3>(2);
  const [validationError, setValidationError] = useState("");

  // Load decks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("wongtaek-decks");
    if (saved) {
      try {
        setDecks(JSON.parse(saved));
      } catch {
        // Ignore
      }
    }
  }, []);

  // Save decks to localStorage
  const saveDecks = (newDecks: Deck[]) => {
    setDecks(newDecks);
    localStorage.setItem("wongtaek-decks", JSON.stringify(newDecks));
  };

  const handleCreateDeck = () => {
    if (!newDeckName.trim()) return;

    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      name: newDeckName.trim(),
      description: newDeckDesc.trim(),
      questions: [],
      createdAt: Date.now(),
    };

    saveDecks([...decks, newDeck]);
    setNewDeckName("");
    setNewDeckDesc("");
    setShowCreateModal(false);
    setCurrentDeck(newDeck);
  };

  const handleDeleteDeck = (deckId: string) => {
    const newDecks = decks.filter((d) => d.id !== deckId);
    saveDecks(newDecks);
    if (currentDeck?.id === deckId) {
      setCurrentDeck(null);
    }
  };

  const handleAddQuestion = () => {
    if (!currentDeck) return;

    const validation = validateCustomQuestion(newQuestionText);
    if (!validation.success) {
      setValidationError(validation.error || "คำถามไม่ถูกต้อง");
      return;
    }

    const newQuestion: DeckQuestion = {
      id: `q-${Date.now()}`,
      text: validation.data!,
      type: newQuestionType,
      level: newQuestionLevel,
    };

    const updatedDeck = {
      ...currentDeck,
      questions: [...currentDeck.questions, newQuestion],
    };

    const newDecks = decks.map((d) =>
      d.id === currentDeck.id ? updatedDeck : d,
    );
    saveDecks(newDecks);
    setCurrentDeck(updatedDeck);

    setNewQuestionText("");
    setValidationError("");
    setShowAddQuestionModal(false);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!currentDeck) return;

    const updatedDeck = {
      ...currentDeck,
      questions: currentDeck.questions.filter((q) => q.id !== questionId),
    };

    const newDecks = decks.map((d) =>
      d.id === currentDeck.id ? updatedDeck : d,
    );
    saveDecks(newDecks);
    setCurrentDeck(updatedDeck);
  };

  const handleUseDeck = () => {
    if (!currentDeck || currentDeck.questions.length === 0) return;

    // Save deck questions as custom questions for the game
    localStorage.setItem(
      "wongtaek-custom-questions",
      JSON.stringify(currentDeck.questions),
    );
    router.push("/lobby/new");
  };

  const generateShareCode = () => {
    if (!currentDeck) return;
    const encoded = btoa(encodeURIComponent(JSON.stringify(currentDeck)));
    navigator.clipboard.writeText(
      `${window.location.origin}/decks?import=${encoded}`,
    );
    alert("คัดลอกลิงก์แชร์แล้ว!");
  };

  return (
    <main className="container-mobile min-h-screen overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <header className="flex items-center p-4 pt-8 justify-between">
        <Link href="/">
          <button className="flex size-12 items-center justify-center rounded-full active:bg-white/10 transition-colors text-white">
            <span className="material-symbols-outlined text-3xl">
              arrow_back
            </span>
          </button>
        </Link>
        <h2 className="text-white text-xl font-bold">สร้างชุดคำถาม</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex size-12 items-center justify-center rounded-full bg-primary/20 text-primary"
        >
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>
      </header>

      <div className="px-5 space-y-4 mt-4">
        {/* Deck List or Editor */}
        {currentDeck ? (
          // Deck Editor
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentDeck(null)}
                className="text-white/60 text-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-lg">
                  arrow_back
                </span>
                กลับ
              </button>
              <div className="flex gap-2">
                <button
                  onClick={generateShareCode}
                  className="px-3 py-1.5 bg-white/5 rounded-lg text-white/60 text-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">
                    share
                  </span>
                  แชร์
                </button>
              </div>
            </div>

            <GlassPanel className="flex flex-col gap-2">
              <h3 className="text-white text-xl font-bold">
                {currentDeck.name}
              </h3>
              {currentDeck.description && (
                <p className="text-white/50 text-sm">
                  {currentDeck.description}
                </p>
              )}
              <p className="text-primary text-sm font-bold">
                {currentDeck.questions.length} คำถาม
              </p>
            </GlassPanel>

            {/* Questions */}
            <div className="space-y-2">
              <AnimatePresence>
                {currentDeck.questions.map((q, i) => {
                  const typeInfo = questionTypes.find(
                    (t) => t.value === q.type,
                  );
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3"
                    >
                      <span
                        className={`material-symbols-outlined ${typeInfo?.color} text-2xl`}
                      >
                        {typeInfo?.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">{q.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/40 text-xs">
                            {typeInfo?.label}
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-white/40 text-xs">
                            ระดับ {q.level}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-white/30 hover:text-neon-red"
                      >
                        <span className="material-symbols-outlined">
                          delete
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Add Question Button */}
            <button
              onClick={() => setShowAddQuestionModal(true)}
              className="w-full border-2 border-dashed border-white/10 hover:border-primary/50 rounded-xl p-4 flex items-center justify-center gap-2 text-white/40 hover:text-primary transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              เพิ่มคำถาม
            </button>

            {/* Use Deck Button */}
            {currentDeck.questions.length > 0 && (
              <Button
                onClick={handleUseDeck}
                variant="primary"
                size="xl"
                fullWidth
                icon="play_arrow"
              >
                ใช้ชุดนี้เล่นเกม
              </Button>
            )}
          </div>
        ) : (
          // Deck List
          <div className="space-y-3">
            {decks.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-white/20 text-6xl mb-4">
                  folder_open
                </span>
                <p className="text-white/40">ยังไม่มีชุดคำถาม</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="outline"
                  size="lg"
                  icon="add"
                  className="mx-auto mt-4"
                >
                  สร้างชุดแรก
                </Button>
              </div>
            ) : (
              decks.map((deck) => (
                <motion.div
                  key={deck.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4"
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    onClick={() => setCurrentDeck(deck)}
                    className="flex-1 text-left"
                  >
                    <h3 className="text-white font-bold">{deck.name}</h3>
                    <p className="text-white/40 text-sm">
                      {deck.questions.length} คำถาม
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeleteDeck(deck.id)}
                    className="text-white/30 hover:text-neon-red p-2"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Deck Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="w-full max-w-md bg-surface rounded-t-3xl p-6"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                สร้างชุดคำถามใหม่
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    ชื่อชุด
                  </label>
                  <input
                    type="text"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="เช่น: คำถามวงเพื่อนสนิท"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    คำอธิบาย (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={newDeckDesc}
                    onChange={(e) => setNewDeckDesc(e.target.value)}
                    placeholder="เช่น: คำถามเด็ดๆ สำหรับปาร์ตี้"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="ghost"
                  size="lg"
                  fullWidth
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleCreateDeck}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!newDeckName.trim()}
                >
                  สร้าง
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Question Modal */}
      <AnimatePresence>
        {showAddQuestionModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddQuestionModal(false)}
          >
            <motion.div
              className="w-full max-w-md bg-surface rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-6">เพิ่มคำถาม</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    คำถาม
                  </label>
                  <textarea
                    value={newQuestionText}
                    onChange={(e) => {
                      setNewQuestionText(e.target.value);
                      setValidationError("");
                    }}
                    placeholder="พิมพ์คำถามของคุณ..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-primary resize-none h-24"
                    maxLength={200}
                  />
                  {validationError && (
                    <p className="text-neon-red text-sm mt-1">
                      {validationError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    ประเภท
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {questionTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setNewQuestionType(type.value)}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                          newQuestionType === type.value
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined ${type.color}`}
                        >
                          {type.icon}
                        </span>
                        <span className="text-[10px] text-white/60">
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    ระดับความเข้มข้น
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((level) => (
                      <button
                        key={level}
                        onClick={() => setNewQuestionLevel(level as 1 | 2 | 3)}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                          newQuestionLevel === level
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex">
                          {[1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className={`material-symbols-outlined text-lg ${
                                i <= level ? "text-neon-red" : "text-white/20"
                              }`}
                            >
                              local_fire_department
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-white/60">
                          {level === 1
                            ? "Chill"
                            : level === 2
                              ? "Spicy"
                              : "Chaos"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAddQuestionModal(false)}
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
                  disabled={!newQuestionText.trim()}
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
