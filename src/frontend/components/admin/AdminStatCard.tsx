"use client";

import { GlassPanel } from "@/frontend/components/ui";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon: string;
  tone?: "primary" | "blue" | "green" | "red" | "yellow";
}

const TONE_STYLES: Record<NonNullable<AdminStatCardProps["tone"]>, string> = {
  primary: "bg-primary/15 text-primary",
  blue: "bg-neon-blue/15 text-neon-blue",
  green: "bg-neon-green/15 text-neon-green",
  red: "bg-neon-red/15 text-neon-red",
  yellow: "bg-neon-yellow/15 text-neon-yellow",
};

export function AdminStatCard({
  label,
  value,
  description,
  icon,
  tone = "primary",
}: AdminStatCardProps) {
  return (
    <GlassPanel className="h-full p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black text-white md:text-4xl">
            {value}
          </p>
          {description ? (
            <p className="mt-2 text-sm text-white/45">{description}</p>
          ) : null}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TONE_STYLES[tone]}`}
        >
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
      </div>
    </GlassPanel>
  );
}

export default AdminStatCard;
