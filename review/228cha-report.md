# 228차 — 리뷰 하이라이트 핵심 키워드 인라인 강조

생성: 2026-09-22 · 유료 API 0건 · 표시 로직만

## 한줄 결론

`matchCount > 0`인 praise/concern만 `extractCoreKeywords`와 동일 토큰을 `theme.accentSoft` 형광펜으로 인라인 강조. 편집 모드·매칭 0건·생성 API는 불변.

---

## 1. 변경 요약

| 파일 | 내용 |
|------|------|
| `lib/review-insights.ts` | `HighlightSegment` + `splitTextByKeywords` 추가 (기존 함수 무변경) |
| `components/DetailSectionRenderer.tsx` | 읽기 모드·`matchCount>0`만 강조 `<span>`; 편집은 `EditableText` 유지 |
| `lib/export-detail-html.ts` | `highlightTextHtml` — split 후 조각별 `esc()` |

스코프 제외(무변경): `lib/section-inserts.ts`, `app/api/generate/route.ts`, `lib/types/generate.ts`, 컴플라이언스 모듈.

---

## 2. 검증

`npx tsx scripts/228cha-keyword-highlight-verify.ts` → **ALL PASS**

- 단위: join≡원문 · 키워드0 · `210g` · 긴 키워드 우선
- esbuild 문법 3파일 OK
- export markup: accentSoft 강조 / matchCount=0 평문
- 소스 가드: `edit?.enabled` 시 EditableText 우선
- 라이브(webpack `localhost:3000`) + export 스크린샷
  - `review/228cha-keyword-highlight/export-review-highlight.png`
  - `review/228cha-keyword-highlight/live-review-highlight-read.png` (강조 span 9)
  - `review/228cha-keyword-highlight/live-review-highlight-edit.png` (강조 span 0)

API: `/api/generate`·DeepSeek·Replicate 호출부 **신규 추가 없음** (표시만).

---

## 3. 완료 기준

- [x] 3파일만 228 기능 hunk
- [x] matchCount>0만 강조 · 0은 평문
- [x] 편집 모드 EditableText 불변
- [x] 라이브·export 패리티 · API 0
