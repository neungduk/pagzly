/**
 * 컨셉 브리프 기반 원형 배지 아이콘 — checklist / usage_steps / spec_table /
 * stat_infographic / highlight_box(147차)용. 기본 모델은 flux-schnell이며,
 * ICON_MODEL env로 seedream-3 / qwen-image / recraft-v3 A/B 테스트 가능
 * (BACKDROP_PROVIDER와 동일 패턴).
 */

import Replicate from "replicate";
import sharp from "sharp";
import { describeColorTone, hueShift } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";
import { isPremiumQualityMode } from "@/lib/premium-mode";

export type IconModelKey =
  | "flux-schnell"
  | "seedream-3"
  | "qwen-image"
  | "recraft-v3"
  | "recraft-v4"
  | "recraft-v4-svg"
  | "flux-dev";

export const ICON_MODEL_REF: Record<IconModelKey, `${string}/${string}`> = {
  "flux-schnell": "black-forest-labs/flux-schnell",
  "seedream-3": "bytedance/seedream-3",
  "qwen-image": "qwen/qwen-image",
  "recraft-v3": "recraft-ai/recraft-v3",
  "recraft-v4": "recraft-ai/recraft-v4",
  "recraft-v4-svg": "recraft-ai/recraft-v4-svg",
  "flux-dev": "black-forest-labs/flux-dev",
};

/** 143차 실측 (Replicate UI 가격 배지 + OpenAPI 스키마, 2026-09-08). */
export const ICON_COST_USD_BY_MODEL: Record<IconModelKey, number> = {
  "flux-schnell": 0.003,
  "seedream-3": 0.018,
  "qwen-image": 0.021,
  "recraft-v3": 0.04,
  "recraft-v4": 0.04,
  "recraft-v4-svg": 0.08,
  "flux-dev": 0.025,
};

/** recraft-v3/v4/v4-svg 공통 — 라벨 문구를 프롬프트에 넣으면 배지 문구로 그려 넣는 경향(141차). */
function isRecraftModel(model: IconModelKey): boolean {
  return model === "recraft-v3" || model === "recraft-v4" || model === "recraft-v4-svg";
}

/**
 * `.env.local` ICON_MODEL=seedream-3 | qwen-image | recraft-v3 | recraft-v4 |
 * recraft-v4-svg | flux-dev — 미설정 시 flux-schnell.
 */
export function getIconModel(): IconModelKey {
  const raw = process.env.ICON_MODEL;
  if (
    raw === "seedream-3" ||
    raw === "qwen-image" ||
    raw === "recraft-v3" ||
    raw === "recraft-v4" ||
    raw === "recraft-v4-svg" ||
    raw === "flux-dev"
  ) {
    return raw;
  }
  return "flux-schnell";
}

/**
 * 모델별 Replicate input.
 * - flux-schnell: aspect_ratio + num_outputs + output_format
 * - seedream-3: aspect_ratio + size (num_outputs/output_format 없음, 출력은 URI 문자열)
 * - qwen-image: aspect_ratio + output_format (num_outputs 없음, 출력은 URI 배열)
 * - recraft-v3: prompt + aspect_ratio + style (OpenAPI 2026-09-08 확인,
 *   review/140cha-recraft-v3-*-enum.json). 출력은 URI 문자열.
 *   style 기본 digital_illustration/hand_drawn_outline (141차 승자);
 *   A/B용으로 RECRAFT_STYLE env로 덮어쓰기 가능.
 */
export const RECRAFT_STYLE_DEFAULT = "digital_illustration/hand_drawn_outline";

/** 140차 enum에 아이콘 전용 style은 없음 — A/B 후보로 쓸 수 있는 값만 허용. */
export const RECRAFT_STYLE_ALLOWED = [
  "digital_illustration",
  "digital_illustration/hand_drawn_outline",
  "digital_illustration/handmade_3d",
  "any",
] as const;

export type RecraftStyle = (typeof RECRAFT_STYLE_ALLOWED)[number];

/** 141차 — recraft만 가짜 타이포/리본 문구 억제. 다른 모델 프롬프트에는 붙이지 않음. */
export const RECRAFT_NO_TYPOGRAPHY_CLAUSE = [
  "no typography",
  "no lettering",
  "no words",
  "no banner text",
  "no ribbon text",
  "no badge text",
  "no engraved text",
  "no embossed text",
  "no fake language",
  "no gibberish characters",
  "no made-up alphabet",
  "blank unlabeled ribbon",
  "blank unlabeled banner",
  "plain empty badge surface",
].join(", ");

export function resolveRecraftStyle(): RecraftStyle {
  const raw = process.env.RECRAFT_STYLE;
  if (raw && (RECRAFT_STYLE_ALLOWED as readonly string[]).includes(raw)) {
    return raw as RecraftStyle;
  }
  return RECRAFT_STYLE_DEFAULT;
}

export function buildIconModelInput(
  model: IconModelKey,
  prompt: string,
  aspectRatio: "1:1" | "16:9",
): Record<string, unknown> {
  if (model === "seedream-3") {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      // 아이콘·배너 A/B용 — 1MP면 충분, big(2K)는 비용/시간만 늘어남
      size: "regular",
    };
  }
  if (model === "qwen-image") {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "png",
      output_quality: 85,
      go_fast: true,
      enhance_prompt: false,
    };
  }
  if (model === "recraft-v3") {
    const style = resolveRecraftStyle();
    return {
      prompt,
      aspect_ratio: aspectRatio,
      style,
    };
  }
  if (model === "recraft-v4" || model === "recraft-v4-svg") {
    // 143차 실측 스키마 — style 파라미터 없음. outline 미학은 프롬프트로만 지시.
    return {
      prompt,
      aspect_ratio: aspectRatio,
    };
  }
  if (model === "flux-dev") {
    // 143차 실측 스키마 — flux-schnell과 달리 num_inference_steps 등을 받는다.
    return {
      prompt,
      num_outputs: 1,
      aspect_ratio: aspectRatio,
      output_format: "png",
      output_quality: 95,
      num_inference_steps: 28,
      go_fast: true,
      megapixels: "1",
    };
  }
  return {
    prompt,
    num_outputs: 1,
    aspect_ratio: aspectRatio,
    output_format: "png",
    output_quality: 95,
  };
}

// 아이콘마다 이 순서로 accent hue를 회전시켜 "브랜드 톤과 어울리면서도
// 한눈에 다채로워 보이는" 배지 세트를 만든다. 0°부터 시작해 인접 아이콘끼리
// 색이 튀지 않도록 완만하게 퍼뜨리되, 세트 전체를 보면 색상환을 고르게
// 돈다 — 순서대로 이어붙이면 30° 간격에 가깝다.
const ICON_HUE_OFFSETS = [0, -50, 40, -25, 65, -75, 20, -40, 80, -15, 55, -60];

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!replicateClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
    }
    replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });
  }
  return replicateClient;
}

function extractImageUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** 156차 — 개별 아이콘 생성이 끝까지 실패했을 때 마지막으로 시도할 모델. 가장
 *  저렴하고($0.003) 실무상 가장 안정적으로 응답해온 flux-schnell을 고정 사용. */
const ICON_FALLBACK_MODEL: IconModelKey = "flux-schnell";

/**
 * 156차 — 503/429/502 상태 코드만 재시도하던 것을 504 및 타임아웃/네트워크류
 * 오류(상태 코드가 아예 없는 경우가 많음)까지 넓혔다. 개별 아이콘 생성 실패가
 * "동일한 제네릭 아이콘"으로 드러난 사례(147/154/155차)의 재발을 줄이는 목적.
 */
function isRetryableReplicateError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 503 || status === 429 || status === 502 || status === 504) return true;
  const code = (error as { code?: string })?.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|network|fetch failed|socket hang up/i.test(message);
}

async function generateSingleConceptIcon(
  label: string,
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  motifIndex: number,
  hueOffset: number,
  model: IconModelKey,
): Promise<{ dataUrl: string; cost: number }> {
  const replicate = getReplicateClient();
  const modelRef = ICON_MODEL_REF[model];
  const cost = ICON_COST_USD_BY_MODEL[model];
  const motif = brief.motif_keywords[motifIndex % brief.motif_keywords.length];
  const iconAccent = hueShift(theme.accent, hueOffset);
  const iconShadow = hueShift(theme.deepAccent, hueOffset);
  // recraft(v3/v4/v4-svg)는 라벨 문자열을 프롬프트에 넣으면 배지 문구로 그려 넣는
  // 경향이 강해(141차) 모티프만 전달하고 한국어/표시용 라벨은 넣지 않는다.
  const motifLine = isRecraftModel(model)
    ? `motif: ${motif}, abstract centered symbol only`
    : `motif: ${motif}, concept for "${label.slice(0, 40)}"`;
  const promptParts = [
    "circular badge icon, flat minimal UI illustration",
    "professional vector icon design, polished modern app icon quality",
    "clean crisp linework, consistent stroke weight, balanced negative space",
    "subtle soft shadow for gentle depth, refined finish, no visual clutter",
    brief.icon_style,
    motifLine,
    `${describeColorTone(iconAccent)} primary color, ${describeColorTone(iconShadow)} subtle shadow`,
    "soft round badge frame, centered symbol, no text, no letters, no watermark",
    "white or very light background, ecommerce detail page icon",
  ];
  if (isRecraftModel(model)) {
    if (model !== "recraft-v3") {
      // v4/v4-svg에는 style 파라미터가 없어 outline 미학을 프롬프트로 명시 (143차)
      promptParts.push(
        "hand-drawn outline digital illustration style, thick clean black outlines, flat color fills",
      );
    }
    promptParts.push(RECRAFT_NO_TYPOGRAPHY_CLAUSE);
  }
  const prompt = promptParts.join(", ");

  const output = await (async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await replicate.run(modelRef, {
          input: buildIconModelInput(model, prompt, "1:1"),
          wait: { mode: "poll", interval: 1000 },
        });
      } catch (error) {
        lastError = error;
        const status = (error as { response?: { status?: number } }).response?.status;
        const retryable = isRetryableReplicateError(error);
        if (!retryable || attempt === 3) throw error;
        console.warn(`[concept-icons] ${model} ${status ?? "no-status"} — ${attempt}/3 재시도`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
      }
    }
    throw lastError;
  })();
  // A/B 첫 호출 진단용 — 파라미터가 무시돼도 조용히 성공하는 모델이 있어 원본 확인
  console.log(`[concept-icons] model=${model} label="${label.slice(0, 24)}" output:`, output);

  const url = extractImageUrl(output);
  if (!url) {
    throw new Error(`아이콘 생성 실패 (${model}): ${label}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`아이콘 이미지 로드 실패: ${label}`);
  }
  const raw = Buffer.from(await response.arrayBuffer());
  // recraft-v4-svg는 실제 SVG를 반환한다(143차 확인) — 렌더러는 PNG dataUrl만
  // 다루므로 sharp로 래스터화한다. 다른 모델은 그대로 PNG.
  const contentType = response.headers.get("content-type") ?? "";
  const looksSvg =
    model === "recraft-v4-svg" ||
    contentType.includes("svg") ||
    raw.slice(0, 200).toString("utf8").includes("<svg");
  const pngBuffer = looksSvg ? await sharp(raw).png().toBuffer() : raw;
  const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  return { dataUrl, cost };
}

/**
 * 156차 — 프리미엄 모델(flux-dev/recraft 등)이 3회 재시도 후에도 실패하면
 * 완전히 포기하는 대신 가장 저렴하고 안정적인 flux-schnell로 마지막 1회를
 * 더 시도한다. 그래도 실패하면 원래 오류를 던져 상위(generateConceptIcons)의
 * 기존 처리(빈 dataUrl → 렌더러의 카드별 번호 배지 폴백, 156차 렌더러 수정)로
 * 이어진다. 실제 사용자 체감상 "다른 모델이라도 진짜 아이콘"이 "번호 배지"보다
 * 낫다는 판단.
 */
async function generateSingleConceptIconWithFallback(
  label: string,
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  motifIndex: number,
  hueOffset: number,
  model: IconModelKey,
): Promise<{ dataUrl: string; cost: number }> {
  try {
    return await generateSingleConceptIcon(label, brief, theme, motifIndex, hueOffset, model);
  } catch (primaryError) {
    if (model === ICON_FALLBACK_MODEL) throw primaryError;
    console.warn(
      `[concept-icons] "${label}" (${model}) 재시도 소진 — ${ICON_FALLBACK_MODEL}로 마지막 폴백 시도`,
      primaryError,
    );
    try {
      return await generateSingleConceptIcon(
        label,
        brief,
        theme,
        motifIndex,
        hueOffset,
        ICON_FALLBACK_MODEL,
      );
    } catch (fallbackError) {
      console.warn(`[concept-icons] "${label}" 폴백(${ICON_FALLBACK_MODEL})도 실패`, fallbackError);
      throw primaryError;
    }
  }
}

export type ConceptIconMap = {
  /** checklist 섹션 items 순서와 1:1 */
  checklist?: string[];
  /** usage_steps 섹션 steps 순서와 1:1 */
  usageSteps?: string[];
  /** spec_table 섹션 rows 순서와 1:1 */
  specTable?: string[];
  /** stat_infographic 섹션 metrics 순서와 1:1 */
  statInfographic?: string[];
  /** 147차 — highlight_box 섹션 cards 순서와 1:1. 기존엔 텍스트만 있어 비주얼이
   *  전혀 없었던 섹션이라, 카드마다 배지 아이콘을 붙여 시각적 앵커를 만든다. */
  highlightBox?: string[];
};

type IconGroup = {
  key: keyof ConceptIconMap;
  labels: string[];
};

/**
 * 142차 선별 적용 + 145/146차 프리미엄 옵션(PREMIUM_QUALITY_MODE=true):
 * - statInfographic → 기본 recraft-v3, 프리미엄이면 recraft-v4 (146차: 동일가
 *   $0.04, 143차 실측상 디테일↑ — 145차 리포트의 "다음 후보" 항목을 적용)
 * - checklist / usageSteps / highlightBox → 프리미엄이면 flux-dev, 아니면
 *   ICON_MODEL(기본 flux-schnell). highlightBox는 147차 신규 — 기존엔 아이콘
 *   자체가 없어 텍스트만 있던 섹션이라 checklist와 동일한 대우로 맞춘다.
 * - specTable → 프리미엄이어도 flux-schnell 유지 (144차: 스펙 아이콘 다수 전환은
 *   체감 대비 원가만 커서 제외 권고)
 */
function modelForIconGroup(key: keyof ConceptIconMap): IconModelKey {
  if (key === "statInfographic") return isPremiumQualityMode() ? "recraft-v4" : "recraft-v3";
  if (
    isPremiumQualityMode() &&
    (key === "checklist" || key === "usageSteps" || key === "highlightBox")
  ) {
    return "flux-dev";
  }
  return getIconModel();
}

// 동시 실행 개수 제한 — flux-schnell 호출을 한 번에 너무 많이 터뜨리면
// Replicate rate limit에 걸릴 수 있어 배치 단위로 나눠 돈다.
// recraft 계열(v3/v4/v4-svg)은 저크레딧 계정에서 burst=1로 조이므로 순차 실행.
const CONCURRENCY = 6;

function iconConcurrency(model: IconModelKey): number {
  return isRecraftModel(model) ? 1 : CONCURRENCY;
}

async function runInBatches<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = CONCURRENCY,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  for (let start = 0; start < items.length; start += concurrency) {
    const batch = items.slice(start, start + concurrency);
    const batchResults = await Promise.all(batch.map((item) => worker(item)));
    batchResults.forEach((result, i) => {
      results[start + i] = result;
    });
    // recraft 등 순차 모드: 배치 사이 짧은 간격으로 rate limit 여유
    if (concurrency === 1 && start + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 11_000));
    }
  }
  return results;
}

/**
 * 컨셉에 맞는 원형 배지 아이콘 일괄 생성.
 * 섹션 타입별로 독립적으로 개수를 채우기 때문에, 항목이 많은 섹션이 있어도
 * 다른 섹션의 아이콘 생성 기회를 뺏지 않는다. TEST_MODE에서는 섹션 타입당
 * 최대 1장만 생성해 4개 타입 전부 육안 확인은 가능하되 비용은 낮게 유지.
 *
 * 142차: statInfographic만 recraft-v3 고정, 나머지 3그룹은 ICON_MODEL
 * (기본 flux-schnell). 모델별로 배치를 분리해 recraft 동시성 1+11초 대기를 지킨다.
 */
export async function generateConceptIcons(
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  checklistItems: string[],
  usageStepLabels: string[],
  specTableLabels: string[] = [],
  statLabels: string[] = [],
  highlightBoxLabels: string[] = [],
): Promise<{ icons: ConceptIconMap; cost: number }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[concept-icons] REPLICATE_API_TOKEN 없음 — 아이콘 생성 생략");
    return { icons: {}, cost: 0 };
  }

  const defaultModel = getIconModel();
  const statModelLog = isPremiumQualityMode() ? "recraft-v4 (premium)" : "recraft-v3";
  console.log(
    `[concept-icons] ICON_MODEL=${defaultModel} ($${ICON_COST_USD_BY_MODEL[defaultModel].toFixed(3)}/장) | 142 selective: statInfographic=${statModelLog}`,
  );

  const perTypeCap = isTestMode() ? 1 : Infinity;
  const allGroups: IconGroup[] = [
    { key: "checklist", labels: checklistItems.slice(0, perTypeCap) },
    { key: "usageSteps", labels: usageStepLabels.slice(0, perTypeCap) },
    { key: "specTable", labels: specTableLabels.slice(0, perTypeCap) },
    { key: "statInfographic", labels: statLabels.slice(0, perTypeCap) },
    { key: "highlightBox", labels: highlightBoxLabels.slice(0, perTypeCap) },
  ];
  const groups = allGroups.filter((group) => group.labels.length > 0);

  if (groups.length === 0) {
    return { icons: {}, cost: 0 };
  }

  if (isTestMode()) {
    const total = groups.reduce((sum, g) => sum + g.labels.length, 0);
    console.log(`[concept-icons] TEST_MODE — 아이콘 ${total}장만 생성 (타입당 최대 1장)`);
  }

  // 전체를 한 목록으로 펼치되, hue 오프셋은 "이 아이콘이 세트 전체에서 몇
  // 번째인지"로 순환시켜 섹션 타입 경계와 무관하게 색이 고르게 퍼지게 한다.
  let globalIndex = 0;
  type FlatItem = {
    key: keyof ConceptIconMap;
    label: string;
    motifIndex: number;
    hueOffset: number;
    model: IconModelKey;
  };
  const flat: FlatItem[] = [];
  for (const group of groups) {
    const model = modelForIconGroup(group.key);
    group.labels.forEach((label) => {
      flat.push({
        key: group.key,
        label,
        motifIndex: globalIndex,
        hueOffset: ICON_HUE_OFFSETS[globalIndex % ICON_HUE_OFFSETS.length],
        model,
      });
      globalIndex += 1;
    });
  }

  // 모델별 분리 배치 — recraft(동시성1+11s)와 schnell(동시성6)을 섞지 않음
  const byModel = new Map<IconModelKey, FlatItem[]>();
  for (const item of flat) {
    const list = byModel.get(item.model) ?? [];
    list.push(item);
    byModel.set(item.model, list);
  }

  const settled: (FlatItem & { dataUrl: string; cost: number })[] = [];
  for (const [model, items] of byModel) {
    console.log(
      `[concept-icons] batch model=${model} n=${items.length} concurrency=${iconConcurrency(model)}`,
    );
    const batchSettled = await runInBatches(
      items,
      async (item) => {
        try {
          const { dataUrl, cost } = await generateSingleConceptIconWithFallback(
            item.label,
            brief,
            theme,
            item.motifIndex,
            item.hueOffset,
            item.model,
          );
          return { ...item, dataUrl, cost };
        } catch (error) {
          console.warn(`[concept-icons] "${item.label}" (${item.model}) 생성 실패`, error);
          return { ...item, dataUrl: "", cost: 0 };
        }
      },
      iconConcurrency(model),
    );
    settled.push(...batchSettled);
  }

  const totalCost = settled.reduce((sum, r) => sum + r.cost, 0);
  const succeeded = settled.filter((r) => r.dataUrl).length;
  const costByModel: Record<string, number> = {};
  for (const r of settled) {
    costByModel[r.model] = (costByModel[r.model] ?? 0) + r.cost;
  }
  console.log(
    `[cost] generateConceptIcons (${succeeded}/${settled.length} icons): $${totalCost.toFixed(4)} byModel=${JSON.stringify(costByModel)}`,
  );

  const icons: ConceptIconMap = {};
  for (const group of groups) {
    const urls = settled.filter((r) => r.key === group.key).map((r) => r.dataUrl);
    if (urls.length) {
      icons[group.key] = urls;
    }
  }

  return { icons, cost: totalCost };
}
