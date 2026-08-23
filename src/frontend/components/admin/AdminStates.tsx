"use client";

import { ReactNode } from "react";

import { Icon } from "@/frontend/components/ui/Icon";

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon ? (
        <Icon name={icon} className="mb-1 text-3xl text-white/15" />
      ) : null}
      <p className="text-sm font-semibold text-white/60">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-white/35">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function AdminErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-neon-red/20 bg-neon-red/5 px-4 py-3"
    >
      <Icon name="error" className="mt-0.5 text-lg text-neon-red" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neon-red">{message}</p>
      </div>
    </div>
  );
}

export function AdminNotice({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-neon-green/20 bg-neon-green/5 px-4 py-2.5 text-sm font-semibold text-neon-green"
    >
      <Icon name="check_circle" className="text-base" />
      {message}
    </div>
  );
}

const SKELETON_ROW_HEIGHTS = ["h-11", "h-11", "h-11", "h-11", "h-11", "h-11"];

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {SKELETON_ROW_HEIGHTS.slice(0, rows).map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-lg bg-white/[0.04]`} />
      ))}
    </div>
  );
}
