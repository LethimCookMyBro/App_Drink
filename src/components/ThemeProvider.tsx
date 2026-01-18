"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { getThemeCSSVariables, type ThemeId } from "@/config/themes";

/**
 * ThemeProvider applies the selected theme's CSS variables to the document root
 * Uses per-user settings stored in localStorage
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, isLoaded } = useUserSettings();

  useEffect(() => {
    if (isLoaded) {
      applyTheme(settings.theme);
    }
  }, [settings.theme, isLoaded]);

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
