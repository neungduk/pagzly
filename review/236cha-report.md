# 236차 — FOOD TOC 제품정보 앵커 + export 북엔드 대각선 클립

생성: 2026-09-22 · 유료 API **0** · 파일 2개

## 한줄 결론

FOOD `nutrition_table`을 TOC "제품정보" 매칭에 포함; export에 hero-follow·CTA 북엔드 `clip-path`를 배선해 라이브와 시각 마감 대칭을 맞춤(hero-follow는 trust+bento만).

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/section-anchor-nav.ts` | `pagzly-info` match에 `slot === "nutrition_table"` OR 추가 |
| `lib/export-detail-html.ts` | CTA에 clip+`-16px`; hero 직후 trust/bento를 클립 wrapper로 감쌈 |

무변경: `DetailSectionRenderer.tsx`(이미 정상), 다른 8개 앵커 규칙

스코프 메모: export hero-follow는 다음 섹션 본문까지 포함하지 않음(루프 회귀 위험). trust·퀵팩트 둘 다 없으면 클립 미적용 가능.

---

## 2. 검증

`npx tsx scripts/236cha-anchor-and-bookend-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| esbuild (2파일) | OK |
| FOOD 템플릿 앵커 | **제품정보** 등장 · `nutrition_table` 가리킴 |
| 나머지 5카테고리 | 제품정보/사이즈 회귀 없음 |
| export clip grep | hero-follow 1 · CTA 1 |
| 실 food 세션 | TOC `제품정보` + CTA clip |
| 231 / 232 회귀 | **ALL PASS** |

샷: `review/236cha-food-anchor-and-bookend/`
- `food-toc-product-info.png` — FOOD 스티키 TOC에 **제품정보**
- `cta-bookend.png` / `food-cta-clip.png` — CTA 상단 대각선
- `hero-follow-bookend.png` — 픽스처 hero-follow 영역

API generate: 0

---

## 3. 다음 라운드 후보 (기록만)

- export hero-follow wrapper에 다음 섹션 본문까지 포함(라이브 완전 동일) — 루프 카운터 재배선 필요
