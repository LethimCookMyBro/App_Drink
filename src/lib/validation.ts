/**
 * Input Validation & Sanitization
 * Zod schemas for input validation (NO profanity filter - this is a party game!)
 */

import { z } from "zod";

// ============ SQL INJECTION PROTECTION ============

/**
 * Dangerous SQL patterns to block
 */
const sqlInjectionPatterns = [
  /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i, // OR 1=1, AND 1=1
  /(\b(OR|AND)\s+['"]?[a-z]+['"]?\s*=\s*['"]?[a-z]+['"]?)/i, // OR 'a'='a'
  /(--|#|\/\*)/i, // SQL comments
  /(\bUNION\b.*\bSELECT\b)/i, // UNION SELECT
  /(\bDROP\b.*\bTABLE\b)/i, // DROP TABLE
  /(\bDELETE\b.*\bFROM\b)/i, // DELETE FROM
  /(\bINSERT\b.*\bINTO\b)/i, // INSERT INTO
  /(\bUPDATE\b.*\bSET\b)/i, // UPDATE SET
  /(\bEXEC\b|\bEXECUTE\b)/i, // EXEC
  /(\bTRUNCATE\b)/i, // TRUNCATE
  /(\bALTER\b.*\bTABLE\b)/i, // ALTER TABLE
  /(\bCREATE\b.*\bTABLE\b)/i, // CREATE TABLE
  /(;.*--)/i, // Statement termination with comment
  /(\bSLEEP\b\s*\()/i, // Time-based injection
  /(\bBENCHMARK\b\s*\()/i, // MySQL benchmark
  /(\bWAITFOR\b.*\bDELAY\b)/i, // SQL Server delay
];

/**
 * Check if input contains SQL injection patterns
 */
export function hasSqlInjection(input: string): boolean {
  return sqlInjectionPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize input to remove potential SQL injection
 */
export function sanitizeSqlInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");
  // Escape single quotes (double them)
  sanitized = sanitized.replace(/'/g, "''");
  return sanitized;
}

// ============ SCHEMAS ============

export const playerNameSchema = z
  .string()
  .min(1, "ชื่อต้องมีอย่างน้อย 1 ตัวอักษร")
  .max(20, "ชื่อยาวได้ไม่เกิน 20 ตัวอักษร")
  .transform((val) => val.trim())
  .refine((val) => !hasSqlInjection(val), {
    message: "ชื่อมีรูปแบบไม่ถูกต้อง",
  });

export const customQuestionSchema = z
  .string()
  .min(5, "คำถามต้องมีอย่างน้อย 5 ตัวอักษร")
  .max(200, "คำถามยาวได้ไม่เกิน 200 ตัวอักษร")
  .transform((val) => val.trim());

export const roomCodeSchema = z
  .string()
  .length(4, "รหัสห้องต้องมี 4 ตัวอักษร")
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

// Admin login schema with SQL injection protection
export const adminLoginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(100)
    .transform((val) => val.trim())
    .refine((val) => !hasSqlInjection(val), {
      message: "Invalid input format",
    }),
  password: z
    .string()
    .min(1, "Password is required")
    .max(100)
    .refine((val) => !hasSqlInjection(val), {
      message: "Invalid input format",
    }),
});

// User registration schema with SQL injection protection
export const userRegisterSchema = z.object({
  email: z
    .string()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .refine((val) => !hasSqlInjection(val), {
      message: "รูปแบบข้อมูลไม่ถูกต้อง",
    }),
  password: z
    .string()
    .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    .max(100)
    .refine((val) => !hasSqlInjection(val), {
      message: "รูปแบบข้อมูลไม่ถูกต้อง",
    }),
  name: z
    .string()
    .min(1, "กรุณากรอกชื่อ")
    .max(50)
    .refine((val) => !hasSqlInjection(val), {
      message: "รูปแบบข้อมูลไม่ถูกต้อง",
    }),
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
