# TASK_452 — 퍼징 안정화 + 한글 타이포 마감 + 최저 점수 구간 끌어올리기 + 배포 전 정적 점검 (지시서 요약본 — 규칙·항목 포함)

시작 문장: "452차 시작: 퍼징 안정화·한글 타이포·최저 점수 구간·배포 전 정적 점검". 선행 451차. off 기준 = 451차 끝 코드 `6127201`.

## 규칙(요약)
유료 API 0·실제 키 0·`.env*` 열람/생성/커밋 금지·외부 호출/사진 다운로드 금지. 새 문구·수치 금지, 고지 불변, 마이그레이션 추가·수정 금지(읽기만). 결제·`cta_price`·`data-pz-buy`·스티키 바·편집 UI·인터랙션 불변. 디자인 변경은 `NEXT_PUBLIC_DESIGN_V4` 안, off = `6127201` 출력 문자열 diff 0, 패리티, export 금지 기법(`:has()`·container query·`text-wrap`·`mix-blend-mode`·`clip-path`·`mask`·`-webkit-text-stroke`) 금지, 대비 4.5:1, 본문 14px·라벨 12px, 회귀 117+, tsc 0. 항목마다 커밋·cloud-work push, main 금지, 한도 부족 시 완료분으로 보고서 먼저.

## 1. 라이브 퍼징 측정 안정화
측정 직전 대기 조건(`document.fonts.ready`, 이미지 decode, 두 프레임 연속 bbox 동일), 이동 감지 시 재측정 1회 후 판정. 같은 200개에서 작업자 4 vs 1 결과 차이 비교(목표 0). `review/452-verify/fuzz-stability.md`. 회귀: 같은 시드 2회 실행 결과 동일(샘플 30).

## 2. 한글 타이포 마감 (v4)
`design-metrics-dom.ts`에 지표: 외톨이 줄(마지막 줄 1~2글자), 단어 중간 끊김, 본문 행간 비율(1.5~1.75 이탈), 제목 행간(1.2~1.4), 한 줄 글자 수(모바일 12~24, 750폭 24~40) 이탈. 합성 21종·퍼징 샘플 전/후 표. `word-break: keep-all`·`overflow-wrap: anywhere`·행간/자간 토큰·제목 max-width(em) 조정(`text-wrap` 금지, `<br>` 금지). 문구 불변. 시트 `review/452-verify/typo/`. 회귀: 외톨이·끊김 합계 감소, 문구 불변, off 불변.

## 3. 최저 점수 구간
린트 최저 5개 세션·규칙 표 `review/452-verify/lowest.md`. 원인별 v4 수정(문구 불변), 목표 최저 75→≥80, 평균 ≥83, 21종 전/후 표. 회귀: 최저 ≥80, 평균 ≥83.

## 4. 배포 전 정적 점검 (`scripts/predeploy-static.ts`, `docs/predeploy-static.md`)
환경 파일 열지 않음. ① 마이그레이션 4개(20261022100000·110000·120000·130000) 존재·순서 ② `429-premigration-checks.sql` 존재 ③ `process.env.*` 이름 목록→docs, 위험 이름(`USAGE_GUARD_FAIL_MODE`·`NEXT_PUBLIC_SITE_URL`·`NEXT_PUBLIC_CONTACT_EMAIL`) 참조 확인 ④ 비밀값 패턴(값 출력 없이 파일·줄) ⑤ `git diff --stat main...cloud-work` 요약·결제·인증 경로 변경 목록(0이어야) ⑥ 플래그 기본값 문서 일치. 회귀: `.env` 읽기 호출 없음·출력에 값 없음. pc-verify 단계 통합, `docs/pc-verify.md` 갱신.

## 5. 검증·보고서
회귀 신규(퍼징 안정·타이포 지표·점수 하한·predeploy-static), off diff 3종 0, 패리티, 린트 전/후, tsc. `review/452cha-report.md` 맨 위: push 여부, 퍼징 4/1 차이, 타이포 전/후, 최저·평균 전/후, predeploy 실제 결과(결제 경로 변경 0·비밀값 0), 못 한 것, PC 확인 항목.

## 6. 하지 않는 것
유료 호출·AI 이미지·새 문구, main push, 폰트 추가, 마이그레이션 추가·수정, 결제·`cta_price`·편집 UI·인터랙션 변경, 실제 비밀값, `.env*`, 외부 사진 다운로드, 배너 기본값 변경, 434차 점검 **실행**(자료 준비만).
