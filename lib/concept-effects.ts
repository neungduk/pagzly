/**
 * 컨셉 브리프 → 상품 사진 위 연출 오버레이.
 * 배경용 generateDecorativeGraphic 과 분리: 여기는 제품 컷 위에
 * screen/soft-light/over 로 물방울·미스트·거품 등을 얹는다.
 */

import Replicate from "replicate";
import sharp from "sharp";
import type { ConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";

const FLUX_SCHNELL_REF = "black-forest-labs/flux-schnell" as const;
const EFFECT_COST_USD = 0.003;
const MAX_EFFECTS_LIVE = 2;
const MAX_EFFECTS_TEST = 1;
const NO_TEXT_PROMPT =
  "no product, no packaging, no text, no letters, no glyphs, no watermark, no logo, no calligraphy, no symbols, no asian characters";

export type ConceptEffectId =
  | "moisture"
  | "cooling"
  | "nourishing"
  | "cleansing"
  | "tech-glow"
  | "warm-light";

export type ConceptEffectSpec = {
  id: ConceptEffectId;
  labelKo: string;
  keywords: string[];
  overlayPrompt: string;
  blend: "screen" | "soft-light";
  opacity: number;
};

export type OverlaySection = {
  type: string;
  slot?: string;
  imageIndex?: number;
  heading?: string;
  headline?: string;
};

export const CONCEPT_EFFECT_MAP: ConceptEffectSpec[] = [
  {
    id: "moisture",
    labelKo: "수분/물방울",
    keywords: [
      "수분",
      "물방울",
      "촉촉",
      "보습",
      "이슬",
      "하이드레이션",
      "moisture",
      "dewy",
      "water",
      "hydration",
      "droplet",
      "hydrating",
    ],
    overlayPrompt: `photorealistic floating water droplets and dewy condensation only, isolated on a pure black background, crisp specular highlights, high contrast, ${NO_TEXT_PROMPT}`,
    blend: "screen",
    opacity: 0.22,
  },
  {
    id: "cooling",
    labelKo: "진정/쿨링",
    keywords: [
      "쿨링",
      "진정",
      "청량",
      "민트",
      "서늘",
      "시원",
      "cool",
      "soothing",
      "calm",
      "mint",
      "mist",
      "ice",
      "fresh",
    ],
    overlayPrompt: `cool mint mist and tiny ice-like particles only, isolated on a pure black background, soft cyan-teal highlights, ${NO_TEXT_PROMPT}`,
    blend: "screen",
    opacity: 0.2,
  },
  {
    id: "nourishing",
    labelKo: "영양/농축",
    keywords: [
      "영양",
      "농축",
      "골드",
      "오일",
      "앰플",
      "nourish",
      "concentrated",
      "golden",
      "oil",
      "rich",
    ],
    overlayPrompt: `creamy golden oil droplets and warm glow only, isolated on a pure black background, soft bokeh, ${NO_TEXT_PROMPT}`,
    blend: "screen",
    opacity: 0.18,
  },
  {
    id: "cleansing",
    labelKo: "클렌징/거품",
    keywords: [
      "클렌징",
      "클렌저",
      "거품",
      "버블",
      "세안",
      "폼",
      "foam",
      "bubble",
      "cleanser",
      "cleansing",
    ],
    overlayPrompt: `soft white foam bubbles and airy lather clusters only, isolated on a pure black background, translucent soap bubbles with highlights, ${NO_TEXT_PROMPT}`,
    blend: "screen",
    opacity: 0.22,
  },
  {
    id: "tech-glow",
    labelKo: "테크 글로우",
    keywords: ["파동", "테크", "사운드", "orbit", "echo", "wave", "tech", "glow", "ring"],
    overlayPrompt: `thin luminous rings and soft tech light particles only, isolated on a pure black background, subtle cyan-white glow, ${NO_TEXT_PROMPT}`,
    blend: "screen",
    opacity: 0.18,
  },
  {
    id: "warm-light",
    labelKo: "온기/보케",
    keywords: ["온기", "캔들", "따뜻", "자연광", "warm", "amber", "candle", "bokeh"],
    overlayPrompt: `warm amber bokeh and soft candlelight haze only, isolated on a pure black background, gentle highlights, ${NO_TEXT_PROMPT}`,
    blend: "soft-light",
    opacity: 0.2,
  },
];

const BEAUTY_EFFECT_IDS: ConceptEffectId[] = [
  "moisture",
  "cooling",
  "nourishing",
  "cleansing",
];

function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

export function maxConceptEffects(): number {
  return isTestMode() ? MAX_EFFECTS_TEST : MAX_EFFECTS_LIVE;
}

/**
 * 테마/모티프/무드를 카피 톤보다 높게 친다.
 * copy_tone의 "따뜻" 같은 문체가 warm-light를 가로채지 않게.
 */
export function resolveConceptEffects(
  brief: ConceptBrief,
  extraText = "",
  options?: { cosmeticsOnly?: boolean },
): ConceptEffectSpec[] {
  const primary = [brief.theme, brief.mood, ...brief.motif_keywords].join(" ");
  const visual = [brief.backdrop_hint, brief.decor_prompt].join(" ");
  const tone = [brief.copy_tone, extraText].join(" ");
  const pool = options?.cosmeticsOnly
    ? CONCEPT_EFFECT_MAP.filter((spec) => BEAUTY_EFFECT_IDS.includes(spec.id))
    : CONCEPT_EFFECT_MAP;

  const scored = pool
    .map((spec) => {
      const hits =
        countKeywordHits(primary, spec.keywords) * 3 +
        countKeywordHits(visual, spec.keywords) * 2 +
        countKeywordHits(tone, spec.keywords);
      return { spec, hits };
    })
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  const limit = maxConceptEffects();
  const picked = scored.slice(0, limit).map((row) => row.spec);
  if (picked.length > 0) return picked;
  return [options?.cosmeticsOnly ? CONCEPT_EFFECT_MAP[0] : pool[0]];
}

export function pickOverlayAssignments(
  sections: OverlaySection[],
  effectIds: string[],
  imageCount: number,
): Array<{ specIndex: number; imageIndex: number; label: string }> {
  const hero = sections.find((s) => s.type === "hero")?.imageIndex ?? 0;
  const texture = sections.find((s) => s.slot === "texture_feel")?.imageIndex;
  const ingredient = sections.find((s) => s.slot === "ingredient_highlight")?.imageIndex;
  const fallbackPoint =
    ingredient ?? texture ?? Math.min(1, Math.max(0, imageCount - 1));

  const used = new Set<number>();
  return effectIds.map((id, specIndex) => {
    let imageIndex = fallbackPoint;
    let label = "copy-match";
    if (id === "moisture" || id === "nourishing") {
      const match = sections.find((section) => {
        const text = `${section.heading ?? ""} ${section.headline ?? ""}`;
        return (
          /수분|촉촉|물방울|보습|영양|오일|앰플/.test(text) &&
          typeof section.imageIndex === "number"
        );
      });
      imageIndex = match?.imageIndex ?? fallbackPoint;
    } else if (id === "cleansing") {
      const match = sections.find((section) => {
        const text = `${section.heading ?? ""} ${section.headline ?? ""}`;
        return /클렌|거품|세안|버블/.test(text) && typeof section.imageIndex === "number";
      });
      imageIndex = match?.imageIndex ?? fallbackPoint;
    } else if (id === "cooling" || id === "tech-glow" || id === "warm-light") {
      imageIndex = hero;
      label = "hero";
    }
    if (used.has(imageIndex)) {
      // 히어로로 몰아넣지 말고, 아직 안 쓴 컷(또는 히어로 제외 다음 인덱스)을 고른다.
      let next = fallbackPoint;
      for (let i = 0; i < imageCount; i += 1) {
        const candidate = (fallbackPoint + 1 + i) % imageCount;
        if (!used.has(candidate)) {
          next = candidate;
          break;
        }
      }
      imageIndex = next;
      label = `spread-${next}`;
    }
    used.add(imageIndex);
    return { specIndex, imageIndex, label };
  });
}

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

export async function generateConceptEffectGraphic(
  spec: ConceptEffectSpec,
): Promise<{ buffer: Buffer; cost: number }> {
  const replicate = getReplicateClient();

  console.log(
    `[cost] generateConceptEffectGraphic (${spec.id}, flux-schnell): $${EFFECT_COST_USD.toFixed(4)}`,
  );

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const output = await replicate.run(FLUX_SCHNELL_REF, {
        input: {
          prompt: spec.overlayPrompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 90,
        },
        wait: { mode: "poll", interval: 1000 },
      });

      const url = extractImageUrl(output);
      if (!url) {
        throw new Error(`컨셉 효과 생성 실패: ${spec.id}`);
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`컨셉 효과 이미지 로드 실패: ${spec.id}`);
      }
      return { buffer: Buffer.from(await response.arrayBuffer()), cost: EFFECT_COST_USD };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 0 && /unavailable|upstream/i.test(message)) {
        console.warn(`[effects] Replicate 일시 실패, 8초 후 1회만 재시도: ${spec.id}`);
        await new Promise((resolve) => setTimeout(resolve, 8000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function meanLuma(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .resize(64, 64, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return sum / Math.max(pixels, 1);
}

export async function overlayConceptEffectOnProduct(
  productBuffer: Buffer,
  effectBuffer: Buffer,
  spec: ConceptEffectSpec,
): Promise<Buffer> {
  const meta = await sharp(productBuffer).metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 1200;
  const luma = await meanLuma(productBuffer);
  const lightScene = luma > 150;
  const blend = lightScene ? "over" : spec.blend;
  const opacity = lightScene ? spec.opacity * 0.72 : spec.opacity;

  const resized = await sharp(effectBuffer)
    .resize(width, height, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2026-08-26 (28차): compositeDecorOnBackdrop과 동일 방어 —
  // flux-schnell의 불완전한 순흑 배경이 luma 하드컷에서 유령 사각형으로
  // 남던 문제를 (1) 중앙 안전지대 vignette (2) 15~45 luma 램프로 완화.
  const vignetteSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="white" stop-opacity="0" />
          <stop offset="55%" stop-color="white" stop-opacity="0" />
          <stop offset="100%" stop-color="white" stop-opacity="1" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#v)" />
    </svg>`;
  const vignette = await sharp(Buffer.from(vignetteSvg))
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = resized.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const pixelLuma =
      0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    const lumaFactor = Math.min(1, Math.max(0, (pixelLuma - 15) / 30));
    const vignetteFactor = vignette.data[i + 3] / 255;
    pixels[i + 3] = Math.round(pixels[i + 3] * opacity * lumaFactor * vignetteFactor);
  }

  const effect = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return sharp(productBuffer)
    .ensureAlpha()
    .composite([{ input: effect, blend }])
    .png()
    .toBuffer();
}

export async function applyConceptOverlaysToProductImages(options: {
  imageUrls: string[];
  brief: ConceptBrief;
  sections: OverlaySection[];
  extraText?: string;
  cosmeticsOnly?: boolean;
}): Promise<{
  overlays: Array<{ imageIndex: number; buffer: Buffer; specId: ConceptEffectId }>;
  cost: number;
  effects: ConceptEffectSpec[];
}> {
  const effects = resolveConceptEffects(options.brief, options.extraText ?? "", {
    cosmeticsOnly: options.cosmeticsOnly,
  });
  const assignments = pickOverlayAssignments(
    options.sections,
    effects.map((effect) => effect.id),
    options.imageUrls.length,
  );

  const uniqueSpecs = [...new Set(assignments.map((row) => row.specIndex))];
  const graphics = new Map<number, Buffer>();
  let cost = 0;
  for (const specIndex of uniqueSpecs) {
    const generated = await generateConceptEffectGraphic(effects[specIndex]);
    graphics.set(specIndex, generated.buffer);
    cost += generated.cost;
  }

  const overlays: Array<{ imageIndex: number; buffer: Buffer; specId: ConceptEffectId }> = [];
  for (const assignment of assignments) {
    const spec = effects[assignment.specIndex];
    const graphic = graphics.get(assignment.specIndex);
    const srcUrl = options.imageUrls[assignment.imageIndex];
    if (!spec || !graphic || !srcUrl) continue;
    const response = await fetch(srcUrl);
    if (!response.ok) continue;
    const before = Buffer.from(await response.arrayBuffer());
    const after = await overlayConceptEffectOnProduct(before, graphic, spec);
    overlays.push({ imageIndex: assignment.imageIndex, buffer: after, specId: spec.id });
    console.log(
      `[effects] overlay ${spec.id} → image[${assignment.imageIndex}] (${assignment.label})`,
    );
  }

  return { overlays, cost, effects };
}

export const CONCEPT_EFFECT_UNIT_COST = EFFECT_COST_USD;
export const CONCEPT_EFFECT_MAX = MAX_EFFECTS_LIVE;
