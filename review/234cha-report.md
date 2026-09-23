# 234차 — 라이프스타일 픽셀 페이스트에 hero와 동일한 실루엣 그림자

생성: 2026-09-22 · 유료 API **0**

## 한줄 결론

`buildSilhouetteShadowBuffer`를 `canvasWidth/Height`로 일반화하고, 라이프스타일 경로도 hero처럼 실루엣 우선·타원 폴백으로 배선. 정사각형 호출은 `CANVAS_SIZE`를 두 번 넘겨 회귀 없음.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/photo-composite.ts` | `canvasSize` → `canvasWidth`, `canvasHeight` (빈 캔버스 create 2곳만) |
| `lib/photo-enhance.ts` | `CANVAS_SIZE, CANVAS_SIZE` (동작 동일) |
| `lib/lifestyle-product-composite.ts` | import + `pasteCutoutOnScene` try 실루엣 / catch 타원(`buildSceneShadowSvg`) |
| `scripts/162cha-shadow-tint-verify.ts` | 시그니처 맞춤(호출부 깨짐 방지) |

---

## 2. 검증

`npx tsx scripts/234cha-silhouette-shadow-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| esbuild 3파일 | OK |
| 호출부 | 정의 1 + hero + lifestyle (+ scripts) |
| 1200×1200 | OK, opaque 35,663 |
| 1600×900 | OK, opaque 35,663 |
| 2400×600 가장자리 | 예외 없음 |
| `pasteCutoutOnScene` | 씬 크기 유지 |

샷: `review/234cha-silhouette-shadow/lifestyle-paste-with-silhouette.png` · `compare-silhouette-layer.png` · `hero-square-shadow.png`

API generate: 0
