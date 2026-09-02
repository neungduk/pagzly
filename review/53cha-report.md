# 53차 완료 보고 — 배경색 다양화 + spec_table 비주얼 + 반려동물 블러 조사

생성: 2026-09-01

원칙: 코드 수정 + 무료 검증만 수행. 유료 API 생성 테스트 없음.

---

## 변경 파일

| 파일 | 작업 | 내용 |
|------|------|------|
| `lib/color-extract.ts` | A | `MIN_BASE_NEUTRAL_SATURATION` 0.14→0.30, `MAX_BASE_NEUTRAL_LIGHTNESS` 0.97→0.90, `ensureReadableBaseNeutral()` 추가(ink 대비 4.5:1 보장), `buildThemeFromHueWithNeutral`·`STUDIO_NEUTRAL_SAMPLE` export |
| `scripts/verify-53cha-color-spread.ts` | A | 9 hue legacy/current 비교 + 대비 검증 스크립트 (신규) |
| `review/53cha-color-spread.md` | A | 검증 결과 자동 생성 |
| `components/DetailSectionRenderer.tsx` | B | `spec_table` 상단에 `imageUrls[0]` 정사각형 썸네일 |
| `lib/export-detail-html.ts` | B | export HTML `spec_table` 동일 썸네일 |
| `scripts/capture-53cha-spec-table.ts` | B | `/dev/detail-preview` spec_table 캡처 (신규) |
| `review/qa-screenshots/53cha-spec-table-preview.png` | B | 미리보기 캡처 결과 |

---

## tsc 결과

```bash
npx tsc --noEmit
```

| 결과 | 비고 |
|------|------|
| **53차 변경 파일: 에러 0건** | `lib/color-extract.ts`, `DetailSectionRenderer.tsx`, `export-detail-html.ts`, `verify-53cha-color-spread.ts` 모두 통과 |
| 기존 무관 에러 1건 | `review/pixabay-cosmetics-test/crawl-pixabay.mts(10,28)` — implicit `any` (53차 범위 밖) |

---

## 작업 A — baseNeutral 색상 스프레드

### 상수 변경

| | 이전 (51차) | 현재 (53차) |
|--|-------------|-------------|
| MIN saturation | 0.14 | **0.30** |
| MAX lightness | 0.97 | **0.90** |
| 대비 가드 | 없음 | `ensureReadableBaseNeutral()` — ink `#1B1B18` 대비 4.5:1 미만이면 명도를 최대 0.95까지 단계 상승 |

### 9 hue 비교표 (스튜디오 neutral r235 g232 b227)

| hue° | legacy baseNeutral | current baseNeutral | deepAccent | ink 대비 |
|-----:|-------------------|---------------------|------------|--------:|
| 0 | #916E6E | #B47474 | #631717 | 4.68:1 |
| 40 | #91856E | #A68C59 | #7D622D | 5.36:1 |
| 80 | #85916E | #8CA659 | #546A26 | 6.34:1 |
| 120 | #6E916E | #59A659 | #1F5F1F | 5.77:1 |
| 160 | #6E9185 | #59A68C | #1D5F49 | 5.97:1 |
| 200 | #6E8591 | #598CA6 | #19475F | 4.71:1 |
| 240 | #6E6E91 | #8181BB | #1A1A61 | 4.76:1 |
| 280 | #856E91 | #9F74B4 | #4A1C62 | 4.63:1 |
| 320 | #916E85 | #B06D9A | #611949 | 4.52:1 |

**요약**

- legacy 고유 hex: **9/9** (숫자상 구분되나 육안으로는 모두 옅은 아이보리)
- current 고유 hex: **9/9** (빨강·초록·파랑·보라 틴트가 육안으로 구분 가능)
- ink 대비 실패 hue: **없음** (최소 4.52:1 @ hue 320)
- 검증: `npx tsx scripts/verify-53cha-color-spread.ts` → exit 0

상세: `review/53cha-color-spread.md`

---

## 작업 B — spec_table 제품 사진 앵커

### 구현

- **미리보기** (`DetailSectionRenderer.tsx` `spec_table` case): `resolveImage(imageUrls, 0)` 썸네일을 INFO 헤딩·테이블 사이에 배치 (h-28/w-28, rounded-2xl, object-cover)
- **export HTML** (`export-detail-html.ts`): 동일하게 `imageUrls[0]` 112×112px 썸네일

### 캡처 확인

`review/qa-screenshots/53cha-spec-table-preview.png` (36,555 bytes)

- `/dev/detail-preview`의 "제품 정보" 섹션
- 제품 사진(세럼 보틀)이 테이블 상단 중앙에 렌더링됨 확인
- 유료 생성 없이 기존 dev fixture 이미지 재사용

---

## 작업 C — 반려동물 "하루 1~2개" 블러 원인 조사

### 대상 섹션 식별

| 항목 | 값 |
|------|-----|
| 스크린샷 | `review/qa-screenshots/51cha-final-pet.png` |
| 섹션 타입 | `image_text` |
| 슬롯 | `quick_points` |
| 레이아웃 | `compact` (96×96px 썸네일 + 텍스트 가로 배치) |
| 헤딩 | "하루 1~2개" — QA fixture `keyFeatures` 5번째 항목에서 AI가 quick_point로 분리 |
| 렌더러 | `DetailSectionRenderer.tsx` L1059–1101 (`SectionImage` class `h-24 w-24`) |

### CSS/렌더러 블러 여부

**해당 없음.** `quick_points` compact 분기의 `SectionImage`에는 `blur` 클래스가 없다. `illustration_banner`의 `blur-2xl` 배경(img aria-hidden)은 별도 섹션 타입이며 quick_points와 무관.

### 이미지 슬롯 매핑

`lib/assign-section-images.ts` L94–95:

```ts
if (slot === "detail_zoom" || slot === "fabric_composition" || slot === "quick_points") {
  return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
}
```

- `quick_points`는 **detail 역할** 사진을 우선 배정
- 반려동물 카테고리 detail 힌트: "성분표·용량·주의 문구" (`lib/image-roles.ts`)
- QA 소스: Pexels `"dog treat snack"`, `"dog biscuit product shot"` 등 — 얕은 심도·매크로 컷이 섞임
- "하루 1~2개"는 3번째 quick_point → `assignSectionImages`가 detail pool에서 **3번째 고유 imageIndex** 배정 (스크린샷상 뼈모양 간식 클로즈업)

### 합성 파이프라인 영향 (주요 원인)

`lib/photo-enhance.ts` → `featherCutout()` (`lib/photo-composite.ts` L166–218):

1. 알파 채널 1px erode + Gaussian blur (sigma 1.2–4.8, 제품 크기 대비 정규화)
2. 페더 경계 픽셀에 premultiplied alpha 감쇠 (`a < 250`이면 RGB도 함께 어둡게)

1200px 캔버스 합성 결과를 **96px**로 축소하면:

- 페더 영역이 제품 실루엣 전체로 번져 보임
- 작은 오브젝트(간식 뼈모양)는 실루엣 대비 페더 비율이 커져 **전체가 뿌옇게** 읽힘
- Pexels 원본이 이미 얕은 심도(배경·전경 중 일부만 선명)이면 이중으로 흐릿해짐

### 결론

| 원인 | 기여도 | 설명 |
|------|--------|------|
| **합성 페더 + 96px 다운스케일** | **높음** | `featherCutout` 알파 블러가 compact 썸네일 크기에서 제품 전체로 확산 |
| Pexels 소스 얕은 심도 | 중간 | 간식 매크로 사진 자체가 선명 영역이 좁음 |
| CSS blur | 없음 | 렌더러에 blur 미적용 |
| 저해상도 원본 | 낮음 | QA는 `large2x` JPEG quality 92로 저장 — 해상도 자체는 충분 |

### 다음 라운드 수정 제안 (이번 미적용)

1. `quick_points` compact에는 **hero/package 역할** 우선 배정 (선명한 대표 컷)
2. compact 슬롯 전용으로 페더 sigma 상한 축소 또는 256px sharp 리사이즈 variant 제공
3. `object-cover` 대신 약간 큰 소스 + `image-rendering` 튜닝 검토

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 에러 0건 (53차 파일) | ✅ |
| 9 hue baseNeutral 육안 구분 + 수정 전/후 비교표 | ✅ (`53cha-color-spread.md`) |
| ink vs baseNeutral 대비 9 hue 전부 ≥4.5:1 | ✅ (최소 4.52:1) |
| spec_table 썸네일 — 미리보기 + export HTML | ✅ |
| 반려동물 블러 원인 조사 | ✅ (수정은 다음 라운드 권장) |
| 유료 API 생성 테스트 | ❌ 수행 안 함 (의도적) |
