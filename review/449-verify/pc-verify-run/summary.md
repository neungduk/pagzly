# PC 검증 요약 (2026-10-24)

합격 7 · 불합격 0 · 건너뜀 9

환경: Node v22.22.0 · 폰트 있음 · git 0개 변경()
환경값(존재 여부만): NEXT_PUBLIC_SUPABASE_URL 없음 · NEXT_PUBLIC_SUPABASE_ANON_KEY 없음 · NEXT_PUBLIC_SITE_URL 없음

| 단계 | 결과 | 시간 | 종료 코드 | 명령 | 로그 | 비고 |
|---|---|---|---|---|---|---|
| 1. 환경 점검 | **합격** | 0.0초 | - | `node -e 0` | - | Node v22.22.0, 폰트 있음, 환경값 0/3 (없음: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL) |
| 2. 타입 검사 | **건너뜀** | 0.0초 | - | `npx tsc --noEmit` | - | --only에 없음 |
| 3. 회귀 전체 | **건너뜀** | 0.0초 | - | `npx tsx scripts/regression/run-all.ts` | - | --only에 없음 |
| 4a. v4 off 동일(export) | **건너뜀** | 0.0초 | - | `npx tsx scripts/check-v4-off.ts` | - | --only에 없음 |
| 4b. v4 off 동일(라이브 렌더) | **건너뜀** | 0.0초 | - | `npx tsx scripts/check-v4-off-live.tsx` | - | --only에 없음 |
| 5. next build(PC 환경값 상속) | **건너뜀** | 0.0초 | - | `npx next build` | - | --only에 없음 |
| 6. 저장 세션 6종(패리티·428 DOM·750 넘침·린트) | **건너뜀** | 0.0초 | - | `npx tsx scripts/pc-verify-sessions.ts --out=review/449-verify/pc-verify-run` | - | 저장 세션 없음 — review/*-live/**/session.json 또는 review/pexels-*/session.json을 두면 자동 탐색 |
| 7. launch-smoke(next start로 띄워 호출) | **건너뜀** | 0.0초 | - | `npx tsx scripts/launch-smoke.ts` | - | --only에 없음 |
| 9a. 사진 스트레스 가독성(극단 사진 17종 × 픽스처) | **합격** | 29.6초 | 0 | `npx tsx scripts/photo-legibility.ts --out=review/449-verify/pc-verify-run/photo-stress.md --fixtures=fx-compare-fashion,fx-skincare-serum,fx-tech-keyboard+person,fx-skincare-serum+whitebg --photos=cutout-white,sat-yellow,sky-ground,very-dark,noise-shelf` | `review/449-verify/pc-verify-run/logs/legibility.log` | 측정 글자 205개 · 위반(최악 백분위 대비 < 기준) **0개** · 사진 5종 × 레이아웃 3종 |
| 9b. 사진 노출 균형(가림 면적비·휘도 보존율) | **합격** | 31.3초 | 0 | `npx tsx scripts/photo-exposure.ts --out=review/449-verify/pc-verify-run/exposure.md` | `review/449-verify/pc-verify-run/logs/exposure.log` | - 없음 |
| 9c. 접근성·구조·성능 린트 R19~R23 | **합격** | 18.7초 | 0 | `npx tsx scripts/a11y-lint.ts --out=review/449-verify/pc-verify-run/a11y-report.md` | `review/449-verify/pc-verify-run/logs/a11y.log` | - fx-compare-tech export R21 info: 장식 칩(제외) 1.55 «30mL» |
| 9d. export HTML 크기 예산 | **합격** | 2.0초 | 0 | `npx tsx scripts/size-budget.ts --out=review/449-verify/pc-verify-run/size-budget.md` | `review/449-verify/pc-verify-run/logs/size.log` | - ×2 (270자) `display:inline-block;padding:12px 20px;border-radius:999px;background:#21636F;border:none;…` |
| 9e. 반복 style 묶기 계산 스타일 동일 | **합격** | 50.9초 | 0 | `npx tsx scripts/style-dedupe-check.ts --widths=390` | `review/449-verify/pc-verify-run/logs/dedupe.log` | fx-tier-sparse-tech-1p-noprice 390px: 요소 242, 차이 0 |
| 9f. 입력 퍼징(export, 30개 · 320·360·390·750) | **합격** | 77.6초 | 0 | `npx tsx scripts/fuzz-check.ts --n=30 --live=6 --out=review/449-verify/pc-verify-run/fuzz-report.md` | `review/449-verify/pc-verify-run/logs/fuzz.log` | ## 종류별 대표 재현(최대 3개) |
| 9g. 라이브 하네스(PNG 다운로드 대조 + 라이브 퍼징, next dev) | **건너뜀** | 0.0초 | - | `npx tsx scripts/pc-verify-dev.ts --out=review/449-verify/pc-verify-run/dev --fuzz-n=40` | - | --full에서만(개발 서버를 띄움, 약 10~25분) |
| 8. 눈 검수 캡처(저장 세션 + 합성, 390·750) | **건너뜀** | 0.0초 | - | `npx tsx scripts/pc-verify-eye.ts --out=review/449-verify/pc-verify-run/eye` | - | --only에 없음 |

## 눈으로 볼 체크리스트
- [ ] 색 응집력: 한 페이지가 2~3색 계열로 정돈돼 보이는지, 단조롭지 않은지(시트 `eye/*-w390`·`*-w750`)
- [ ] 히어로: 고스트 글자가 사진·화면 가장자리에서 잘리지 않는지, 프레임 3종(아치·원형 컷·오프셋)에서 실사진 크롭이 자연스러운지, 포화 면이 과하게 강하지 않은지
- [ ] 요약 줄: 번호 배지가 어색하지 않은지, 후기 요약 캡션이 12px로 읽히는지, 사진 위 STEP 칩 글자가 읽히는지
- [ ] 750폭: 같은 면 이웃 사이 빈 칸이 과하지 않은지, 페이지 끝 검색용 평문 블록이 거칠지 않은지
- [ ] 노랑·연두·초록 계열 상품 사진 3건: 가격 기호·POINT 칩·참고 카드 대비가 읽히는지, 페이지가 칙칙하지 않은지
- [ ] 배너·강조 카드·구매 띠·FAQ·표가 실제 폰트·실사진에서 깨지지 않는지(D1·D2·D4)

시트: `review/449-verify/pc-verify-run/eye/` (저장 세션이 없으면 합성 21종만 들어 있다)
