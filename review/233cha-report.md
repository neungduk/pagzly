# 233차 — 라이프스타일 컷아웃에 hero와 동일한 플레이트/프레임 잔여 제거

생성: 2026-09-22 · 유료 API **0** · `lib/lifestyle-product-composite.ts`만

## 한줄 결론

픽셀 페이스트 경로에 `trimCutoutToOpaqueBounds` → `purgeDarkPlateFringe`(→ 기존 `defringe`)를 hero와 같은 순서로 배선. rembg 후 어두운 프레임 잔여가 그대로 붙던 비대칭 버그 해소.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | import 2개 + `defringe` 직전 try/catch로 trim→purge |

무변경: `lib/photo-composite.ts`, `lib/photo-enhance.ts`

---

## 2. 검증

`npx tsx scripts/233cha-lifestyle-plate-purge-verify.ts` → **ALL PASS**

| 케이스 | 테두리 잔여 | maxBorderAlpha |
|--------|-------------|----------------|
| dirty 원본 | 23,100 | 140 |
| `defringe`만 (구 경로) | 23,100 | 140 |
| trim+purge (신) | **0** | **0** |
| clean 컷아웃 purge | 중심 픽셀 100/100 불변 | — |

샷: `review/233cha-lifestyle-plate-purge/synthetic-defringe-only.png` · `synthetic-trim-purge.png`  
실픽스처 cutout은 잔여 0이라 before/after 차이 없음(스킵 수준).

API generate: 0
