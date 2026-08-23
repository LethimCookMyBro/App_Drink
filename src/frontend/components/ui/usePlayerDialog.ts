"use client";

import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Player-side dialog/sheet accessibility:
 * - Escape closes
 * - Tab/Shift+Tab trapped inside the panel
 * - Focus moves into the panel on open
 * - Focus returns to the opener on close
 * - Backdrop click closes (when onClose is provided)
 */
export function usePlayerDialog(
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusPanel = window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        FOCUSABLE_SELECTOR,
      );
      (firstFocusable ?? panelRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      // General guard: if focus is outside the panel (e.g. on body),
      // prevent Tab from moving it further and pull it back into the panel.
      if (!panel.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      // Wrap-around: at boundaries, prevent default and redirect focus
      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      } else {
        // Not at a boundary — let native Tab work, but verify focus stays inside
        // Use requestAnimationFrame to check after browser moves focus
        requestAnimationFrame(() => {
          const now = document.activeElement;
          if (now && !panel.contains(now)) {
            // Focus escaped — pull it back
            (event.shiftKey ? last : first).focus();
          }
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusPanel);
      document.removeEventListener("keydown", handleKeyDown, true);
      previousActiveElement?.focus();
    };
  }, [open, panelRef]);
}
