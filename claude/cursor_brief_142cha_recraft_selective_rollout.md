# 142차 — recraft-v3 선별 적용 (illustration_banner + stat_infographic 한정)

생성: 2026-09-08

## 배경

140~141차로 recraft-v3 텍스트 환각 문제는 해결됐습니다 (`style: digital_illustration/hand_drawn_outline`
+ 강화 프롬프트 = 가짜 텍스트 0/5). 하지만 `ICON_MODEL`을 전면 전환하면(체크리스트·사용법·스펙표
아이콘까지 전부 recraft, 장당 $0.04) 페이지당 원가가 화장품 기준 ₩115 → ₩472(약 4.1배)로
뛰어서, 설계 기준 마진(10~15배)이 6배 안팎으로 무너집니다 (`claude/pagzly-recraft-cost-impact-long-2026-09-08.md`
참고).

원가 분석 결론(옵션 A): recraft의 디테일 우위가 실제로 체감되는 곳 — **크게 보이는
`illustration_banner`와 `stat_infographic`만** recraft-v3로 바꾸고, 작게 보여서 디테일 차이가
덜 체감되는 `checklist`/`usage_steps`/`spec_table` 배지는 flux-schnell을 그대로 유지합니다.
이러면 원가 증가폭이 페이지당 최대 $0.15 안팎으로 줄어듭니다(전면 전환 대비 약 1/2~1/3).

## 목표

**`ICON_MODEL` 전역 기본값은 여전히 건드리지 않습니다.** 대신 그룹별로 모델을 분기합니다.

### A. `lib/concept-illustration.ts` (illustration_banner)

- 현재: `const model = getIconModel();` (전역 설정 따름, 기본 flux-schnell)
- 변경: `illustration_banner`는 **항상 recraft-v3**로 고정 (`ICON_MODEL` 값과 무관).
  주석으로 142차 선별 적용 결정 근거를 남기세요.

### B. `lib/concept-icons.ts` (아이콘 4종)

- `generateSingleConceptIcon`이 내부에서 `getIconModel()`을 직접 호출하는 구조를 **모델을
  파라미터로 받는 구조**로 바꾸세요 (호출부에서 그룹별로 다른 모델을 넘길 수 있도록).
- `generateConceptIcons`에서 그룹별 모델을 다음처럼 분기:
  - `statInfographic` → 항상 `"recraft-v3"`
  - `checklist` / `usageSteps` / `specTable` → 기존처럼 `getIconModel()` (기본 flux-schnell,
    `ICON_MODEL` env로 여전히 A/B 가능)
- **배치(runInBatches) 주의**: 지금은 `flat` 배열 전체를 하나의 `concurrency`로 돌립니다.
  그룹별 모델이 섞이면 recraft 항목(동시성 1, 배치 간 11초 대기 필요)과 flux-schnell 항목
  (동시성 6)을 한 배열에 그대로 섞어 돌리면 안 됩니다. **모델별로 flat을 나눠 각자의
  concurrency로 `runInBatches`를 따로 호출**하거나, 동등하게 안전한 다른 방식으로 구현하세요
  — recraft 쪽이 기존 rate-limit 방어(동시성 1 + 배치 간 11초)를 계속 지키는 게 핵심입니다.
- 비용 로그(`[cost] generateConceptIcons ...`)는 항목별로 실제 사용된 모델의 단가가 정확히
  누적되는지 확인하세요 (이미 각 항목이 자기 `model`의 `cost`를 갖고 있으므로 로직상 자동으로
  맞을 겁니다 — 확인만).

### C. style 기본값 업데이트

`RECRAFT_STYLE_DEFAULT`를 141차 결론대로 `"digital_illustration"` → **`"digital_illustration/hand_drawn_outline"`**로
변경하세요. (141차에서 검증된 승자값을 기본값으로 승격 — `RECRAFT_STYLE` env는 여전히 다른
후보 A/B용으로 남겨둠.)

## 검증

- TEST_MODE로 화장품 카테고리 1건 생성 (139차 픽스처 재사용 가능):
  - `illustration_banner`가 실제로 recraft-v3로 생성됐는지 로그(`[concept-illustration]` 또는
    동등 로그)로 확인
  - `stat_infographic` 아이콘이 recraft-v3로, `checklist`/`usage_steps`/`spec_table`은
    flux-schnell로 생성됐는지 로그로 확인 (모델명이 찍히는 로그 라인 기준)
  - 스크린샷: `review/qa-screenshots/142cha-selective-recraft-full.png` — 배너·통계
    인포그래픽·체크리스트 아이콘이 한 페이지에 같이 보이는 구도로
- **실측 원가 로그**: 이번 생성 1건의 실제 비용을 로그에서 뽑아
  `claude/pagzly-recraft-cost-impact-long-2026-09-08.md`의 추정치(선별 적용 시 델타 약
  $0.07~0.15)와 비교해 `review/142cha-report.md`에 실측 vs 추정 표로 기록하세요. 추정이
  크게 빗나갔다면(예: stat_infographic 항목 수가 예상보다 많음) 그것도 그대로 보고하세요 —
  숫자를 맞추려고 조정하지 마세요.
- 가짜 텍스트 재확인: banner + stat_infographic 배지에 141차 방식(육안 카운트)으로 텍스트
  환각이 없는지 한 번 더 확인 (style 기본값이 바뀌었으니 회귀 확인 차원)
- `tsc --noEmit` 1회
- `.env.local`의 `ICON_MODEL`은 이번엔 건드릴 필요 없음 (전역 값 그대로) — 변경했다면 원복

## 하지 않는 것

- `ICON_MODEL` 전역 기본값 전환 금지 — checklist/usage_steps/spec_table은 계속 flux-schnell
- `concept-effects.ts`(물방울/미스트 오버레이), 백드롭, 라이프스타일 파이프라인 변경 금지
- 새로운 환경변수 추가 금지 — 그룹별 모델 분기는 코드 상수/로직으로만 (env 토글 불필요)
- `section-templates.ts` 슬롯 구조 변경 금지
- 요금제/크레딧 단가 변경 금지 — 이건 `pagzly-pricing-cost-model-2026.md` §7에 따라 결제
  시스템 착수 시점에 별도로 재확정할 사안이고 이번 브리프 범위가 아님

## 완료 체크리스트

- [ ] `concept-illustration.ts`: illustration_banner → recraft-v3 고정
- [ ] `concept-icons.ts`: `statInfographic` 그룹만 recraft-v3, 나머지 3그룹은 기존 로직 유지
- [ ] 모델별 배치 분리 (recraft 동시성 1 + 11초 대기 유지, flux-schnell 동시성 6 유지)
- [ ] `RECRAFT_STYLE_DEFAULT` → `digital_illustration/hand_drawn_outline`로 승격
- [ ] TEST_MODE 화장품 1건 생성 + 로그로 그룹별 모델 확인 + 스크린샷
- [ ] 실측 원가 vs 추정 원가 비교표 (`review/142cha-report.md`)
- [ ] 가짜 텍스트 회귀 확인 (banner + stat_infographic)
- [ ] `tsc --noEmit` EXIT_CODE=0
