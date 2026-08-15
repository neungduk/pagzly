-- 상품 1건을 생성하는 데 실제로 든 AI 파이프라인 비용(USD)을 기록한다.
-- Replicate(851-labs/background-remover, clarity-upscaler, flux-fill-dev)와
-- DeepSeek 호출 비용을 모두 더한 값이며, app/api/generate/route.ts에서
-- products insert 시 함께 저장한다.

alter table public.products
  add column if not exists generation_cost numeric(10, 4) not null default 0;

comment on column public.products.generation_cost is
  'AI 파이프라인(Replicate 851-labs/clarity-upscaler/flux-fill-dev + DeepSeek) 실행 비용 합계(USD).';
