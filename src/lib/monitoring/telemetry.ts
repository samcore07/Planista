/**
 * Centralized telemetry and observable performance monitoring service.
 * Tracks application execution durations, database queries, network retries,
 * and system health metrics with structured logging.
 */

export type TelemetryLogLevel = "info" | "warn" | "error";

export interface TelemetryRecord {
  timestamp: string;
  level: TelemetryLogLevel;
  category: "domain_service" | "network_retry" | "ai_provider" | "database" | "auth" | "system";
  name: string;
  durationMs?: number;
  isSlow?: boolean;
  success: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
}

// In-memory circular buffer for observability and health endpoints (capped at 100 entries)
const MAX_BUFFER_SIZE = 100;
const telemetryBuffer: TelemetryRecord[] = [];

/**
 * Records an observable telemetry event
 */
export function recordTelemetry(record: Omit<TelemetryRecord, "timestamp">): TelemetryRecord {
  const fullRecord: TelemetryRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };

  telemetryBuffer.push(fullRecord);
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.shift();
  }

  // Structured logging in server environments
  if (process.env.NODE_ENV !== "test") {
    const prefix = `[Planista Telemetry][${fullRecord.level.toUpperCase()}][${fullRecord.category}]`;
    const msg = `${prefix} ${fullRecord.name} (success=${fullRecord.success}${
      fullRecord.durationMs !== undefined ? `, duration=${fullRecord.durationMs.toFixed(2)}ms` : ""
    }${fullRecord.isSlow ? " [SLOW]" : ""})`;

    if (fullRecord.level === "error") {
      console.error(msg, fullRecord.error, fullRecord.metadata);
    } else if (fullRecord.level === "warn" || fullRecord.isSlow) {
      console.warn(msg, fullRecord.metadata);
    } else {
      console.log(msg, fullRecord.metadata);
    }
  }

  return fullRecord;
}

/**
 * Measures asynchronous execution duration with performance.now()
 * Flags operations exceeding target threshold budgets as isSlow.
 */
export async function measureExecution<T>(
  name: string,
  category: TelemetryRecord["category"],
  fn: () => Promise<T>,
  options: { slowThresholdMs?: number; metadata?: Record<string, unknown> } = {}
): Promise<{ result: T; durationMs: number }> {
  const slowThreshold = options.slowThresholdMs ?? 500;
  const start = performance.now();

  try {
    const result = await fn();
    const durationMs = performance.now() - start;
    const isSlow = durationMs > slowThreshold;

    recordTelemetry({
      level: isSlow ? "warn" : "info",
      category,
      name,
      durationMs,
      isSlow,
      success: true,
      metadata: options.metadata,
    });

    return { result, durationMs };
  } catch (error: unknown) {
    const durationMs = performance.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    recordTelemetry({
      level: "error",
      category,
      name,
      durationMs,
      isSlow: durationMs > slowThreshold,
      success: false,
      error: errorMessage,
      metadata: options.metadata,
    });

    throw error;
  }
}

/**
 * Returns recent observable telemetry buffer
 */
export function getTelemetryHistory(): TelemetryRecord[] {
  return [...telemetryBuffer];
}

/**
 * Clears telemetry history (primarily used in test teardown)
 */
export function clearTelemetryHistory(): void {
  telemetryBuffer.length = 0;
}
