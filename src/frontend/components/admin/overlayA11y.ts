"use client";

import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared overlay behaviour for AdminDialog/AdminDrawer:
 * - Escape closes when allowed
 * - Tab is trapped inside the overlay while open
 * - Focus moves into the overlay on open and returns to the opener on close
 */
export function useOverlayA11y(
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  options: { closeOnEscape?: boolean } = {},
) {
  const { closeOnEscape = true } = options;

  // Store the latest onClose in a ref so the effect does not re-run
  // (and visually flicker focus) when the parent re-renders with a
  // new inline callback identity.
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
      if (event.key === "Escape" && closeOnEscape) {
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

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusPanel);
      document.removeEventListener("keydown", handleKeyDown, true);
      previousActiveElement?.focus();
    };
  }, [open, panelRef, closeOnEscape]);
}
