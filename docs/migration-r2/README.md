# 이미지 저장소 Supabase → Cloudflare R2 이전 절차 (460차 작성, 461차 순서 수정) — 이 문서가 순서의 **원본**

목적: Supabase 무료 Cached Egress(5GB 대비 754% 초과)를 없애기 위해 이미지만 R2로 옮긴다. DB·로그인은 Supabase 그대로. **아래 모든 단계는 사용자가 집 PC에서 실행한다.** 폰/클라우드 세션은 `docs/phone-session-rules.md`에 따라 어떤 것도 실행하지 않는다(코드·SQL 작성과 가짜 입력 단위 테스트만). **이전이 끝나기 전에는 실사진·이미지 업로드·원격 이미지 로드 검증(`pc-verify`, 캡처, 퍼징 등)을 하지 않는다** — 그 자체가 Supabase egress를 쓴다.

관련 파일: `docs/r2-setup.md`(Cloudflare 설정·환경변수·만료 정리 상세 — 순서는 여기를 링크) · `address-inventory.md`(주소가 저장된 곳 전수) · `scripts/migrate-storage-to-r2.ts` · `01-backup.sql` … `99-rollback.sql`

**왜 이 순서인가**: 1차 복사 후 바로 DB 주소를 바꾸면, 복사와 교체 사이에 새로 올라온 이미지가 Supabase에만 남는다. 그래서 **먼저 프로덕션 업로드를 R2로 돌리고(4) → 그 전에 올라온 것을 2차 복사로 보충(5)** 한 다음 DB를 교체한다.

## 14단계
각 단계의 "결과 붙여넣기"는 사용자가 이 세션(채팅)에 터미널 출력/쿼리 결과를 붙여 주는 곳이다(키·토큰·비밀번호는 지우고).

| # | 할 일 | 합격 기준 | 멈춤 조건 | 실패 시 되돌리기 | 결과 붙여넣기 |
|---|---|---|---|---|---|
| 1 | 사전: `docs/r2-setup.md` §1~2대로 R2 버킷·공개 도메인·CORS·토큰·**프리뷰** 환경변수 준비 후, 드라이런 `npx tsx scripts/migrate-storage-to-r2.ts --state state.jsonl` | 개수·용량(≈0.2GB)·예상 쓰기 요청 수 출력, "아무것도 쓰지 않았습니다", `state.jsonl.plan` 저장 | 환경변수 누락 메시지, 목록 API 403 → 서비스 키·한도 확인 | 읽기 전용이라 되돌릴 것 없음 | **드라이런 출력 전체**를 채팅에 붙여넣기 |
| 2 | 1차 복사 `… --apply --confirm "R2로 복사" --state state.jsonl --failures failed.txt` (`.plan`이 없으면 거부된다) | 실패 0(있으면 같은 명령을 다시 — 이어서 처리) | **402/403 중단**(Supabase 한도·권한), 실패가 반복되는 404 외 오류 | R2에 복사한 객체는 새 객체일 뿐 서비스에 영향 없음. 필요하면 R2 대시보드에서 삭제 | 마지막 "요약:" 줄과 실패 원인 줄 |
| 3 | 검증 `… --verify --sample 30` | 없음·크기·해시·공개 주소 이상 모두 0 | 이상이 남음 | 2를 재실행 | 검증 출력 |
| 4 | **프로덕션 `STORAGE_PROVIDER=r2`** + `R2_*` + `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` 설정 후 재배포(새 업로드는 R2로). 앱에서 사진 1장 업로드→표시 확인 | 새 업로드가 `img.pagzly.com` 주소로 저장·표시 | 업로드 실패·이미지 깨짐 | 환경변수 `STORAGE_PROVIDER` 삭제 후 재배포(= Supabase 업로드 복귀) | 업로드 결과(성공/실패)만 |
| 5 | **2차 복사**: 먼저 `… --only-missing`(R2에 없는 개수만 보고, 쓰기 없음) → 같은 `--apply` 명령 재실행(이미 있는 것은 크기+ETag 비교로 건너뜀). 4 이전에 올라온 것을 보충 | 없음 0 | 402/403 | 2와 같음 | `--only-missing` 출력, 요약 줄 |
| 6 | **3·5 검증 재실행**: `--only-missing`(없음 0) + `--verify --sample 30` | 없음 0, 이상 0 | 이상이 남음 | 5 재실행 | 두 출력 |
| 7 | DB 백업 `01-backup.sql`(`__OLD_PREFIX__`/`__NEW_PREFIX__` 치환 후 SQL Editor) | 백업 행 수 출력 | `*_bak_r2`가 이미 있으면 실패 — 이전 백업 보존(의도) | 백업 테이블은 새 테이블이라 둬도 무해 | 백업 행 수 결과 |
| 8 | 미리보기 `02-preview.sql`(SELECT/알림만) | 컬럼별 건수·전후 예시가 기대와 같고, 발견 쿼리(③)에 문서 밖 컬럼이 없음 | ③에 표에 없는 컬럼이 나오면 멈추고 알림 | 변경 없음 | **`02-preview.sql` 결과 전체**(건수·5건 예시·NOTICE 탭) |
| 9 | 교체 `03-apply.sql` 전체 실행(트랜잭션 열림) → 처리 행 수 = 7의 백업 행 수이고 남은 옛 주소 0일 때**만** `COMMIT;` 수동 | 건수 일치 | 건수 불일치·오류 | 커밋 전: `ROLLBACK;` (아무것도 안 바뀜) | "rows affected" 목록과 마지막 남은 건수 표 |
| 10 | `04-verify.sql` + 앱에서 상품 몇 개 열어 이미지 확인 | `old_remaining` 전부 0, 이미지 정상 | 이미지 깨짐 | 11의 롤백 | 결과 표 |
| 11 | 롤백 기준: 10에서 이상, 또는 이후 이미지 깨짐 보고가 있으면 `99-rollback.sql`(백업에서 복원, 트랜잭션, 건수 확인 후 `COMMIT;`) | 복원 행 수 = 백업 행 수 | — | 롤백 후에도 옛 Supabase 객체는 그대로 있어 화면은 정상 | 롤백 시 행 수 |
| 12 | 만료 정리 크론 전환: `docs/r2-setup.md` §7 순서(수동 호출 확인 → `vercel.json` 추가 → Supabase cron 해제) | 수동 호출 `ok:true` | `ok:false`/401 | `vercel.json`에서 제거, Supabase cron 재등록 | 수동 호출 응답(개수만) |
| 13 | 3일간 Supabase Cached Egress·R2 사용량 확인 | egress가 평시 수준으로 감소, R2는 무료 한도 안 | egress가 계속 높음 → 열린 탭·export HTML·남은 옛 주소 확인(`address-inventory.md`) | — | 대시보드 숫자 |
| 14 | 옛 Supabase 객체 **90일 보관** 후 사용자가 직접 정리 | 삭제 전: 04 재확인 0 + egress 평시 + 옛 주소 접근 거의 없음 | 조건 미충족 | 삭제 전이면 되돌릴 것 없음(삭제 후엔 복구 불가 — 그래서 90일) | — |

주소 토큰: SQL의 `__OLD_PREFIX__` = `https://<프로젝트>.supabase.co/storage/v1/object/public/images/`, `__NEW_PREFIX__` = `https://img.pagzly.com/` (편집기의 "모두 바꾸기"). 프로젝트가 둘이었다면 옛 호스트마다 반복(02의 ④ 호스트별 건수로 확인).

## 옛 Supabase 객체는 지우지 않는다
- 14단계까지 **최소 90일** 유지: (a) 롤백 안전망, (b) 사용자가 이미 내려받은 export HTML이 옛 주소를 참조할 수 있음, (c) 열려 있던 탭의 세션.
- 삭제는 사용자가 판단해 직접 한다(이 폴더·스크립트는 삭제를 하지 않는다). Storage 용량(≈0.2GB)은 무료 한도 안이라 유지 비용은 0이다.

## 어림 비용
R2: 저장 10GB·Class A 100만/월·Class B 1000만/월 무료, egress 무료. 이 이전은 객체 수만큼의 PUT(Class A) + HEAD(Class B)(2차 복사까지 포함해도 한도의 몇 %). Supabase: 1차 복사 다운로드 egress ≈0.2GB 한 번. 2차 복사는 목록 API가 준 크기·eTag가 R2의 크기·ETag와 같으면 **다운로드 없이 건너뛰므로** 새로 올라온 것만 내려받는다(eTag가 없는 `--from-urls` 입력은 비교를 위해 내려받는다 — 그 경우 `--only-missing`으로 먼저 개수를 보고 범위를 좁힌다).
