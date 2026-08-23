"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminGoogleSheetsExportButton } from "@/frontend/components/admin/AdminGoogleSheetsExportButton";
import { AdminDialog } from "@/frontend/components/admin/AdminDialog";
import { AdminDrawer } from "@/frontend/components/admin/AdminDrawer";
import { AdminShell } from "@/frontend/components/admin/AdminShell";
import { RowActionsMenu } from "@/frontend/components/admin/RowActionsMenu";
import { StatusBadge } from "@/frontend/components/admin/StatusBadge";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminNotice,
  AdminTableSkeleton,
} from "@/frontend/components/admin/AdminStates";
import { formatAdminNumber } from "@/frontend/admin/format";
import { useAdminRouteData } from "@/frontend/hooks/useAdminRouteData";
import type { AdminFeedbackData, AdminFeedbackItem } from "@/backend/adminData";
import { hasAdminRole } from "@/shared/adminRoles";
import { applyFeedbackStatusDelta, applyFeedbackDeleteDelta } from "@/shared/feedbackSummaryDelta";

import { Icon } from "@/frontend/components/ui/Icon";

type FeedbackStatusFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "แก้ไขแล้ว",
  REJECTED: "ปฏิเสธ",
};

const STATUS_TONES: Record<string, "neutral" | "blue" | "green" | "red"> = {
  PENDING: "neutral",
  IN_PROGRESS: "blue",
  RESOLVED: "green",
  REJECTED: "red",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { data, loading, error, refresh, setData } = useAdminRouteData<AdminFeedbackData>(
    "/api/admin/feedback",
    "ไม่สามารถโหลด feedback ได้",
  );

  const [activeFilter, setActiveFilter] = useState<FeedbackStatusFilter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [detailItem, setDetailItem] = useState<AdminFeedbackItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminFeedbackItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const feedbacks = data?.feedbacks ?? [];
  const summary = data?.summary ?? {
    ALL: 0,
    PENDING: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    REJECTED: 0,
  };
  const canDeleteFeedback = hasAdminRole(data?.admin.role, "ADMIN");

  const filteredFeedbacks =
    activeFilter === "ALL"
      ? feedbacks
      : feedbacks.filter((item) => item.status === activeFilter);

  const applyStatusChange = (id: string, newStatus: string, resolvedAt: string | null) => {
    setData((current) => {
      if (!current) return current;
      const oldItem = current.feedbacks.find((item) => item.id === id);
      const oldStatus = oldItem?.status;
      const feedbacks = current.feedbacks.map((item) =>
        item.id === id
          ? { ...item, status: newStatus as AdminFeedbackItem["status"], resolvedAt }
          : item,
      );
      // Preserve server-authoritative summary; only adjust the delta
      const summary = applyFeedbackStatusDelta(current.summary, oldStatus, newStatus);
      return { ...current, feedbacks, summary };
    });
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      setBusyId(id);
      setNotice("");
      setActionError("");

      const response = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setActionError(payload?.error || "ไม่สามารถอัปเดตสถานะ feedback ได้");
        return;
      }

      applyStatusChange(
        id,
        status,
        status === "RESOLVED" ? new Date().toISOString() : null,
      );
      setDetailItem((current) =>
        current && current.id === id ? { ...current, status: status as AdminFeedbackItem["status"], resolvedAt: status === "RESOLVED" ? new Date().toISOString() : null } : current,
      );
      setNotice("อัปเดตสถานะ feedback แล้ว");
    } catch {
      setActionError("ไม่สามารถเชื่อมต่อเพื่ออัปเดตสถานะ feedback ได้");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!canDeleteFeedback || !pendingDelete || deleteSaving) return;

    setDeleteSaving(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/feedback/${pendingDelete.id}`, { method: "DELETE" });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setDeleteError(payload?.error || "ไม่สามารถลบ feedback ได้");
        return;
      }

      setData((current) => {
        if (!current) return current;
        const deleted = current.feedbacks.find((item) => item.id === pendingDelete.id);
        const remaining = current.feedbacks.filter((item) => item.id !== pendingDelete.id);
        // Preserve server-authoritative summary; only decrement the deleted item's status
        const summary = deleted
          ? applyFeedbackDeleteDelta(current.summary, deleted.status)
          : current.summary;
        return { ...current, feedbacks: remaining, summary };
      });
      setDetailItem((current) => (current?.id === pendingDelete.id ? null : current));
      setPendingDelete(null);
      setNotice("ลบ feedback สำเร็จ");
    } catch {
      setDeleteError("ไม่สามารถเชื่อมต่อเพื่อลบ feedback ได้");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="ข้อเสนอแนะ"
      description="คิวงานบัคและคำขอฟีเจอร์ — ข้อมูลติดต่อถูกปิดบังโดยค่าเริ่มต้น"
      actions={
        <>
          <button
            type="button"
            aria-label="รีเฟรชรายการ"
            onClick={() => void refresh()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="refresh" className={`text-base ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
          {canDeleteFeedback ? (
            <AdminGoogleSheetsExportButton dataset="feedback" label="ส่งออก" />
          ) : null}
        </>
      }
    >
      {error || actionError ? (
        <div className="mb-4">
          <AdminErrorState message={error ?? actionError} />
        </div>
      ) : null}
      {notice && !actionError ? (
        <div className="mb-4">
          <AdminNotice message={notice} />
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="กรองตามสถานะ"
        className="mb-4 flex flex-wrap gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1"
      >
        {([
          ["ALL", `ทั้งหมด (${formatAdminNumber(summary.ALL)})`],
          ["PENDING", `รอดำเนินการ (${formatAdminNumber(summary.PENDING)})`],
          ["IN_PROGRESS", `กำลังดำเนินการ (${formatAdminNumber(summary.IN_PROGRESS)})`],
          ["RESOLVED", `แก้ไขแล้ว (${formatAdminNumber(summary.RESOLVED)})`],
          ["REJECTED", `ปฏิเสธ (${formatAdminNumber(summary.REJECTED)})`],
        ] as Array<[FeedbackStatusFilter, string]>).map(([status, label], tabIndex) => {
          const selected = activeFilter === status;
          const allTabs: FeedbackStatusFilter[] = ["ALL", "PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];
          return (
            <button
              key={status}
              role="tab"
              type="button"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              onClick={() => setActiveFilter(status)}
              onKeyDown={(event) => {
                let nextIndex = tabIndex;
                if (event.key === "ArrowRight") {
                  nextIndex = (tabIndex + 1) % allTabs.length;
                } else if (event.key === "ArrowLeft") {
                  nextIndex = (tabIndex - 1 + allTabs.length) % allTabs.length;
                } else if (event.key === "Home") {
                  nextIndex = 0;
                } else if (event.key === "End") {
                  nextIndex = allTabs.length - 1;
                } else {
                  return;
                }
                event.preventDefault();
                setActiveFilter(allTabs[nextIndex]);
                (event.currentTarget.parentElement?.children[nextIndex] as HTMLElement | undefined)?.focus();
              }}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "bg-primary/20 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <AdminTableSkeleton rows={7} />
      ) : filteredFeedbacks.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02]">
          <AdminEmptyState
            icon="inbox"
            title={
              activeFilter === "ALL"
                ? "ยังไม่มีข้อเสนอแนะในระบบ"
                : `ไม่มีรายการในสถานะ “${STATUS_LABELS[activeFilter]}”`
            }
          />
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-white/35">
            แสดง {formatAdminNumber(filteredFeedbacks.length)} รายการล่าสุด
          </p>
          <ul className="divide-y divide-white/5 rounded-xl border border-white/8 bg-white/[0.02]">
            {filteredFeedbacks.map((feedback) => {
              const isBusy = busyId === feedback.id;
              return (
                <li
                  key={feedback.id}
                  className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 ${
                    isBusy ? "opacity-60" : ""
                  }`}
                >
                  <StatusBadge tone={feedback.type === "BUG" ? "red" : "yellow"}>
                    {feedback.type === "BUG" ? "บัค" : "ฟีเจอร์"}
                  </StatusBadge>

                  <button
                    type="button"
                    onClick={() => setDetailItem(feedback)}
                    className="min-w-0 flex-1 text-left"
                    title="เปิดดูรายละเอียด"
                  >
                    <span className="block truncate text-sm font-semibold text-white/90 hover:text-white">
                      {feedback.title}
                    </span>
                  </button>

                  <StatusBadge tone={STATUS_TONES[feedback.status] ?? "neutral"} dot>
                    {STATUS_LABELS[feedback.status] ?? feedback.status}
                  </StatusBadge>

                  <span className="w-36 shrink-0 text-xs tabular-nums text-white/40">
                    {formatDateTime(feedback.createdAt)}
                  </span>

                  <span
                    className="flex shrink-0 items-center gap-1 text-xs text-white/45"
                    title={feedback.hasContact ? `ติดต่อกลับ: ${feedback.contactMasked}` : "ไม่มีช่องทางติดต่อ"}
                  >
                    <Icon name={feedback.hasContact ? "chat_bubble" : "do_not_disturb_on"} className="text-sm" />
                    <span>{feedback.hasContact ? "มีช่องทางติดต่อ" : "ไม่มี"}</span>
                  </span>

                  <RowActionsMenu
                    label={`การกระทำสำหรับ: ${feedback.title}`}
                    actions={[
                      { label: "ดูรายละเอียด", icon: "visibility", onSelect: () => setDetailItem(feedback) },
                      ...(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const)
                        .filter((status) => status !== feedback.status)
                        .map((status) => ({
                          label: `เปลี่ยนเป็น: ${STATUS_LABELS[status]}`,
                          icon: "sync" as const,
                          onSelect: () => void handleStatusChange(feedback.id, status),
                        })),
                      ...(canDeleteFeedback
                        ? [
                            { kind: "divider" as const },
                            {
                              label: "ลบ feedback",
                              icon: "delete" as const,
                              danger: true,
                              disabled: isBusy,
                              onSelect: () => {
                                setDeleteError(null);
                                setPendingDelete(feedback);
                              },
                            },
                          ]
                        : []),
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Detail drawer */}
      <AdminDrawer
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        title="รายละเอียด feedback"
      >
        {detailItem ? (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone={detailItem.type === "BUG" ? "red" : "yellow"}>
                  {detailItem.type === "BUG" ? "บัค" : "ฟีเจอร์"}
                </StatusBadge>
                <StatusBadge tone={STATUS_TONES[detailItem.status] ?? "neutral"} dot>
                  {STATUS_LABELS[detailItem.status] ?? detailItem.status}
                </StatusBadge>
                <span className="text-xs text-white/30">#{detailItem.id.slice(0, 8)}</span>
              </div>
              <h3 className="text-lg font-bold leading-snug text-white">{detailItem.title}</h3>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-white/40">รายละเอียด</p>
              <p className="whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm leading-relaxed text-white/75">
                {detailItem.details || "ไม่มีรายละเอียดเพิ่มเติม"}
              </p>
            </div>

            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-white/40">ติดต่อกลับ</dt>
              <dd className="text-white/80">{detailItem.contactMasked ?? "ไม่ระบุ"}</dd>
              <dt className="text-white/40">แจ้งเมื่อ</dt>
              <dd className="text-white/80">{formatDateTime(detailItem.createdAt)}</dd>
              <dt className="text-white/40">แก้ไขเมื่อ</dt>
              <dd className="text-white/80">{formatDateTime(detailItem.resolvedAt)}</dd>
            </dl>

            <div>
              <label htmlFor="feedback-status-control" className="mb-1.5 block text-xs font-semibold text-white/50">
                เปลี่ยนสถานะ
              </label>
              <select
                id="feedback-status-control"
                value={detailItem.status}
                disabled={busyId === detailItem.id}
                onChange={(event) => void handleStatusChange(detailItem.id, event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white transition-colors focus:border-primary/60 focus:outline-none disabled:opacity-50"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className="bg-[#161219]">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {canDeleteFeedback ? (
              <button
                type="button"
                disabled={busyId === detailItem.id}
                onClick={() => {
                  setDeleteError(null);
                  setPendingDelete(detailItem);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-neon-red/25 bg-neon-red/10 px-4 text-sm font-semibold text-neon-red transition-colors hover:bg-neon-red/20 disabled:opacity-60"
              >
                <Icon name="delete" className="text-base" />
                ลบ feedback
              </button>
            ) : null}
          </div>
        ) : null}
      </AdminDrawer>

      {/* Delete confirmation */}
      <AdminDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleteSaving) setPendingDelete(null);
        }}
        title="ยืนยันการลบ feedback"
        description="การลบไม่สามารถย้อนกลับได้"
        size="sm"
        closeOnEscape={!deleteSaving}
        closeOnBackdrop={!deleteSaving}
      >
        {pendingDelete ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleConfirmDelete();
            }}
            className="space-y-4"
          >
            <blockquote className="rounded-xl border border-neon-red/25 bg-neon-red/5 p-3.5 text-sm leading-relaxed text-white/85">
              {pendingDelete.title}
            </blockquote>
            {deleteError ? <AdminErrorState message={deleteError} /> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleteSaving}
                className="inline-flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={deleteSaving}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-neon-red px-4 text-sm font-bold text-white shadow-[0_4px_0_#990026] transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-60"
              >
                {deleteSaving ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
          </form>
        ) : null}
      </AdminDialog>
    </AdminShell>
  );
}
