# 109차 — 히어로 브랜드 워드마크 / 로고

생성: 2026-09-04  
전제: `TEST_MODE=true`, 유료 생성 없음.

## 완료 체크리스트

- [x] 로고 업로드 슬롯 (`CreateProductForm` 참고 자료) + `logo_url` 마이그레이션 `20260904103000_products_logo_url.sql` (수동 적용)
- [x] 히어로 로고 렌더 — max-width 28%, max-height 64px, 상단 중앙, 그라디언트 위 z-30
- [x] 로고 없을 때 타이포 워드마크 (영문 lowercase+넓은 자간 / 한글·혼합 heading)
- [x] 브랜드명 없음·상품명과 동일 시 미표시 (`resolveHeroBrandMark`)
- [x] `export-detail-html`에 `buildHeroBrandMarkHtml` 포함
- [x] 심볼·엠블럼 AI 생성 코드 없음 (텍스트 조판만)
- [x] `npx tsc --noEmit` 0 + `109cha-hero-brand-mark-smoke.ts` PASS

## 핵심 파일

- `lib/hero-brand-mark.ts`
- `components/DetailSectionRenderer.tsx` hero
- `lib/export-detail-html.ts`
- `components/CreateProductForm.tsx`
- `app/api/generate/route.ts` (`logo_url` persist)
- `app/create/result/page.tsx`
