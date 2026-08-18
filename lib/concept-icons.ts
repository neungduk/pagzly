/**
 * 컨셉 브리프 기반 원형 배지 아이콘 — checklist / usage_steps용 flux-schnell 생성.
 */

import Replicate from "replicate";
import { describeColorTone } from "@/lib/color-extract";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { isTestMode } from "@/lib/test-mode";

const FLUX_SCHNELL_REF = "black-forest-labs/flux-schnell" as const;
const ICON_COST_USD = 0.003;

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

async function generateSingleConceptIcon(
  label: string,
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  index: number,
): Promise<{ dataUrl: string; cost: number }> {
  const replicate = getReplicateClient();
  const motif = brief.motif_keywords[index % brief.motif_keywords.length];
  const prompt = [
    "circular badge icon, flat minimal UI illustration",
    brief.icon_style,
    `motif: ${motif}, concept for "${label.slice(0, 40)}"`,
    `${describeColorTone(theme.accent)} primary color, ${describeColorTone(theme.deepAccent)} subtle shadow`,
    "soft round badge frame, centered symbol, no text, no letters, no watermark",
    "white or very light background, ecommerce detail page icon",
  ].join(", ");

  const output = await replicate.run(FLUX_SCHNELL_REF, {
    input: {
      prompt,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "png",
      output_quality: 85,
    },
    wait: { mode: "poll", interval: 1000 },
  });

  const url = extractImageUrl(output);
  if (!url) {
    throw new Error(`아이콘 생성 실패: ${label}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`아이콘 이미지 로드 실패: ${label}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  return { dataUrl, cost: ICON_COST_USD };
}

export type ConceptIconMap = {
  /** checklist 섹션 items 순서와 1:1 */
  checklist?: string[];
  /** usage_steps 섹션 steps 순서와 1:1 */
  usageSteps?: string[];
};

/** 컨셉에 맞는 원형 배지 아이콘 일괄 생성 (flux-schnell) */
export async function generateConceptIcons(
  brief: ConceptBrief,
  theme: Pick<CategoryTheme, "accent" | "deepAccent">,
  checklistItems: string[],
  usageStepLabels: string[],
): Promise<{ icons: ConceptIconMap; cost: number }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[concept-icons] REPLICATE_API_TOKEN 없음 — 아이콘 생성 생략");
    return { icons: {}, cost: 0 };
  }

  const checklistCount = checklistItems.length;
  const usageCount = usageStepLabels.length;
  const maxIcons = isTestMode() ? 1 : 8;
  const totalToGenerate = Math.min(checklistCount + usageCount, maxIcons);

  if (isTestMode() && totalToGenerate > 0) {
    console.log(`[concept-icons] TEST_MODE — 아이콘 ${totalToGenerate}장만 생성`);
  }

  if (totalToGenerate === 0) {
    return { icons: {}, cost: 0 };
  }

  let totalCost = 0;
  const dataUrls: string[] = [];

  for (let i = 0; i < totalToGenerate; i++) {
    const label =
      i < checklistCount
        ? checklistItems[i]
        : usageStepLabels[i - checklistCount];
    try {
      const { dataUrl, cost } = await generateSingleConceptIcon(
        label,
        brief,
        theme,
        i,
      );
      dataUrls.push(dataUrl);
      totalCost += cost;
    } catch (error) {
      console.warn(`[concept-icons] "${label}" 생성 실패`, error);
      dataUrls.push("");
    }
  }

  console.log(
    `[cost] generateConceptIcons (${dataUrls.filter(Boolean).length}/${totalToGenerate} icons): $${totalCost.toFixed(4)}`,
  );

  const checklist = checklistCount
    ? dataUrls.slice(0, Math.min(checklistCount, totalToGenerate))
    : undefined;
  const usageSteps = usageCount
    ? dataUrls.slice(checklistCount, totalToGenerate)
    : undefined;

  return {
    icons: { checklist, usageSteps },
    cost: totalCost,
  };
}
