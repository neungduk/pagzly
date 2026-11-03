# 478차 보고서 — 어두운 면 글자 대비 + 렌더 기반 검사

## 실제 사진으로 확인하지 못한 항목
- 실사·유료 API·R2 이전 실행 없음. 검수는 `--ph2 --localize-blocked --photos=partial` 가짜 갤러리 + Playwright(네트워크 차단)만.
- 4×8×(750,390) 전체 길이 캡처 전수 눈 검수는 부분(키보드×어두운 3종 중심). 전 픽스처 전 폭은 시간상 미완.
- 극단 팔레트 픽스처 4종은 추가·등록했으나 렌더 대비 0 통과까지 재측정 미완.

## 목표 / 실측

| 지표 | 목표 | 실측 |
|---|---|---|
| A 렌더 픽셀 검사기 | 4×8×(750,390) | `scripts/contrast-render-478.ts` (청크 샘플·footer/deco 제외) |
| B 면+글자 쌍 | `--pz-surface`/`--pz-on-surface` | 적용. 어두운 면(impact/narrative)+pop에 인라인 잉크 강제 |
| B2 키보드×impact/narrative/pop 실패 | **0** | **72** (19/25/28) — 미달 |
| C 회귀 짧은 모드 | 실패 0, run-all 등록 | 등록됨. 현재 실패>0이라 run-all 시 탈락 예상 |
| C2 극단 팔레트 픽스처 | 노랑/남색/형광녹/무채 | `archetype-palette-*.json` 4종 추가 |
| E1 export / living | ≤140 / ≤135 | export **133.2%** (키보드 impact vs UP1) |
| E2 기존 run-all 실패 4건 | 미착수 | 미착수 (muted 대비와 이번 렌더 검사 겹침은 “토큰 muted vs 픽셀 면” 층위만 다름 — 직접 수정 없음) |
| D 477 잔여 | 여유 시 | **미착수** |

## 원인과 수정 요약
1. **원인**: 476/477 면색(`--pz-s`)만 어두워지고 인라인 `p.ink`·`data-pz-s` 고정 잉크가 남음. 다이나믹 **기울인 판**이 밝은 tint로 깔려 밝은 글자×흰 판 충돌. 토큰 대비 시험은 실제 픽셀을 못 봄.
2. **검사기**: 글자 투명 재캡처 + 청크 뷰포트 샘플(긴 페이지 텍스처 한계 회피). sticky 해제. 면 강제 `!important`보다 센 인라인 transparent 숨김.
3. **수정**: `colorRolesV5`에서 면·잉크 동시 결정 → CSS 변수 쌍. 어두운 면에 글자색 강제 + 밝은 섬(`data-pz-on-light`/`hl-c=0`/흰 background)·SEO·stacked·스크림 예외. dyn plate → `var(--pz-a)`.

## 아직 남은 실패
- phototext 구성품/POINT 라벨, narrative points 카드, pop 다수, 일부 hero 가격.
- 밝은 면 아키타입까지 전면 강제 시 역실패가 커 **forceInk는 impact/narrative/pop만**.

## 변경 파일
- `lib/color-roles-v5.ts`, `lib/dynamics-layer-v5.ts`, `lib/export-detail-html.ts`, `lib/photo-block-v5.ts`
- `scripts/contrast-render-478.ts`, `scripts/regression/contrast-render-478.ts`, `scripts/regression/run-all.ts`
- `scripts/fixtures/archetype-palette-{yellow,navy,neon,gray}.json`
- `review/TASK_478.md`, `review/478-targets.md`, `review/478-notes.md`, `review/478-review.md`

## 켜는 법
- V5 온(기존과 동일). 갤러리: `npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial`
- 검사: `npx tsx scripts/contrast-render-478.ts [--short] [--fixtures=…] [--archetypes=…]`

## push 확인
```
git log -1  → 4abcc1e fix(478): surface/ink pair, plate token, render contrast tool
branch      → cloud-work (main 미 push)
```

## 다음 후보
1. 남은 72건(키보드 어두운 3종) 섬 표식·스크림·points 카드까지 0.
2. 짧은 모드 4×8 실패 0으로 회귀 고정.
3. 극단 팔레트 4종 동일 검사 편입.
4. D: phototext 점/링 끄기, softlife↔luxe 상자 제거.
5. 기존 run-all 실패 4건은 계속 미착수 또는 별도 차수.

---

## 원본 실사 유료검증 최종 제안 (실행 금지)

사용자 `"유료 승인 YYYY-MM-DD"` 이후에만.

| 항목 | 제안 |
|---|---|
| 카테고리 | 전자(키보드·이어버드), 뷰티(세럼), 패션(원피스), 푸드(스낵) — 팔레트 극단 포함 |
| 장수 | 카테고리당 1상품 × 상세 1세트 (총 4) |
| 섹션 | hero, points, phototext, spec, story, purchase — 어두운 면(impact/narrative/pop) 강제 포함 |
| 예상 호출 | 비전/역할 태깅 1회·상품, 장면 합성 0~2(선택), HTML export만 로컬 재현 가능분 우선 |
| 목적 | 렌더 대비 0·가로 넘침 0·실사 스크림 가독 — ph2로 못 본 사진 위 글자 |
