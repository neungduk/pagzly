# 24차 Cursor 구현 브리프 — 23차 유리컵 합성 재발 (진짜 원인)

## 배경

23차에서 `backdrop-prompt-templates.ts`의 `moisture` 템플릿과 `photo-enhance.ts`의
`sanitizePromptForBria`/`buildBriaBackdropPrompt`를 수정했고, Cursor가 정확히
구현한 것도 코드 diff로 확인했습니다 (`no text`/`no logo` 삭제 줄 제거, 보강 문구
추가, `condensation droplets on glass` → 표면 물방울 표현 교체 — 전부 확인 완료).

**하지만 라이브 E2E로 실제 생성해보니 유리컵 합성 결함이 그대로 재현되었습니다.**
화장품(수분/보습 키워드) 상품으로 2장을 생성했는데 2장 모두 제품이 물이 든 유리컵
안에 들어가 있는 원본 버그와 동일한 결과가 나왔습니다. 코드는 브리프대로
정확히 구현됐는데 왜 안 고쳐졌는지 추적한 결과, **23차 브리프가 건드리지 않은
완전히 별도의 코드 경로가 "유리" 모티프를 재주입하고 있었습니다.**

## 재현 결과 (스크린샷 근거)

- 상품: "글로위스트 드림글로우 카멜리아 에센스 미스트" (화장품/뷰티, 핵심특징에
  "수분/촉촉/보습/물방울" 명시 → `moisture` 포토그래피 템플릿 선택됨,
  실제 배경 이미지 파일명에 `-fx-moisture` 접미사로 확인)
- 생성된 배경 이미지 2장 (`ingredient.png`, `texture.png`, 그리고 비교용
  `compare-before.png`/`compare-after.png`) **전부** 제품이 물이 든 투명
  유리컵/유리잔 안에 놓여 있거나, 사람 손이 유리컵에 담그는 구도로 합성됨.
  원본 사용자 제보 스크린샷(세럼이 물컵 안에 합성된 사진)과 본질적으로 동일한 결함.
- 반면 가짜 UI/텍스트 환각(원인 1)은 이번 3장 모두에서 관찰되지 않음 —
  해당 수정은 정상 작동하는 것으로 보임.
- 제품 라벨("glowiest", "Camellia Essence Mist")은 또렷하게 유지됨 — 회귀 없음.

## 진짜 원인 — `lib/concept-brief.ts` (23차에서 다루지 않은 파일)

`buildBriaBackdropPrompt()`는 `conceptBrief`가 있으면
`formatConceptPromptBlock(conceptBrief, category)`의 결과를 프롬프트에 이어붙입니다
(`photo-enhance.ts:527`). 이 `conceptBrief`는 `/api/generate-backdrop` 라우트에서
**무조건** `generateConceptBrief()`로 생성됩니다 (`app/api/generate-backdrop/route.ts:89`,
레퍼런스 이미지 유무와 무관하게 항상 호출됨). 이번 테스트에서도
`photoCostBreakdown.conceptBrief`가 0이 아닌 실제 DeepSeek 호출 비용으로 찍힌 것으로
실제 LLM 호출이 일어났음을 확인했습니다.

문제는 이 `generateConceptBrief()`의 DeepSeek 프롬프트 자체가 "유리" 모티프를
정답 예시로 가르치고 있다는 것입니다 (`lib/concept-brief.ts`):

```ts
// line 55-65 — 폴백 브리프 (DEEPSEEK_API_KEY 없거나 호출 실패 시 사용)
const FALLBACK_BY_CATEGORY: Record<string, ConceptBrief> = {
  "화장품/뷰티": {
    theme: "수분/물방울",
    motif_keywords: ["물방울", "청량감", "촉촉함", "은은한 빛"],
    mood: "시원하고 맑은",
    backdrop_hint: "soft side lighting, diffused window light, shallow depth of field, condensation droplets on glass, dewy marble sheen, empty hydration studio, no product",
    copy_tone: "촉촉하고 산뜻한 수분 케어 톤. 과장 없이 피부 결에 대한 공감.",
    decor_prompt: "soft side lighting, condensation droplets on glass, dewy surface sheen, no text, no product",
    icon_style: "minimal water droplet and sparkle badge icon, soft circular frame",
  },
};
```

```ts
// line 124-141 — DeepSeek에게 보내는 실제 시스템 프롬프트
"backdrop_hint": "영문 — 촬영 용어로 조명/구도/질감을 구체적으로 (soft side lighting, shallow depth of field, condensation on glass 등). 추상어 moist/luxurious만 쓰지 말 것. product 없음",
...
- 수분/보습 — 물방울, 촉촉, 맑은. 조명: soft side lighting, diffused light. 질감: 유리 결로, 표면 반사광
```

즉 폴백이든 실제 DeepSeek 응답이든, "수분/보습" 테마에 대해 **"유리 위 결로"("condensation on/droplets on glass", "유리 결로")를 정석 표현으로 학습·기본값** 하고 있습니다.
이 문장이 `formatConceptPromptBlock()`을 거쳐 `conceptBlock`으로
`buildBriaBackdropPrompt()`의 최종 프롬프트에 그대로 삽입되고, 23차에서 추가한
`moisture` 템플릿의 "no glass container, no drinking glass, no vessel, no cup"
문구와 **같은 프롬프트 안에서 정면 충돌**합니다. flux-kontext-pro는 이 경우
더 구체적인 "condensation on glass" 쪽을 따라 실제 유리 용기를 그려 넣는 것으로
보입니다.

23차 브리프는 `backdrop-prompt-templates.ts`의 정적 템플릿만 수정했을 뿐,
상품마다 동적으로 생성되는 `concept-brief.ts`의 이 경로는 전혀 건드리지
않았기 때문에 재발한 것입니다.

## 수정 지시사항

### 파일: `lib/concept-brief.ts`

**1) 폴백 브리프 (55-65번째 줄 부근) — "on glass" 제거**

```ts
// 기존
backdrop_hint: "soft side lighting, diffused window light, shallow depth of field, condensation droplets on glass, dewy marble sheen, empty hydration studio, no product",
...
decor_prompt: "soft side lighting, condensation droplets on glass, dewy surface sheen, no text, no product",
```

```ts
// 수정
backdrop_hint: "soft side lighting, diffused window light, shallow depth of field, fine water droplets scattered directly on a soft surface, dewy marble sheen, empty hydration studio, no glass container, no drinking glass, no vessel, no cup, no product",
...
decor_prompt: "soft side lighting, fine water droplets scattered directly on a surface, dewy surface sheen, no glass container, no drinking glass, no vessel, no cup, no text, no product",
```

**2) DeepSeek 시스템 프롬프트 예시 문구 (129번째 줄 부근)**

```ts
// 기존
"backdrop_hint": "영문 — 촬영 용어로 조명/구도/질감을 구체적으로 (soft side lighting, shallow depth of field, condensation on glass 등). 추상어 moist/luxurious만 쓰지 말 것. product 없음",
```

```ts
// 수정
"backdrop_hint": "영문 — 촬영 용어로 조명/구도/질감을 구체적으로 (soft side lighting, shallow depth of field, water droplets on a surface 등). 추상어 moist/luxurious만 쓰지 말 것. 유리컵·유리병 등 액체가 담긴 용기(glass, cup, vessel, drinking glass, jar)는 절대 묘사하지 말 것. product 없음",
```

**3) 카테고리별 가이드 — "유리 결로" 제거 (137번째 줄 부근)**

```ts
// 기존
- 수분/보습 — 물방울, 촉촉, 맑은. 조명: soft side lighting, diffused light. 질감: 유리 결로, 표면 반사광
```

```ts
// 수정
- 수분/보습 — 물방울, 촉촉, 맑은. 조명: soft side lighting, diffused light. 질감: 표면 위 물방울 결로, 표면 반사광 (유리컵·유리병 등 용기는 절대 등장시키지 말 것)
```

**4) (권장) 프롬프트 최하단에 카테고리 공통 금지 문구 명시적으로 추가**

141번째 줄 `backdrop_hint와 decor_prompt는 영문만, 상품·텍스트·로고 없이.` 바로
뒤에 아래 문장을 추가해 모든 카테고리에 대해 한 번 더 강조:

```
어떤 테마든 backdrop_hint/decor_prompt에 유리컵·유리병·잔·비커 등 액체를 담는
용기(glass, cup, jar, vessel, beaker, drinking glass)를 등장시키지 마세요.
```

## 라이브 검증 시 (확대 스크린샷 필수 — 이번에도 반드시)

1. 화장품 + "수분/보습/촉촉" 키워드로 실제 생성 → 배경 이미지 확대 →
   유리컵/유리잔/비커 등 액체 용기가 전혀 없는지 확인 (이번 24차의 핵심 검증 대상)
2. `photoCostBreakdown.conceptBrief`가 0이 아닌지 확인해 실제 DeepSeek 호출
   경로로 재현했는지 검증 (폴백만 테스트하면 이 버그를 놓칠 수 있음)
3. 원인 1(가짜 UI/텍스트)은 이번 라운드에서 정상 확인됨 — 회귀만 재확인
4. 원본 상품 라벨 텍스트 선명도 회귀 확인

## 참고 — 왜 코드가 "정확히 구현"됐는데도 실패했나

23차 검증에서 코드 diff 3곳(sanitizePromptForBria, buildBriaBackdropPrompt,
moisture 템플릿)은 모두 브리프대로 정확히 구현된 것을 확인했습니다. 문제는
브리프 자체가 원인을 완전히 특정하지 못했던 것 — `backdrop-prompt-templates.ts`의
정적 템플릿만 보고 `concept-brief.ts`의 동적 LLM 프롬프트 경로를 놓쳤습니다.
이번처럼 "코드는 브리프대로 맞다"와 "버그가 실제로 고쳐졌다"는 다른 질문이며,
후자는 반드시 라이브 생성 + 확대 육안 검사로만 확인 가능합니다.
