"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button, GlassPanel } from "@/components/ui";

// Local question type for admin
interface AdminQuestion {
  id: string;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
  usageCount: number;
}

const typeOptions = [
  { value: "", label: "ทุกประเภท" },
  { value: "QUESTION", label: "คำถาม" },
  { value: "TRUTH", label: "ความจริง" },
  { value: "DARE", label: "ท้า" },
  { value: "CHAOS", label: "โกลาหล" },
  { value: "VOTE", label: "โหวต" },
];

const levelOptions = [
  { value: "", label: "ทุกระดับ" },
  { value: "1", label: "ชิลล์" },
  { value: "2", label: "กลาง" },
  { value: "3", label: "แรง" },
];

const ratingOptions = [
  { value: "", label: "ทุก Rating" },
  { value: "false", label: "ทั่วไป" },
  { value: "true", label: "18+" },
];

const typeLabels: Record<string, { label: string; color: string; bg: string }> =
  {
    QUESTION: { label: "คำถาม", color: "text-primary", bg: "bg-primary/20" },
    TRUTH: {
      label: "ความจริง",
      color: "text-neon-blue",
      bg: "bg-neon-blue/20",
    },
    DARE: { label: "ท้า", color: "text-neon-green", bg: "bg-neon-green/20" },
    CHAOS: { label: "โกลาหล", color: "text-neon-red", bg: "bg-neon-red/20" },
    VOTE: { label: "โหวต", color: "text-neon-yellow", bg: "bg-neon-yellow/20" },
  };

const levelLabels = ["", "ชิลล์", "กลาง", "แรง"];

// Mock data for when database is not connected
const mockQuestions: AdminQuestion[] = [
  {
    id: "1",
    text: "เคยโกหกแม่เรื่องอะไรบ้าง?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
    usageCount: 12,
  },
  {
    id: "2",
    text: "อาหารที่แอบกินคนเดียวไม่ยอมแบ่งใครคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
    usageCount: 8,
  },
  {
    id: "3",
    text: "เรื่องที่ไม่เคยบอกใครในวงนี้?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
    usageCount: 25,
  },
  {
    id: "4",
    text: "เคยแอบชอบเพื่อนในกลุ่มไหม?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
    usageCount: 30,
  },
  {
    id: "5",
    text: "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
    type: "DARE",
    level: 2,
    is18Plus: false,
    usageCount: 15,
  },
  {
    id: "6",
    text: "ใครมีเกณฑ์จะเป็นคนรวยที่สุด?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
    usageCount: 20,
  },
  {
    id: "7",
    text: "ใครที่ใส่เสื้อสีดำ → ดื่มให้หมดแก้ว!",
    type: "CHAOS",
    level: 3,
    is18Plus: false,
    usageCount: 18,
  },
  {
    id: "8",
    text: "ถ้าต้องเลือกจีบคนในวงได้ 1 คน เลือกใคร?",
    type: "QUESTION",
    level: 3,
    is18Plus: true,
    usageCount: 45,
  },
];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<AdminQuestion[]>(mockQuestions);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ type: "", level: "", is18Plus: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(
    null
  );
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  });
  const [dbConnected, setDbConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Custom dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.type) params.set("type", filter.type);
      if (filter.level) params.set("level", filter.level);
      if (filter.is18Plus) params.set("is18Plus", filter.is18Plus);

      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setDbConnected(true);
        }
      }
    } catch {
      setDbConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchQuestions();
  };

  // Filter mock data locally
  const filteredQuestions = questions.filter((q) => {
    if (filter.type && q.type !== filter.type) return false;
    if (filter.level && q.level !== parseInt(filter.level)) return false;
    if (filter.is18Plus === "true" && !q.is18Plus) return false;
    if (filter.is18Plus === "false" && q.is18Plus) return false;
    return true;
  });

  const handleAddQuestion = async () => {
    if (!newQuestion.text.trim()) return;

    // Try to add via API first
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions([data.question, ...questions]);
        setDbConnected(true);
      } else {
        throw new Error("API failed");
      }
    } catch {
      // Add locally for demo
      const newQ: AdminQuestion = {
        id: Date.now().toString(),
        text: newQuestion.text,
        type: newQuestion.type,
        level: newQuestion.level,
        is18Plus: newQuestion.is18Plus,
        usageCount: 0,
      };
      setQuestions([newQ, ...questions]);
    }

    setNewQuestion({ text: "", type: "QUESTION", level: 2, is18Plus: false });
    setShowAddModal(false);
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion || !editingQuestion.text.trim()) return;

    try {
      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingQuestion),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(
          questions.map((q) =>
            q.id === editingQuestion.id ? data.question : q
          )
        );
      }
    } catch {
      setQuestions(
        questions.map((q) =>
          q.id === editingQuestion.id ? editingQuestion : q
        )
      );
    }

    setEditingQuestion(null);
    setShowEditModal(false);
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" });
    } catch {
      // Continue anyway
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Custom Dropdown Component
  const CustomDropdown = ({
    id,
    value,
    options,
    onChange,
    label,
  }: {
    id: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    label: string;
  }) => {
    const isOpen = openDropdown === id;
    const selectedOption = options.find((o) => o.value === value) || options[0];

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className="flex items-center justify-between gap-2 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm min-w-[120px] hover:border-primary/50 transition-colors"
        >
          <span className="truncate">{selectedOption?.label || label}</span>
          <span
            className={`material-symbols-outlined text-lg transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenDropdown(null)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 mt-2 w-full min-w-[150px] bg-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl"
              >
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      value === option.value
                        ? "bg-primary text-white"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <main className="min-h-screen overflow-y-auto no-scrollbar pb-24 bg-[#0d0a10]">
      {/* Header - Sticky */}
      <header className="sticky top-0 z-30 glass-panel border-b border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-white/40 hover:text-white">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-white font-bold text-lg md:text-xl">
                จัดการคำถาม
              </h1>
              <p className="text-white/40 text-xs hidden md:block">
                {filteredQuestions.length} คำถาม
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors ${
                refreshing ? "animate-spin" : ""
              }`}
            >
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              size="sm"
              icon="add"
            >
              <span className="hidden sm:inline">เพิ่มคำถาม</span>
            </Button>
          </div>
        </div>
      </header>

      {/* DB Status */}
      {!dbConnected && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 mt-4">
          <div className="p-3 rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 flex items-center gap-2 text-neon-yellow text-sm">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>ใช้ข้อมูลตัวอย่าง (เชื่อมต่อ Database เพื่อใช้งานจริง)</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 mt-4">
        <div className="flex flex-wrap gap-3">
          <CustomDropdown
            id="type"
            value={filter.type}
            options={typeOptions}
            onChange={(value) => setFilter({ ...filter, type: value })}
            label="ประเภท"
          />
          <CustomDropdown
            id="level"
            value={filter.level}
            options={levelOptions}
            onChange={(value) => setFilter({ ...filter, level: value })}
            label="ระดับ"
          />
          <CustomDropdown
            id="rating"
            value={filter.is18Plus}
            options={ratingOptions}
            onChange={(value) => setFilter({ ...filter, is18Plus: value })}
            label="Rating"
          />
        </div>
      </section>

      {/* Question List */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 mt-6">
        {loading ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">
              progress_activity
            </span>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-white/10 mb-4">
              quiz
            </span>
            <p className="text-white/40">ไม่พบคำถาม</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredQuestions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <GlassPanel className="p-4 h-full flex flex-col">
                    <p className="text-white text-sm leading-relaxed flex-1">
                      {q.text}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            typeLabels[q.type]?.bg || "bg-gray-500/20"
                          } ${typeLabels[q.type]?.color || "text-gray-400"}`}
                        >
                          {typeLabels[q.type]?.label || q.type}
                        </span>
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-white/60">
                          {levelLabels[q.level]}
                        </span>
                        {q.is18Plus && (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-neon-red/20 text-neon-red">
                            18+
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg text-white/30 hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 rounded-lg text-white/30 hover:text-neon-red hover:bg-neon-red/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="w-full max-w-lg bg-surface rounded-2xl p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                เพิ่มคำถามใหม่
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    คำถาม
                  </label>
                  <textarea
                    value={newQuestion.text}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, text: e.target.value })
                    }
                    placeholder="พิมพ์คำถาม..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-primary resize-none h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">
                      ประเภท
                    </label>
                    <CustomDropdown
                      id="add-type"
                      value={newQuestion.type}
                      options={typeOptions.slice(1)}
                      onChange={(value) =>
                        setNewQuestion({ ...newQuestion, type: value })
                      }
                      label="ประเภท"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">
                      ระดับ
                    </label>
                    <CustomDropdown
                      id="add-level"
                      value={newQuestion.level.toString()}
                      options={levelOptions.slice(1)}
                      onChange={(value) =>
                        setNewQuestion({
                          ...newQuestion,
                          level: parseInt(value),
                        })
                      }
                      label="ระดับ"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={newQuestion.is18Plus}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        is18Plus: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-white/10 rounded-full peer peer-checked:bg-neon-red relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                  <span className="text-white">เนื้อหา 18+</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowAddModal(false)}
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
                  disabled={!newQuestion.text.trim()}
                >
                  บันทึก
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingQuestion && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              className="w-full max-w-lg bg-surface rounded-2xl p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-6">แก้ไขคำถาม</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    คำถาม
                  </label>
                  <textarea
                    value={editingQuestion.text}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        text: e.target.value,
                      })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-primary resize-none h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">
                      ประเภท
                    </label>
                    <CustomDropdown
                      id="edit-type"
                      value={editingQuestion.type}
                      options={typeOptions.slice(1)}
                      onChange={(value) =>
                        setEditingQuestion({ ...editingQuestion, type: value })
                      }
                      label="ประเภท"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">
                      ระดับ
                    </label>
                    <CustomDropdown
                      id="edit-level"
                      value={editingQuestion.level.toString()}
                      options={levelOptions.slice(1)}
                      onChange={(value) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          level: parseInt(value),
                        })
                      }
                      label="ระดับ"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={editingQuestion.is18Plus}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        is18Plus: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-white/10 rounded-full peer peer-checked:bg-neon-red relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                  <span className="text-white">เนื้อหา 18+</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="ghost"
                  size="lg"
                  fullWidth
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleEditQuestion}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!editingQuestion.text.trim()}
                >
                  บันทึก
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
