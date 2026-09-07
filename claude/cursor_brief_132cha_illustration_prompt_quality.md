# 132차 — 일러스트/아이콘 프롬프트 고급화 (모델 전환 없음, flux-schnell 그대로)

생성: 2026-09-07
전제: 사용자가 "일러스트 쪽도 정말 고퀄리티로 나오게 해달라"고 요청 → 두 갈래 방향(무료 프롬프트 개선 / 유료
고급 모델 A/B) 중 **무료 프롬프트 개선을 먼저** 하기로 결정. 이번 라운드는 **모델을 바꾸지 않고**
(`ICON_MODEL` 기본값 `flux-schnell` 유지) 프롬프트·파라미터만 다듬습니다. seedream-3/qwen-image 전환은
다음 라운드 후보로 남겨두고 이번엔 절대 호출하지 않습니다.

## 0. 배경

Claude(Cowork)가 코드를 확인해보니:

- `lib/concept-icons.ts`(checklist/usage_steps/spec_table/stat_infographic 원형 배지 아이콘)와
  `lib/concept-illustration.ts`(`illustration_banner` 장식 배너) 둘 다 기본 모델이 flux-schnell이고,
  프롬프트가 비교적 짧고 일반적입니다 (`"circular badge icon, flat minimal UI illustration"`,
  `"abstract decorative background art only... soft gradient waves, fluid organic shapes"` 정도).
- `lib/concept-brief.ts`의 DeepSeek 프롬프트도 `icon_style`/`decor_prompt`를 "flat, minimal, single
  motif" 수준으로만 지시하고 있어, 완성도(선 굵기, 그림자, 마감 디테일)에 대한 구체적 가이드가 없습니다.
- 코드에 이미 `ICON_MODEL` env로 `seedream-3`/`qwen-image`(각 6~7배 비쌈)로 A/B 전환하는 장치가 있지만,
  기본값은 계속 flux-schnell입니다. 이번 라운드에서 **그 전환은 건드리지 않습니다.**

## 1. 할 것

### A. `lib/concept-icons.ts` — 아이콘 프롬프트 보강

`generateSingleConceptIcon()`의 prompt 배열에 품질 디스크립터를 추가합니다. 예시(문구는 자유롭게
다듬어도 되지만 아래 취지 유지):

```ts
const prompt = [
  "circular badge icon, flat minimal UI illustration",
  "professional vector icon design, polished modern app icon quality",
  "clean crisp linework, consistent stroke weight, balanced negative space",
  "subtle soft shadow for gentle depth, refined finish, no visual clutter",
  brief.icon_style,
  `motif: ${motif}, concept for "${label.slice(0, 40)}"`,
  `${describeColorTone(iconAccent)} primary color, ${describeColorTone(iconShadow)} subtle shadow`,
  "soft round badge frame, centered symbol, no text, no letters, no watermark",
  "white or very light background, ecommerce detail page icon",
].join(", ");
```

`buildIconModelInput()`의 flux-schnell 분기에서 `output_quality: 85` → `95`로 상향 (PNG 압축 손실을
줄이는 파라미터 조정이며, Replicate flux-schnell 단가는 output_quality와 무관하게 고정이므로 **비용
변화 없음** — 이번 라운드에서 실제로 요금이 그대로인지 `[cost]` 로그로 확인할 것).

### B. `lib/concept-illustration.ts` — 배너 프롬프트 보강

`generateIllustrationBanner()`의 prompt 배열에 유사하게 추가:

```ts
const prompt = [
  "abstract decorative background art only, wide 16:9 landscape",
  "professional editorial illustration, magazine-quality decorative art",
  "sharp focus, refined color grading, subtle gradient mesh",
  "soft gradient waves, fluid organic shapes, single centered motif symbol",
  styleAscii || "flat minimal editorial illustration",
  // ... 이하 기존 그대로 (themeAscii, motif, color palette, empty center, NO_TEXT_LOCK 등)
].join(", ");
```

`NO_TEXT_LOCK`과 "no product photo, no packaging, no human, no face" 등 기존 안전장치는 그대로 유지 —
품질 문구 추가가 이 규칙들을 밀어내지 않도록 배열 앞쪽(스타일 지시) 쪽에 넣고 안전 잠금은 항상 끝에
유지하세요.

### C. `lib/concept-brief.ts` — DeepSeek 프롬프트 지시문 보강 (신규 API 호출 없음)

DeepSeek 호출 자체는 기존과 동일하게 1회만 일어나므로 **신규 비용 없음** — 출력 형식 지시문만 보강합니다.

`icon_style` 출력 가이드 줄(현재: `"icon_style": "영문 — 원형 배지 아이콘 스타일 (flat, minimal, single
motif)"`)을 아래처럼 구체화:

```
"icon_style": "영문 — 원형 배지 아이콘 스타일. flat, minimal, single motif에 더해 선 굵기(line weight)·
그림자 유무·마감 디테일까지 구체적으로 (예: 'thin consistent 2px linework, soft inner shadow, matte
finish, no gradient noise'). 카테고리 톤에 맞는 완성도 있는 디스크립터를 쓸 것"
```

`decor_prompt` 가이드도 비슷하게 "촬영/일러스트 완성도 디스크립터(질감, 빛 방향, 선명도)를 구체적으로"
한 문구만 보강. **JSON 출력 스키마 자체(필드명)는 바꾸지 않습니다** — 지시문 텍스트만 보강.

### D. (선택, 리스크 낮음) `buildIconModelInput` qwen-image 분기 `output_quality`도 동일하게 상향 검토

flux-schnell만 필수, qwen-image/seedream-3는 이번 라운드에서 실제 호출하지 않으니 건드리지 않아도 됩니다
(건드려도 무방하지만 검증 대상은 아님).

## 2. 검증

이번 라운드는 **실제 픽셀 변화**가 목적이므로, 완전히 유료 API 호출 0회로는 검증할 수 없습니다. 다만
**기존과 동일한 모델(flux-schnell)·동일 단가**로만 소량 테스트하세요 — seedream-3/qwen-image 호출 금지,
`num_outputs` 등으로 장당 비용을 늘리는 변경 금지.

1. `TEST_MODE=true` 상태에서 카테고리 2곳(화장품, 전자 등) 각각 아이콘 세트(4타입×1장) + 배너 1장을
   **개선 전/후로 실제 생성**해서 나란히 스크린샷 비교. (총 예상 비용: flux-schnell 기준 대략
   10~20장 × $0.003 = $0.03~0.06 수준 — 기존 TEST_MODE 실행에서 항상 발생하던 것과 같은 단가·같은
   규모입니다.)
2. `[cost] generateConceptIcons` / `[cost] generateIllustrationBanner` 로그에서 **모델명이 여전히
   flux-schnell이고 장당 단가가 $0.003 그대로**인지 원문으로 확인 (모델 전환 없었다는 증거).
3. 개선 전/후 아이콘·배너를 육안으로 비교해 실제로 더 정돈되어 보이는지 (선명도, 마감, 잡음) 스크린샷과
   함께 리포트에 코멘트.
4. `tsc --noEmit` 0.
5. `git diff --stat` — 변경 파일이 `lib/concept-icons.ts`, `lib/concept-illustration.ts`,
   `lib/concept-brief.ts` 범위 내인지 확인.

## 하지 않는 것

- `ICON_MODEL` 기본값을 seedream-3/qwen-image로 변경 (다음 라운드 후보 — 이번엔 승인 대상 아님)
- seedream-3/qwen-image 실제 호출 (테스트 포함 전부 금지)
- `num_outputs` 증가 등으로 호출당 비용을 늘리는 변경
- `icon_style`/`decor_prompt` JSON 스키마(필드명) 변경
- 히어로 배경(`generateBackdrop`)이나 라이프스타일 합성 등 이번 스코프 밖 파이프라인 변경
- `section-templates` 슬롯 순서/종류 변경

## 완료 보고 체크리스트

- [ ] `concept-icons.ts` 아이콘 프롬프트에 품질 디스크립터 추가
- [ ] flux-schnell `output_quality` 85→95 상향, 단가 불변 확인
- [ ] `concept-illustration.ts` 배너 프롬프트에 품질 디스크립터 추가 (NO_TEXT_LOCK 등 안전장치 유지)
- [ ] `concept-brief.ts` DeepSeek 지시문 보강 (스키마 불변)
- [ ] 카테고리 2곳 개선 전/후 아이콘·배너 스크린샷 비교 첨부
- [ ] `[cost]` 로그로 모델·단가 불변 확인 (flux-schnell, $0.003/장)
- [ ] `tsc --noEmit` 원본 출력
- [ ] `git diff --stat` 원본 첨부
