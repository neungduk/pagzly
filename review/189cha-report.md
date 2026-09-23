# 189차 — 텍스트 색 대비 확장 감사

생성: 2026-09-15 · API **0**

**감사:** accent/deepAccent를 **텍스트 색**으로 쓰는 자리(밝은 paper/틴트 bg) — 역할 4×카테고리 6×변형 4 = **96건**. raw 미달 **14건**(식품 base/warm/cool, 펫 warm/bold).  
**수정:** `readableTextAccent`/`readableTextDeep` (= `ensureReadableOnPaper` 재사용)을 `DetailSectionRenderer`·`export-detail-html` 텍스트 `color`에 배선. 188 bg+paper·반전 규칙은 미변경.  
**재검증:** after **0 미달**(96/96). `tsc --noEmit` 0.

### 감사 표 (요약)

| | 건수 |
|--|--:|
| 총 검사 | 96 |
| raw 미달 | 14 |
| after(`readableText*`) 미달 | **0** |

### raw FAIL → after (before→after)

| 조합 | role | raw→after |
|------|------|-----------|
| 식품/base | deep body | 3.03→4.86 |
| 식품/base | accent body | 2.01→5.06 |
| 식품/base | accent large | 2.01→3.10 |
| 식품/warm | deep body | 3.17→5.06 |
| 식품/warm | accent body | 2.22→4.86 |
| 식품/warm | accent large | 2.22→3.09 |
| 식품/cool | deep body | 2.48→4.70 |
| 식품/cool | deep large | 2.48→3.16 |
| 식품/cool | accent body | 1.51→4.51 |
| 식품/cool | accent large | 1.51→3.39 |
| 펫/warm | accent body | 3.52→4.78 |
| 펫/bold | deep body | 3.04→4.58 |
| 펫/bold | accent body | 2.24→4.67 |
| 펫/bold | accent large | 2.24→3.17 |

산출: `scripts/189cha-contrast-audit.ts`, `review/189cha-export/contrast-audit-text.json`  
백로그 마스터는 Cursor 미갱신 — 검증 후 반영 부탁.
