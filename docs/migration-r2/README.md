# 이미지 저장소 Supabase → Cloudflare R2 이전 절차 (460차)

목적: Supabase 무료 Cached Egress(37.7GB/5GB 초과)를 없애기 위해 이미지만 R2로 옮긴다. DB·로그인은 Supabase 그대로. **아래 모든 단계는 사용자가 PC에서 실행한다.** 클라우드 세션에서는 어떤 것도 실행하지 않았다(코드·SQL 작성과 가짜 입력 단위 테스트만).

관련 파일: `docs/r2-setup.md`(Cloudflare 설정) · `address-inventory.md`(주소가 저장된 곳 전수) · `scripts/migrate-storage-to-r2.ts` · `01-backup.sql` … `99-rollback.sql`

## 최종 순서 (각 단계: 중단 지점 / 되돌리기 / 시간·비용)
| # | 할 일 | 합격 기준 | 문제면 | 되돌리기 | 시간·비용 |
|---|---|---|---|---|---|
| ① | `docs/r2-setup.md`대로 R2 버킷·공개 도메인·CORS·토큰·**프리뷰** 환경변수(`STORAGE_PROVIDER=r2`, `R2_*`, `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`)를 넣고 **프리뷰 배포**에서 사진 1장 업로드→화면 표시→R2 대시보드에서 객체 확인 | 업로드 성공, `https://img.pagzly.com/…` 주소로 표시 | 여기서 멈춤: 환경변수 이름·CORS·공개 도메인 확인 | 프리뷰 변수 삭제 | 30~60분 / 0원(R2 무료 10GB·월 Class A 100만) |
| ② | 드라이런: `npx tsx scripts/migrate-storage-to-r2.ts --state state.jsonl` | 개수·용량(≈0.2GB)·예상 쓰기 요청 수 출력, "아무것도 쓰지 않았습니다" | 환경변수 누락 메시지(이름만)·목록 API 403이면 서비스 키 확인 | 없음(읽기 전용) | 몇 분 / 목록 API 호출만 |
| ③ | 복사: `… --apply --confirm "R2로 복사" --state state.jsonl --failures failed.txt` | 실패 0 (실패가 있으면 같은 명령을 다시 — 이어서 처리) | **402/403 중단**: Supabase 한도·권한 문제. 대시보드 Usage 확인 후 재시도 | R2에 복사한 객체는 새 객체일 뿐 기존 서비스에 영향 없음. 필요하면 R2 대시보드에서 삭제 | ≈수십 분(동시성 4) / Supabase egress ≈0.2GB 한 번, R2 쓰기 ≈객체 수만큼(한도의 몇 %) |
| ④ | 검증: `… --verify --sample 30` | 없음·크기·해시·공개 주소 이상 모두 0 | 이상 목록을 보고 ③ 재실행 | 없음(읽기 전용) | 몇 분 |
| ⑤ | DB 백업: `01-backup.sql`(토큰 두 개 치환 후 SQL Editor) | 백업 행 수 출력(= `02` 건수) | 이미 `*_bak_r2`가 있으면 실패 — 이전 백업 보존(의도) | 백업 테이블은 새 테이블이라 그대로 두어도 무해 | 1분 |
| ⑥ | 교체: 먼저 `02-preview.sql` 확인 → `03-apply.sql` 전체 실행(트랜잭션 열림) → 남은 건수 0·행 수 일치 확인 → **그때만 `COMMIT;` 수동** | 처리 행 수 = 백업 행 수, 남은 옛 주소 0 | 이상하면 `ROLLBACK;` (아직 커밋 전이면 아무것도 안 바뀜) | 커밋 후엔 `99-rollback.sql` | 5분 |
| ⑦ | `04-verify.sql` + 앱에서 내 상품 몇 개를 열어 이미지 확인 | old_remaining 전부 0, 이미지 정상 | 이미지 깨짐이면 ⑥을 `99-rollback.sql`로 되돌림 | `99-rollback.sql` | 10분 |
| ⑧ | 프로덕션 환경변수 `STORAGE_PROVIDER=r2` + `R2_*` + `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` 를 넣고 재배포. 새 업로드가 R2로 가는지 확인. 이어서 만료 정리 전환(`docs/r2-setup.md` §만료 이미지 정리) | 새 업로드 성공, 새 주소 | `STORAGE_PROVIDER` 를 지우고 재배포(= Supabase 업로드로 복귀) | 변수 제거 | 10분 |
| ⑨ | Supabase 대시보드 Usage → Cached Egress 를 며칠 관찰 | 일 증가량이 눈에 띄게 줄어듦 | 계속 많으면: 열린 탭·export HTML·남은 옛 주소 참조 확인(`address-inventory.md`) | — | 며칠 |

주소 토큰: `03` 등 SQL의 `__OLD_PREFIX__` = `https://<프로젝트>.supabase.co/storage/v1/object/public/images/`, `__NEW_PREFIX__` = `https://img.pagzly.com/` (편집기의 "모두 바꾸기"). 프로젝트가 둘 있었다면 옛 호스트마다 반복(02의 ④ 호스트별 건수로 확인).

## 옛 Supabase 객체는 지우지 않는다
- ⑧ 이후에도 **최소 90일** 유지: (a) 롤백 안전망, (b) 사용자가 이미 내려받은 export HTML 이 옛 주소를 참조할 수 있음, (c) 열려 있던 탭의 세션.
- 90일 뒤 삭제 전: `04-verify.sql` 0 확인 + Supabase egress 가 평시 수준인지 + 옛 주소 접근이 거의 없는지(대시보드 요청 수). 삭제는 사용자가 판단해 직접 한다(이 폴더·스크립트는 삭제를 하지 않는다).
- Storage 용량(≈0.2GB)은 무료 한도(1GB) 안이라 유지 비용은 0이다.

## 어림 비용
R2: 저장 10GB·Class A 100만/월·Class B 1000만/월 무료, egress 무료. 이 이전은 객체 수만큼의 PUT(Class A) + HEAD(Class B)이므로 한도의 몇 % 이내(드라이런이 정확한 수를 출력). Supabase: 이전 중 다운로드 egress ≈0.2GB 한 번.
