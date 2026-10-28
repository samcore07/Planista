import { recordTelemetry } from "@/lib/monitoring/telemetry";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  retryOnStatus?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 300,
  maxDelayMs: 3000,
  timeoutMs: 15000,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculates exponential backoff with full jitter
 */
export function calculateBackoff(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number {
  const exponential = initialDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxDelayMs);
  // Full jitter: random between 0 and capped
  return Math.floor(Math.random() * capped);
}

/**
 * Executes a fetch request with automatic timeout and exponential backoff retry.
 * Emits observable telemetry on retries, timeouts, and terminal failures.
 */
export async function fetchWithRetryAndTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const isRetry = attempt > 0;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${config.timeoutMs}ms`));
    }, config.timeoutMs);

    // Chain caller's abort signal if provided
    if (init?.signal) {
      init.signal.addEventListener("abort", () => controller.abort(init.signal?.reason));
    }

    const mergedInit: RequestInit = {
      ...init,
      signal: controller.signal,
    };

    try {
      const response = await fetch(input, mergedInit);
      clearTimeout(timeoutId);

      // Check if response status is transiently retryable
      if (config.retryOnStatus.includes(response.status) && attempt < config.maxRetries) {
        // Inspect server Retry-After header if supplied
        const retryAfterHeader = response.headers.get("retry-after");
        let delayMs = calculateBackoff(attempt, config.initialDelayMs, config.maxDelayMs);

        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            delayMs = Math.min(parsedSeconds * 1000, config.maxDelayMs);
          }
        }

        recordTelemetry({
          level: "warn",
          category: "network_retry",
          name: "fetch_transient_status",
          success: false,
          metadata: {
            url: urlString,
            status: response.status,
            attempt: attempt + 1,
            maxRetries: config.maxRetries,
            delayMs,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (isRetry) {
        recordTelemetry({
          level: "info",
          category: "network_retry",
          name: "fetch_retry_recovered",
          success: true,
          metadata: {
            url: urlString,
            successfulAttempt: attempt + 1,
          },
        });
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      if (attempt < config.maxRetries) {
        const delayMs = calculateBackoff(attempt, config.initialDelayMs, config.maxDelayMs);

        recordTelemetry({
          level: "warn",
          category: "network_retry",
          name: "fetch_network_error_retry",
          success: false,
          error: error.message,
          metadata: {
            url: urlString,
            attempt: attempt + 1,
            maxRetries: config.maxRetries,
            delayMs,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        recordTelemetry({
          level: "error",
          category: "network_retry",
          name: "fetch_exhausted_retries",
          success: false,
          error: error.message,
          metadata: {
            url: urlString,
            totalAttempts: attempt + 1,
          },
        });
      }
    }
  }

  throw lastError || new Error(`Fetch failed after ${config.maxRetries} retries`);
}
