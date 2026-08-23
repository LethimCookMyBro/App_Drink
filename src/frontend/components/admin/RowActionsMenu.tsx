"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/frontend/components/ui/Icon";

export interface RowActionItem {
  kind?: "item" | "divider";
  label?: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

interface RowActionsMenuProps {
  label: string;
  actions: RowActionItem[];
}

export function RowActionsMenu({ label, actions }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const closeAndRefocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const focusItemByIndex = (index: number) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button[data-menuitem]:not([disabled])") ?? [],
    );
    if (items.length === 0) return;
    const bounded = ((index % items.length) + items.length) % items.length;
    items[bounded].focus();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button[data-menuitem]") ?? [],
    );
    const currentIndex = items.findIndex((item) => item === document.activeElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItemByIndex(currentIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItemByIndex(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItemByIndex(0);
        break;
      case "End":
        event.preventDefault();
        focusItemByIndex(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        closeAndRefocus();
        break;
      case "Tab":
        closeAndRefocus();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if ((event.key === "ArrowDown" || event.key === "Enter") && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1c1722] py-1 shadow-xl"
        >
          {actions.map((action, index) => {
            if (action.kind === "divider") {
              return <div key={index} role="separator" className="my-1 h-px bg-white/10" />;
            }

            return (
              <button
                key={index}
                data-menuitem
                role="menuitem"
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onSelect?.();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
                  action.danger ? "text-neon-red" : "text-white/75"
                }`}
              >
                {action.icon ? (
                  <Icon name={action.icon} className="text-base" />
                ) : null}
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
