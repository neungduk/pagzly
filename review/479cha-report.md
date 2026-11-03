# 479차 보고서 — 글자 대비 실패 0 + 극단 팔레트 + 477 잔여

## 실제 사진으로 확인하지 못한 항목
- 실사·유료 API·R2 이전 실행 없음. 검수는 `--ph2 --localize-blocked --photos=partial` 가짜 갤러리 + Playwright(네트워크 차단)만.
- 극단 팔레트·본 픽스처 대비는 렌더 픽셀 검사기 기준. 원본 상품 사진 위 스크림은 유료 승인 전 미검증.

## 목표 / 실측

| 지표 | 목표 | 실측 |
|---|---|---|
| A 칩/알약 `--pz-on-chip` 쌍 | 자기 배경 부품 전수 | `chipPair` + `data-pz-chip` (POINT/STEP/태그/chrome/breather/줌 DETAIL 등) |
| B short 4×8×750 실패 | **0** (장식 제외) | **0** |
| B 제외된 장식 | 투명 기재 | 페이지당 대개 8~40(고스트·모티프·big 번호). 의미 라벨은 칩으로 포함 — `review/479-notes.md` |
| C 극단 팔레트 4×8×750 | 실패 0 | **0** |
| C `contrast-render-479` | ≤12분·exit 명확 | **714s / 64 pages**, exit 0. run-all 등록됨 |
| D 눈 검수 | 4×8×(750,390)×2회 | `review/479-captures/` 128장(미커밋) + `review/479-review.md` |
| D 477 잔여 | 여유 시 | phototext noMark + softlife/luxe compose→bleed |
| E1 export/living | ≤140 / ≤135 | 478차 133.2% 유지 목표(이번 차 재측정 생략·CSS만) |
| E2 기존 run-all 실패 4건 | 미착수 | **미착수** |

## 원인과 수정 요약
1. **알약**: 면 쌍만으로는 자기 배경 부품이 빠짐 → `--pz-chip`/`--pz-on-chip` + `data-pz-chip`.
2. **bleed/줌/스트립**: 반투명 패드·밝은 ink를 스트립 배경에 오용·on-light 후손이 on-dark 글자를 덮음 → 불투명 패드, strip `#0A0A0A`, on-light⊃on-dark 재확정.
3. **극단 팔레트 히어로 E**: `rgba(27,27,24,…)`를 `--pz-on-surface`(어두운 면에선 밝은 색)로 재매핑해 밝은 히어로에서 역실패 → 고정 `#0A0A0A` + 밝은 hero 섹션 규칙.
4. **시간**: settle/chunk wait 축소로 479 하네스 12분 내 종료.

## 남은 실패
- short·479 하네스 기준 **0**.
- 기존 run-all 실패 4건(muted 토큰 등)은 미착수.

## 변경 파일 (요지)
- `lib/color-roles-v5.ts`, `lib/export-detail-html.ts`, `lib/hero-spec.ts`, `lib/hero-stack-v5.ts`, `lib/special-sections.ts`, `lib/v5-parts.ts`, `lib/block-chrome-v5.ts`, `lib/photo-block-v5.ts`, `lib/photo-compose-v5.ts`, `lib/zoom-bubble-v5.ts`, `lib/impact-templates.ts`, `lib/highlight-family-v5.ts`, `lib/volume-comparison-diagram.ts`
- `scripts/contrast-render-478.ts`, `scripts/contrast-render-479.ts`, `scripts/regression/contrast-render-479.ts`
- `review/TASK_479.md`, `review/479-targets.md`, `review/479-notes.md`, `review/479-review.md`

## 켜는 법
- V5 온. 갤러리: `npx tsx scripts/v5-gallery-465.ts --only=fx-tech-keyboard,fx-skincare-serum,fx-fashion-dress-floral,fx-food-snack,fx-palette-yellow,fx-palette-navy,fx-palette-neon,fx-palette-gray --ph2 --localize-blocked --photos=partial`
- 검사: `npx tsx scripts/contrast-render-478.ts --short` / `npx tsx scripts/contrast-render-479.ts`

## push 확인
```
git log -1  → 52c712ce90625b85886a59966dfb44e3ea4500e6
branch      → cloud-work (main 미 push)
```

## 다음 후보
1. living/export % 재측정(CSS 증분 반영).
2. run-all 전체(12분 비정상 종료 이력 있으면 메모리·시간 분리).
3. 기존 실패 4건 별도 차수.
4. 유료 실사 검증(아래) — 승인 후.

---

## 원본 실사 유료검증 최종 제안 (실행 금지)

사용자 `"유료 승인 YYYY-MM-DD"` 이후에만.

| 항목 | 제안 |
|---|---|
| 카테고리 | 전자(키보드·이어버드), 뷰티(세럼), 패션(원피스), 푸드(스낵) + 팔레트 극단 1종(노랑 또는 형광) |
| 장수 | 카테고리당 1상품 × 상세 1세트 (총 4~5) |
| 섹션 | hero, points/POINT 알약, phototext(band/scrim), bleed, spec, timeline STEP, purchase 스트립 — impact/narrative/pop·softlife 포함 |
| 예상 호출 | 비전/역할 태깅 1회·상품, 장면 합성 0~2(선택), HTML export는 로컬 재현 우선 |
| 목적 | 렌더 대비 0·알약/라벨 가독·실사 스크림 — ph2로 못 본 사진 위 글자 |
| 실행 | **금지** — 승인 문구 이후에만 |
