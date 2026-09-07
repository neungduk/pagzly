# 123차 — [긴급 버그] "내 작업 내역 → 보기" 클릭 시 안 열림 (DB 마이그레이션 미적용)

생성: 2026-09-07
전제: 이번 건은 118~122차 "후커블 퀄리티" 스레드와 무관한 **실제 기능 버그**입니다. 사용자가 직접 리포트했습니다: "내 작업 내역 목록은 보이는데, 항목의 '보기'를 누르면 안 열린다."

---

## 0. 재현 및 근본 원인 (직접 재현·확인 완료)

로컬 dev 서버(`localhost:3000`)에서 브라우저로 직접 재현했습니다.

1. `/create/history` 접속 → 목록 정상 표시(스크린샷 첨부와 동일 화면 확인).
2. 첫 항목 "보기 →" 클릭 → `/create/result?id=<uuid>`로 이동했다가 **곧바로 `/create`로 리다이렉트**됨. 화면엔 아무 에러 메시지도 안 뜸(그냥 조용히 홈으로 튕김) — 사용자가 "안 나온다"고 느낄 수밖에 없는 UX.
3. 브라우저 콘솔에 `[create/result] DB load failed` 경고, 네트워크 탭에서 Supabase REST 호출이 **400**으로 실패하는 것 확인.
4. 실패 응답 바디를 직접 파싱해서 확인한 정확한 에러:
   ```json
   { "code": "42703", "message": "column products.logo_url does not exist" }
   ```

**원인**: `app/create/result/page.tsx`의 상품 상세 조회(`supabase.from("products").select(...)`)가 `logo_url`, `image_origins`, `theme`, `photo_cost_breakdown`, `mfds_reviewed`, `replacements` 등 **최근(100~109차) 라운드에서 추가된 컬럼들을 select**하는데, 실제 Supabase 프로젝트 DB에는 이 컬럼들을 추가하는 마이그레이션이 **적용되어 있지 않습니다.**

`supabase/migrations/20260904103000_products_logo_url.sql` 파일을 열어보니 주석에 이렇게 쓰여 있습니다:

```sql
-- 109차: 판매자 브랜드 로고 URL (히어로 표시용). 적용은 수동.
alter table public.products
  add column if not exists logo_url text;
```

**"적용은 수동"이라고 적어놓고 실제로 아무도 이 마이그레이션을 실행하지 않은 것**으로 보입니다. `/create/history` 목록 페이지는 컬럼을 5개(`id, product_name, category, image_urls, created_at`)만 선택해서 전부 예전부터 있던 컬럼이라 정상 작동하고, `/create/result` 상세 페이지만 최근 컬럼을 요구해서 깨진 겁니다 — 그래서 "목록은 보이는데 보기만 안 된다"는 정확한 증상이 나온 겁니다.

이건 히어로 워드마크 로고 기능(109차), 이미지 출처 배지(106차) 등 **최근 몇 라운드에서 만든 기능 전체가 실제 서비스 DB에서는 작동하지 않고 있었을 가능성**을 의미합니다. 심각도 높음으로 판단해 이번 브리프로 바로 올립니다.

---

## 1. 할 것 (우선순위 순)

### (a) 밀린 마이그레이션 전부 확인·적용

`supabase/migrations/` 폴더의 파일 목록과, 실제 연결된 Supabase 프로젝트에 **어디까지 적용됐는지** 대조하세요(`supabase migration list` 또는 프로젝트에 연결된 CLI/대시보드로 확인). 최소한 아래는 미적용으로 의심됩니다 — 순서대로 안전하게(전부 `add column if not exists`라 멱등성 있음) 적용하세요:

- `20260903140000_products_theme_photo_cost_image_roles.sql` (theme, photo_cost_breakdown, image_roles)
- `20260904090000_products_image_origins.sql` (image_origins)
- `20260904103000_products_logo_url.sql` (logo_url)

그리고 그 이전 것들(`mfds_reviewed`, `replacements` 컬럼을 추가한 마이그레이션이 어느 파일인지 찾아서 — `select` 목록에 있는데 위 3개 파일엔 없으므로 별도 파일일 가능성 있음)도 같이 확인하세요. **적용 여부를 실제로 조회해서 확인**하고, 빠진 게 있으면 전부 적용하세요.

`supabase/config.toml`에 프로젝트가 링크되어 있다면 `supabase db push`로 한 번에 처리되는지 먼저 시도해보고, 안 되면 대시보드 SQL 에디터에서 파일 내용을 순서대로 실행하세요. **DROP이나 데이터 변경은 전혀 없고 전부 `ADD COLUMN IF NOT EXISTS`라 데이터 손실 위험 없습니다.**

### (b) 재현 확인

마이그레이션 적용 후, `/create/history` → 아무 항목이나 "보기" 클릭 → 상세 페이지가 실제로 열리는지 확인하세요. 이번엔 억지로 재현하지 말고 **실제 브라우저로 직접 클릭해서** 확인해 주세요(제가 방금 한 것과 동일한 방식).

### (c) 재발 방지 — 조용한 실패 대신 사용자에게 보이는 에러 처리

`app/create/result/page.tsx`의 `load()` 함수(214줄 부근)를 보면 DB 조회 실패 시 `console.warn`만 찍고 **아무 안내 없이 `/create`로 리다이렉트**합니다. 이번처럼 스키마 문제든 다른 이유든, 앞으로 비슷한 실패가 또 나면 사용자는 또 "안 열린다"고만 느끼고 원인을 알 방법이 없습니다.

- `id`가 있는데 DB 조회가 실패하는 경우, 리다이렉트 전에 사용자에게 보이는 토스트/에러 메시지를 띄우세요(예: 기존 `toast` 상태·`ToastBanner` 패턴 재사용 — "저장된 페이지를 불러오지 못했습니다. 다시 시도해 주세요." 정도).
- 개발 환경(`NODE_ENV === "development"`)에서는 실제 에러 메시지(`error.message`)를 콘솔뿐 아니라 화면에도 노출해서 다음에 같은 종류 문제가 생기면 바로 알아볼 수 있게 하세요.

---

## 2. 하지 않는 것

- 118~122차 QA 픽스처/스코어링 작업과는 무관 — 이번 브리프에서 그쪽은 건드리지 마세요.
- 컬럼 삭제·데이터 마이그레이션(값 채워넣기 등)은 범위 밖 — 컬럼 존재 여부만 맞추면 됩니다(신규 컬럼은 기존 행에서 당연히 NULL이며, 코드가 이미 optional로 다루고 있는지 확인만 하세요).
- 실 상품 생성 API 호출 불필요.

## 3. 검증 방법

1. 마이그레이션 적용 전/후 `logo_url`, `image_origins`, `theme`, `photo_cost_breakdown`, `mfds_reviewed`, `replacements`, `image_roles` 컬럼이 실제 DB `products` 테이블에 존재하는지 조회 결과로 확인.
2. 브라우저로 `/create/history` → "보기" 클릭 → 상세 페이지 정상 렌더 확인(스크린샷 남겨주세요: `review/123cha-history-view-fixed.png`).
3. 콘솔에 `[create/result] DB load failed` 재발 없음 확인.
4. (c) 항목 구현했다면, 일부러 존재하지 않는 `id`로 `/create/result?id=존재하지않는값`을 열어서 에러 토스트가 뜨는지 확인.
5. `npx tsc --noEmit` 0건.

## 4. 완료 보고 체크리스트

- [ ] 밀린 마이그레이션 전체 목록 확인 (파일 목록 vs 실제 DB 적용 상태)
- [ ] 미적용 마이그레이션 전부 적용 (데이터 손실 없음 확인)
- [ ] `/create/history` → "보기" 실제 클릭 재현 테스트 통과
- [ ] 조용한 실패 → 사용자에게 보이는 에러 메시지로 개선
- [ ] `npx tsc --noEmit` 0건
