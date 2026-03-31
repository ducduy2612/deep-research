export type ErrorCategory =
  | "ai"
  | "network"
  | "storage"
  | "config"
  | "validation"
  | "research"
  | "unknown";

export type ErrorCode =
  | "AI_REQUEST_FAILED"
  | "AI_STREAM_ABORTED"
  | "AI_INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "NETWORK_TIMEOUT"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "CONFIG_MISSING_KEY"
  | "CONFIG_INVALID_VALUE"
  | "VALIDATION_FAILED"
  | "RESEARCH_STEP_FAILED"
  | "RESEARCH_ABORTED"
  | "UNKNOWN_ERROR";

interface AppErrorContext {
  [key: string]: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly context: AppErrorContext;
  readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      category?: ErrorCategory;
      context?: AppErrorContext;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.category = options?.category ?? this.inferCategory(code);
    this.context = options?.context ?? {};
    this.timestamp = new Date().toISOString();
  }

  private inferCategory(code: ErrorCode): ErrorCategory {
    if (code.startsWith("AI_")) return "ai";
    if (code.startsWith("NETWORK_")) return "network";
    if (code.startsWith("STORAGE_")) return "storage";
    if (code.startsWith("CONFIG_")) return "config";
    if (code.startsWith("VALIDATION_")) return "validation";
    if (code.startsWith("RESEARCH_")) return "research";
    return "unknown";
  }

  toJSON() {
    return {
      isError: true,
      code: this.code,
      category: this.category,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

/** Helper to convert unknown thrown values into AppError */
export function toAppError(
  error: unknown,
  fallbackCode: ErrorCode = "UNKNOWN_ERROR"
): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(fallbackCode, error.message, { cause: error });
  }
  return new AppError(fallbackCode, String(error));
}
