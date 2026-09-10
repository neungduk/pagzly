/**
 * 컨셉 브리프 기반 장식 일러스트 배너 — illustration_banner 섹션용.
 *
 * 142차 선별 적용: illustration_banner는 항상 recraft-v3로 고정
 * (ICON_MODEL / getIconModel()과 무관). 크게 보이는 배너에서 디테일 우위가
 * 체감되고, 페이지당 원가 증가는 배너 1장($0.04)으로 한정된다.
 * checklist 등 소형 배지는 concept-icons에서 flux-schnell을 유지한다.
 *
 * 주의: heading/body(한글 카피)를 이미지 프롬프트에 넣으면 깨진
 * 한글·가짜 웹 UI(네비/검색창)를 픽셀로 그려 넣는다. 카피는 렌더러 오버레이만 사용.
 */

import Replicate from "replicate";
import sharp from "sharp";
import { describeColorTone } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";
import { isPremiumQualityMode } from "@/lib/premium-mode";
import {
  buildIconModelInput,
  ICON_COST_USD_BY_MODEL,
  ICON_MODEL_REF,
  RECRAFT_NO_TYPOGRAPHY_CLAUSE,
  resolveRecraftStyle,
  type IconModelKey,
} from "@/lib/concept-icons";

/**
 * 142차 — illustration_banner 전용 고정 모델(ICON_MODEL과 무관).
 * 145차 — PREMIUM_QUALITY_MODE=true면 recraft-v4-svg로 업그레이드(143차 검증:
 * 동일 계열 중 가장 또렷한 벡터 결과, 원가 $0.04→$0.08).
 */
function resolveIllustrationBannerModel(): IconModelKey {
  return isPremiumQualityMode() ? "recraft-v4-svg" : "recraft-v3";
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

/**
 * 156차 — 503/429/502 상태 코드만 재시도하던 것을 504 및 타임아웃/네트워크류
 * 오류(상태 코드가 없는 경우가 많음)까지 넓혔다. concept-icons.ts와 동일 패턴.
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

/** 프롬프트에 한글/라틴 문장이 섞이면 모델이 글자를 그리려 하므로 ASCII 키워드만 남긴다. */
function asciiMotifOnly(raw: string): string {
  return raw
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const NO_TEXT_LOCK = [
  "absolutely no text",
  "no letters",
  "no numbers",
  "no words",
  "no glyphs",
  "no korean characters",
  "no hangul",
  "no asian characters",
  "no latin alphabet",
  "no typography",
  "no watermark",
  "no logo",
  "no brand name",
  "no website UI",
  "no navigation bar",
  "no menu",
  "no search bar",
  "no button",
  "no browser chrome",
  "no fake interface",
  "no app screenshot",
  "empty visual field for overlay copy",
].join(", ");

/** 컨셉에 맞는 텍스트 없는 장식 일러스트 배너 (16:9) */
export async function generateIllustrationBanner(
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  _heading?: string,
  _body?: string,
): Promise<{ dataUrl: string; cost: number }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[concept-illustration] REPLICATE_API_TOKEN 없음 — 일러스트 생성 생략");
    return { dataUrl: "", cost: 0 };
  }

  const model = resolveIllustrationBannerModel();
  const modelRef = ICON_MODEL_REF[model];
  const cost = ICON_COST_USD_BY_MODEL[model];

  if (isTestMode()) {
    console.log(`[concept-illustration] TEST_MODE — ${model} 일러스트 1장만 생성 (142/145 selective)`);
  } else {
    console.log(`[concept-illustration] model=${model} (142/145 selective, ignore ICON_MODEL)`);
  }

  const replicate = getReplicateClient();
  const motif = asciiMotifOnly(brief.motif_keywords.slice(0, 3).join(", "));
  const themeAscii = asciiMotifOnly(brief.theme);
  const styleAscii = asciiMotifOnly(brief.icon_style);
  // heading/body는 의도적으로 프롬프트에 넣지 않음 — 깨진 한글·가짜 UI 환각 유발.

  const promptParts = [
    "abstract decorative background art only, wide 16:9 landscape",
    "professional editorial illustration, magazine-quality decorative art",
    "sharp focus, refined color grading, subtle gradient mesh",
    "soft gradient waves, fluid organic shapes, single centered motif symbol",
    styleAscii || "flat minimal editorial illustration",
    // v4-svg에는 style 파라미터가 없어 outline 미학을 프롬프트로 명시 (143차와 동일 패턴)
    model === "recraft-v4-svg"
      ? "hand-drawn outline digital illustration style, thick clean black outlines, flat color fills"
      : "",
    themeAscii ? `mood: ${themeAscii}` : "",
    motif ? `motif: ${motif}` : "",
    `${describeColorTone(theme.accent)} and ${describeColorTone(theme.deepAccent)} color palette`,
    "clean empty center area, atmospheric backdrop for product detail page",
    "no product photo, no packaging, no human, no face",
    NO_TEXT_LOCK,
    RECRAFT_NO_TYPOGRAPHY_CLAUSE,
  ];
  console.log(`[concept-illustration] recraft style=${resolveRecraftStyle()} + no-typography clause`);
  const prompt = promptParts.filter(Boolean).join(", ");

  console.log(`[concept-illustration] prompt: ${prompt.slice(0, 280)}…`);

  let output: unknown;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      output = await replicate.run(modelRef, {
        input: buildIconModelInput(model, prompt, "16:9"),
        wait: { mode: "poll", interval: 1000 },
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      const status = (error as { response?: { status?: number } }).response?.status;
      const retryable = isRetryableReplicateError(error);
      if (!retryable || attempt === 3) {
        throw error;
      }
      console.warn(
        `[concept-illustration] ${model} ${status ?? "no-status"} — ${attempt}/3 재시도`,
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  if (lastError) {
    throw lastError;
  }

  console.log(`[concept-illustration] model=${model} output:`, output);

  const url = extractImageUrl(output);
  if (!url) {
    throw new Error(`일러스트 배너 생성 실패 (${model})`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("일러스트 배너 이미지 로드 실패");
  }
  const raw = Buffer.from(await response.arrayBuffer());
  // recraft-v4-svg는 실제 SVG를 반환한다(143차 확인) — 렌더러는 PNG dataUrl만
  // 다루므로 sharp로 래스터화한다.
  const contentType = response.headers.get("content-type") ?? "";
  const looksSvg =
    model === "recraft-v4-svg" ||
    contentType.includes("svg") ||
    raw.slice(0, 200).toString("utf8").includes("<svg");
  const pngBuffer = looksSvg ? await sharp(raw).png().toBuffer() : raw;
  const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

  console.log(`[cost] generateIllustrationBanner (${model}): $${cost.toFixed(4)}`);
  return { dataUrl, cost };
}
