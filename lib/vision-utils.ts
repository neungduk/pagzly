import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { isTestMode } from "@/lib/test-mode";

/** Haiku 4.5 — 라벨 감지·QA 등 경량 비전 작업용 */
export const HAIKU_VISION_MODEL = "claude-haiku-4-5-20251001";

export type TextRegion = {
  /** 0~1 정규화 좌표 (이미지 왼쪽·위 기준) */
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  kind: "label" | "logo" | "text";
};

export type ColorTemperature = "cool" | "neutral" | "warm";
export type LightFrom = "upper-left" | "upper-right" | "left" | "right" | "top";

export type ShadowAnalysis = {
  /** flux-fill-dev 프롬프트에 넣을 영문 조명 설명 */
  promptHint: string;
  /** 합성 SVG 그림자 타원 중심 x (0~1) */
  shadowCenterX: number;
  /** 합성 SVG 그림자 타원 중심 y (0~1) */
  shadowCenterY: number;
  /** 0~1, 그림자 강도 */
  shadowIntensity: number;
  colorTemperature: ColorTemperature;
  lightFrom: LightFrom;
};

export const DEFAULT_SHADOW: ShadowAnalysis = {
  promptHint:
    "neutral white studio lighting from upper left, natural product shadow falling gently to the lower right",
  shadowCenterX: 0.5,
  shadowCenterY: 0.83,
  shadowIntensity: 0.18,
  colorTemperature: "neutral",
  lightFrom: "upper-left",
};

function inferColorTemperature(hint: string): ColorTemperature {
  const t = hint.toLowerCase();
  if (/golden|amber|tungsten|warm orange|sunset|candle/.test(t)) return "warm";
  if (/cool|daylight|cyan|5500|6500|overcast|white-neutral/.test(t)) return "cool";
  if (/warm/.test(t) && !/warmth of skin/.test(t)) return "warm";
  return "neutral";
}

function inferLightFrom(hint: string): LightFrom {
  const t = hint.toLowerCase();
  if (/upper right|top[- ]right/.test(t)) return "upper-right";
  if (/upper left|top[- ]left/.test(t)) return "upper-left";
  if (/\bright\b/.test(t) && /light/.test(t)) return "right";
  if (/\bleft\b/.test(t) && /light/.test(t)) return "left";
  if (/overhead|from above|top light/.test(t)) return "top";
  return "upper-left";
}

/** 배경 생성·합성에 넣는 조명 잠금 문장. 상품 톤을 배경이 덮어쓰지 않게. */
export function lightingLockPrompt(shadow: ShadowAnalysis): string {
  const temp =
    shadow.colorTemperature === "cool"
      ? "cool daylight 5500-6500K, white-neutral, no golden hour, no amber bounce, no tungsten"
      : shadow.colorTemperature === "warm"
        ? "warm studio 3200-4000K, gentle amber bounce allowed"
        : "neutral white 5000K studio, no warm golden cast, no orange bounce";
  const dir =
    shadow.lightFrom === "upper-right"
      ? "key light from upper right, shadow falling lower left"
      : shadow.lightFrom === "left"
        ? "key light from camera left, shadow to the right"
        : shadow.lightFrom === "right"
          ? "key light from camera right, shadow to the left"
          : shadow.lightFrom === "top"
            ? "overhead key light, shadow falling directly below"
            : "key light from upper left, shadow falling lower right";
  return `LIGHTING LOCK: ${temp}. ${dir}. ${shadow.promptHint}`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseJsonArray<T>(text: string): T[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return null;
    try {
      const parsed = JSON.parse(arrayMatch[0]) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      return null;
    }
  }
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mediaType: "image/jpeg" | "image/png" }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지를 불러올 수 없습니다: ${url}`);
  }
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mediaType,
  };
}

function normalizeTextRegion(raw: unknown): TextRegion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const xMin = Number(r.xMin ?? r.x_min ?? r.left);
  const yMin = Number(r.yMin ?? r.y_min ?? r.top);
  const xMax = Number(r.xMax ?? r.x_max ?? r.right);
  const yMax = Number(r.yMax ?? r.y_max ?? r.bottom);
  if ([xMin, yMin, xMax, yMax].some((n) => Number.isNaN(n))) return null;

  const kindRaw = String(r.kind ?? r.type ?? "text").toLowerCase();
  const kind: TextRegion["kind"] =
    kindRaw.includes("logo") ? "logo" : kindRaw.includes("label") ? "label" : "text";

  return {
    xMin: clamp01(Math.min(xMin, xMax)),
    yMin: clamp01(Math.min(yMin, yMax)),
    xMax: clamp01(Math.max(xMin, xMax)),
    yMax: clamp01(Math.max(yMin, yMax)),
    kind,
  };
}

/** 상품 사진에서 라벨·로고·텍스트 영역을 Haiku 비전으로 감지한다. */
export async function detectTextRegions(
  imageBuffer: Buffer,
  mediaType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<{ regions: TextRegion[]; cost: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { regions: [], cost: 0 };
  }

  if (isTestMode()) {
    console.log("[safeCrop] TEST_MODE — 텍스트 영역 감지(Haiku) 스킵");
    return { regions: [], cost: 0 };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: `이커머스 상품 사진에서 읽을 수 있는 라벨·로고·인쇄 텍스트 영역을 찾아주세요.
각 영역을 0~1 정규화 bounding box로 JSON 배열만 반환하세요. 다른 설명은 금지.

형식:
[
  { "xMin": 0.1, "yMin": 0.2, "xMax": 0.4, "yMax": 0.35, "kind": "label" },
  { "xMin": 0.5, "yMin": 0.05, "xMax": 0.7, "yMax": 0.15, "kind": "logo" }
]

kind는 "label" | "logo" | "text" 중 하나. 텍스트/라벨/로고가 없으면 빈 배열 []`,
            },
          ],
        },
      ],
    });

    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("textDetect", HAIKU_VISION_MODEL, cost);

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { regions: [], cost };

    const parsed = parseJsonArray<unknown>(textBlock.text);
    if (!parsed) return { regions: [], cost };

    const regions = parsed
      .map(normalizeTextRegion)
      .filter((r): r is TextRegion => r !== null && r.xMax - r.xMin > 0.01 && r.yMax - r.yMin > 0.01);
    return { regions, cost };
  } catch (error) {
    console.warn("[detectTextRegions] 실패, 크롭 안전 처리 생략", error);
    return { regions: [], cost: 0 };
  }
}

export async function detectTextRegionsFromUrl(
  imageUrl: string,
): Promise<{ regions: TextRegion[]; cost: number }> {
  const { buffer, mediaType } = await fetchImageBuffer(imageUrl);
  return detectTextRegions(buffer, mediaType);
}

export type ProductBoundingBox = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
};

/**
 * Haiku Vision으로 원본 사진에서 실제 판매 상품의 bounding box를 감지.
 * 배경제거 재시도 시 상품 영역만 크롭해서 넘기는 용도.
 * TEST_MODE이거나 API키 없으면 null 반환.
 */
export async function detectProductRegion(
  imageBuffer: Buffer,
  productName: string,
  mediaType: "image/jpeg" | "image/png" = "image/jpeg",
  options?: { strict?: boolean },
): Promise<{ box: ProductBoundingBox | null; cost: number }> {
  if (!process.env.ANTHROPIC_API_KEY) return { box: null, cost: 0 };
  if (isTestMode()) {
    console.log("[detectProductRegion] TEST_MODE — 스킵");
    return { box: null, cost: 0 };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: `이 사진에서 메인으로 보이는 판매 상품(제품 본체·케이스·패키지 박스)의 bounding box를 하나만 0~1 정규화 좌표로 반환하세요.
참고 상품명: '${productName}' (사진 속 브랜드/표기가 달라도 메인 상품을 잡으세요)
반드시 제외: 사람, 손, 팔, 손목, 손가락, 강아지, 배경 가구·노트북·소품, 어두운 직사각 카드/플레이트/원본 프레임.
사람이 상품을 들고 있어도 손·팔은 박스에 넣지 말고 상품만 타이트하게 잡으세요.
${options?.strict ? "엄격 모드: 박스는 상품 본체만 — 여백·손·플레이트·어두운 배경판은 절대 포함하지 말고 가능한 한 타이트하게." : ""}

JSON만 반환:
{ "xMin": 0.1, "yMin": 0.2, "xMax": 0.8, "yMax": 0.9 }

상품이 식별되지 않으면 null`,
            },
          ],
        },
      ],
    });

    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("productRegionDetect", HAIKU_VISION_MODEL, cost);

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { box: null, cost };

    const raw = textBlock.text.trim();
    if (/null/i.test(raw) && !raw.includes("{")) return { box: null, cost };

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { box: null, cost };

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const xMin = Number(parsed.xMin ?? parsed.x_min);
    const yMin = Number(parsed.yMin ?? parsed.y_min);
    const xMax = Number(parsed.xMax ?? parsed.x_max);
    const yMax = Number(parsed.yMax ?? parsed.y_max);

    if ([xMin, yMin, xMax, yMax].some((n) => Number.isNaN(n))) return { box: null, cost };
    if (xMax - xMin < 0.02 || yMax - yMin < 0.02) return { box: null, cost };

    const box: ProductBoundingBox = {
      xMin: clamp01(Math.min(xMin, xMax)),
      yMin: clamp01(Math.min(yMin, yMax)),
      xMax: clamp01(Math.max(xMin, xMax)),
      yMax: clamp01(Math.max(yMin, yMax)),
    };

    console.log(
      `[detectProductRegion] '${productName}' box: [${box.xMin.toFixed(2)},${box.yMin.toFixed(2)}]→[${box.xMax.toFixed(2)},${box.yMax.toFixed(2)}]`,
    );
    return { box, cost };
  } catch (error) {
    console.warn("[detectProductRegion] 실패, 상품 영역 감지 생략", error);
    return { box: null, cost: 0 };
  }
}

/**
 * rembg 컷아웃(투명 배경)에 손·팔·사람 잔여가 있는지 빠르게 판별.
 * true면 재크롭 후 배경제거를 한 번 더 시도한다.
 */
export async function detectCutoutHasHandOrPerson(
  cutoutBuffer: Buffer,
): Promise<{ contaminated: boolean; cost: number }> {
  if (!process.env.ANTHROPIC_API_KEY || isTestMode()) {
    return { contaminated: false, cost: 0 };
  }
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: cutoutBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: `이 투명 배경 컷아웃에 다음이 조금이라도 보이나요?
- 사람 손·손가락·팔·손목·얼굴·피부
- 어두운 직사각형 카드/플레이트/원본 사진 프레임(검은·회색 박스)
상품(이어버드·케이스·박스·기기·용기)만 깨끗하면 no.
JSON만: { "handOrPerson": true } 또는 { "handOrPerson": false }`,
            },
          ],
        },
      ],
    });
    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("cutoutHandDetect", HAIKU_VISION_MODEL, cost);
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { contaminated: false, cost };
    const m = textBlock.text.match(/\{[\s\S]*?\}/);
    if (!m) return { contaminated: false, cost };
    const parsed = JSON.parse(m[0]) as { handOrPerson?: boolean };
    const contaminated = Boolean(parsed.handOrPerson);
    console.log(`[cutoutHandDetect] contaminated=${contaminated}`);
    return { contaminated, cost };
  } catch (error) {
    console.warn("[cutoutHandDetect] 실패 — 오염 없음으로 간주", error);
    return { contaminated: false, cost: 0 };
  }
}

/** 원본 상품 사진의 그림자 방향·강도를 분석해 flux 프롬프트 힌트로 변환한다. */
export async function analyzeShadowDirection(
  imageBuffer: Buffer,
): Promise<{ shadow: ShadowAnalysis; cost: number }> {
  if (!process.env.ANTHROPIC_API_KEY || isTestMode()) {
    if (isTestMode()) {
      console.log("[shadow] TEST_MODE — 그림자 분석(Haiku) 스킵, 기본 조명 사용");
    }
    return { shadow: DEFAULT_SHADOW, cost: 0 };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: `상품 사진의 그림자·조명 방향과 색온도를 분석하세요. JSON만 반환:

{
  "promptHint": "영문 한 문장 — 색온도와 방향을 구체적으로. 예: cool neutral daylight from upper left, crisp shadow to lower right",
  "shadowCenterX": 0.5,
  "shadowCenterY": 0.83,
  "shadowIntensity": 0.18,
  "colorTemperature": "cool" | "neutral" | "warm",
  "lightFrom": "upper-left" | "upper-right" | "left" | "right" | "top"
}

중립 흰 조명인데 골든아워로 쓰지 마세요. shadowCenterX/Y는 그림자가 떨어지는 위치(0~1). shadowIntensity는 0.08~0.28.`,
            },
          ],
        },
      ],
    });

    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("shadowAnalysis", HAIKU_VISION_MODEL, cost);

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { shadow: DEFAULT_SHADOW, cost };
    }

    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = (fenced?.[1] ?? textBlock.text).trim();
    const parsed = JSON.parse(raw) as Partial<ShadowAnalysis> & {
      colorTemperature?: string;
      lightFrom?: string;
    };
    const promptHint = parsed.promptHint ?? DEFAULT_SHADOW.promptHint;
    const colorTemperature: ColorTemperature =
      parsed.colorTemperature === "cool" ||
      parsed.colorTemperature === "neutral" ||
      parsed.colorTemperature === "warm"
        ? parsed.colorTemperature
        : inferColorTemperature(promptHint);
    const lightFrom: LightFrom =
      parsed.lightFrom === "upper-left" ||
      parsed.lightFrom === "upper-right" ||
      parsed.lightFrom === "left" ||
      parsed.lightFrom === "right" ||
      parsed.lightFrom === "top"
        ? parsed.lightFrom
        : inferLightFrom(promptHint);
    return {
      shadow: {
        promptHint,
        shadowCenterX: clamp01(Number(parsed.shadowCenterX) || DEFAULT_SHADOW.shadowCenterX),
        shadowCenterY: clamp01(Number(parsed.shadowCenterY) || DEFAULT_SHADOW.shadowCenterY),
        shadowIntensity: clamp01(Number(parsed.shadowIntensity) || DEFAULT_SHADOW.shadowIntensity),
        colorTemperature,
        lightFrom,
      },
      cost,
    };
  } catch (error) {
    console.warn("[analyzeShadowDirection] 실패, 기본 조명 사용", error);
    return { shadow: DEFAULT_SHADOW, cost: 0 };
  }
}

/** 라벨·로고 영역 + 알파 콘텐츠 경계를 모두 포함하는 안전 crop 박스 (픽셀) */
export function computeSafeCropBox(
  width: number,
  height: number,
  regions: TextRegion[],
  minMarginRatio = 0.04,
  contentBounds?: { left: number; top: number; width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  const marginX = Math.round(width * minMarginRatio);
  const marginY = Math.round(height * minMarginRatio);

  let left = contentBounds?.left ?? 0;
  let top = contentBounds?.top ?? 0;
  let right = (contentBounds?.left ?? 0) + (contentBounds?.width ?? width);
  let bottom = (contentBounds?.top ?? 0) + (contentBounds?.height ?? height);

  for (const region of regions) {
    left = Math.min(left, Math.round(region.xMin * width));
    top = Math.min(top, Math.round(region.yMin * height));
    right = Math.max(right, Math.round(region.xMax * width));
    bottom = Math.max(bottom, Math.round(region.yMax * height));
  }

  left = Math.max(0, left - marginX);
  top = Math.max(0, top - marginY);
  right = Math.min(width, right + marginX);
  bottom = Math.min(height, bottom + marginY);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

/** sharp 알파 채널 기준 실제 콘텐츠 bounding box */
export async function getAlphaContentBounds(
  buffer: Buffer,
): Promise<{ left: number; top: number; width: number; height: number } | null> {
  try {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    if (channels < 4) return null;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * channels + 3];
        if (alpha > 12) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX <= minX || maxY <= minY) return null;
    return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  } catch {
    return null;
  }
}

/** 라벨/로고가 잘리지 않도록 안전 여백을 두고 crop */
export async function applySafeCrop(
  buffer: Buffer,
  regions: TextRegion[],
  minMarginRatio = 0.04,
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return buffer;

  const alphaBounds = await getAlphaContentBounds(buffer);
  const crop = computeSafeCropBox(width, height, regions, minMarginRatio, alphaBounds ?? undefined);

  if (crop.width >= width * 0.98 && crop.height >= height * 0.98) {
    return buffer;
  }

  return sharp(buffer)
    .extract(crop)
    .png()
    .toBuffer();
}

/** 캔버스 배치 시 라벨 영역이 가장자리에서 minMarginRatio 이상 떨어지도록 스케일·오프셋 계산 */
export function computeSafeCanvasPlacement(
  canvasSize: number,
  cutoutWidth: number,
  cutoutHeight: number,
  regions: TextRegion[],
  minMarginRatio = 0.04,
): { scale: number; left: number; top: number } {
  const margin = canvasSize * minMarginRatio;
  const maxW = canvasSize - margin * 2;
  const maxH = canvasSize - margin * 2;
  let scale = Math.min(maxW / cutoutWidth, maxH / cutoutHeight, 1);
  scale = Math.min(scale, (canvasSize * 0.68) / Math.max(cutoutWidth, cutoutHeight));

  let left = (canvasSize - cutoutWidth * scale) / 2;
  let top = (canvasSize - cutoutHeight * scale) / 2 - canvasSize * 0.02;

  for (const region of regions) {
    const rx1 = left + region.xMin * cutoutWidth * scale;
    const ry1 = top + region.yMin * cutoutHeight * scale;
    const rx2 = left + region.xMax * cutoutWidth * scale;
    const ry2 = top + region.yMax * cutoutHeight * scale;

    if (rx1 < margin) left += margin - rx1;
    if (ry1 < margin) top += margin - ry1;
    if (rx2 > canvasSize - margin) left -= rx2 - (canvasSize - margin);
    if (ry2 > canvasSize - margin) top -= ry2 - (canvasSize - margin);
  }

  if (left + cutoutWidth * scale > canvasSize - margin) {
    scale *= (canvasSize - margin * 2) / (cutoutWidth * scale + left);
    left = (canvasSize - cutoutWidth * scale) / 2;
    top = (canvasSize - cutoutHeight * scale) / 2 - canvasSize * 0.02;
  }

  return { scale, left: Math.round(left), top: Math.round(top) };
}
