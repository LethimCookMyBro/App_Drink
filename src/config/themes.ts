/**
 * Theme System Configuration
 * ระบบธีมสำหรับเปลี่ยน look & feel ของแอป
 */

export type ThemeId = "neon" | "minimal" | "pastel";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  icon: string;
  colors: {
    primary: string;
    primaryGlow: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textMuted: string;
    neonRed: string;
    neonGreen: string;
    neonBlue: string;
    neonYellow: string;
    neonPurple: string;
  };
  effects: {
    blur: boolean;
    glow: boolean;
    gradients: boolean;
  };
}

export const THEMES: Record<ThemeId, Theme> = {
  neon: {
    id: "neon",
    name: "Cyberpunk Neon",
    description: "โทนสีหวือหวา เรืองแสง สไตล์ไซเบอร์พังค์",
    icon: "electric_bolt",
    colors: {
      primary: "#C73DF5",
      primaryGlow: "rgba(199, 61, 245, 0.6)",
      background: "#0D0D0D",
      surface: "#1A1A1A",
      card: "#1E1E1E",
      text: "#FFFFFF",
      textMuted: "rgba(255, 255, 255, 0.6)",
      neonRed: "#FF0040",
      neonGreen: "#80FF00",
      neonBlue: "#00F0FF",
      neonYellow: "#FBFF00",
      neonPurple: "#C73DF5",
    },
    effects: {
      blur: true,
      glow: true,
      gradients: true,
    },
  },
  minimal: {
    id: "minimal",
    name: "Minimal Dark",
    description: "โทนมืดเรียบง่าย ประหยัดแบต สบายตา",
    icon: "dark_mode",
    colors: {
      primary: "#6366F1",
      primaryGlow: "rgba(99, 102, 241, 0.4)",
      background: "#000000",
      surface: "#111111",
      card: "#171717",
      text: "#FAFAFA",
      textMuted: "rgba(250, 250, 250, 0.5)",
      neonRed: "#EF4444",
      neonGreen: "#22C55E",
      neonBlue: "#3B82F6",
      neonYellow: "#EAB308",
      neonPurple: "#8B5CF6",
    },
    effects: {
      blur: false,
      glow: false,
      gradients: false,
    },
  },
  pastel: {
    id: "pastel",
    name: "Pastel Party",
    description: "โทนพาสเทลสดใส สไตล์คิ้วท์ๆ",
    icon: "palette",
    colors: {
      primary: "#F472B6",
      primaryGlow: "rgba(244, 114, 182, 0.5)",
      background: "#1F1D2B",
      surface: "#2D2B3D",
      card: "#353347",
      text: "#FFFFFF",
      textMuted: "rgba(255, 255, 255, 0.7)",
      neonRed: "#FB7185",
      neonGreen: "#86EFAC",
      neonBlue: "#7DD3FC",
      neonYellow: "#FDE047",
      neonPurple: "#C4B5FD",
    },
    effects: {
      blur: true,
      glow: true,
      gradients: true,
    },
  },
};

export const DEFAULT_THEME: ThemeId = "neon";

/**
 * Get CSS variables for a theme
 */
export function getThemeCSSVariables(themeId: ThemeId): Record<string, string> {
  const theme = THEMES[themeId];
  return {
    "--color-primary": theme.colors.primary,
    "--color-primary-glow": theme.colors.primaryGlow,
    "--color-background": theme.colors.background,
    "--color-surface": theme.colors.surface,
    "--color-card": theme.colors.card,
    "--color-text": theme.colors.text,
    "--color-text-muted": theme.colors.textMuted,
    "--color-neon-red": theme.colors.neonRed,
    "--color-neon-green": theme.colors.neonGreen,
    "--color-neon-blue": theme.colors.neonBlue,
    "--color-neon-yellow": theme.colors.neonYellow,
    "--color-neon-purple": theme.colors.neonPurple,
    "--effect-blur": theme.effects.blur ? "blur(12px)" : "none",
    "--effect-glow": theme.effects.glow ? "1" : "0",
  };
}

/**
 * Available avatar emojis
 */
export const AVATAR_EMOJIS = [
  "😎",
  "🤠",
  "🥳",
  "😈",
  "👻",
  "🤡",
  "👽",
  "🤖",
  "🦊",
  "🐸",
  "🐻",
  "🐼",
  "🦁",
  "🐯",
  "🐮",
  "🐷",
  "🐵",
  "🐔",
  "🦄",
  "🐲",
  "🔥",
  "💀",
  "👑",
  "💎",
  "🎯",
  "🎪",
  "🎭",
  "🎮",
  "🎸",
  "🍺",
];

/**
 * Gradient presets for avatars
 */
export const AVATAR_GRADIENTS = [
  "from-pink-500 to-purple-600",
  "from-cyan-400 to-blue-600",
  "from-green-400 to-emerald-600",
  "from-orange-400 to-red-600",
  "from-yellow-400 to-orange-500",
  "from-indigo-500 to-purple-600",
  "from-rose-400 to-pink-600",
  "from-teal-400 to-cyan-600",
];

const themeConfig = {
  THEMES,
  DEFAULT_THEME,
  getThemeCSSVariables,
  AVATAR_EMOJIS,
  AVATAR_GRADIENTS,
};

export default themeConfig;
