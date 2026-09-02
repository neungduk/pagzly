# 69차 완료 보고 — INFO 섹션 주변 시각 요소 확장

생성: 2026-09-02

원칙: 기존 이미지 재사용만, 유료 API 호출 없음.

---

## 변경 파일

| 파일 | 작업 | 내용 |
|------|------|------|
| `lib/ingredient-labels.ts` | A | `parseIngredientLabels()` 추가 (1개+), `parseIngredientPairLabels()`는 2개 전용 유지 |
| `lib/types/generate.ts` | A/B | `layout: "circle-solo"`, `circleSolo` 필드, `SpecTableSection.imageIndexes` |
| `lib/apply-ingredient-circle-pair.ts` | A | `applyIngredientCircleVisual()` — 1개=solo, 2개+=pair 분기 |
| `components/DetailSectionRenderer.tsx` | A/B/C | circle-solo 렌더, spec_table 1~3장 썸네일, baseNeutral 6% 배경 틴트 |
| `lib/assign-section-images.ts` | B | spec_table에 detail/lifestyle 최대 3장 least-used 배정 |
| `lib/export-detail-html.ts` | A/B/C | circle-solo·다중 썸네일·배경 틴트 export 동기화 |
| `app/api/generate/route.ts` | A | `applyIngredientCircleVisual` 호출 |
| `app/dev/detail-preview/page.tsx` | 검증 | `69-circle-solo`, `69-spec-multi` 캡처 프리셋 |
| `scripts/capture-69cha-preview.ts` | 검증 | 단위 검증 + 무료 캡처 (신규) |
| `scripts/capture-65cha-preview.ts` | 회귀 | 1개 성분 → circle-solo 단위 검증 반영 |

---

## tsc 결과

```bash
npx tsc --noEmit
```

| 결과 | 비고 |
|------|------|
| **69차 변경 파일: 에러 0건** | 통과 |
| 기존 무관 에러 1건 | `review/pixabay-cosmetics-test/crawl-pixabay.mts` — 69차 범위 밖 |

---

## 작업 A — circle-solo (성분 1개)

| 항목 | 결과 |
|------|------|
| 성분 1개 파싱 | ✅ `parseIngredientLabels("히알루론산")` → `["히알루론산"]` |
| circle-solo 삽입 | ✅ `ingredient_highlight` 이미지 + 라벨 1개, INFO 직전 |
| 원 크기 | ✅ pair 대비 1.25× (`h-[7.5rem]` / `sm:h-[9.375rem]`) |
| 성분 0개 | ✅ 생성 안 함 (지어내기 금지 유지) |
| 성분 2개+ | ✅ 기존 circle-pair 회귀 없음 |

---

## 작업 B — spec_table 다중 썸네일

| 항목 | 결과 |
|------|------|
| detail/lifestyle 2장+ | ✅ `imageIndexes` 최대 3장 배정 (`assignDistinctSectionImages`) |
| 1장 또는 역할 부족 | ✅ 1장만 배정 (기존과 동일 크기) |
| 렌더 | ✅ 2~3장일 때 `h-20` 가로 배치, 1장일 때 기존 `h-28` 유지 |
| AI 신규 생성 | ✅ 없음 (기존 fixture 재사용) |

---

## 작업 C — spec_table 배경 틴트

| 항목 | 결과 |
|------|------|
| 적용 | ✅ `slot === "spec_table"` 섹션에 `hexToRgba(theme.baseNeutral, 0.06)` |
| 가독성 | ✅ 테이블 셀 ink/45·striped 대비 유지 (스크린샷 육안 확인) |
| shipping_info | ✅ 기존 테이블 래퍼 스타일 그대로 (섹션 전체 틴트 미적용) |

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 관련 에러 0건 | ✅ |
| 성분 1개 circle-solo 렌더 | ✅ |
| 성분 0개 생성 안 함 | ✅ |
| spec_table 2~3장 (여유 있을 때) | ✅ |
| spec_table 배경 틴트 가독성 | ✅ |
| circle-pair(2개+) 회귀 | ✅ |
| 유료 API 호출 | ✅ **0회** |

---

## 스크린샷

| 케이스 | 파일 | 바이트 |
|--------|------|-------:|
| 성분 1개 (solo) | `review/qa-screenshots/69cha-circle-solo-full.png` | 5,196,817 |
| 성분 2개 (pair 회귀) | `review/qa-screenshots/69cha-circle-pair-full.png` | 5,213,689 |
| 성분 0개 (없음) | `review/qa-screenshots/69cha-no-ingredients-full.png` | 5,101,068 |
| spec_table 3장 | `review/qa-screenshots/69cha-spec-table-multi-full.png` | 5,127,307 |

검증: `npx tsx scripts/capture-69cha-preview.ts`

---

## 비용

| 구분 | 비용 |
|------|------|
| 유료 API (Replicate/Claude/DeepSeek 등) | **$0** |
