# 161차 — 크롤링 기반 최대 업그레이드 (구현)

생성: 2026-09-10  
근거: ORIJEN 비교표, UNIQLO 기장 가이드, 삼분의일 매트리스, IKEA, draph.art 트렌드

## 구현 여부 요약

| 항목 | 결과 |
|------|------|
| A FASHION/PET/HOME `comparison_chart` | **구현 완료** |
| B checklist ✓/✗ 시각 타입 | **구현 완료** (라이브+export) |
| C `tradeoff_card` 장단점 대조 | **구현 완료** (HOME만) |
| D 신장 대비 기장 | **스킵** (입력 기근·환각 위험 — 사유 문서화) |
| E 카피 밀도 2문장 상한 | **구현 완료** (`buildSectionLengthGuide`) |
| tsc + tsx | **통과** (`scripts/161cha-verify.ts`) |

## A. comparison_chart 슬롯 확장

- `lib/section-templates.ts`: FASHION / PET / HOME_FALLBACK에 `comparison_chart` (`required:false`, `stat_infographic` 근처)
- 카테고리별 note: 패션=혼용률·신축성, 반려동물=조단백·포함 여부(브랜드명 금지), 생활=하중·수명
- `buildSectionLengthGuide`에 카테고리별 한 줄 규율 추가
- 검증: 3카테고리 슬롯 존재 + 차트 없는 omit HTML

## B. checklist 시각 타입

- `presentationStyle?: "bar" | "checklist"` on `ComparisonChartSection`
- `sanitizeComparisonChartSection`: checklist → 0/100 플래그, baseline 화이트리스트 유지
- 렌더러: Lucide `Check`/`X` (accent / baseNeutral — 빨강·초록 금지)
- export: ✓/✗ 그리드 HTML
- 산출: `review/161cha-export/161cha-rich.html`

## C. tradeoff_card

- 타입 + HOME 슬롯 + API shape/prompt + 렌더러/export
- 카피: "이런 분께 추천" / "이런 점은 참고하세요"
- 빈 배열이면 렌더 생략

## D. 신장 대비 기장 — 스킵

`review/161cha-export/161cha-height-length-skip.md`  
기존 fashion-size-diagram이 기장을 이미 표시. UNIQLO형 다중 신장 구간 입력 사례 없음 → 억지 구현 시 핏 환각.

## E. 카피 밀도

- common: `2~3문장` → **2문장 상한**
- ingredient/texture/sourcing/material 정렬
- 비교 스니펫: `161cha-copy-density-diff.txt`

## 가드레일

anti-hallucination / 경쟁사 실명 금지 / 3색 토큰 / 인물 이미지 미생성 / 144 이미지 레버 미변경 / 단점 깎아내리기 금지

## 162차 후보

1. auth 갱신 후 fashion/pet/home 실라이브 generate (풍부 입력 vs omit)
2. 신장 구간 실측 UI 필드 → height-length 재검토
3. tradeoff_card를 패션/전자로 확장 여부
4. checklist 축과 review-axis measured chart 병합 UX

## 캡처

- `/dev/detail-preview?capture=161-checklist-tradeoff`
- `npx tsx scripts/161cha-verify.ts`
