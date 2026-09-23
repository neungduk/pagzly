# 206차 — 전자제품 표시광고법 컴플라이언스 모듈 (API 0, 새 축)

생성: 2026-09-16 — Claude 자체 코드 재검토로 발굴("206차는 코드 재검토해서 새 축 자체 발굴")

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.
(정규식 치환 함수 1개 신규 추가 + 기존 DeepSeek 프롬프트에 텍스트 블록 1개 삽입 — DeepSeek
호출 횟수 자체는 불변, 192~205차와 동일 원칙)

## 배경 — 왜 이게 "새 축"인가

192→203→204→205차는 전부 **리뷰 원문에서 신호를 뽑아내는** review-signal 계열이었고,
6개 실제 카테고리를 전부 커버해서 205차로 종료됐습니다(백로그 §3 갱신 완료).

206차는 완전히 다른 축입니다: `lib/food-compliance.ts`(식품, `식품/건강기능식품`)와
`lib/cosmetics-compliance.ts`(화장품, `화장품/뷰티`)에 이미 존재하는 **AI 생성 카피를
법규 위반 표현이 없는지 서버가 최종 강제 치환하는 컴플라이언스 모듈** 패턴을, 아직 이 패턴이
없는 **`전자제품`** 카테고리로 확장합니다. 전자제품은 전자상거래법·표시광고법상 "완벽 방수",
"고장 없음", "평생 보장", "전자파 없음", "세계 최초"류의 검증 불가능한 절대·최상급 표현이
실제로 자주 문제되는 카테고리라 식품/화장품과 동일한 법적 리스크 축을 갖습니다.

이 패턴은 이미 2번(식품, 화장품) 검증된 구조라 신규 아키텍처가 필요 없습니다 — 세 번째
카테고리에 **완전히 동일한 구조를 복사**하는 작업입니다. `mfdsReviewed`/`replacements`
필드는 이미 카테고리에 안 묶인 범용 타입(`lib/types/generate.ts`)이라 **타입 파일 수정이
전혀 필요 없습니다** — review-signal 계열(매번 4개 파일 필드 추가)보다 배선이 더 단순합니다.
UI에도 "식약처 검수" 같은 하드코딩된 문구가 없음을 제가 미리 확인했습니다(`mfdsReviewed`는
그냥 내부 boolean 패스스루) — 그래서 컴포넌트 파일 수정도 불필요합니다.

### 오탐/과장 방지 설계 (식품·화장품 모듈과 동일 원칙)

치환 규칙은 **금지 표현을 감지해 안전한 대체 표현으로 강제 치환**하는 방식입니다(카피
자체를 지어내는 게 아니라 이미 생성된 카피에서 위험 표현만 순화). 중첩 매칭 순서 주의:
"반영구"는 "영구"를 부분 문자열로 포함하므로, "반영구" 규칙을 배열에서 **먼저** 두어
"영구" 규칙이 실행되기 전에 이미 전부 치환되게 합니다(치환은 배열 순서대로 누적 `result`에
적용되므로 순서가 중요 — `food-compliance.ts`의 "완치"→"치료" 순서, `의약품(?!\s*수준)`
같은 negative lookahead와 동일한 설계 원칙).

## 작업

### 1. 신규 파일 `lib/electronics-compliance.ts`

`lib/food-compliance.ts`를 그대로 템플릿으로 삼아(구조 100% 동일, `sanitizeSection`의
switch문 케이스 전부 동일하게 복사) 새 파일을 만드세요:

```ts
import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

export const ELECTRONICS_CATEGORY = "전자제품";

export const ELECTRONICS_AI_PROMPT = `전자제품 광고 문구 작성 시 전자상거래법·표시광고법 기준을
준수해야 합니다. 방수·내구성·안전성을 검증 없이 확정적으로 과장하는 표현이나 근거 없는
"최초"류 최상급 표현은 절대 사용하지 마세요.
대신 '생활 방수', '우수한 내구성', '안전 기준 준수' 등 사실 기반 표현을 사용하세요.

금지 표현 예시: 완벽 방수, 100% 방수, 고장 없음, 고장 걱정 없음, 평생 보장, 반영구,
전자파 없음, 무전자파, 인체에 무해, 국내 유일, 세계 최초, 업계 최초, 절대 안전`;

type ReplacementRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

const REPLACEMENT_RULES: ReplacementRule[] = [
  { pattern: /완벽\s*방수/g, replacement: "생활 방수", label: "완벽 방수" },
  { pattern: /100%\s*방수/g, replacement: "생활 방수", label: "100% 방수" },
  { pattern: /고장\s*걱정\s*없음/g, replacement: "안정적인 사용", label: "고장 걱정 없음" },
  { pattern: /고장\s*없음/g, replacement: "우수한 내구성", label: "고장 없음" },
  { pattern: /평생\s*보장/g, replacement: "품질 보증 지원", label: "평생 보장" },
  { pattern: /반영구적?/g, replacement: "장기간", label: "반영구" },
  { pattern: /전자파\s*없음|무\s*전자파/g, replacement: "전자파 안전 기준 준수", label: "전자파 없음" },
  { pattern: /인체에\s*무해/g, replacement: "안전 기준 준수", label: "인체에 무해" },
  { pattern: /국내\s*유일/g, replacement: "차별화된 강점", label: "국내 유일" },
  { pattern: /세계\s*최초/g, replacement: "혁신적인 기술력", label: "세계 최초" },
  { pattern: /업계\s*최초/g, replacement: "새로운 방식", label: "업계 최초" },
  { pattern: /절대\s*안전/g, replacement: "높은 안전성", label: "절대 안전" },
  { pattern: /영구적?/g, replacement: "장기간", label: "영구" },
];
```

**규칙 순서가 중요합니다**: `반영구적?`(6번째) 규칙이 `영구적?`(13번째, 마지막) 규칙보다
반드시 먼저 와야 합니다 — "반영구"는 "영구"를 부분 문자열로 포함하므로, 먼저 실행되는
규칙이 배열 순서대로 누적 `result` 문자열에 적용되는 이 함수의 특성상 "반영구"가 먼저
전부 치환돼야 "영구" 규칙이 이미 치환된 자리를 다시 건드리지 않습니다(순서를 바꾸면
"반영구적으로" 같은 입력이 "반장기간으로"처럼 단어가 잘려서 깨집니다 — 실제로 초안 설계
단계에서 이 버그를 발견해 순서와 `적?`(선택적 "적" 접미사 흡수)을 추가해 수정했습니다).

**알려진 한계(기존 `food-compliance.ts`/`cosmetics-compliance.ts`와 동일 수준)**: 이 모듈은
품사·조사 결합을 인식하지 않는 순수 문자열 치환이라, 드물게 조사 결합이 부자연스러워질 수
있습니다(예: "세계 최초로" → "혁신적인 기술력로"는 맞춤법상 "기술력으로"가 맞지만 이 함수는
"로/으로" 받침 규칙을 모릅니다). 이건 기존 `food-compliance.ts`의 "다이어트 효과가" →
"체중 관리에 도움가"(도움이 아닌 도움가)에도 이미 존재하는 동일한 종류의 한계라 이번
모듈만의 새로운 결함이 아닙니다 — 완벽한 문법 교정이 아니라 **법규 위반 단어 자체를
제거하는 것**이 이 함수의 목적이므로, 스모크 테스트에서는 단어가 통째로 잘리거나 이상하게
뭉개지는(예: 수정 전 "반장기간") **치명적 깨짐만** 없으면 통과로 간주하세요.

이어서 같은 파일에 다음 타입·함수를 추가하세요:

```ts
export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export function isElectronicsCategory(category: string) {
  return category === ELECTRONICS_CATEGORY;
}

export function sanitizeText(text: string): {
  text: string;
  replacements: ComplianceReplacement[];
} {
  if (typeof text !== "string") {
    return { text: text == null ? "" : String(text), replacements: [] };
  }
  let result = text;
  const replacementCounts = new Map<string, ComplianceReplacement>();

  for (const rule of REPLACEMENT_RULES) {
    const matches = result.match(rule.pattern);
    if (!matches?.length) continue;

    result = result.replace(rule.pattern, rule.replacement);

    const existing = replacementCounts.get(rule.label);
    if (existing) {
      existing.count += matches.length;
    } else {
      replacementCounts.set(rule.label, {
        original: rule.label,
        replacement: rule.replacement,
        count: matches.length,
      });
    }
  }

  return {
    text: result,
    replacements: Array.from(replacementCounts.values()),
  };
}
```

`sanitizeSection()`, `reviewElectronicsCopy()`, `mergeReplacements()`는
`lib/food-compliance.ts`의 `sanitizeSection`/`reviewFoodCopy`/`mergeReplacements`를
**그대로 복사**하되 함수명만 `reviewElectronicsCopy`로 바꾸세요(내부 switch문 케이스,
필드 목록 전부 동일 — food/cosmetics 두 파일이 이미 100% 동일한 구조이므로 세 번째도
그래야 합니다). `reviewElectronicsCopy`의 반환 객체도 동일하게
`{ copy, mfdsReviewed: true, replacements: mergedReplacements }` 형태를 유지하세요
(필드명 `mfdsReviewed`를 그대로 재사용 — 카테고리 무관 범용 "컴플라이언스 검수 완료"
플래그로 이미 쓰이고 있고, UI에 "식약처"라는 문구가 하드코딩돼 있지 않음을 확인했습니다).

### 2. `app/api/generate/route.ts`

**a) import 추가** — 8번째 줄(`FOOD_AI_PROMPT` import) 바로 아래에:

```ts
import {
  ELECTRONICS_AI_PROMPT,
  isElectronicsCategory,
  reviewElectronicsCopy,
} from "@/lib/electronics-compliance";
```

**b) `generateCopyWithDeepSeek` 함수 안, `foodGuide` 계산(753~755번 줄) 바로 아래에**:

```ts
const isElectronics = isElectronicsCategory(productInfo.category);
const electronicsGuide = isElectronics
  ? `\n\n## 전자제품 표시광고 기준 (필수)\n${ELECTRONICS_AI_PROMPT}`
  : "";
```

963번 줄 프롬프트 마지막 줄 `...${conceptBlock}${cosmeticsGuide}${foodGuide}${qaFixAppendix}\`;`
을 `...${conceptBlock}${cosmeticsGuide}${foodGuide}${electronicsGuide}${qaFixAppendix}\`;`로
수정(electronicsGuide를 foodGuide 다음, qaFixAppendix 앞에 삽입).

**c) 최종 카피 검수 3분기 확장** — 현재(1478~1484번 줄 근처):

```ts
const isCosmeticsCopy = isCosmeticsCategory(body.category);
const isFoodCopy = isFoodCategory(body.category);
const finalCopy = isCosmeticsCopy
  ? reviewCosmeticsCopy(copyToSave)
  : isFoodCopy
    ? reviewFoodCopy(copyToSave)
    : null;
```

이걸 3분기로 확장:

```ts
const isCosmeticsCopy = isCosmeticsCategory(body.category);
const isFoodCopy = isFoodCategory(body.category);
const isElectronicsCopy = isElectronicsCategory(body.category);
const finalCopy = isCosmeticsCopy
  ? reviewCosmeticsCopy(copyToSave)
  : isFoodCopy
    ? reviewFoodCopy(copyToSave)
    : isElectronicsCopy
      ? reviewElectronicsCopy(copyToSave)
      : null;
```

`components/CreateProductForm.tsx`의 `CATEGORIES` 배열 기준 정확한 문자열은 `"전자제품"`
입니다(203차 재발 방지 원칙 — 미리 확인해뒀습니다).

### 3. 스모크 테스트

`scripts/`에 이미 있는 컴플라이언스 관련 테스트가 없다면(food/cosmetics 모듈 자체에
전용 스모크 스크립트가 없을 수 있음 — 있으면 그 패턴을 따르고, 없으면 205차
스모크 스크립트 구조를 참고해) `scripts/206cha-electronics-compliance-smoke.ts` 신규
작성:

- `sanitizeText()` 직접 호출 — 13개 금지 표현 각각 최소 1개 케이스로 치환되는지 확인
  (예: `"완벽 방수 기능"` → `"생활 방수 기능"`, replacements에 `{original:"완벽 방수",
  replacement:"생활 방수", count:1}` 포함).
- **중첩 매칭 순서 검증**: `"반영구적으로 사용 가능한 평생 보장 제품"` 같은 문장에서
  "반영구"와 "평생 보장"이 각각 올바르게 치환되고 깨진 문자열(예: "반장기간")이 나오지
  않는지 확인 — 이번 라운드 핵심 검증 포인트.
- 정상 카피(금지 표현 없음, 예: `"충전 10분에 2시간 재생되는 고속 충전"`)는
  `replacements: []`로 그대로 통과하는지 확인(과잉 치환 없는지 — anti-fabrication).
- `reviewElectronicsCopy()` 경유 — `GeneratedCopy` 픽스처(headlines/description/features/
  howToUse/caution/sections) 넣고 `mfdsReviewed: true`, `replacements` 배열이 채워지는지
  확인.
- `isElectronicsCategory("전자제품")` true, 나머지 5개 카테고리 전부 false 확인.
- `generateCopyWithDeepSeek`의 프롬프트 조립 로직 자체는 DeepSeek 호출 없이 코드 리딩으로만
  확인(`electronicsGuide`가 `isElectronics`일 때만 비어있지 않은 문자열인지) — 실제
  `/api/generate` 호출은 금지이므로 목업/코드 검토로 대체.

## 검증

1. `npx tsc --noEmit` — 0.
2. 신규 스모크 스크립트 실행 결과 — 13개 금지 표현 전부 치환 확인 + 중첩 매칭(반영구/평생
   보장) 깨짐 없는지 + 정상 카피 과잉치환 없는지(기대 `replacements: []`) 결과에 명시.
3. `callDeepSeekReviewJson`/DeepSeek 호출 횟수 불변 확인(신규 호출 추가 안 됐는지) — 코드로
   확인. 이번 라운드는 리뷰 파일 처리와 무관하므로 `review-insights.ts`는 건드리지 않습니다.
4. `isElectronicsCategory("전자제품")`만 true, 나머지 6개 카테고리(의류/패션,
   화장품/뷰티, 식품/건강기능식품, 생활용품, 반려동물, 기타) 전부 false인지 게이팅 확인.
5. 카테고리 문자열이 `CreateProductForm.tsx`의 `CATEGORIES` 배열과 정확히 일치하는지
   보고서에 명시(203차 재발 방지 원칙 계속 적용).
6. `reviewCosmeticsCopy`/`reviewFoodCopy` 분기가 기존과 동일하게 동작하는지(회귀 없는지)
   — 최종 삼항 분기 로직을 코드로 확인.

## 하지 않는 것

- `lib/review-insights.ts`는 이번 라운드와 무관 — 손대지 않음(206차는 review-signal
  계열이 아니라 컴플라이언스 계열입니다).
- `lib/types/generate.ts` 수정 불필요 — `mfdsReviewed`/`replacements`가 이미 카테고리
  무관 범용 필드라 타입 변경이 필요 없습니다. 만약 타입 에러가 난다면 브리프의 가정이
  틀린 것이니 임의로 타입을 넓히지 말고 실제 타입 정의를 다시 확인한 후 보고해주세요.
- `components/CreateProductForm.tsx`, `components/HistorySidebar.tsx` 등 UI 컴포넌트
  수정 불필요(둘 다 `mfdsReviewed`/`replacements`를 이미 범용 패스스루로 다루고 있음을
  확인했습니다).
- `lib/cosmetics-compliance.ts`, `lib/food-compliance.ts` 자체는 수정하지 않음(참고용
  템플릿으로만 사용).
- 생성 API 호출 전부 금지(0회 — 프롬프트 텍스트 조립 로직 변경일 뿐, 실제 DeepSeek/Claude
  API를 호출하는 스모크 테스트나 `/api/generate` 실행 금지).

## 완료 보고 형식

3~5줄 요약 + 스모크 테스트 결과(13개 치환 규칙 + 중첩 매칭 검증 + 정상 카피 과잉치환 없음
+ 7개 카테고리 게이팅 결과 포함) + `tsc` 결과 + DeepSeek 호출 횟수 불변 확인 + 카테고리
문자열 대조 확인 + 기존 화장품/식품 분기 회귀 없음 확인.

## 백로그 마스터

완료되면 §1에 한 줄 추가하고 §5(재작업 금지)에도 반영해주세요 — 제가 확인 후 마스터
문서를 갱신하겠습니다(187차 사용법 규칙에 따라 Claude가 갱신). 이번 라운드는
review-signal이 아닌 **컴플라이언스 축의 세 번째 카테고리 확장**이라는 점을 마스터
요약에도 그렇게 기록하겠습니다(식품/화장품에 이어 전자제품 — 생활용품/의류·패션/반려동물은
아직 컴플라이언스 모듈이 없는 상태로 남습니다. 이건 이후 라운드의 후보가 될 수 있습니다).
