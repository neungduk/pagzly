/**
 * Provider/API 에러 분류 — Worker가 retry 여부를 판단한다.
 * ImageRouter / Provider는 재시도하지 않고 이 타입으로 올린다.
 */

export type AIProviderErrorType =
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "SERVER_ERROR"
  | "INVALID_REQUEST"
  | "AUTH_ERROR"
  | "UNKNOWN";

export class AIProviderError extends Error {
  readonly type: AIProviderErrorType;
  readonly retryable: boolean;
  readonly provider: string;
  readonly model: string;
  readonly statusCode?: number;
  /** true면 provider가 실제로 이미지를 생성·과금했을 가능성 */
  readonly billed: boolean;

  constructor(params: {
    type: AIProviderErrorType;
    retryable: boolean;
    provider: string;
    model: string;
    message: string;
    statusCode?: number;
    billed?: boolean;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "AIProviderError";
    this.type = params.type;
    this.retryable = params.retryable;
    this.provider = params.provider;
    this.model = params.model;
    this.statusCode = params.statusCode;
    this.billed = params.billed ?? false;
    if (params.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = params.cause;
    }
  }

  toJSON() {
    return {
      type: this.type,
      retryable: this.retryable,
      provider: this.provider,
      model: this.model,
      message: this.message,
      statusCode: this.statusCode,
      billed: this.billed,
    };
  }
}

const NON_RETRYABLE_PATTERNS =
  /invalid api key|unauthorized|authentication|forbidden|401|403|invalid request|invalid prompt|invalid image|unsupported resolution|bad request|400|validation|not implemented|unavailable \(missing/i;

const RATE_LIMIT_PATTERNS = /429|throttl|rate limit|too many requests/i;
const TIMEOUT_PATTERNS = /timeout|timed out|ETIMEDOUT|AbortError/i;
const SERVER_PATTERNS = /500|502|503|504|ECONNRESET|fetch failed|network|socket/i;

export function classifyProviderError(
  error: unknown,
  context: { provider: string; model: string },
): AIProviderError {
  if (error instanceof AIProviderError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/\b(401|403|400|404|422|429|500|502|503|504)\b/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : undefined;

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    NON_RETRYABLE_PATTERNS.test(message)
  ) {
    const type: AIProviderErrorType =
      statusCode === 401 || statusCode === 403 || /auth|api key|unauthorized/i.test(message)
        ? "AUTH_ERROR"
        : "INVALID_REQUEST";
    return new AIProviderError({
      type,
      retryable: false,
      provider: context.provider,
      model: context.model,
      message,
      statusCode,
      billed: false,
      cause: error,
    });
  }

  if (statusCode === 429 || RATE_LIMIT_PATTERNS.test(message)) {
    return new AIProviderError({
      type: "RATE_LIMIT",
      retryable: true,
      provider: context.provider,
      model: context.model,
      message,
      statusCode: statusCode ?? 429,
      billed: false,
      cause: error,
    });
  }

  if (TIMEOUT_PATTERNS.test(message)) {
    return new AIProviderError({
      type: "TIMEOUT",
      retryable: true,
      provider: context.provider,
      model: context.model,
      message,
      statusCode,
      billed: false,
      cause: error,
    });
  }

  if (
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    SERVER_PATTERNS.test(message)
  ) {
    return new AIProviderError({
      type: "SERVER_ERROR",
      retryable: true,
      provider: context.provider,
      model: context.model,
      message,
      statusCode,
      billed: false,
      cause: error,
    });
  }

  return new AIProviderError({
    type: "UNKNOWN",
    retryable: false,
    provider: context.provider,
    model: context.model,
    message,
    statusCode,
    billed: false,
    cause: error,
  });
}

/** Worker exponential backoff: attempt 1 fail → 2s, 2 fail → 5s, 3 fail → 15s */
export const WORKER_RETRY_BACKOFF_MS = [2_000, 5_000, 15_000] as const;

export function workerBackoffMs(failedAttemptNumber: number): number {
  const idx = Math.max(0, failedAttemptNumber - 1);
  return WORKER_RETRY_BACKOFF_MS[Math.min(idx, WORKER_RETRY_BACKOFF_MS.length - 1)]!;
}
