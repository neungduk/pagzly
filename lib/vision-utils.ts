import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

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

export type ShadowAnalysis = {
  /** flux-fill-dev 프롬프트에 넣을 영문 조명 설명 */
  promptHint: string;
  /** 합성 SVG 그림자 타원 중심 x (0~1) */
  shadowCenterX: number;
  /** 합성 SVG 그림자 타원 중심 y (0~1) */
  shadowCenterY: number;
  /** 0~1, 그림자 강도 */
  shadowIntensity: number;
};

const DEFAULT_SHADOW: ShadowAnalysis = {
  promptHint: "soft studio lighting from upper left, natural product shadow falling gently to the lower right",
  shadowCenterX: 0.5,
  shadowCenterY: 0.83,
  shadowIntensity: 0.18,
};

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
): Promise<TextRegion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return [];
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

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const parsed = parseJsonArray<unknown>(textBlock.text);
    if (!parsed) return [];

    return parsed
      .map(normalizeTextRegion)
      .filter((r): r is TextRegion => r !== null && r.xMax - r.xMin > 0.01 && r.yMax - r.yMin > 0.01);
  } catch (error) {
    console.warn("[detectTextRegions] 실패, 크롭 안전 처리 생략", error);
    return [];
  }
}

export async function detectTextRegionsFromUrl(imageUrl: string): Promise<TextRegion[]> {
  const { buffer, mediaType } = await fetchImageBuffer(imageUrl);
  return detectTextRegions(buffer, mediaType);
}

/** 원본 상품 사진의 그림자 방향·강도를 분석해 flux 프롬프트 힌트로 변환한다. */
export async function analyzeShadowDirection(imageBuffer: Buffer): Promise<ShadowAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return DEFAULT_SHADOW;
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
              text: `상품 사진의 그림자·조명 방향을 분석하세요. JSON만 반환:

{
  "promptHint": "영문 한 문장 — 예: soft studio lighting from upper left, gentle shadow to lower right",
  "shadowCenterX": 0.5,
  "shadowCenterY": 0.83,
  "shadowIntensity": 0.18
}

shadowCenterX/Y는 그림자가 떨어지는 위치(0~1). shadowIntensity는 0.08~0.28.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return DEFAULT_SHADOW;

    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = (fenced?.[1] ?? textBlock.text).trim();
    const parsed = JSON.parse(raw) as Partial<ShadowAnalysis>;
    return {
      promptHint: parsed.promptHint ?? DEFAULT_SHADOW.promptHint,
      shadowCenterX: clamp01(Number(parsed.shadowCenterX) || DEFAULT_SHADOW.shadowCenterX),
      shadowCenterY: clamp01(Number(parsed.shadowCenterY) || DEFAULT_SHADOW.shadowCenterY),
      shadowIntensity: clamp01(Number(parsed.shadowIntensity) || DEFAULT_SHADOW.shadowIntensity),
    };
  } catch (error) {
    console.warn("[analyzeShadowDirection] 실패, 기본 조명 사용", error);
    return DEFAULT_SHADOW;
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
