/**
 * 426차 R1 — 비용 남용 방어(서버 강제). 순수 로직 + 주입형 RPC라 단위 테스트가 가능하다(실제 DB 호출은 lib/usage-guard-server.ts).
 *  - 킬 스위치: GENERATION_KILL_SWITCH=true면 모든 유료 라우트가 503(재배포 없이 환경 변수만으로, TEST_MODE와 별개).
 *  - 일일 한도: 종류별(draft·photo·text) 호출 수 + 사용자 추정 비용 + 전역 추정 비용을 DB 함수(usage_reserve)로 원자적으로 예약 증가.
 *  - 동시 생성 락: 사용자당 진행 중 /api/generate 1건(최대 10분 만료).
 *  - 폴백: 테이블·함수가 없거나 조회가 실패하면 [usage-guard-unavailable] 로그 후 USAGE_GUARD_FAIL_MODE(open|closed, 기본 open)에 따라 통과/차단.
 *    기본이 open인 이유: 마이그레이션 적용 전 환경과 일시 장애로 정상 사용자를 막지 않기 위해서이며, 운영에서는 마이그레이션 적용 후 closed를 권장한다.
 * 한도 기본값(환경 변수로 조정, 근거는 보고서): draft 10회/일 · photo 60회/일 · text 100회/일 · 사용자 $3/일 · 전역 $50/일.
 */

export type UsageKind = "draft" | "photo" | "text";

/** 호출 1건의 보수적 추정 비용(USD) — 실측(422차 뷰티 $0.68: 초안 약 $0.2, 히어로 배경 $0.16, 인포 $0.10, 감지·보정 소액) 기준 */
export const USAGE_EST_COST_USD = {
  draft: 0.25,
  fullGenerate: 0.3,
  generateBackdrop: 0.16,
  enhanceImage: 0.012,
  sectionBackdrops: 0.01,
  infoBackdrops: 0.1,
  sceneImages: 0.1,
  protectProductImages: 0.002,
  lifestyleComposite: 0.05,
  lifestyleShots: 0.2,
  canvasAiImage: 0.05,
  generateSocial: 0.05,
  autofillDraft: 0.01,
  patchPage: 0.02,
  patchSection: 0.01,
  supportChat: 0.005,
} as const;

export type UsageLimits = {
  draftCallsPerDay: number;
  photoCallsPerDay: number;
  textCallsPerDay: number;
  userDailyCostUsd: number;
  globalDailyCostUsd: number;
  failMode: "open" | "closed";
  killSwitch: boolean;
  requireCreditsForDraft: boolean;
  lockTtlSeconds: number;
};

export const DEFAULT_USAGE_LIMITS: UsageLimits = {
  draftCallsPerDay: 10,
  photoCallsPerDay: 60,
  textCallsPerDay: 100,
  userDailyCostUsd: 3,
  globalDailyCostUsd: 50,
  failMode: "open",
  killSwitch: false,
  requireCreditsForDraft: true,
  lockTtlSeconds: 600,
};

type Env = Record<string, string | undefined>;
const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) && n > 0 ? n : d;
};

export function readUsageLimits(env: Env = process.env): UsageLimits {
  return {
    draftCallsPerDay: Math.floor(num(env.USAGE_DAILY_DRAFT_LIMIT, DEFAULT_USAGE_LIMITS.draftCallsPerDay)),
    photoCallsPerDay: Math.floor(num(env.USAGE_DAILY_PHOTO_LIMIT, DEFAULT_USAGE_LIMITS.photoCallsPerDay)),
    textCallsPerDay: Math.floor(num(env.USAGE_DAILY_TEXT_LIMIT, DEFAULT_USAGE_LIMITS.textCallsPerDay)),
    userDailyCostUsd: num(env.USAGE_DAILY_USER_COST_USD, DEFAULT_USAGE_LIMITS.userDailyCostUsd),
    globalDailyCostUsd: num(env.GLOBAL_DAILY_COST_USD, DEFAULT_USAGE_LIMITS.globalDailyCostUsd),
    failMode: env.USAGE_GUARD_FAIL_MODE === "closed" ? "closed" : "open",
    killSwitch: env.GENERATION_KILL_SWITCH === "true",
    // 기본 켬: "false"일 때만 끈다
    requireCreditsForDraft: env.REQUIRE_CREDITS_FOR_DRAFT !== "false",
    lockTtlSeconds: Math.floor(num(env.GENERATION_LOCK_TTL_SECONDS, DEFAULT_USAGE_LIMITS.lockTtlSeconds)),
  };
}

export const isKillSwitchOn = (env: Env = process.env): boolean => env.GENERATION_KILL_SWITCH === "true";

export const GUARD_MESSAGES = {
  limit: "오늘 사용 한도에 도달했습니다. 내일 다시 이용해 주세요.",
  globalLimit: "현재 이용자가 많아 잠시 후 다시 시도해 주세요.",
  killSwitch: "서비스 점검 중입니다. 잠시 후 다시 이용해 주세요.",
  unavailable: "일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  busy: "이미 진행 중인 생성이 있습니다. 완료된 뒤 다시 시도해 주세요.",
} as const;

export type GuardDeps = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  env?: Env;
  log?: (line: string) => void;
};

export type GuardResult =
  | { allowed: true; reserved: boolean; reason: "ok" | "unavailable-open" }
  | { allowed: false; status: 429 | 503 | 409; reason: string; message: string };

const logOf = (d: GuardDeps) => d.log ?? ((l: string) => console.error(l));

/** 종류별 한도를 예약 증가한다. 킬 스위치가 켜져 있으면 DB를 부르지 않고 503 */
export async function guardUsage(deps: GuardDeps, userId: string, kind: UsageKind, estCostUsd: number): Promise<GuardResult> {
  const env = deps.env ?? process.env;
  const lim = readUsageLimits(env);
  if (lim.killSwitch) return { allowed: false, status: 503, reason: "kill-switch", message: GUARD_MESSAGES.killSwitch };
  const maxCalls = kind === "draft" ? lim.draftCallsPerDay : kind === "photo" ? lim.photoCallsPerDay : lim.textCallsPerDay;
  try {
    const { data, error } = await deps.rpc("usage_reserve", {
      p_user: userId,
      p_kind: kind,
      p_est: estCostUsd,
      p_max_calls: maxCalls,
      p_max_user_cost: lim.userDailyCostUsd,
      p_max_global_cost: lim.globalDailyCostUsd,
    });
    if (error) throw error;
    const r = data as { allowed?: boolean; reason?: string } | null;
    if (!r || typeof r.allowed !== "boolean") throw new Error("usage_reserve: unexpected response");
    if (r.allowed) return { allowed: true, reserved: true, reason: "ok" };
    const reason = String(r.reason ?? "limit");
    return { allowed: false, status: 429, reason, message: reason === "global_cost_limit" ? GUARD_MESSAGES.globalLimit : GUARD_MESSAGES.limit };
  } catch (e) {
    logOf(deps)(`[usage-guard-unavailable] kind=${kind} fail=${lim.failMode} ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    if (lim.failMode === "closed") return { allowed: false, status: 503, reason: "unavailable-closed", message: GUARD_MESSAGES.unavailable };
    return { allowed: true, reserved: false, reason: "unavailable-open" };
  }
}

/** 예약을 되돌린다(호출이 시작되기 전에 실패한 경우). 실패는 무시한다 */
export async function releaseUsage(deps: GuardDeps, userId: string, kind: UsageKind, estCostUsd: number): Promise<void> {
  try {
    await deps.rpc("usage_release", { p_user: userId, p_kind: kind, p_est: estCostUsd });
  } catch {
    /* 보정 실패는 한도를 조금 더 쓴 것으로 남는다 */
  }
}

export type LockResult = { acquired: true; reason: "ok" | "unavailable-open" } | { acquired: false; status: 409 | 503; reason: string; message: string };

/** 사용자당 진행 중 생성 1건. 락 조회가 실패하면 fail 모드에 따라 통과/차단 */
export async function acquireGenerationLock(deps: GuardDeps, userId: string): Promise<LockResult> {
  const env = deps.env ?? process.env;
  const lim = readUsageLimits(env);
  try {
    const { data, error } = await deps.rpc("generation_lock_acquire", { p_user: userId, p_ttl_seconds: lim.lockTtlSeconds });
    if (error) throw error;
    if (data === true) return { acquired: true, reason: "ok" };
    if (data === false) return { acquired: false, status: 409, reason: "busy", message: GUARD_MESSAGES.busy };
    throw new Error("generation_lock_acquire: unexpected response");
  } catch (e) {
    logOf(deps)(`[usage-guard-unavailable] lock fail=${lim.failMode} ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    if (lim.failMode === "closed") return { acquired: false, status: 503, reason: "unavailable-closed", message: GUARD_MESSAGES.unavailable };
    return { acquired: true, reason: "unavailable-open" };
  }
}

export async function releaseGenerationLock(deps: GuardDeps, userId: string): Promise<void> {
  try {
    await deps.rpc("generation_lock_release", { p_user: userId });
  } catch {
    /* 락은 10분 뒤 만료된다 */
  }
}

/** 초안 전 토큰 사전 확인: 잔액이 최종 차감량 미만이면 새 초안을 막는다(REQUIRE_CREDITS_FOR_DRAFT=false면 건너뜀) */
export function draftCreditsVerdict(balance: number | null | undefined, required: number, env: Env = process.env): { ok: true } | { ok: false; balance: number; required: number } {
  if (!readUsageLimits(env).requireCreditsForDraft) return { ok: true };
  const b = typeof balance === "number" && Number.isFinite(balance) ? balance : 0;
  return b >= required ? { ok: true } : { ok: false, balance: b, required };
}
