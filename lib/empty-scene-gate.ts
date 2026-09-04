/**
 * 115차 — 빈손 씬 사후 검증 게이트.
 *
 * 조사 결과: detectHandPlacementForProduct / detectHandPlacementWithGraspRetry는
 * "어디에 붙일지" 배치 제안만 하며, 손에 이미 물체가 있는지 판정하지 않음
 * (프롬프트가 "아직 상품 없음"을 전제). gripSpaceVisible도 log-only.
 * → 물체 유무는 Haiku Vision 1문(heldObjectVisible)으로 판정.
 * 휴리스틱은 단위 테스트·TEST_MODE용 보조. Vision 실패 시 production은 fail-closed(drop).
 */
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { calculateClaudeCost, logClaudeCost } from "@/lib/claude-cost";
import { isTestMode } from "@/lib/test-mode";
import { HAIKU_VISION_MODEL } from "@/lib/vision-utils";

export type EmptySceneGateVerdict = "clean" | "already-occupied";

export type EmptySceneGateDecision = {
  result: EmptySceneGateVerdict;
  source: "vision" | "heuristic" | "fail-closed";
  heuristicScore: number;
  cost: number;
  reason?: string;
};

/** 합성 픽스처용 — 실사진보다 합성 흰덩어리 검출에 맞춤 */
export const HEURISTIC_OCCUPIED_THRESHOLD = 0.28;

/**
 * 순수 결정: Vision 응답 또는 휴리스틱만으로 clean/occupied 결정.
 * visionHeldObject === null 이면 휴리스틱만 사용.
 */
export function decideEmptySceneGate(params: {
  visionHeldObject: boolean | null;
  heuristicScore: number;
  threshold?: number;
  /** production에서 Vision 불가 시 true → already-occupied */
  failClosedIfNoVision?: boolean;
}): EmptySceneGateDecision {
  const threshold = params.threshold ?? HEURISTIC_OCCUPIED_THRESHOLD;
  const heuristicScore = params.heuristicScore;

  if (params.visionHeldObject === true) {
    return {
      result: "already-occupied",
      source: "vision",
      heuristicScore,
      cost: 0,
      reason: "vision-held-object",
    };
  }
  if (params.visionHeldObject === false) {
    return {
      result: "clean",
      source: "vision",
      heuristicScore,
      cost: 0,
      reason: "vision-empty",
    };
  }

  if (params.failClosedIfNoVision) {
    return {
      result: "already-occupied",
      source: "fail-closed",
      heuristicScore,
      cost: 0,
      reason: "vision-unavailable-fail-closed",
    };
  }

  const occupied = heuristicScore >= threshold;
  return {
    result: occupied ? "already-occupied" : "clean",
    source: "heuristic",
    heuristicScore,
    cost: 0,
    reason: occupied ? "heuristic-high-objectness" : "heuristic-low-objectness",
  };
}

/**
 * 중앙 영역의 밝은 저채도(병·캡류) 비율 + 엣지.
 * 합성 픽스처·TEST_MODE 보조용 — 실사진 단독 판정은 Vision 사용.
 */
export async function scoreCenterObjectness(imageBuffer: Buffer): Promise<number> {
  const { data, info } = await sharp(imageBuffer)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  if (w < 8 || h < 8) return 0;

  const x0 = Math.floor(w * 0.3);
  const x1 = Math.floor(w * 0.7);
  const y0 = Math.floor(h * 0.2);
  const y1 = Math.floor(h * 0.7);

  let edgeHits = 0;
  let samples = 0;
  let brightBlob = 0;

  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * w + x) * ch;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      samples += 1;

      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const brightness = (r + g + b) / 3;
      // 피부보다 밝고 채도 낮은 면(흰 병·캡)
      if (brightness >= 205 && chroma < 40) brightBlob += 1;

      const iRight = (y * w + Math.min(w - 1, x + 2)) * ch;
      const iDown = (Math.min(h - 1, y + 2) * w + x) * ch;
      const dr = Math.abs(r - (data[iRight] ?? r)) + Math.abs(r - (data[iDown] ?? r));
      const dg =
        Math.abs(g - (data[iRight + 1] ?? g)) + Math.abs(g - (data[iDown + 1] ?? g));
      const db =
        Math.abs(b - (data[iRight + 2] ?? b)) + Math.abs(b - (data[iDown + 2] ?? b));
      if (dr + dg + db > 80) edgeHits += 1;
    }
  }

  if (samples === 0) return 0;
  return Math.min(1, brightBlob / samples + (edgeHits / samples) * 0.4);
}

async function visionHeldObjectVisible(
  image: { buffer: Buffer; mediaType: "image/jpeg" | "image/png" },
): Promise<{ held: boolean | null; cost: number }> {
  if (!process.env.ANTHROPIC_API_KEY || isTestMode()) {
    return { held: null, cost: 0 };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: HAIKU_VISION_MODEL,
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: `Is there already a bottle, package, dropper, jar, or other product object held in a person's hand (or clearly gripped)?
Answer JSON only: {"heldObjectVisible": true|false}
- true: any bottle/cylindrical product/package already in hand or fingers
- false: empty hand / empty holding gesture only (skin only in the grasp)`,
            },
          ],
        },
      ],
    });

    const cost = calculateClaudeCost(HAIKU_VISION_MODEL, message.usage);
    logClaudeCost("emptySceneOccupancy", HAIKU_VISION_MODEL, cost);

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { held: null, cost };
    }
    const fenced = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = (fenced?.[1] ?? textBlock.text).trim();
    const parsed = JSON.parse(raw) as { heldObjectVisible?: unknown };
    if (typeof parsed.heldObjectVisible === "boolean") {
      return { held: parsed.heldObjectVisible, cost };
    }
    return { held: null, cost };
  } catch (err) {
    console.warn("[empty-scene-gate] vision failed", err);
    return { held: null, cost: 0 };
  }
}

function sniffMediaType(buf: Buffer): "image/jpeg" | "image/png" {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  return "image/jpeg";
}

/** 씬 버퍼 → clean | already-occupied (Vision 우선, 실패 시 fail-closed / TEST면 휴리스틱) */
export async function evaluateEmptySceneOccupancy(
  imageBuffer: Buffer,
): Promise<EmptySceneGateDecision> {
  const heuristicScore = await scoreCenterObjectness(imageBuffer);
  const vision = await visionHeldObjectVisible({
    buffer: imageBuffer,
    mediaType: sniffMediaType(imageBuffer),
  });
  const decided = decideEmptySceneGate({
    visionHeldObject: vision.held,
    heuristicScore,
    failClosedIfNoVision: !isTestMode() && vision.held === null,
  });
  return { ...decided, cost: vision.cost };
}

/** 재시도 시 프롬프트에 붙이는 부정 강화문 */
export const EMPTY_SCENE_RETRY_PROMPT_SUFFIX =
  " CRITICAL RETRY: the hand must be completely empty — absolutely no bottle, no cylindrical object of any kind, no dropper cap, no jar, no product silhouette, no package. Empty fingers only, skin only in the grasp.";
