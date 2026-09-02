# 47차 Cursor 브리프 — 인스타 피드·블로그 전용 "미니 생성" 독립 파이프라인

생성: 2026-08-31
결정 근거: 사용자 확인 완료 — (1) 상세페이지 파이프라인을 재사용하지 않는 완전히 독립된
파이프라인으로 구현, (2) 최소 사진 5장, 완성 1건당 60토큰

## 배경 (사용자 원문)

> "상세페이지/인스타피드/블로그티스토리 섹션별로 상품을 우리가 판매를 했으면해. 상세페이지는
> 필요 없고 인스타 피드만 필요한 사람들이 있을 거잖아? 그거에 맞게 딱 나오는게 필요하다 이거지.
> 블로그나 티스토리 자동으로 업로드는 안되더라도 이걸 복사해서 붙여넣기만 할 수 있게라도
> 나왔으면 해."

시작 전에 확인한 사실: 지금 `components/InstagramFeedPanel.tsx`(`lib/instagram-feed.ts`)와
`components/BlogPostPanel.tsx`(`lib/blog-post.ts`)는 **상세페이지의 완성된 `sections:
DetailSection[]`을 그대로 재활용**하는 구조라, 인스타/블로그만 원하는 사용자도 지금은 반드시
7~10장 사진을 올려 전체 상세페이지 생성(비싼 파이프라인)을 거쳐야만 그 결과를 볼 수 있습니다.
사용자와 상의한 결과, 이 커플링을 끊고 **완전히 독립된 미니 파이프라인**을 새로 만들기로
확정했습니다.

**중요한 설계 포인트**: `InstagramFeedPanel`/`BlogPostPanel`은 `sections: DetailSection[]`,
`imageUrls: string[]`, `productName` 등 몇 개의 props만 받으면 동작합니다(내부에서 API 호출을
전혀 안 함, 순수 클라이언트 재구성). 즉 새 미니 파이프라인이 **같은 모양의 데이터**(섹션 개수는
훨씬 적어도 됨)를 만들어내기만 하면, 이 두 컴포넌트는 **코드 수정 없이 그대로** 재사용할 수
있습니다. "완전히 독립된 파이프라인"은 생성 로직·API 라우트·가격·최소 사진 장수가 상세페이지와
분리된다는 뜻이지, 화면에 보여주는 컴포넌트까지 새로 만들라는 뜻은 아닙니다 — 거기까지 새로
만들면 불필요한 중복입니다.

## 범위

1. 신규 진입 플로우 — "무엇을 만드시겠어요?" 선택 화면
2. 신규 독립 API 라우트 — `/api/generate-social` (가칭)
3. 신규 미니 결과 화면 — 인스타 피드/블로그 탭만 보여줌 (상세페이지 다운로드 없음)
4. 요금제 SSOT에 미니 모드 가격 추가
5. DB — `products`에 결과물 종류 구분 컬럼 추가

---

## 1. 진입 플로우 — 선택 화면 신규 추가

`/create` 진입 시(또는 그 직전에) "무엇을 만드시겠어요?" 선택 카드 2개를 보여주세요:

- **상세페이지** — 기존 플로우 그대로 (`/create` 현재 화면, 7~10장, 짧은/긴 구성)
- **인스타 피드 · 블로그/티스토리 전용** — 신규 미니 플로우로 이동 (경로는 Cursor가 기존
  라우팅 관례에 맞춰 정하되, 예: `/create/social`)

기존 `/create` 사용자 경험은 전혀 바꾸지 마세요 — 선택 화면은 그 앞에 한 단계 추가되는 것뿐이고,
"상세페이지" 카드를 고르면 지금 흐름 그대로 이어집니다.

## 2. 미니 플로우 입력 폼 (신규, 예: `/create/social/page.tsx`)

기존 `CreateProductForm.tsx`보다 훨씬 가벼운 폼입니다:

- **사진: 최소 5장 · 최대 10장** (기존 상세페이지의 "최소 7장" 검증 로직을
  `CreateProductForm.tsx`/관련 API에서 찾아서, 미니 플로우 전용 폼에는 5장 기준으로 별도
  적용하세요 — 기존 상세페이지 쪽 7장 기준은 절대 건드리지 않습니다).
- **상품명 · 핵심 특징 · 카테고리** 정도만 입력받습니다. 가격·타겟고객·성분·인증·경쟁사
  URL·도매처 원문·리뷰 파일·기획안·레퍼런스 이미지 같은 상세페이지 전용 입력 필드는 이 미니
  폼에는 없습니다(필요 없음 — 인스타/블로그는 그런 세부 데이터 없이도 충분히 매력적인 카피가
  나와야 합니다).
- 카테고리는 있으면 좋지만(톤 결정에 도움), 없어도 동작해야 합니다.

## 3. 신규 독립 API 라우트 — `app/api/generate-social/route.ts`

`/api/generate`와 별도 파일·별도 엔드포인트입니다. 아래 기존 함수들은 **재사용**하되(새로
베끼거나 재구현하지 마세요), 상세페이지 전용 로직(카테고리별 섹션 슬롯 템플릿
`lib/section-templates.ts`, `lib/concept-brief.ts` 컨셉 브리프, 식약처/식품 컴플라이언스
가드레일 전체, 리뷰/경쟁사/기획안 분석 등)은 가져오지 않습니다:

- 사진 비전 분석 — `app/api/generate/route.ts` 안에서 이미지 분석에 쓰는 함수(정확한 함수명은
  route.ts에서 확인 — Claude Haiku Vision 호출 부분)를 그대로 호출해 5장의 사진에서 상품
  특징을 파악합니다.
- 사진 보정/배경 생성 — `lib/photo-enhance.ts`의 `enhanceProductImage()`,
  `generateBackdrop()`을 5장 각각에 대해 호출합니다. 상세페이지처럼 섹션마다 다른 배경 테마를
  만들 필요가 없으므로, **배경 후보 선택 UX(BackdropCandidatePicker) 없이 자동으로 1개 배경만
  생성**하는 단순 흐름으로 만드세요(사용자 조작 단계를 최소화하는 게 미니 플로우의 취지입니다).
- 카피 생성 — 새 전용 프롬프트 함수를 하나 작성하되(`lib/copy-orchestrator/deepseek-copy.ts`와
  같은 DeepSeek 호출 패턴을 그대로 따르세요 — API URL, 모델 상수, 에러 처리 전부 동일 패턴),
  **섹션 4~5개만** 생성하는 짧은 프롬프트로 만드세요. 최소 구성 예시: `hero`(후킹 한 줄),
  `checklist`(핵심 포인트 3~4개), `usage_steps` 또는 `image_text`(사용/연출 장면 1~2개),
  `cta_price`(구매 유도). 전부 `lib/types/generate.ts`의 기존 `DetailSection` 유니온 타입 중
  이미 있는 타입만 씁니다 — 새 섹션 타입을 만들지 마세요(패널이 인식 못 함).
- 결과 조립 — 위에서 만든 4~5개 섹션 + 보정된 이미지 URL 배열을 `DetailSection[]`/`imageUrls`
  형태로 응답합니다. 이 응답 형태가 `InstagramFeedPanel`/`BlogPostPanel`이 기대하는 props와
  호환되는지 타입 레벨에서 꼭 확인하세요.
- 토큰 차감 — `deduct_credits` RPC를 그대로 재사용하되 `p_amount`는
  `TOKEN_COST_SOCIAL_MINI`(아래 4번), `p_reason`은 기존 체크 제약에 있는 `'completion'`을
  그대로 씁니다(새 reason 값을 추가하려고 DB 제약을 건드리지 마세요 — 상세페이지 완성과 똑같이
  "완성 1건"으로 취급해도 감사 로그 관점에서 문제없습니다. 구분은 5번의 `products.kind`
  컬럼으로 합니다).

## 4. 요금제 SSOT (`lib/cost/saas-pricing-config.ts`)

46차에서 만든 `TOKEN_COST_PER_COMPLETION = { short: 80, long: 100 }` 옆에 추가:

```ts
/** 인스타 피드·블로그 전용 미니 생성 — 완성 1건당 토큰 (최소 사진 5장) */
export const TOKEN_COST_SOCIAL_MINI = 60;

/** 미니 생성 최소/최대 사진 장수 */
export const SOCIAL_MINI_MIN_PHOTOS = 5;
export const SOCIAL_MINI_MAX_PHOTOS = 10;
```

## 5. DB 마이그레이션 (신규) — `products.kind` 컬럼

```sql
alter table public.products
  add column kind text not null default 'detail_page'
  check (kind in ('detail_page', 'social_mini'));
```

기존 행은 전부 `'detail_page'`로 기본값 처리되어 하위 호환됩니다. 새 미니 파이프라인이
`products`에 insert할 때 `kind: 'social_mini'`를 명시하세요. (같은 테이블을 재사용하는 이유:
크레딧 원장의 `p_reference_id`가 이미 `products.id`를 참조하는 패턴이라, 별도 테이블을 새로
만들면 감사 추적이 두 갈래로 갈라집니다.)

## 6. 미니 결과 화면 (신규, 예: `/create/social/result/page.tsx`)

기존 `/create/result/page.tsx`(40KB, 상세페이지 다운로드·HTML export·인스타/블로그 탭 등
다 포함)를 통째로 재사용하지 마세요 — 미니 결과 화면은 **인스타 피드 탭 + 블로그/티스토리 탭
두 개만** 보여주면 됩니다(상세페이지 PNG 다운로드, 섹션 구조 에디터, 분할 ZIP 등 상세페이지
전용 기능은 없음). `InstagramFeedPanel`/`BlogPostPanel`을 `variant="workspace"`로 그대로
얹는 가벼운 페이지 하나로 충분합니다.

블로그 탭에는 기존 `exportBlogTistoryHtml`(티스토리 안내 문구 포함) 외에
`exportBlogPlainText`도 눈에 띄게 노출해서, 사용자가 원문대로 복사해 네이버 블로그 등 다른
에디터에도 붙여넣기 쉽게 해주세요(사용자가 "자동 업로드 안 돼도 복사 붙여넣기만이라도"라고
명시했으므로, 복사 버튼의 존재감을 우선순위로 두세요 — 새 기능 개발보다 지금 있는 내보내기
버튼을 미니 결과 화면에서 잘 보이게 배치하는 것 자체가 핵심입니다).

---

## 하드 룰

1. 기존 `/api/generate`, `/create`(상세페이지 플로우), `CreateProductForm.tsx`는 이번
   라운드에서 건드리지 않습니다 — 완전히 새 파일들로만 구현합니다.
2. 새 섹션 타입을 만들지 않습니다 — 기존 `DetailSection` 유니온 안에서만 4~5개를 고릅니다.
3. 카테고리별 컴플라이언스 가드레일(식약처 화장품/식품 문구 검수)은 미니 파이프라인에도 **반드시
   유지**하세요 — 카피를 생성하는 이상 과장·금지 표현 검수는 상세페이지든 인스타든 똑같이
   필요합니다. `lib/cosmetics-compliance.ts`/`lib/food-compliance.ts`의 검수 함수를 재사용하세요.
4. 가짜 후기·인증 마크는 이 미니 파이프라인에서도 만들지 않습니다(기존 프로젝트 전체 규칙과
   동일).
5. `npx tsc --noEmit` 통과 필수.

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 사진 4장으로 시도 시 "최소 5장" 검증에 걸리는지, 5장부터 진행되는지
- [ ] 완성 후 `products.kind = 'social_mini'`로 저장되는지, `user_credits.balance`에서
      정확히 60토큰 차감되는지
- [ ] 인스타 피드 탭에서 슬라이드 PNG가 정상 렌더되는지
- [ ] 블로그 탭에서 티스토리 HTML + 일반 텍스트 내보내기가 둘 다 되는지, 복사 버튼이 눈에
      잘 띄는지
- [ ] 상세페이지 플로우(`/create`)가 이번 변경으로 회귀 없는지(파일을 안 건드렸으니 사실상
      확인만)
- [ ] 화장품/식품 카테고리 선택 시 컴플라이언스 문구 검수가 미니 파이프라인에도 적용되는지

## 완료 보고 형식

기존과 동일 — 변경/신규 파일, `tsc` 결과, 위 체크리스트 결과, 그리고 미니 파이프라인에서 실제로
생성된 섹션 예시 1건(허위 생성·과장 문구 없는지 확인용)을 포함해 주세요.
