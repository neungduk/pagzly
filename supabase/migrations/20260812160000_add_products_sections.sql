-- products 테이블에 AI가 생성한 "동적 섹션 배열"을 저장할 컬럼 추가.
-- 기존 headlines/description/features/how_to_use/caution 컬럼은 검색·목록
-- 표시용 요약값으로 계속 사용하고(하위호환), 실제 상세페이지 렌더링은
-- sections 컬럼을 기준으로 한다.

alter table public.products
  add column if not exists sections jsonb not null default '[]'::jsonb;

comment on column public.products.sections is
  '상세페이지를 구성하는 섹션 배열. 각 원소는 { type, ...type별 필드 } 형태.
   type: hero | checklist | image_text | spec_table | usage_steps | gallery | caution | cta_price';
