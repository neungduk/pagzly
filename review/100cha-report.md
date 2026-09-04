# 100차 — Vision 사진 역할 + 재가공 변형 팬아웃

생성: 2026-09-03

## 작업 요약

| 작업 | 내용 | 상태 |
|------|------|------|
| A | `analyzeImagesWithClaude` → JSON `{analysis, roles[]}`, `mergeImageRolesWithVision` (user > vision≥0.5 > default), `[image-roles]` 로그 | 완료 |
| A | draft→final: `imageAnalysis`/`visionImageRoles`/`imageRoles`/`imageRoleUserSet`/`theme` 전달 | 완료 |
| B | fx 오버레이 append + 재배정 (히어로 제외 규칙은 pickOverlay 유지) | 완료 |
| B | beauty/texture 파생 — 업로드 장수 조건 제거(뷰티면 최소 1장씩) | 완료 |
| B | `[photo-pipeline] studioLimit=… uploaded=… passthrough=…` | 완료 |
| C | final 경로 `image_analysis` 저장 + result select/`mapProductRow` 반영 | 완료 |
| C | migration: `theme`, `photo_cost_breakdown`, `image_roles` | 파일 추가, **원격 적용 실패(DB 비번)** — 수동 적용 필요 |
| D | 폼 문구를 AI 연출 인물컷 가능으로 수정 | 완료 |

## 검증

- `npx tsc --noEmit` — 0 errors
- `scripts/100cha-image-roles-smoke.ts` — PASS (순서 무관 package/hero, user lock, low confidence)
- `scripts/99cha-assign-images-smoke.ts` — PASS
- 실기기 순서 뒤섞기 / fx DOM 실측 / 4/4 단계 — **마이그레이션·실생성 후 사용자 확인**

## 수동 필요

```sql
-- supabase/migrations/20260903140000_products_theme_photo_cost_image_roles.sql
alter table public.products
  add column if not exists theme jsonb,
  add column if not exists photo_cost_breakdown jsonb,
  add column if not exists image_roles jsonb;
```

마이그레이션 미적용 시 insert의 새 컬럼이 실패할 수 있으므로, 배포 전 반드시 적용하세요.
(컬럼 없으면 PostgREST가 알 수 없는 컬럼으로 거부)

## 변경 파일

- `lib/image-roles.ts`, `lib/image-analysis-cache.ts`
- `app/api/generate/route.ts`
- `lib/photo-pipeline-client.ts`
- `lib/types/generate.ts`
- `components/CreateProductForm.tsx`
- `app/create/draft/page.tsx`
- `app/create/result/page.tsx`
- `supabase/migrations/20260903140000_products_theme_photo_cost_image_roles.sql`
- `scripts/100cha-image-roles-smoke.ts`
- `review/100cha-report.md`
