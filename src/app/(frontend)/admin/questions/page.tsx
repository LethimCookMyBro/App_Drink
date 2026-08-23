"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AdminGoogleSheetsExportButton } from "@/frontend/components/admin/AdminGoogleSheetsExportButton";
import { AdminDialog } from "@/frontend/components/admin/AdminDialog";
import { AdminSelect } from "@/frontend/components/admin/AdminSelect";
import { AdminSearchInput, useDebouncedValue } from "@/frontend/components/admin/AdminSearchInput";
import { RowActionsMenu } from "@/frontend/components/admin/RowActionsMenu";
import { StatusBadge } from "@/frontend/components/admin/StatusBadge";
import { AdminTable } from "@/frontend/components/admin/AdminTable";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminTableSkeleton,
} from "@/frontend/components/admin/AdminStates";
import { Button } from "@/frontend/components/ui";
import { AdminShell } from "@/frontend/components/admin/AdminShell";
import type { AdminIdentity } from "@/backend/adminData";
import { hasAdminRole } from "@/shared/adminRoles";

interface AdminQuestion {
  id: string;
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
  isActive?: boolean;
  usageCount?: number;
}

const QUESTIONS_PER_PAGE = 50;

const TYPE_OPTIONS = [
  { value: "QUESTION", label: "คำถาม" },
  { value: "TRUTH", label: "ความจริง" },
  { value: "DARE", label: "ท้า" },
  { value: "VOTE", label: "โหวต" },
  { value: "CHAOS", label: "โกลาหล" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

const LEVEL_LABELS: Record<number, string> = {
  1: "เบา",
  2: "กลาง",
  3: "แรง",
};

const LEVEL_HELPER =
  "ความเข้มเป็นอิสระจากเรต — คำถามระดับแรงไม่จำเป็นต้องเป็น 18+";

interface QuestionFilterState {
  type: string;
  level: string;
  rating: string;
  status: string;
}

const EMPTY_FILTERS: QuestionFilterState = {
  type: "",
  level: "",
  rating: "",
  status: "",
};

interface QuestionFormValues {
  text: string;
  type: string;
  level: number;
  is18Plus: boolean;
  isActive: boolean;
}

function getQuestionTextError(text: string): string | null {
  const trimmed = text.trim();

  if (trimmed.length === 0) return "กรุณากรอกคำถาม";
  if (trimmed.length < 5) return "คำถามต้องมีอย่างน้อย 5 ตัวอักษร";
  if (trimmed.length > 500) return "คำถามยาวได้ไม่เกิน 500 ตัวอักษร";

  return null;
}

interface SegmentedFieldProps {
  legend: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  helper?: string;
}

function SegmentedField({
  legend,
  name,
  value,
  options,
  onChange,
  helper,
}: SegmentedFieldProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-white/50">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                checked
                  ? "border-primary/60 bg-primary/20 text-white"
                  : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {helper ? <p className="mt-1.5 text-xs leading-relaxed text-white/35">{helper}</p> : null}
    </fieldset>
  );
}

interface QuestionFormDialogProps {
  open: boolean;
  title: string;
  isEdit: boolean;
  values: QuestionFormValues;
  saving: boolean;
  serverError: string | null;
  onChange: (values: QuestionFormValues) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function QuestionFormDialog({
  open,
  title,
  isEdit,
  values,
  saving,
  serverError,
  onChange,
  onSubmit,
  onClose,
}: QuestionFormDialogProps) {
  const textError = getQuestionTextError(values.text);
  const charCount = values.text.trim().length;

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      description="แต่ละมิติตั้งค่าได้อิสระจากกัน"
      closeOnEscape={!saving}
      closeOnBackdrop={!saving}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="question-text" className="mb-1.5 block text-xs font-semibold text-white/50">
            ข้อความคำถาม
          </label>
          <textarea
            id="question-text"
            value={values.text}
            onChange={(event) => onChange({ ...values, text: event.target.value })}
            placeholder="พิมพ์ข้อความ..."
            rows={3}
            maxLength={600}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder-white/30 transition-colors focus:border-primary/60 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
            <span className={textError ? "text-neon-red" : "text-white/35"}>
              {textError || "รองรับ 5–500 ตัวอักษร"}
            </span>
            <span className={charCount > 500 ? "text-neon-red" : "text-white/30"}>
              {charCount}/500
            </span>
          </div>
        </div>

        <SegmentedField
          legend="รูปแบบเกม — สิ่งที่ผู้เล่นต้องทำ"
          name="question-type"
          value={values.type}
          options={TYPE_OPTIONS}
          onChange={(type) => onChange({ ...values, type })}
        />

        <SegmentedField
          legend="ความเข้ม"
          name="question-level"
          value={String(values.level)}
          options={[
            { value: "1", label: "เบา" },
            { value: "2", label: "กลาง" },
            { value: "3", label: "แรง" },
          ]}
          onChange={(level) => onChange({ ...values, level: Number(level) })}
          helper={LEVEL_HELPER}
        />

        <SegmentedField
          legend="เรตเนื้อหา — ผู้เล่นกลุ่มที่เห็นได้"
          name="question-rating"
          value={values.is18Plus ? "true" : "false"}
          options={[
            { value: "false", label: "ทั่วไป" },
            { value: "true", label: "18+" },
          ]}
          onChange={(rating) => onChange({ ...values, is18Plus: rating === "true" })}
        />

        {isEdit ? (
          <SegmentedField
            legend="สถานะ"
            name="question-status"
            value={values.isActive ? "active" : "inactive"}
            options={[
              { value: "active", label: "เปิดใช้งาน" },
              { value: "inactive", label: "ปิดใช้งาน" },
            ]}
            onChange={(status) => onChange({ ...values, isActive: status === "active" })}
          />
        ) : null}

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs font-semibold text-white/40">ตัวอย่าง</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge tone="primary">{TYPE_LABELS[values.type] ?? values.type}</StatusBadge>
            <StatusBadge tone="neutral">{LEVEL_LABELS[values.level]}</StatusBadge>
            {values.is18Plus ? (
              <StatusBadge tone="red">18+</StatusBadge>
            ) : null}
            {!isEdit || values.isActive ? null : (
              <StatusBadge tone="yellow">ปิดใช้</StatusBadge>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-white/70">
            {values.text.trim() || "—"}
          </p>
        </div>

        {serverError ? <AdminErrorState message={serverError} /> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving || Boolean(textError)}
            loading={saving}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </AdminDialog>
  );
}

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminIdentity | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rowActionError, setRowActionError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [filters, setFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<QuestionFormValues>({
    text: "",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
    isActive: true,
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [editForm, setEditForm] = useState<QuestionFormValues>({
    text: "",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
    isActive: true,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<AdminQuestion | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const canManageQuestions = hasAdminRole(adminUser?.role, "ADMIN");

  const fetchQuestions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (filters.type) params.set("type", filters.type);
      if (filters.level) params.set("level", filters.level);
      if (filters.rating) params.set("is18Plus", filters.rating);
      if (filters.status) params.set("status", filters.status);
      if (sort !== "newest") params.set("sort", sort);
      params.set("limit", String(QUESTIONS_PER_PAGE));
      params.set("offset", String((page - 1) * QUESTIONS_PER_PAGE));

      const res = await fetch(`/api/questions?${params}`, { cache: "no-store" });
      if (requestId !== requestIdRef.current) return;

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await res.json().catch(() => null);
      if (requestId !== requestIdRef.current) return;

      if (res.ok && data?.questions) {
        setQuestions(data.questions);
        setTotalQuestions(typeof data.total === "number" ? data.total : data.questions.length);
        setApiError(null);
      } else {
        setQuestions([]);
        setTotalQuestions(0);
        setApiError(data?.error || "ไม่สามารถโหลดคำถามได้");
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setQuestions([]);
      setTotalQuestions(0);
      setApiError("ไม่สามารถเชื่อมต่อ API เพื่อโหลดคำถามได้");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, filters, page, router, sort]);

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
      } catch {
        router.push("/admin/login");
      }
    };
    void checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchId = window.setTimeout(() => {
      void fetchQuestions();
    }, 0);

    return () => window.clearTimeout(fetchId);
  }, [fetchQuestions]);

  const totalPages = Math.max(1, Math.ceil(totalQuestions / QUESTIONS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = totalQuestions === 0 ? 0 : (currentPage - 1) * QUESTIONS_PER_PAGE + 1;
  const rangeEnd = Math.min(totalQuestions, currentPage * QUESTIONS_PER_PAGE);
  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(filters.type) ||
    Boolean(filters.level) ||
    Boolean(filters.rating) ||
    Boolean(filters.status) ||
    sort !== "newest";

  const handleToggleActive = async (question: AdminQuestion) => {
    if (!canManageQuestions) return;
    const nextActive = !question.isActive;
    setRowActionError(null);
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRowActionError(data?.error || "ไม่สามารถเปลี่ยนสถานะคำถามได้");
        return;
      }
      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? { ...item, isActive: data.question?.isActive ?? nextActive }
            : item,
        ),
      );
    } catch {
      setRowActionError("ไม่สามารถเชื่อมต่อเพื่อเปลี่ยนสถานะคำถามได้");
    }
  };

  const handleOpenEdit = (question: AdminQuestion) => {
    setEditError(null);
    setEditingQuestion(question);
    setEditForm({
      text: question.text,
      type: question.type,
      level: question.level,
      is18Plus: question.is18Plus,
      isActive: question.isActive ?? true,
    });
  };

  const handleDuplicate = (question: AdminQuestion) => {
    setCreateError(null);
    const suffix = " (คัดลอก)";
    const baseText =
      question.text.length + suffix.length <= 500
        ? `${question.text}${suffix}`
        : question.text.slice(0, Math.max(0, 500 - suffix.length)) + suffix;
    setCreateForm({
      text: baseText.slice(0, 500),
      type: question.type,
      level: question.level,
      is18Plus: question.is18Plus,
      isActive: true,
    });
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!canManageQuestions || createSaving) return;
    if (getQuestionTextError(createForm.text)) return;

    setCreateSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: createForm.text,
          type: createForm.type,
          level: createForm.level,
          is18Plus: createForm.is18Plus,
        }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCreateError(data?.error || "ไม่สามารถเพิ่มคำถามได้");
        return;
      }

      setCreateOpen(false);
      setCreateForm({ text: "", type: "QUESTION", level: 2, is18Plus: false, isActive: true });
      setPage(1);
      await fetchQuestions();
    } catch {
      setCreateError("ไม่สามารถเชื่อมต่อ API เพื่อเพิ่มคำถามได้");
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!canManageQuestions || !editingQuestion || editSaving) return;
    if (getQuestionTextError(editForm.text)) return;

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editForm.text,
          type: editForm.type,
          level: editForm.level,
          is18Plus: editForm.is18Plus,
          isActive: editForm.isActive,
        }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEditError(data?.error || "ไม่สามารถแก้ไขคำถามได้");
        return;
      }

      setEditingQuestion(null);
      await fetchQuestions();
    } catch {
      setEditError("ไม่สามารถเชื่อมต่อ API เพื่อแก้ไขคำถามได้");
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!canManageQuestions || !pendingDelete || deleteSaving) return;

    setDeleteSaving(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/questions/${pendingDelete.id}?permanent=true`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDeleteError(data?.error || "ไม่สามารถลบคำถามถาวรได้");
        return;
      }

      setPendingDelete(null);
      await fetchQuestions();
    } catch {
      setDeleteError("ไม่สามารถเชื่อมต่อ API เพื่อลบคำถามถาวรได้");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <AdminShell
      admin={adminUser}
      title="จัดการคำถาม"
      description={
        totalQuestions > 0
          ? `ฐานคำถามทั้งหมด ${totalQuestions.toLocaleString("th-TH")} รายการ • แสดง ${rangeStart.toLocaleString("th-TH")}–${rangeEnd.toLocaleString("th-TH")}`
          : "ฐานคำถามสำหรับทุกโหมดเกม"
      }
      actions={
        <>
          <Button
            onClick={() => void fetchQuestions()}
            variant="ghost"
            size="sm"
            icon="refresh"
            loading={loading}
          >
            รีเฟรช
          </Button>
          {canManageQuestions ? (
            <>
              <AdminGoogleSheetsExportButton dataset="questions" label="ส่งออก" />
              <Button
                onClick={() => {
                  setCreateError(null);
                  setCreateForm({ text: "", type: "QUESTION", level: 2, is18Plus: false, isActive: true });
                  setCreateOpen(true);
                }}
                variant="primary"
                size="sm"
                icon="add"
              >
                เพิ่มคำถาม
              </Button>
            </>
          ) : null}
        </>
      }
    >
      {apiError ? <div className="mb-4"><AdminErrorState message={apiError} /></div> : null}
      {rowActionError ? <div className="mb-4"><AdminErrorState message={rowActionError} /></div> : null}

      <section className="mb-4 space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <AdminSearchInput
            id="question-search"
            label="ค้นหาทั้งฐานคำถาม"
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value);
              setPage(1);
            }}
            placeholder="ค้นหาจากข้อความคำถาม..."
          />
          <AdminSelect
            id="filter-type"
            ariaLabel="กรองตามรูปแบบ"
            value={filters.type}
            onChange={(value) => {
              setFilters({ ...filters, type: value });
              setPage(1);
            }}
            options={[
              { value: "", label: "รูปแบบ: ทั้งหมด" },
              ...TYPE_OPTIONS,
            ]}
          />
          <AdminSelect
            id="filter-level"
            ariaLabel="กรองตามความเข้ม"
            value={filters.level}
            onChange={(value) => {
              setFilters({ ...filters, level: value });
              setPage(1);
            }}
            options={[
              { value: "", label: "ความเข้ม: ทั้งหมด" },
              { value: "1", label: "เบา" },
              { value: "2", label: "กลาง" },
              { value: "3", label: "แรง" },
            ]}
          />
          <AdminSelect
            id="filter-rating"
            ariaLabel="กรองตามเรตเนื้อหา"
            value={filters.rating}
            onChange={(value) => {
              setFilters({ ...filters, rating: value });
              setPage(1);
            }}
            options={[
              { value: "", label: "เรต: ทั้งหมด" },
              { value: "false", label: "ทั่วไป" },
              { value: "true", label: "18+" },
            ]}
          />
          <AdminSelect
            id="filter-status"
            ariaLabel="กรองตามสถานะ"
            value={filters.status}
            onChange={(value) => {
              setFilters({ ...filters, status: value });
              setPage(1);
            }}
            options={[
              { value: "", label: "สถานะ: เปิดใช้" },
              { value: "all", label: "สถานะ: ทั้งหมด" },
              { value: "inactive", label: "สถานะ: ปิดใช้" },
            ]}
          />
          <AdminSelect
            id="sort-order"
            ariaLabel="เรียงลำดับ"
            value={sort}
            onChange={(value) => {
              setSort(value);
              setPage(1);
            }}
            options={[
              { value: "newest", label: "ใหม่ล่าสุด" },
              { value: "usage", label: "ใช้บ่อยสุด" },
            ]}
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setFilters(EMPTY_FILTERS);
                setSort("newest");
                setPage(1);
              }}
              className="h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 hover:text-white"
            >
              ล้างตัวกรอง
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <AdminTableSkeleton rows={8} />
      ) : questions.length === 0 && !apiError ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02]">
          <AdminEmptyState
            icon="quiz"
            title={hasActiveFilters ? "ไม่พบคำถามที่ตรงกับตัวกรอง" : "ยังไม่มีคำถามในระบบ"}
            description={
              hasActiveFilters
                ? "ลองปรับคำค้นหาหรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
                : undefined
            }
          />
        </div>
      ) : (
        <>
          <AdminTable
            caption="รายการคำถามทั้งหมด"
            minWidth={900}
            headers={[
              { label: "คำถาม", className: "w-full min-w-[280px]" },
              { label: "รูปแบบ" },
              { label: "ความเข้ม" },
              { label: "เรต" },
              { label: "ใช้แล้ว", className: "text-right" },
              { label: "สถานะ" },
              { label: "", className: "w-12" },
            ]}
          >
            {questions.map((question) => {
              const isActive = question.isActive ?? true;
              return (
                <tr key={question.id} className={`transition-colors hover:bg-white/[0.03] ${isActive ? "" : "opacity-55"}`}>
                  <td className="max-w-[420px] px-3 py-2.5 align-middle">
                    <p className="line-clamp-2 text-sm leading-snug text-white/90">
                      {question.text}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge tone="neutral">{TYPE_LABELS[question.type] ?? question.type}</StatusBadge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle text-sm text-white/70">
                    {LEVEL_LABELS[question.level] ?? `ระดับ ${question.level}`}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {question.is18Plus ? (
                      <StatusBadge tone="red">18+</StatusBadge>
                    ) : (
                      <span className="text-sm text-white/40">ทั่วไป</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle text-sm tabular-nums text-white/60">
                    {(question.usageCount ?? 0).toLocaleString("th-TH")}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge tone={isActive ? "green" : "neutral"} dot>
                      {isActive ? "เปิดใช้" : "ปิดใช้"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {canManageQuestions ? (
                      <RowActionsMenu
                        label={`การกระทำสำหรับคำถาม: ${question.text.slice(0, 40)}`}
                        actions={[
                          { label: "แก้ไข", icon: "edit", onSelect: () => handleOpenEdit(question) },
                          { label: "ทำสำเนา", icon: "content_copy", onSelect: () => handleDuplicate(question) },
                          {
                            label: isActive ? "ปิดใช้งาน" : "เปิดใช้งาน",
                            icon: isActive ? "do_not_disturb_on" : "check_circle",
                            onSelect: () => void handleToggleActive(question),
                          },
                          { kind: "divider" },
                          {
                            label: "ลบถาวร",
                            icon: "delete",
                            danger: true,
                            onSelect: () => {
                              setDeleteError(null);
                              setPendingDelete(question);
                            },
                          },
                        ]}
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </AdminTable>

          <nav
            aria-label="แบ่งหน้าคำถาม"
            className="mt-3 flex items-center justify-between gap-3 text-sm text-white/50"
          >
            <span>
              หน้า {currentPage.toLocaleString("th-TH")} / {totalPages.toLocaleString("th-TH")}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1 || loading}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages || loading}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </nav>
        </>
      )}

      <QuestionFormDialog
        open={createOpen}
        title="เพิ่มคำถามใหม่"
        isEdit={false}
        values={createForm}
        saving={createSaving}
        serverError={createError}
        onChange={setCreateForm}
        onSubmit={() => void handleCreateSubmit()}
        onClose={() => {
          if (!createSaving) setCreateOpen(false);
        }}
      />

      <QuestionFormDialog
        open={Boolean(editingQuestion)}
        title="แก้ไขคำถาม"
        isEdit
        values={editForm}
        saving={editSaving}
        serverError={editError}
        onChange={setEditForm}
        onSubmit={() => void handleEditSubmit()}
        onClose={() => {
          if (!editSaving) setEditingQuestion(null);
        }}
      />

      <AdminDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleteSaving) setPendingDelete(null);
        }}
        title="ยืนยันการลบถาวร"
        description="การลบถาวรไม่สามารถย้อนกลับได้ หากต้องการเพียงซ่อนออกจากเกม ให้ใช้ “ปิดใช้งาน” แทน"
        size="sm"
        closeOnEscape={!deleteSaving}
        closeOnBackdrop={!deleteSaving}
      >
        {pendingDelete ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleConfirmPermanentDelete();
            }}
            className="space-y-4"
          >
            <blockquote className="rounded-xl border border-neon-red/25 bg-neon-red/5 p-3.5 text-sm leading-relaxed text-white/85">
              {pendingDelete.text}
            </blockquote>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge tone="primary">{TYPE_LABELS[pendingDelete.type] ?? pendingDelete.type}</StatusBadge>
              <StatusBadge tone="neutral">{LEVEL_LABELS[pendingDelete.level]}</StatusBadge>
              {pendingDelete.is18Plus ? <StatusBadge tone="red">18+</StatusBadge> : null}
            </div>
            {deleteError ? <AdminErrorState message={deleteError} /> : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setPendingDelete(null)}
                disabled={deleteSaving}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                variant="neon-red"
                size="md"
                disabled={deleteSaving}
                loading={deleteSaving}
              >
                {deleteSaving ? "กำลังลบ..." : "ลบถาวร"}
              </Button>
            </div>
          </form>
        ) : null}
      </AdminDialog>
    </AdminShell>
  );
}
