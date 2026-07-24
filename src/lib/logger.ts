export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  service?: string;
  module?: string;
  requestId?: string | null;
  wallet?: string | null;
  arenaId?: string | number | bigint | null;
  roundId?: string | number | bigint | null;
  jobId?: string | null;
  transactionHash?: string | null;
  chainId?: number | null;
  duration?: number | null;
  stage?: string | null;
  [key: string]: unknown;
}

export interface LogPayload extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
}

class StructuredLogger {
  private serviceName: string;

  constructor(serviceName = "xopredict") {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, context: LogContext = {}) {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      service: context.service || this.serviceName,
      message,
      ...context,
    };

    // Serialize BigInt values safely
    const jsonString = JSON.stringify(payload, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    );

    if (level === "error") {
      console.error(jsonString);
    } else if (level === "warn") {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
  }

  info(message: string, context: LogContext = {}) {
    this.log("info", message, context);
  }

  warn(message: string, context: LogContext = {}) {
    this.log("warn", message, context);
  }

  error(message: string, context: LogContext = {}) {
    this.log("error", message, context);
  }

  debug(message: string, context: LogContext = {}) {
    if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
      this.log("debug", message, context);
    }
  }
}

export const logger = new StructuredLogger();
