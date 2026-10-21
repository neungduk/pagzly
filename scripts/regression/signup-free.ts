/**
 * 회귀 — 427차 가입 무료 = 첫 1회 생성. 지급량=완성 최대 차감량, 완성 후 두 번째 초안 거절, 충전 후 정상, 마이그레이션(100 지급·롤백·기존 잔액 불변), 랜딩/상담봇 문구에 옛 표기 없음. 호출 0.
 */
import fs from "node:fs";
import { SIGNUP_FREE_TOKENS, TOKEN_COST_PER_COMPLETION, CREDIT_PACKS } from "../../lib/cost/saas-pricing-config";
import { draftCreditsVerdict } from "../../lib/usage-guard";
import { LANDING_PRICING_INTRO } from "../../lib/landing-content";

export const name = "가입 무료 첫 1회 — 지급량·두 번째 초안 거절·충전 후 정상·마이그레이션·문구";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const long = TOKEN_COST_PER_COMPLETION.long, short = TOKEN_COST_PER_COMPLETION.short;
  eq("지급량 = 긴 구성 완성 차감량", SIGNUP_FREE_TOKENS, long);
  eq("첫 초안(긴/짧은) 허용", [draftCreditsVerdict(SIGNUP_FREE_TOKENS, long, {}).ok, draftCreditsVerdict(SIGNUP_FREE_TOKENS, short, {}).ok], [true, true]);
  // 긴 구성 완성 후 잔액 0, 짧은 구성 완성 후 잔액 20 → 두 번째 초안 거절
  eq("긴 완성 후 거절", draftCreditsVerdict(SIGNUP_FREE_TOKENS - long, long, {}).ok, false);
  eq("짧은 완성 후 거절(긴/짧은 모두)", [draftCreditsVerdict(SIGNUP_FREE_TOKENS - short, short, {}).ok, draftCreditsVerdict(SIGNUP_FREE_TOKENS - short, long, {}).ok], [false, false]);
  // 소셜 60토큰 후 40 → 거절
  eq("소셜 60 차감 후 초안 거절", draftCreditsVerdict(SIGNUP_FREE_TOKENS - 60, short, {}).ok, false);
  // 충전 후 정상
  const pack = CREDIT_PACKS[0]!;
  eq("팩 충전 후 허용", draftCreditsVerdict(0 + pack.tokens, long, {}).ok, true);
  // 플래그로 끄면 통과
  eq("REQUIRE_CREDITS_FOR_DRAFT=false", draftCreditsVerdict(0, long, { REQUIRE_CREDITS_FOR_DRAFT: "false" }).ok, true);

  const sql = fs.readFileSync("supabase/migrations/20261022130000_signup_free_one_generation.sql", "utf8");
  if (!sql.includes(`grant_credits(new.id, ${SIGNUP_FREE_TOKENS}, 'signup_free'`)) fails.push("마이그레이션 지급량이 상수와 다름");
  if (!/--\s+perform public\.grant_credits\(new\.id, 500, 'signup_free'/.test(sql)) fails.push("롤백 주석 없음");
  if (/update public\.(user_credits|credit_ledger)/i.test(sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n"))) fails.push("기존 잔액을 바꾸는 문장이 있음");

  // 사용자 화면 문구
  for (const f of ["app/page.tsx", "lib/landing-content.ts", "lib/support-chat-prompt.ts"]) {
    const t = fs.readFileSync(f, "utf8");
    if (/무료 토큰/.test(t)) fails.push(`${f}: '무료 토큰' 표기 남음`);
    if (/무료 토큰 500|500개를 드립/.test(t)) fails.push(`${f}: 옛 500토큰 문구`);
  }
  if (!/첫 1회 무료 생성/.test(fs.readFileSync("app/page.tsx", "utf8"))) fails.push("랜딩에 '첫 1회 무료 생성' 없음");
  if (!/첫 1회 무료 생성/.test(LANDING_PRICING_INTRO)) fails.push("상담봇 공식 정보에 무료 혜택 문구 없음");
  return fails;
}
