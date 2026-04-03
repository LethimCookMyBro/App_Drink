"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassPanel } from "@/components/ui";
import { useAdminRouteData } from "@/hooks/useAdminRouteData";
import type { AdminSecurityData } from "@/lib/adminData";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

export default function AdminSecurityPage() {
  const { data, loading, error, refresh } = useAdminRouteData<AdminSecurityData>(
    "/api/admin/security",
    "ไม่สามารถโหลดข้อมูลความปลอดภัยได้",
  );

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="Security"
      description="ติดตามสถานะ lockout, ความเคลื่อนไหวของแอดมิน, และ posture หลักของระบบโดยไม่เปิดเผยข้อมูลดิบเกินจำเป็น"
      actions={
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          รีเฟรช
        </button>
      }
    >
      {error ? (
        <GlassPanel variant="red" className="p-5 text-neon-red">
          {error}
        </GlassPanel>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Failed Logins / 24h"
          value={loading ? "..." : data?.metrics.failedLogins24h ?? 0}
          icon="dangerous"
          tone="red"
        />
        <AdminStatCard
          label="Successful Logins / 24h"
          value={loading ? "..." : data?.metrics.successfulLogins24h ?? 0}
          icon="login"
          tone="green"
        />
        <AdminStatCard
          label="Audit Events / 24h"
          value={loading ? "..." : data?.metrics.auditEvents24h ?? 0}
          icon="monitoring"
          tone="blue"
        />
        <AdminStatCard
          label="Question Writes / 24h"
          value={loading ? "..." : data?.metrics.questionWrites24h ?? 0}
          icon="edit_note"
          tone="yellow"
        />
        <AdminStatCard
          label="Lockouts Active"
          value={loading ? "..." : data?.metrics.activeLockouts ?? 0}
          icon="lock_person"
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              Posture
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              สถานะ config และ hardening
            </h2>
          </div>

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-white/5"
                  />
                ))
              : data?.posture.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>
                    </div>
                    <span
                      className={`max-w-[55%] text-right text-sm font-semibold ${
                        item.tone === "good"
                          ? "text-neon-green"
                          : item.tone === "warn"
                            ? "text-neon-yellow"
                            : "text-white/70"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              Lockouts
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              รายการ lockout ที่ยังมีผลหรือเพิ่งมีความพยายามผิดซ้ำ
            </h2>
          </div>

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-2xl bg-white/5"
                  />
                ))
              : data?.activeLockouts.length ? (
                  data.activeLockouts.map((item, index) => (
                    <div
                      key={`${item.identifierMasked}-${index}`}
                      className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:grid-cols-[1.1fr_0.7fr_0.8fr]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.identifierMasked ?? "ไม่ระบุ"}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          IP ล่าสุด {item.lastIpMasked ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                          Failed Attempts
                        </p>
                        <p className="mt-2 text-2xl font-black text-neon-red">
                          {item.failedAttempts}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                          Locked Until
                        </p>
                        <p className="mt-2 text-sm text-white/75">
                          {formatDateTime(item.lockedUntil)}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          พยายามล่าสุด {formatDateTime(item.lastAttemptAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-white/45">
                    ตอนนี้ยังไม่มี lockout ที่ active อยู่
                  </div>
                )}
          </div>
        </GlassPanel>
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Audit Trail
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            ความเคลื่อนไหวล่าสุดของผู้ดูแลระบบ
          </h2>
        </div>

        <div className="space-y-3">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-white/5"
                />
              ))
            : data?.recentAudit.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:grid-cols-[1fr_0.9fr_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.action}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {item.adminName} • {item.userAgent}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                      IP
                    </p>
                    <p className="mt-2 text-sm text-white/75">
                      {item.ipMasked ?? "-"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:block md:text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === "SUCCESS"
                          ? "bg-neon-green/15 text-neon-green"
                          : "bg-neon-red/15 text-neon-red"
                      }`}
                    >
                      {item.status}
                    </span>
                    <p className="mt-2 text-xs text-white/35">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </GlassPanel>
    </AdminShell>
  );
}
