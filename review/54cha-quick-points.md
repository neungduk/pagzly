# 54차 quick_points 이미지 배정 검증

생성: 2026-09-01

## 변경 요약

- `quick_points`를 `detail_zoom`/`fabric_composition`과 분리
- 우선순위: **package → hero → detail** (compact 96px 슬롯)

## 시나리오 결과

| 시나리오 | 결과 | 상세 |
|----------|------|------|
| 반려동물 — package/hero 우선 (매크로 detail 다수) | PASS | assigned imageIndex=4 (expect package@4 or hero@0, not detail@1) |
| 폴백 — package/hero 없음, detail만 | PASS | assigned imageIndex=0 (all-detail roles → first detail@0, no package/hero) |
| detail_zoom 회귀 없음 — 여전히 detail 우선 | PASS | assigned imageIndex=1 (expect detail@1) |
| 화장품 — 기본 역할 순서에서 package 우선 | PASS | assigned imageIndex=3 (expect default package@3, not detail@1) |
| 전자제품 — package 없으면 hero 폴백 | PASS | assigned imageIndex=0 (expect hero@0) |
| quick_points 3개 — 선명 컷 우선, 매크로 detail 회피 | PASS | assigned [4, 0, 1] (1st=4, expect package@4; later slots may fallback detail when pool exhausted) |

**합계:** 6/6 PASS
