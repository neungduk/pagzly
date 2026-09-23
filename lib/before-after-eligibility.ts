/**
 * 227차 — Before/After 효과 비교 사진은 효능·효과 표시가 법적으로 민감한
 * 3개 카테고리(화장품/뷰티, 반려동물, 식품/건강기능식품 — 이미 컴플라이언스
 * 모듈이 있는 카테고리와 정확히 동일)에서는 제공하지 않는다. 사진 비교는
 * 텍스트처럼 regex로 순화할 수 없는 효능 주장이라 클라이언트 UI뿐 아니라
 * 서버(insertBeforeAfterSection)에서도 최종 차단한다.
 */
const BEFORE_AFTER_EXCLUDED_CATEGORIES = new Set([
  "화장품/뷰티",
  "반려동물",
  "식품/건강기능식품",
]);

export function isBeforeAfterEligibleCategory(category: string): boolean {
  return !BEFORE_AFTER_EXCLUDED_CATEGORIES.has(category);
}

/** AI 미생성 고정 문구 — INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE(160차)와 동일 원칙 */
export const BEFORE_AFTER_COMPLIANCE_NOTE =
  "*개인차가 있을 수 있으며, 사용 경험은 실제 구매자가 제공한 사진입니다.";
