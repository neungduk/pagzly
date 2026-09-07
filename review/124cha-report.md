# 124차 — 라이프스타일 합성 사이즈 정합 + 정보 섹션 밀도

생성: 2026-09-07  
전제: `TEST_MODE` 유지. **유료 Replicate 라이브 합성 0회** (승인 요청만).

## Track A — 물리 스케일 → 실제 경로 연결

### 원인
`productSizeHint`는 폼·`runPhotoEnhancementPipeline`에 이미 있었으나 `/api/lifestyle-composite` 바디·`compositeProductOnLifestylePhoto()`에 **높이/requirePixelPaste가 전달되지 않음** → Vision raw box로 붙여 사이즈 붕괴.

### 수정
| 경로 | 변경 |
|------|------|
| `lib/lifestyle-composite-scale-gate.ts` | `resolveLifestyleCompositeScale` — hint/cm 파싱·시도 여부 |
| `lib/photo-pipeline-client.ts` | 높이 없으면 API 호출 스킵; 있으면 `productHeightCm`+hint 전달 |
| `app/api/lifestyle-composite/route.ts` | 바디 수신 → `requirePixelPaste: true`로 composite 호출 |
| `lib/lifestyle-product-composite.ts` | `requirePixelPaste`+높이 없음 → **즉시** 원본 반환(유료 단계 전) |

기존 필드 **용량/크기 (`productSizeHint`)** 재사용 — 새 폼 필드 없음.

### 폴백 전략: **옵션 1 (힌트 없으면 합성 생략)**

근거:
- 111차 AI 사용샷 경로와 동일(`parse` 실패 시 스킵)
- 「지어내기 금지」·안전 우선·rubbing 오탐 0% 이력과 정합
- 옵션 2(카테고리 대표 cm)는 실측처럼 보이지만 추정 수치를 심어 위험

UI: 생략 시 파이프라인 경고 — 「용량/크기에 높이(cm)를 입력하면…」

### 무비용 검증
- `111cha-physical-scale-smoke` PASS
- `124cha-lifestyle-scale-thread-smoke` PASS (있음/없음 + requirePixelPaste)
- **유료 실사진 1회 검증은 미실행** → 아래 승인 요청

---

## Track B — comparison_chart 밀도

### 최근 20건 집계 (`products`, detail_page)

| 지표 | 값 |
|------|-----|
| N | 20 |
| `comparison_chart` 포함 | **2** (10%) |
| 화장품/뷰티 | 8건 중 chart **1** (12.5%) |
| `circle-solo/pair` layout | **2** (10%) |
| ingredients 비어 있지 않음 | 19 |

대표 예: `글로위스트 드림글로우…` — ingredients 있음·circle 있음·**chart 없음**.

### 원인
1. 슬롯 `required: false` + 노트에 「근거·추정 둘 다 불가하면 생략」→ 모델이 **보수적으로 전체 생략**하는 경향
2. 성분 있음 ≠ 실측 % — self_assessed 유도가 약했음
3. circle는 서버 `applyIngredientCircleVisual`이 **파싱 가능한 1~2개 라벨**일 때만 삽입 → 전성분 나열만으로는 낮은 발동

### 수정
- `section-templates` **BEAUTY** `comparison_chart` note 강화 (ingredients 있으면 적극 채움, 지어내기 금지 유지)
- `generate/route.ts` 프롬프트에 동일 유도 1줄
- 렌더러: self_assessed 디스클레이머 **배경 pill**로 가시성↑ (`sanitizeComparisonChartSection` 강제문구 유지)
- **통합 레이아웃(성분서클+차트 한 섹션)** → **125차 후보**로 이월 (회귀·타입 확장 범위)

### 검증
- 69차 circle 0/1/2 + spec 회귀 PASS
- `sanitizeComparisonChartSection` 단위 OK
- 스크린샷: `review/124cha-comparison-disclaimer.png`
- `tsc --noEmit` 0

---

## 유료 승인 요청 (실행 안 함)

실사진 라이프스타일 합성 **1회**로 손 너비 대비 제품 높이가 맞는지 확인해도 될까요?  
(112차와 같이 `CONFIRM_*` + `productSizeHint`에 높이 cm 포함, 소액 Replicate 예상)

승인 주시면 그때만 라이브 재검증을 돌리겠습니다.
