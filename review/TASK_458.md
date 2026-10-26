# TASK_458 — 457차 잔여: PNG 구간 상관 0.61 · 사진 실패 퍼징 측정 · 457차 보고서 (지시서 요약본 — 규칙·항목 포함)

시작 문장: "458차 시작: PNG 상관·사진 실패 퍼징 측정·457차 보고서". 시작 전 `git pull --no-rebase origin cloud-work`로 PC 병합 커밋 `26a30c0` 확인.

## 배경
cloud-work `26a30c0`에 454~457(1·2)차 병합. 457차 1·2 완료(launch-smoke 실패 메시지에 요청 경로, 클라우드 53/53·500 미재현; 퍼징 R10 3건 제품명 공백 제외). 456차 2의 사진 실패 퍼징 도구(전부·일부·0장 + 회귀 30사례)는 있으나 200개 규모 측정 보고 없음. PNG 대조에서 `fx-skincare-serum` y≈6300 상관 0.61(다른 최악 0.87~0.92), `fx-fashion-dress-floral` y≈6300 색 차이 10.6.

## 규칙(요약)
유료 API 0·실제 키·`.env*` 금지·외부 호출/사진 다운로드 금지·새 로그인 금지. 새 문구·수치 금지, 고지 불변, 마이그레이션 변경·적용 금지. 결제·`cta_price`·`data-pz-buy`·스티키 바·편집 UI·인터랙션 불변. 렌더 변경은 v4 안, off = 438차 기준 diff 0(4a·4b·4c), 패리티, export 금지 기법 금지, 사진 있음 출력 불변, 회귀 전부 통과(129+), tsc 0. 항목마다 커밋·push, main 금지, 한도 부족 시 `review/458cha-report.md` 먼저.

## 1. PNG 대조 구간 상관 0.61
`scripts/png-compare.ts`로 `fx-skincare-serum`·`fx-fashion-dress-floral` y≈5880~6720 재현·눈 확인(`review/458-verify/png-6300/`), 차이 요소 분류(그라데이션 띠·스크림·SVG·그림자·폰트·사진 크롭·분할 경계·좌표 어긋남). 앱 PNG 경로 결함이면 v4 안 최소 수정, 도구 오탐이면 도구 수정+근거. 목표 최악 구간 상관 ≥0.85, PNG 5종 전/후 표.

## 2. 사진 실패 퍼징 측정
456차 2 도구로 합성 21 + 시드 60 × 320·360·390·750에서 전부/일부/0장 3모드 측정(빈 틀·보이는 대체 글자·가로 넘침·린트 error·예외, `review/458-verify/fuzz-photo-fail.md`), 위반 최소 수정·앱이 막는 입력은 제외 근거. 회귀는 456차 30사례 유지(5분 이내).

## 3. 457차 보고서 정리
`review/457cha-report.md`가 없으면 457차 1·2 결과를 짧게 작성. `458cha-report.md` 맨 위에 집 PC 검증 명령: `git pull origin cloud-work` → `npm ci` → `npx tsx scripts/pc-verify.ts`(합격 기준 불합격 0·회귀 N/N·smoke 53/53, 49/53이면 새 실패 메시지의 요청 경로를 가져올 것).

## 4. 검증·보고서
회귀 전부, tsc 0, 4a·4b·4c diff 0, 가능하면 launch-smoke. `review/458cha-report.md` 맨 위: push 여부, PNG 전/후 표·원인, 사진 실패 퍼징 결과, 못 한 것, 집 PC 검증 명령.

## 5. 하지 않는 것
유료 호출·AI 이미지·새 문구, main push, 폰트 추가, 마이그레이션, 결제·`cta_price`·편집 UI·인터랙션 변경, 실제 비밀값·`.env*`, 사진 있음 상태 디자인 변경, 배너 기본값 변경.
