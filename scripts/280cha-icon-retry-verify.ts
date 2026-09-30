/**
 * 280차 — 아이콘 재시도/백오프 목 검증 (API 0, Replicate 호출을 가짜 함수로 대체).
 *   npx tsx scripts/280cha-icon-retry-verify.ts
 */
import {
  ICON_RETRY_MAX_ATTEMPTS,
  iconConcurrency,
  iconRetryDelayMs,
  runIconPredictionWithRetry,
} from "../lib/concept-icons";

let failed = 0;
function check(cond: boolean, msg: string) {
  console.log(cond ? "OK  " : "FAIL", msg);
  if (!cond) failed += 1;
}

function apiError(status: number, retryAfter?: string) {
  const err = new Error(`Request failed with status ${status}`) as Error & {
    response: { status: number; headers: Headers };
  };
  err.response = {
    status,
    headers: new Headers(retryAfter ? { "retry-after": retryAfter } : {}),
  };
  return err;
}

async function scenario(
  label: string,
  model: "recraft-v4-svg" | "flux-schnell",
  outcomes: (Error | "ok")[],
) {
  const sleeps: number[] = [];
  let calls = 0;
  let result: string | null = null;
  let thrown: unknown = null;
  try {
    result = await runIconPredictionWithRetry(
      model,
      async () => {
        const o = outcomes[calls];
        calls += 1;
        if (o === undefined) throw new Error("mock outcomes 소진 — 예상보다 많은 호출");
        if (o === "ok") return "https://mock/icon.svg";
        throw o;
      },
      async (ms) => {
        sleeps.push(ms);
      },
    );
  } catch (e) {
    thrown = e;
  }
  console.log(
    `  [${label}] calls=${calls} sleeps=[${sleeps.map((s) => (s / 1000).toFixed(2) + "s").join(", ")}] result=${result ? "ok" : "throw"}`,
  );
  return { calls, sleeps, result, thrown };
}

async function main() {
  const origWarn = console.warn;
  console.warn = () => undefined;

  console.log("— 동시성");
  check(iconConcurrency("recraft-v4-svg") === 2, "recraft-v4-svg 동시성 = 2");
  check(iconConcurrency("recraft-v3") === 2, "recraft-v3 동시성 = 2");
  check(iconConcurrency("flux-schnell") === 6, "flux-schnell 동시성 = 6 (변경 없음)");

  console.log("— 백오프 계산 (random 고정)");
  const e429 = apiError(429);
  check(iconRetryDelayMs("recraft-v4-svg", 1, e429, () => 0) === 5000, "recraft 429 1차 = 5.0s (지터 0)");
  check(iconRetryDelayMs("recraft-v4-svg", 2, e429, () => 0) === 10000, "recraft 429 2차 = 10.0s (지터 0)");
  check(iconRetryDelayMs("recraft-v4-svg", 1, e429, () => 1) === 7000, "recraft 429 1차 = 7.0s (지터 최대)");
  check(iconRetryDelayMs("recraft-v4-svg", 2, e429, () => 1) === 12000, "recraft 429 2차 = 12.0s (지터 최대)");
  check(
    iconRetryDelayMs("recraft-v4-svg", 1, apiError(429, "9"), () => 0) === 9000,
    "Retry-After 9s가 최소 백오프보다 크면 9.0s",
  );
  check(
    iconRetryDelayMs("recraft-v4-svg", 1, apiError(429, "60"), () => 0) === 12000,
    "Retry-After 60s는 상한 12.0s로 제한",
  );
  check(
    iconRetryDelayMs("recraft-v4-svg", 1, apiError(429, "not-a-number"), () => 0) === 5000,
    "Retry-After 파싱 불가면 최소 백오프 5.0s",
  );
  check(iconRetryDelayMs("recraft-v4-svg", 1, apiError(503), () => 0) === 2500, "recraft 503은 기존 2.5s 유지");
  check(iconRetryDelayMs("flux-schnell", 1, e429, () => 0) === 2500, "flux-schnell 429는 기존 2.5s 유지");
  check(iconRetryDelayMs("flux-schnell", 2, e429, () => 1) === 6500, "flux-schnell 2차 최대 6.5s (기존 공식)");

  console.log("— 재시도 루프 (가짜 호출)");
  const s1 = await scenario("recraft 429 계속", "recraft-v4-svg", [e429, e429, e429]);
  check(s1.calls === ICON_RETRY_MAX_ATTEMPTS && s1.thrown === e429, "429 계속 → 3회 호출 후 원래 에러 throw (상위에서 flux 폴백)");
  check(s1.sleeps.length === 2, "대기는 호출 사이 2번만 (마지막 실패 뒤 대기 없음)");
  check(s1.sleeps[0] >= 5000 && s1.sleeps[0] <= 7000, "1차 대기 5~7s");
  check(s1.sleeps[1] >= 10000 && s1.sleeps[1] <= 12000, "2차 대기 10~12s");

  const s2 = await scenario("recraft 429→429→성공", "recraft-v4-svg", [e429, e429, "ok"]);
  check(s2.calls === 3 && s2.result === "https://mock/icon.svg", "3번째 성공 시 결과 반환");

  const s3 = await scenario("recraft 400 (비재시도)", "recraft-v4-svg", [apiError(400)]);
  check(s3.calls === 1 && s3.sleeps.length === 0 && s3.thrown != null, "400은 재시도 없이 즉시 throw");

  const s4 = await scenario("recraft Retry-After 30", "recraft-v4-svg", [apiError(429, "30"), "ok"]);
  check(s4.sleeps[0] === 12000, "Retry-After 30s → 12s 상한 대기 후 재시도");

  // 최악 시간: 동시 2, recraft 10장 = 5라운드. 라운드당 = 대기 합 최대 + 폴백 1회
  const worstSleep = iconRetryDelayMs("recraft-v4-svg", 1, apiError(429, "60"), () => 1) +
    iconRetryDelayMs("recraft-v4-svg", 2, apiError(429, "60"), () => 1);
  const FALLBACK_SEC = 10;
  const worstIconsSec = Math.ceil(10 / iconConcurrency("recraft-v4-svg")) * (worstSleep / 1000 + FALLBACK_SEC);
  console.log(`  최악 추정: 라운드당 대기 ${worstSleep / 1000}s + 폴백 ${FALLBACK_SEC}s × 5라운드 = ${worstIconsSec}s`);
  check(worstIconsSec + 35 < 300, `최악 아이콘 ${worstIconsSec}s + 기타 단계 ~35s < 300s`);

  const s5 = await scenario("flux 네트워크 오류→성공", "flux-schnell", [new Error("fetch failed"), "ok"]);
  check(s5.calls === 2 && s5.sleeps[0] >= 2500 && s5.sleeps[0] <= 4000, "네트워크 오류는 기존 2.5~4.0s 백오프");

  console.warn = origWarn;
  console.log(failed === 0 ? "\nALL PASS" : `\nFAILED ${failed}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main();
