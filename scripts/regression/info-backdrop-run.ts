/**
 * 회귀 — 417차 인포 AI 배경 호출 실행기. 모킹된 응답(문자열/배열/FileOutput/이상 형식/429/타임아웃/인증 오류)으로
 * 어댑터·폴백·재시도·비용 합산을 검사한다. 실제 호출·네트워크·대기 0(가짜 시계), 유료 0.
 */
import {
  INFO_BACKDROP_TIMEOUT_MS, infoBackdropCostUsd, infoBackdropInput, infoBackdropMapFrom, infoBackdropOutputToBuffer, planInfoBackdrops,
  retryAfterMsOf, runInfoBackdropJob, runInfoBackdropPlan, type InfoBackdropDeps, type InfoBackdropPlanItem,
} from "../../lib/info-backdrop";

export const name = "인포 AI 배경 호출 — 출력 형식 어댑터·429 재시도·타임아웃·인증 중단·비용 합산(모킹)";

const PNG = Buffer.from("89504e470d0a1a0a", "hex");
const fetchBuffer = async (u: string) => (u.includes("broken") ? null : PNG);
const tick = () => new Promise<void>((r) => setImmediate(r));

/** 가짜 시계: sleep(ms)는 시계를 앞으로 돌려 즉시 끝난다(타임아웃은 가장 이른 sleep이 이기도록 정렬) */
function fakeClock() {
  let t = 0;
  const timers: Array<{ at: number; fire: () => void }> = [];
  const sleep = (ms: number) => new Promise<void>((res) => { timers.push({ at: t + ms, fire: res }); });
  const pump = async () => {
    for (let i = 0; i < 200; i += 1) {
      await tick();
      timers.sort((a, b) => a.at - b.at);
      const next = timers.shift();
      if (!next) { await tick(); if (!timers.length) return; continue; }
      t = Math.max(t, next.at);
      next.fire();
    }
  };
  return { now: () => t, sleep, pump };
}

const ITEM_A: InfoBackdropPlanItem = { zone: "points", kind: "A", slug: "ideogram-ai/ideogram-v3-turbo", unitUsd: 0.04 };
const ITEM_B: InfoBackdropPlanItem = { zone: "stat", kind: "B", slug: "black-forest-labs/flux-1.1-pro", unitUsd: 0.05 };
const err429 = (after?: number) => Object.assign(new Error(`Request failed with status 429 Too Many Requests: {"detail":"throttled","status":429${after != null ? `,"retry_after":${after}` : ""}}`), { response: { status: 429 } });

async function job(item: InfoBackdropPlanItem, run: InfoBackdropDeps["run"], extra: Partial<InfoBackdropDeps> = {}) {
  const clock = fakeClock();
  const deps: InfoBackdropDeps = { run, fetchBuffer, sleep: clock.sleep, now: clock.now, ...extra };
  const p = runInfoBackdropJob(item, "p", 1, deps);
  let done = false;
  void p.then(() => { done = true; });
  for (let i = 0; i < 50 && !done; i += 1) await clock.pump();
  return { res: await p, clock };
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // 출력 형식 어댑터
  const fo = (href: string) => ({ url: () => new URL(href) });
  const blobOut = { blob: async () => new Blob([new Uint8Array(PNG)]) };
  const cases: Array<[string, unknown, boolean]> = [
    ["문자열", "https://x/a.png", true],
    ["문자열 배열", ["https://x/a.png"], true],
    ["FileOutput(url)", fo("https://x/a.png"), true],
    ["FileOutput 배열", [fo("https://x/a.png")], true],
    ["FileOutput(blob)", blobOut, true],
    ["바이트", new Uint8Array(PNG), true],
    ["data URL", "data:image/png;base64,AAAA", true],
    ["http 문자열(안전하지 않음)", "http://x/a.png", false],
    ["빈 배열", [], false],
    ["null", null, false],
    ["숫자", 7, false],
    ["알 수 없는 객체", { foo: 1 }, false],
    ["읽을 수 없는 주소", "https://x/broken.png", false],
  ];
  for (const [label, out, expectOk] of cases) {
    const r = await infoBackdropOutputToBuffer(out, fetchBuffer);
    if (!!r.buffer !== expectOk) fails.push(`어댑터 ${label}: 기대 ${expectOk ? "읽힘" : "null"} 실제 ${r.buffer ? "읽힘" : "null"} (${r.format})`);
    if (!r.format) fails.push(`어댑터 ${label}: 형식 라벨 없음`);
  }

  // 성공
  let r = (await job(ITEM_A, async () => ["https://x/a.png"])).res;
  if (!r.ok || !r.billed || r.retries !== 0 || !r.buffer) fails.push(`성공 호출 결과가 다름: ${JSON.stringify({ ...r, buffer: !!r.buffer })}`);

  // 이상 형식: 저장하지 않고 폴백, 과금은 된 것으로(416차 flux-schnell)
  r = (await job(ITEM_A, async () => ({ weird: true }))).res;
  if (r.ok || r.buffer || !r.billed || r.reason !== "unknown-format" || !/unknown/.test(r.format ?? "")) fails.push(`이상 형식 처리가 다름: ${JSON.stringify({ ...r, buffer: !!r.buffer })}`);

  // 이미지 검증 실패(이상 비율)
  r = (await job(ITEM_A, async () => "https://x/a.png", { validate: async () => false })).res;
  if (r.ok || r.reason !== "bad-image" || !r.billed || r.buffer) fails.push("이상 비율이 폴백되지 않음");

  // 429: retry_after 대기 후 재전송(2회 거절 뒤 성공) — 비용은 성공 1회분만
  let calls = 0;
  let res = await job(ITEM_A, async () => { calls += 1; if (calls <= 2) throw err429(8); return "https://x/a.png"; });
  if (!res.res.ok || res.res.retries !== 2 || calls !== 3) fails.push(`429 재전송이 다름: ok=${res.res.ok} retries=${res.res.retries} calls=${calls}`);
  if (res.clock.now() < 2 * 8000) fails.push(`retry_after(8초)를 기다리지 않음: ${res.clock.now()}ms`);
  // retry_after 없음 → 15초
  calls = 0;
  res = await job(ITEM_A, async () => { calls += 1; if (calls === 1) throw err429(); return "https://x/a.png"; });
  if (res.clock.now() < 15000 || !res.res.ok) fails.push(`retry_after 없을 때 15초 대기 안 함: ${res.clock.now()}ms`);
  if (retryAfterMsOf(err429(8)) < 8000 || retryAfterMsOf(err429()) < 15000) fails.push("retryAfterMsOf 값이 작음");
  // 429가 계속: 최초 + 3회 재전송 = 4번 호출 뒤 폴백, 과금 없음
  calls = 0;
  res = await job(ITEM_A, async () => { calls += 1; throw err429(1); });
  if (res.res.ok || res.res.billed || res.res.retries !== 3 || calls !== 4 || res.res.reason !== "rate-limit") fails.push(`429 소진 처리가 다름: calls=${calls} ${JSON.stringify({ ...res.res, buffer: undefined })}`);

  // 타임아웃 40초: 폴백, 이미 시작된 호출이라 과금 가능(보수적)
  res = await job(ITEM_B, () => new Promise<never>(() => undefined));
  if (res.res.ok || res.res.reason !== "timeout" || !res.res.billed || res.res.seconds < INFO_BACKDROP_TIMEOUT_MS / 1000) fails.push(`타임아웃 처리가 다름: ${JSON.stringify({ ...res.res, buffer: undefined })}`);

  // 인증·결제 오류: 재시도 없이 fatal
  calls = 0;
  res = await job(ITEM_A, async () => { calls += 1; throw Object.assign(new Error("402 Payment Required: insufficient credit"), { response: { status: 402 } }); });
  if (!res.res.fatal || res.res.reason !== "auth" || calls !== 1 || res.res.billed) fails.push(`402가 즉시 중단 대상이 아님: calls=${calls}`);
  // 429와 인증 오류는 구분: 429 문구가 있어도 402 상태면 인증 오류가 아니라 429로 본다? — 429 우선이므로 429 응답은 fatal이 아님
  res = await job(ITEM_A, async () => { throw err429(1); });
  if (res.res.fatal) fails.push("429가 fatal로 처리됨");
  // 그 밖의 오류: 재시도 없이 폴백, 과금 안 됨
  calls = 0;
  res = await job(ITEM_A, async () => { calls += 1; throw new Error("NSFW content detected"); });
  if (res.res.ok || calls !== 1 || res.res.reason !== "error") fails.push("일반 오류 폴백 실패");

  // 계획 전체(병렬): 3장 계획에서 한 구간 이상 형식·한 구간 429 소진 → 성공 1장, 맵 1개, 비용은 과금 가능분만
  const plan = planInfoBackdrops(["points", "steps", "stat", "compare", "care"]);
  const clock = fakeClock();
  const seen: string[] = [];
  const deps: InfoBackdropDeps = {
    fetchBuffer, sleep: clock.sleep, now: clock.now,
    run: async (slug, input) => {
      seen.push(`${slug.split("/")[1]}:${String(input.seed)}`);
      if (slug.includes("flux")) throw err429(1);
      if (seen.length === 2) return { weird: 1 };
      return ["https://x/a.png"];
    },
  };
  const p = runInfoBackdropPlan(plan, { material: "울 니트" }, "가디건", deps);
  let done = false;
  void p.then(() => { done = true; });
  for (let i = 0; i < 80 && !done; i += 1) await clock.pump();
  const results = await p;
  if (results.length !== 3) fails.push(`결과 ${results.length} ≠ 3`);
  const okZones = results.filter((x) => x.ok).map((x) => x.zone);
  if (okZones.length !== 1) fails.push(`성공 ${okZones} ≠ 1장`);
  const m = infoBackdropMapFrom(results.map((x) => ({ zone: x.zone, ok: x.ok, url: x.ok ? "https://x/a.png" : null })));
  if (Object.keys(m).length !== 1) fails.push("맵에 실패 구간이 들어감");
  const cost = infoBackdropCostUsd(results);
  // points(A) 성공 0.04 + steps(A) 이상 형식 0.04 + stat(B) 429 소진 0 = 0.08
  if (cost !== 0.08) fails.push(`비용 합산 ${cost} ≠ 0.08(429는 $0)`);
  if (new Set(seen.filter((s) => s.startsWith("ideogram"))).size !== 1) fails.push("같은 상품·종류인데 시드가 다름");

  // 입력 파라미터 이름
  if ("output_format" in infoBackdropInput("A", "p", 1) || !("magic_prompt_option" in infoBackdropInput("A", "p", 1))) fails.push("ideogram 입력 이름 불일치");
  if (!("safety_tolerance" in infoBackdropInput("B", "p", 1))) fails.push("flux-pro 입력 이름 불일치");
  return fails;
}
