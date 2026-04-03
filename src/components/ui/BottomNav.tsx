"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { getGameLaunchHref } from "@/lib/gameSession";
import { useActiveGameSession } from "@/hooks";

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
  const { activeGame, refreshActiveGame } = useActiveGameSession();
  const hasStartedGame = activeGame.isActive;
  const gameHref = getGameLaunchHref();

  useEffect(() => {
    refreshActiveGame();
  }, [pathname, refreshActiveGame]);

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/5 pb-safe
        md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2
        md:w-[min(calc(100%-2rem),56rem)] md:rounded-[2rem] md:border md:border-white/10
        md:bg-black/20 md:backdrop-blur-2xl md:shadow-[0_20px_60px_rgba(0,0,0,0.45)]
      "
    >
      <div className="flex items-center justify-around h-20 md:h-24 w-full px-4 md:px-6 lg:px-8">
        {navItems.map((item) => {
          const href = item.href === "/game/modes" ? gameHref : item.href;
          const isActive =
            item.href === "/game/modes"
              ? pathname.startsWith("/game")
              : pathname === item.href;
          const label =
            item.href === "/game/modes" && hasStartedGame ? "เล่นต่อ" : item.label;
          return (
            <Link
              key={item.href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-1 p-2 flex-1"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 w-10 h-1 bg-primary rounded-full shadow-neon-purple md:w-12"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span
                className={`material-symbols-outlined text-[28px] md:text-[30px] lg:text-[32px] transition-colors ${
                  isActive
                    ? "text-primary material-symbols-filled"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[11px] md:text-xs font-medium tracking-wide transition-colors ${
                  isActive ? "text-primary" : "text-white/40"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
