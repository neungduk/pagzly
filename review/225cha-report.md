# 225차 — export HTML `layout:"compact"` 복원

생성: 2026-09-18 · 유료 API 0건 · tsc 0

## 한줄 결론

`quick_points` 등 `layout:"compact"` 섹션이 export에서 기본(전체폭 정사각) 분기로 떨어지던 문제를, 라이브와 동일한 작은 썸네일+한 줄 텍스트 분기로 복원.

---

## 1. 변경 — `lib/export-detail-html.ts`

- `resolveCompactImageShape` import
- `sectionHtml()`에 `compactImageTextIndex` / `totalCompactImageTextCount` 추가
- `buildDetailPageHtml` 루프에서 라이브와 동일하게 compact 인덱스·총개수 계산·전달
- `case "image_text"`: circle-pair 뒤·callout 앞에 compact 분기
  - 120×120 썸네일, `RADIUS.md`(12) / `RADIUS.pill`(999) 교대
  - `imagePosition`에 따른 row / row-reverse + text-align
  - `overflow-wrap:anywhere` on heading/body

---

## 2. 검증

`npx tsx scripts/225cha-compact-layout-verify.ts` → **ALL PASS**

| 항목 | 결과 |
|------|------|
| resolveCompactImageShape square/circle 교대 | OK |
| 합성 3 compact → 120px ×3, radii 12/999/12, L/R | OK |
| compact는 h3 (display h2 아님) | OK |
| 비compact split 유지 | OK |
| 181 electronics compactCount=3 thumbs=3 | OK |
| editorial bleed 회귀 없음 | OK |

스크린샷:
- `review/225cha-compact-layout/compact-thumbs.png` (합성 3개)
- `review/225cha-compact-layout/electronics-compact-thumbs.png` (181 electronics 실세션)

---

## 3. 완료 기준

- [x] import + 파라미터 + 호출부 카운트
- [x] compact 분기 추가
- [x] tsc 0 · API 0
- [x] 검증 스크립트 + 스크린샷
