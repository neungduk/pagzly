# 65차 완료 보고 — 라벨링된 원형 성분 크롭 페어

생성: 2026-09-02

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/types/generate.ts` | `layout: "circle-pair"`, `circlePair?: { imageUrl, label }[]` |
| `lib/ingredient-labels.ts` | `parseIngredientPairLabels()` — 성분 필드에서 정확히 2개만 추출 (신규) |
| `lib/apply-ingredient-circle-pair.ts` | `spec_table` 직전 삽입, `ingredient_highlight`+`texture_feel` 사진 재사용 (신규) |
| `components/DetailSectionRenderer.tsx` | `circle-pair` 렌더 분기 (원형 2개 + 라벨) |
| `app/api/generate/route.ts` | draft/final 양쪽에 `applyIngredientCirclePair` 호출 |
| `lib/export-detail-html.ts` | HTML export `circle-pair` 분기 |
| `app/dev/detail-preview/page.tsx` | `capture=65-circle-pair`, `capture=65-no-ingredients` 프리셋 |
| `scripts/capture-65cha-preview.ts` | 단위 검증 + 무료 캡처 (신규) |

**미변경:** `spec_table`(INFO) 구조, AI 이미지 생성

---

## `npx tsc --noEmit`

65차 관련 **에러 0건**.

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 에러 0건 (관련) | ✅ |
| mock `circle-pair` — 원형 2개 + 라벨 렌더 | ✅ (`rounded-full: 2`, 히알루론산/판테놀) |
| 성분 0~1개일 때 컴포넌트 생성 안 함 | ✅ (단위 테스트 + `65-no-ingredients` 프리셋) |
| 라벨 = 사용자 입력 성분명 (지어내기 없음) | ✅ (`parseIngredientPairLabels` 엄격 파싱) |
| `spec_table`/다른 레이아웃 회귀 없음 | ✅ |
| boldBlock 실사용 빈도 (작업 C) | ✅ 아래 참고 |

---

## 스크린샷

| 파일 | 바이트 |
|------|-------:|
| `review/qa-screenshots/65cha-circle-pair-full.png` | 5,184,468 |
| `review/qa-screenshots/65cha-no-ingredients-full.png` | 5,110,137 |

`65cha-circle-pair-full.png` 하단 INFO 직전에 원형 크롭 2개(히알루론산 / 판테놀) 확인.

---

## 작업 C — boldBlock 실사용

코드: `app/api/generate/route.ts`의 `applyBoldBlock()`이 **모든 생성 페이지**에서 첫 non-compact `checklist` + 첫 `highlight_box`에 `boldBlock: true` 부여.

실제 생성물(`review/pixabay-cosmetics-test/session.json` 62차 크림 QA)에서도 checklist·highlight_box 양쪽에 `boldBlock: true` 확인 — 페이지당 **2곳** 고정 노출.

---

## 비용

| 호출 | 횟수 |
|------|------|
| 유료 API | **0회** (기존 업로드 사진 재사용) |
