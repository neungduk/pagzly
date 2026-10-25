# TASK_453 — 단어 중간 끊김 구조 개선 + 줄 길이 + 섹션 종류별 완성도 바닥 + 사전 점검 SQL 초안 (지시서 요약본 — 규칙·항목 포함)

시작 문장: "453차 시작: 타이포 구조 마감·섹션 바닥 올리기·사전 점검 SQL 초안". 선행 452차. off 기준 = 452차 끝 코드 `5dd4a8e`. (원문은 한도 부족 시 `review/451cha-report.md`라 적었으나 오타로 보고 `review/453cha-report.md`를 쓴다.)

## 규칙(요약)
유료 API 0·실제 키 0·`.env*` 금지·외부 호출/사진 다운로드 금지. 새 문구·수치 금지, 고지 불변, **기존 마이그레이션 수정 금지(읽기만)**. 결제·`cta_price`·`data-pz-buy`·스티키 바·편집 UI·인터랙션 불변. 디자인 변경은 `NEXT_PUBLIC_DESIGN_V4` 안, off = `5dd4a8e` 출력 문자열 diff 0, 패리티, export 금지 기법(`:has()`·container query·`text-wrap`·`mix-blend-mode`·`clip-path`·`mask`·`-webkit-text-stroke`) 금지, 대비 4.5:1, 본문 14px·라벨 12px, 회귀 121+, tsc 0. 항목마다 커밋·cloud-work push, main 금지, 한도 부족 시 완료분으로 보고서 먼저.

## 1. 단어 중간 끊김 35 → ≤10
요소·원천·재현 입력 표(`review/453-verify/wordbreak.md`, 「라벨:값」·가운뎃점 뒤·쉼표 뒤·괄호·숫자+단위). v4 수정(문구 불변): 라벨+값 `white-space:nowrap`(짧은 조각만), 가운뎃점·쉼표 뒤 `<wbr>`(export 허용 확인), 숫자+단위 NBSP(회귀는 NBSP→공백 정규화 후 비교). `lib/typo-v4.ts` 확장(라이브·export 같은 헬퍼). 전/후 시트·지표. 회귀: 끊김 ≤10, 가로 넘침 0 유지, 문구 불변, off 불변.

## 2. 줄 길이·행간 잔여
줄 글자 수 이탈 290 중 좁은 칸 아닌 것만 분류(`ch` 아닌 em 기반 본문 최대 폭 토큰·750폭 패딩), 행간 이탈 86 중 남은 것 원천·수정. 회귀: 본문 영역 줄 길이 이탈 전/후, 행간 이탈 ≤40.

## 3. 섹션 종류별 완성도 바닥
섹션 type별 지표 평균(린트 기여·428 DOM·외톨이·겹침·빈 공간) 표로 하위 5종 찾기(`review/453-verify/section-floor.md`), 눈 검수 시트(하위 5종 × 입력 풍부·보통·빈약 × 390), 원인별 v4 수정(문구·편집 UI·인터랙션 불변), 전/후·다른 종류 하락 0, 회귀로 하한 잠금.

## 4. 사전 점검 SQL 초안(읽기 전용)
4개 계획 마이그레이션(20261022100000·110000·120000·130000)을 읽고 가정하는 데이터 조건을 점검하는 **SELECT 전용** `docs/premigration-checks-draft.sql`(DDL·DML 0줄, 쿼리마다 의도·기대 결과 주석, 원본 `429-premigration-checks.sql`이 아님을 첫 줄에 명시). 회귀 `premigration-draft-453`(SELECT/WITH 외 0, 금지 키워드 없음, 4개 번호별 섹션 존재). `docs/predeploy-static.md`에 위치·사용 순서 추가, predeploy-static 429 항목에 draft 존재 표시("원본 없음, 초안 있음").

## 5. 검증·보고서
회귀 신규(끊김·줄 길이·섹션 바닥·premigration 초안), off diff 3종 0, 패리티, 린트·타이포 전/후, tsc. `review/453cha-report.md` 맨 위: push 여부, 끊김 전/후, 줄 길이·행간 전/후, 섹션 바닥 전/후, SQL 점검 항목 목록, 못 한 것, PC 확인 항목.

## 6. 하지 않는 것
유료 호출·AI 이미지·새 문구, main push, 폰트 추가, 기존 마이그레이션 수정·**적용**, 결제·`cta_price`·편집 UI·인터랙션 변경, 실제 비밀값, `.env*`, 외부 사진 다운로드, 배너 기본값 변경, 434차 점검 실행.
