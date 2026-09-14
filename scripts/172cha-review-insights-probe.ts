/**
 * 172차 — extractReviewInsights 5회 반복 (전: 높은 temp·재시도 없음 / 후: temp0·재시도).
 * DeepSeek 텍스트만. 이미지 API 없음.
 *
 *   npx tsx scripts/172cha-review-insights-probe.ts
 */
import fs from "fs";
import path from "path";
import { extractReviewInsights } from "../lib/review-insights";

const ROOT = path.join(__dirname, "..");
const REVIEW_FILE = path.join(ROOT, "public", "_verify146", "reviews_148cha.txt");
const OUT = path.join(ROOT, "review", "172cha-review-probe.json");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]!]) {
      process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function runPhase(
  label: string,
  opts: { temperature: number; retryEmptyPraises: boolean },
  buf: Buffer,
) {
  const rows: {
    i: number;
    praises: number;
    complaints: number;
    emptyPraises: boolean;
    calls: number;
    cost: number;
  }[] = [];
  let emptyCount = 0;
  let calls = 0;
  let cost = 0;
  for (let i = 1; i <= 5; i++) {
    const r = await extractReviewInsights(buf, "txt", opts);
    const emptyPraises = r.commonPraises.length === 0;
    if (emptyPraises) emptyCount += 1;
    calls += r.deepseekCalls ?? 1;
    cost += r.cost;
    rows.push({
      i,
      praises: r.commonPraises.length,
      complaints: r.commonComplaints.length,
      emptyPraises,
      calls: r.deepseekCalls ?? 1,
      cost: r.cost,
    });
    console.log(
      `[${label}] #${i} praises=${r.commonPraises.length} empty=${emptyPraises} calls=${r.deepseekCalls}`,
    );
  }
  return { label, emptyCount, deepseekCalls: calls, cost, rows };
}

async function main() {
  loadEnvLocal();
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY 필요");
  if (!fs.existsSync(REVIEW_FILE)) throw new Error(`missing ${REVIEW_FILE}`);
  const buf = fs.readFileSync(REVIEW_FILE);

  // 전: 샘플링 변동을 키우기 위해 temp 0.7 + 재시도 없음 (구형 동작 근사)
  const before = await runPhase(
    "before",
    { temperature: 0.7, retryEmptyPraises: false },
    buf,
  );
  // 후: 172차 기본 (temp 0 + empty praises 재시도)
  const after = await runPhase(
    "after",
    { temperature: 0, retryEmptyPraises: true },
    buf,
  );

  const summary = {
    reviewFile: path.relative(ROOT, REVIEW_FILE),
    note: "before=temp0.7·no-retry (레거시 근사), after=temp0·retry (172차). 기존 기본값은 temp0.2·no-retry였음.",
    before: {
      emptyPraisesOutOf5: before.emptyCount,
      deepseekCalls: before.deepseekCalls,
      cost: before.cost,
      rows: before.rows,
    },
    after: {
      emptyPraisesOutOf5: after.emptyCount,
      deepseekCalls: after.deepseekCalls,
      cost: after.cost,
      rows: after.rows,
    },
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
  console.log("[172] wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
