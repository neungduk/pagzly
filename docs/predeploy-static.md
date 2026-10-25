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
| 429 사전 점검 SQL | 원본(`premigration`이 이름에 들어가고 `draft`가 없는 추적 파일)이 있으면 합격. **원본이 없고 초안(`docs/premigration-checks-draft.sql`)만 있으면 「건너뜀(원본 없음, 초안 있음)」**, 둘 다 없으면 불합격 |
| 환경변수 이름 | 코드가 읽는 `process.env` 이름을 모으고 `USAGE_GUARD_FAIL_MODE`·`NEXT_PUBLIC_SITE_URL`·`NEXT_PUBLIC_CONTACT_EMAIL`이 참조된다 |
| 비밀값 패턴 | 키 접두사·JWT 형태·개인 키 블록·긴 값 대입이 없고 `.env`가 추적되지 않는다(리뷰·문서 폴더 제외) |
| main 대비 변경 | 파일 수·줄 수·상위 디렉터리 20개, 결제·인증 경로(`app/api/billing`·`app/billing`·`lib/toss`·`app/auth`·`lib/billing*`·`components/Billing*`) 변경 0 |
| 플래그 기본값 | `DESIGN_V4`·`DESIGN_POLISH`·`HERO_V2`는 켬, `HERO_STAGE`는 끔이 코드와 `docs/v4-overview.md`에 같다 |

한계: 얕은 클론에서는 main과의 공통 조상을 알 수 없어 두 커밋의 트리를 직접 비교한다(main이 앞선 변경은 반대로 보일 수 있음). 비밀값 패턴은 형태 검사라 모든 비밀을 잡는다고 보장하지 않는다.

## 사전 점검 SQL 초안 (`docs/premigration-checks-draft.sql`)
- **원본 `429-premigration-checks.sql`이 아니다**(저장소 main·cloud-work 어디에도 없었다). 4개 계획 마이그레이션(`20261022100000`·`110000`·`120000`·`130000`)을 읽고 그 파일이 가정하는 데이터 조건만 점검하는 **SELECT 전용** 초안이다. DDL·DML 0줄, 쿼리마다 의도·기대 결과 주석.
- 사용 순서: ① PC에 원본이 있으면 원본을 먼저 실행하고 이 초안과 비교해 차이를 확인한다 ② 읽기 전용 계정으로 초안을 번호 순서대로 실행한다(마이그레이션 **적용 전**) ③ 각 쿼리의 「기대」와 다르면 해당 마이그레이션을 적용하지 않고 사람이 판단한다.
- 점검 항목: 100000(새 테이블·함수·정책 이름 충돌, auth.users) · 110000(images 버킷 현재 설정 기록, storage.objects 정책·이름 충돌, 본인 폴더 규칙 밖 경로, 10MB 초과·허용 형식 밖 기존 파일) · 120000(completion 원장 중복, 인덱스 이름 충돌, 컬럼, deduct_credits 본문) · 130000(함수·트리거 존재, 현재 지급 수치, 이미 100으로 바뀌었는지).
- 회귀 `premigration-draft-453`이 SELECT/WITH 전용·금지 키워드 0·번호별 섹션을 확인한다. 이 초안은 마이그레이션 파일을 수정하지 않으며 어떤 SQL도 실행하지 않는다.
