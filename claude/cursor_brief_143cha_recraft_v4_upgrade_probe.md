# 143차 — recraft-v4/v4-svg + flux-dev 업그레이드 탐색 (전면 시장 재조사)

생성: 2026-09-08

## 배경 — 재조사 결과

"가성비 있으면서 퀄리티 좋은 API"를 다시 폭넓게 찾아봤습니다. 결론부터: **recraft 계열을
쓰는 방향 자체는 맞았습니다** (독립 3rd-party 가이드 apiscout.dev가 Flux/Ideogram/Recraft를
비교하며 "Recraft ranks #1 particularly logos, icons, design assets"로 명시). 다만 140차
조사 시점엔 없었거나 놓쳤던 **더 나은 버전이 나와 있었습니다**:

| 모델 | 출력 | 가격(추정, Replicate 공식 블로그 기준 — **아래 검증 필요**) | 비고 |
|---|---|---|---|
| recraft-v3 (현재 142차 적용값) | 래스터 | $0.04 | hand_drawn_outline + 무타이포 절로 0/5 달성 |
| **recraft-v4** | 래스터 | **$0.04 (동일가)** | Replicate 공식 블로그: "text as first-class element" — v3보다 타이포 처리 개선 주장 |
| **recraft-v4-svg** | **진짜 벡터(SVG)** | **$0.08 (추정)** | 래스터가 아니라 실제 SVG 패스 출력 — 구조적으로 가짜 텍스트/글리프 노이즈 카테고리 자체가 줄어들 가능성 (배지 아이콘엔 이상적인 포맷) |
| recraft-v4-pro-svg | SVG 고해상 | $0.30 (추정) | 너무 비쌈 — 이번 라운드 대상 아님 |
| flux-dev | 래스터 | $0.025 | flux-schnell(현재 3그룹 기본)보다 8배 비싸지만 recraft보다 훨씬 쌈. distilled 아닌 풀모델이라 프롬프트 충실도 개선 |

**중요**: 위 v4 계열 가격은 Replicate 공식 블로그 글에서만 확인했고, 공식 pricing 페이지·
모델 스키마 페이지에서는 재확인이 안 됐습니다(가격 위젯이 JS 렌더링이라 크롤링에 안 잡힘).
**실제 착수 전 Replicate 대시보드/스키마에서 직접 재확인 필수** — 140차 때와 동일한 원칙
(추측 금지)입니다.

## 목표

**두 갈래로 탐색, 둘 다 소규모 A/B만 — 기본값 전환은 이번에도 안 함:**

### A. recraft-v4 / recraft-v4-svg vs 현재 recraft-v3 (stat_infographic + illustration_banner 슬롯)

1. Replicate 대시보드에서 `recraft-ai/recraft-v4`와 `recraft-ai/recraft-v4-svg`의 실제
   가격과 input 스키마를 확인 (140차처럼 OpenAPI 또는 모델 페이지 직접 확인, 캡처 저장).
2. 같은 라벨 세트로 3-way 비교: 현재(v3+hand_drawn_outline) vs v4(래스터) vs v4-svg.
   - v4-svg는 출력이 SVG 파일일 가능성이 높음 — 렌더러가 SVG를 아이콘 이미지로 그대로
     쓸 수 있는지(`<img>` src로 SVG 넣기, 또는 PNG 변환 필요 여부) 확인하고 필요하면 변환
     단계 추가.
3. 가짜 텍스트 육안 카운트 (141차 기준과 동일 방식), 디테일/선명도 비교.
4. **v4가 v3와 동일 가격인데 품질이 같거나 낫다면 즉시 v4로 교체 권장** (원가 영향 0).
   v4-svg는 비용이 2배($0.08)라 품질 차이가 확연할 때만 고려.

### B. flux-dev vs flux-schnell (checklist / usage_steps / spec_table 슬롯)

1. `black-forest-labs/flux-dev`의 실제 스키마 확인 (schnell과 파라미터가 다를 수 있음 —
   `num_inference_steps` 등 존재 여부 확인).
2. 같은 라벨로 flux-dev 1~2장 vs flux-schnell 비교, 디테일·글리프 노이즈 차이 육안 확인.
3. 이건 원가가 8배(₩4→₩34원 수준, 매우 작은 절대값)라 품질이 조금이라도 낫다면 바로
   전환해도 마진에 미치는 영향이 미미합니다(장당 $0.022 차이 × 3장 ≈ +$0.066/페이지) —
   결정 부담이 A보다 훨씬 낮은 항목입니다.

## 검증

- `review/qa-screenshots/143cha-recraft-v4-compare.png` (v3 vs v4 vs v4-svg 보드)
- `review/qa-screenshots/143cha-flux-dev-compare.png` (schnell vs flux-dev 보드)
- 가짜 텍스트 육안 카운트표 (각 세트)
- 실제 스키마 확인 캡처: `review/143cha-recraft-v4-schema.json`, `review/143cha-recraft-v4-svg-schema.json`, `review/143cha-flux-dev-schema.json`
- 비용 로그 (장당 실제 청구액이 추정치와 맞는지)
- `tsc --noEmit` 1회
- **이번에도 기본값/그룹별 모델 배선은 전환하지 않음** — A/B 결과만 리포트, 다음 라운드에서
  결정

## 하지 않는 것

- `ICON_MODEL` 전역 기본값, 142차의 그룹별 배선(statInfographic/banner=recraft) 변경 금지
  — 이번엔 v3 자리에 v4를 바로 끼워넣지 말고 **비교만**
- 스키마 추측 금지 — recraft-v4/v4-svg/flux-dev 전부 실제 확인 후 구현
- v4-pro / v4-pro-svg(고가) 사용 금지 — 이번 범위 아님
- `concept-effects.ts`, 백드롭, 라이프스타일 파이프라인 변경 금지
- `section-templates.ts` 슬롯 구조 변경 금지

## 완료 체크리스트

- [ ] recraft-v4 / recraft-v4-svg 실제 가격·스키마 확인 (추측 금지)
- [ ] flux-dev 실제 스키마 확인
- [ ] 3-way 비교 (v3 vs v4 vs v4-svg) — stat_infographic + banner
- [ ] 2-way 비교 (schnell vs flux-dev) — checklist/usage_steps/spec_table 대표 1~2장
- [ ] 가짜 텍스트 육안 카운트 + 디테일 비교 스크린샷
- [ ] SVG 출력이면 렌더링 방식(직접 삽입 vs PNG 변환) 확인 및 필요시 처리
- [ ] 실측 비용 vs 추정 비교
- [ ] `tsc --noEmit` EXIT_CODE=0
- [ ] 기본값/배선 미변경 확인
