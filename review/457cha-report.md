# 457차 보고 (458차에서 정리 — 457차 1·2 결과)

## 맨 위 요약
- **push**: 457차 1·2는 `cloud-work`에 push되어 PC 병합 커밋 `26a30c0`에 들어갔다. 457차 3·4(PNG 상관·사진 실패 퍼징)는 458차로 넘겼다(`review/458cha-report.md`).
- **선행**: 454·455·456차 커밋은 457차 시작 시 클라우드 저장소에 없었다(PC에서 병합 전). 458차 시작 시 `26a30c0`로 반영됨을 확인.

## 1. launch-smoke 500
- 클라우드에서 더미 환경값으로 `next build` → `next start -p 3199` → `scripts/launch-smoke.ts`: **53/53 통과, 500 미재현**(당시 455차 변경 없는 코드).
- 원인을 못 특정한 이유: 콘솔 메시지(«하위 리소스가 500»)에 주소가 없다. 그래서 `launch-smoke`가 공개 페이지 실패 메시지에 **4xx/5xx 응답의 메서드·경로와 연결 실패 요청**을 포함하도록 고쳤다(`scripts/launch-smoke.ts`, 회귀 `smoke-457`).
- PC 전용 요인 가설(미검증): 실제 Supabase 환경값 아래 `/`·`/login`·`/signup`·`/forgot-password`가 공통으로 부르는 같은 출처 요청(미들웨어/Proxy의 인증 호출, `/_next/image`)이 500, 포트 3199에 이전 `next start`가 남아 있거나 다른 실행과 동시에 돎. 다음 PC 실행에서 새 실패 메시지의 요청 경로로 확정한다.

## 2. 퍼징 R10 3건 판정
- fz053·fz138·fz155는 모두 제품명이 공백뿐인 입력. 앱 화면은 제품명이 비면 막는다(`CreateProductForm`의 「제품명을 입력」 검사, 전송도 `productName.trim()`) → **정상 결과로 판정, 제외 목록화**(`scripts/fuzz-check.ts` `isBlankNameCase`·`isExcludedViolation`, 근거 주석).
- 회귀 `fuzz-lint-457`: 퍼징 200개 린트 error 0(제외는 제품명 공백의 R10만, 제외 건수 0이면 실패).
