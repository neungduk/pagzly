/**
 * 145차 — 프리미엄 아이콘/컴포지트 옵션. 145~154차까지는 `.env.local`의
 * `PREMIUM_QUALITY_MODE=true`로만 켜지는 opt-in이었고 기본값은 항상 false였다
 * (결제/크레딧 시스템이 아직 없어 전체 기본값을 올리면 매출 없이 원가만 늘어난다는
 * 이유 — pagzly-pricing-cost-model-2026.md §7). 155차 — 사용자가 "정말 눈에
 * 확 띄게" 이미지·인포 품질을 요구하며 이 비용 트레이드오프를 명시적으로 승인
 * (원가 페이지당 +$0.2~0.3 인지 후 "지금 기본값으로 켜기" 선택) → 기본값을 켬.
 * `.env.local`에 `PREMIUM_QUALITY_MODE=false`를 명시하면 언제든 다시 끌 수 있다
 * (예전 기본값으로 되돌리는 탈출구를 남겨둠).
 *
 * true일 때 영향받는 것 (144차 "스마트 $0.50 레시피" 중 스펙 아이콘 전면 교체처럼
 * 체감 대비 원가만 큰 항목은 제외):
 * - illustration_banner: recraft-v3 → recraft-v4-svg
 * - checklist / usageSteps / highlightBox 아이콘: ICON_MODEL 기본값 →
 *   recraft-v4-svg (177차: flux-dev 대체 — 단색 실루엣+SVG tint)
 * - computeStudioCompositeLimit: 업로드 8장 이상일 때 4 → 8
 *
 * 티어와 무관(concept-icons 고정, 178차):
 * - statInfographic 아이콘: 항상 recraft-v4-svg (실측 ≈3 metrics/페이지라
 *   원가 증가분 작음 — 다이어그램·checklist 실루엣과 언어 통일)
 *
 * 영향받지 않는 것 (144차 권고에 따라 의도적으로 제외):
 * - spec_table 아이콘은 flux-schnell 유지 (144차: 스펙 13장 flux-dev 전환은
 *   체감 대비 원가만 큼)
 *
 * 166차 결정 — 배경 후보 수(BRIA_BACKDROP_CANDIDATES):
 * 프리미엄 ON일 때 기본 4 (코드 상한 4). 후보 다양성은 162~165 컷아웃 보정과
 * 직교한다 — 보정은 선택된 배경의 합성 품질만 올리고, 선택지 폭은 후보 수가 담당.
 */
export function isPremiumQualityMode(): boolean {
  return process.env.PREMIUM_QUALITY_MODE !== "false";
}
