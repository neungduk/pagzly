-- 100차: 결과 페이지 생성 단계(4/4) 복원을 위해 theme·비용 분해 저장
alter table public.products
  add column if not exists theme jsonb,
  add column if not exists photo_cost_breakdown jsonb,
  add column if not exists image_roles jsonb;

comment on column public.products.theme is
  'extractProductTheme 결과 (accent/baseNeutral/deepAccent). 파이프라인 톤앤매너 단계 표시용.';

comment on column public.products.photo_cost_breakdown is
  'PhotoCostBreakdown JSON. 결과 페이지 비용·단계 카드용.';

comment on column public.products.image_roles is
  '최종 병합된 사진 역할 배열 (hero/detail/lifestyle/package/other).';
