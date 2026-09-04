/**
 * 107차 — 화장품 주석 콜아웃 라벨: 물리적 특징만 통과, 효능 주장은 폐기
 */
import { sanitizeText } from "@/lib/cosmetics-compliance";
import type { ImageAnnotation } from "@/lib/product-annotations";

/** 사진에서 보이지 않는 효능·효과·결과 주장 패턴 */
const EFFICACY_CLAIM =
  /보습|속건|장벽|미백|주름|탄력|흡수|지속\s*시간|24\s*시간|케어|진정|개선|효과|수분\s*충전|건조|재생|치료|완치|임상|처방|추천|화이트닝|안티에이징|리프팅|모공|트러블|아토피|여드름|주름\s*제거/i;

/**
 * 콜아웃 라벨이 물리적 구조·재질·표기인지 판정.
 * cosmetics-compliance 치환이 필요하거나 효능 패턴이면 탈락.
 */
export function isPhysicalCosmeticAnnotationLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed || trimmed.length > 24) return false;
  const { replacements } = sanitizeText(trimmed);
  if (replacements.length > 0) return false;
  if (EFFICACY_CLAIM.test(trimmed)) return false;
  return true;
}

/** 효능 라벨 제거 후 신뢰도 재검사용 */
export function filterPhysicalCosmeticAnnotations(
  annotations: ImageAnnotation[],
): ImageAnnotation[] {
  return annotations.filter((a) => isPhysicalCosmeticAnnotationLabel(a.label));
}
