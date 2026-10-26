# TASK_454 — PC 검증에서 나온 도구·문서 결함 수정 (코딩 중심, 유료 API 0회)

시작 문장: "454차 시작: PC 검증 결함 수정(tsx 의존성·세션 패리티·섹션 단독 off 검증 도구)".

## 배경 (PC pc-verify 결과, 2026-10-26)
- 합격: tsc, 4a·4b, next build, launch-smoke 53/53, 정적 점검, 사진 스트레스, 노출, a11y, 크기, 스타일 묶기, 퍼징 30개, 눈 검수 캡처.
- 불합격은 모두 검증 도구·문서 쪽 문제:
  1. PC에 `tsx`가 없어 `npm run pc-verify`가 실행되지 않음(package.json에 tsx 없음).
  2. 회귀 `v4 총정리 문서` 실패: docs/v4-overview.md 68행이 scripts/_snap-iso.tmp.tsx를 참조하나 저장소에 없음.
  3. 저장 세션 10개 모두 "섹션 수 패리티 불일치(계획 29·라이브 29·export 34)": export 전체 `<section>` 수를 계획 ±2와 비교하는 근사 판정 때문으로 추정(미확인).

## 0. 규칙
- 유료 API 0회, 실제 키 0, .env* 접촉 금지, 외부 호출 금지, 새 로그인 금지.
- 새 문구·수치 생성 금지. 고지 문구 불변. 기존 마이그레이션 수정 금지.
- 결제 코드·cta_price·data-pz-buy·스티키 바·편집 UI·인터랙션 불변.
- 렌더 출력(export·라이브)은 바꾸지 않는다: 453차 끝 코드(04f9c9a) 대비 문자열 diff 0(v4 on·off). 도구·문서·패키지 설정만.
- 회귀 125+ 통과, tsc 0. 항목마다 커밋·cloud-work push. main 금지. 한도·시간 부족 시 완료분으로 review/454cha-report.md 먼저 쓰고 push.

## 1. tsx 의존성 정식화
- devDependencies에 tsx 추가(클라우드 설치 버전과 동일), package-lock.json 갱신.
- pc-verify 스크립트와 docs/pc-verify.md가 설치된 tsx를 쓰도록. 내부 `npx.cmd tsx` 자식 호출은 유지, 로컬 tsx 있으면 쓰도록 문서화.
- 회귀 pc-verify-447 단계 목록 유지. docs/pc-verify.md 맨 위에 PC 첫 실행 순서(npm ci → npm run pc-verify).

## 2. 섹션 단독 off 검증 도구 저장소화
- _snap-iso.tmp.tsx의 역할을 확인하고 scripts/check-v4-off-section.tsx로 추가(.tmp 금지). 기준 스냅샷 경로·사용법을 docs/v4-overview.md·docs/pc-verify.md에 갱신.
- docs/v4-overview.md 68행 참조 수정, 회귀 `v4 총정리 문서`가 git ls-files 기준 추적 파일만 참조하는지 검사. 클라우드·PC 동일 결과.
- 문서 내 다른 참조 경로(.tmp·_ 접두, review/ 미추적, 로컬 전용) 전수 점검.
- pc-verify에 섹션 단독 off 단계(4c) 추가(기준 없으면 건너뜀 + 기준 만드는 명령 안내).

## 3. 저장 세션 섹션 패리티 판정 정확화
- export 전체 `<section>` 수 vs 계획 ±2 근사를 정확한 비교로 교체: export의 최상위 섹션(상세 컨테이너 직계 자식 중 섹션 단위; 구매 띠·정보 블록·고지 등 비섹션 래퍼는 별도 분류). 라이브는 data-section-index. 마크업 변경 금지, 기존 구조 표지/DOM 구조로 센다.
- 합성 21종과 저장 세션 6종(+x-세션 4종)에 대해 세션별 "계획·라이브·export 최상위·export 내부 중첩" 4개 숫자 표를 review/454-verify/section-parity.md에 남기고, 불일치 시 id·종류로 지목.
- 합성 픽스처로 도구 검증, PC에서 돌릴 명령 정리.
- 회귀: 합성 21종 패리티 일치, 섹션 하나 지운 변조 입력에서 불일치를 잡는 음성 테스트.

## 4. 그 외
- next build 경고 metadataBase 미설정: NEXT_PUBLIC_SITE_URL 참조 위치 정리, 미설정 시 경고 이유와 배포 시 설정 항목을 docs/predeploy-static.md에 한 단락(코드 변경 없음).
- pc-verify 요약 상단 "git N개 변경"을 추적/미추적/삭제 개수로 분리(요약 출력만).
- PC에서 로컬 AGENTS.md·review/442cha-report.md 충돌 → docs/pc-verify.md "PC에서 cloud-work 받는 법"(백업 후 git merge --ff-only)에 한 단락.

## 5. 검증·보고서
- 회귀 전체(신규 포함), check-v4-off·check-v4-off-live diff 0, 453차 대비 diff 0, tsc 0.
- review/454cha-report.md 맨 위: push 성공 여부, 세 불합격 항목 원인·수정·확인 방법, lock 갱신 여부, 패리티 표, 못 한 것, PC 재실행 명령과 합격 기준.

## 6. 하지 않는 것
렌더 출력·디자인 변경, 유료 호출, 새 문구, push to main, 폰트 추가, 마이그레이션 수정·적용, 결제 코드·cta_price·편집 UI·인터랙션 변경, 실제 비밀값, .env* 접촉, 배너 기본값 변경.
