"use client";

import { ReactNode, useRef } from "react";

import { useOverlayA11y } from "./overlayA11y";

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Set false when closing mid-operation would lose state */
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  size?: "sm" | "md";
}

export function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  closeOnEscape = true,
  closeOnBackdrop = true,
  size = "md",
}: AdminDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `admin-dialog-title-${title.replace(/\s+/g, "-")}`;

  useOverlayA11y(panelRef, open, onClose, { closeOnEscape });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-[2px] transition-opacity sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#161219] shadow-2xl outline-none sm:rounded-2xl ${
          size === "sm" ? "sm:max-w-md" : "sm:max-w-xl"
        }`}
        style={{ animation: "admin-dialog-in 180ms ease-out" }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-bold text-white">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-white/50">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่าง"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
