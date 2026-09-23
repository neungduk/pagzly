# 235차 — 라이프스타일 픽셀 페이스트에 hero와 동일한 컷아웃 알파 페더링

생성: 2026-09-22 · 유료 API **0** · 파일 1개

## 한줄 결론

`pasteCutoutOnScene`에 `featherCutout`(알파 erode+블러)를 WB/선명도/그레인 **앞**에 배선. rembg 하드엣지가 실사진 위에 그대로 붙던 비대칭 해소.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | `featherCutout` import + `Math.max(sceneW,sceneH)`로 try/catch 호출 |

무변경: `lib/photo-composite.ts`, `lib/photo-enhance.ts`

순서: **feather → WB → sharpness → grain** (hero와 동일)

---

## 2. 검증

`npx tsx scripts/235cha-lifestyle-feather-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| esbuild | OK |
| `rg featherCutout lib` | lifestyle import+call / photo-composite 정의 / hero 기존 |
| 하드엣지 반투명 픽셀 | **0 → 4,288** |
| paste 1200² / 2000×500 | 씬 크기 유지 |

샷: `review/235cha-lifestyle-feather/edge-before-feather-closeup.png` · `edge-after-feather-closeup.png`

API generate: 0
