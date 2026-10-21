/**
 * 426차 R2 — 로그인 전 공개 라우트(support-chat·proxy-image)용 인메모리 슬라이딩 윈도우 제한.
 * ⚠️ 한계: 서버리스에서는 인스턴스마다 메모리가 따로이고 콜드 스타트로 초기화되므로 **완전한 제한이 아니라 1차 완충**이다.
 *   운영에서는 Vercel WAF(Rate Limiting) 또는 Upstash Ratelimit 같은 공유 저장소 기반 제한을 함께 쓰는 것을 권장한다.
 * 외부 서비스 없이 동작하고, 시간·저장소를 주입해 단위 테스트할 수 있다.
 */

export type RateLimitRule = { name: string; windowMs: number; max: number };
export type RateLimitResult = { allowed: true } | { allowed: false; rule: string; retryAfterSec: number };

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private rules: RateLimitRule[], private now: () => number = Date.now, private maxKeys = 5000) {}

  /** key(예: IP)로 한 번 시도. 허용이면 기록하고 true */
  check(key: string): RateLimitResult {
    const t = this.now();
    const longest = Math.max(...this.rules.map((r) => r.windowMs));
    const list = (this.hits.get(key) ?? []).filter((x) => t - x < longest);
    for (const r of this.rules) {
      const inWindow = list.filter((x) => t - x < r.windowMs);
      if (inWindow.length >= r.max) {
        const oldest = Math.min(...inWindow);
        return { allowed: false, rule: r.name, retryAfterSec: Math.max(1, Math.ceil((oldest + r.windowMs - t) / 1000)) };
      }
    }
    list.push(t);
    this.hits.set(key, list);
    if (this.hits.size > this.maxKeys) this.prune(t, longest);
    return { allowed: true };
  }

  private prune(t: number, longest: number) {
    for (const [k, v] of this.hits) {
      if (v.every((x) => t - x >= longest)) this.hits.delete(k);
    }
    // 그래도 많으면 가장 오래된 절반을 버린다(메모리 상한)
    if (this.hits.size > this.maxKeys) {
      const keys = [...this.hits.keys()].slice(0, Math.floor(this.hits.size / 2));
      for (const k of keys) this.hits.delete(k);
    }
  }

  /** 테스트·점검용 */
  size(): number {
    return this.hits.size;
  }
}

/** 요청 헤더에서 클라이언트 IP(프록시 뒤라 x-forwarded-for 첫 값). 없으면 "unknown" */
export function clientIpOf(headers: { get(name: string): string | null }): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = headers.get("x-real-ip");
  return real ? real.trim().slice(0, 64) : "unknown";
}

/** 공개 라우트 기본 규칙(환경 변수 없이 코드 기본값) */
export const SUPPORT_CHAT_RULES: RateLimitRule[] = [
  { name: "minute", windowMs: 60_000, max: 5 },
  { name: "day", windowMs: 86_400_000, max: 30 },
];
export const PROXY_IMAGE_RULES: RateLimitRule[] = [
  { name: "minute", windowMs: 60_000, max: 120 },
  { name: "day", windowMs: 86_400_000, max: 3000 },
];
