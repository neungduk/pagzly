/**
 * 회귀 — 426차 W7 완성 차감 멱등성. 이미 차감된 상품은 RPC를 부르지 않음, 조회 실패 시 기존 흐름, 기한 초과·RPC 실패 동작 불변, 마이그레이션 구조. 호출 0.
 */
import fs from "node:fs";
import { chargeCompletionCredits, type DeductCreditsRpc } from "../../lib/cost/completion-charge";

export const name = "완성 차감 멱등성 — 이미 차감이면 재차감 없음·조회 실패는 기존 흐름·기한/실패 동작 불변·유니크 인덱스 마이그레이션 구조";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const quiet = async <T>(fn: () => Promise<T>) => {
    const w = console.warn, e = console.error;
    console.warn = () => {}; console.error = () => {};
    try { return await fn(); } finally { console.warn = w; console.error = e; }
  };
  const base = { userId: "u1", amount: 3, productId: "p1", requestStartedAt: 0, maxDurationMs: 300_000, now: () => 1000 };
  let calls = 0;
  const okRpc: DeductCreditsRpc = async () => { calls++; return { error: null }; };
  const failRpc: DeductCreditsRpc = async () => { calls++; return { error: { message: "x" } }; };

  eq("기본(조회 없음) 차감", (await chargeCompletionCredits({ ...base, getRpc: () => okRpc })).status, "charged");
  eq("RPC 1회", calls, 1);

  calls = 0;
  eq("이미 차감 → already_charged", (await quiet(() => chargeCompletionCredits({ ...base, getRpc: () => okRpc, hasCharged: async () => true }))).status, "already_charged");
  eq("RPC 호출 0", calls, 0);

  calls = 0;
  eq("아직 안 차감 → 차감", (await chargeCompletionCredits({ ...base, getRpc: () => okRpc, hasCharged: async () => false })).status, "charged");
  eq("RPC 1회(조회 후)", calls, 1);

  calls = 0;
  eq("조회 예외 → 기존 흐름", (await chargeCompletionCredits({ ...base, getRpc: () => okRpc, hasCharged: async () => { throw new Error("db"); } })).status, "charged");
  eq("RPC 1회(조회 실패)", calls, 1);

  calls = 0;
  eq("기한 초과는 조회·차감 없이 skipped", (await quiet(() => chargeCompletionCredits({ ...base, now: () => 290_000, getRpc: () => okRpc, hasCharged: async () => { throw new Error("호출되면 안 됨"); } }))).status, "skipped_deadline");
  eq("기한 초과 RPC 0", calls, 0);

  eq("RPC 오류 → failed", (await quiet(() => chargeCompletionCredits({ ...base, getRpc: () => failRpc }))).status, "failed");

  // 실패 로그에 상품명이 없고 id만 있다
  const logs: string[] = [];
  const e = console.error; console.error = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
  await chargeCompletionCredits({ ...base, getRpc: () => failRpc });
  console.error = e;
  if (!logs.some((l) => l.startsWith("[charge-failed]") && l.includes("product=p1") && l.includes("user=u1"))) fails.push(`[charge-failed] 로그 형식: ${JSON.stringify(logs)}`);

  const sql = fs.readFileSync("supabase/migrations/20261022120000_credit_ledger_completion_unique.sql", "utf8");
  if (!/create unique index if not exists credit_ledger_completion_ref_uniq/.test(sql)) fails.push("유니크 인덱스 없음");
  if (!/where reason = 'completion' and reference_id is not null/.test(sql)) fails.push("부분 조건 없음");
  if (!/-- {3}drop index if exists public\.credit_ledger_completion_ref_uniq/.test(sql)) fails.push("롤백 주석 없음");
  return fails;
}
