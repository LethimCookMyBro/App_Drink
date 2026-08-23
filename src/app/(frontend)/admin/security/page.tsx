"use client";

import { useState } from "react";
import { AdminGoogleSheetsExportButton } from "@/frontend/components/admin/AdminGoogleSheetsExportButton";
import { AdminShell } from "@/frontend/components/admin/AdminShell";
import { AdminStatCard } from "@/frontend/components/admin/AdminStatCard";
import { GlassPanel } from "@/frontend/components/ui";
import {
  formatAdminDateTime,
  formatAdminNumber,
} from "@/frontend/admin/format";
import { useAdminRouteData } from "@/frontend/hooks/useAdminRouteData";
import type { AdminSecurityData } from "@/backend/adminData";

import { Icon } from "@/frontend/components/ui/Icon";

type ServerLogItem = AdminSecurityData["recentServerLogs"][number] & {
  context?: string | null;
};

function getServerLogContext(item: ServerLogItem): string | null {
  return item.context ?? item.contextPreview ?? null;
}

export default function AdminSecurityPage() {
  const { data, loading, error, refresh } = useAdminRouteData<AdminSecurityData>(
    "/api/admin/security",
    "ไม่สามารถโหลดข้อมูลความปลอดภัยได้",
  );
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [visibleServerLogCount, setVisibleServerLogCount] = useState(20);
  const visibleServerLogs =
    data?.recentServerLogs.slice(0, visibleServerLogCount) ?? [];

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="ความปลอดภัย"
      description="ติดตามสถานะ lockout, ความเคลื่อนไหวของแอดมิน, และ posture หลักของระบบโดยไม่เปิดเผยข้อมูลดิบเกินจำเป็น"
      actions={
        <>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <Icon name="refresh" className="text-lg" />
            รีเฟรช
          </button>
          <AdminGoogleSheetsExportButton
            dataset="security"
            label="ส่งออกความปลอดภัย"
          />
          <AdminGoogleSheetsExportButton
            dataset="audit_logs"
            label="ส่งออกกิจกรรม"
            icon="history"
          />
          <AdminGoogleSheetsExportButton
            dataset="server_logs"
            label="ส่งออกบันทึกเซิร์ฟเวอร์"
            icon="dns"
          />
        </>
      }
    >
      {error ? (
        <GlassPanel variant="red" className="p-5 text-neon-red">
          {error}
        </GlassPanel>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="เข้าสู่ระบบไม่สำเร็จ / 24 ชม."
          value={loading ? "..." : data?.metrics.failedLogins24h ?? 0}
          icon="dangerous"
          tone="red"
        />
        <AdminStatCard
          label="เข้าสู่ระบบสำเร็จ / 24 ชม."
          value={loading ? "..." : data?.metrics.successfulLogins24h ?? 0}
          icon="login"
          tone="green"
        />
        <AdminStatCard
          label="กิจกรรมแอดมิน / 24 ชม."
          value={loading ? "..." : data?.metrics.auditEvents24h ?? 0}
          icon="monitoring"
          tone="blue"
        />
        <AdminStatCard
          label="แก้ไขคำถาม / 24 ชม."
          value={loading ? "..." : data?.metrics.questionWrites24h ?? 0}
          icon="edit_note"
          tone="yellow"
        />
        <AdminStatCard
          label="บัญชีที่ถูกล็อก"
          value={loading ? "..." : data?.metrics.activeLockouts ?? 0}
          icon="lock_person"
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              สถานะระบบ
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
              การล็อกบัญชี
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
                          พยายามไม่สำเร็จ
                        </p>
                        <p className="mt-2 text-2xl font-black text-neon-red">
                          {formatAdminNumber(item.failedAttempts)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                          ล็อกถึง
                        </p>
                        <p className="mt-2 text-sm text-white/75">
                          {formatAdminDateTime(item.lockedUntil)}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          พยายามล่าสุด {formatAdminDateTime(item.lastAttemptAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-white/45">
                    ตอนนี้ยังไม่มีบัญชีที่ถูกล็อกอยู่
                  </div>
                )}
          </div>
        </GlassPanel>
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            ประวัติกิจกรรม
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
                      {formatAdminDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            บันทึกเซิร์ฟเวอร์
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            บันทึกล่าสุดจากฝั่งเซิร์ฟเวอร์
          </h2>
        </div>

        <div className="space-y-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-white/5"
                />
              ))
            : visibleServerLogs.length ? (
                visibleServerLogs.map((item) => {
                  const fullContext = getServerLogContext(item);
                  const expanded = expandedLogIds.has(item.id);

                  return (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:grid-cols-[auto_1fr_auto]"
                  >
                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.level === "ERROR"
                            ? "bg-neon-red/15 text-neon-red"
                            : item.level === "WARN"
                              ? "bg-neon-yellow/15 text-neon-yellow"
                              : "bg-neon-blue/15 text-neon-blue"
                        }`}
                      >
                        {item.level}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {item.message}
                      </p>
                      <p className="mt-1 break-words text-xs text-white/40">
                        {expanded
                          ? fullContext || "ไม่มี context เพิ่มเติม"
                          : item.contextPreview || "ไม่มี context เพิ่มเติม"}
                      </p>
                      {fullContext && fullContext.length >= 140 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLogIds((current) => {
                              const next = new Set(current);
                              if (next.has(item.id)) {
                                next.delete(item.id);
                              } else {
                                next.add(item.id);
                              }
                              return next;
                            })
                          }
                          className="mt-2 text-xs font-semibold text-primary transition-colors hover:text-white"
                        >
                          {expanded ? "ย่อข้อมูล" : "ดูเพิ่มเติม"}
                        </button>
                      ) : null}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs text-white/35">
                        {formatAdminDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-white/45">
                  ยังไม่มี server log ที่บันทึกไว้ในระบบ
                </div>
              )}
        </div>
        {!loading && data && data.recentServerLogs.length > visibleServerLogCount ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleServerLogCount((count) => count + 20)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              โหลดเพิ่มเติม
            </button>
          </div>
        ) : null}
      </GlassPanel>
    </AdminShell>
  );
}
