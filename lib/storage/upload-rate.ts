import { SlidingWindowLimiter, type RateLimitRule } from "@/lib/rate-limit";
import { UPLOAD_URL_RULES } from "@/lib/storage/policy";

/** 기존 문구(support-chat 의 429 와 같다) — 새 문구 없음 */
export const MSG_TOO_MANY = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";

export const createUploadLimiter = (now?: () => number): SlidingWindowLimiter => new SlidingWindowLimiter([...UPLOAD_URL_RULES] as RateLimitRule[], now);

/** 허용이면 null, 초과면 429 응답에 쓸 값. userId 단위로 센다 */
export function uploadRateGate(limiter: SlidingWindowLimiter, userId: string): { status: 429; body: { error: string; code: string }; retryAfterSec: number } | null {
  const r = limiter.check(userId);
  if (r.allowed) return null;
  return { status: 429, body: { error: MSG_TOO_MANY, code: `rate-${r.rule}` }, retryAfterSec: r.retryAfterSec };
}
