import { z } from "zod";
import { containsDangerousHtml, sanitize } from "@/shared/sanitize";

const PLAYER_NAME_PATTERN = /^[A-Za-z0-9ก-๙\s]+$/u;

function sanitizeAndRejectHtml(value: string, maxLength: number) {
  const normalized = sanitize(value, maxLength);

  if (normalized.length === 0) {
    return "";
  }

  return normalized;
}

const safeString = (min: number, max: number, message: string) =>
  z
    .string()
    .transform((value) => sanitizeAndRejectHtml(value, max))
    .refine((value) => value.length >= min, message)
    .refine((value) => value.length <= max, message)
    .refine((value) => !containsDangerousHtml(value), "รูปแบบข้อมูลไม่ถูกต้อง");

export const questionSchema = z.object({
  text: safeString(5, 500, "คำถามต้องมี 5-500 ตัวอักษร"),
  type: z.enum(["QUESTION", "TRUTH", "DARE", "CHAOS", "VOTE"]),
  level: z.coerce.number().int().min(1).max(3),
  is18Plus: z.boolean().default(false),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const playerSchema = z.object({
  name: safeString(1, 30, "ชื่อผู้เล่นต้องมี 1-30 ตัวอักษร")
    .refine((value) => PLAYER_NAME_PATTERN.test(value), "ชื่อใช้ได้เฉพาะตัวอักษรไทย อังกฤษ ตัวเลข และช่องว่าง"),
});

export const roomSchema = z.object({
  players: z.array(playerSchema).min(2).max(20),
  adultMode: z.boolean(),
  soundEnabled: z.boolean(),
});

export const createRoomSchema = z.object({
  hostName: playerSchema.shape.name,
  roomName: safeString(1, 30, "ชื่อวงต้องมี 1-30 ตัวอักษร").optional(),
  maxPlayers: z.coerce.number().int().min(2).max(20).default(8),
  is18Plus: z.boolean().default(false),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
});

export const roomJoinSchema = z.object({
  playerName: playerSchema.shape.name,
});

export const roomHostPlayerSchema = z.object({
  playerName: playerSchema.shape.name,
});

export const roomCodeSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => /^[A-Z0-9]{4}$/.test(value), "รหัสห้องไม่ถูกต้อง");

export const roomStartSchema = z.object({
  mode: z.enum(["QUESTION", "VOTE", "TRUTH_OR_DARE", "CHAOS", "MIXED"]).default("QUESTION"),
});

export const roomProgressSchema = z.object({
  sessionId: z.string().trim().min(10).max(100),
  roundNumber: z.coerce.number().int().min(1).max(999),
  drinkDelta: z.coerce.number().int().min(0).max(10).default(0),
});

export const roomCompleteSchema = z.object({
  sessionId: z.string().trim().min(10).max(100),
});

export const adminLoginSchema = z.object({
  username: z.string().transform((value) => sanitize(value, 100)),
  password: z.string().min(1).max(200),
}).refine((value) => value.username.length > 0 && value.password.length > 0, {
  message: "Invalid credentials",
});

export const userRegisterSchema = z.object({
  email: z
    .string()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .transform((value) => sanitize(value.toLowerCase(), 320)),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
    .max(200),
  name: safeString(1, 50, "ชื่อต้องมี 1-50 ตัวอักษร"),
});

export const userLoginSchema = z.object({
  email: z
    .string()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .transform((value) => sanitize(value.toLowerCase(), 320)),
  password: z.string().min(1).max(200),
});

export const profileUpdateSchema = z.object({
  name: safeString(1, 50, "ชื่อต้องมี 1-50 ตัวอักษร").optional(),
  avatarUrl: z.string().url("ลิงก์รูปโปรไฟล์ไม่ถูกต้อง").max(500).nullable().optional(),
});

export const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE"]),
  title: safeString(3, 100, "หัวข้อต้องมี 3-100 ตัวอักษร"),
  details: safeString(0, 1000, "รายละเอียดไม่ถูกต้อง").optional(),
  contact: safeString(0, 100, "ข้อมูลติดต่อไม่ถูกต้อง").optional(),
});

export const feedbackStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]),
});

export const questionUpdateSchema = questionSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "ไม่มีข้อมูลสำหรับอัปเดต",
);

const schemas = {
  adminLoginSchema,
  createRoomSchema,
  feedbackSchema,
  feedbackStatusSchema,
  playerSchema,
  profileUpdateSchema,
  questionSchema,
  questionUpdateSchema,
  roomCodeSchema,
  roomCompleteSchema,
  roomHostPlayerSchema,
  roomJoinSchema,
  roomProgressSchema,
  roomSchema,
  roomStartSchema,
  userLoginSchema,
  userRegisterSchema,
};

export default schemas;
