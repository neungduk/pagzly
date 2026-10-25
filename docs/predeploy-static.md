# 배포 전 정적 점검 (`scripts/predeploy-static.ts`)

434차 배포 점검 중 **환경값·네트워크 없이** 확인되는 것만 한 번에 본다. 점검의 **실행(배포·마이그레이션 적용)** 은 하지 않는다 — 자료만 만든다.
`.env*` 파일은 열지 않고, 값은 어디에도 출력하지 않는다(이름·파일·줄 번호만).

```
npx tsx scripts/predeploy-static.ts                       # 결과 표 → review/452-verify/predeploy-static.md
npx tsx scripts/predeploy-static.ts --base=origin/main --head=HEAD   # 비교 대상 바꾸기(먼저 git fetch origin main)
npm run pc-verify -- --only=predeploy
```
불합격이 하나라도 있으면 종료 코드 1. `docs/required-env-names.md`는 이 도구가 매번 다시 쓰는 환경변수 **이름** 목록이다(값 없음).

| 항목 | 합격 조건 |
|---|---|
| 마이그레이션 4개 | `20261022100000`·`110000`·`120000`·`130000` 파일이 있고 정렬 순서가 번호 순서와 같다. 파일 첫 줄·크기만 요약 |
| 429 사전 점검 SQL | `premigration`이 이름에 들어간 추적 파일이 있다(2026-10 기준 저장소에 **없음 → 불합격**) |
| 환경변수 이름 | 코드가 읽는 `process.env` 이름을 모으고 `USAGE_GUARD_FAIL_MODE`·`NEXT_PUBLIC_SITE_URL`·`NEXT_PUBLIC_CONTACT_EMAIL`이 참조된다 |
| 비밀값 패턴 | 키 접두사·JWT 형태·개인 키 블록·긴 값 대입이 없고 `.env`가 추적되지 않는다(리뷰·문서 폴더 제외) |
| main 대비 변경 | 파일 수·줄 수·상위 디렉터리 20개, 결제·인증 경로(`app/api/billing`·`app/billing`·`lib/toss`·`app/auth`·`lib/billing*`·`components/Billing*`) 변경 0 |
| 플래그 기본값 | `DESIGN_V4`·`DESIGN_POLISH`·`HERO_V2`는 켬, `HERO_STAGE`는 끔이 코드와 `docs/v4-overview.md`에 같다 |

한계: 얕은 클론에서는 main과의 공통 조상을 알 수 없어 두 커밋의 트리를 직접 비교한다(main이 앞선 변경은 반대로 보일 수 있음). 비밀값 패턴은 형태 검사라 모든 비밀을 잡는다고 보장하지 않는다.
