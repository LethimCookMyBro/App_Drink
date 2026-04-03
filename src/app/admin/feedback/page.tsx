"use client";

import { useState } from "react";
import { AdminGoogleSheetsExportButton } from "@/components/admin/AdminGoogleSheetsExportButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassPanel } from "@/components/ui";
import { useAdminRouteData } from "@/hooks/useAdminRouteData";
import type { AdminFeedbackData } from "@/lib/adminData";

type FeedbackStatus = "ALL" | "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

function getFeedbackTypeMeta(type: string) {
  return type === "BUG"
    ? {
        label: "บัค",
        badgeClass: "bg-neon-red/15 text-neon-red",
      }
    : {
        label: "ฟีเจอร์",
        badgeClass: "bg-neon-yellow/15 text-neon-yellow",
      };
}

function getStatusClass(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-neon-blue/15 text-neon-blue";
    case "RESOLVED":
      return "bg-neon-green/15 text-neon-green";
    case "REJECTED":
      return "bg-neon-red/15 text-neon-red";
    default:
      return "bg-white/10 text-white/65";
  }
}

export default function AdminFeedbackPage() {
  const { data, loading, error, refresh, setData } = useAdminRouteData<AdminFeedbackData>(
    "/api/admin/feedback",
    "ไม่สามารถโหลด feedback ได้",
  );
  const [activeFilter, setActiveFilter] = useState<FeedbackStatus>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const feedbacks = data?.feedbacks ?? [];
  const summary = data?.summary ?? {
    ALL: 0,
    PENDING: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    REJECTED: 0,
  };

  const filteredFeedbacks =
    activeFilter === "ALL"
      ? feedbacks
      : feedbacks.filter((item) => item.status === activeFilter);

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
        window.location.href = "/admin/login";
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setActionError(
          payload?.error || "ไม่สามารถอัปเดตสถานะ feedback ได้",
        );
        return;
      }

      setData((current) =>
        current
          ? {
              ...current,
              feedbacks: current.feedbacks.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      status: status as Exclude<FeedbackStatus, "ALL">,
                      resolvedAt:
                        status === "RESOLVED" ? new Date().toISOString() : null,
                    }
                  : item,
              ),
              summary: {
                ALL: current.summary.ALL,
                PENDING: current.feedbacks.filter((item) =>
                  item.id === id ? status === "PENDING" : item.status === "PENDING",
                ).length,
                IN_PROGRESS: current.feedbacks.filter((item) =>
                  item.id === id
                    ? status === "IN_PROGRESS"
                    : item.status === "IN_PROGRESS",
                ).length,
                RESOLVED: current.feedbacks.filter((item) =>
                  item.id === id ? status === "RESOLVED" : item.status === "RESOLVED",
                ).length,
                REJECTED: current.feedbacks.filter((item) =>
                  item.id === id ? status === "REJECTED" : item.status === "REJECTED",
                ).length,
              },
            }
          : current,
      );
      setNotice("อัปเดตสถานะ feedback แล้ว");
    } catch {
      setActionError("ไม่สามารถเชื่อมต่อเพื่ออัปเดตสถานะ feedback ได้");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ต้องการลบ feedback นี้ใช่ไหม")) return;

    try {
      setBusyId(id);
      setNotice("");
      setActionError("");

      const response = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setActionError(payload?.error || "ไม่สามารถลบ feedback ได้");
        return;
      }

      setData((current) =>
        current
          ? {
              ...current,
              feedbacks: current.feedbacks.filter((item) => item.id !== id),
              summary: {
                ALL: Math.max(0, current.summary.ALL - 1),
                PENDING: current.feedbacks.filter(
                  (item) => item.id !== id && item.status === "PENDING",
                ).length,
                IN_PROGRESS: current.feedbacks.filter(
                  (item) => item.id !== id && item.status === "IN_PROGRESS",
                ).length,
                RESOLVED: current.feedbacks.filter(
                  (item) => item.id !== id && item.status === "RESOLVED",
                ).length,
                REJECTED: current.feedbacks.filter(
                  (item) => item.id !== id && item.status === "REJECTED",
                ).length,
              },
            }
          : current,
      );
      setExpandedId((current) => (current === id ? null : current));
      setNotice("ลบ feedback สำเร็จ");
    } catch {
      setActionError("ไม่สามารถเชื่อมต่อเพื่อลบ feedback ได้");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="Feedback"
      description="ดู queue ของบัคและฟีเจอร์รีเควสต์ในหน้าจัดการเดียว พร้อม mask ข้อมูลติดต่อไว้โดยค่าเริ่มต้น"
      actions={
        <>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            รีเฟรช
          </button>
          <AdminGoogleSheetsExportButton
            dataset="feedback"
            label="Export Feedback"
          />
        </>
      }
    >
      {error ? (
        <GlassPanel variant="red" className="p-5 text-neon-red">
          {error}
        </GlassPanel>
      ) : null}
      {actionError ? (
        <GlassPanel variant="red" className="p-5 text-neon-red">
          {actionError}
        </GlassPanel>
      ) : null}
      {notice ? (
        <GlassPanel variant="green" className="p-5 text-neon-green">
          {notice}
        </GlassPanel>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="ทั้งหมด"
          value={loading ? "..." : summary.ALL}
          icon="inbox"
          tone="primary"
        />
        <AdminStatCard
          label="รอดำเนินการ"
          value={loading ? "..." : summary.PENDING}
          icon="pending_actions"
          tone="yellow"
        />
        <AdminStatCard
          label="กำลังดำเนินการ"
          value={loading ? "..." : summary.IN_PROGRESS}
          icon="progress_activity"
          tone="blue"
        />
        <AdminStatCard
          label="แก้ไขแล้ว"
          value={loading ? "..." : summary.RESOLVED}
          icon="task_alt"
          tone="green"
        />
        <AdminStatCard
          label="ปฏิเสธ"
          value={loading ? "..." : summary.REJECTED}
          icon="block"
          tone="red"
        />
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              Queue
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              จัดการ feedback แบบละเอียด
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ["ALL", `ทั้งหมด (${summary.ALL})`],
              ["PENDING", `รอดำเนินการ (${summary.PENDING})`],
              ["IN_PROGRESS", `กำลังดำเนินการ (${summary.IN_PROGRESS})`],
              ["RESOLVED", `แก้ไขแล้ว (${summary.RESOLVED})`],
              ["REJECTED", `ปฏิเสธ (${summary.REJECTED})`],
            ] as Array<[FeedbackStatus, string]>).map(([status, label]) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  activeFilter === status
                    ? "bg-primary text-white shadow-neon-purple"
                    : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl bg-white/5"
                />
              ))
            : filteredFeedbacks.map((feedback) => {
                const typeMeta = getFeedbackTypeMeta(feedback.type);
                const expanded = expandedId === feedback.id;
                const isBusy = busyId === feedback.id;

                return (
                  <div
                    key={feedback.id}
                    className="rounded-2xl border border-white/5 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeMeta.badgeClass}`}
                          >
                            {typeMeta.label}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              feedback.status,
                            )}`}
                          >
                            {feedback.status}
                          </span>
                          <span className="text-xs text-white/30">
                            {formatDateTime(feedback.createdAt)}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white">
                          {feedback.title}
                        </h3>

                        <div className="mt-3 grid gap-2 text-sm text-white/55 md:grid-cols-2">
                          <p>
                            ติดต่อกลับ:{" "}
                            <span className="text-white/75">
                              {feedback.contactMasked ?? "ไม่ระบุ"}
                            </span>
                          </p>
                          <p>
                            รายการ:{" "}
                            <span className="text-white/75">#{feedback.id.slice(0, 8)}</span>
                          </p>
                        </div>

                        {expanded ? (
                          <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-white/75">
                            {feedback.details || "ไม่มีรายละเอียดเพิ่มเติม"}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:w-[280px] lg:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((current) =>
                              current === feedback.id ? null : feedback.id,
                            )
                          }
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                        >
                          {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                        </button>
                        <select
                          value={feedback.status}
                          onChange={(event) =>
                            void handleStatusChange(feedback.id, event.target.value)
                          }
                          disabled={isBusy}
                          className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-white"
                        >
                          <option value="PENDING">รอดำเนินการ</option>
                          <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                          <option value="RESOLVED">แก้ไขแล้ว</option>
                          <option value="REJECTED">ปฏิเสธ</option>
                        </select>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(feedback.id)}
                          className="rounded-full border border-neon-red/20 bg-neon-red/10 px-3 py-2 text-xs font-semibold text-neon-red transition-colors hover:bg-neon-red/20 disabled:opacity-60"
                        >
                          ลบ feedback
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

          {!loading && filteredFeedbacks.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-white/45">
              ไม่มี feedback ในสถานะที่เลือก
            </div>
          ) : null}
        </div>
      </GlassPanel>
    </AdminShell>
  );
}
