/**
 * 컨셉 브리프 기반 장식 일러스트 배너 — illustration_banner 섹션용.
 * 모델은 ICON_MODEL env (concept-icons와 동일, 기본 flux-schnell).
 *
 * 주의: heading/body(한글 카피)를 이미지 프롬프트에 넣으면 Flux가 깨진
 * 한글·가짜 웹 UI(네비/검색창)를 픽셀로 그려 넣는다. 카피는 렌더러 오버레이만 사용.
 */

import Replicate from "replicate";
import { describeColorTone } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";
import {
  buildIconModelInput,
  getIconModel,
  ICON_COST_USD_BY_MODEL,
  ICON_MODEL_REF,
} from "@/lib/concept-icons";

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

  const model = getIconModel();
  const modelRef = ICON_MODEL_REF[model];
  const cost = ICON_COST_USD_BY_MODEL[model];

  if (isTestMode()) {
    console.log(`[concept-illustration] TEST_MODE — ${model} 일러스트 1장만 생성`);
  } else {
    console.log(`[concept-illustration] ICON_MODEL=${model}`);
  }

  const replicate = getReplicateClient();
  const motif = asciiMotifOnly(brief.motif_keywords.slice(0, 3).join(", "));
  const themeAscii = asciiMotifOnly(brief.theme);
  const styleAscii = asciiMotifOnly(brief.icon_style);
  // heading/body는 의도적으로 프롬프트에 넣지 않음 — 깨진 한글·가짜 UI 환각 유발.

  const prompt = [
    "abstract decorative background art only, wide 16:9 landscape",
    "soft gradient waves, fluid organic shapes, single centered motif symbol",
    styleAscii || "flat minimal editorial illustration",
    themeAscii ? `mood: ${themeAscii}` : "",
    motif ? `motif: ${motif}` : "",
    `${describeColorTone(theme.accent)} and ${describeColorTone(theme.deepAccent)} color palette`,
    "clean empty center area, atmospheric backdrop for product detail page",
    "no product photo, no packaging, no human, no face",
    NO_TEXT_LOCK,
  ]
    .filter(Boolean)
    .join(", ");

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
      const retryable = status === 503 || status === 429 || status === 502;
      if (!retryable || attempt === 3) {
        throw error;
      }
      console.warn(
        `[concept-illustration] ${model} ${status} — ${attempt}/3 재시도`,
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
  const buffer = Buffer.from(await response.arrayBuffer());
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

  console.log(`[cost] generateIllustrationBanner (${model}): $${cost.toFixed(4)}`);
  return { dataUrl, cost };
}
