"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { Button, GlassPanel } from "@/frontend/components/ui";
import type { AdminIdentity } from "@/backend/adminData";
import {
  hasAdminRole,
  type AdminRoleName,
} from "@/shared/adminRoles";

interface AdminShellProps {
  admin: AdminIdentity | null;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "dashboard", minRole: "MODERATOR" },
  { href: "/admin/users", label: "Users", icon: "group", minRole: "ADMIN" },
  { href: "/admin/questions", label: "Questions", icon: "quiz", minRole: "MODERATOR" },
  { href: "/admin/feedback", label: "Feedback", icon: "chat_bubble", minRole: "MODERATOR" },
  { href: "/admin/security", label: "Security", icon: "shield", minRole: "ADMIN" },
] as const;

function canSeeAdminNavItem(
  admin: AdminIdentity | null,
  minimumRole: AdminRoleName,
): boolean {
  return !admin || hasAdminRole(admin.role, minimumRole);
}

function formatAdminMeta(admin: AdminIdentity | null): string {
  if (!admin) return "กำลังโหลดเซสชันผู้ดูแล";
  return `${admin.name} • ${admin.role.replaceAll("_", " ")}`;
}

export function AdminShell({
  admin,
  title,
  description,
  actions,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // no-op: redirect regardless
    } finally {
      router.push("/admin/login");
    }
  };

  return (
    <main className="min-h-screen overflow-y-auto no-scrollbar bg-[#0d0a10] pb-10">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0d0a10]/80 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-900 shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-3xl text-white">
                  admin_panel_settings
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Admin Console
                </p>
                <h1 className="text-2xl font-black text-white md:text-3xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-sm text-white/45 md:text-base">
                  {description}
                </p>
                <p className="text-xs text-white/30">{formatAdminMeta(admin)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {actions}
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">home</span>
                หน้าเกม
              </Link>
              <Button
                variant="outline"
                size="sm"
                icon="logout"
                loading={isLoggingOut}
                onClick={handleLogout}
              >
                ออกจากระบบ
              </Button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {NAV_ITEMS.filter((item) =>
              canSeeAdminNavItem(admin, item.minRole),
            ).map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "border-primary/30 bg-primary text-white shadow-neon-purple"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <GlassPanel className="border-primary/10 bg-primary/5 p-4 text-sm text-white/65 md:p-5">
          แดชบอร์ดชุดนี้แสดงข้อมูลที่จำเป็นต่อการดูแลระบบเท่านั้น และ mask
          ข้อมูลติดต่อของผู้ใช้ไว้โดยค่าเริ่มต้นเพื่อลดการเปิดเผยข้อมูลเกินจำเป็น
        </GlassPanel>
        {children}
      </div>
    </main>
  );
}

export default AdminShell;
