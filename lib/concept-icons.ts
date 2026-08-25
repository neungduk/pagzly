/**
 * 컨셉 브리프 기반 원형 배지 아이콘 — checklist / usage_steps / spec_table /
 * stat_infographic용. 기본 모델은 flux-schnell이며, ICON_MODEL env로
 * seedream-3 / qwen-image A/B 테스트 가능 (BACKDROP_PROVIDER와 동일 패턴).
 */

import Replicate from "replicate";
import { describeColorTone, hueShift } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";

export type IconModelKey = "flux-schnell" | "seedream-3" | "qwen-image";

export const ICON_MODEL_REF: Record<IconModelKey, `${string}/${string}`> = {
  "flux-schnell": "black-forest-labs/flux-schnell",
  "seedream-3": "bytedance/seedream-3",
  "qwen-image": "qwen/qwen-image",
};

export const ICON_COST_USD_BY_MODEL: Record<IconModelKey, number> = {
  "flux-schnell": 0.003,
  "seedream-3": 0.018,
  "qwen-image": 0.021,
};

/** `.env.local` ICON_MODEL=seedream-3 | qwen-image — 미설정 시 flux-schnell. */
export function getIconModel(): IconModelKey {
  const raw = process.env.ICON_MODEL;
  if (raw === "seedream-3" || raw === "qwen-image") return raw;
  return "flux-schnell";
}

/**
 * 모델별 Replicate input.
 * - flux-schnell: aspect_ratio + num_outputs + output_format
 * - seedream-3: aspect_ratio + size (num_outputs/output_format 없음, 출력은 URI 문자열)
 * - qwen-image: aspect_ratio + output_format (num_outputs 없음, 출력은 URI 배열)
 */
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
  return {
    prompt,
    num_outputs: 1,
    aspect_ratio: aspectRatio,
    output_format: "png",
    output_quality: 85,
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

async function generateSingleConceptIcon(
  label: string,
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  motifIndex: number,
  hueOffset: number,
): Promise<{ dataUrl: string; cost: number }> {
  const replicate = getReplicateClient();
  const model = getIconModel();
  const modelRef = ICON_MODEL_REF[model];
  const cost = ICON_COST_USD_BY_MODEL[model];
  const motif = brief.motif_keywords[motifIndex % brief.motif_keywords.length];
  const iconAccent = hueShift(theme.accent, hueOffset);
  const iconShadow = hueShift(theme.deepAccent, hueOffset);
  const prompt = [
    "circular badge icon, flat minimal UI illustration",
    brief.icon_style,
    `motif: ${motif}, concept for "${label.slice(0, 40)}"`,
    `${describeColorTone(iconAccent)} primary color, ${describeColorTone(iconShadow)} subtle shadow`,
    "soft round badge frame, centered symbol, no text, no letters, no watermark",
    "white or very light background, ecommerce detail page icon",
  ].join(", ");

  const output = await replicate.run(modelRef, {
    input: buildIconModelInput(model, prompt, "1:1"),
    wait: { mode: "poll", interval: 1000 },
  });
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
  const buffer = Buffer.from(await response.arrayBuffer());
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  return { dataUrl, cost };
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
};

type IconGroup = {
  key: keyof ConceptIconMap;
  labels: string[];
};

// 동시 실행 개수 제한 — flux-schnell 호출을 한 번에 너무 많이 터뜨리면
// Replicate rate limit에 걸릴 수 있어 배치 단위로 나눠 돈다.
const CONCURRENCY = 6;

async function runInBatches<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    const batch = items.slice(start, start + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((item) => worker(item)));
    batchResults.forEach((result, i) => {
      results[start + i] = result;
    });
  }
  return results;
}

/**
 * 컨셉에 맞는 원형 배지 아이콘 일괄 생성.
 * 섹션 타입별로 독립적으로 개수를 채우기 때문에, 항목이 많은 섹션이 있어도
 * 다른 섹션의 아이콘 생성 기회를 뺏지 않는다. TEST_MODE에서는 섹션 타입당
 * 최대 1장만 생성해 4개 타입 전부 육안 확인은 가능하되 비용은 낮게 유지.
 * 모델은 ICON_MODEL env (기본 flux-schnell).
 */
export async function generateConceptIcons(
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  checklistItems: string[],
  usageStepLabels: string[],
  specTableLabels: string[] = [],
  statLabels: string[] = [],
): Promise<{ icons: ConceptIconMap; cost: number }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[concept-icons] REPLICATE_API_TOKEN 없음 — 아이콘 생성 생략");
    return { icons: {}, cost: 0 };
  }

  const model = getIconModel();
  console.log(
    `[concept-icons] ICON_MODEL=${model} ($${ICON_COST_USD_BY_MODEL[model].toFixed(3)}/장)`,
  );

  const perTypeCap = isTestMode() ? 1 : Infinity;
  const allGroups: IconGroup[] = [
    { key: "checklist", labels: checklistItems.slice(0, perTypeCap) },
    { key: "usageSteps", labels: usageStepLabels.slice(0, perTypeCap) },
    { key: "specTable", labels: specTableLabels.slice(0, perTypeCap) },
    { key: "statInfographic", labels: statLabels.slice(0, perTypeCap) },
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
  const flat: { key: keyof ConceptIconMap; label: string; motifIndex: number; hueOffset: number }[] = [];
  for (const group of groups) {
    group.labels.forEach((label, i) => {
      flat.push({
        key: group.key,
        label,
        motifIndex: globalIndex,
        hueOffset: ICON_HUE_OFFSETS[globalIndex % ICON_HUE_OFFSETS.length],
      });
      globalIndex += 1;
    });
  }

  const settled = await runInBatches(flat, async (item) => {
    try {
      const { dataUrl, cost } = await generateSingleConceptIcon(
        item.label,
        brief,
        theme,
        item.motifIndex,
        item.hueOffset,
      );
      return { ...item, dataUrl, cost };
    } catch (error) {
      console.warn(`[concept-icons] "${item.label}" 생성 실패`, error);
      return { ...item, dataUrl: "", cost: 0 };
    }
  });

  const totalCost = settled.reduce((sum, r) => sum + r.cost, 0);
  const succeeded = settled.filter((r) => r.dataUrl).length;
  console.log(
    `[cost] generateConceptIcons model=${model} (${succeeded}/${settled.length} icons): $${totalCost.toFixed(4)}`,
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
