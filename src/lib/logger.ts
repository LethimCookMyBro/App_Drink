import { sanitizeLogContext } from "@/lib/dataProtection";

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const safeContext = sanitizeLogContext(context);
  const payload = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(safeContext ? { context: safeContext } : {}),
  });

  if (level === "error") {
    console.error(payload);
  } else {
    console.log(payload);
  }

  queueMicrotask(() => {
    void import("./serverLogs")
      .then(({ persistServerLog }) =>
        persistServerLog({ level, message, context: safeContext }),
      )
      .catch(() => void 0);
  });
}

export const logger = {
  info(message: string, context?: LogContext) {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    emit("error", message, context);
  },
};

export default logger;
