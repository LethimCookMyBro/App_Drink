"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminGoogleSheetsExportButton } from "@/components/admin/AdminGoogleSheetsExportButton";
import { Button, GlassPanel } from "@/components/ui";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import type { AdminIdentity } from "@/lib/adminData";

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

function getQuestionTextError(text: string): string | null {
  const trimmed = text.trim();

  if (trimmed.length === 0) return "กรุณากรอกคำถาม";
  if (trimmed.length < 5) return "คำถามต้องมีอย่างน้อย 5 ตัวอักษร";
  if (trimmed.length > 500) return "คำถามยาวได้ไม่เกิน 500 ตัวอักษร";

  return null;
}

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminIdentity | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Custom dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const params = new URLSearchParams();
      if (filter.type) params.set("type", filter.type);
      if (filter.level) params.set("level", filter.level);
      if (filter.is18Plus) params.set("is18Plus", filter.is18Plus);

      const res = await fetch(`/api/questions?${params}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.ok) {
        if (Array.isArray(data)) {
          setQuestions(data);
          setDbConnected(true);
          setApiError(null);
        } else if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          setDbConnected(true);
          setApiError(null);
        } else {
          setQuestions([]);
          setDbConnected(true);
        }
      } else {
        setQuestions([]);
        setDbConnected(false);
        setApiError(data?.error || "ไม่สามารถโหลดคำถามจาก API ได้");
      }
    } catch {
      setQuestions([]);
      setDbConnected(false);
      setApiError("ไม่สามารถเชื่อมต่อ API เพื่อโหลดคำถามได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, router]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        const data = await res.json();
        if (!data.authenticated) {
          router.push("/admin/login");
          return;
        }
        setAdminUser(data.admin ?? null);
        fetchQuestions();
      } catch {
        router.push("/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [fetchQuestions, router]);

  // Pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchQuestions();
  };

  const newQuestionTextError = getQuestionTextError(newQuestion.text);
  const editingQuestionTextError = editingQuestion
    ? getQuestionTextError(editingQuestion.text)
    : null;

  // Filter mock data locally
  const filteredQuestions = questions.filter((q) => {
    if (filter.type && q.type !== filter.type) return false;
    if (filter.level && q.level !== parseInt(filter.level)) return false;
    if (filter.is18Plus === "true" && !q.is18Plus) return false;
    if (filter.is18Plus === "false" && q.is18Plus) return false;
    return true;
  });

  const handleAddQuestion = async () => {
    if (newQuestionTextError) return;

    try {
      setApiError(null);
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setQuestions((current) => [data.question, ...current]);
        setDbConnected(true);
      } else {
        const data = await res.json().catch(() => null);
        setApiError(data?.error || "ไม่สามารถเพิ่มคำถามได้");
        return;
      }
    } catch {
      setApiError("ไม่สามารถเชื่อมต่อ API เพื่อเพิ่มคำถามได้");
      return;
    }

    setNewQuestion({ text: "", type: "QUESTION", level: 2, is18Plus: false });
    setShowAddModal(false);
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion || editingQuestionTextError) return;

    try {
      setApiError(null);
      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingQuestion),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setQuestions((current) =>
          current.map((q) =>
            q.id === editingQuestion.id ? data.question : q
          )
        );
      } else {
        const data = await res.json().catch(() => null);
        setApiError(data?.error || "ไม่สามารถแก้ไขคำถามได้");
        return;
      }
    } catch {
      setApiError("ไม่สามารถเชื่อมต่อ API เพื่อแก้ไขคำถามได้");
      return;
    }

    setEditingQuestion(null);
    setShowEditModal(false);
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      setApiError(null);
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setApiError(data?.error || "ไม่สามารถลบคำถามได้");
        return;
      }
    } catch {
      setApiError("ไม่สามารถเชื่อมต่อ API เพื่อลบคำถามได้");
      return;
    }
    setQuestions((current) => current.filter((q) => q.id !== id));
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

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d0a10]">
        <div className="animate-pulse text-white/40">กำลังตรวจสอบสิทธิ์...</div>
      </main>
    );
  }

  return (
    <AdminShell
      admin={adminUser}
      title="จัดการคำถาม"
      description={`ฐานคำถามสำหรับทุกโหมดเกม ตอนนี้มี ${filteredQuestions.length} รายการที่ตรงกับ filter ปัจจุบัน`}
      actions={
        <>
          <button
            type="button"
            onClick={handleRefresh}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white ${
              refreshing ? "animate-pulse" : ""
            }`}
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            รีเฟรช
          </button>
          <AdminGoogleSheetsExportButton
            dataset="questions"
            label="Export Questions"
          />
          <Button
            onClick={() => {
              setApiError(null);
              setShowAddModal(true);
            }}
            variant="primary"
            size="sm"
            icon="add"
          >
            เพิ่มคำถาม
          </Button>
        </>
      }
    >

      {/* DB Status */}
      {apiError && (
        <div>
          <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/20 flex items-center gap-2 text-neon-red text-sm">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{apiError}</span>
          </div>
        </div>
      )}

      {!apiError && !dbConnected && (
        <div>
          <div className="p-3 rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 flex items-center gap-2 text-neon-yellow text-sm">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>กำลังเชื่อมต่อข้อมูลคำถามจากระบบจริง</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <section>
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
      <section>
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
                            setApiError(null);
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
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span
                      className={
                        newQuestionTextError ? "text-neon-red" : "text-white/40"
                      }
                    >
                      {newQuestionTextError || "รองรับ 5-500 ตัวอักษร"}
                    </span>
                    <span className="text-white/30">
                      {newQuestion.text.trim().length}/500
                    </span>
                  </div>
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
                  disabled={Boolean(newQuestionTextError)}
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
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span
                      className={
                        editingQuestionTextError
                          ? "text-neon-red"
                          : "text-white/40"
                      }
                    >
                      {editingQuestionTextError || "รองรับ 5-500 ตัวอักษร"}
                    </span>
                    <span className="text-white/30">
                      {editingQuestion.text.trim().length}/500
                    </span>
                  </div>
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
                  disabled={Boolean(editingQuestionTextError)}
                >
                  บันทึก
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
