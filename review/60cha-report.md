# 60차 완료 보고 — compact image_text 원형 크롭 (imageShape)

생성: 2026-09-01

원칙: **유료 API 호출 0건** (코드 + 무료 프리뷰 캡처만)

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/types/generate.ts` | `ImageTextSection.imageShape?: "square" \| "circle"` 추가 |
| `lib/compact-image-shape.ts` | `resolveCompactImageShape()` — 명시값 또는 compact 2개 이상일 때 index 기반 square/circle 교차 (신규) |
| `components/DetailSectionRenderer.tsx` | compact 분기에서 `rounded-full` / `rounded-xl` 적용; compact 섹션 카운트 전달 |
| `app/dev/detail-preview/page.tsx` | `capture=60-compact-shapes` 프리셋 (compact image_text 3개) |
| `scripts/capture-60cha-preview.ts` | 무료 캡처 스크립트 (신규) |

**미변경:** 히어로·full/callout/annotated 레이아웃, 갤러리 등 다른 섹션

---

## `npx tsc --noEmit`

59~62차 관련 **에러 0건**. 기존 무관: `crawl-pixabay.mts` TS7006 1건.

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 에러 0건 (관련) | ✅ |
| `imageShape: "circle"` 시 compact 썸네일 원형 | ✅ (렌더러 분기) |
| 필드 없을 때 index 기반 square/circle 교차 | ✅ (3 compact → square·circle·square) |
| 히어로/메인 갤러리 등 다른 섹션 회귀 없음 | ✅ |
| `/api/generate` 호출 0건 | ✅ |

---

## 스크린샷

| 파일 | 바이트 |
|------|-------:|
| `review/qa-screenshots/60cha-compact-shapes-full.png` | 1,268,393 |
| `review/qa-screenshots/60cha-compact-shapes-crop.png` | 41,675 |

캡처 시 `rounded-full` 1개, `rounded-xl` compact 2개 확인 (index 0·2 square, index 1 circle).

---

## 비용

- Vision / Replicate / generate: **0회**
