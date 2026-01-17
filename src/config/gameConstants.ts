/**
 * Game Constants - Centralized Configuration
 * ใช้ไฟล์นี้เป็นที่เก็บค่าคงที่ทั้งหมดของเกม
 */

// ========================
// Game Modes Configuration
// ========================

export interface GameModeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  shadowClass: string;
  bgGradient: string;
  difficulty: number;
  route: string;
  questionType: string; // API type
}

export const GAME_MODES: GameModeConfig[] = [
  {
    id: "random",
    name: "โหมดสุ่ม",
    description: "ไม่รู้จะเจออะไร! ระบบสุ่มโหมดให้แบบลุ้นระทึก ลองดวงกันเลย!",
    icon: "casino",
    color: "text-neon-yellow",
    borderColor: "border-neon-yellow",
    shadowClass: "shadow-neon-yellow",
    bgGradient: "from-yellow-500/20 to-transparent",
    difficulty: 3,
    route: "random",
    questionType: "RANDOM",
  },
  {
    id: "question",
    name: "โหมดคำถาม",
    description:
      "รู้จักเพื่อนให้มากขึ้น หรือจะแฉให้หมดเปลือก ที่นี่ไม่มีความลับ",
    icon: "psychology_alt",
    color: "text-neon-blue",
    borderColor: "border-neon-blue",
    shadowClass: "shadow-neon-blue",
    bgGradient: "from-cyan-500/20 to-transparent",
    difficulty: 1,
    route: "/game/play?mode=question",
    questionType: "QUESTION",
  },
  {
    id: "vote",
    name: "โหมดโหวต",
    description:
      "ใครมีเกณฑ์จะเป็น...ที่สุด? เสียงข้างมากสั่งดื่ม ประชาธิปไตยมันเจ็บปวด",
    icon: "how_to_vote",
    color: "text-primary",
    borderColor: "border-primary",
    shadowClass: "shadow-neon-purple",
    bgGradient: "from-purple-500/20 to-transparent",
    difficulty: 2,
    route: "/game/play?mode=vote",
    questionType: "VOTE",
  },
  {
    id: "truth-or-dare",
    name: "ความจริง\nหรือท้า",
    description: "จะกล้าทำ หรือจะกระดกช็อต ลังเลเท่ากับอ่อนแอ",
    icon: "visibility",
    color: "text-neon-green",
    borderColor: "border-neon-green",
    shadowClass: "shadow-neon-green",
    bgGradient: "from-green-500/20 to-transparent",
    difficulty: 3,
    route: "/game/truth-or-dare",
    questionType: "TRUTH,DARE",
  },
  {
    id: "chaos",
    name: "โหมดโกลาหล\n(Chaos)",
    description: "กฎกติกาแบบสุ่ม บทลงโทษสุดโหด ขอให้โชคดี",
    icon: "warning",
    color: "text-neon-red",
    borderColor: "border-neon-red",
    shadowClass: "shadow-neon-red",
    bgGradient: "from-red-500/20 to-transparent",
    difficulty: 5,
    route: "/game/chaos",
    questionType: "CHAOS",
  },
];

// ========================
// Question Type Labels
// ========================

export interface QuestionTypeConfig {
  label: string;
  icon: string;
  color: string;
}

export const QUESTION_TYPES: Record<string, QuestionTypeConfig> = {
  QUESTION: { label: "เจาะลึก", icon: "psychology_alt", color: "text-primary" },
  TRUTH: { label: "ความจริง", icon: "verified", color: "text-neon-blue" },
  DARE: {
    label: "ท้าทาย",
    icon: "local_fire_department",
    color: "text-neon-red",
  },
  CHAOS: { label: "โกลาหล", icon: "bolt", color: "text-neon-yellow" },
  VOTE: { label: "โหวต", icon: "how_to_vote", color: "text-neon-green" },
};

// ========================
// Neon Colors
// ========================

export const NEON_COLORS = {
  primary: "#c73df5",
  blue: "#00ffff",
  red: "#ff0040",
  green: "#80ff00",
  yellow: "#fbff00",
} as const;

// ========================
// Game Settings
// ========================

export const GAME_SETTINGS = {
  defaultTimerDuration: 30,
  minPlayers: 2,
  maxPlayersDefault: 8,
  maxPlayersLimit: 20,
  adult18PlusRatio: 0.8, // 80% 18+ questions when enabled
} as const;

// ========================
// Sound Effects
// ========================

export const SOUND_EFFECTS = {
  tick: "/sounds/tick.mp3",
  countdown: "/sounds/countdown.mp3",
  timeUp: "/sounds/time-up.mp3",
  newQuestion: "/sounds/whoosh.mp3",
  drink: "/sounds/drink.mp3",
  celebration: "/sounds/celebration.mp3",
} as const;

// ========================
// Vibe Levels
// ========================

export type VibeLevel = "chilling" | "tipsy" | "chaos";

export const VIBE_LEVELS: Record<
  VibeLevel,
  { label: string; maxLevel: number }
> = {
  chilling: { label: "ชิลล์ๆ", maxLevel: 1 },
  tipsy: { label: "มึนๆ", maxLevel: 2 },
  chaos: { label: "โกลาหล", maxLevel: 3 },
};

// ========================
// Helper Functions
// ========================

export function getRandomMode(): GameModeConfig {
  const playableModes = GAME_MODES.filter((m) => m.route !== "random");
  return playableModes[Math.floor(Math.random() * playableModes.length)];
}

export function getModeById(id: string): GameModeConfig | undefined {
  return GAME_MODES.find((m) => m.id === id);
}

export function getModeByQuestionType(
  type: string,
): GameModeConfig | undefined {
  return GAME_MODES.find((m) => m.questionType === type);
}
