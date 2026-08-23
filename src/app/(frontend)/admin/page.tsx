"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AdminGoogleSheetsExportButton } from "@/frontend/components/admin/AdminGoogleSheetsExportButton";
import { AdminShell } from "@/frontend/components/admin/AdminShell";
import { StatusBadge } from "@/frontend/components/admin/StatusBadge";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminTableSkeleton,
} from "@/frontend/components/admin/AdminStates";
import {
  formatAdminDateTime,
  formatAdminNumber,
  formatAdminTime,
} from "@/frontend/admin/format";
import { useAdminRouteData } from "@/frontend/hooks/useAdminRouteData";
import type { AdminOverviewData } from "@/backend/adminData";

import { Icon } from "@/frontend/components/ui/Icon";

const TYPE_LABELS: Record<string, string> = {
  QUESTION: "คำถาม",
  TRUTH: "ความจริง",
  DARE: "ท้า",
  VOTE: "โหวต",
  CHAOS: "โกลาหล",
};

const LEVEL_LABELS = ["", "เบา", "กลาง", "แรง"];

function OverviewMetric({
  label,
  value,
  alert,
  href,
}: {
  label: string;
  value: number;
  alert?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-medium text-white/45">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums ${
          alert ? "text-neon-red" : "text-white"
        }`}
      >
        {formatAdminNumber(value)}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`rounded-xl border px-4 py-3 transition-colors hover:bg-white/[0.04] ${
          alert ? "border-neon-red/25 bg-neon-red/5" : "border-white/8 bg-white/[0.02]"
        }`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        alert ? "border-neon-red/25 bg-neon-red/5" : "border-white/8 bg-white/[0.02]"
      }`}
    >
      {content}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data, loading, error, refresh, lastUpdatedAt } =
    useAdminRouteData<AdminOverviewData>(
      "/api/admin/dashboard",
      "ไม่สามารถโหลดภาพรวมแอดมินได้",
    );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void refresh();
      }
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const summary = data?.summary;
  const attentionCount = (summary?.pendingFeedback ?? 0) + (summary?.activeLockouts ?? 0);

  const matrixByType = new Map<string, Map<number, number>>();
  for (const cell of data?.inventoryMatrix ?? []) {
    let levels = matrixByType.get(cell.type);
    if (!levels) {
      levels = new Map();
      matrixByType.set(cell.type, levels);
    }
    levels.set(cell.level, cell.count);
  }

  const adultByType = new Map<string, number>();
  for (const entry of data?.typeAdultCounts ?? []) {
    adultByType.set(entry.type, entry.count);
  }

  const emptyPools = (data?.questionMix ?? []).filter((item) => item.count === 0);

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="ภาพรวมระบบ"
      description="สุขภาพระบบ ฐานคำถาม และสิ่งที่ต้องเฝ้าระวัง"
      actions={
        <>
          <button
            type="button"
            aria-label="รีเฟรชข้อมูลภาพรวม"
            onClick={() => void refresh()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="refresh" className={`text-base ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
          <span className="hidden text-xs text-white/35 md:inline">
            อัปเดต {formatAdminTime(lastUpdatedAt)}
          </span>
          <AdminGoogleSheetsExportButton dataset="overview" label="ส่งออกภาพรวม" />
          <AdminGoogleSheetsExportButton
            dataset="all"
            label="ส่งออกทั้งหมด"
            icon="backup_table"
            variant="primary"
          />
        </>
      }
    >
      {error ? <div className="mb-4"><AdminErrorState message={error} /></div> : null}

      {/* Key metrics */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <OverviewMetric label="คำถามที่ใช้งานได้" value={loading ? 0 : summary?.totalQuestions ?? 0} />
        <OverviewMetric label="วงที่ยังเปิดอยู่" value={loading ? 0 : summary?.activeRooms ?? 0} />
        <OverviewMetric
          label="ผู้ใช้ทั้งหมด"
          value={loading ? 0 : summary?.totalUsers ?? 0}
          href="/admin/users"
        />
        <OverviewMetric
          label="ต้องเฝ้าระวัง"
          value={attentionCount}
          alert={attentionCount > 0}
          href="/admin/security"
        />
        {!loading && attentionCount > 0 ? (
          <p className="col-span-2 text-xs text-white/40 md:col-span-4">
            ประกอบด้วย feedback รอดำเนินการ{" "}
            <Link href="/admin/feedback" className="font-semibold text-primary hover:text-white">
              {formatAdminNumber(summary?.pendingFeedback ?? 0)} รายการ
            </Link>{" "}
            และ lockout ที่ยังมีผล{" "}
            <Link href="/admin/security" className="font-semibold text-primary hover:text-white">
              {formatAdminNumber(summary?.activeLockouts ?? 0)} บัญชี
            </Link>
          </p>
        ) : null}
      </section>

      {/* Question inventory health */}
      <section className="mb-6 rounded-xl border border-white/8 bg-white/[0.02]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-white">คลังคำถาม</h2>
            <p className="mt-0.5 text-xs text-white/35">
              นับเฉพาะคำถามที่เปิดใช้งาน — เซลล์ “0” หมายถึงชุดค่าผสมนั้นว่างและจะเริ่มวนซ้ำทันที
            </p>
          </div>
          <Link
            href="/admin/questions"
            className="text-xs font-semibold text-primary transition-colors hover:text-white"
          >
            จัดการคำถาม
          </Link>
        </header>

        {loading ? (
          <div className="p-4">
            <AdminTableSkeleton rows={5} />
          </div>
        ) : !data || data.questionMix.length === 0 ? (
          <AdminEmptyState icon="quiz" title="ยังไม่มีคำถามที่เปิดใช้งาน" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/40">รูปแบบ</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-white/40">รวม</th>
                  {LEVEL_LABELS.slice(1).map((level) => (
                    <th key={level} scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-white/40">
                      {level}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-white/40">18+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.questionMix.map((item) => {
                  const levels = matrixByType.get(item.type);
                  const adultCount = adultByType.get(item.type) ?? 0;
                  const isEmpty = item.count === 0;
                  return (
                    <tr key={item.type} className={isEmpty ? "bg-neon-red/5" : undefined}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-white/85">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${isEmpty ? "text-neon-red" : "text-white"}`}>
                        {formatAdminNumber(item.count)}
                      </td>
                      {[1, 2, 3].map((level) => {
                        const count = levels?.get(level) ?? 0;
                        return (
                          <td
                            key={level}
                            className={`px-3 py-2.5 text-right tabular-nums ${
                              count === 0 ? "font-bold text-neon-red" : "text-white/65"
                            }`}
                          >
                            {count === 0 ? "0" : formatAdminNumber(count)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/50">
                        {adultCount > 0 ? formatAdminNumber(adultCount) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && emptyPools.length > 0 ? (
          <footer className="flex items-center gap-2 border-t border-white/5 px-4 py-2.5 text-xs text-neon-red">
            <Icon name="warning" className="text-sm" />
            คลังว่าง: {emptyPools.map((item) => TYPE_LABELS[item.type] ?? item.type).join(", ")}
          </footer>
        ) : null}
      </section>

      {/* Recent activity + feedback queue */}
      <section className="grid items-start gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.02]">
          <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
            <h2 className="text-sm font-bold text-white">กิจกรรมล่าสุด</h2>
            <Link
              href="/admin/security"
              className="text-xs font-semibold text-primary transition-colors hover:text-white"
            >
              เปิดหน้าความปลอดภัย
            </Link>
          </header>
          {loading ? (
            <div className="p-4"><AdminTableSkeleton rows={5} /></div>
          ) : (data?.recentAudit.length ?? 0) === 0 ? (
            <AdminEmptyState icon="history" title="ยังไม่มีกิจกรรมของผู้ดูแล" />
          ) : (
            <ul className="divide-y divide-white/5">
              {data?.recentAudit.slice(0, 6).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                  <span className="w-32 shrink-0 text-xs tabular-nums text-white/35">
                    {formatAdminDateTime(item.createdAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-white/80">{item.action}</span>
                  <StatusBadge tone={item.status === "SUCCESS" ? "green" : "red"}>
                    {item.status === "SUCCESS" ? "สำเร็จ" : "ไม่สำเร็จ"}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.02]">
          <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
            <h2 className="text-sm font-bold text-white">Feedback ล่าสุด</h2>
            <Link
              href="/admin/feedback"
              className="text-xs font-semibold text-primary transition-colors hover:text-white"
            >
              เปิดหน้าจัดการ
            </Link>
          </header>
          {loading ? (
            <div className="p-4"><AdminTableSkeleton rows={5} /></div>
          ) : (data?.recentFeedback.length ?? 0) === 0 ? (
            <AdminEmptyState icon="chat_bubble" title="ยังไม่มีข้อเสนอแนะ" />
          ) : (
            <ul className="divide-y divide-white/5">
              {data?.recentFeedback.slice(0, 6).map((feedback) => (
                <li key={feedback.id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusBadge tone={feedback.type === "BUG" ? "red" : "yellow"}>
                      {feedback.type === "BUG" ? "บัค" : "ฟีเจอร์"}
                    </StatusBadge>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                      {feedback.title}
                    </span>
                    <span className="text-xs text-white/30">
                      {formatAdminDateTime(feedback.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
