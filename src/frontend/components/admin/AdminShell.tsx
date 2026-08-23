"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import type { AdminIdentity } from "@/backend/adminData";
import {
  hasAdminRole,
  type AdminRoleName,
} from "@/shared/adminRoles";

import { Icon } from "@/frontend/components/ui/Icon";

interface AdminShellProps {
  admin: AdminIdentity | null;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin", label: "ภาพรวม", icon: "dashboard", minRole: "MODERATOR" },
  { href: "/admin/questions", label: "คำถาม", icon: "quiz", minRole: "MODERATOR" },
  { href: "/admin/users", label: "ผู้ใช้", icon: "group", minRole: "ADMIN" },
  { href: "/admin/feedback", label: "ข้อเสนอแนะ", icon: "chat_bubble", minRole: "MODERATOR" },
  { href: "/admin/security", label: "ความปลอดภัย", icon: "shield", minRole: "ADMIN" },
] as const;

function canSeeAdminNavItem(
  admin: AdminIdentity | null,
  minimumRole: AdminRoleName,
): boolean {
  return !admin || hasAdminRole(admin.role, minimumRole);
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mobileNavOpenerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMobileNavOpen) return;

    // Capture ref value at effect start for use in cleanup
    const opener = mobileNavOpenerRef.current;

    // Focus the close button when the drawer opens
    const timer = window.setTimeout(() => {
      const closeBtn = mobileNavRef.current?.querySelector<HTMLButtonElement>(
        "button[aria-label=\"ปิดเมนู\"]",
      );
      closeBtn?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
        return;
      }

      // Focus trap
      if (event.key === "Tab" && mobileNavRef.current) {
        const focusable = Array.from(
          mobileNavRef.current.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), [tabindex]:not([tabindex=\"-1\"])",
          ),
        ).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      opener?.focus();
    };
  }, [isMobileNavOpen]);

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    canSeeAdminNavItem(admin, item.minRole),
  );

  const renderNavLinks = () =>
    visibleNavItems.map((item) => {
      const active =
        pathname === item.href ||
        (item.href !== "/admin" && pathname.startsWith(item.href));

      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => setIsMobileNavOpen(false)}
          className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active
              ? "bg-primary/15 text-white"
              : "text-white/55 hover:bg-white/5 hover:text-white"
          }`}
        >
          {active ? (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
            />
          ) : null}
          <Icon name={item.icon} className="text-base" />
          <span>{item.label}</span>
        </Link>
      );
    });

  const renderSidebarFooter = () => (
    <div className="space-y-1 border-t border-white/8 pt-3">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Icon name="home" className="text-base" />
        <span>หน้าเกม</span>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
      >
        <Icon name={isLoggingOut ? "sync" : "logout"} className={`text-base ${isLoggingOut ? "animate-spin" : ""}`} />
        <span>ออกจากระบบ</span>
      </button>
      {admin ? (
        <div className="mt-2 px-3 py-2">
          <p className="truncate text-xs font-semibold text-white/70">{admin.name}</p>
          <p className="mt-0.5 truncate text-xs text-white/35">{admin.role.replaceAll("_", " ")}</p>
        </div>
      ) : null}
    </div>
  );

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
    <div className="min-h-screen bg-[#0d0a10] lg:grid lg:grid-cols-[228px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/8 bg-[#110d15] px-3 py-4 lg:flex">
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Icon name="local_bar" className="text-lg text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">Wong Taek</p>
            <p className="text-[11px] leading-tight text-white/35">แผงผู้ดูแล</p>
          </div>
        </div>

        <nav aria-label="เมนูผู้ดูแลระบบ" className="flex flex-col gap-0.5">
          {renderNavLinks()}
        </nav>

        <div className="mt-auto">{renderSidebarFooter()}</div>
      </aside>

      {/* Mobile nav drawer */}
      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={mobileNavRef}
            role="dialog"
            aria-modal="true"
            aria-label="เมนูผู้ดูแลระบบ"
            className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#110d15] px-3 py-4"
            style={{ animation: "admin-drawer-in-left 180ms ease-out" }}
          >
            <div className="mb-5 flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Icon name="local_bar" className="text-lg text-primary" />
                </div>
                <p className="text-sm font-bold text-white">Wong Taek</p>
              </div>
              <button
                type="button"
                aria-label="ปิดเมนู"
                onClick={() => setIsMobileNavOpen(false)}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav aria-label="เมนูผู้ดูแลระบบ" className="flex flex-col gap-0.5">
              {renderNavLinks()}
            </nav>
            <div className="mt-auto">{renderSidebarFooter()}</div>
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0d0a10]/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={mobileNavOpenerRef}
                type="button"
                aria-label="เปิดเมนู"
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen(true)}
                className="-ml-1 rounded-lg p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-white md:text-lg">
                  {title}
                </h1>
                {description ? (
                  <p className="hidden truncate text-sm text-white/40 sm:block">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {actions}
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminShell;
