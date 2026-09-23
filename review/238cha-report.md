# 238차 — 사진 1장일 때 패션 color_variation 섹션 생략

생성: 2026-09-22 · 유료 API **0** · 파일 1개

## 한줄 결론

`imageCount === 1`이면 `color_variation`을 배열에서 제거. 같은 사진을 "다른 색상"처럼 반복 노출하지 않음.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/assign-section-images.ts` | 단장 분기에서 `color_variation` filter 제거 + 해당 map 브랜치 삭제 |

무변경: `DetailSectionRenderer` / `export-detail-html` color_variation 케이스, `imageCount >= 2` 배정 경로

---

## 2. 검증

`npx tsx scripts/238cha-single-photo-color-variation-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| esbuild | OK |
| imageCount=1 | color_variation **0개**, 다른 슬롯 유지·index 0 |
| imageCount=2·3 | color_variation 유지, 옵션 index ≥2종 |
| color 없는 픽스처 | 길이·순서 불변 |
| 231 / 232 / 236 / 237 회귀 | 재실행 |

API generate: 0

---

## 3. 조사 보류 (§2 / §4)

| 항목 | 분류 |
|------|------|
| Vision 주석 4카테고리 확장 | §4 유료 Claude Vision |
| 라이프스타일 cm 파싱 게이트 완화 | §2 추정 합성 금지 가드레일 |
| 라이프스타일 clarity-upscaler | §4 유료 Replicate |
