"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { getThemeCSSVariables, type ThemeId } from "@/config/themes";

/**
 * ThemeProvider applies the selected theme's CSS variables to the document root
 * This component should be included in the root layout
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useGameStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
}

/**
 * Apply theme CSS variables to the document root
 */
export function applyTheme(themeId: ThemeId) {
  if (typeof document === "undefined") return;

  const vars = getThemeCSSVariables(themeId);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Also set data attribute for potential CSS selectors
  root.setAttribute("data-theme", themeId);
}
