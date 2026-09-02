import Anthropic from "@anthropic-ai/sdk";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { isTestMode } from "@/lib/test-mode";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";

export type HeldObjectRegion = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

export type HeldObjectPlacement = HeldObjectRegion & {
  rotationDeg: number;
  confidence: "high" | "low";
};

export type HandPlacementVisionResult = {
  placement: HeldObjectPlacement | null;
  handsVisible: boolean;
  gripSpaceVisible: boolean;
  faceRegion: HeldObjectRegion | null;
};

export type HandPlacementDetection = HandPlacementVisionResult & {
  reliable: boolean;
  rejectReason?: string;
  cost: number;
};

/** faceRegion 높이 비율만큼 상하좌우 패딩을 더한 exclusion zone */
export function expandRegionWithPadding(
  region: HeldObjectRegion,
  paddingFractionOfHeight: number,
): HeldObjectRegion {
  const pad = region.hPct * paddingFractionOfHeight;
  return {
    xPct: region.xPct - pad,
    yPct: region.yPct - pad,
    wPct: region.wPct + 2 * pad,
    hPct: region.hPct + 2 * pad,
  };
}

function rectsOverlap(a: HeldObjectRegion, b: HeldObjectRegion): boolean {
  const aRight = a.xPct + a.wPct;
  const aBottom = a.yPct + a.hPct;
  const bRight = b.xPct + b.wPct;
  const bBottom = b.yPct + b.hPct;
  return a.xPct < bRight && aRight > b.xPct && a.yPct < bBottom && aBottom > b.yPct;
}

/** 배치 bbox가 exclusion zone(패딩 포함)과 겹치면 true — 순수 좌표 계산 */
export function overlapsExclusionZone(
  placement: HeldObjectRegion,
  exclusionZone: HeldObjectRegion,
  paddingFractionOfHeight = 0.25,
): boolean {
  const expanded = expandRegionWithPadding(exclusionZone, paddingFractionOfHeight);
  return rectsOverlap(placement, expanded);
}

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function sanitizeRegion(raw: unknown): HeldObjectRegion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const xPct = Number(r.xPct ?? r.x_pct);
  const yPct = Number(r.yPct ?? r.y_pct);
  const wPct = Number(r.wPct ?? r.w_pct);
  const hPct = Number(r.hPct ?? r.h_pct);
  if ([xPct, yPct, wPct, hPct].some((n) => Number.isNaN(n))) return null;
  if (wPct <= 0 || hPct <= 0) return null;
  return {
    xPct: clampPct(xPct),
    yPct: clampPct(yPct),
    wPct: clampPct(wPct),
    hPct: clampPct(hPct),
  };
}

function sanitizePlacement(raw: unknown): HeldObjectPlacement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const region = sanitizeRegion(raw);
  if (!region) return null;
  const rotationDeg = Number(r.rotationDeg ?? r.rotation ?? 0);
  if (Number.isNaN(rotationDeg)) return null;

  const confidenceRaw = String(r.confidence ?? "low").toLowerCase();
  const confidence: HeldObjectPlacement["confidence"] =
    confidenceRaw === "high" ? "high" : "low";

  return {
    ...region,
    rotationDeg: Math.max(-45, Math.min(45, rotationDeg)),
    confidence,
  };
}

function sanitizeBool(raw: unknown, fallback = false): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return fallback;
}

/** Vision 바운딩 박스가 합리적인지 — 너무 작거나 화면 밖이면 false */
export function isHeldObjectPlacementReasonable(placement: HeldObjectPlacement): boolean {
  if (placement.wPct < 3 || placement.hPct < 3) return false;
  if (placement.wPct > 75 || placement.hPct > 75) return false;
  if (placement.xPct < -2 || placement.yPct < -2) return false;
  if (placement.xPct + placement.wPct > 102 || placement.yPct + placement.hPct > 102) return false;
  return true;
}

/** 85차 — Vision 판단 + 코드 레벨 AND 조건 + 얼굴 겹침 하드 차단 */
export function evaluateHandPlacementReliability(params: {
  placement: HeldObjectPlacement;
  handsVisible: boolean;
  gripSpaceVisible: boolean;
  faceRegion: HeldObjectRegion | null;
}): { reliable: boolean; rejectReason?: string } {
  const { placement, handsVisible, gripSpaceVisible, faceRegion } = params;

  if (placement.confidence !== "high") {
    return { reliable: false, rejectReason: "confidence-low" };
  }
  if (!handsVisible) {
    return { reliable: false, rejectReason: "hands-not-visible" };
  }
  if (!gripSpaceVisible) {
    return { reliable: false, rejectReason: "no-grip-space" };
  }
  if (!isHeldObjectPlacementReasonable(placement)) {
    return { reliable: false, rejectReason: "placement-unreasonable" };
  }
  if (faceRegion && overlapsExclusionZone(placement, faceRegion)) {
    return { reliable: false, rejectReason: "face-region-overlap" };
  }
  return { reliable: true };
}

type ImageInput = {
  buffer: Buffer;
  mediaType: "image/jpeg" | "image/png";
};

/** 84/85차 — 원본 라이프스타일 + 상품 컷아웃을 함께 보고 자연스러운 배치 위치 제안 */
export async function detectHandPlacementForProduct(
  lifestyleImage: ImageInput,
  productCutoutImage: ImageInput,
): Promise<HandPlacementDetection> {
  if (!process.env.ANTHROPIC_API_KEY || isTestMode()) {
    if (isTestMode()) {
      console.log("[hand-placement] TEST_MODE — Vision 배치 제안 스킵");
    }
    return {
      placement: null,
      handsVisible: false,
      gripSpaceVisible: false,
      faceRegion: null,
      reliable: false,
      cost: 0,
    };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: lifestyleImage.mediaType,
                data: lifestyleImage.buffer.toString("base64"),
              },
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: productCutoutImage.mediaType,
                data: productCutoutImage.buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: `이미지 1: 사람이 있는 라이프스타일 사진 (아직 상품 없음)
이미지 2: 실제 판매 상품 컷아웃

이미지 1의 사람 손 주변에 이미지 2 상품을 자연스럽게 쥐고 있는 것처럼 보이게 하려면, 상품을 어디에·얼마 크기로·몇 도 회전해서 놓아야 하는지 JSON만 반환하세요.
좌상단 기준 퍼센트(0~100) 좌표입니다.

{
  "xPct": 0-100,
  "yPct": 0-100,
  "wPct": 0-100,
  "hPct": 0-100,
  "rotationDeg": -45~45,
  "confidence": "high" | "low",
  "handsVisible": true | false,
  "gripSpaceVisible": true | false,
  "faceRegion": { "xPct": 0-100, "yPct": 0-100, "wPct": 0-100, "hPct": 0-100 } | null
}

필드 설명:
- xPct/yPct/wPct/hPct: 제안 배치 bbox (좌상단+크기). 이미지 2 종횡비 참고.
- handsVisible: 이미지 1에 사람 손이 실제로 보이면 true. 얼굴 클로즈업처럼 손이 프레임 밖이면 false.
- gripSpaceVisible: 손가락 사이 틈·벌어진 손바닥처럼 물체를 끼우거나 쥘 수 있는 빈 공간이 보이면 true. 손을 비비거나 맞닿아 공간이 없으면 false.
- faceRegion: 얼굴/머리가 보이면 대략 bbox, 없으면 null.
- confidence: handsVisible && gripSpaceVisible && 자연스러운 쥐기 가능할 때만 "high". 그 외 "low".

규칙:
- 손이 안 보이거나 쥘 공간이 없으면 confidence:"low" — 무리하게 좌표 만들지 말 것
- rotationDeg는 시계 방향(대략)`,
            },
          ],
        },
      ],
    });

    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("handPlacementForProduct", HAIKU_VISION_MODEL, cost);

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        placement: null,
        handsVisible: false,
        gripSpaceVisible: false,
        faceRegion: null,
        reliable: false,
        cost,
      };
    }

    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = (fenced?.[1] ?? textBlock.text).trim();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const placement = sanitizePlacement(parsed);
    const handsVisible = sanitizeBool(parsed.handsVisible);
    const gripSpaceVisible = sanitizeBool(parsed.gripSpaceVisible);
    const faceRegion =
      parsed.faceRegion === null || parsed.faceRegion === undefined
        ? null
        : sanitizeRegion(parsed.faceRegion);

    let reliable = false;
    let rejectReason: string | undefined;
    if (placement) {
      const evaluation = evaluateHandPlacementReliability({
        placement,
        handsVisible,
        gripSpaceVisible,
        faceRegion,
      });
      reliable = evaluation.reliable;
      rejectReason = evaluation.rejectReason;
    } else {
      rejectReason = "parse-failed";
    }

    console.log(
      `[hand-placement] confidence=${placement?.confidence ?? "unknown"} ` +
        `hands=${handsVisible} grip=${gripSpaceVisible} reliable=${reliable}` +
        (rejectReason ? ` reject=${rejectReason}` : "") +
        (placement
          ? ` box=(${placement.xPct.toFixed(1)},${placement.yPct.toFixed(1)},${placement.wPct.toFixed(1)}x${placement.hPct.toFixed(1)}) rot=${placement.rotationDeg.toFixed(1)}`
          : "") +
        (faceRegion
          ? ` face=(${faceRegion.xPct.toFixed(1)},${faceRegion.yPct.toFixed(1)},${faceRegion.wPct.toFixed(1)}x${faceRegion.hPct.toFixed(1)})`
          : " face=null"),
    );

    return {
      placement,
      handsVisible,
      gripSpaceVisible,
      faceRegion,
      reliable,
      rejectReason,
      cost,
    };
  } catch (error) {
    console.warn("[detectHandPlacementForProduct] 실패", error);
    return {
      placement: null,
      handsVisible: false,
      gripSpaceVisible: false,
      faceRegion: null,
      reliable: false,
      cost: 0,
    };
  }
}
