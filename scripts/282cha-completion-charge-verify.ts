/**
 * 282차 — 최종 생성 크레딧 차감 타이밍 목 검증 (API 0, Supabase RPC를 가짜 함수로 대체).
 *   npx tsx scripts/282cha-completion-charge-verify.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  chargeCompletionCredits,
  COMPLETION_CHARGE_DEADLINE_MARGIN_MS,
  type DeductCreditsRpc,
} from "../lib/cost/completion-charge";
import { getCompletionTokenCost } from "../lib/cost/saas-pricing-config";

let failed = 0;
function check(cond: boolean, msg: string) {
  console.log(cond ? "OK  " : "FAIL", msg);
  if (!cond) failed += 1;
}

const MAX_MS = 300_000;
const T0 = 1_000_000;

/** deduct_credits(plpgsql)와 같은 규칙: 행 잠금으로 직렬화, 잔액 부족 시 예외. */
function mockDb(initialBalance: number) {
  let balance = initialBalance;
  const ledger: { delta: number; reason: string; ref: string }[] = [];
  let lock: Promise<void> = Promise.resolve();
  let calls = 0;
  const rpc: DeductCreditsRpc = (_fn, args) => {
    calls += 1;
    const run = lock.then(async () => {
      await new Promise((r) => setTimeout(r, 5));
      if (balance < args.p_amount) return { error: { message: "insufficient_credits" } };
      balance -= args.p_amount;
      ledger.push({ delta: -args.p_amount, reason: args.p_reason, ref: args.p_reference_id });
      return { error: null };
    });
    lock = run.then(() => undefined);
    return run;
  };
  return {
    rpc,
    get balance() {
      return balance;
    },
    get calls() {
      return calls;
    },
    ledger,
  };
}

/** route.ts 최종 모드 순서 재현: 단계들 → 상품 저장 → 이미지 연결 → 차감 → 200. */
async function simulateFinalGenerate(opts: {
  db: ReturnType<typeof mockDb>;
  throwAt?: "vision" | "icons" | "save";
  elapsedAtChargeMs?: number;
  length?: "short" | "long";
}): Promise<{ status: number }> {
  const requestStartedAt = T0;
  try {
    const stages = ["vision", "copy", "photos", "icons"] as const;
    for (const s of stages) {
      if (opts.throwAt === s) throw new Error(`mock ${s} failure`);
    }
    if (opts.throwAt === "save") return { status: 500 };
    const productId = "prod-mock-1";
    await chargeCompletionCredits({
      getRpc: () => opts.db.rpc,
      userId: "user-mock",
      amount: getCompletionTokenCost(opts.length ?? "long"),
      productId,
      requestStartedAt,
      maxDurationMs: MAX_MS,
      now: () => T0 + (opts.elapsedAtChargeMs ?? 95_000),
    });
    return { status: 200 };
  } catch {
    return { status: 500 };
  }
}

async function main() {
  console.log("── 1) 정상 성공: 차감 1회, 금액 동일");
  for (const length of ["long", "short"] as const) {
    const db = mockDb(500);
    const res = await simulateFinalGenerate({ db, length });
    const cost = getCompletionTokenCost(length);
    check(res.status === 200, `${length}: 200 응답`);
    check(db.calls === 1 && db.ledger.length === 1, `${length}: deduct_credits 1회 (calls=${db.calls})`);
    check(db.ledger[0]?.delta === -cost && db.ledger[0]?.reason === "completion", `${length}: completion -${cost}`);
    check(db.balance === 500 - cost, `${length}: 잔액 500 → ${db.balance}`);
  }

  console.log("── 2) 중간 실패: 차감 0회");
  for (const at of ["vision", "icons", "save"] as const) {
    const db = mockDb(500);
    const res = await simulateFinalGenerate({ db, throwAt: at });
    check(res.status === 500 && db.calls === 0 && db.balance === 500, `${at} 실패 → 500, 차감 0회, 잔액 500`);
  }

  console.log("── 3) 시간 상한 가드 (maxDuration 300s, margin 20s)");
  const edge = MAX_MS - COMPLETION_CHARGE_DEADLINE_MARGIN_MS;
  for (const [elapsed, expectCharge] of [
    [95_000, true],
    [edge - 1_000, true],
    [edge + 1_000, false],
    [301_000, false],
  ] as const) {
    const db = mockDb(500);
    await simulateFinalGenerate({ db, elapsedAtChargeMs: elapsed });
    check(
      (db.calls === 1) === expectCharge,
      `경과 ${elapsed / 1000}s → ${expectCharge ? "차감" : "차감 안 함"} (calls=${db.calls})`,
    );
  }

  console.log("── 4) 차감 실패가 저장된 결과 응답을 막지 않음");
  {
    const r1 = await chargeCompletionCredits({
      getRpc: () => async () => ({ error: { message: "rpc down" } }),
      userId: "u", amount: 100, productId: "p", requestStartedAt: T0, maxDurationMs: MAX_MS, now: () => T0,
    });
    check(r1.status === "failed", "RPC 에러 → status=failed (throw 없음)");
    const r2 = await chargeCompletionCredits({
      getRpc: () => { throw new Error("service role key missing"); },
      userId: "u", amount: 100, productId: "p", requestStartedAt: T0, maxDurationMs: MAX_MS, now: () => T0,
    });
    check(r2.status === "failed", "서비스 클라이언트 생성 실패 → status=failed (throw 없음)");
  }

  console.log("── 5) 동시 요청: 잔액 150에서 100짜리 2건 동시 → 1건만 차감");
  {
    const db = mockDb(150);
    const [a, b] = await Promise.all([
      simulateFinalGenerate({ db }),
      simulateFinalGenerate({ db }),
    ]);
    check(a.status === 200 && b.status === 200, "두 요청 모두 결과 응답(기존 동작 유지)");
    check(db.ledger.length === 1 && db.balance === 50, `ledger 1건, 잔액 150 → ${db.balance} (음수 없음)`);
  }

  console.log("── 6) route.ts 정적 확인");
  {
    const src = readFileSync(path.join(process.cwd(), "app/api/generate/route.ts"), "utf8");
    const direct = (src.match(/rpc\("deduct_credits"/g) ?? []).length;
    const charges = (src.match(/await chargeCompletionCredits\(/g) ?? []).length;
    check(direct === 0, `route에서 deduct_credits 직접 호출 0건 (${direct})`);
    check(charges === 1, `chargeCompletionCredits 호출 1곳 (${charges})`);
    const iSave = src.indexOf('.from("products")');
    const iLink = src.indexOf('.from("product_images")');
    const iCharge = src.indexOf("await chargeCompletionCredits(");
    const afterCharge = src.slice(iCharge).search(/return NextResponse\.json\(\{\s*\.\.\.savedCopy/);
    const iReturn = afterCharge < 0 ? -1 : iCharge + afterCharge;
    check(iSave > 0 && iSave < iCharge, "차감은 상품 저장 이후");
    check(iLink > 0 && iLink < iCharge, "차감은 product_images 연결 이후");
    const tail = src.slice(iCharge, iReturn);
    check(iReturn > iCharge && (tail.match(/\bawait\b/g) ?? []).length === 1, "차감 이후 200 응답까지 다른 await 없음");
    check(/balance < tokenCost/.test(src) && /status: 402/.test(src), "시작 시 잔액 확인(402) 유지");
  }

  console.log(failed === 0 ? "\n[282] ALL PASS" : `\n[282] FAIL ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
