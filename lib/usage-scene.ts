import type { DetailSection } from "@/lib/types/generate";
import { USAGE_SCENE, type UsageSceneCrop } from "@/lib/design-tokens";
import { resolveTemplateCategory } from "@/lib/section-templates";

const SCENE_SLOTS = new Set<string>(USAGE_SCENE.slots);

/** 인물 사진이 들어가면 안 되는 자리 — 후기·인증·전문가처럼 "실제 사람"으로 읽히는 섹션 */
const PERSON_FORBIDDEN_SLOT = /review|testimonial|trust|cert|expert|award|doctor|clinic/i;

export function resolveUsageSceneCrop(category: string): UsageSceneCrop {
  const direct = (USAGE_SCENE.categoryCrop as Record<string, UsageSceneCrop>)[category];
  return direct ?? USAGE_SCENE.categoryCrop[resolveTemplateCategory(category)];
}

/**
 * AI 일상컷·인물 합성컷(personIndexes)이 배정된 사용 장면 image_text에 얼굴 회피 크롭을 붙인다.
 * 사진 위 말풍선·주석은 떼고(인물 위 글자 금지), 후기·인증류 자리에 인물 사진이 오면 텍스트로 바꾼다.
 * 인물 사진이 없으면 섹션은 그대로(업로드 사진 또는 기존 레이아웃).
 */
export function markUsageSceneSlots(
  sections: DetailSection[],
  category: string,
  personIndexes: ReadonlySet<number>,
): DetailSection[] {
  if (personIndexes.size === 0) return sections;
  const crop = resolveUsageSceneCrop(category);
  return sections.map((section) => {
    if (section.type !== "image_text" || section.layout === "text_only") return section;
    if (typeof section.imageIndex !== "number" || !personIndexes.has(section.imageIndex)) return section;
    if (SCENE_SLOTS.has(section.slot)) {
      return { ...section, layout: "full", sceneCrop: crop, callout: undefined, annotations: undefined };
    }
    if (PERSON_FORBIDDEN_SLOT.test(section.slot)) return { ...section, layout: "text_only" };
    return section;
  });
}

/**
 * 익명 사용 장면 생성 — 유료 이미지 생성이라 기본 꺼짐. 켜기 전 "카테고리·횟수" 승인 필요.
 * 켜면 app/api/generate-lifestyle-shots 쪽에서 이 계획으로 프롬프트를 만든다.
 */
export const USAGE_SCENE_GENERATION_ENABLED = false;

export type UsageSceneShotPlan = { crop: UsageSceneCrop; prompt: string };

export function planUsageSceneShots(category: string, count = 1): UsageSceneShotPlan[] {
  if (!USAGE_SCENE_GENERATION_ENABLED || count <= 0) return [];
  const crop = resolveUsageSceneCrop(category);
  const framing =
    crop === "hands"
      ? "close-up of hands holding or using the product, no face, cropped at the wrists or forearms"
      : "person wearing or using the product, framed from the shoulders down, face out of frame";
  const prompt = `${framing}, anonymous, natural daylight, realistic lifestyle photo, no text, no logos, no badges, no name tags`;
  return Array.from({ length: count }, () => ({ crop, prompt }));
}
