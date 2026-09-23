# 191차 — 이미지 lazy-loading

생성: 2026-09-15 · API **0**

**변경:** 히어로만 eager(+`fetchPriority="high"`), 이하 섹션 이미지에 `loading="lazy" decoding="async"`. 레이아웃/색/카피 미변경.  
**라이브:** `SectionImage`에 `priority?: boolean`(기본 false) → `case "hero"`만 `priority`.  
**export:** 비히어로 `<img>` 템플릿 **13/13** lazy · 히어로 `fetchPriority="high"` 1.  
**검증:** `tsc` 0. living export DOM: lazy≥1, hero loading 없음·fetchPriority=high.

| 파일 | diff |
|------|------|
| `components/SectionImage.tsx` | loading/decoding/fetchPriority |
| `components/DetailSectionRenderer.tsx` | hero `priority` |
| `lib/export-detail-html.ts` | lazy×13 + hero fetchPriority |

백로그 마스터는 Cursor 미갱신.
