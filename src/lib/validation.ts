/**
 * Input Validation & Sanitization
 * Zod schemas + Simple profanity filter
 */

import { z } from "zod";

// Simple profanity filter (Thai words)
const badWords = [
  "เหี้ย",
  "สัตว์",
  "ควย",
  "หี",
  "เย็ด",
  "แม่ง",
  "ไอ้สัตว์",
  "อีดอก",
  "อีสัตว์",
  "กระหรี่",
  "อีควาย",
  "ไอ้เวร",
  "สันดาน",
  "ชาติหมา",
];

function hasProfanitySimple(text: string): boolean {
  const lowerText = text.toLowerCase();
  return badWords.some((word) => lowerText.includes(word));
}

function cleanProfanitySimple(text: string): string {
  let result = text;
  badWords.forEach((word) => {
    result = result.replace(new RegExp(word, "gi"), "***");
  });
  return result;
}

// ============ SCHEMAS ============

export const playerNameSchema = z
  .string()
  .min(1, "ชื่อต้องมีอย่างน้อย 1 ตัวอักษร")
  .max(20, "ชื่อยาวได้ไม่เกิน 20 ตัวอักษร")
  .transform((val) => val.trim())
  .refine((val) => !hasProfanitySimple(val), {
    message: "ชื่อมีคำไม่เหมาะสม",
  });

export const customQuestionSchema = z
  .string()
  .min(5, "คำถามต้องมีอย่างน้อย 5 ตัวอักษร")
  .max(200, "คำถามยาวได้ไม่เกิน 200 ตัวอักษร")
  .transform((val) => val.trim())
  .refine((val) => !hasProfanitySimple(val), {
    message: "คำถามมีคำไม่เหมาะสม",
  });

export const roomCodeSchema = z
  .string()
  .length(6, "รหัสห้องต้องมี 6 ตัวอักษร")
  .regex(/^[A-Z0-9]+$/, "รหัสห้องต้องเป็นตัวพิมพ์ใหญ่หรือตัวเลขเท่านั้น");

export const questionSchema = z.object({
  text: z.string().min(5).max(500),
  type: z.enum(["QUESTION", "TRUTH", "DARE", "VOTE", "CHAOS"]),
  level: z.number().int().min(1).max(3),
  is18Plus: z.boolean().default(false),
});

export const createRoomSchema = z.object({
  hostName: playerNameSchema,
  roomName: z.string().min(1).max(30).optional(),
  maxPlayers: z.number().int().min(2).max(20).default(8),
  is18Plus: z.boolean().default(false),
  difficulty: z.number().int().min(1).max(5).default(3),
});

// ============ HELPERS ============

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Check if text contains profanity
 */
export function hasProfanity(text: string): boolean {
  return hasProfanitySimple(text);
}

/**
 * Clean profanity from text
 */
export function cleanProfanity(text: string): string {
  return cleanProfanitySimple(text);
}

/**
 * Validate and sanitize player name
 */
export function validatePlayerName(name: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  const result = playerNameSchema.safeParse(name);
  if (result.success) {
    return { success: true, data: sanitizeHtml(result.data) };
  }
  return { success: false, error: result.error.issues[0]?.message };
}

/**
 * Validate and sanitize custom question
 */
export function validateCustomQuestion(question: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  const result = customQuestionSchema.safeParse(question);
  if (result.success) {
    return { success: true, data: sanitizeHtml(result.data) };
  }
  return { success: false, error: result.error.issues[0]?.message };
}
