# 227차 — Before/After 효과 비교 입력 (A안)

생성: 2026-09-18 · 유료 API 0건 · tsc 0

## 한줄 결론

판매자 실사진 Before/After 섹션을 AI 미생성으로 신설. 화장품/뷰티·반려동물·식품/건강기능식품은 UI·서버 이중 차단(A안).

---

## 1. 변경 요약

| 파일 | 내용 |
|------|------|
| `lib/before-after-eligibility.ts` | 신규 — 제외 카테고리 + 컴플라이언스 각주 |
| `lib/types/generate.ts` | `beforeAfterPairs` · `BeforeAfterSection` · union |
| `lib/section-inserts.ts` | `insertBeforeAfterSection` |
| `app/api/generate/route.ts` | import + final 조립 삽입 + `SECTION_TYPE_SHAPES` 생성 금지 설명 |
| `components/CreateProductForm.tsx` | state · 업로드 · 카테고리 게이팅 UI |
| `components/DetailSectionRenderer.tsx` | 라이브 `before_after` 렌더 |
| `lib/export-detail-html.ts` | export `before_after` 렌더 (`review_highlight` export case 이미 존재) |

제외 카테고리: `화장품/뷰티`, `반려동물`, `식품/건강기능식품`  
허용 예: 전자제품·의류/패션·생활용품·기타

---

## 2. 검증

`npx tsx scripts/227cha-before-after-verify.ts` → **ALL PASS**

- 6카테고리 eligibility boolean
- insert: 3제외 미생성 / 전자제품 생성 / cta 직전·review_highlight 직후 / incomplete 필터 / max 4 / 중복 가드
- export markup + pet 미포함
- 스크린샷: `review/227cha-before-after/electronics-before-after.png`

---

## 3. 완료 기준

- [x] eligibility · types · inserts · route · form · live · export
- [x] tsc 0 · API 0
- [x] 검증 스크립트 + 스크린샷
