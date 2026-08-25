/**
 * 컨셉 브리프 기반 장식 일러스트 배너 — illustration_banner 섹션용.
 * 모델은 ICON_MODEL env (concept-icons와 동일, 기본 flux-schnell).
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

/** 컨셉에 맞는 텍스트 없는 장식 일러스트 배너 (16:9) */
export async function generateIllustrationBanner(
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  heading?: string,
  body?: string,
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
  const motif = brief.motif_keywords.slice(0, 3).join(", ");
  const prompt = [
    "decorative editorial banner illustration, wide landscape composition",
    brief.icon_style,
    `visual theme: ${brief.theme}`,
    motif ? `motif elements: ${motif}` : "",
    heading ? `mood inspired by: ${heading.slice(0, 60)}` : "",
    body ? `atmosphere: ${body.slice(0, 120)}` : "",
    `${describeColorTone(theme.accent)} and ${describeColorTone(theme.deepAccent)} color palette`,
    "soft abstract shapes, ecommerce detail page section background art",
    "no text, no letters, no numbers, no words, no watermark",
  ]
    .filter(Boolean)
    .join(", ");

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
