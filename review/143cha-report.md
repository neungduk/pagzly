# 143차 — recraft-v4 / v4-svg + flux-dev 탐색 A/B 보고

생성: 2026-09-08  
범위: **비교·스키마 확인만**. 142차 그룹 배선 / `ICON_MODEL` 기본값 **미변경**.

## 1. 스키마·가격 (추측 금지 — 실측)

| 모델 | OpenAPI Input (실측) | Replicate UI 단가 | 산출물 |
|------|----------------------|-------------------|--------|
| `recraft-ai/recraft-v4` | `prompt`, `aspect_ratio`, `size` — **style 없음** | **$0.04**/image | URI 래스터 |
| `recraft-ai/recraft-v4-svg` | 동일 (style 없음) | **$0.08**/image | URI **SVG** (`image/svg+xml`) |
| `black-forest-labs/flux-dev` | `prompt`, `aspect_ratio`, `num_outputs`, `output_format`, **`num_inference_steps`**(default 28), `go_fast`, `guidance`, `megapixels`, … | **$0.025**/image | URI 배열 |

스키마 파일:
- `review/143cha-recraft-v4-schema.json`
- `review/143cha-recraft-v4-svg-schema.json`
- `review/143cha-flux-dev-schema.json`
- `review/143cha-replicate-prices.json` (UI 배지 확인)

참고: v4는 v3의 `style: digital_illustration/hand_drawn_outline`를 **파라미터로 줄 수 없음** → outline/무타이포는 **프롬프트에만** 실어 비교함.

## 2. A — recraft 3-way (stat + banner)

보드: `review/qa-screenshots/143cha-recraft-v4-compare.png`

### 가짜 텍스트 육안 (이미지당 유무)

| 자산 | v3 | v4 | v4-svg |
|------|----|----|--------|
| stat_infographic | 0 | 0 | 0 |
| illustration_banner | 0 | 0 | 0 |
| **합** | **0/2** | **0/2** | **0/2** |

### 디테일·선명도 (요약)

- **v3**: hand_drawn_outline 특유의 두꺼운 손맛. 배너는 단순·여백 많음.
- **v4**: 선이 더 정교하고 배너가 훨씬 밀도 높음(파도/윤곽). 가짜 텍스트 0 유지. **동일가 $0.04**.
- **v4-svg**: 진짜 SVG 패스. 아이콘은 벡터답게 또렷. 배너는 패턴이 매우 빽빽해 오버레이 카피 여백이 부족할 수 있음. **2배($0.08)**.

### SVG 렌더링

- 출력 URL이 `.svg` + `Content-Type: image/svg+xml` 확인.
- 원본 저장: `review/143cha-recraft-v4-svg-stat.svg`, `…-banner.svg`.
- 보드/미리보기용으로 **sharp SVG→PNG** 변환 성공.
- 브라우저 `<img src="…svg">` / data URL도 가능 — 프로덕션 도입 시 PNG 변환은 필수는 아님(다만 일부 내보내기·캔버스 경로에서는 PNG가 더 안전).

## 3. B — flux-schnell vs flux-dev (checklist + usage)

보드: `review/qa-screenshots/143cha-flux-dev-compare.png`

| 자산 | flux-schnell | flux-dev |
|------|--------------|----------|
| checklist | **가짜 글리프 1** | **0** |
| usage_steps | **가짜 글리프 1** | **0** |
| **합** | **2/2** | **0/2** |

flux-dev가 글리프 노이즈를 확실히 줄이고, 물방울 디테일/광택도 더 안정적. 단가 $0.025 vs $0.003 (+$0.022/장).

## 4. 비용: 추정 vs 확인가

이번 런 장수: recraft 6 + flux 4 = **10장** (프로덕션 배선 호출 아님 — explore 스크립트).

| 모델 | 장수 | 확인 단가 | 소계 |
|------|------|-----------|------|
| recraft-v3 | 2 | $0.04 | $0.08 |
| recraft-v4 | 2 | $0.04 | $0.08 |
| recraft-v4-svg | 2 | $0.08 | $0.16 |
| flux-schnell | 2 | $0.003 | $0.006 |
| flux-dev | 2 | $0.025 | $0.05 |
| **합계** | 10 | — | **≈ $0.376** |

브리프 추정(v4=$0.04, svg=$0.08, flux-dev=$0.025)과 **Replicate UI 확인가가 일치**. 대시보드 청구 라인 아이템까지는 이 계정 credit<$5 rate-limit 환경에서 재확인하지 않음(단가 배지 = 공식 표시).

## 5. 다음 라운드 권고 (이번엔 미적용)

| 슬롯 | 권고 | 이유 |
|------|------|------|
| illustration_banner / statInfographic | **v3 → v4 교체 검토** | 동일 $0.04, 디테일↑, 가짜텍스트 0. style 파라미터 부재만 프롬프트로 흡수 필요 |
| 동 슬롯에 v4-svg | **보류** (아이콘만 선택적) | 2배 비용. 벡터 품질은 우수하나 배너는 과밀 경향 |
| checklist / usage / spec | **flux-dev 전환 강하게 추천** | 글리프 2/2→0/2. 페이지당 ≈+$0.066(3장)로 마진 영향 미미 |

## 6. 배선 미변경 확인

- `IconModelKey`에 v4/dev **미추가**
- `modelForIconGroup`: stat → `recraft-v3` 유지
- `ILLUSTRATION_BANNER_MODEL = "recraft-v3"` 유지
- `.env.local` `ICON_MODEL=flux-schell` 유지
- 비교는 `scripts/143cha-upgrade-explore.ts` (+ resume)만 사용

## 7. tsc

`npx tsc --noEmit` → **EXIT_CODE=0**  
(142차 스모크 스크립트 타입만 최소 수정 — 프로덕션 lib 배선 변경 아님)

## 완료 체크리스트

- [x] recraft-v4 / v4-svg 스키마·가격 확인
- [x] flux-dev 스키마·가격 확인
- [x] 3-way 비교 보드
- [x] 2-way 비교 보드
- [x] 가짜 텍스트 표 + 디테일 노트
- [x] SVG → PNG 변환 및 원본 SVG 보존
- [x] 비용 추정 vs 확인가
- [x] tsc EXIT_CODE=0
- [x] 기본값/배선 미변경
