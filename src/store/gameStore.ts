import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VibeLevel } from "@/config/gameConstants";

interface GamePreferencesState {
  vibeLevel: VibeLevel;
  setVibeLevel: (level: VibeLevel) => void;
}

const DEFAULT_VIBE_LEVEL: VibeLevel = "tipsy";

export const useGameStore = create<GamePreferencesState>()(
  persist(
    (set) => ({
      vibeLevel: DEFAULT_VIBE_LEVEL,
      setVibeLevel: (level) => set({ vibeLevel: level }),
    }),
    {
      name: "wong-taek-game-preferences",
    },
  ),
);

export default useGameStore;
