# 27차 — 상세페이지 카피 품질(상품성) 개선: 카테고리별 길이·리듬 규율 일반화

## 배경

사용자 요청: "상세페이지를 더더욱이 더 보기 좋게 상품성 있게 만들건데 커서가 다른 상세페이지들
검색하고 학습 하고 공부 해서 우리껄 더 업데이트 시키도록 하자."

이 브리프는 (1) 기존 리서치 문서 `review/reference-patterns.md` (4개 레퍼런스 페이지 심층 분석 —
Shooter Official, Polo Ralph Lauren, 코슈마드 RDM, 로이엘 내추럴), (2) 이번에 새로 조사한 2026년
이커머스 상세페이지 트렌드(draph.art) 및 CRO 베스트 프랙티스(VWO), (3) 현재 코드베이스
(`app/api/generate/route.ts`의 DeepSeek 카피 생성 프롬프트, `lib/section-templates.ts`의 슬롯
정의, `lib/design-tokens.ts`의 스페이싱 토큰)를 대조해서 **실제로 코드에 존재하는 구체적인 격차
하나**를 찾아 고친 것입니다. 리서치 항목을 나열식으로 다 반영하지 않고, 검증 가능한 격차만
다룹니다 (아래 "이미 잘 되어있어 손대지 않은 것" 참고).

## 발견한 격차

`app/api/generate/route.ts`의 카피 생성 프롬프트(`generateCopyWithDeepSeek` 내부, 605행부터
시작하는 `prompt` 템플릿 리터럴)를 보면, 654~668행에 **"카피 길이·컨셉 정합" 규율 블록이
`isCosmetics` 조건일 때만** 삽입됩니다:

```ts
${isCosmetics ? `
## 화장품 카피 길이·컨셉 정합
- hero headline: 한 줄, 공백 포함 22자 이내, 핵심 효능 1개만.
- hero subheadline: 헤드라인을 보충하는 1문장. 상품명만 반복하지 말 것.
- ingredient_highlight body: 2~3문장.
- texture_feel body: 2문장.
- step_card: 각 단계 title 6자 내외 + body 1문장. STEP 태그는 서버가 자동으로 붙이므로 title에 STEP 01 등을 쓰지 말 것.
- highlight_box: 카드 3장, title 6자 내외 + body 1~2문장. checklist와 다른 효과/성분 축으로 구성하고, 가장 강조하고 싶은 내용을 2번째 카드에.
- checklist items: 각 14자 내외.
- quick_points: layout 반드시 "compact". heading 8자 내외, body 1문장. 사진은 텍스처/디테일 컷.
- compact layout은 사진이 작아지므로 텍스트도 짧게 (heading·body 모두 위 길이 준수).
- spec_table 값에 없는 % 수치를 만들지 말 것 (임상 막대용 가짜 데이터 금지).
- stat_infographic: ...
- 시각 컨셉과 모순 금지: ...
` : ""}
```

즉 **"화장품/뷰티" 카테고리로 생성할 때만** hero headline 22자, checklist 14자, step_card
title 6자 같은 구체적 글자수 규율이 적용되고, "의류/패션", "식품/건강기능식품", "전자제품",
"생활용품", "반려동물", "기타" 카테고리로 생성하면 이 규율이 전혀 적용되지 않습니다. 상위의
일반 AIDA/리듬 가이드(611~653행)만 적용되는데, 이건 정성적 지침("짧은 문장 위주", "임팩트
구간")일 뿐 구체적 글자수 상한이 없어서, 실제로는 DeepSeek이 화장품 카테고리보다 다른
카테고리에서 더 길고 스캔하기 어려운 카피를 낼 가능성이 높습니다 (레퍼런스 리서치가 강조하는
"One Big Point per Section"/스캔 가능성 원칙이 카테고리별로 불균등하게 적용되는 상태).

`lib/section-templates.ts`의 `CATEGORY_TO_TEMPLATE`(603~611행)을 보면 5개 상위 템플릿이 있고,
카테고리별 전용 슬롯은 다음과 같습니다 (공통 슬롯 hero/checklist/image_text/highlight_box/
step_card/quick_points/spec_table/gallery/stat_infographic/comparison_chart/faq/caution/
shipping_info/cta_price 등은 모든 카테고리에 공통):

- 패션/의류: `color_variation`, `coordination`, `fabric_composition`, `fit_guide`
- 식품: `cooking_steps`, `sourcing_story`, `serving_suggestion`, `storage_tip`
- 전자/가전, 생활/리빙: 카테고리 전용 슬롯 없음 (공통 슬롯만)

## 수정 1 — `lib/section-templates.ts`에 카테고리별 길이 가이드 함수 추가

`resolveTemplateCategory` 함수(615~617행) 바로 아래에 새 함수를 추가하세요:

```ts
export function resolveTemplateCategory(category: string): TemplateCategory {
  return CATEGORY_TO_TEMPLATE[category] ?? "생활/리빙";
}

/**
 * 카테고리별 카피 길이·리듬 규율 프롬프트 블록.
 * 기존에는 화장품/뷰티에만 이 규율이 있었고 다른 카테고리는 정성적 가이드만
 * 있어서 카피가 길어지는 경향이 있었다 (27차, 2026-08-26).
 * 공통 슬롯 규율 + 카테고리 전용 슬롯 규율을 합쳐서 반환한다.
 */
export function buildSectionLengthGuide(category: string): string {
  const common = `- hero headline: 한 줄, 공백 포함 22자 이내, 핵심 강점 1개만.
- hero subheadline: 헤드라인을 보충하는 1문장. 상품명만 반복하지 말 것.
- checklist items: 각 14자 내외.
- image_text body (ingredient_highlight, texture_feel, detail_zoom, feature_detail 등): 2~3문장, 짧은 문장 + 설명 문장을 교차.
- step_card: 각 단계 title 6자 내외 + body 1문장. STEP 태그는 서버가 자동으로 붙이므로 title에 STEP 01 등을 쓰지 말 것.
- highlight_box: 카드 3장, title 6자 내외 + body 1~2문장. checklist와 다른 축으로 구성하고, 가장 강조하고 싶은 내용을 2번째 카드에.
- quick_points: layout 반드시 "compact". heading 8자 내외, body 1문장. compact layout은 사진이 작아지므로 텍스트도 짧게.`;

  if (category === "화장품/뷰티") {
    return `\n\n## 화장품 카피 길이·컨셉 정합\n${common}\n- ingredient_highlight body: 2~3문장.\n- texture_feel body: 2문장.\n- spec_table 값에 없는 % 수치를 만들지 말 것 (임상 막대용 가짜 데이터 금지).\n- 시각 컨셉과 모순 금지: 쿨링/진정이면 따뜻·온기·골드 카피 금지. 수분이면 오일리·번들 표현 금지. 클렌징이면 보습 도포를 주효능처럼 쓰지 말 것.`;
  }

  if (category === "의류/패션") {
    return `\n\n## 패션/의류 카피 길이·컨셉 정합\n${common}\n- color_variation 옵션 label: 색상명 + 짧은 수식 (예: "차콜 그레이"), 4~8자.\n- coordination body: 코디 장면 묘사 1~2문장 (예: "데님과 매치하면 캐주얼하게, 슬랙스와 매치하면 포멀하게").\n- fabric_composition(spec_table): 소재/혼용율은 입력에 있는 값만 쓰고, 없으면 "판매자 확인 필요".\n- fit_guide body: 핏 설명 2문장 이내 (예: "루즈핏이라 한 치수 크게 나옵니다. 편안한 착용감을 원하면 정사이즈를 추천해요.").`;
  }

  if (category === "식품/건강기능식품") {
    return `\n\n## 식품 카피 길이·컨셉 정합\n${common}\n- cooking_steps: 각 단계 title 6자 내외 + body 1문장.\n- sourcing_story body: 원산지/생산 배경 2~3문장, 과장 없이 사실 위주.\n- serving_suggestion body: 섭취/제공 장면 1~2문장.\n- storage_tip body: 보관 방법 1문장.`;
  }

  return `\n\n## 카피 길이·리듬 정합\n${common}`;
}
```

## 수정 2 — `app/api/generate/route.ts`에서 새 함수 사용

**import 추가** (20행 근처, 기존 `section-templates` import에 함수 하나 추가):

```ts
// before
import { getSlotImageRatio, getSlotTemplate, type SlotDefinition } from "@/lib/section-templates";

// after
import {
  buildSectionLengthGuide,
  getSlotImageRatio,
  getSlotTemplate,
  type SlotDefinition,
} from "@/lib/section-templates";
```

**654~668행의 `isCosmetics` 전용 블록을 교체**:

```ts
// before (654~668행)
${isCosmetics ? `
## 화장품 카피 길이·컨셉 정합
- hero headline: 한 줄, 공백 포함 22자 이내, 핵심 효능 1개만.
- hero subheadline: 헤드라인을 보충하는 1문장. 상품명만 반복하지 말 것.
- ingredient_highlight body: 2~3문장.
- texture_feel body: 2문장.
- step_card: 각 단계 title 6자 내외 + body 1문장. STEP 태그는 서버가 자동으로 붙이므로 title에 STEP 01 등을 쓰지 말 것.
- highlight_box: 카드 3장, title 6자 내외 + body 1~2문장. checklist와 다른 효과/성분 축으로 구성하고, 가장 강조하고 싶은 내용을 2번째 카드에.
- checklist items: 각 14자 내외.
- quick_points: layout 반드시 "compact". heading 8자 내외, body 1문장. 사진은 텍스처/디테일 컷.
- compact layout은 사진이 작아지므로 텍스트도 짧게 (heading·body 모두 위 길이 준수).
- spec_table 값에 없는 % 수치를 만들지 말 것 (임상 막대용 가짜 데이터 금지).
- stat_infographic: keyFeatures·ingredients·certifications 등 **입력에 명시된 수치**만 metrics에 사용. 근거 없으면 stat_infographic 슬롯 전체를 생략. "판매자 확인 필요"나 임의 percent 금지. 비율/점유율 수치는 style:"bar"|"ring"+percent로(원형 강조는 ring), 시간·용량·중량·개수 같은 절대 수치는 style:"number"로 percent 없이 큰 숫자 강조. basis는 measured/self_assessed.
- 시각 컨셉과 모순 금지: 쿨링/진정이면 따뜻·온기·골드 카피 금지. 수분이면 오일리·번들 표현 금지. 클렌징이면 보습 도포를 주효능처럼 쓰지 말 것.
` : ""}

// after
${buildSectionLengthGuide(productInfo.category)}
${isCosmetics ? `
## 화장품 stat_infographic 수치 규율
- stat_infographic: keyFeatures·ingredients·certifications 등 **입력에 명시된 수치**만 metrics에 사용. 근거 없으면 stat_infographic 슬롯 전체를 생략. "판매자 확인 필요"나 임의 percent 금지. 비율/점유율 수치는 style:"bar"|"ring"+percent로(원형 강조는 ring), 시간·용량·중량·개수 같은 절대 수치는 style:"number"로 percent 없이 큰 숫자 강조. basis는 measured/self_assessed.
` : ""}
```

**주의**: `stat_infographic` 수치 규율은 (다른 카테고리에도 동일하게 적용되어야 맞지만) 이미
729~710행 근처의 공통 지침에 stat_infographic/comparison_chart 관련 규율이 카테고리 무관하게
서술되어 있으므로 — 이 화장품 전용 블록은 원래 있던 내용을 그대로 보존만 하고 새로 일반화하지
않았습니다. 중복 강조라 제거해도 되지만, 기존 화장품 결과물의 회귀를 피하기 위해 그대로
남겨두는 쪽을 권장합니다.

`isCosmetics` 변수 자체는 다른 곳(802행 근처 이미지 인덱스 클램프 등)에서도 쓰이므로 그대로
둡니다. `cosmeticsGuide`(568행, MFDS 표시광고 준수 문구)와 `foodGuide`(571행, 식품 표시광고
문구)는 이번 수정과 무관하며 손대지 않습니다.

## 이미 잘 되어있어 손대지 않은 것 (리서치 결과, 참고용)

- **AIDA 구조 강제 + 좋은/나쁜 카피 예시(605~653행)**: "이 상품이 아니면 쓸 수 없는 구체적
  카피"를 요구하는 지침이 이미 정교하게 들어가 있음. Feature→Benefit 브릿징을 별도로 추가할
  필요 없음 — 이미 예시로 명시되어 있음.
- **인증/후기 배지**: `review/reference-patterns.md`에 이미 "슬롯 없음 → 신설 금지"로 명시된
  하드 제약(가짜 후기·인증 배지 그리드 금지)이 있고, 현재 `인증/수상` 입력값은 stat_infographic/
  faq/cta_price badges에 실제 데이터일 때만 반영되는 구조. 새로 손댈 필요 없음.
- **섹션 간격(스페이싱 토큰)**: `lib/design-tokens.ts` 219행에 이미 "80px 데스크톱 / 48px
  모바일" 주석과 함께 스페이싱 토큰이 있고, 이는 `review/reference-patterns.md`가 레퍼런스
  4개 페이지에서 추출한 48/80px 간격 원칙과 일치함. 이미 반영되어 있어 추가 조치 불필요.
- **인터랙티브 컬러 스와치/360도 뷰** (2026 트렌드 조사에서 발견): 구조적으로는
  `lib/export-detail-html.ts`의 HTML export 경로에서만 가능하고, 타겟 마켓플레이스가 임베드된
  `<script>`를 제거하는지 확인이 안 된 상태라 이번 라운드에서는 구현하지 않음. 다음 라운드
  후보로만 기록.
- **영상/모션 생성**: 새 AI 프로바이더가 필요해 이번 범위 밖으로 판단, 손대지 않음.

## 검증 시 확인할 것

1. `tsc --noEmit` (`/tmp/tscheck` 하네스) — import 추가·함수 시그니처 오류 없는지.
2. 코드 diff가 이 브리프의 before/after와 정확히 일치하는지 (특히 654~668행 교체 범위).
3. **화장품/뷰티 카테고리 회귀 확인**: 화장품으로 실제 생성 1회 돌려서 기존과 동일한 수준의
   길이 규율(hero 22자, checklist 14자 등)이 유지되는지 육안 확인.
4. **비화장품 카테고리 개선 확인**: "의류/패션"과 "식품/건강기능식품"으로 각각 실제 생성 1회씩
   돌려서 hero headline이 22자 근처인지, checklist 항목이 과도하게 길지 않은지, color_variation
   label이나 cooking_steps title이 새 규율대로 짧게 나오는지 확인. (LLM 출력이라 100% 강제는
   안 되지만, 프롬프트에 규율이 없던 이전보다는 뚜렷하게 짧아져야 함.)
5. "전자제품"류(카테고리 전용 슬롯 없는 생활/리빙 폴백)도 1회 생성해서 일반 블록이 정상
   삽입되는지 확인.
6. 화장품 stat_infographic 블록이 중복 없이 정상 렌더링되는지 (프롬프트 텍스트만 재배치했으므로
   기능적 차이는 없어야 함).
