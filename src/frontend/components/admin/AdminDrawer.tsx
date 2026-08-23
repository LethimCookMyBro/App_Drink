"use client";

import { ReactNode, useRef } from "react";

import { useOverlayA11y } from "./overlayA11y";

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeOnEscape?: boolean;
}

export function AdminDrawer({
  open,
  onClose,
  title,
  children,
  closeOnEscape = true,
}: AdminDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `admin-drawer-title-${title.replace(/\s+/g, "-")}`;

  useOverlayA11y(panelRef, open, onClose, { closeOnEscape });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
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
        className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#161219] shadow-2xl outline-none"
        style={{
          animation: "admin-drawer-in 200ms ease-out",
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <h2 id={titleId} className="text-base font-bold text-white">
            {title}
          </h2>
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
