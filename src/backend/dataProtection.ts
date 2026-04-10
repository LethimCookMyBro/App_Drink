import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import env from "@/backend/env";

const ENCRYPTED_PREFIX = "enc:v1";
const ALGORITHM = "aes-256-gcm";
const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /(?<!\d)(?:\+?\d[\d\s\-()]{7,}\d)(?!\d)/g;
const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|cookie|authorization|session|bearer|refresh|access|private[_-]?key)/i;

type JsonLike = Record<string, unknown>;

function getDataProtectionKey(): Buffer {
  return createHash("sha256").update(env.apiEncryptionKey).digest();
}

export function isEncryptedTextAtRest(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

export function encryptTextAtRest(value: string): string {
  if (isEncryptedTextAtRest(value)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getDataProtectionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function encryptOptionalTextAtRest(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return encryptTextAtRest(value);
}

export function decryptTextAtRest(value: string): string {
  if (!isEncryptedTextAtRest(value)) {
    return value;
  }

  try {
    const parts = value.split(":");
    if (parts.length !== 5) {
      throw new Error("Invalid encrypted payload format");
    }

    const [, version, ivB64, tagB64, encryptedB64] = parts;
    if (version !== "v1") {
      throw new Error("Unsupported encrypted payload version");
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      getDataProtectionKey(),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, "base64url")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return "[encrypted-unavailable]";
  }
}

export function decryptOptionalTextAtRest(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return decryptTextAtRest(value);
}

export function redactPotentialPII(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]");
}

function sanitizeLogValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (depth >= 3) {
    return "[max-depth]";
  }

  if (value === null) {
    return null;
  }

  switch (typeof value) {
    case "string":
      return redactPotentialPII(value);
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "undefined":
      return "[undefined]";
    case "function":
      return "[function]";
    case "symbol":
      return "[symbol]";
    case "object": {
      if (value instanceof Date) {
        return value.toISOString();
      }

      if (value instanceof Error) {
        return {
          name: value.name,
          message: redactPotentialPII(value.message),
        };
      }

      if (Array.isArray(value)) {
        return value.slice(0, 20).map((item) => sanitizeLogValue(item, depth + 1, seen));
      }

      const objectValue = value as JsonLike;
      if (seen.has(objectValue)) {
        return "[circular]";
      }

      seen.add(objectValue);
      const sanitizedEntries = Object.entries(objectValue)
        .slice(0, 25)
        .map(([key, nestedValue]) => {
          if (SENSITIVE_KEY_PATTERN.test(key)) {
            return [key, "[redacted]"] as const;
          }

          return [key, sanitizeLogValue(nestedValue, depth + 1, seen)] as const;
        });
      seen.delete(objectValue);
      return Object.fromEntries(sanitizedEntries);
    }
    default:
      return "[unsupported]";
  }
}

export function sanitizeLogContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) {
    return undefined;
  }

  const seen = new WeakSet<object>();
  const sanitized = sanitizeLogValue(context, 0, seen);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : { value: sanitized };
}
