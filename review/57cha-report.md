# 57차 완료 보고 — 배경/합성 리얼리티 업그레이드 + 크기비교 다이어그램 일반화

생성: 2026-09-01

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/backdrop-prompt-templates.ts` | 식품·전자제품 `food-studio` / `electronics-studio`에 가장자리 아웃포커스 재질 힌트 추가 (wood/linen, brushed metal/concrete). 기존 `no product/text/logo`, 접시·기하 사물 배제 문구 유지 |
| `lib/size-comparison-diagram.ts` | spec_table 크기 라벨 화이트리스트 매칭, 500ml 캔 기준 SVG 생성 (신규) |
| `components/SizeComparisonDiagram.tsx` | React 크기비교 다이어그램 (신규) |
| `components/DetailSectionRenderer.tsx` | `spec_table` + 비패션 카테고리에서 `SizeComparisonDiagram` 렌더; import 누락 수정 |
| `lib/export-detail-html.ts` | export HTML에 동일 크기비교 SVG 삽입 |
| `app/dev/detail-preview/page.tsx` | `?capture=57-food` / `57-electronics` 목업 시나리오 |
| `scripts/verify-57cha-size-compare.ts` | 정적 단위 검증 (신규) |
| `scripts/capture-57cha-size-compare.ts` | 무료 캡처 (신규) |
| `scripts/57cha-backdrop-qa.ts` | 식품·전자 실제 생성 QA (`SLUG_FILTER` 옵션 추가) |

**미변경 (요청대로):** `matchCutoutWhiteBalance`, `buildSilhouetteShadowBuffer`, 패션·생활용품·반려동물 배경 템플릿

---

## `npx tsc --noEmit`

```
57차 관련 파일: 에러 0건
기존 무관: review/pixabay-cosmetics-test/crawl-pixabay.mts TS7006 1건 (이전 라운드와 동일)
```

---

## 작업 A — 배경 템플릿 + 실제 생성 검증

### 프롬프트 변경 요약

- **식품:** `soft out-of-focus wood grain or linen texture hint at frame edges only` — `no plates, no dishes, no ceramic objects with defined edges` 유지
- **전자:** `soft out-of-focus brushed metal or concrete texture hint at frame edges only` — `no defined geometric objects` 유지

### API 호출 (의도된 생성 플로우)

| 카테고리 | 결과 | `/api/generate` | 비고 |
|----------|------|-----------------|------|
| 식품 | ✅ | draft 1 + final 1 | 1차 시도 402(크레딧 부족) → `grant_credits` 500 후 재실행 |
| 전자 | ✅ | draft 1 + final 1 | 1차 시도 draft 500 → `SLUG_FILTER=electronics` 재실행 |

기타: `generate-backdrop`, `enhance-image`×4, `generate-lifestyle-shots` (카테고리당 1회 플로우)

### 스크린샷 (전/후)

| 파일 | 바이트 | 용도 |
|------|-------:|------|
| `51cha-final-food.png` | 4,423,628 | **이전** (51차) 식품 풀페이지 |
| `57cha-backdrop-food.png` | 4,628,542 | **이후** (57차) 식품 풀페이지 |
| `57cha-backdrop-food-hero.png` | 621,380 | **이후** 히어로 클로즈업 |
| `51cha-final-electronics.png` | 2,694,440 | **이전** (51차) 전자 풀페이지 |
| `57cha-backdrop-electronics.png` | 2,262,718 | **이후** (57차) 전자 풀페이지 |
| `57cha-backdrop-electronics-hero.png` | 593,995 | **이후** 히어로 클로즈업 |

### 육안 확인

| 체크 | 식품 | 전자 |
|------|------|------|
| (a) 재질이 사물처럼 어색하게 겹치지 않음 | ✅ 우드·리넨이 **표면/가장자리**에만, 제품 합성 티 없음 | ✅ 브러시드 메탈/콘크리트 느낌 **바닥면**에만, 이어버드·케이스와 자연스러운 그림자 |
| (b) 이전(51차)보다 고급스러움 | ✅ 단색 베이지 그라데이션 → **따뜻한 나무·린넨 무드샷** 분위기 | ✅ 평면 쿨그레이 → **질감 있는 블루그레이 스튜디오 표면** |

---

## 작업 B — 크기비교 다이어그램 (무료)

### 동작

- `spec_table` 슬롯 + `!isFashionCategory(category)` 일 때만 렌더
- 라벨 화이트리스트: 가로·세로·높이·지름·길이·사이즈·크기 등
- 플레이스홀더(`판매자 확인 필요` 등) 제외 시 미렌더
- 기준 실루엣: **500ml 캔** (12.2cm × 6.6cm)

### 검증

```bash
npx tsx scripts/verify-57cha-size-compare.ts   # 5/5 PASS
npx tsx scripts/capture-57cha-size-compare.ts  # API 0건
```

| 파일 | 바이트 | 확인 |
|------|-------:|------|
| `57cha-size-compare-food.png` | 15,737 | 캔 vs 제품 **16.5cm × 6.5cm** |
| `57cha-spec-with-compare-food.png` | 130,898 | spec_table 섹션 전체 |
| `57cha-size-compare-electronics.png` | 16,696 | 캔 vs **5.8cm × 3.2cm × 4.1cm** |
| `57cha-spec-with-compare-electronics.png` | 131,067 | spec_table 섹션 전체 |

`/api/generate`, `/api/enhance` 호출: **0건**

프리뷰: `http://localhost:3000/dev/detail-preview?capture=57-food` / `57-electronics`

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 57차 관련 에러 0건 | ✅ |
| 식품·전자 배경 가장자리 재질 힌트, 안전 문구 유지 | ✅ |
| 식품·전자 실제 생성 각 1회, 스크린샷 육안 확인 | ✅ |
| 크기비교 — spec_table 크기 값 있을 때만, 플레이스홀더 제외 | ✅ |
| 패션 `size_table`과 겹치지 않음 | ✅ |
| 작업 B `/api/generate` 0건 | ✅ |

---

## 실행 방법

```bash
# B — 무료 (dev 서버 필요)
npx tsx scripts/verify-57cha-size-compare.ts
npx tsx scripts/capture-57cha-size-compare.ts

# A — 유료 (QA 계정, Pexels 키, auth-state.json)
npx tsx review/pixabay-cosmetics-test/_grant-qa-tokens.ts  # 크레딧 부족 시
npx tsx scripts/57cha-backdrop-qa.ts
SLUG_FILTER=electronics npx tsx scripts/57cha-backdrop-qa.ts  # 단일 카테고리 재실행
```
