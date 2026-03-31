type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV === "development";

function formatMessage(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  if (isDev) {
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }
  return JSON.stringify({ level, message, timestamp, ...data });
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (isDev) {
      console.debug(formatMessage("debug", message, data));
    }
  },
  info(message: string, data?: Record<string, unknown>) {
    console.info(formatMessage("info", message, data));
  },
  warn(message: string, data?: Record<string, unknown>) {
    console.warn(formatMessage("warn", message, data));
  },
  error(message: string, data?: Record<string, unknown>) {
    console.error(formatMessage("error", message, data));
  },
};
