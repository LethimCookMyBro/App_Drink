type LogLevel = "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const payload = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  console.log(payload);
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
