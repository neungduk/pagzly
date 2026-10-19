/**
 * 404차 — 사진 보정·합성(/api/enhance-image) 대상 판단.
 *
 * 402차 패션 실생성에서 착용컷(역할 착장·코디)이 합성 단계의 정사각형 크롭(오려내기 실패 폴백)으로
 * 전신·뒷모습 실루엣을 잃었다(review/403-photo-crop-proposal.md). 합성 알고리즘(lib/photo-enhance.ts)은
 * 건드리지 않고, 호출 쪽에서 패션 착용컷은 합성하지 않고 원본을 쓴다. 히어로(1번)도 같은 조건이면 원본이다.
 * 단독컷·디테일 컷(역할 디테일·패키지·기타)과 다른 카테고리는 이전과 같다.
 */
import { isProductImageRole, type ProductImageRole } from "@/lib/image-roles";

export const FASHION_CATEGORY = "의류/패션";

/** 패션 업로드 안내의 "착장"(hero)·"코디"(lifestyle) — lib/image-roles.ts getUploadRoleGuide */
const FASHION_WORN_ROLES: readonly ProductImageRole[] = ["hero", "lifestyle"];

/** 패션 착용컷이면 true — 합성하지 않고 원본을 쓴다. 역할을 알 수 없으면 false(이전 동작). */
export function isWornFashionPhoto(category: string | undefined, role: unknown): boolean {
  return (
    category === FASHION_CATEGORY &&
    isProductImageRole(role) &&
    FASHION_WORN_ROLES.includes(role)
  );
}

/**
 * composite — 합성 대상
 * original-limit — 합성 장수 상한(computeStudioCompositeLimit) 밖이라 원본 (이전부터 있던 규칙)
 * original-worn — 패션 착용컷이라 원본 (404차)
 */
export type StudioCompositeDecision = "composite" | "original-limit" | "original-worn";

export function planStudioComposite(input: {
  category: string | undefined;
  roles: readonly unknown[] | undefined;
  count: number;
  studioLimit: number;
}): StudioCompositeDecision[] {
  return Array.from({ length: input.count }, (_, index) => {
    if (isWornFashionPhoto(input.category, input.roles?.[index])) return "original-worn";
    const isHero = index === 0;
    if (!isHero && index >= input.studioLimit) return "original-limit";
    return "composite";
  });
}

/** 히어로(1번)를 원본으로 쓰는지 — 이때 배경 후보는 히어로에 합성되지 않는다. */
export function isHeroKeptOriginal(category: string | undefined, roles: readonly unknown[] | undefined): boolean {
  return isWornFashionPhoto(category, roles?.[0]);
}

/**
 * 405차 — /api/generate-backdrop에서 배경 이미지 생성(flux-kontext-pro ×4, 404차 $0.16)을 건너뛸지.
 * 히어로가 원본이면 배경 후보는 히어로에 쓰이지 않고, 비히어로 합성은 섹션 배경을 쓴다(404차 실생성 확인).
 * 같은 응답의 conceptBrief·theme·shadowAnalysis는 그대로 받는다. 다른 카테고리·패션 비착용 히어로는 false(이전과 같음).
 */
export function shouldSkipBackdropImage(category: string | undefined, roles: readonly unknown[] | undefined): boolean {
  return isHeroKeptOriginal(category, roles);
}
