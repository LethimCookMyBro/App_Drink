/**
 * Backward-compatible validation exports.
 * New code should prefer importing from `@/lib/schemas` and `@/lib/sanitize`.
 */

import {
  adminLoginSchema,
  createRoomSchema,
  playerSchema,
  questionSchema,
  questionUpdateSchema,
  roomCodeSchema,
  roomJoinSchema,
  roomStartSchema,
  userLoginSchema,
  userRegisterSchema,
} from "@/lib/schemas";
import {
  containsDangerousHtml,
  sanitize,
  sanitizeOptional,
} from "@/lib/sanitize";

export {
  adminLoginSchema,
  createRoomSchema,
  questionSchema,
  questionUpdateSchema,
  roomCodeSchema,
  roomJoinSchema,
  roomStartSchema,
  userLoginSchema,
  userRegisterSchema,
};

export const playerNameSchema = playerSchema.shape.name;

export const customQuestionSchema = questionSchema.shape.text;

export function hasSqlInjection(input: string): boolean {
  return containsDangerousHtml(input);
}

export function sanitizeSqlInput(input: string): string {
  return sanitize(input, 500);
}

export function sanitizeHtml(input: string): string {
  return sanitize(input, 500);
}

export function validatePlayerName(name: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  const result = playerNameSchema.safeParse(name);

  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message };
  }

  return { success: true, data: result.data };
}

export function validateCustomQuestion(question: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  const result = customQuestionSchema.safeParse(question);

  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message };
  }

  return { success: true, data: result.data };
}

export function sanitizeNullableInput(input: unknown, maxLength = 500) {
  return sanitizeOptional(input, maxLength);
}
