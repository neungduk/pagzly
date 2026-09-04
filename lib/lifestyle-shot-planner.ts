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
  _productName: string,
  ctx: string,
  features?: string | null,
  _productSizeHint?: string | null,
): LifestyleShotPlan[] {
  // 111차 — 안 1(빈손): 제품은 그리지 않고 grasp 자세만. 스케일 문장·제품 보존 지시 제거.
  const feat = features?.trim();
  const featHint = feat ? ` Scene mood hint: ${feat.slice(0, 80)}.` : "";

  const emptyHandCore =
    "a person's hand in a natural holding gesture, fingers curled as if holding a small bottle — the hand must be completely empty, absolutely no bottle, no cylindrical object of any kind, no dropper cap, no jar, no package, no brand logo, no product silhouette; empty fingers and skin only in the grasp";

  const wide: LifestyleShotPlan = {
    taskType: "PRODUCT_LIFESTYLE_EMPTY_SCENE",
    aspectRatio: "3:4",
    label: "일상 와이드",
    prompt: `Authentic everyday lifestyle scene in ${ctx}. Show ${emptyHandCore}. Relaxed posture, candid, not a catalog model.${featHint} Soft natural lighting, Korean daily-life aesthetic, photorealistic editorial.`,
  };

  const close: LifestyleShotPlan = {
    taskType: "PRODUCT_LIFESTYLE_EMPTY_SCENE",
    aspectRatio: "2:3",
    label: "사용 클로즈업",
    prompt:
      category === "화장품/뷰티"
        ? `Close-up lifestyle: ${emptyHandCore} near face or vanity in a morning skincare routine. Bathroom or vanity mirror context, dewy natural skin.${featHint} Candid beauty editorial — do not draw any product.`
        : category === "의류/패션"
          ? `Person adjusting clothing in a mirror or street candid shot in ${ctx}. Hands natural; no product bottle in frame.${featHint}`
          : category === "식품/건강기능식품"
            ? `Person at a dining table in a natural pour-or-serve gesture with ${emptyHandCore}.${featHint} No product packaging drawn.`
            : `Person in ${ctx} with ${emptyHandCore} — practical everyday moment.${featHint} No product drawn.`,
  };

  const social: LifestyleShotPlan = {
    taskType: "PRODUCT_LIFESTYLE_EMPTY_SCENE",
    aspectRatio: "3:4",
    label: "함께하는 장면",
    prompt:
      category === "의류/패션"
        ? `Two friends casually styled in ${ctx}. Walking or chatting, candid street or cafe vibe. No product bottle in frame.${featHint}`
        : `Two people sharing a relaxed moment in ${ctx} — coffee table, sofa, or kitchen. One person shows ${emptyHandCore}. Warm social everyday scene.${featHint} No product drawn.`,
  };

  return [wide, close, social];
}

export function planLifestyleShots(params: {
  category: string;
  productName: string;
  brandName?: string | null;
  targetCustomer?: string | null;
  keyFeatures?: string | null;
  productSizeHint?: string | null;
  count: number;
  /** true면 Replicate 호출 없이 프롬프트만 반환 (105차 dry-run) */
  dryRun?: boolean;
}): LifestyleShotPlan[] {
  const ctx = sceneContext(params.category, params.targetCustomer);
  const brand = params.brandName?.trim();
  const name = brand ? `${brand} ${params.productName}` : params.productName;

  const pool =
    params.category === "반려동물"
      ? buildPetShots(name, ctx)
      : buildHumanShots(
          params.category,
          name,
          ctx,
          params.keyFeatures,
          params.productSizeHint,
        );

  const plans = pool.slice(0, Math.max(1, Math.min(params.count, pool.length)));
  if (params.dryRun) {
    console.log(
      "[lifestyle-planner:dry-run]",
      JSON.stringify(
        plans.map((p) => ({
          label: p.label,
          aspectRatio: p.aspectRatio,
          prompt: p.prompt,
        })),
        null,
        2,
      ),
    );
  }
  return plans;
}

export const LIFESTYLE_AI_PATH_MARKER = "lifestyle-ai";
export const LIFESTYLE_COMPOSITE_PATH_MARKER = "lifestyle-composite";

export function isLifestyleAiPath(path: string): boolean {
  return path.includes(LIFESTYLE_AI_PATH_MARKER);
}

/** 64/66차 — 사용자 라이프스타일 업로드 + 제품 합성 결과 (nano-banana) */
export function isLifestyleCompositePath(path: string): boolean {
  return path.includes(LIFESTYLE_COMPOSITE_PATH_MARKER);
}
