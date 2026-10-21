/**
 * 422차 — 뷰티 인물 사용 컷 2장(use-person · use-hand-mist) 생성 연결. 417차 info-backdrop과 같은 구조(계획 → 실행기 → 서버 라우트 → 파이프라인 병렬 호출 → 세션 sceneImages).
 *  - 모델: bytedance/seedream-4(421차 호출 방식 그대로). 단가는 보수적으로 장당 SCENE_UNIT_USD, 페이지당 최대 2장·$0.10, 초과 슬롯은 비움.
 *  - 정지 장면(scene-desk/bag/vanity)·크기 자동 게이트·재생성 루프·인물 검출은 연결하지 않는다(판정 함수 judgeSceneSize는 그대로 두고 호출 안 함).
 *  - 슬롯을 비우는(= 호출 0) 조건: 뷰티 아님·flag off·토큰 없음·TEST_MODE·참조 사진 없음·크기 정보 없음(사전 추정도 불가)·성별이 불분명한 타깃·분사 장면인데 미스트가 아님.
 *    어떤 실패든 사용자에게 오류를 보이지 않고 빈 슬롯(419차 폴백)으로 둔다.
 *  - 이 파일은 계산·실행기만 한다(의존성 주입). 실제 Replicate·Storage는 app/api/scene-images/route.ts가 꽂는다.
 */
import { beautyStyleOn } from "@/lib/beauty-style";
import {
  INFO_BACKDROP_MAX_429_RETRY,
  infoBackdropOutputToBuffer,
  isFatalAuth,
  isRateLimited,
  retryAfterMsOf,
  type FetchBuffer,
} from "@/lib/info-backdrop";
import { photoKinds } from "@/lib/photo-text-match";
import { SCENE_COMMON_DIRECTIVES, SCENE_UNIT_USD, sceneImageCostUsd, type SceneImageMap } from "@/lib/scene-images";
import { comparisonSentence, parseSizeHint, resolveProductDimensions, sizeMetaOf, type ProductDimensions } from "@/lib/scene-size";
import type { PhotoCostBreakdown } from "@/lib/types/generate";

export const SCENE_GEN_MODEL = "bytedance/seedream-4" as const;
/** 슬롯당 호출 타임아웃(seedream 약 30초) */
export const SCENE_GEN_TIMEOUT_MS = 60_000;
/** 사진 보정이 끝난 뒤 장면 이미지를 더 기다리는 최대 시간(초과분은 빈 슬롯, 호출은 과금됐을 수 있음) */
export const SCENE_GEN_EXTRA_WAIT_MS = 45_000;
export const SCENE_GEN_MAX_COUNT = 2;
export const SCENE_GEN_CAP_USD = 0.1;
export const GENERATED_SCENE_SLOTS = ["use-person", "use-hand-mist"] as const;
/**
 * 424차 안전 기본값. 장면 이미지 생성은 서버 환경 변수 USAGE_SCENE_GENERATION_ENABLED=true일 때만 호출한다(기본 꺼짐, 켜는 건 운영 설정으로만).
 * 켜져 있어도 분사 슬롯(use-hand-mist)은 422차 실생성에서 병이 크고 분사 방향이 어긋나 비활성(되돌리려면 아래 상수를 true로).
 */
export const SCENE_GEN_ENV_FLAG = "USAGE_SCENE_GENERATION_ENABLED";
export const sceneGenEnabledFromEnv = (env: Record<string, string | undefined> = process.env): boolean => env[SCENE_GEN_ENV_FLAG] === "true";
export const SCENE_HAND_MIST_ENABLED = false;
export type GeneratedSceneSlot = (typeof GENERATED_SCENE_SLOTS)[number];
/** 참조 사진 최대 장수·전송 크기 */
export const SCENE_REF_MAX = 2;
export const SCENE_REF_LONG_EDGE = 1536;
export const SCENE_REF_JPEG_QUALITY = 90;
/** 생성 결과 비율(너비/높이) 허용 범위 — 3:4 요청, 벗어나면 이상 비율로 보고 폴백 */
export const SCENE_GEN_RATIO_RANGE = [0.6, 0.9] as const;

// ── 타깃 → 인물(성별·연령). 성별이 분명하지 않으면 null(슬롯 비움) ──
export type SceneGender = "woman" | "man";
export type SceneModel = { gender: SceneGender; noun: string; pronoun: "her" | "his"; /** 예: "a clean, fresh-faced Korean woman in her twenties" */ label: string; /** 예: "a Korean woman in her twenties" */ plain: string };

export function sceneModelFromTarget(target: string | null | undefined): SceneModel | null {
  const t = target ?? "";
  const female = /여성|여자|여\b|우먼|girl|woman|female/i.test(t);
  const male = /남성|남자|남\b|맨즈|man\b|male|boy/i.test(t);
  const mixed = /남녀|공용|유니섹스|unisex|누구나|모두/.test(t) || (female && male);
  if (mixed || (!female && !male)) return null;
  const has = (d: string) => new RegExp(`(?<!\\d)${d}(?!\\d)`).test(t);
  // 20~30대처럼 범위면 젊은 쪽(예: 20~30대 여성 → 20대)
  const age = has("20") ? "twenties" : has("30") ? "thirties" : has("40") ? "forties" : has("50") ? "fifties" : "twenties";
  const gender: SceneGender = female ? "woman" : "man";
  const pronoun = gender === "woman" ? "her" : "his";
  const noun = gender === "woman" ? "Korean woman" : "Korean man";
  return { gender, noun, pronoun, label: `a clean, fresh-faced ${noun} in ${pronoun} ${age}`, plain: `a ${noun} in ${pronoun} ${age}` };
}

// ── 제품 종류(영어 사전). 판매자 입력 원문은 프롬프트에 넣지 않는다 ──
export type SceneProduct = { english: string; spray: boolean };
export function sceneProductOf(name: string | null | undefined): SceneProduct | null {
  const n = name ?? "";
  if (/미스트|스프레이|mist|spray/i.test(n)) return { english: "essence mist bottle", spray: true };
  if (/토너|스킨|에센스|세럼|앰플|로션|오일|toner|essence|serum|ampoule|lotion/i.test(n)) return { english: "skincare bottle", spray: false };
  if (/튜브|tube/i.test(n)) return { english: "skincare tube", spray: false };
  if (/크림|cream|밤\b|balm/i.test(n)) return { english: "cream jar", spray: false };
  if (/립|lip/i.test(n)) return { english: "lip product", spray: false };
  return null;
}

// ── 참조 사진 선택: 제품 정면·근접(라벨이 잘 보이는 컷) 우선 최대 2장. 손에 든 컷·박스·여러 병 컷·장면은 쓰지 않는다 ──
export type SceneRefMeta = { role?: string; origin?: string; tags?: readonly string[] };
export function pickSceneReferences(metas: readonly SceneRefMeta[], max = SCENE_REF_MAX): number[] {
  const scored: Array<{ i: number; rank: number }> = [];
  metas.forEach((m, i) => {
    if (m.origin === "compare" || m.origin === "fx" || m.origin === "lifestyle") return;
    const k = photoKinds(m);
    if (k.has("hand") || k.has("box") || k.has("multi") || k.has("scene") || k.has("spray")) return; // 손 중복·상자·여러 병·장면은 오류를 부른다
    const rank = k.has("closeup") ? 0 : k.has("front") ? 1 : k.size === 0 ? 3 : 2; // 태그 없음(알 수 없음)은 마지막
    scored.push({ i, rank });
  });
  // 태그가 전혀 없는 입력은 첫 사진 1장
  const anyTags = metas.some((m) => (m.tags ?? []).length > 0);
  if (!anyTags) return metas.length > 0 ? [0] : [];
  scored.sort((a, b) => a.rank - b.rank || a.i - b.i);
  return scored.slice(0, max).map((s) => s.i);
}

// ── 프롬프트(421차 검증 구도 + 크기 문장) ──
export const SCENE_GEN_SUFFIX =
  "Keep the product exactly as in the reference image: same shape, same colors, same label text and logo, do not redraw or alter any text. Natural photographic style, soft daylight, clean commercial look, no extra text, no watermark";

export function buildGeneratedScenePrompt(slot: GeneratedSceneSlot, product: SceneProduct, model: SceneModel, dims: ProductDimensions): string {
  const size = comparisonSentence(slot, dims);
  if (!size) throw new Error("크기 문장을 만들 수 없음");
  const his = model.pronoun;
  const sized = model.gender === "man" ? size.replace(/\bher\b/g, "his") : size;
  const base =
    slot === "use-person"
      ? `${model.label} with natural grooming holding this ${product.english} near ${his} cheek, looking at the camera, bright minimal bathroom vanity background, soft pastel tones`
      : `Side profile of ${model.plain} spraying this ${product.english} onto ${his} face from about 15 cm away, fine mist visible in the air, dewy skin, bright airy background`;
  const framing = "Medium shot showing face and shoulders, not a close-up";
  return `${base}. The product is ${sized}. ${framing}. ${SCENE_GEN_SUFFIX}, ${SCENE_COMMON_DIRECTIVES}`;
}

/** 같은 상품 = 같은 입력(FNV-1a). seedream-4는 seed 입력이 없어(421차 스키마 확인) 재현은 입력 동일성으로만 보장한다 */
export function sceneGenKey(productKey: string, slot: string): string {
  let h = 0x811c9dc5;
  for (const ch of `${productKey}|${slot}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${slot}-${h.toString(36)}`;
}

// ── 계획 ──
export type SceneGenSkipReason =
  | "flag-off"
  | "slot-disabled"
  | "not-eligible"
  | "no-token"
  | "test-mode"
  | "no-reference"
  | "no-size"
  | "ambiguous-target"
  | "unknown-product"
  | "not-spray-product"
  | "count"
  | "cost";
export type SceneGenInput = {
  category: string | null | undefined;
  productName: string | null | undefined;
  targetCustomer: string | null | undefined;
  /** 폼 productSizeHint("30mL, 높이 약 10cm") */
  sizeHint: string | null | undefined;
  /** 폼 productHeightCm(숫자 cm) */
  heightCm: number | null | undefined;
  /** 용량(mL)을 찾을 입력 원문(상품명·특징). sizeHint에 용량이 없을 때만 용량 숫자 하나를 읽는다(높이·치수는 읽지 않는다) */
  volumeText?: string | null;
  hasToken: boolean;
  testMode: boolean;
  /** 참조 후보 사진 메타(업로드 순서) */
  refs: readonly SceneRefMeta[];
  /** 뷰티 스타일 플래그(기본 현재 값) */
  styleEnabled?: boolean;
  /** 424차 — 운영 환경 변수 USAGE_SCENE_GENERATION_ENABLED(sceneGenEnabledFromEnv). false면 호출 0 */
  enabled: boolean;
};
export type SceneGenPlan = {
  slots: Array<{ slot: GeneratedSceneSlot; prompt: string }>;
  skipped: Array<{ slot: string; reason: SceneGenSkipReason }>;
  refIndexes: number[];
  dims: ProductDimensions | null;
  estimateUsd: number;
};

/** 호출 전체를 건너뛰는 조건. null이면 진행 */
export function sceneGenBlockReason(i: Pick<SceneGenInput, "category" | "hasToken" | "testMode" | "styleEnabled" | "enabled">): SceneGenSkipReason | null {
  if (!i.enabled) return "flag-off";
  if (!beautyStyleOn(i.category, i.styleEnabled)) return "not-eligible";
  if (i.testMode) return "test-mode";
  if (!i.hasToken) return "no-token";
  return null;
}

/** 제품 실물 치수: 폼 높이(cm)가 있으면 그 값(추정 아님), 없으면 입력 힌트 → 사전 추정 → null */
export function sceneDimensionsOf(i: Pick<SceneGenInput, "productName" | "sizeHint" | "heightCm" | "volumeText">): ProductDimensions | null {
  const volumeMl = parseSizeHint(i.sizeHint).volumeMl ?? parseSizeHint(i.volumeText).volumeMl;
  // 424차: 높이 입력도 용량도 없으면 사전 추정을 쓰지 않고 비운다(립 등 용량 없는 종류의 기본 높이도 쓰지 않는다)
  const hasHeight = (typeof i.heightCm === "number" && i.heightCm >= 2 && i.heightCm <= 60) || parseSizeHint(i.sizeHint).heightCm != null;
  if (!hasHeight && !volumeMl) return null;
  const base = resolveProductDimensions({ sizeHint: i.sizeHint, kindText: i.productName, volumeMl });
  const h = typeof i.heightCm === "number" && Number.isFinite(i.heightCm) && i.heightCm >= 2 && i.heightCm <= 60 ? i.heightCm : null;
  if (h) return { ...(base ?? {}), heightCm: h, estimated: false };
  return base;
}

export function planSceneGeneration(i: SceneGenInput): SceneGenPlan {
  const empty = (reason: SceneGenSkipReason): SceneGenPlan => ({ slots: [], skipped: GENERATED_SCENE_SLOTS.map((slot) => ({ slot, reason })), refIndexes: [], dims: null, estimateUsd: 0 });
  const block = sceneGenBlockReason(i);
  if (block) return empty(block);
  const refIndexes = pickSceneReferences(i.refs);
  if (refIndexes.length === 0) return empty("no-reference");
  const model = sceneModelFromTarget(i.targetCustomer);
  if (!model) return empty("ambiguous-target");
  const product = sceneProductOf(i.productName);
  if (!product) return empty("unknown-product");
  const dims = sceneDimensionsOf(i);
  if (!dims) return { ...empty("no-size"), refIndexes };
  const slots: SceneGenPlan["slots"] = [];
  const skipped: SceneGenPlan["skipped"] = [];
  let spend = 0;
  for (const slot of GENERATED_SCENE_SLOTS) {
    if (slot === "use-hand-mist" && !SCENE_HAND_MIST_ENABLED) { skipped.push({ slot, reason: "slot-disabled" }); continue; }
    if (slot === "use-hand-mist" && !product.spray) { skipped.push({ slot, reason: "not-spray-product" }); continue; }
    if (slots.length >= SCENE_GEN_MAX_COUNT) { skipped.push({ slot, reason: "count" }); continue; }
    if (spend + SCENE_UNIT_USD > SCENE_GEN_CAP_USD + 1e-9) { skipped.push({ slot, reason: "cost" }); continue; }
    slots.push({ slot, prompt: buildGeneratedScenePrompt(slot, product, model, dims) });
    spend += SCENE_UNIT_USD;
  }
  return { slots, skipped, refIndexes, dims, estimateUsd: +spend.toFixed(4) };
}

// ── 실행기 ──
/** 421차에서 확인한 seedream-4 입력 이름만 쓴다(seed 없음, aspect_ratio에 4:5 없음 → 3:4) */
export function sceneGenInput(prompt: string, refs: readonly string[]): Record<string, unknown> {
  return { prompt, image_input: [...refs], aspect_ratio: "3:4", max_images: 1, sequential_image_generation: "disabled" };
}

export type SceneGenDeps = {
  run: (slug: string, input: Record<string, unknown>) => Promise<unknown>;
  fetchBuffer: FetchBuffer;
  validate?: (buffer: Buffer) => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  timeoutMs?: number;
  log?: (line: string) => void;
};
export type SceneGenJobResult = {
  slot: GeneratedSceneSlot;
  ok: boolean;
  billed: boolean;
  seconds: number;
  retries: number;
  format?: string;
  buffer?: Buffer;
  reason?: "rate-limit" | "timeout" | "unknown-format" | "bad-image" | "error" | "auth";
  fatal?: boolean;
};

/** 한 슬롯 호출. 429는 retry_after로 최대 3회 재전송(과금 없음), 60초 타임아웃, 그 외 오류는 재시도 없이 폴백, 401/402/403은 fatal */
export async function runSceneGenJob(slot: GeneratedSceneSlot, prompt: string, refs: readonly string[], deps: SceneGenDeps): Promise<SceneGenJobResult> {
  const t0 = deps.now();
  const limit = deps.timeoutMs ?? SCENE_GEN_TIMEOUT_MS;
  let retries = 0;
  const elapsed = () => (deps.now() - t0) / 1000;
  const log = (s: string) => deps.log?.(`[scene-images] slot=${slot} model=${SCENE_GEN_MODEL.split("/")[1]} ${s}`);
  const timeoutP = deps.sleep(limit).then(() => "timeout" as const);
  const work = (async (): Promise<SceneGenJobResult> => {
    for (;;) {
      let out: unknown;
      try {
        out = await deps.run(SCENE_GEN_MODEL, sceneGenInput(prompt, refs));
      } catch (e) {
        if (isRateLimited(e)) {
          if (retries >= INFO_BACKDROP_MAX_429_RETRY) return { slot, ok: false, billed: false, seconds: elapsed(), retries, reason: "rate-limit" };
          const wait = retryAfterMsOf(e);
          retries += 1;
          log(`429 — ${(wait / 1000).toFixed(1)}초 후 재전송 ${retries}/${INFO_BACKDROP_MAX_429_RETRY}(과금 없음)`);
          await deps.sleep(wait);
          continue;
        }
        if (isFatalAuth(e)) return { slot, ok: false, billed: false, seconds: elapsed(), retries, reason: "auth", fatal: true };
        return { slot, ok: false, billed: false, seconds: elapsed(), retries, reason: "error" };
      }
      const { buffer, format } = await infoBackdropOutputToBuffer(out, deps.fetchBuffer);
      if (!buffer) return { slot, ok: false, billed: true, seconds: elapsed(), retries, format, reason: "unknown-format" };
      if (deps.validate && !(await deps.validate(buffer))) return { slot, ok: false, billed: true, seconds: elapsed(), retries, format, reason: "bad-image" };
      return { slot, ok: true, billed: true, seconds: elapsed(), retries, format, buffer };
    }
  })();
  const winner = await Promise.race([work, timeoutP]);
  const res: SceneGenJobResult = winner === "timeout" ? { slot, ok: false, billed: true, seconds: elapsed(), retries, reason: "timeout" } : winner;
  void work.catch(() => undefined);
  log(`${res.ok ? "OK" : `폴백(${res.reason})`} ${res.seconds.toFixed(1)}s retries=${res.retries} billed=${res.billed}${res.format ? ` format=${res.format}` : ""}`);
  return res;
}

/** 계획의 슬롯을 병렬로 호출. 한 슬롯이 인증 오류(fatal)면 아직 시작하지 않은 슬롯은 없으므로 그대로 결과만 돌려준다 */
export async function runSceneGeneration(plan: SceneGenPlan, refs: readonly string[], deps: SceneGenDeps): Promise<SceneGenJobResult[]> {
  return Promise.all(plan.slots.map((s) => runSceneGenJob(s.slot, s.prompt, refs, deps)));
}

/** 과금 가능 호출 수 × 단가(성공·읽기 실패·이상 비율·타임아웃은 과금 가능, 429·인증·일반 오류는 0) */
export const sceneGenCostUsd = (results: ReadonlyArray<Pick<SceneGenJobResult, "billed">>): number => sceneImageCostUsd(results.filter((r) => r.billed).length);

/** 업로드까지 끝난 슬롯 → 세션 sceneImages 맵(성공한 슬롯만) */
export function sceneImageMapFrom(items: ReadonlyArray<{ slot: string; url: string | null }>, dims: ProductDimensions | null): SceneImageMap {
  const out: SceneImageMap = {};
  const meta = sizeMetaOf(dims);
  for (const it of items) {
    if (!it.url) continue;
    out[it.slot] = { url: it.url, role: "scene", aiGenerated: true, ...(meta ? { sizeMeta: meta } : {}) };
  }
  return out;
}

/**
 * 비용 반영(이중집계 방지): 사진 단계 비용 합과 비용표(photoCostBreakdown.sceneImages)에 같은 값을 한 번만 더한다.
 * 이미 값이 있는 비용표(재호출)면 덮어쓰지 않고 더하지 않는다.
 */
export function applySceneCost(photoProcessingCost: number, breakdown: PhotoCostBreakdown, cost: number): { photoProcessingCost: number; photoCostBreakdown: PhotoCostBreakdown } {
  if (!(cost > 0) || (breakdown.sceneImages ?? 0) > 0) return { photoProcessingCost, photoCostBreakdown: breakdown };
  return { photoProcessingCost: photoProcessingCost + cost, photoCostBreakdown: { ...breakdown, sceneImages: cost } };
}

/** 참조 사진 전송 크기(긴 변·품질)를 한 곳에서 — 라우트가 sharp로 줄인다 */
export const sceneRefResizeSpec = { longEdge: SCENE_REF_LONG_EDGE, quality: SCENE_REF_JPEG_QUALITY } as const;
