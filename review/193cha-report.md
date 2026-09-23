# 193차 — 갤러리 간격 + export 섹션 타이틀 폰트

생성: 2026-09-15 · API **0**

**트랙 A:** `galleryGapClass` DEFAULT+5카테고리 전부 **gap-2**(8px). live 뷰티 pairCompare `gap-2`. export gallery grid **gap:8px**(기존 2px).  
**트랙 B:** export 섹션 타이틀 7곳 → `dh2()`(display headline CSS). `dh2(` **16→23**.  
**검증:** `tsc` 0. `galleryGapClass` 6곳 gap-2. export raw `<h2 style=` 섹션 타이틀 잔여 0(카드 `<h3>` 등 제외).

| 파일 | 변경 |
|------|------|
| `lib/design-tokens.ts` | galleryGapClass×6 |
| `DetailSectionRenderer.tsx` | pairCompare gap-2 |
| `lib/export-detail-html.ts` | gap 8px + dh2×7 |

백로그 마스터는 Cursor 미갱신.
