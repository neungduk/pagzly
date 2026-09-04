# 107차 — 화장품 주석 콜아웃 확장 + 브랜드 스토리 깊이

생성: 2026-09-04  
전제: `TEST_MODE=true`, 유료 생성 없음. 108~110·픽셀합성은 미착수.

## 작업 A — 화장품 annotated 콜아웃

| 항목 | 내용 |
|------|------|
| 게이트 | `route.ts` final에서 `화장품/뷰티` → `applyCosmeticsAnnotatedSections` |
| 분리 | `lib/apply-cosmetics-annotations.ts` (전자 `apply-electronics-annotations` 유지) |
| 슬롯 | packaging_design → texture_feel → feature_detail → size_options, **최대 2** |
| 신뢰도 | `areAnnotationsReliable` 유지 (2개+, 다른 셀/라벨) |
| 라벨 가드 | `lib/cosmetics-annotation-labels.ts` — compliance 치환 필요·효능 패턴이면 폐기 |
| Vision | `analyzeProductAnnotations(..., { domain: "cosmetics" })` — 물리 특징만 |

스모크: `107cha-cosmetics-annotations-smoke.ts` — 효능 라벨 필터 + 상한 2 PASS.

## 작업 B — brand_story 깊이

| 항목 | 내용 |
|------|------|
| 타입 | `imageIndexes?: number[]` (1~2, 선택) |
| 배정 | `assignDistinctSectionImages` 말미 — **미사용 컷만**, 없으면 텍스트 전용 |
| 렌더 | 이미지 있으면 본문 아래 1~2컷; 없으면 기존과 동일 |
| 본문 | `line-clamp` 해제·`whitespace-pre-line`, 템플릿/프롬프트 2~3문단 + 사실 날조 금지 |

스모크: `107cha-brand-story-assign-smoke.ts` — spare `[4,5]` / tight `undefined` PASS.

## 검증

- `npx tsc --noEmit` 0
- 54 / 99 / 107 smokes PASS

## 후속 (미실행)

108 배경 확대 · 109 워드마크 · 110 다이어그램 · 픽셀합성(103)
