/**
 * 403차 — 개념 아이콘(Replicate) 생성 여부.
 *
 * 평면 표면(FLAT_SECTION_SURFACES = true)에서는 렌더러가 checklist·specTable·highlightBox·statInfographic·usageSteps 자리에
 * 인라인 SVG 아이콘을 그리고, 생성된 개념 아이콘(ConceptBadgeIcon)은 !FLAT 분기에서만 쓴다. export HTML은 개념 아이콘을 아예 읽지 않는다.
 * 402차 패션 실생성에서 이 아이콘이 원가의 71%($0.91/건)였는데 화면에는 나오지 않았다(403차: 라이브 픽셀 차이 0, export HTML 동일 확인).
 * 설정을 되돌리면(FLAT_SECTION_SURFACES = false) 자동으로 다시 생성된다 — 생성 코드는 그대로 둔다.
 */
import { FLAT_SECTION_SURFACES } from "@/lib/design-tokens";

export function shouldGenerateConceptIcons(input: {
  hasConceptBrief: boolean;
  flatSurfaces?: boolean;
}): boolean {
  const flat = input.flatSurfaces ?? FLAT_SECTION_SURFACES;
  return input.hasConceptBrief && !flat;
}
