/**
 * 컨셉 브리프 기반 장식 일러스트 배너 — illustration_banner 섹션용 flux-schnell 생성.
 */

import Replicate from "replicate";
import { describeColorTone } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";

const FLUX_SCHNELL_REF = "black-forest-labs/flux-schnell" as const;
const ILLUSTRATION_COST_USD = 0.003;

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
): Promise<{ dataUrl: string; cost: number }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[concept-illustration] REPLICATE_API_TOKEN 없음 — 일러스트 생성 생략");
    return { dataUrl: "", cost: 0 };
  }

  if (isTestMode()) {
    console.log("[concept-illustration] TEST_MODE — flux-schnell 일러스트 1장만 생성");
  }

  const replicate = getReplicateClient();
  const motif = brief.motif_keywords.slice(0, 3).join(", ");
  const prompt = [
    "decorative editorial banner illustration, wide landscape composition",
    brief.icon_style,
    `visual theme: ${brief.theme}`,
    motif ? `motif elements: ${motif}` : "",
    heading ? `mood inspired by: ${heading.slice(0, 60)}` : "",
    `${describeColorTone(theme.accent)} and ${describeColorTone(theme.deepAccent)} color palette`,
    "soft abstract shapes, ecommerce detail page section background art",
    "no text, no letters, no numbers, no words, no watermark",
  ]
    .filter(Boolean)
    .join(", ");

  const output = await replicate.run(FLUX_SCHNELL_REF, {
    input: {
      prompt,
      num_outputs: 1,
      aspect_ratio: "16:9",
      output_format: "png",
      output_quality: 85,
    },
    wait: { mode: "poll", interval: 1000 },
  });

  const url = extractImageUrl(output);
  if (!url) {
    throw new Error("일러스트 배너 생성 실패");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("일러스트 배너 이미지 로드 실패");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

  console.log(`[cost] generateIllustrationBanner (flux-schnell): $${ILLUSTRATION_COST_USD.toFixed(4)}`);
  return { dataUrl, cost: ILLUSTRATION_COST_USD };
}
