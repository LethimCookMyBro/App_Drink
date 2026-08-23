"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AdminGoogleSheetsExportButton } from "@/frontend/components/admin/AdminGoogleSheetsExportButton";
import { AdminDrawer } from "@/frontend/components/admin/AdminDrawer";
import { AdminShell } from "@/frontend/components/admin/AdminShell";
import { AdminSearchInput, useDebouncedValue } from "@/frontend/components/admin/AdminSearchInput";
import { RowActionsMenu } from "@/frontend/components/admin/RowActionsMenu";
import { StatusBadge } from "@/frontend/components/admin/StatusBadge";
import { AdminTable } from "@/frontend/components/admin/AdminTable";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminTableSkeleton,
} from "@/frontend/components/admin/AdminStates";
import { formatAdminDateTime, formatAdminNumber } from "@/frontend/admin/format";
import type { AdminIdentity, AdminUserItem, AdminUsersData } from "@/backend/adminData";

import { Icon } from "@/frontend/components/ui/Icon";

const USERS_PER_PAGE = 50;

function UserAvatar({ user }: { user: Pick<AdminUserItem, "name" | "avatarUrl"> }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
    >
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminIdentity | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminUsersData["summary"] | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [page, setPage] = useState(1);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        const payload = await res.json();
        if (!payload.authenticated) {
          router.push("/admin/login");
          return;
        }
        setAdminUser(payload.admin ?? null);
      } catch {
        router.push("/admin/login");
      }
    };
    void checkAuth();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      params.set("limit", String(USERS_PER_PAGE));
      params.set("offset", String((page - 1) * USERS_PER_PAGE));

      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      if (requestId !== requestIdRef.current) return;

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const payload = await res.json().catch(() => null);
      if (requestId !== requestIdRef.current) return;

      if (res.ok && Array.isArray(payload?.users)) {
        setUsers(payload.users);
        setTotalUsers(
          typeof payload.total === "number" ? payload.total : payload.users.length,
        );
        if (payload.admin) setAdminUser(payload.admin);
        if (payload.summary) setSummary(payload.summary);
        setListError(null);
      } else {
        setUsers([]);
        setTotalUsers(0);
        setListError(payload?.error || "ไม่สามารถโหลดรายชื่อผู้ใช้ได้");
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setUsers([]);
      setTotalUsers(0);
      setListError("ไม่สามารถเชื่อมต่อ API เพื่อโหลดผู้ใช้ได้");
    } finally {
      if (requestId === requestIdRef.current) {
        setListLoading(false);
      }
    }
  }, [debouncedSearch, page, router]);

  useEffect(() => {
    const fetchId = window.setTimeout(() => {
      void fetchUsers();
    }, 0);

    return () => window.clearTimeout(fetchId);
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = totalUsers === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
  const rangeEnd = Math.min(totalUsers, currentPage * USERS_PER_PAGE);
  // summary is now local state

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
      admin={adminUser}
      title="ผู้ใช้"
      description={
        totalUsers > 0
          ? `พบ ${formatAdminNumber(totalUsers)} บัญชี • แสดง ${formatAdminNumber(rangeStart)}–${formatAdminNumber(rangeEnd)} • อีเมลถูกปิดบังโดยค่าเริ่มต้น`
          : "บัญชีผู้เล่นทั้งหมด — อีเมลถูกปิดบังโดยค่าเริ่มต้น"
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              void fetchUsers();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="refresh" className={`text-base ${listLoading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
          <AdminGoogleSheetsExportButton dataset="users" label="ส่งออก" />
        </>
      }
    >
      {listError ? (
        <div className="mb-4">
          <AdminErrorState message={listError} />
        </div>
      ) : null}

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "ผู้ใช้ทั้งหมด", value: summary?.totalUsers ?? 0 },
          { label: "ยืนยันแล้ว", value: summary?.verifiedUsers ?? 0 },
          { label: "เชื่อม Google", value: summary?.googleLinkedUsers ?? 0 },
          { label: "ล็อกอินใน 7 วัน", value: summary?.recentLogins7d ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-xs font-medium text-white/45">{stat.label}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">
              {listLoading ? "-" : formatAdminNumber(stat.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <AdminSearchInput
          id="user-search"
          label="ค้นหาผู้ใช้จากทั้งฐานข้อมูล"
          value={searchInput}
          onChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
          placeholder="ค้นหาจากชื่อหรืออีเมล..."
        />

        {listLoading ? (
          <AdminTableSkeleton rows={8} />
        ) : users.length === 0 && !listError ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02]">
            <AdminEmptyState
              icon="group"
              title={debouncedSearch ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา" : "ยังไม่มีผู้ใช้ในระบบ"}
              description={
                debouncedSearch ? "ลองปรับคำค้นหา หรือล้างการค้นหาเพื่อดูทั้งหมด" : undefined
              }
            />
          </div>
        ) : (
          <>
            <AdminTable
              caption="รายชื่อผู้ใช้"
              minWidth={920}
              headers={[
                { label: "ผู้ใช้", className: "min-w-[200px]" },
                { label: "วิธีเข้าสู่ระบบ" },
                { label: "ยืนยัน" },
                { label: "เข้าสู่ล่าสุด", className: "whitespace-nowrap" },
                { label: "เซสชัน", className: "text-right" },
                { label: "เกม", className: "text-right" },
                { label: "สร้างเมื่อ", className: "whitespace-nowrap" },
                { label: "", className: "w-12" },
              ]}
            >
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white/90">{user.name}</p>
                        <p className="truncate text-xs text-white/40">{user.maskedEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle text-sm text-white/65">
                    {user.authMethod}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge tone={user.isVerified ? "green" : "neutral"} dot>
                      {user.isVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                    </StatusBadge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle text-xs text-white/55">
                    {formatAdminDateTime(user.lastLoginAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle text-sm tabular-nums text-white/70">
                    {formatAdminNumber(user.sessions)}
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle text-sm tabular-nums text-white/70">
                    {formatAdminNumber(user.gamesPlayed)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle text-xs text-white/45">
                    {formatAdminDateTime(user.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <RowActionsMenu
                      label={`การกระทำสำหรับผู้ใช้: ${user.name}`}
                      actions={[
                        { label: "ดูรายละเอียด", icon: "visibility", onSelect: () => setDetailUser(user) },
                        {
                          label: copiedUserId === user.id ? "คัดลอกแล้ว" : "คัดลอกรหัสผู้ใช้",
                          icon: copiedUserId === user.id ? "done" : "content_copy",
                          onSelect: () => void handleCopyUserId(user.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </AdminTable>

            <nav
              aria-label="แบ่งหน้าผู้ใช้"
              className="mt-3 flex items-center justify-between gap-3 text-sm text-white/50"
            >
              <span>
                หน้า {formatAdminNumber(currentPage)} / {formatAdminNumber(totalPages)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1 || listLoading}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  ก่อนหน้า
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage >= totalPages || listLoading}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  ถัดไป
                </button>
              </div>
            </nav>
          </>
        )}
      </section>

      <AdminDrawer
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        title="รายละเอียดผู้ใช้"
      >
        {detailUser ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <UserAvatar user={detailUser} />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">{detailUser.name}</p>
                <p className="truncate text-sm text-white/45">{detailUser.maskedEmail}</p>
              </div>
            </div>

            <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2.5 text-sm">
              <dt className="text-white/40">วิธีเข้าสู่ระบบ</dt>
              <dd className="text-white/80">{detailUser.authMethod}</dd>
              <dt className="text-white/40">การยืนยัน</dt>
              <dd>
                <StatusBadge tone={detailUser.isVerified ? "green" : "neutral"} dot>
                  {detailUser.isVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                </StatusBadge>
              </dd>
              <dt className="text-white/40">สมัครเมื่อ</dt>
              <dd className="text-white/80">{formatAdminDateTime(detailUser.createdAt)}</dd>
              <dt className="text-white/40">เข้าสู่ล่าสุด</dt>
              <dd className="text-white/80">{formatAdminDateTime(detailUser.lastLoginAt)}</dd>
              <dt className="text-white/40">เซสชัน</dt>
              <dd className="tabular-nums text-white/80">{formatAdminNumber(detailUser.sessions)}</dd>
              <dt className="text-white/40">เล่นทั้งหมด</dt>
              <dd className="tabular-nums text-white/80">{formatAdminNumber(detailUser.gamesPlayed)} เกม</dd>
              <dt className="text-white/40">รหัสผู้ใช้</dt>
              <dd className="break-all font-mono text-xs text-white/50">{detailUser.id}</dd>
            </dl>

            <p className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/35">
              ข้อมูลติดต่อถูกปิดบังเพื่อจำกัดการเข้าถึง PII จากหน้าจัดการ
            </p>
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
