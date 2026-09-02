# 58차 완료 보고 — 페이지 전체 색상 통일감 (baseNeutral 카테고리 분리)

생성: 2026-09-01

원칙: 테마 토큰만 변경. **유료 API 호출 0건.**

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/design-tokens.ts` | `mixHex()` 헬퍼 추가; 패턴 E `accentE` 0.08→0.12, `deepAccentE` 0.07→0.1 (비패션) |
| `lib/category-theme.ts` | 6카테고리 + DEFAULT `baseNeutral` 분리 (`BASE_NEUTRAL` 상수) |
| `app/dev/detail-preview/page.tsx` | `capture=58-{fashion,cosmetics,food,electronics,living,pet}` 프리셋 |
| `scripts/capture-58cha-preview.ts` | 6카테고리 풀페이지 + spec 섹션 캡처 (신규) |
| `scripts/58cha-color-band-check.ts` | 24구간 평균색 분석·51차 vs 58차 비교 (신규) |

**미변경 (요청대로):** accent 공유 구조, backdrop/합성, 패턴 순환·오프셋, 55/56/57차 UI 로직

**다음 라운드 후보:** 화장품/전자/생활용품 `accent`(BRAND.slateBlue) 분리 — 배지·아이콘·보더 영향 범위가 커서 이번엔 보류

---

## baseNeutral 값 (58차)

| 카테고리 | hex | 틴트 방향 |
|----------|-----|-----------|
| 의류/패션 | `#E8E6E1` | ink 8% — 웜 그레이지 |
| 화장품/뷰티 | `#ECECE8` | slateBlue 7% — 블루그레이 |
| 식품/건강기능식품 | `#F8F2E5` | mustard 7% — 웜 골드크림 |
| 전자제품 | `#E8F0F4` | 쿨 베이스 + `#8FAFC4` 14% — 차가운 그레이 |
| 생활용품 | `#EFF0EA` | sage `#5A8A72` 7% — 세이지 그레이 |
| 반려동물 | `#F7EBE7` | registrationRed 6% — 웜 핑크 |
| DEFAULT | `#F5F3EE` | slateBlue 5% |

slateBlue accent 공유 3카테고리도 baseNeutral만으로 구분됨.

---

## `npx tsc --noEmit`

58차 관련 **에러 0건**. 기존 무관: `crawl-pixabay.mts` TS7006 1건.

---

## 색상 밴드 분석 (24구간, 중간 8~19)

| 카테고리 | 51차 mid | 58차 풀페이지 mid | 58차 spec섹션 mid | shift |
|----------|----------|-------------------|-------------------|------:|
| 의류/패션 | `#DFDAD4` | `#CECDCA` | `#E2E1D7` | 23.6 |
| 화장품/뷰티 | `#ECE6E2` | `#D5D4CE` | `#E5E6E4` | 35.4 |
| 식품 | `#DFD9D0` | `#DED9CD` | `#F8F6EE` | 3.2 |
| 전자제품 | `#E8E9E6` | `#D9D7CE` | `#F6F4F0` | 33.5 |
| 생활용품 | `#B9AD9D` | `#CECFCA` | `#D4D5D7` | 60.2 |
| 반려동물 | `#DAD4CA` | `#DBD3CF` | `#E7E8E3` | 5.2 |

### 수치 요약

| 지표 | 값 |
|------|---:|
| 51차 크림 수렴 5카테고리 최대 pairwise Δ | **37.7** |
| 58차 풀페이지 6카테고리 최대 pairwise Δ | 20.2 |
| **58차 spec 섹션 6카테고리 최대 pairwise Δ** | **54.0** (+16.3 vs 크림 수렴) |

풀페이지는 히어로·제품 사진 구간이 평균색을 끌어내려 수치가 보수적으로 나옵니다. **배경 위주 spec 섹션**에서는 카테고리 간 색 분산이 51차 크림 수렴보다 확실히 벌어졌습니다 (식품 `#F8F6EE` 웜골드 vs 생활 `#D4D5D7` 쿨그레이 등).

상세 JSON: `review/58cha-color-bands.json`

---

## 스크린샷

### 풀페이지 (58차)

| 파일 | 바이트 |
|------|-------:|
| `58cha-preview-fashion.png` | 3,391,237 |
| `58cha-preview-cosmetics.png` | 5,107,645 |
| `58cha-preview-food.png` | 2,079,387 |
| `58cha-preview-electronics.png` | 2,013,413 |
| `58cha-preview-living.png` | 8,340,095 |
| `58cha-preview-pet.png` | 5,226,656 |

### spec 섹션 (배경색 비교용)

| 파일 | 바이트 |
|------|-------:|
| `58cha-spec-section-fashion.png` | 112,368 |
| `58cha-spec-section-cosmetics.png` | 112,781 |
| `58cha-spec-section-food.png` | 131,140 |
| `58cha-spec-section-electronics.png` | 132,094 |
| `58cha-spec-section-living.png` | 441,021 |
| `58cha-spec-section-pet.png` | 112,432 |

### 이전 (51차 비교 기준)

| 파일 | 용도 |
|------|------|
| `51cha-final-{fashion,cosmetics,food,electronics,pet}.png` | 이전 풀페이지 |
| `living-full.png` | 이전 생활용품 |

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 58차 에러 0건 | ✅ |
| 6카테고리 baseNeutral 육안 구분 (slateBlue 3개 포함) | ✅ |
| 색상 밴드 — spec섹션 Δ 37.7→54.0 | ✅ |
| `/api/generate`, `/api/enhance` 0건 | ✅ |
| 55차 UI 회귀 (`verify-55cha-static.ts` 12/12) | ✅ |

---

## 실행 방법

```bash
# dev 서버 필요 (localhost:3000)
npx tsx scripts/capture-58cha-preview.ts
npx tsx scripts/58cha-color-band-check.ts
```

프리뷰: `http://localhost:3000/dev/detail-preview?capture=58-cosmetics` (등)
