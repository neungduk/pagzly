# 477차 보고서 — 블록 단위 완성도

## 실제 사진으로 확인하지 못한 항목
(원본 실사·유료 검증 때 볼 목록으로 그대로 쓴다)

1. 실사 사진에서 풀폭/스크림/옆레일/2분할 부품의 피사체 잘림·object-position.
2. zoom bubble 2~4개가 소재/마감 디테일을 실제로 전달하는지(ph2 SVG는 형태만).
3. 치수 도식(윤곽+치수선)이 실측 라벨·단위와 시각적으로 맞는지.
4. 사진 위 스크림 글의 실기기 가독성(자동 4.5:1은 근사색).
5. softlife↔luxe / catalog↔techsheet 블록 차이가 실사에서도 “다른 페이지”로 읽히는지.
6. R2/`img.pagzly.com` 실업로드 경로와의 조합(이번 차수 실행 금지).

## 목표 / 실측

| # | 목표 | 실측 |
|---|---|---|
| A1 블록 캡처 하네스 | 4×8 섹션 PNG + 종류 스트립 | `scripts/block-capture-477.ts` → `review/477-blocks/` |
| B1 사진 중심 extras | 평균≤3 최대≤5 | 회귀 `block-477` 통과(샘플 부품) |
| B2 라벨·표식 어휘 | 위치·표식 다양 | place≥3, mark≥3 |
| B3 여백·스크림 대비 | 토큰+4.5:1 | pad 토큰 + scrim/면 대비 가드 |
| C1 사진 부품 4종 | band/scrim/rail/split | `lib/photo-block-v5.ts`, bleed·stack에 연결 |
| D1 도식 스펙 | 5윤곽+폴백 | `lib/spec-diagram-v5.ts` + 로컬 `<use>` |
| E1 zoom multi | 2~4 | `dframe`에 2버블(상한 유지) |
| F1 리뷰 ≥2회 | 점수표 | `review/477-review.md` |
| G1 export / living | ≤140 / ≤135 | **139.2% / 134.8%** |
| G2 V5 off 안정 | 바이트 동일 | stable true |
| G3 run-all 실패 4건 | 미착수 | **미착수** |

## 블록 점수 변화
`review/477-review.md` 참고. phototext 합 17→19(가독·사진 경로). points/check 요소 수는 카드 골격상 잔여.

## 아직 비슷한 쌍
- **softlife ↔ luxe:** check는 갈라졌으나 phototext는 상자+장식 잔존으로 여전히 가깝다.
- **catalog ↔ techsheet:** 표/라벨은 다르고, 사진 없는 텍스트 블록은 비슷.

## 미달과 이유
- 사진 지배 부품을 전 변형에 깔지 못함 → export/living 상한(139.2/135).
- zoom을 `dframe`에만 적용 → 같은 이유.
- 캡처 분류기 `other` 과다 → DOM에 `data-kind` 없음, 휴리스틱 한계(스트립은 kind 대표만).

## 변경 파일
- `review/TASK_477.md`, `review/477-targets.md`, `review/477-review.md`, `review/477cha-report.md`
- `scripts/block-capture-477.ts`, `scripts/regression-v5-477.ts`, `scripts/regression/block-477.ts`, `scripts/regression/spec-diagram-477.ts`, `scripts/regression/run-all.ts`
- `lib/block-chrome-v5.ts`, `lib/photo-block-v5.ts`, `lib/spec-diagram-v5.ts`, `lib/zoom-bubble-v5.ts`, `lib/svg-sprite-v5.ts`, `lib/v5-parts.ts`
- `.gitignore` (`477-blocks/`)

## 켜는 법
`NEXT_PUBLIC_DESIGN_V5=on` (V4도 켜짐 전제). 캡처:
```
npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial
npx tsx scripts/block-capture-477.ts
npx tsx scripts/regression-v5-477.ts
```

## 다음 후보
1. phototext 장식(점/링)을 사진 지배 블록에서 끄기.
2. zoom을 사진 있는 phototext에 더 붙이되 export 다이어트와 균형.
3. 캡처 분류기 개선(`data-pz-v4` family 우선).
4. softlife/luxe 사진 블록 골격 재배치(상자 제거).

## Push 확인
```
git log -1  → 694136d fix(477-F): phototext face contrast + stack photo-block path
branch     → cloud-work (origin/cloud-work 동기)
main push  → 하지 않음
```
보고서·리뷰 커밋 해시: 이 문서와 `477-review.md`를 커밋한 tip을 기준으로 한다(아래 `git log -1`로 갱신).

## 원본 실사 유료검증 준비 목록 (제안만 · 실행 금지)
| 카테고리 | 장수 | 볼 섹션 | 예상 유료 호출 |
|---|---|---|---|
| 패션 원피스 | 제품 4 + 착용 2 | phototext band/scrim, zoom bubble, 치수 도식 | 이미지 분석/역할 분류(기존 파이프라인) |
| 스킨케어 세럼 | 제품 3 + 텍스처 1 | zoom 2~4, points 라벨, 대비 | 동일 |
| 키보드/가전 | 제품 3 | rail/spec 도식(appliance), techsheet vs catalog | 동일 |
| 푸드/스낵 | 제품 2 | bottle 윤곽 도식, options 3칸 | 동일 |
합계 권장: **약 15장**, 유료는 비전/분석 호출만(생성 API 불필요 시 스킵). R2 이전·실업로드 검증은 별도 차수.
