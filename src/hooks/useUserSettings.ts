/**
 * useUserSettings - Per-User Settings Storage
 * เก็บ settings แยกตาม user (ใช้ชื่อผู้เล่นเป็น key)
 * รองรับทั้ง localStorage และ Zustand store
 */

import { useState, useEffect, useCallback } from "react";
import { ThemeId } from "@/config/themes";

export interface UserSettings {
  theme: ThemeId;
  hapticLevel: "off" | "light" | "strong";
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  avatar: string;
  is18Plus: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "neon",
  hapticLevel: "strong",
  soundEnabled: true,
  vibrationEnabled: true,
  avatar: "😎",
  is18Plus: false,
};

const STORAGE_KEY_PREFIX = "wongtaek-user-settings-";
const CURRENT_USER_KEY = "wongtaek-current-user";

/**
 * Get the current user identifier from multiple sources
 */
function getCurrentUserId(): string {
  if (typeof window === "undefined") return "default";

  // 1. Try to get from dedicated current user key
  const currentUser = localStorage.getItem(CURRENT_USER_KEY);
  if (currentUser) return currentUser;

  // 2. Try to get from Zustand persisted store
  const storeData = localStorage.getItem("wong-taek-store");
  if (storeData) {
    try {
      const parsed = JSON.parse(storeData);
      // Zustand persist stores data in "state" key
      const state = parsed.state || parsed;
      if (state.currentPlayer?.name) {
        return state.currentPlayer.name;
      }
    } catch {
      // ignore
    }
  }

  // 3. Try to get from players list (first player is usually the host)
  const players = localStorage.getItem("wongtaek-players");
  if (players) {
    try {
      const parsed = JSON.parse(players);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        typeof parsed[0] === "string"
      ) {
        return parsed[0];
      }
    } catch {
      // ignore
    }
  }

  // 4. Fallback to device-based ID
  return "default";
}

/**
 * Set current user for settings
 */
export function setCurrentUser(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_USER_KEY, userId);
}

/**
 * Load settings for a specific user
 */
export function loadUserSettings(userId: string): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const key = STORAGE_KEY_PREFIX + userId;
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  return DEFAULT_SETTINGS;
}

/**
 * Save settings for a specific user
 */
export function saveUserSettings(
  userId: string,
  settings: Partial<UserSettings>,
): void {
  if (typeof window === "undefined") return;

  const key = STORAGE_KEY_PREFIX + userId;
  const current = loadUserSettings(userId);
  const updated = { ...current, ...settings };

  localStorage.setItem(key, JSON.stringify(updated));
}

/**
 * Hook to manage per-user settings
 */
export function useUserSettings(customUserId?: string) {
  const [userId, setUserId] = useState<string>("default");
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user ID and settings on mount
  useEffect(() => {
    const id = customUserId || getCurrentUserId();
    setUserId(id);
    setSettings(loadUserSettings(id));
    setIsLoaded(true);

    // Also save this as current user for future reference
    if (id !== "default") {
      setCurrentUser(id);
    }
  }, [customUserId]);

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        saveUserSettings(userId, updated);
        return updated;
      });
    },
    [userId],
  );

  // Update multiple settings at once
  const updateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...updates };
        saveUserSettings(userId, updated);
        return updated;
      });
    },
    [userId],
  );

  // Switch to a different user
  const switchUser = useCallback((newUserId: string) => {
    setUserId(newUserId);
    setSettings(loadUserSettings(newUserId));
    setCurrentUser(newUserId);
  }, []);

  return {
    userId,
    settings,
    isLoaded,
    updateSetting,
    updateSettings,
    switchUser,
    // Convenient shortcuts
    setTheme: (theme: ThemeId) => updateSetting("theme", theme),
    setHapticLevel: (level: "off" | "light" | "strong") =>
      updateSetting("hapticLevel", level),
    setSoundEnabled: (enabled: boolean) =>
      updateSetting("soundEnabled", enabled),
    setVibrationEnabled: (enabled: boolean) =>
      updateSetting("vibrationEnabled", enabled),
    setAvatar: (avatar: string) => updateSetting("avatar", avatar),
    setIs18Plus: (enabled: boolean) => updateSetting("is18Plus", enabled),
  };
}

export default useUserSettings;
