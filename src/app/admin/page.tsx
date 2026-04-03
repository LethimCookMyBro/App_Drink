"use client";

import Link from "next/link";
import { AdminGoogleSheetsExportButton } from "@/components/admin/AdminGoogleSheetsExportButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassPanel } from "@/components/ui";
import { useAdminRouteData } from "@/hooks/useAdminRouteData";
import type { AdminOverviewData } from "@/lib/adminData";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

function getQuestionTone(type: string): "primary" | "blue" | "green" | "red" | "yellow" {
  switch (type) {
    case "TRUTH":
      return "blue";
    case "DARE":
      return "green";
    case "CHAOS":
      return "red";
    case "VOTE":
      return "yellow";
    default:
      return "primary";
  }
}

export default function AdminOverviewPage() {
  const { data, loading, error, refresh } = useAdminRouteData<AdminOverviewData>(
    "/api/admin/dashboard",
    "ไม่สามารถโหลดภาพรวมแอดมินได้",
  );

  return (
    <AdminShell
      admin={data?.admin ?? null}
      title="ภาพรวมระบบ"
      description="ศูนย์กลางสำหรับติดตามสุขภาพของเกม, ผู้เล่น, คำถาม, feedback และกิจกรรมของผู้ดูแลระบบ"
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
            dataset="overview"
            label="Export Overview"
          />
          <AdminGoogleSheetsExportButton
            dataset="all"
            label="Export All"
            icon="backup_table"
            variant="primary"
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
          label="คำถามที่ใช้งานได้"
          value={loading ? "..." : data?.summary.totalQuestions ?? 0}
          description="ฐานคำถามทั้งหมดที่เปิดใช้งานอยู่ตอนนี้"
          icon="quiz"
          tone="primary"
        />
        <AdminStatCard
          label="ผู้ใช้ทั้งหมด"
          value={loading ? "..." : data?.summary.totalUsers ?? 0}
          description="นับเฉพาะบัญชีผู้เล่น ไม่รวมผู้ดูแลระบบ"
          icon="group"
          tone="blue"
        />
        <AdminStatCard
          label="Feedback ค้างอยู่"
          value={loading ? "..." : data?.summary.pendingFeedback ?? 0}
          description="รายการที่ยังไม่ถูกดำเนินการหรือปิดงาน"
          icon="chat_bubble"
          tone="yellow"
        />
        <AdminStatCard
          label="วงที่ยัง active"
          value={loading ? "..." : data?.summary.activeRooms ?? 0}
          description="ห้องที่ยังเปิดใช้งานอยู่ในระบบ"
          icon="groups"
          tone="green"
        />
        <AdminStatCard
          label="ผู้ใช้ยืนยันตัวแล้ว"
          value={loading ? "..." : data?.summary.verifiedUsers ?? 0}
          description="วัดความพร้อมของฐานผู้ใช้สำหรับฟีเจอร์บัญชี"
          icon="verified_user"
          tone="blue"
        />
        <AdminStatCard
          label="Lockout ที่ยัง active"
          value={loading ? "..." : data?.summary.activeLockouts ?? 0}
          description="สัญญาณความเสี่ยงฝั่งแอดมินที่ยังค้างอยู่"
          icon="lock_person"
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                Recent Users
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                ผู้ใช้ที่เพิ่งเข้ามาใช้งาน
              </h2>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              ดูทั้งหมด
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-white/5"
                  />
                ))
              : data?.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:grid-cols-[1.4fr_0.8fr_0.7fr]"
                  >
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-white">{user.name}</p>
                      <p className="text-sm text-white/45">{user.maskedEmail}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                          {user.isVerified ? "Verified" : "ยังไม่ยืนยัน"}
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
                      <p className="mt-1 text-xs text-white/35">
                        สมัครเมื่อ {formatDateTime(user.createdAt)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:block">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                          Sessions
                        </p>
                        <p className="mt-2 text-xl font-bold text-white">
                          {user.sessions}
                        </p>
                      </div>
                      <div className="md:mt-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                          Games
                        </p>
                        <p className="mt-2 text-xl font-bold text-primary">
                          {user.gamesPlayed}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </GlassPanel>

        <div className="grid gap-6">
          <GlassPanel className="p-5 md:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                Question Mix
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                ภาพรวมประเภทคำถาม
              </h2>
            </div>

            <div className="space-y-3">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 animate-pulse rounded-2xl bg-white/5"
                    />
                  ))
                : data?.questionMix.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.label}
                        </p>
                        <p className="text-xs text-white/35">{item.type}</p>
                      </div>
                      <p
                        className={`text-2xl font-black ${
                          getQuestionTone(item.type) === "blue"
                            ? "text-neon-blue"
                            : getQuestionTone(item.type) === "green"
                              ? "text-neon-green"
                              : getQuestionTone(item.type) === "red"
                                ? "text-neon-red"
                                : getQuestionTone(item.type) === "yellow"
                                  ? "text-neon-yellow"
                                  : "text-primary"
                        }`}
                      >
                        {item.count}
                      </p>
                    </div>
                  ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-2xl bg-white/5"
                    />
                  ))
                : data?.levelMix.map((item) => (
                    <div
                      key={item.level}
                      className="rounded-2xl border border-white/5 bg-black/20 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-black text-white">
                        {item.count}
                      </p>
                    </div>
                  ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                  Top Questions
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  คำถามที่ถูกใช้บ่อย
                </h2>
              </div>
              <Link
                href="/admin/questions"
                className="text-sm font-semibold text-primary transition-colors hover:text-white"
              >
                จัดการคำถาม
              </Link>
            </div>

            <div className="space-y-3">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-2xl bg-white/5"
                    />
                  ))
                : data?.topQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-2xl border border-white/5 bg-white/5 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            question.type === "TRUTH"
                              ? "bg-neon-blue/15 text-neon-blue"
                              : question.type === "DARE"
                                ? "bg-neon-green/15 text-neon-green"
                                : question.type === "CHAOS"
                                  ? "bg-neon-red/15 text-neon-red"
                                  : question.type === "VOTE"
                                    ? "bg-neon-yellow/15 text-neon-yellow"
                                    : "bg-primary/15 text-primary"
                          }`}
                        >
                          {question.type}
                        </span>
                        <span className="text-xs text-white/35">
                          ใช้ไป {question.usageCount} ครั้ง
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {question.text}
                      </p>
                    </div>
                  ))}
            </div>
          </GlassPanel>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                Feedback Queue
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                feedback ล่าสุด
              </h2>
            </div>
            <Link
              href="/admin/feedback"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-white"
            >
              เปิดหน้าจัดการ
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-2xl bg-white/5"
                  />
                ))
              : data?.recentFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="rounded-2xl border border-white/5 bg-white/5 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          feedback.type === "BUG"
                            ? "bg-neon-red/15 text-neon-red"
                            : "bg-neon-yellow/15 text-neon-yellow"
                        }`}
                      >
                        {feedback.type === "BUG" ? "บัค" : "ฟีเจอร์"}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/65">
                        {feedback.status}
                      </span>
                      <span className="text-xs text-white/30">
                        {formatDateTime(feedback.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {feedback.title}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      ติดต่อกลับ: {feedback.contactMasked ?? "ไม่ระบุ"}
                    </p>
                  </div>
                ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                Audit Stream
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                ความเคลื่อนไหวล่าสุดของแอดมิน
              </h2>
            </div>
            <Link
              href="/admin/security"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-white"
            >
              เปิด Security
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-white/5"
                  />
                ))
              : data?.recentAudit.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {item.action}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {item.adminName} • {item.userAgent}
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        IP {item.ipMasked ?? "-"}
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
      </section>
    </AdminShell>
  );
}
