import type { ImageAspectRatio, ImageTaskType } from "@/lib/image-router/types";
import { countLifestyleShotsToGenerate as countFromConfig } from "@/lib/lifestyle-shot-config";

export type LifestyleShotPlan = {
  taskType: ImageTaskType;
  prompt: string;
  aspectRatio: ImageAspectRatio;
  label: string;
};

/** 스튜디오 누끼+배경 합성은 대표·제품컷만 — 나머지는 원본 또는 AI 일상샷 */
export function computeStudioCompositeLimit(uploadCount: number): number {
  if (uploadCount >= 8) return 4;
  if (uploadCount >= 5) return 3;
  return uploadCount;
}

/** 업로드 장수에 따른 AI 일상샷 생성 수 (env 캡 적용) */
export function countLifestyleShotsToGenerate(uploadCount: number): number {
  return countFromConfig(uploadCount);
}

function sceneContext(category: string, targetCustomer?: string | null): string {
  const target = targetCustomer?.trim();
  const base =
    category === "반려동물"
      ? "cozy home interior with natural daylight"
      : category === "의류/패션"
        ? "urban street or minimalist apartment"
        : category === "화장품/뷰티"
          ? "bright bathroom vanity or bedroom morning light"
          : category === "식품/건강기능식품"
            ? "dining table or kitchen counter"
            : category === "전자제품"
              ? "modern desk or living room"
              : "comfortable everyday home setting";
  return target ? `${base}, appealing to ${target}` : base;
}

function buildPetShots(productName: string, ctx: string): LifestyleShotPlan[] {
  return [
    {
      taskType: "PRODUCT_LIFESTYLE_EDIT",
      aspectRatio: "3:4",
      label: "반려동물 일상",
      prompt: `Place the exact product "${productName}" in ${ctx}. A happy medium-sized dog (golden retriever or similar) naturally interacts with the product on a soft rug — sniffing, sitting beside, or gentle play. Warm candid pet lifestyle photo, not studio. Product packaging fully visible and readable. Photorealistic, Korean home aesthetic.`,
    },
    {
      taskType: "PRODUCT_LIFESTYLE_EDIT",
      aspectRatio: "3:4",
      label: "반려동물 클로즈업",
      prompt: `Same product "${productName}" on a living room floor. A cat or small dog curiously approaches the product in a candid everyday moment. Soft natural window light, shallow depth of field, authentic pet owner home vibe. Keep product label and shape unchanged.`,
    },
    {
      taskType: "PRODUCT_LIFESTYLE_EDIT",
      aspectRatio: "2:3",
      label: "보호자·반려동물",
      prompt: `Pet owner hands gently offering or preparing "${productName}" for their pet in a daily care routine. Hands and pet partially visible, warm trust-building scene. Product is the focal point with branding clear. Natural lifestyle photography, not advertisement studio.`,
    },
  ];
}

function buildHumanShots(
  category: string,
  productName: string,
  ctx: string,
  features?: string | null,
): LifestyleShotPlan[] {
  const feat = features?.trim();
  const featHint = feat ? ` Highlight: ${feat.slice(0, 120)}.` : "";

  const wide: LifestyleShotPlan = {
    taskType: "PRODUCT_LIFESTYLE_EDIT",
    aspectRatio: "3:4",
    label: "일상 와이드",
    prompt: `Create an authentic everyday lifestyle scene in ${ctx}. A real person naturally uses or holds "${productName}" in a candid moment — relaxed posture, not posed catalog model.${featHint} Product packaging and branding must stay identical to the reference. Soft natural lighting, Korean daily-life aesthetic, photorealistic editorial.`,
  };

  const close: LifestyleShotPlan = {
    taskType: "PRODUCT_LIFESTYLE_EDIT",
    aspectRatio: "2:3",
    label: "사용 클로즈업",
    prompt:
      category === "화장품/뷰티"
        ? `Close-up lifestyle shot: person's hands or face applying "${productName}" in a morning skincare routine. Bathroom or vanity mirror context, dewy natural skin, product label readable.${featHint} Candid beauty editorial, not studio packshot.`
        : category === "의류/패션"
          ? `Person wearing or adjusting "${productName}" in a mirror or street candid shot. Outfit feels lived-in and real, not runway. Fabric and garment details visible.${featHint}`
          : category === "식품/건강기능식품"
            ? `Person enjoying "${productName}" at a dining table — natural bite, pour, or serve moment. Steam, texture, appetite appeal.${featHint} Product packaging visible on table.`
            : `Person actively using "${productName}" in ${ctx} — hands-on, practical everyday moment.${featHint} Product clearly visible with correct branding.`,
  };

  const social: LifestyleShotPlan = {
    taskType: "PRODUCT_LIFESTYLE_EDIT",
    aspectRatio: "3:4",
    label: "함께하는 장면",
    prompt:
      category === "의류/패션"
        ? `Two friends or a couple styled casually with "${productName}" as part of their outfit coordination in ${ctx}. Walking or chatting, candid street or cafe vibe. Garment looks natural on body.${featHint}`
        : `Two people sharing a relaxed moment involving "${productName}" in ${ctx} — coffee table, sofa, or kitchen. Warm social everyday scene, product placed naturally in frame.${featHint}`,
  };

  return [wide, close, social];
}

export function planLifestyleShots(params: {
  category: string;
  productName: string;
  brandName?: string | null;
  targetCustomer?: string | null;
  keyFeatures?: string | null;
  count: number;
}): LifestyleShotPlan[] {
  const ctx = sceneContext(params.category, params.targetCustomer);
  const brand = params.brandName?.trim();
  const name = brand ? `${brand} ${params.productName}` : params.productName;

  const pool =
    params.category === "반려동물"
      ? buildPetShots(name, ctx)
      : buildHumanShots(params.category, name, ctx, params.keyFeatures);

  return pool.slice(0, Math.max(1, Math.min(params.count, pool.length)));
}

export const LIFESTYLE_AI_PATH_MARKER = "lifestyle-ai";

export function isLifestyleAiPath(path: string): boolean {
  return path.includes(LIFESTYLE_AI_PATH_MARKER);
}
