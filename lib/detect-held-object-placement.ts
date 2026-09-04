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
  /** 참고용 로그만 — 판정에 사용하지 않음 (86차) */
  gripSpaceVisible: boolean;
  faceRegion: HeldObjectRegion | null;
  handRegions: HeldObjectRegion[];
  /** 87차 — 손가락 사이 등 실제 쥐는 지점의 좁은 bbox */
  graspRegions: HeldObjectRegion[];
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

function rectArea(region: HeldObjectRegion): number {
  return region.wPct * region.hPct;
}

function rectIntersectionArea(a: HeldObjectRegion, b: HeldObjectRegion): number {
  const left = Math.max(a.xPct, b.xPct);
  const top = Math.max(a.yPct, b.yPct);
  const right = Math.min(a.xPct + a.wPct, b.xPct + b.wPct);
  const bottom = Math.min(a.yPct + a.hPct, b.yPct + b.hPct);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
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

/** 배치 bbox 면적의 minOverlapFraction 이상이 regions 중 하나와 겹치면 true */
export function overlapsHandRegion(
  placement: HeldObjectRegion,
  handRegions: HeldObjectRegion[],
  minOverlapFraction = 0.4,
): boolean {
  if (handRegions.length === 0) return false;
  const placementArea = rectArea(placement);
  if (placementArea <= 0) return false;
  for (const hand of handRegions) {
    const overlap = rectIntersectionArea(placement, hand);
    if (overlap / placementArea >= minOverlapFraction) return true;
  }
  return false;
}

/** 87차 — 배치가 graspRegions(쥐는 지점)과 충분히 겹치면 true */
export function overlapsGraspRegion(
  placement: HeldObjectRegion,
  graspRegions: HeldObjectRegion[],
  minOverlapFraction = 0.4,
): boolean {
  return overlapsHandRegion(placement, graspRegions, minOverlapFraction);
}

/** graspRegion 면적이 handRegion의 maxAreaFractionOfHand 이하일 때만 true (손 전체 복붙 의심 차단) */
export function isGraspRegionPlausible(
  graspRegion: HeldObjectRegion,
  handRegion: HeldObjectRegion,
  maxAreaFractionOfHand = 0.6,
): boolean {
  const graspArea = rectArea(graspRegion);
  const handArea = rectArea(handRegion);
  if (handArea <= 0 || graspArea <= 0) return false;
  return graspArea / handArea <= maxAreaFractionOfHand;
}

export function hasPlausibleGraspMapping(
  graspRegions: HeldObjectRegion[],
  handRegions: HeldObjectRegion[],
  maxAreaFractionOfHand = 0.6,
): boolean {
  return graspRegions.some((g) =>
    handRegions.some((h) => isGraspRegionPlausible(g, h, maxAreaFractionOfHand)),
  );
}

/** placement bbox와 graspRegions 중 최대 overlap 비율 (placement 면적 기준) */
export function getBestGraspOverlapFraction(
  placement: HeldObjectRegion,
  graspRegions: HeldObjectRegion[],
): number {
  const placementArea = rectArea(placement);
  if (placementArea <= 0) return 0;
  let best = 0;
  for (const grasp of graspRegions) {
    best = Math.max(best, rectIntersectionArea(placement, grasp) / placementArea);
  }
  return best;
}

/** 재시도 attempt마다 대표 grasp bbox 하나 선택 — placement와 overlap 최대, 없으면 면적 최대 */
export function pickRepresentativeGraspRegion(
  placement: HeldObjectRegion | null,
  graspRegions: HeldObjectRegion[],
): HeldObjectRegion | null {
  if (graspRegions.length === 0) return null;
  if (placement) {
    let best = graspRegions[0];
    let bestOverlap = rectIntersectionArea(placement, best);
    for (const grasp of graspRegions.slice(1)) {
      const overlap = rectIntersectionArea(placement, grasp);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = grasp;
      }
    }
    return best;
  }
  return graspRegions.reduce((a, b) => (rectArea(a) >= rectArea(b) ? a : b));
}

/** 여러 grasp bbox의 좌표 min/max 합집합 — Vision 호출 없음 */
export function mergeGraspRegionsUnion(regions: HeldObjectRegion[]): HeldObjectRegion | null {
  if (regions.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  for (const region of regions) {
    minX = Math.min(minX, region.xPct);
    minY = Math.min(minY, region.yPct);
    maxRight = Math.max(maxRight, region.xPct + region.wPct);
    maxBottom = Math.max(maxBottom, region.yPct + region.hPct);
  }
  if (!Number.isFinite(minX)) return null;
  return {
    xPct: minX,
    yPct: minY,
    wPct: maxRight - minX,
    hPct: maxBottom - minY,
  };
}

/** overlapsGraspRegion을 통과한 grasp 중 overlap 비율이 가장 큰 bbox */
export function findMatchingGraspRegion(
  placement: HeldObjectRegion,
  graspRegions: HeldObjectRegion[],
  minOverlapFraction = 0.4,
): HeldObjectRegion | null {
  const placementArea = rectArea(placement);
  if (placementArea <= 0) return null;

  let best: HeldObjectRegion | null = null;
  let bestFrac = 0;
  for (const grasp of graspRegions) {
    const overlap = rectIntersectionArea(placement, grasp);
    const frac = overlap / placementArea;
    if (frac >= minOverlapFraction && frac > bestFrac) {
      bestFrac = frac;
      best = grasp;
    }
  }
  return best;
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

function sanitizeHandRegions(raw: unknown): HeldObjectRegion[] {
  if (!Array.isArray(raw)) return [];
  const regions: HeldObjectRegion[] = [];
  for (const item of raw) {
    const region = sanitizeRegion(item);
    if (region) regions.push(region);
  }
  return regions;
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

/** 87차 — Vision + handRegion + graspRegion + faceRegion 좌표 하드 검증 */
export function evaluateHandPlacementReliability(params: {
  placement: HeldObjectPlacement;
  handsVisible: boolean;
  handRegions: HeldObjectRegion[];
  graspRegions: HeldObjectRegion[];
  faceRegion: HeldObjectRegion | null;
  minOverlapFraction?: number;
  /** grasp 전용 overlap/placement 비율 — 0.4 기본 (87차). 0.15로 낮추면 true grip 통과↑ but rubbing 회귀 */
  minGraspOverlapFraction?: number;
  maxGraspAreaFractionOfHand?: number;
}): { reliable: boolean; rejectReason?: string } {
  const {
    placement,
    handsVisible,
    handRegions,
    graspRegions,
    faceRegion,
    minOverlapFraction = 0.4,
    minGraspOverlapFraction = 0.4,
    maxGraspAreaFractionOfHand = 0.6,
  } = params;

  if (placement.confidence !== "high") {
    return { reliable: false, rejectReason: "confidence-low" };
  }
  if (!handsVisible) {
    return { reliable: false, rejectReason: "hands-not-visible" };
  }
  if (handRegions.length === 0) {
    return { reliable: false, rejectReason: "no-hand-regions" };
  }
  if (!overlapsHandRegion(placement, handRegions, minOverlapFraction)) {
    return { reliable: false, rejectReason: "not-overlapping-hand-region" };
  }
  if (graspRegions.length === 0) {
    return { reliable: false, rejectReason: "no-grasp-region" };
  }
  if (!overlapsGraspRegion(placement, graspRegions, minGraspOverlapFraction)) {
    return { reliable: false, rejectReason: "not-overlapping-grasp-region" };
  }
  if (!hasPlausibleGraspMapping(graspRegions, handRegions, maxGraspAreaFractionOfHand)) {
    return { reliable: false, rejectReason: "grasp-region-implausible" };
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

/** 84~86차 — 원본 라이프스타일 + 상품 컷아웃 Vision 배치 + 좌표 세이프가드 */
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
      handRegions: [],
      graspRegions: [],
      reliable: false,
      cost: 0,
    };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 700,
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
  "faceRegion": { "xPct": 0-100, "yPct": 0-100, "wPct": 0-100, "hPct": 0-100 } | null,
  "handRegions": [ { "xPct": 0-100, "yPct": 0-100, "wPct": 0-100, "hPct": 0-100 } ],
  "graspRegions": [ { "xPct": 0-100, "yPct": 0-100, "wPct": 0-100, "hPct": 0-100 } ]
}

필드 설명:
- xPct/yPct/wPct/hPct: 제안 배치 bbox (좌상단+크기). 이미지 2 종횡비 참고.
- handsVisible: 이미지 1에 사람 손이 실제로 보이면 true. 손이 프레임 밖이면 false.
- gripSpaceVisible: (참고용) 쥘 수 있는 공간이 보이면 true — 판정에는 사용되지 않음.
- faceRegion: 얼굴/머리가 보이면 대략 bbox, 없으면 null.
- handRegions: 손 전체(손목~손가락) bbox. 손이 2개면 2개 항목.
- graspRegions: handRegions 안에서 엄지·손가락 사이 등 **실제로 물체가 들어갈 좁은 틈** bbox만. 손 전체를 다시 넣지 말 것. 틈이 없으면(비비기·맞닿음) [].
- confidence: 자연스러운 쥐기 가능할 때만 "high". 그 외 "low".

규칙:
- graspRegions는 handRegions보다 눈에 띄게 작은 좁은 영역만
- 손을 비비거나 쥘 틈이 없으면 graspRegions:[] 와 confidence:"low"
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
        handRegions: [],
        graspRegions: [],
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
    const handRegions = sanitizeHandRegions(parsed.handRegions);
    const graspRegions = sanitizeHandRegions(parsed.graspRegions);

    let reliable = false;
    let rejectReason: string | undefined;
    if (placement) {
      const evaluation = evaluateHandPlacementReliability({
        placement,
        handsVisible,
        handRegions,
        graspRegions,
        faceRegion,
      });
      reliable = evaluation.reliable;
      rejectReason = evaluation.rejectReason;
    } else {
      rejectReason = "parse-failed";
    }

    const regionSummary = (regions: HeldObjectRegion[], prefix: string) =>
      regions.length > 0
        ? regions
            .map(
              (r, i) =>
                `${prefix}${i + 1}=(${r.xPct.toFixed(1)},${r.yPct.toFixed(1)},${r.wPct.toFixed(1)}x${r.hPct.toFixed(1)})`,
            )
            .join(" ")
        : "none";

    console.log(
      `[hand-placement] confidence=${placement?.confidence ?? "unknown"} ` +
        `hands=${handsVisible} grip=${gripSpaceVisible}(log-only) ` +
        `handRegions=${handRegions.length} graspRegions=${graspRegions.length} reliable=${reliable}` +
        (rejectReason ? ` reject=${rejectReason}` : "") +
        (placement
          ? ` box=(${placement.xPct.toFixed(1)},${placement.yPct.toFixed(1)},${placement.wPct.toFixed(1)}x${placement.hPct.toFixed(1)}) rot=${placement.rotationDeg.toFixed(1)}`
          : "") +
        (faceRegion
          ? ` face=(${faceRegion.xPct.toFixed(1)},${faceRegion.yPct.toFixed(1)},${faceRegion.wPct.toFixed(1)}x${faceRegion.hPct.toFixed(1)})`
          : " face=null") +
        ` hands=${regionSummary(handRegions, "#")} grasps=${regionSummary(graspRegions, "g")}`,
    );

    return {
      placement,
      handsVisible,
      gripSpaceVisible,
      faceRegion,
      handRegions,
      graspRegions,
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
      handRegions: [],
      graspRegions: [],
      reliable: false,
      cost: 0,
    };
  }
}
