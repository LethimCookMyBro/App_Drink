"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGoogleSheetsExportButton } from "@/frontend/components/admin/AdminGoogleSheetsExportButton";
import { AdminShell } from "@/frontend/components/admin/AdminShell";
import { AdminStatCard } from "@/frontend/components/admin/AdminStatCard";
import { GlassPanel } from "@/frontend/components/ui";
import {
  formatAdminDateTime,
  formatAdminNumber,
} from "@/frontend/admin/format";
import { useAdminRouteData } from "@/frontend/hooks/useAdminRouteData";
import type { AdminUsersData } from "@/backend/adminData";

import { Icon } from "@/frontend/components/ui/Icon";

const USERS_PER_PAGE = 20;

export default function AdminUsersPage() {
  const { data, loading, error, refresh } = useAdminRouteData<AdminUsersData>(
    "/api/admin/users",
    "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const filteredUsers = useMemo(() => {
    const users = data?.users ?? [];
    if (!debouncedSearch) return users;

    return users.filter((user) =>
      [user.name, user.maskedEmail].some((value) =>
        value.toLowerCase().includes(debouncedSearch),
      ),
    );
  }, [data?.users, debouncedSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const currentUsersPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (currentUsersPage - 1) * USERS_PER_PAGE,
    currentUsersPage * USERS_PER_PAGE,
  );

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
      setCurrentPage(1);
    }, 300);

    return () => window.clearTimeout(debounceId);
  }, [searchInput]);

  const handleCopyUserId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedUserId(id);
      window.setTimeout(() => setCopiedUserId(null), 1500);
    } catch {
      setCopiedUserId(null);
    }
  };

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
            <Icon name="refresh" className="text-lg" />
            รีเฟรช
          </button>
          <AdminGoogleSheetsExportButton
            dataset="users"
            label="ส่งออกผู้ใช้"
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
          description="ใช้วัดฐานผู้ใช้ที่เข้าใช้งานในช่วงสัปดาห์ล่าสุด"
          icon="schedule"
          tone="yellow"
        />
        <AdminStatCard
          label="เซสชันที่ยังใช้งาน"
          value={loading ? "..." : data?.summary.activeSessions ?? 0}
          description="รวม legacy session และ NextAuth session ที่ยังไม่หมดอายุ"
          icon="key"
          tone="green"
        />
        <AdminStatCard
          label="เซสชันเกม"
          value={loading ? "..." : data?.summary.totalGameSessions ?? 0}
          description="ใช้ดูการเชื่อมโยงบัญชีกับประวัติการเล่น"
          icon="sports_esports"
          tone="primary"
        />
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            รายชื่อผู้ใช้
          </p>
          <h2 className="text-2xl font-black text-white">
            ผู้ใช้ล่าสุดและบัญชีที่เคลื่อนไหวมากสุด
          </h2>
          <p className="text-sm text-white/45">
            อีเมลและข้อมูลติดต่อถูก mask โดยค่าเริ่มต้นเพื่อจำกัดการเข้าถึง PII
            ในระดับ UI
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-white/60" htmlFor="user-search">
            ค้นหาผู้ใช้
          </label>
          <input
            id="user-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ค้นหาจากชื่อหรืออีเมล..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-white/5"
                />
              ))
              : paginatedUsers.map((user) => (
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
                        {user.isVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                      เข้าสู่ระบบล่าสุด
                    </p>
                    <p className="mt-2 text-sm text-white/75">
                      {formatAdminDateTime(user.lastLoginAt)}
                    </p>
                    <p className="mt-2 text-xs text-white/35">
                      สร้างเมื่อ {formatAdminDateTime(user.createdAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:block">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                        เซสชัน
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {formatAdminNumber(user.sessions)}
                      </p>
                    </div>
                    <div className="lg:mt-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                        เกม
                      </p>
                      <p className="mt-2 text-2xl font-black text-primary">
                        {formatAdminNumber(user.gamesPlayed)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between lg:flex-col lg:items-end">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                      รหัสผู้ใช้
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="rounded-full bg-black/30 px-3 py-1 text-xs text-white/45">
                        {user.id.slice(0, 10)}
                      </p>
                      <button
                        type="button"
                        aria-label="คัดลอกรหัสผู้ใช้"
                        onClick={() => void handleCopyUserId(user.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Icon name={copiedUserId === user.id ? "done" : "content_copy"} className="text-base" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
        {!loading && filteredUsers.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-white/45">
            ไม่พบผู้ใช้ที่ตรงกับคำค้นหา
          </div>
        ) : null}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-sm text-white/60 sm:flex-row">
          <span>
            หน้า {formatAdminNumber(currentUsersPage)} / {formatAdminNumber(totalPages)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentUsersPage <= 1 || loading}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentUsersPage >= totalPages || loading}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </GlassPanel>
    </AdminShell>
  );
}
