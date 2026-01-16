"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: "home", label: "หน้าหลัก" },
  { href: "/game/modes", icon: "sports_esports", label: "เกม" },
  { href: "/history", icon: "history", label: "ประวัติ" },
  { href: "/profile", icon: "person", label: "โปรไฟล์" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around h-20 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-1 p-2 flex-1"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 w-10 h-1 bg-primary rounded-full shadow-neon-purple"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span
                className={`material-symbols-outlined text-[28px] transition-colors ${
                  isActive
                    ? "text-primary material-symbols-filled"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[11px] font-medium tracking-wide transition-colors ${
                  isActive ? "text-primary" : "text-white/40"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
