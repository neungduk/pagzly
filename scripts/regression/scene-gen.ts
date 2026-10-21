/**
 * 회귀 — 422차 뷰티 인물 사용 컷 생성 연결(모킹, 호출 0). 출력 형식 13종·429 재시도·타임아웃 60초/대기 45초·401/402 즉시 중단·일반 오류 재시도 없음·
 * 비용 합산 단일 반영·상한(2장·$0.10)·크기 정보 없음→슬롯 비움·성별·타깃 매핑·참조 사진 선택·프롬프트 내용·호출 조건(뷰티·flag·토큰·TEST_MODE).
 */
import {
  GENERATED_SCENE_SLOTS, SCENE_GEN_CAP_USD, SCENE_GEN_EXTRA_WAIT_MS, SCENE_GEN_MAX_COUNT, SCENE_GEN_MODEL, SCENE_GEN_TIMEOUT_MS,
  applySceneCost, buildGeneratedScenePrompt, pickSceneReferences, planSceneGeneration, runSceneGenJob, runSceneGeneration, sceneGenCostUsd,
  sceneGenInput, sceneImageMapFrom, sceneModelFromTarget, sceneProductOf, type SceneGenDeps, type SceneGenInput,
} from "../../lib/scene-image-gen";
import { SCENE_UNIT_USD } from "../../lib/scene-images";
import { mergeDraftAndPhotoCost } from "../../lib/cost/merge-photo-cost";

export const name = "뷰티 인물 사용 컷 생성 연결 — 출력 형식 13종·429·타임아웃·인증 중단·비용 단일 반영·상한·크기 없음→비움·타깃 매핑·참조 선택";

const PNG = Buffer.from("89504e470d0a1a0a", "hex");
const BEAUTY = "화장품/뷰티";
const base = (o: Partial<SceneGenInput> = {}): SceneGenInput => ({
  category: BEAUTY, productName: "카멜리아 에센스 미스트", targetCustomer: "20~30대 여성", sizeHint: "30mL", heightCm: null,
  hasToken: true, testMode: false, styleEnabled: true,
  refs: [{ tags: ["정면", "단독"] }, { tags: ["손", "들기"] }, { tags: ["클로즈업", "라벨"] }],
  ...o,
});

type TestDeps = SceneGenDeps & { sleeps: number[]; runs: number };
function deps(run: SceneGenDeps["run"], over: Partial<SceneGenDeps> = {}): TestDeps {
  const t: TestDeps = {
    sleeps: [],
    runs: 0,
    run: (slug, input) => { t.runs += 1; return run(slug, input); },
    fetchBuffer: async () => PNG,
    // 타임아웃용 sleep(60초)만 짧게 흘려 보내 경쟁에서 이기게 한다. 429 대기는 즉시 반환
    sleep: async (ms) => { t.sleeps.push(ms); if (ms >= SCENE_GEN_TIMEOUT_MS) await new Promise((r) => setTimeout(r, 15)); },
    now: () => Date.now(),
    ...over,
  };
  return t;
}
const err = (msg: string, status?: number) => Object.assign(new Error(msg), status ? { response: { status } } : {});

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };

  // 상수
  eq("모델", SCENE_GEN_MODEL, "bytedance/seedream-4");
  eq("타임아웃·대기", [SCENE_GEN_TIMEOUT_MS, SCENE_GEN_EXTRA_WAIT_MS], [60_000, 45_000]);
  eq("슬롯", [...GENERATED_SCENE_SLOTS], ["use-person", "use-hand-mist"]);
  eq("상한", [SCENE_GEN_MAX_COUNT, SCENE_GEN_CAP_USD, SCENE_UNIT_USD], [2, 0.1, 0.05]);
  if (SCENE_GEN_MAX_COUNT * SCENE_UNIT_USD > SCENE_GEN_CAP_USD + 1e-9) fails.push("최대 장수 × 단가가 상한을 넘음");
  const inp = sceneGenInput("p", ["a", "b"]);
  if ("seed" in inp || inp.aspect_ratio !== "3:4" || !Array.isArray(inp.image_input)) fails.push("seedream 입력 형식이 다름(seed 없음·3:4·image_input 배열)");

  // 출력 형식 13종 — 읽히는 9종은 ok, 못 읽는 4종은 과금 기록 + 폴백
  const url = "https://example.com/a.png";
  const formats: Array<[string, unknown, boolean]> = [
    ["문자열 URL", url, true],
    ["문자열 배열", [url], true],
    ["data URI", "data:image/png;base64,AAAA", true],
    ["FileOutput(url→URL)", { url: () => new URL(url) }, true],
    ["FileOutput(url→문자열)", { url: () => url }, true],
    ["FileOutput(blob)", { blob: async () => new Blob([PNG]) }, true],
    ["바이트", new Uint8Array(PNG), true],
    ["객체(url 문자열)", { url }, true],
    ["FileOutput 배열", [{ url: () => new URL(url) }], true],
    ["빈 배열", [], false],
    ["null", null, false],
    ["숫자", 42, false],
    ["지원 안 하는 문자열", "ftp://x/y", false],
  ];
  if (formats.length !== 13) fails.push("출력 형식 케이스가 13개가 아님");
  for (const [label, out, readable] of formats) {
    const d = deps(async () => out);
    const r = await runSceneGenJob("use-person", "p", ["r"], d);
    if (readable && !(r.ok && r.billed && r.buffer)) fails.push(`${label}: 읽혀야 하는데 실패(${r.reason})`);
    if (!readable && !(!r.ok && r.billed && r.reason === "unknown-format")) fails.push(`${label}: 못 읽으면 과금 기록 + 폴백이어야 함(${JSON.stringify({ ok: r.ok, billed: r.billed, reason: r.reason })})`);
    if (d.runs !== 1) fails.push(`${label}: 같은 호출을 반복함(${d.runs}회)`);
  }

  // 429 — retry_after(+0.5초)로 재전송, 과금 0, 최대 3회
  {
    let n = 0;
    const d = deps(async () => { n += 1; if (n <= 2) throw err('429 Too Many Requests {"retry_after": 3}', 429); return url; });
    const r = await runSceneGenJob("use-person", "p", ["r"], d);
    if (!(r.ok && r.retries === 2 && r.billed)) fails.push(`429 두 번 뒤 성공이 아님: ${JSON.stringify({ ok: r.ok, retries: r.retries })}`);
    eq("429 대기(ms)", d.sleeps.filter((s) => s < SCENE_GEN_TIMEOUT_MS), [3500, 3500]);
    const d2 = deps(async () => { throw err("429 too many requests", 429); });
    const r2 = await runSceneGenJob("use-person", "p", ["r"], d2);
    eq("429 소진", [r2.ok, r2.billed, r2.reason, r2.retries, d2.runs], [false, false, "rate-limit", 3, 4]);
    eq("429 기본 대기 15초+0.5", d2.sleeps.filter((s) => s < SCENE_GEN_TIMEOUT_MS)[0], 15500);
  }
  // 401/402/403 즉시 중단(과금 0, 재시도 없음), 그 밖의 오류는 재시도 없이 폴백
  for (const [label, e] of [["401", err("Unauthorized", 401)], ["402", err("Payment Required", 402)], ["403", err("403 forbidden", 403)]] as const) {
    const d = deps(async () => { throw e; });
    const r = await runSceneGenJob("use-person", "p", ["r"], d);
    eq(`${label} 인증`, [r.ok, r.billed, r.fatal, r.reason, d.runs], [false, false, true, "auth", 1]);
  }
  {
    const d = deps(async () => { throw err("boom 500", 500); });
    const r = await runSceneGenJob("use-person", "p", ["r"], d);
    eq("일반 오류", [r.ok, r.billed, r.reason, d.runs], [false, false, "error", 1]);
  }
  // 타임아웃 60초 — 호출이 끝나지 않으면 과금 가능으로 기록하고 폴백
  {
    const d = deps(() => new Promise(() => undefined));
    const r = await runSceneGenJob("use-person", "p", ["r"], d);
    eq("타임아웃", [r.ok, r.billed, r.reason], [false, true, "timeout"]);
    if (!d.sleeps.includes(SCENE_GEN_TIMEOUT_MS)) fails.push("타임아웃이 60초가 아님");
  }
  // 이상 비율 — 과금 가능 + 폴백
  {
    const d = deps(async () => url, { validate: async () => false });
    const r = await runSceneGenJob("use-person", "p", ["r"], d);
    eq("이상 비율", [r.ok, r.billed, r.reason], [false, true, "bad-image"]);
  }

  // 비용: 과금 가능 호출 수 × 단가, 단일 반영
  eq("비용 0", sceneGenCostUsd([{ billed: false }, { billed: false }]), 0);
  eq("비용 1", sceneGenCostUsd([{ billed: true }, { billed: false }]), 0.05);
  eq("비용 2", sceneGenCostUsd([{ billed: true }, { billed: true }]), 0.1);
  {
    const a = applySceneCost(1, { claude: 0.2 }, 0.1);
    eq("한 번만 합산", [a.photoProcessingCost, a.photoCostBreakdown.sceneImages], [1.1, 0.1]);
    const b = applySceneCost(a.photoProcessingCost, a.photoCostBreakdown, 0.1);
    eq("두 번째 반영은 무시(이중집계 없음)", [b.photoProcessingCost, b.photoCostBreakdown.sceneImages], [1.1, 0.1]);
    eq("비용 0이면 변화 없음", applySceneCost(1, { claude: 0.2 }, 0), { photoProcessingCost: 1, photoCostBreakdown: { claude: 0.2 } });
    const m = mergeDraftAndPhotoCost({ claude: 0.1 }, a.photoCostBreakdown);
    eq("초안+사진 병합 후에도 장면 비용 한 번", [m.sceneImages, m.claude], [0.1, 0.30000000000000004]);
  }

  // 상한 — 2장·$0.10, 계획 추정
  {
    const p = planSceneGeneration(base());
    eq("두 슬롯 계획", [p.slots.map((s) => s.slot), p.estimateUsd], [["use-person", "use-hand-mist"], 0.1]);
    const res = await runSceneGeneration(p, ["r"], deps(async () => url));
    eq("병렬 실행 2건", [res.length, sceneGenCostUsd(res)], [2, 0.1]);
  }

  // 크기 정보 없음 → 슬롯 비움(지어낸 크기 금지)
  {
    const p = planSceneGeneration(base({ sizeHint: null }));
    eq("크기 없음(용량·높이 모두 없음)", [p.slots.length, p.skipped[0]?.reason], [0, "no-size"]);
    eq("용량만 있으면 사전 추정", planSceneGeneration(base({ sizeHint: "30mL" })).dims?.estimated, true);
    const h = planSceneGeneration(base({ sizeHint: null, heightCm: 11 }));
    eq("높이 입력은 추정 아님", [h.dims?.heightCm, h.dims?.estimated], [11, false]);
    // 용량이 상품명·특징 입력에 있으면 사전 추정에 쓴다(높이·치수는 읽지 않음)
    const v = planSceneGeneration(base({ sizeHint: null, volumeText: "휴대하기 좋은 30mL 미니 사이즈 용량: 30mL" }));
    eq("특징 입력의 용량 → 사전 추정", [v.slots.length, v.dims?.heightCm, v.dims?.estimated, v.dims?.volumeMl], [2, 10, true, 30]);
    eq("특징에 높이만 있어도 용량 없으면 비움", planSceneGeneration(base({ sizeHint: null, volumeText: "높이 약 9cm" })).skipped[0]?.reason, "no-size");
    eq("종류를 모르는 상품", planSceneGeneration(base({ productName: "무언가" })).skipped[0]?.reason, "unknown-product");
  }

  // 호출 조건
  eq("뷰티 아님", planSceneGeneration(base({ category: "의류/패션" })).skipped[0]?.reason, "not-eligible");
  eq("flag off", planSceneGeneration(base({ styleEnabled: false })).skipped[0]?.reason, "not-eligible");
  eq("토큰 없음", planSceneGeneration(base({ hasToken: false })).skipped[0]?.reason, "no-token");
  eq("TEST_MODE", planSceneGeneration(base({ testMode: true })).skipped[0]?.reason, "test-mode");
  eq("참조 없음", planSceneGeneration(base({ refs: [] })).skipped[0]?.reason, "no-reference");
  eq("분사 슬롯은 미스트만", planSceneGeneration(base({ productName: "수분 에센스 세럼" })).slots.map((s) => s.slot), ["use-person"]);

  // 성별·타깃 매핑(불분명하면 비움)
  eq("20~30대 여성", sceneModelFromTarget("20~30대 여성")?.plain, "a Korean woman in her twenties");
  eq("30~40대 여성", sceneModelFromTarget("30~40대 여성")?.plain, "a Korean woman in her thirties");
  eq("남성", sceneModelFromTarget("20대 남성")?.plain, "a Korean man in his twenties");
  eq("연령 없는 여성", sceneModelFromTarget("여성")?.plain, "a Korean woman in her twenties");
  for (const t of ["", null, "20~30대", "남녀공용", "남성 여성", "누구나", "건조한 피부"]) if (sceneModelFromTarget(t) !== null) fails.push(`모호한 타깃이 인물로 매핑됨: ${t}`);
  eq("모호한 타깃 → 슬롯 비움", planSceneGeneration(base({ targetCustomer: "20~30대" })).skipped[0]?.reason, "ambiguous-target");
  {
    const man = planSceneGeneration(base({ targetCustomer: "30대 남성" })).slots.map((s) => s.prompt).join(" ");
    if (!/his cheek/.test(man) || !/his face/.test(man) || /\bher\b/.test(man)) fails.push("남성 타깃 프롬프트의 호칭이 맞지 않음");
  }

  // 참조 이미지 선택(제품 정면·근접 우선 최대 2장, 손·박스·여러 병·장면 제외, 태그 없으면 첫 사진)
  eq("정면·근접 2장", pickSceneReferences([{ tags: ["정면", "단독"] }, { tags: ["손", "들기"] }, { tags: ["박스"] }, { tags: ["클로즈업", "라벨"] }, { tags: ["두개", "나열"] }, { tags: ["인물", "책상"] }]), [3, 0]);
  eq("태그 없음 → 첫 사진", pickSceneReferences([{}, {}, {}]), [0]);
  eq("전부 제외 → 없음", pickSceneReferences([{ tags: ["손", "들기"] }, { tags: ["박스"] }]), []);
  eq("확대·효과 복제본 제외", pickSceneReferences([{ tags: ["정면"], origin: "compare" }, { tags: ["정면"], origin: "fx" }, { tags: ["정면"] }]), [2]);
  eq("태그 없는 컷은 뒤로", pickSceneReferences([{}, { tags: ["정면"] }]), [1, 0]);

  // 프롬프트 내용
  {
    const [person, spray] = planSceneGeneration(base()).slots.map((s) => s.prompt) as [string, string];
    for (const [label, t] of [["인물", person], ["분사", spray]] as const) {
      for (const must of ["about 10 cm tall", "3.3 cm wide", "about half the height of her face from chin to forehead", "easily held in one hand", "not larger than her cheek", "Medium shot showing face and shoulders", "do not alter text", "no celebrity likeness", "no before and after", "no skin close-up", "no text overlay", "same label text and logo"]) {
        if (!t.includes(must)) fails.push(`${label} 프롬프트에 "${must}" 없음`);
      }
      if (/https?:\/\/|data:image|카멜리아/.test(t)) fails.push(`${label} 프롬프트에 판매자 원문·주소가 들어감`);
    }
    if (!spray.includes("fine mist visible") || !spray.includes("never a close-up") || !spray.includes("Side profile")) fails.push("분사 프롬프트 요소 누락");
    if (person.includes("Side profile") || person.includes("never a close-up")) fails.push("인물 프롬프트에 분사 요소가 섞임");
    const prod = sceneProductOf("카멜리아 에센스 미스트")!;
    const model = sceneModelFromTarget("20~30대 여성")!;
    try { buildGeneratedScenePrompt("use-person", prod, model, { heightCm: 10, estimated: true }); } catch { fails.push("정상 치수에서 프롬프트 생성이 던짐"); }
  }

  // 슬롯 맵(메타: 추정 여부 기록)
  eq("슬롯 맵", sceneImageMapFrom([{ slot: "use-person", url: "https://x/y.png" }, { slot: "use-hand-mist", url: null }], { heightCm: 10, diameterCm: 3.3, estimated: true }), { "use-person": { url: "https://x/y.png", role: "scene", aiGenerated: true, sizeMeta: { heightCm: 10, diameterCm: 3.3, estimated: true } } });
  eq("빈 맵", sceneImageMapFrom([{ slot: "use-person", url: null }], null), {});
  return fails;
}
