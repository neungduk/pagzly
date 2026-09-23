# 188차 — WCAG 대비 감사

생성: 2026-09-15 · API **0**

**감사:** 6×4×7 = **168건**. 최초 미달 **9건** → `ensureReadableOnPaper`(명도만↓)로 솔리드 paper-on-color fill만 보정. 재감사 **168/168**. `tsc` 0.

| 조합 | before→after |
|------|----------------|
| 식품/base accent+paper | 2.01→3.10 (`#E3A72E`→`#B98419`) |
| 식품/warm accent+paper | 2.22→3.09 |
| 식품/cool inkAccent+paper | 3.69→4.77 |
| 식품/cool accent+paper | 1.51→3.39 |
| 식품/cool deep+paper (×4 동일 bg) | 2.48→3.16 |
| 펫/bold accent+paper | 2.24→3.17 |

배선: 패턴C `getSectionBackground`, live `solidAccent/DeepOnPaper`, export `deepFill`. hue·3색 체계 변경 없음.  
산출: `scripts/188cha-contrast-audit.ts`, `review/188cha-export/contrast-audit.json`

