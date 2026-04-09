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
}

export const GAME_MODES: GameModeConfig[] = [
  {
    id: "random",
    name: "โหมดสุ่ม",
    description:
      "ไม่รู้จะเจออะไร! ระบบสุ่มโหมดให้แบบลุ้นระทึก ลองดวงกันเลย!",
    icon: "casino",
    color: "text-neon-yellow",
    borderColor: "border-neon-yellow",
    shadowClass: "shadow-neon-yellow",
    bgGradient: "from-yellow-500/20 to-transparent",
    difficulty: 3,
    route: "/game/play?mode=random",
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
  },
];

export const GAME_QUESTION_TYPES = [
  "QUESTION",
  "TRUTH",
  "DARE",
  "CHAOS",
  "VOTE",
] as const;

export const GAME_QUESTION_TYPE_SET = new Set<string>(GAME_QUESTION_TYPES);

export const GAME_SETTINGS = {
  defaultTimerDuration: 30,
  minPlayers: 2,
  maxPlayersDefault: 8,
  maxPlayersLimit: 20,
  adult18PlusRatio: 0.8, // 80% 18+ questions when enabled
} as const;

export type VibeLevel = "chilling" | "tipsy" | "chaos";

export function getQuestionLevelForVibe(vibeLevel: VibeLevel): number {
  switch (vibeLevel) {
    case "chaos":
      return 3;
    case "tipsy":
      return 2;
    default:
      return 1;
  }
}
