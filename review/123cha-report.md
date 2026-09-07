# 123차 — 작업 내역 "보기" 미오픈 (DB 마이그레이션 미적용)

생성: 2026-09-07  
전제: QA 픽스처 무관. 상품 생성 API 호출 없음.

## 원인

`/create/result`가 `logo_url` 등 최근 컬럼을 `select`하는데 원격 DB에 미적용 → PostgREST `42703` → 조용히 `/create` 리다이렉트.

## 마이그레이션 대조 (linked: `sblnthhayvrfkvaksest`)

| 파일 | push 전 remote | push 후 |
|------|----------------|---------|
| … ~ `20260831100000` | 적용됨 | 동일 |
| `20260831120000_credit_to_token_scale` | **미적용** | 적용 |
| `20260831130000_products_kind` | **미적용** | 적용 |
| `20260903100000_subscriptions_billing_cycle` | **미적용** | 적용 |
| `20260903140000_products_theme_photo_cost_image_roles` | **미적용** | 적용 |
| `20260904090000_products_image_origins` | **미적용** | 적용 |
| `20260904103000_products_logo_url` | **미적용** | 적용 |

`mfds_reviewed` / `replacements`: `20260812150000`에 이미 포함 — 기존부터 존재 확인.

적용 명령: `npx supabase db push --linked --yes`

### 컬럼 존재 조회 (적용 후)

`logo_url`, `image_origins`, `theme`, `photo_cost_breakdown`, `image_roles`, `mfds_reviewed`, `replacements`, `kind` — **전부 존재**.  
서비스 롤 `select`(result 페이지와 동일 컬럼 목록) **성공**.

## UX 개선

`app/create/result/page.tsx`: id 있는데 DB 실패 시 `/create`로 조용히 튕기지 않고  
- 사용자 메시지 + ToastBanner  
- `NODE_ENV===development`면 `error.message` 화면 노출  
- 「작업 내역으로」「새로 만들기」링크

## 검증

| 항목 | 결과 |
|------|------|
| history → 「보기」 | `/create/result?id=…` 유지, 콘솔 `DB load failed` 없음 |
| 스크린샷 | `review/123cha-history-view-fixed.png` |
| 없는 id | 토스트/에러 문구 표시, 리다이렉트 없음 (`123cha-missing-id-toast.png`) |
| `tsc --noEmit` | 0건 |

검증 스크립트: `scripts/123cha-verify-history-view.ts`
