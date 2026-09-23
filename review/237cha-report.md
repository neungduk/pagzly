# 237차 — 패션 사이즈 실측 다이어그램 측정·체형 안내 문구

생성: 2026-09-22 · 유료 API **0** · 파일 2개

## 한줄 결론

사이즈 실측 다이어그램이 뜰 때만(`sizeDiagramMatches` / `sizeMatches` > 0) 측정 오차·체형 안내 2줄을 라이브·export에 동일 각주 스타일로 추가.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `components/DetailSectionRenderer.tsx` | `spec_table` 테이블 아래, `sizeDiagramMatches` 게이트로 안내 2줄 |
| `lib/export-detail-html.ts` | 동일 위치·동일 문구, `sizeMatches.length > 0` 게이트 |

무변경: `fashion-size-diagram.ts`, `FashionSizeDiagram.tsx`

문구(서버 고정):
- `* 사이즈는 측정 방법에 따라 1~3cm 오차가 발생할 수 있습니다.`
- `* 사람마다 체형이 다르기 때문에 착용감이 조금씩 다를 수 있습니다.`

---

## 2. 검증

`npx tsx scripts/237cha-size-disclaimer-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| esbuild (export + DetailSectionRenderer) | OK |
| FASHION + 실측 매칭 | 안내 A/B 각 1건 |
| FOOD / 전자제품 | 문구 미노출 |
| FASHION + 플레이스홀더(다이어그램 없음) | 문구 함께 생략 |
| 231 / 232 / 236 회귀 | **ALL PASS** |

샷: `review/237cha-fashion-size-disclaimer/size-disclaimer.png` — 표 아래 안내 2줄

API generate: 0

---

## 3. 다음 라운드 후보 (기록만)

- 피처 콜아웃 "큰 영문 워드 + 하이라이터 박스" 스타일 변형 — 취향 차이, 미채택
