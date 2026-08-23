"use client";

import { ReactNode } from "react";

export const ADMIN_TH_CLASS =
  "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40";
export const ADMIN_TD_CLASS = "px-3 py-2.5 align-middle text-sm text-white/80";

interface AdminTableProps {
  headers: Array<{ label: string; className?: string }>;
  /** Rendered inside <tbody>; one <tr> per row */
  children: ReactNode;
  minWidth?: number;
  caption?: string;
}

/**
 * Semantic admin table shell: horizontal scroll on narrow screens with a
 * consistent compact header style.
 */
export function AdminTable({ headers, children, minWidth = 760, caption }: AdminTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/8 bg-white/[0.02]">
      <table className="w-full border-collapse" style={{ minWidth }}>
        {caption ? (
          <caption className="sr-only">{caption}</caption>
        ) : null}
        <thead className="border-b border-white/8">
          <tr>
            {headers.map((header, index) => (
              <th key={index} scope="col" className={`${ADMIN_TH_CLASS} ${header.className ?? ""}`}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}
