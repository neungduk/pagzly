# 223차 — export HTML에 annotated 부품/기능 주석 오버레이 복원

생성: 2026-09-18 · 유료 API 0건 · tsc 0

## 한줄 결론

Vision으로 생성된 `section.annotations`가 라이브에는 보이지만 export HTML에서 통째로 빠지던 문제를, `buildAnnotatedImageOverlaySvg`로 기하 1:1 이식해 해결.

---

## 1. 변경

### 신규 `lib/annotated-image-overlay-svg.ts`

- `clampPct` / `leaderEnd` — `AnnotatedImageOverlay.tsx`와 동일
- `buildAnnotatedImageOverlaySvg(annotations, strokeColor)` — SVG 점·인출선 + absolute 라벨 배지

### `lib/export-detail-html.ts` — `shouldUseSplitLayout` 분기

1. `isAnnotatedSection` 판별
2. annotated면 `columnRatio = { image: 1, text: 1 }` (50/50, 라이브와 동일)
3. annotated면 POINT 배지 숨김
4. 이미지 컨테이너에 `${annotationOverlayHtml}` 삽입

비-annotated split/callout/circle 경로는 `annotationOverlayHtml === ""` → 영향 없음 (baseline sha 안정).

---

## 2. 검증 (API 0)

`npx tsx scripts/223cha-annotated-overlay-verify.ts` → **ALL PASS**

| 항목 | 결과 |
|------|------|
| markup (`svg` / viewBox / 라벨 / cx·cy) | OK |
| leaderEnd 교차 검증 (xPct=95 → side left 등) | OK |
| escapeXml | OK |
| 빈 annotations → `""` | OK |
| 181 electronics 원본 export에 overlay 없음 | OK |
| 더미 annotations 주입 후 overlay·라벨·50/50 | OK |
| POINT 배지 annotated 옆 미표시 | OK |
| baseline export hash 안정 | OK |

스크린샷: `review/223cha-annotated-overlay/electronics-annotated-overlay.png`  
(세션 JSON은 수정하지 않음 — 메모리상 주입만)

---

## 3. 스코프 밖 (브리프 각주)

라이브 `isFullPoint` vs export `shouldUseSplitLayout`의 에디토리얼 블리드 카운트 차이는 이번 라운드에서 손대지 않음.

---

## 4. 완료 기준

- [x] `annotated-image-overlay-svg.ts` 신규
- [x] export 배선 (오버레이 + POINT 숨김 + 50/50)
- [x] tsc 0 · API 0
- [x] 검증 스크립트 + 스크린샷
