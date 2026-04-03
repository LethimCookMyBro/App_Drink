import { Prisma } from "@prisma/client";
import { redactPotentialPII } from "@/lib/dataProtection";

const MAX_CONTEXT_DEPTH = 3;
const MAX_CONTEXT_KEYS = 25;
const MAX_CONTEXT_ITEMS = 20;
const MAX_MESSAGE_BYTES = 600;
const MAX_CONTEXT_BYTES = 4000;
const MAX_STRING_BYTES = 500;
const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|cookie|authorization|session|bearer|refresh|access|private[_-]?key)/i;

type LogContext = Record<string, unknown>;

export interface PersistServerLogInput {
  level: "info" | "warn" | "error";
  message: string;
  context?: LogContext;
}

export interface StoredServerLogEntry {
  id: string;
  level: string;
  message: string;
  context: string | null;
  createdAt: Date;
}

let persistenceDisabled = false;

function clampStringBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;

  let output = value;
  while (output.length > 1 && Buffer.byteLength(output, "utf8") > maxBytes) {
    output = output.slice(0, Math.max(1, Math.floor(output.length * 0.85)));
  }

  while (output.length > 1 && Buffer.byteLength(output, "utf8") > maxBytes) {
    output = output.slice(0, -1);
  }

  return output;
}

function sanitizeContextValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (depth >= MAX_CONTEXT_DEPTH) {
    return "[max-depth]";
  }

  if (value === null) return null;

  switch (typeof value) {
    case "string":
      return clampStringBytes(redactPotentialPII(value) || value, MAX_STRING_BYTES);
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "undefined":
      return "[undefined]";
    case "symbol":
      return "[symbol]";
    case "function":
      return "[function]";
    case "object": {
      if (value instanceof Date) {
        return value.toISOString();
      }

      if (value instanceof Error) {
        return {
          name: clampStringBytes(value.name || "Error", 100),
          message: clampStringBytes(
            redactPotentialPII(value.message || "unknown") ||
              value.message ||
              "unknown",
            300,
          ),
        };
      }

      if (Array.isArray(value)) {
        return value
          .slice(0, MAX_CONTEXT_ITEMS)
          .map((item) => sanitizeContextValue(item, depth + 1, seen));
      }

      const objectValue = value as Record<string, unknown>;
      if (seen.has(objectValue)) {
        return "[circular]";
      }

      seen.add(objectValue);

      const sanitizedEntries = Object.entries(objectValue)
        .slice(0, MAX_CONTEXT_KEYS)
        .map(([key, nestedValue]) => {
          const safeKey = clampStringBytes(String(key), 64);
          if (SENSITIVE_KEY_PATTERN.test(safeKey)) {
            return [safeKey, "[redacted]"] as const;
          }

          return [
            safeKey,
            sanitizeContextValue(nestedValue, depth + 1, seen),
          ] as const;
        });

      seen.delete(objectValue);
      return Object.fromEntries(sanitizedEntries);
    }
    default:
      return "[unsupported]";
  }
}

function serializeContext(context?: LogContext): string | null {
  if (!context) return null;

  try {
    const seen = new WeakSet<object>();
    const sanitized = sanitizeContextValue(context, 0, seen);
    const json = JSON.stringify(
      sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
        ? sanitized
        : { value: sanitized },
    );

    return clampStringBytes(json, MAX_CONTEXT_BYTES);
  } catch {
    return JSON.stringify({ invalid: true });
  }
}

function isMissingServerLogsTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

function emitPersistenceWarning(error: unknown) {
  const payload = JSON.stringify({
    level: "warn",
    message: "server.log.persistence_failed",
    timestamp: new Date().toISOString(),
    context: {
      reason: error instanceof Error ? error.message : "unknown",
    },
  });

  console.error(payload);
}

export async function persistServerLog(input: PersistServerLogInput): Promise<void> {
  if (process.env.NODE_ENV === "test" || persistenceDisabled) {
    return;
  }

  try {
    const { default: prisma } = await import("./db");
    await prisma.serverLog.create({
      data: {
        level: clampStringBytes(input.level, 16),
        message: clampStringBytes(
          redactPotentialPII(input.message) || input.message,
          MAX_MESSAGE_BYTES,
        ),
        context: serializeContext(input.context),
      },
    });
  } catch (error) {
    if (isMissingServerLogsTable(error)) {
      persistenceDisabled = true;
      return;
    }

    emitPersistenceWarning(error);
  }
}

export async function listServerLogs(limit?: number): Promise<StoredServerLogEntry[]> {
  try {
    const { default: prisma } = await import("./db");
    return prisma.serverLog.findMany({
      ...(typeof limit === "number" ? { take: limit } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        level: true,
        message: true,
        context: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isMissingServerLogsTable(error)) {
      return [];
    }

    throw error;
  }
}
