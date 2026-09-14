# 140차 — 인포 비주얼(아이콘·일러스트 배너) 모델 A/B 업그레이드 (flux-schnell → recraft-v3)

생성: 2026-09-08

## 배경

사용자 요청: "인포나 사진합성이 딸리는 느낌인데 Replicate에서 인포/이미지 쪽 싸고 기능 좋은
API 찾아봐, 금액은 조금 올라가도 됨."

코드를 직접 읽어 현재 구조를 확인했습니다(원본: `lib/image-router/router.ts`,
`lib/image-router/routing/premium-routing.ts`, `lib/concept-icons.ts`,
`lib/concept-illustration.ts`, `lib/concept-effects.ts`, `lib/photo-enhance.ts`,
`lib/generate-lifestyle-shots.ts`).

**결론: "사진합성"은 이미 두 경로 다 프리미엄급이라 원인이 아닙니다.**
- 배경(백드롭) 교체: `.env.local`의 `BACKDROP_PROVIDER=flux-kontext-pro` — 이미 프리미엄
  (`black-forest-labs/flux-kontext-pro`, $0.04/장 × 2후보 = $0.08). 실제 최근 생성 1건의
  로그 비용($0.3597 중 배경 $0.0800)과도 정확히 일치합니다.
- 라이프스타일 합성: `lib/generate-lifestyle-shots.ts`가 `image-router`(신규 라우터,
  `flux-2-pro` / `gemini-3-pro-image`)를 통해 생성 — 이것도 프리미엄 모델입니다.

**원인은 "인포" 쪽입니다.** 아래 세 곳이 전부 `flux-schnell`(Black Forest Labs의
최저가·최속·distilled 티어, $0.003/장)로 고정되어 있습니다:
- `lib/concept-icons.ts` — checklist/usage_steps/spec_table/stat_infographic 원형 배지
  아이콘 (`ICON_MODEL` env로 seedream-3/qwen-image A/B 가능하지만 기본값이 schnell)
- `lib/concept-illustration.ts` — illustration_banner 장식 배너 (concept-icons와 동일 모델)
- `lib/concept-effects.ts` — 물방울/미스트 등 상품 사진 위 오버레이 (schnell 고정, env 토글 없음)

flux-schnell은 원래 "빠르고 싸게 초안을 뽑는" 용도로 설계된 distilled 모델이라
프롬프트 충실도·디테일이 낮습니다. 아이콘·배너는 브랜드 디테일 페이지에서 계속
눈에 띄는 요소라, 여기서 체감 품질 차이가 가장 크게 납니다.

## 조사 (Replicate, 2026-09-08 기준 공식 pricing 페이지 확인)

| 모델 | 가격/장 | 비고 |
|---|---|---|
| flux-schnell (현재) | $0.003 | distilled, 최저 품질 |
| flux-dev | $0.025 | 같은 Flux 계열, 8배지만 훨씬 안정적 |
| **recraft-v3** | **$0.04** | **벡터/아이콘 네이티브 모델, 텍스트 렌더링 정확, 브랜드 스타일 일관성** — checklist/spec_table 배지 아이콘 용도에 정확히 맞음 |
| ideogram-v3-turbo | $0.03 | 텍스트 포함 그래픽 디자인에 강점, 대안 후보 |
| ideogram-v3-quality | $0.09 | 최고 품질이지만 배지 아이콘엔 과함 |

**추천: recraft-v3.** Flux 계열은 사실적 사진 생성에 최적화된 모델이라 "플랫 아이콘·벡터
배지"를 억지로 흉내내는 반면, recraft-v3는 애초에 벡터/아이콘/브랜드 디자인 용도로
나온 모델입니다 — 지금 하는 일(아이콘 배지, 장식 배너)과 용도가 정확히 일치합니다.
가격은 13배지만 절대값은 여전히 저렴합니다($0.003 → $0.04/장).

**주의**: recraft-v3의 정확한 입력 스키마(파라미터명 — `prompt` 외 `style`/`size`/
`style_id` 등)는 이 브리프에서 확정하지 않았습니다. 기존 코드 관례대로
(`concept-icons.ts`의 모델별 `buildIconModelInput` 분기처럼) Replicate 대시보드나
`replicate.models.get()`으로 실제 스키마를 먼저 확인한 뒤 구현하세요 — 파라미터명을
추측해서 넣지 마세요.

## 이번 라운드 목표 (A/B 비교만, 기본값 전환 아님)

이번 라운드는 **`ICON_MODEL` 기본값을 바꾸지 않습니다.** 비용이 13배 뛰는 변경이라
실제 눈으로 비교하기 전에는 커밋하지 않는 게 맞습니다.

1. `lib/concept-icons.ts`에 `"recraft-v3"`를 새 `IconModelKey`로 추가:
   - `ICON_MODEL_REF["recraft-v3"] = "recraft-ai/recraft-v3"`
   - `ICON_COST_USD_BY_MODEL["recraft-v3"] = 0.04`
   - `buildIconModelInput`에 recraft-v3 분기 추가 (스키마 확인 후 구현)
   - `getIconModel()`이 `"recraft-v3"`도 인식하도록 확장
2. `.env.local`에 `ICON_MODEL=recraft-v3`로 임시 설정하고 TEST_MODE에서 아이콘 세트를
   1회 생성 (`checklist`/`usage_steps`/`spec_table`/`stat_infographic` 각 최소 1장).
   같은 라벨/프롬프트로 기존 flux-schnell 세트와 나란히 스크린샷 비교.
3. `lib/concept-illustration.ts`는 `concept-icons.ts`의 모델 설정을 그대로 재사용하므로
   illustration_banner 1장도 같은 비교에 포함.
4. `lib/concept-effects.ts`(물방울/미스트 오버레이)는 이번 라운드 대상에서 **제외** —
   저투명도(0.14~0.22) 블렌드라 모델 품질보다 합성 방식이 결과를 더 좌우하고, 28차
   "유령 사각형" 버그 회귀 리스크가 있는 코드라 이번엔 건드리지 않습니다.
5. 비교 후 `.env.local`의 `ICON_MODEL`을 원래 값(flux-schnell 폴백)으로 되돌려
   **기본 흐름에 영향 없이** 종료 — 다음 라운드에서 사용자가 결과를 보고 기본값
   전환 여부를 결정합니다.

## 검증

- 스크린샷: `review/qa-screenshots/140cha-icon-model-ab-{schnell|recraft}.png` (동일
  라벨 세트로 나란히 비교 가능하게)
- 로그에서 실제 호출 비용 확인: recraft-v3 세트가 `$0.04 × 장수`로 찍히는지
- `tsc --noEmit` 1회
- 비교 종료 후 `ICON_MODEL` 원복 확인 (`.env.local` diff로)
- 신규 유료 호출은 이번 A/B 비교분(아이콘 세트 1회, 소량)으로 한정 — 대량 배치 생성 금지

## 하지 않는 것

- `ICON_MODEL` 기본값 변경 금지 — 이번은 비교용 임시 설정, 라운드 종료 시 원복
- `BACKDROP_PROVIDER`, `lib/generate-lifestyle-shots.ts`(image-router) 변경 금지 — 이미
  프리미엄 모델이라 이번 라운드 대상 아님
- `lib/concept-effects.ts` 변경 금지 — 위 사유
- recraft-v3 입력 파라미터명 추측 금지 — 반드시 실제 스키마 확인 후 구현
- `section-templates.ts` 슬롯 구조 변경 금지
- 대량/반복 유료 API 호출 금지 — 비교에 필요한 최소 수량만

## 완료 체크리스트

- [ ] `IconModelKey`에 `"recraft-v3"` 추가 (ref/cost/input 분기)
- [ ] recraft-v3 실제 입력 스키마 확인 후 구현 (추측 금지)
- [ ] `ICON_MODEL=recraft-v3`로 TEST_MODE 아이콘·배너 세트 1회 생성 + 스크린샷
- [ ] 기존 flux-schnell 세트와 나란히 비교 스크린샷
- [ ] 비교 후 `.env.local` `ICON_MODEL` 원복
- [ ] `tsc --noEmit` EXIT_CODE=0
- [ ] `review/140cha-report.md`에 두 모델 비교 결과 + 실제 비용 로그 기록
