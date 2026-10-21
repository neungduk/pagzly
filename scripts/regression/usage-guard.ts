/**
 * 회귀 — 426차 R1·R2 비용 남용 방어. 한도 기본값·환경 변수, 킬 스위치(DB 미호출), 정상 통과·한도 초과(사용자 호출/비용/전역), 폴백 open/closed(마이그레이션 없음·RPC 오류·이상 응답),
 * 동시 생성 락(획득·거절·만료·오류), 초안 전 토큰 사전 확인, IP 슬라이딩 윈도우, 마이그레이션 SQL의 구조(함수마다 권한·롤백). 호출 0.
 */
import fs from "node:fs";
import {
  DEFAULT_USAGE_LIMITS, GUARD_MESSAGES, USAGE_EST_COST_USD, acquireGenerationLock, draftCreditsVerdict, guardUsage, isKillSwitchOn, readUsageLimits, releaseGenerationLock, releaseUsage,
  type GuardDeps,
} from "../../lib/usage-guard";
import { PROXY_IMAGE_RULES, SUPPORT_CHAT_RULES, SlidingWindowLimiter, clientIpOf } from "../../lib/rate-limit";

export const name = "비용 남용 방어 — 한도·킬 스위치·폴백(open/closed)·동시 생성 락·초안 토큰 확인·IP 제한·마이그레이션 구조";

type Rpc = GuardDeps["rpc"];
/** usage_reserve·락 함수의 의미를 흉내 낸 가짜 DB(SQL 자체가 아니라 호출부 동작을 검증) */
function fakeDb(now: () => number = Date.now) {
  const usage = { draft: 0, photo: 0, text: 0, cost: 0, global: 0 };
  let lockUntil = 0;
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const rpc: Rpc = async (fn, args) => {
    calls.push({ fn, args });
    if (fn === "usage_reserve") {
      const kind = args.p_kind as "draft" | "photo" | "text";
      const est = Number(args.p_est);
      if (usage[kind] + 1 > Number(args.p_max_calls)) return { data: { allowed: false, reason: "user_calls_limit" }, error: null };
      if (usage.cost + est > Number(args.p_max_user_cost)) return { data: { allowed: false, reason: "user_cost_limit" }, error: null };
      if (usage.global + est > Number(args.p_max_global_cost)) return { data: { allowed: false, reason: "global_cost_limit" }, error: null };
      usage[kind] += 1; usage.cost += est; usage.global += est;
      return { data: { allowed: true, reason: "ok" }, error: null };
    }
    if (fn === "usage_release") { const k = args.p_kind as "draft" | "photo" | "text"; usage[k] = Math.max(0, usage[k] - 1); usage.cost = Math.max(0, usage.cost - Number(args.p_est)); return { data: null, error: null }; }
    if (fn === "generation_lock_acquire") {
      if (lockUntil > now()) return { data: false, error: null };
      lockUntil = now() + Number(args.p_ttl_seconds) * 1000;
      return { data: true, error: null };
    }
    if (fn === "generation_lock_release") { lockUntil = 0; return { data: null, error: null }; }
    return { data: null, error: { message: `unknown ${fn}` } };
  };
  return { rpc, usage, calls, setLock: (t: number) => { lockUntil = t; } };
}
const missing: Rpc = async () => ({ data: null, error: { code: "42883", message: 'function public.usage_reserve(uuid, text, numeric, integer, numeric, numeric) does not exist' } });
const throwing: Rpc = async () => { throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured"); };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
  const logs: string[] = [];
  const base = (rpc: Rpc, env: Record<string, string | undefined> = {}): GuardDeps => ({ rpc, env, log: (l) => logs.push(l) });
  const U = "00000000-0000-0000-0000-000000000001";

  // ── 기본값·환경 변수 ──
  eq("기본 한도", readUsageLimits({}), DEFAULT_USAGE_LIMITS);
  eq("기본값 표(보고서)", [DEFAULT_USAGE_LIMITS.draftCallsPerDay, DEFAULT_USAGE_LIMITS.photoCallsPerDay, DEFAULT_USAGE_LIMITS.userDailyCostUsd, DEFAULT_USAGE_LIMITS.globalDailyCostUsd, DEFAULT_USAGE_LIMITS.failMode], [10, 60, 3, 50, "open"]);
  eq("환경 변수 조정", readUsageLimits({ USAGE_DAILY_DRAFT_LIMIT: "3", USAGE_DAILY_PHOTO_LIMIT: "5", GLOBAL_DAILY_COST_USD: "12.5", USAGE_GUARD_FAIL_MODE: "closed", REQUIRE_CREDITS_FOR_DRAFT: "false", GENERATION_KILL_SWITCH: "true" }).draftCallsPerDay, 3);
  const adj = readUsageLimits({ USAGE_DAILY_PHOTO_LIMIT: "5", GLOBAL_DAILY_COST_USD: "12.5", USAGE_GUARD_FAIL_MODE: "closed", REQUIRE_CREDITS_FOR_DRAFT: "false", GENERATION_KILL_SWITCH: "true" });
  eq("조정 값", [adj.photoCallsPerDay, adj.globalDailyCostUsd, adj.failMode, adj.requireCreditsForDraft, adj.killSwitch], [5, 12.5, "closed", false, true]);
  eq("잘못된 값은 기본으로", readUsageLimits({ USAGE_DAILY_DRAFT_LIMIT: "abc", USAGE_DAILY_PHOTO_LIMIT: "-4", USAGE_GUARD_FAIL_MODE: "maybe" }).draftCallsPerDay, 10);
  eq("failMode는 closed만 닫힘", [readUsageLimits({ USAGE_GUARD_FAIL_MODE: "maybe" }).failMode, readUsageLimits({ USAGE_GUARD_FAIL_MODE: "open" }).failMode], ["open", "open"]);
  eq("킬 스위치는 정확히 true만", [isKillSwitchOn({}), isKillSwitchOn({ GENERATION_KILL_SWITCH: "1" }), isKillSwitchOn({ GENERATION_KILL_SWITCH: "true" })], [false, false, true]);
  if (Object.values(USAGE_EST_COST_USD).some((v) => !(v > 0))) fails.push("추정 비용 중 0 이하");

  // ── 킬 스위치: DB를 부르지 않고 503 ──
  {
    const db = fakeDb();
    const r = await guardUsage(base(db.rpc, { GENERATION_KILL_SWITCH: "true" }), U, "photo", 0.1);
    eq("킬 스위치", [r.allowed, (r as { status?: number }).status, (r as { message?: string }).message, db.calls.length], [false, 503, GUARD_MESSAGES.killSwitch, 0]);
  }

  // ── 정상 통과와 한도 초과 ──
  {
    const db = fakeDb();
    const d = base(db.rpc);
    const first = await guardUsage(d, U, "draft", 0.25);
    eq("정상 통과", [first.allowed, (first as { reserved?: boolean }).reserved], [true, true]);
    eq("RPC 인자", db.calls[0]?.args, { p_user: U, p_kind: "draft", p_est: 0.25, p_max_calls: 10, p_max_user_cost: 3, p_max_global_cost: 50 });
    for (let i = 0; i < 9; i++) await guardUsage(d, U, "draft", 0.25);
    const over = await guardUsage(d, U, "draft", 0.25);
    eq("11번째 초안 거절(429)", [over.allowed, (over as { status?: number }).status, (over as { reason?: string }).reason, (over as { message?: string }).message], [false, 429, "user_calls_limit", GUARD_MESSAGES.limit]);
    eq("정상 사용(10회 이내)은 모두 통과", db.usage.draft, 10);
    // 사진 호출은 별도 카운터
    const photo = await guardUsage(d, U, "photo", 0.16);
    eq("종류별 카운터(사진은 따로)", photo.allowed, true);
  }
  {
    const db = fakeDb();
    const d = base(db.rpc, { USAGE_DAILY_USER_COST_USD: "0.3" });
    await guardUsage(d, U, "photo", 0.16);
    const r = await guardUsage(d, U, "photo", 0.16);
    eq("사용자 비용 상한", [r.allowed, (r as { reason?: string }).reason], [false, "user_cost_limit"]);
  }
  {
    const db = fakeDb();
    const d = base(db.rpc, { GLOBAL_DAILY_COST_USD: "0.2" });
    await guardUsage(d, U, "photo", 0.16);
    const r = await guardUsage(d, "other-user", "photo", 0.16);
    eq("전역 비용 상한(다른 사용자도 거절, 전용 문구)", [r.allowed, (r as { status?: number }).status, (r as { message?: string }).message], [false, 429, GUARD_MESSAGES.globalLimit]);
  }
  {
    const db = fakeDb();
    await guardUsage(base(db.rpc), U, "photo", 0.16);
    await releaseUsage(base(db.rpc), U, "photo", 0.16);
    eq("예약 되돌리기", [db.usage.photo, db.usage.cost], [0, 0]);
    await releaseUsage(base(throwing), U, "photo", 0.16); // 실패는 무시
  }

  // ── 폴백: 마이그레이션 없음·오류·이상 응답 ──
  for (const [label, rpc] of [["함수 없음(마이그레이션 미적용)", missing], ["service-role 키 없음(예외)", throwing], ["이상 응답(null)", async () => ({ data: null, error: null })]] as const) {
    logs.length = 0;
    const open = await guardUsage(base(rpc), U, "photo", 0.1);
    eq(`${label} → open`, [open.allowed, (open as { reserved?: boolean }).reserved, (open as { reason?: string }).reason], [true, false, "unavailable-open"]);
    if (!logs.some((l) => l.includes("[usage-guard-unavailable]"))) fails.push(`${label}: 경보 로그 없음`);
    const closed = await guardUsage(base(rpc, { USAGE_GUARD_FAIL_MODE: "closed" }), U, "photo", 0.1);
    eq(`${label} → closed`, [closed.allowed, (closed as { status?: number }).status, (closed as { message?: string }).message], [false, 503, GUARD_MESSAGES.unavailable]);
  }
  if (logs.some((l) => /service_role|SERVICE_ROLE_KEY=/.test(l) && /[A-Za-z0-9]{30,}/.test(l))) fails.push("로그에 키 값이 있음");

  // ── 동시 생성 락 ──
  {
    let t = 1_000_000;
    const db = fakeDb(() => t);
    const d = base(db.rpc);
    const a = await acquireGenerationLock(d, U);
    eq("락 획득", [a.acquired, db.calls[0]?.args], [true, { p_user: U, p_ttl_seconds: 600 }]);
    const b = await acquireGenerationLock(d, U);
    eq("진행 중이면 409", [b.acquired, (b as { status?: number }).status, (b as { message?: string }).message], [false, 409, GUARD_MESSAGES.busy]);
    t += 601_000; // 10분 뒤 만료
    eq("락 만료 후 다시 획득", (await acquireGenerationLock(d, U)).acquired, true);
    await releaseGenerationLock(d, U);
    eq("해제 후 즉시 획득", (await acquireGenerationLock(d, U)).acquired, true);
    eq("TTL 환경 변수", (await acquireGenerationLock(base(fakeDb().rpc, { GENERATION_LOCK_TTL_SECONDS: "120" }), U)).acquired, true);
    for (const [label, rpc] of [["함수 없음", missing], ["예외", throwing]] as const) {
      const o = await acquireGenerationLock(base(rpc), U);
      const c = await acquireGenerationLock(base(rpc, { USAGE_GUARD_FAIL_MODE: "closed" }), U);
      eq(`락 ${label}: open 통과·closed 503`, [o.acquired, c.acquired, (c as { status?: number }).status], [true, false, 503]);
    }
    await releaseGenerationLock(base(throwing), U); // 실패 무시
  }

  // ── 초안 전 토큰 사전 확인 ──
  eq("잔액 부족 → 거절", draftCreditsVerdict(50, 80, {}), { ok: false, balance: 50, required: 80 });
  eq("잔액 = 필요량 → 통과", draftCreditsVerdict(80, 80, {}), { ok: true });
  eq("잔액 충분 → 통과(기존 흐름 불변)", draftCreditsVerdict(500, 100, {}), { ok: true });
  eq("잔액 없음(null)·NaN → 0으로 거절", [draftCreditsVerdict(null, 80, {}).ok, draftCreditsVerdict(Number.NaN, 80, {}).ok, draftCreditsVerdict(undefined, 80, {}).ok], [false, false, false]);
  eq("REQUIRE_CREDITS_FOR_DRAFT=false → 건너뜀", draftCreditsVerdict(0, 80, { REQUIRE_CREDITS_FOR_DRAFT: "false" }), { ok: true });

  // ── IP 슬라이딩 윈도우(공개 라우트) ──
  {
    let t = 0;
    const lim = new SlidingWindowLimiter(SUPPORT_CHAT_RULES, () => t);
    const results = Array.from({ length: 6 }, () => lim.check("1.1.1.1"));
    eq("분당 5회 허용·6번째 거절", [results.filter((r) => r.allowed).length, (results[5] as { rule?: string }).rule], [5, "minute"]);
    eq("다른 IP는 영향 없음", lim.check("2.2.2.2").allowed, true);
    const denied = results[5] as { retryAfterSec?: number };
    if (!(denied.retryAfterSec! >= 1 && denied.retryAfterSec! <= 60)) fails.push(`Retry-After 범위: ${denied.retryAfterSec}`);
    t += 61_000;
    eq("1분 뒤 다시 허용", lim.check("1.1.1.1").allowed, true);
    // 일 한도 30회
    t = 0;
    const day = new SlidingWindowLimiter(SUPPORT_CHAT_RULES, () => t);
    let ok = 0;
    for (let i = 0; i < 40; i++) { t += 13_000; if (day.check("3.3.3.3").allowed) ok += 1; }
    eq("일 30회 상한", ok, 30);
    eq("프록시 규칙", PROXY_IMAGE_RULES.map((r) => [r.name, r.max]), [["minute", 120], ["day", 3000]]);
    // 메모리 상한
    const small = new SlidingWindowLimiter([{ name: "m", windowMs: 1000, max: 5 }], () => t, 50);
    for (let i = 0; i < 500; i++) { t += 1; small.check(`ip-${i}`); }
    if (small.size() > 120) fails.push(`키가 계속 늘어남: ${small.size()}`);
  }
  eq("IP 추출", [clientIpOf(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" })), clientIpOf(new Headers({ "x-real-ip": "8.8.8.8" })), clientIpOf(new Headers())], ["9.9.9.9", "8.8.8.8", "unknown"]);

  // ── 마이그레이션 SQL 구조(문법 검사 도구 대신 구조 점검: 함수마다 권한·롤백, 달러 인용부호·괄호 균형) ──
  {
    const sql = fs.readFileSync("supabase/migrations/20261022100000_usage_guard.sql", "utf8");
    const fns = [...sql.matchAll(/create or replace function public\.(\w+)\(/g)].map((m) => m[1]!);
    eq("함수 4개", fns.sort(), ["generation_lock_acquire", "generation_lock_release", "usage_release", "usage_reserve"]);
    for (const f of fns) {
      if (!new RegExp(`revoke all on function public\\.${f}\\(`).test(sql)) fails.push(`${f}: revoke 없음`);
      if (!new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to service_role`).test(sql)) fails.push(`${f}: service_role grant 없음`);
      if (!new RegExp(`-- drop function if exists public\\.${f}\\(`).test(sql)) fails.push(`${f}: 롤백 주석 없음`);
      if (/to (authenticated|anon)\b/.test(sql.split(`public.${f}(`).slice(1).join("")) && /grant execute[^;]*to (authenticated|anon)/.test(sql)) fails.push(`${f}: authenticated/anon에 EXECUTE 부여`);
    }
    for (const t of ["user_daily_usage", "global_daily_usage", "generation_locks"]) {
      if (!new RegExp(`alter table public\\.${t} enable row level security`).test(sql)) fails.push(`${t}: RLS 없음`);
      if (!new RegExp(`-- drop table if exists public\\.${t}`).test(sql)) fails.push(`${t}: 롤백 주석 없음`);
    }
    eq("$$ 짝", (sql.match(/\$\$/g) ?? []).length % 2, 0);
    const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    eq("괄호 균형", (code.match(/\(/g) ?? []).length, (code.match(/\)/g) ?? []).length);
    if (/insert into public\.user_daily_usage[^;]*\n[^;]*to authenticated/.test(sql) || /create policy[^;]*for (insert|update|delete)/i.test(sql)) fails.push("클라이언트 insert/update/delete 정책이 있음");
  }
  return fails;
}
