/**
 * 273차 — not-overlapping-hand-region 재시도 분기 검증 (API 0, Anthropic 응답 mock).
 *   npx tsx scripts/273cha-hand-region-retry-verify.ts
 *   LIFESTYLE_GRASP_ENSEMBLE_ENABLED=true npx tsx scripts/273cha-hand-region-retry-verify.ts   (ensemble 진입 확인)
 */
export {};

process.env.ANTHROPIC_API_KEY = "mock-no-network";
process.env.TEST_MODE = "false";
delete process.env.REPLICATE_API_TOKEN;

type Box = [number, number, number, number];
const region = ([x, y, w, h]: Box) => ({ xPct: x, yPct: y, wPct: w, hPct: h });
function reply(placement: Box, hands: Box[], grasps: Box[], confidence: "high" | "low" = "high") {
  return JSON.stringify({
    ...region(placement),
    rotationDeg: 0,
    confidence,
    handsVisible: true,
    gripSpaceVisible: true,
    faceRegion: null,
    handRegions: hands.map(region),
    graspRegions: grasps.map(region),
  });
}

// 269차 실측 박스 그대로 — 손 영역 겹침 35.7% → not-overlapping-hand-region
const HAND_REJECT = reply([35, 40, 28, 35], [[25, 35, 20, 45]], [[38, 48, 12, 18]]);
const GRASP_REJECT = reply([35, 40, 28, 35], [[30, 35, 40, 50]], [[60, 70, 8, 8]]);
const SUCCESS = reply([30, 40, 20, 30], [[25, 35, 30, 45]], [[30, 40, 16, 24]]);
const LOW_CONF = reply([30, 40, 20, 30], [[25, 35, 30, 45]], [[30, 40, 16, 24]], "low");

let queue: string[] = [];
let visionCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes("anthropic.com")) return realFetch(input, init);
  visionCalls += 1;
  const text = queue.shift();
  if (text == null) throw new Error("mock queue empty — 예상보다 많은 Vision 호출");
  return new Response(
    JSON.stringify({
      id: `msg_mock_${visionCalls}`,
      type: "message",
      role: "assistant",
      model: "mock",
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}) as typeof fetch;

let failed = 0;
function check(cond: boolean, msg: string) {
  console.log(cond ? "OK  " : "FAIL", msg);
  if (!cond) failed += 1;
}

async function main() {
  const sharp = (await import("sharp")).default;
  const { detectHandPlacementWithGraspRetry, GRASP_VISION_MAX_ATTEMPTS } = await import(
    "../lib/lifestyle-product-composite"
  );
  const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#888" } }).png().toBuffer();
  const img = { buffer: png, mediaType: "image/png" as const };
  const ensembleOn = process.env.LIFESTYLE_GRASP_ENSEMBLE_ENABLED === "true";

  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...a: unknown[]) => {
    logs.push(a.map(String).join(" "));
    origLog(...a);
  };

  async function run(label: string, replies: string[]) {
    queue = [...replies];
    visionCalls = 0;
    logs.length = 0;
    const r = await detectHandPlacementWithGraspRetry(img, img);
    return { r, calls: visionCalls, handRetryLogs: logs.filter((l) => l.includes("[hand-placement] retry (reason=not-overlapping-hand-region")), label, ensembleLog: logs.some((l) => /\[hand-placement-retry\] ensemble (viaEnsemble|failed)/.test(l)) };
  }

  check(GRASP_VISION_MAX_ATTEMPTS === 3, "GRASP_VISION_MAX_ATTEMPTS = 3 유지");

  const a = await run("A", [HAND_REJECT, HAND_REJECT, SUCCESS]);
  check(a.r.reliable && a.r.visionAttempts === 3 && a.calls === 3, "A: hand-region 거부 2회 → 3회차 성공");
  check(a.handRetryLogs.length === 2, `A: hand-region 재시도 로그 2줄 (${a.handRetryLogs.length})`);
  check(a.r.attemptLogs.map((l) => l.rejectReason ?? "none").join(",") === "not-overlapping-hand-region,not-overlapping-hand-region,none", "A: attemptLogs 사유 구분 유지");

  const b = await run("B", [HAND_REJECT, HAND_REJECT, HAND_REJECT]);
  check(!b.r.reliable && b.calls === 3 && b.r.rejectReason === "not-overlapping-hand-region", "B: hand-region 3회 거부 → 3회로 종료, 사유 유지");
  check(b.handRetryLogs.length === 2, `B: 마지막 시도 뒤엔 재시도 로그 없음 (${b.handRetryLogs.length})`);
  check(b.ensembleLog === ensembleOn, `B: ensemble 진입 = 플래그(${ensembleOn})`);

  const c = await run("C", [GRASP_REJECT, SUCCESS]);
  check(c.r.reliable && c.calls === 2 && c.handRetryLogs.length === 0, "C: grasp-region 재시도 기존 동작 유지, hand 로그 없음");

  const d = await run("D", [LOW_CONF]);
  check(!d.r.reliable && d.calls === 1 && d.r.rejectReason === "confidence-low", "D: 다른 사유(confidence-low)는 재시도 없음");

  const e = await run("E", [GRASP_REJECT, HAND_REJECT, GRASP_REJECT]);
  // ensemble ON이면 병합 grasp + 마지막 시도의 handRegions로 재검증해 통과할 수 있음(기존 설계)
  check(
    e.calls === 3 && e.handRetryLogs.length === 1 && (ensembleOn ? e.r.reliable === Boolean(e.r.viaEnsemble) : !e.r.reliable),
    `E: 혼합 거부 3회 → 상한에서 종료 (reliable=${e.r.reliable}, viaEnsemble=${e.r.viaEnsemble})`,
  );
  check(e.ensembleLog === ensembleOn, `E: 혼합 거부에서도 ensemble 진입 = 플래그(${ensembleOn})`);

  console.log = origLog;
  console.log("API 호출: 0 (Anthropic fetch mock)");
  if (failed > 0) {
    console.log(`${failed} FAIL`);
    process.exit(1);
  }
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
