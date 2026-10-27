/**
 * 461차 — 무거운 검증 도구(브라우저·캡처·외부 이미지 로드)가 폰/클라우드/CI 세션에서 실수로 실행되지 않게 하는 가드.
 * 이유: Supabase 무료 플랜 Cached Egress 초과(실사진 반복 다운로드 추정) — R2 이전이 끝나기 전에는 어디서도 실사진 검증을 하지 않는다. docs/phone-session-rules.md
 * 판단은 **환경변수만** 본다: CLAUDE_CODE_REMOTE=true · CI=true · PZ_PHONE_SESSION=1 중 하나가 있고 PZ_ALLOW_HEAVY=1이 없으면 거부(종료 코드 2).
 * 변수가 하나도 없으면(= 집 PC) **허용**한다 — 판단이 불확실하면 막지 않는 방향이다.
 */
export const HEAVY_BLOCK_EXIT_CODE = 2;

type Env = Record<string, string | undefined>;

export type HeavyDecision = { allowed: true } | { allowed: false; reason: string };

export function heavyDecision(env: Env = process.env): HeavyDecision {
  if (env.PZ_ALLOW_HEAVY === "1") return { allowed: true };
  const hit: string[] = [];
  if ((env.CLAUDE_CODE_REMOTE ?? "").toLowerCase() === "true") hit.push("CLAUDE_CODE_REMOTE=true");
  if ((env.CI ?? "").toLowerCase() === "true") hit.push("CI=true");
  if (env.PZ_PHONE_SESSION === "1") hit.push("PZ_PHONE_SESSION=1");
  if (!hit.length) return { allowed: true };
  return { allowed: false, reason: `폰/클라우드/CI 세션(${hit.join(", ")})에서는 무거운 검증을 실행하지 않습니다 — docs/phone-session-rules.md. 집 PC에서 실행하거나 PZ_ALLOW_HEAVY=1 을 명시하세요.` };
}

/** 거부면 이유 한 줄을 출력하고 종료 코드 2로 끝낸다. 허용이면 아무것도 하지 않는다 */
export function assertHeavyAllowed(label: string, env: Env = process.env, exit: (code: number) => never = process.exit): void {
  const d = heavyDecision(env);
  if (d.allowed) return;
  console.error(`[${label}] ${(d as { reason: string }).reason}`);
  exit(HEAVY_BLOCK_EXIT_CODE);
}

/**
 * 도구 파일 맨 위에서 호출한다. 다른 파일이 가져다 쓰는 경우(회귀의 순수 함수 import 등)에는 아무것도 하지 않도록
 * 진입 파일일 때만 검사한다(isMain = require.main === module).
 */
export function assertHeavyEntry(label: string, isMain: boolean): void {
  if (isMain) assertHeavyAllowed(label);
}
