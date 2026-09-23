# 222차 지시서 — 표시광고 컴플라이언스 모듈, 나머지 3개 카테고리(반려동물·패션·생활용품) 확장

## 배경 (Claude 자체 코드 재검토로 발굴)

221차로 §3(미해결·API불필요)이 완전히 비어, 백로그 사용법에 따라 새 축을 코드
재검토로 자체 발굴했습니다. `lib/` 디렉토리를 확인한 결과, 206차가 만든 "AI 생성
카피에서 표시광고법 위반 표현을 서버가 최종 강제 치환" 패턴이 현재 6개 카테고리 중
**3개(화장품/뷰티, 식품, 전자제품)에만 적용**돼 있고, 나머지 3개(반려동물, 의류/패션,
생활용품)엔 없다는 것을 확인했습니다 — `lib/cosmetics-compliance.ts`,
`lib/food-compliance.ts`, `lib/electronics-compliance.ts`는 있지만 대응하는
pet/fashion/living 버전이 없습니다.

특히 **반려동물 카테고리는 우선순위가 높습니다** — 사료·용품 광고에서 "질병 예방",
"치료 효과", "수의사 추천" 같은 표현은 동물용 사료/의약외품 관련 법령상 더 민감한
과장광고 리스크입니다. 의류·생활용품도 "평생 보증", "완전 무독성" 같은 검증 불가능한
절대적 표현 리스크가 있습니다.

이 패턴은 이미 3라운드(160차대 화장품, 208차대 식품, 206차 전자제품 — 정확한 최초
도입 차수는 각 파일 참고)에 걸쳐 검증된 구조라 위험이 낮습니다: **AI가 생성한 문구를
서버가 최종적으로 정규식 치환**하는 방식이라 DeepSeek 프롬프트 가이드는 예방 차원이고,
실제 강제력은 정규식 치환에서 나옵니다.

## 요청 사항 — 3개 신규 파일 (구조는 `lib/electronics-compliance.ts`를 그대로 복사해 카테고리만 교체)

### 1. `lib/pet-compliance.ts`

```ts
export const PET_CATEGORY = "반려동물";

export const PET_AI_PROMPT = `반려동물 용품/사료 광고 문구 작성 시 표시광고법과 사료관리법
기준을 준수해야 합니다. 질병 예방·치료 효과를 확정적으로 주장하거나 수의학적 근거 없이
의약품 수준의 효능을 암시하는 표현은 절대 사용하지 마세요.
대신 '건강한 습관 형성에 도움', '영양 균형 설계' 등 사실 기반 표현을 사용하세요.

금지 표현 예시: 질병 예방, 질병 치료, 치료 효과, 완치, 수의사 추천, 수의사 승인,
부작용 없음, 100% 안전, 평생 건강 보장, 모든 질환에 효과, 약효, 의약품 수준`;
```

정규식 치환 규칙 예시(순서 주의 — 긴 표현이 짧은 표현의 부분문자열을 먼저 잡아먹지
않도록 220차 이전 라운드들처럼 구체적인 표현을 먼저 배치):

| 원문 | 치환 |
|------|------|
| 질병\s*예방 | 건강 관리에 도움 |
| 질병\s*치료, 치료\s*효과 | 컨디션 관리 지원 |
| 완치 | 컨디션 개선 |
| 수의사\s*추천, 수의사\s*승인 | (판매자 확인 필요 시에만 유지 — 미확인이면) 반려인들의 선택 |
| 부작용\s*없음 | 안전 기준 준수 |
| 100%\s*안전 | 높은 안전성 |
| 평생\s*건강\s*보장 | 건강 관리 지원 |
| 모든\s*질환에\s*효과 | 다양한 상황에 도움 |
| 약효 | 기능성 |
| 의약품\s*수준 | 전문적인 관리 수준 |

### 2. `lib/fashion-compliance.ts`

```ts
export const FASHION_CATEGORY = "의류/패션";
```

(정확한 카테고리 문자열은 203/204차 교훈대로 `components/CreateProductForm.tsx`의
`CATEGORIES` 배열에서 반드시 재확인 — 204차 확인으로는 `"의류/패션"`이 맞습니다.)

금지 표현 예시: 영구 변형 없음, 완전 탈색 방지, 평생 보증, 평생 무료 수선,
100% 국내산 원단(미확인 시), 절대 줄어들지 않음, 완벽한 핏

| 원문 | 치환 |
|------|------|
| 영구\s*변형\s*없음 | 우수한 형태 유지력 |
| 완전\s*탈색\s*방지 | 우수한 색상 지속력 |
| 평생\s*보증 | 품질 보증 지원 |
| 평생\s*무료\s*수선 | 애프터서비스 지원 |
| 절대\s*줄어들지\s*않음 | 수축 방지 가공 |
| 완벽한\s*핏 | 편안한 핏 |

### 3. `lib/living-compliance.ts`

```ts
export const LIVING_CATEGORY = "생활용품";
```

(카테고리 문자열도 동일하게 `CATEGORIES` 배열에서 재확인 필요.)

금지 표현 예시: 완전 무독성, 환경호르몬 전혀 없음, 100% 항균, 완벽 항균,
평생 보장, 반영구, 친환경 인증(실제 인증 정보 없으면)

| 원문 | 치환 |
|------|------|
| 완전\s*무독성 | 안전 기준을 준수한 소재 |
| 환경호르몬\s*전혀\s*없음 | 환경호르몬 안전 기준 준수 |
| 100%\s*항균, 완벽\s*항균 | 항균 처리 |
| 평생\s*보장 | 품질 보증 지원 |
| 반영구적? | 장기간 |

## 배선 (`app/api/generate/route.ts`) — 206차와 완전히 동일한 3곳

1. import 3개 추가 (기존 electronics import 바로 아래 패턴 그대로).
2. `generateCopyWithDeepSeek()` 함수 내부에 `petGuide`/`fashionGuide`/`livingGuide`
   3개 변수 추가, 기존 `electronicsGuide`와 동일한 조건부 문자열 생성 후 프롬프트에 삽입.
3. 최종 검수 분기(1487~1496행 근처)를 3-way(cosmetics/food/electronics) →
   **6-way**로 확장:
   ```ts
   const isPetCopy = isPetCategory(body.category);
   const isFashionCopy = isFashionCategory(body.category);
   const isLivingCopy = isLivingCategory(body.category);
   const finalCopy = isCosmeticsCopy
     ? reviewCosmeticsCopy(copyToSave)
     : isFoodCopy
       ? reviewFoodCopy(copyToSave)
       : isElectronicsCopy
         ? reviewElectronicsCopy(copyToSave)
         : isPetCopy
           ? reviewPetCopy(copyToSave)
           : isFashionCopy
             ? reviewFashionCopy(copyToSave)
             : isLivingCopy
               ? reviewLivingCopy(copyToSave)
               : null;
   ```
4. `mfdsReviewed`/`replacements` 필드는 이미 카테고리 무관 범용 타입이라 타입
   파일·UI 컴포넌트 수정 불필요(206차와 동일).

## 검증 방법 (API 0)

- 브리프 작성 시 Claude가 정규식 13개 이상을 Node 샌드박스에서 먼저 시뮬레이션해
  "반영구적으로" 같은 단어 잘림 버그가 없는지 확인했던 206차 방식을 그대로 따라,
  3개 파일의 정규식 전부를 별도 스크립트(`scripts/222cha-pet-fashion-living-compliance-verify.ts`)로
  검증해주세요 — 각 카테고리 5개 이상 hit 케이스 + 중첩 매칭 방지 확인 + cosmetics/food/
  electronics 분기 회귀 없음.
- `tsc` 0, DeepSeek 신규 호출 0, API 0.
- `review/222cha-report.md`에 정규식 표·검증 결과 기록.

## 주의

- 위 표의 치환 문구는 제안입니다 — 더 자연스럽거나 법적으로 더 안전한 대안이 있다면
  Cursor 판단으로 조정 가능하나, "확정적 절대 표현을 완화된 사실 기반 표현으로
  치환"한다는 원칙은 유지해주세요.
- 반려동물 카테고리의 "수의사 추천/승인"은 실제로 판매자가 수의사 검증을 받은 경우도
  있을 수 있어 완전 삭제보다는 신중한 완화 표현으로 치환하는 쪽으로(위 표 참고).
- 기존 cosmetics/food/electronics 분기·정규식은 전혀 건드리지 않습니다.
