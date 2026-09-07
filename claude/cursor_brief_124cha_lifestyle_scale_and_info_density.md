# 124차 — 라이프스타일 합성 사이즈 정합(실제 경로) + 정보 섹션 밀도 강화 (후커블 벤치마크)

생성: 2026-09-07
전제: `TEST_MODE=true` 유지. 코드/구조 변경과 무비용 검증은 이번 브리프 범위 안에서 바로 진행. **실사진 라이프스타일 합성의 유료 라이브 재검증(Replicate 호출)은 절대 승인 없이 하지 마세요** — 코드 배선을 끝낸 뒤 저에게 물어봐주세요.

## 0. 배경

사용자가 실제로 사용해본 라이프스타일 합성 기능(사람 등장 + 제품 합성)에 대해 직접 피드백을 줬습니다: "사람도 나오고 합성도 하긴 하지만 사이즈가 너무 크게 다르다던가 인포 부분 쪽도 너무 부족해." 동시에 같은 상품(글로위스트 드림글로우 카멜리아 에센스 미스트, id `a4e33e41-2348-40b6-b6b8-2536ce17ac3e`)을 후커블 실제 산출물과 나란히 비교했습니다.

제가 코드를 직접 추적해서 두 문제 모두 구체적인 원인을 이미 찾았습니다. 아래 파일·라인 기준으로 수정해주세요.

---

## Track A — 라이프스타일 합성 사이즈 (근본 원인 확인됨)

### A-0. 원인

`lib/lifestyle-physical-scale.ts`(111차)가 손 너비 기준 물리 스케일 보정(`applyPhysicalScaleToPlacement`, `ADULT_HAND_WIDTH_CM=8.5` 기준)을 만들어뒀고, `lib/lifestyle-product-composite.ts`의 `compositeProductOnLifestylePhoto()`(857~888행)는 **`productHeightCm`가 파라미터로 전달될 때만** 이 보정을 적용합니다. 실패하거나(`applyPhysicalScaleToPlacement` → null) `requirePixelPaste`가 false면 그냥 raw Vision placement로 진행합니다(872~887행).

그런데 사용자가 실제로 쓰는 메인 경로가 바로 이 `requirePixelPaste`가 false인 쪽입니다:

- `lib/photo-pipeline-client.ts`의 `runPhotoEnhancementPipeline()`(618~636행)이 `params.lifestyleImageUrl`이 있을 때 `/api/lifestyle-composite`를 호출하는데, 요청 바디에 `productHeightCm`가 아예 없습니다(629~635행).
- `app/api/lifestyle-composite/route.ts`도 요청 바디 타입(24~29행)에 이 필드가 없고, `compositeProductOnLifestylePhoto()` 호출(56~61행)에서 `productHeightCm`/`requirePixelPaste` 둘 다 넘기지 않습니다.

즉 111차가 만든 물리 스케일 보정은 **사용자가 실제로 쓰는 이 경로를 한 번도 타지 않습니다.** 이 경로는 Vision이 준 raw bounding box 크기를 그대로 붙이는데, 87차 조사에서 이미 "Vision의 크기 자기 신고는 반복적으로 신뢰할 수 없다"가 확인된 바로 그 값입니다. `requirePixelPaste`도 false라 크기가 이상해도 그대로 붙습니다. "사이즈가 너무 크게 다르다"는 정확히 이 경로에서 예견 가능한 결과입니다. (112차 실측 테스트는 이 메인 경로가 아니라 111차의 별도 "AI 사용샷" 실험 경로를 검증한 것이라 이 버그를 못 잡았습니다.)

### A-1. 수정 — 물리 스케일 보정을 실제 경로에 연결

1. `productHeightCm`(또는 파싱 가능한 사이즈 힌트 문자열, `parseProductHeightCm()` 재사용)을 실제 파이프라인 끝까지 threading 해주세요:
   - `runPhotoEnhancementPipeline()` 파라미터에 사이즈 힌트를 추가(이름은 자유 — 예: `productSizeHint?: string | null`). **먼저 상품 등록 폼/스펙 데이터에 이미 실측 치수(cm)를 얻을 수 있는 필드가 있는지부터 확인**하고, 있으면 그걸 쓰고 없으면 새 필드를 억지로 만들지 마세요.
   - `/api/lifestyle-composite` 요청 바디에 `productHeightCm?: number | null` 추가, `route.ts`에서 그대로 `compositeProductOnLifestylePhoto()`에 전달.
   - **이 경로에도 `requirePixelPaste: true`를 적용**해서, 사이즈를 못 구하거나 스케일 계산이 거부되면 합성을 생략(원본 라이프스타일 사진 그대로, `composited:false`)하도록 하세요. "이상한 크기로 억지로 붙이느니 안 붙이는 게 낫다"가 원칙입니다.

2. 사이즈 힌트를 구할 수 없는 경우(실제로는 이쪽이 다수일 수 있습니다)의 폴백 전략을 직접 판단해서 근거와 함께 보고해주세요:
   - **(옵션 1, 제 의견)** 힌트가 없으면 합성 자체를 생략 — 안전하지만 발동률은 낮아짐.
   - (옵션 2) 카테고리별 대표 크기를 근사치로 사용 — 발동률은 높아지지만 "지어내기 금지" 원칙과 충돌 소지, 고지 문구를 더 명확히 해야 함.
   - 기존 원칙(지어내기 금지, 안전 우선, rubbing 오탐 0% 유지해온 12라운드 이력)에 더 맞는 쪽을 골라주세요.

### A-2. 검증 (무비용만)

- 기존 `111cha-physical-scale-smoke` 스모크 테스트 회귀 확인.
- 새 threading 경로에 대한 단위/통합 테스트 추가 — `productHeightCm` 있음/없음 두 케이스, `requirePixelPaste` 동작(스케일 실패 시 원본 반환) 모두 mock으로 확인.
- **유료 라이브 재검증(실제 사진으로 사이즈가 실제로 맞게 나오는지)은 이번 브리프에서 승인 없이 실행하지 마세요.** 코드 배선을 마친 뒤 "실사진 1회 검증해도 될까요?"로 저에게 먼저 물어봐주세요(110~112차처럼 소액이라도 승인 절차 유지).

---

## Track B — 정보 섹션 밀도 (후커블 벤치마크)

### B-0. 근거 — 후커블 실제 산출물 직접 확인

제가 hookable.ai에서 직접 확인한 실제 산출물(BIO SPRAY, 구강스프레이) 하나의 정보 섹션 구성:

- 성분 배지 원형 8개를 격자로 배치, 위험 성분엔 사선 취소선(파라벤·알코올·합성착색료·벤조피렌 등)
- 그 옆에 "안정성 / 효과 / 자극감" 3축 막대 비교 차트(자사 vs 일반 제품)
- "1000명 고객 리뷰에서 뽑은 문장" 같은 근거 카피 + 고객 후기 인용

이 세 요소가 **한 화면(섹션) 안에 같이** 배치돼서 정보 밀도가 높아 보입니다.

같은 상품군인 팩즐리 실제 산출물(위 id)을 직접 열어봤는데, `comparison_chart` 섹션(코드는 이미 있음 — `lib/types/generate.ts`의 `ComparisonChartSection`, `DetailSectionRenderer.tsx` 1733행 렌더 분기, `ComparisonMetricRow`)이 이 상품엔 아예 생성되지 않았습니다. `lib/section-templates.ts`에도 `comparison_chart`가 `required: false`로만 있고("근거·추정 둘 다 불가하면 슬롯 생략" 노트), 성분 서클(`circle-solo`/`circle-pair`, 69차)도 완전히 별개의 독립 섹션이라 서로 떨어져 렌더링됩니다.

즉 컴포넌트 자체는 이미 있는데 (1) 실제 선택 빈도가 낮고 (2) 서로 흩어져 있어서, 후커블처럼 "한 화면에 정보가 몰린" 느낌이 안 납니다. 새로 뭘 만들기보다 **이미 있는 걸 더 잘 쓰는 문제**에 가깝습니다.

### B-1. 수정

1. **선택 빈도 진단부터**: 최근 실제 생성된 상품 10~20개(DB `products.sections` jsonb, 또는 QA 픽스처)를 대상으로 `comparison_chart`, `circle-solo`/`circle-pair` 섹션이 실제로 얼마나 자주 포함되는지 집계해주세요(SQL 한 방으로 가능). 왜 낮은지(AI가 self_assessed 근거조차 안 만드는지, 프롬프트 유도가 약한지) 원인도 같이 보고해주세요.
2. **화장품/뷰티 카테고리 한정으로**, `ingredients` 필드가 존재하면 `comparison_chart`(self_assessed 허용 범위 내)를 더 적극적으로 유도하도록 `lib/section-templates.ts`의 note 문구를 보강해주세요. **수치 지어내기 금지 원칙은 절대 불변** — self_assessed일 때 서버가 강제 주입하는 디스클레이머가 화면에 실제로 잘 보이는지도 확인해주세요.
3. **(선택, 스코프 크면 125차로 분리 제안 가능)** 성분 서클 + 비교 차트를 한 섹션에 묶는 레이아웃 옵션 검토: `ComparisonChartSection`에 선택적 필드(예: `ingredientBadges?: { imageUrl: string; label: string; avoided: boolean }[]`)를 추가해서, 존재하면 차트 위/옆에 작은 원형 배지 행을 같이 렌더링 — 후커블처럼 한 화면에 정보가 몰리게. 기존 `circle-solo`/`circle-pair` 단독 섹션은 그대로 유지(회귀 없음), 이건 추가 옵션입니다.
4. 3번이 이번 라운드 범위를 넘는다고 판단되면, 1·2번만 먼저 완료하고 3번은 "125차 후보"로 남겨서 보고해주세요. 무리하게 다 하려다 품질이 떨어지는 것보다 낫습니다.

### B-2. 검증 (무비용)

- 성분 0/1/2개 각 케이스 회귀 없음 재확인(69차 체크리스트 재사용).
- `comparison_chart` self_assessed 디스클레이머 렌더 확인 스크린샷.
- 진단 집계 결과 표로 보고.

---

## 하지 않는 것

- 수치·성분·인증 지어내기 (절대 불변 원칙)
- Track A 유료 라이브 합성 재검증을 승인 없이 실행하는 것
- 118~123차에서 다룬 QA 픽스처 스코어링 / 작업내역 히스토리뷰 버그 재작업(이미 해결됨, 무관)

## 완료 보고 체크리스트

- [ ] Track A: `productHeightCm`/사이즈 힌트가 실제 경로(`runPhotoEnhancementPipeline` → `/api/lifestyle-composite` → `compositeProductOnLifestylePhoto`)까지 연결됨
- [ ] Track A: `requirePixelPaste: true` 적용 — 스케일 실패 시 원본 반환(안 붙임) 동작 확인
- [ ] Track A: 힌트 없을 때 폴백 전략(옵션 1/2 중 선택) 근거와 함께 보고
- [ ] Track A: 무비용 스모크/단위 테스트 통과 — 유료 검증은 승인 요청만 하고 실행 안 함
- [ ] Track B: 최근 상품 `comparison_chart`/성분서클 포함률 집계 및 원인 분석
- [ ] Track B: 화장품/뷰티 `comparison_chart` 유도 강화 (지어내기 금지 유지, 디스클레이머 노출 확인)
- [ ] Track B: (선택) 통합 레이아웃 옵션 — 범위 판단 후 진행 또는 다음 라운드로 이월 명시
- [ ] `npx tsc --noEmit` 0건
- [ ] 유료 API 호출 0회 (승인 요청 별도)
