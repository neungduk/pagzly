# TASK_516 — 법령 변경 감시(법제처 Open API) + 법령 확인 기준일 표시

## 배경 (실제 호출로 확인된 사실, 2026-11-10)
- 법제처 Open API(OC=`pagzly`, 등록 도메인 `pagzly.com`)가 승인됨. **서버에서 호출할 때 `Referer: https://pagzly.com/` 와 `Origin: https://pagzly.com` 헤더가 있어야 통과**한다(헤더 없으면 "필수 입력값이 존재하지 않습니다" 오류가 HTTP 200으로 옴). OC는 Vercel 환경변수 `LAW_OC`(사용자가 설정, 코드·저장소에 넣지 말 것).
- 호출 형식: `https://www.law.go.kr/DRF/lawSearch.do?OC={LAW_OC}&target=law&type=JSON&query={법령명}&display=5`
- 확인된 결과(현재 현행):
  - 화장품법 MST 291337, 시행일자 20261020, 일부개정
  - 화장품법 시행령 MST 283963, 시행 20260402, 공포 20260310
  - 화장품법 시행규칙 MST 285249, 시행 20260402, 공포 20260331
  - `target=eflaw`는 **시행예정** 버전을 준다(화장품법 시행일 20280101, 20290101 등 예정 개정이 이미 존재).
  - `target=admrul`(행정규칙): 식약처 고시 예 "기능성화장품 기준 및 시험방법"(2025-12-16 발령). 필드: 행정규칙명, 행정규칙일련번호, 행정규칙ID, 발령일자, 시행일자, 제개정구분명.
- **응답 형태 주의**: 결과가 1건이면 `LawSearch.law`가 **객체**, 2건 이상이면 **배열**로 온다. 항상 배열로 정규화할 것. 오류도 HTTP 200 + `{"result": "...", "msg": "..."}` 형태이므로 `LawSearch`/`AdmRulSearch` 키 존재로 성공을 판정한다.
- 아직 확인 못 한 것: 본문 조회(`lawService.do`, `MST=`) 응답 구조, 식약처 "화장품 표시·광고 관리 지침"이 이 DB에 있는지. 이 TASK는 **목록 메타데이터 변경 감지**를 기본으로 하고, 본문은 선택 구현(아래 5).

## 0. 제약
CLAUDE.md / AGENTS.md / docs/phone-session-rules.md 준수. **실제 네트워크 호출·키 사용 금지**(테스트는 목업 fetch). 새 의존성 금지, main push 금지, 코드 삭제 금지, 커밋 최대 4개 cloud-work에만. 고객 화면 금지어(위반입니다/적법/완벽/보장/안전합니다/100%) 준수. 보고서 `review/516cha-report.md`는 "확인하지 못한 항목" 맨 위 + 실제 커밋 해시. 마지막 커밋은 코드 포함(Vercel ignoreCommand).
이 기능은 **규칙 JSON을 자동으로 바꾸지 않는다.** 변경을 감지해 기록·알림만 한다.

## 1. 클라이언트 `lib/law-watch/client.ts`
- `process.env.LAW_OC` 없으면 `{ ok:false, reason:"no_oc" }` 반환(예외 던지지 않음, OC 값을 로그/응답에 노출 금지).
- 모든 요청에 Referer/Origin 헤더 고정, 10초 타임아웃, 2회 재시도(502/빈 응답/HTML 응답 포함), `cache: "no-store"`.
- 응답 정규화: 객체→배열, 오류 본문(`result` 키) 판별, `LawSearch.law[]`/`AdmRulSearch.admrul[]` 파싱 → 공통 타입 `LawMeta { target, name, mst|id, promulgatedAt, effectiveAt, status("현행"|"시행예정"|…), revisionKind, raw }`.
- 질의는 법령명 **정확 일치** 항목만 채택(부분 일치로 다른 법령이 섞이지 않게).

## 2. 감시 목록 `review/data/law-watch-516.json`
항목: `{ key, target, name, affects: ["KR rule 그룹/basis 문자열"] }`.
- law: 화장품법 / 화장품법 시행령 / 화장품법 시행규칙
- eflaw: 화장품법, 시행령, 시행규칙의 **시행예정** 버전
- admrul: 식약처 고시 중 라벨·광고 규칙의 근거로 쓰이는 것. **규칙 JSON(review/data/*kr*)의 `basis`/`source`/`law` 필드에 나오는 법령·고시 이름을 실제로 모아서** 목록을 만들고 보고서에 "규칙 근거 → 감시 항목" 대응표를 쓴다. DB에서 못 찾는 항목(예: 지침류)은 "감시 불가"로 별도 표시.
- 감시 목록과 규칙 근거가 어긋나면 테스트가 실패하게 한다.

## 3. 저장소 (Supabase pagepick-3 `hlxctaipxxevuakgooek`)
마이그레이션 SQL 파일만 작성하고 **적용은 하지 말 것**(내가 적용). 테이블 2개, RLS 켜고 정책 없음(서비스 롤 전용):
- `law_watch_snapshots(key text primary key, name text, ident text, promulgated_at date, effective_at date, status text, revision_kind text, meta_hash text, last_checked_at timestamptz, last_changed_at timestamptz)`
- `law_watch_events(id bigserial primary key, key text, kind text, before jsonb, after jsonb, detected_at timestamptz default now(), acknowledged_at timestamptz)`
- 최초 실행은 기준선만 저장하고 이벤트를 만들지 않는다.
- 변경 판정: ident(MST/ID) 또는 공포일/시행일 또는 상태가 바뀌면 `changed`. eflaw에 처음 나타난 시행예정 버전은 `upcoming`. 감시 항목이 사라지면 `missing`.

## 4. 크론 `app/api/cron/law-watch/route.ts` + vercel.json
- 하루 1회(`0 2 * * *`) 추가(현재 크론 1개 + 이것 = 2개, Hobby 한도 이내). 기존 크론 인증 방식(`CRON_SECRET` 헤더 검증, billing/renew 참고)을 그대로 따르고 미인증은 401.
- 응답 본문은 건수 요약만(법령 본문·OC 포함 금지). 실패해도 이전 스냅샷은 유지하고 `last_checked_at`을 갱신하지 않는다.
- 알림: 현재 이메일 발송 인프라 없음 → 이벤트 행 저장 + `console.warn("[law-watch] changed ...")`로 Vercel 로그에 남김. 이메일은 이 TASK 범위 아님(보고서에 제안만).

## 5. (선택) 조문 본문 해시
`lawService.do?target=law&MST={mst}&type=JSON` 본문을 받아 조문 단위 해시를 저장하면 "어느 조문이 바뀌었는지"까지 볼 수 있다. 응답 구조를 확인하지 못했으므로, 구현한다면 **방어적으로**(구조가 예상과 다르면 전체 본문 해시 하나로 대체) 만들고 목업 테스트에 두 형태를 다 넣을 것. 시간이 부족하면 생략하고 보고서에 이유를 쓴다.

## 6. 화면: 법령 확인 기준일
결과 화면 하단(기준·고지 영역)과 랜딩 푸터 위에 작은 글씨 한 줄: `법령 확인 기준일: YYYY-MM-DD · 화장품법·시행령·시행규칙` — 값은 `law_watch_snapshots`의 가장 오래된 `last_checked_at`(모든 감시 항목이 확인된 날). **7일 이상 지났거나 데이터가 없으면 이 줄 자체를 표시하지 않는다**(오래된 날짜로 신뢰를 주지 않기 위해). 조회 실패 시에도 화면이 깨지면 안 되며 서버 컴포넌트에서 try/catch. "최신 법령 반영", "개정 완료" 같은 단정 문구 금지. 점검 로직/규칙 판정은 건드리지 않는다.

## 7. 테스트 `scripts/regression/label-check-516-law-watch.ts` (+스위트 등록)
목업 fetch로: (a) Referer/Origin 헤더 포함, (b) LAW_OC 없음 → no_oc, OC 값이 결과/로그 문자열에 안 나옴, (c) 단건 객체·다건 배열 정규화 동일, (d) 오류 본문(HTTP 200 + result 키) 실패 처리, (e) 정확 일치 필터, (f) 기준선 최초 실행 시 이벤트 0건, (g) MST 변경·시행일 변경·시행예정 신규·missing 판정, (h) 7일 초과/데이터 없음 시 기준일 줄 미표시, (i) 감시 목록 ↔ 규칙 근거 일치, (j) 금지어 검사.
직접 실행: `npx tsc --noEmit`, `npm run regression:label-check`. 빌드 가능하면 `npm run build`.

## 8. 커밋
1) 클라이언트·정규화·감시 목록 2) 마이그레이션 SQL·변경 판정·크론·vercel.json 3) 화면 기준일 4) 테스트·보고서(+코드 포함)

## 9. 하지 말 것
규칙 JSON 자동 수정, 법령 본문을 고객 화면에 그대로 노출, 새 라이브러리, OC·키 값 하드코딩, 실제 네트워크 호출.
