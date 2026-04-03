"use client";

import { AdminGoogleSheetsExportButton } from "@/components/admin/AdminGoogleSheetsExportButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassPanel } from "@/components/ui";
import { useAdminRouteData } from "@/hooks/useAdminRouteData";
import type { AdminUsersData } from "@/lib/adminData";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

export default function AdminUsersPage() {
  const { data, loading, error, refresh } = useAdminRouteData<AdminUsersData>(
    "/api/admin/users",
    "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
  );

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="ผู้ใช้"
      description="ดูภาพรวมของบัญชีผู้ใช้, วิธีล็อกอิน, การยืนยันตัวตน และพฤติกรรมใช้งานล่าสุด โดยไม่เปิดเผยอีเมลดิบเกินจำเป็น"
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
            dataset="users"
            label="Export Users"
          />
        </>
      }
    >
      {error ? (
        <GlassPanel variant="red" className="p-5 text-neon-red">
          {error}
        </GlassPanel>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          label="ผู้ใช้ทั้งหมด"
          value={loading ? "..." : data?.summary.totalUsers ?? 0}
          description="ฐานผู้ใช้ที่มีบัญชีในระบบตอนนี้"
          icon="group"
          tone="blue"
        />
        <AdminStatCard
          label="ยืนยันตัวแล้ว"
          value={loading ? "..." : data?.summary.verifiedUsers ?? 0}
          description="ผ่านการยืนยันอีเมลหรือถูก mark ว่า verified แล้ว"
          icon="verified_user"
          tone="green"
        />
        <AdminStatCard
          label="เชื่อม Google"
          value={loading ? "..." : data?.summary.googleLinkedUsers ?? 0}
          description="นับบัญชีที่มี provider Google ผูกอยู่"
          icon="link"
          tone="primary"
        />
        <AdminStatCard
          label="ล็อกอิน 7 วัน"
          value={loading ? "..." : data?.summary.recentLogins7d ?? 0}
          description="ใช้วัด active base ช่วงสัปดาห์ล่าสุด"
          icon="schedule"
          tone="yellow"
        />
        <AdminStatCard
          label="Session ที่ยัง active"
          value={loading ? "..." : data?.summary.activeSessions ?? 0}
          description="รวม legacy session และ NextAuth session ที่ยังไม่หมดอายุ"
          icon="key"
          tone="green"
        />
        <AdminStatCard
          label="Game Sessions"
          value={loading ? "..." : data?.summary.totalGameSessions ?? 0}
          description="ใช้ดูการเชื่อมโยงบัญชีกับประวัติการเล่น"
          icon="sports_esports"
          tone="primary"
        />
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Users Directory
          </p>
          <h2 className="text-2xl font-black text-white">
            ผู้ใช้ล่าสุดและบัญชีที่เคลื่อนไหวมากสุด
          </h2>
          <p className="text-sm text-white/45">
            อีเมลและข้อมูลติดต่อถูก mask โดยค่าเริ่มต้นเพื่อจำกัดการเข้าถึง PII
            ในระดับ UI
          </p>
        </div>

        <div className="space-y-3">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-white/5"
                />
              ))
            : data?.users.map((user) => (
                <div
                  key={user.id}
                  className="grid gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 lg:grid-cols-[1.2fr_0.9fr_0.7fr_0.6fr]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-lg font-black text-primary">
                        {user.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-white">
                          {user.name}
                        </p>
                        <p className="truncate text-sm text-white/45">
                          {user.maskedEmail}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                        {user.authMethod}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isVerified
                            ? "bg-neon-green/15 text-neon-green"
                            : "bg-white/10 text-white/55"
                        }`}
                      >
                        {user.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                      Last Login
                    </p>
                    <p className="mt-2 text-sm text-white/75">
                      {formatDateTime(user.lastLoginAt)}
                    </p>
                    <p className="mt-2 text-xs text-white/35">
                      Created {formatDateTime(user.createdAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:block">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                        Sessions
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {user.sessions}
                      </p>
                    </div>
                    <div className="lg:mt-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                        Games
                      </p>
                      <p className="mt-2 text-2xl font-black text-primary">
                        {user.gamesPlayed}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between lg:flex-col lg:items-end">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                      User ID
                    </p>
                    <p className="mt-2 rounded-full bg-black/30 px-3 py-1 text-xs text-white/45">
                      {user.id.slice(0, 10)}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </GlassPanel>
    </AdminShell>
  );
}
