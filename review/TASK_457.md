# TASK_457 — 456차 잔여: launch-smoke 500 원인 · 퍼징 R10 판정 · PNG 구간 상관 · 사진 실패 퍼징 (지시서 요약본 — 규칙·항목 포함)

시작 문장: "457차 시작: smoke 500·퍼징 R10·PNG 상관·사진 실패 퍼징". 선행 454·455차 커밋이 없으면 보고서 맨 위에 "선행 미반영"이라 쓰고 가능한 항목만 진행.

## 배경(PC 456차 부분 실행)
회귀 128/128·tsc·build·4a/4b/4c·저장 세션 10종·사진 스트레스·접근성·크기 합격. launch-smoke 49/53(`/`·`/login`·`/signup`·`/forgot-password`에서 콘솔 오류 «하위 리소스 500»; 454차 PC에서는 53/53). 퍼징 200개 린트 error 3건(fz053·fz138·fz155, R10 «히어로 제품명 없음», 제품명 공백 입력). PNG 대조 `fx-skincare-serum` y=6300 구간 상관 0.61(다른 최악 0.87~0.92), `fx-fashion-dress-floral` y=6300 차이 10.6. 사진 실패 퍼징 미시작.

## 규칙(요약)
유료 API 0·실제 키·`.env*` 금지·외부 호출/사진 다운로드 금지. 새 문구·수치 금지, 고지 불변, 마이그레이션 변경·적용 금지. 결제·`cta_price`·`data-pz-buy`·스티키 바·편집 UI·인터랙션 불변. 렌더 변경은 `NEXT_PUBLIC_DESIGN_V4` 안, off = 438차 기준 diff 0(4a·4b·4c), 패리티, export 금지 기법 금지, 사진 있음 출력 불변, 회귀 128+, tsc 0. 항목마다 커밋·cloud-work push, main 금지, 한도 부족 시 `review/457cha-report.md` 먼저.

## 1. launch-smoke 500 원인
더미 환경값으로 `scripts/launch-smoke.ts`(next build → next start 3199) 재현 확인. 재현되면 500 요청 경로·응답 본문 앞부분·서버 로그로 특정하고 455차(`3b503c9`) 전/후 이분 탐색. 재현 안 되면 PC 전용 요인 가설 정리 + launch-smoke가 실패 메시지에 **어느 URL의 500인지** 포함하도록 개선. 코드 결함이면 최소 수정+회귀(4개 페이지 콘솔 오류 0), 환경 문제면 원인과 PC 확인 한 줄 명령.

## 2. 퍼징 R10 3건 판정
fz053·fz138·fz155 재현, 제품명 공백의 정상 결과인지 판단. 앱이 막는 입력이면 퍼저 제외 목록에 근거와 함께, 앱이 허용하는데 히어로가 비면 표시 규칙 수정(문구 생성 금지). 회귀: 퍼징 200개 린트 error 0(제외 목록 명시).

## 3. PNG 대조 구간 상관 0.61
`scripts/png-compare.ts`로 두 픽스처 y≈5880~6720 구간 재현·눈 확인(`review/457-verify/png-6300/`), 차이 요소 분류. 앱 PNG 결함이면 v4 안 최소 수정, 도구 오탐이면 도구 수정+근거. 목표 상관 ≥0.85.

## 4. 사진 실패 모드 퍼징
`fuzz-check.ts`·`fuzz-live.ts`에 사진 전부 실패/일부 실패/0장 모드 추가. 합성 21 + 시드 60 × 320·360·390·750에서 빈 틀·보이는 대체 글자·가로 넘침·린트 error·예외 측정(`review/457-verify/fuzz-photo-fail.md`), 위반 최소 수정. 회귀: 사진 실패 퍼징 30개(시드 고정, 5분 이내).

## 5. 검증·보고서
회귀 128+, tsc 0, 4a·4b·4c diff 0, 가능하면 pc-verify(--skip-capture)·launch-smoke. `review/457cha-report.md` 맨 위: push 여부, smoke 500 재현 여부·원인·조치, R10 판정, PNG 상관 전/후, 사진 실패 퍼징, 못 한 것, 집 PC 검증 명령(`git pull origin cloud-work` → `npm ci` → `npx tsx scripts/pc-verify.ts`; 합격 기준 불합격 0·회귀 N/N·smoke 53/53).

## 6. 하지 않는 것
유료 호출·AI 이미지·새 문구, main push, 폰트 추가, 마이그레이션, 결제·`cta_price`·편집 UI·인터랙션 변경, 실제 비밀값·`.env*`, 사진 있음 상태 디자인 변경, 배너 기본값 변경.
