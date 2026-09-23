# 200차 — Supabase images 버킷 정리 드라이런 (API 0)

생성: 2026-09-16

## 요약

드라이런 스크립트 `scripts/200cha-storage-cleanup-dryrun.ts`를 작성·실행했으나, **프로젝트 스토리지 쿼터 잠금(`exceed_storage_size_quota`) 때문에 목록 API가 전부 거부**되어 객체 분류표를 채우지 못했습니다. **삭제는 0건** (remove 호출 코드 없음). 생성 API 0.

## 실행 결과

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 |
| `storage.from("images").list` | **402 / restricted** |
| `storage.objects` 카탈로그 (schema fallback) | **동일 restricted** |
| remove 호출 | **0** (코드에도 없음) |
| 생성 API | **0** |
| 산출물 | `review/200cha-storage-cleanup-dryrun.json` (status: blocked), `review/200cha-storage-cleanup-dryrun-sample.md` |

- totalObjects / toDelete / toKeep: **모두 0** (목록 불가)
- 서비스 롤 키: 로그·보고서 미노출 (존재 여부만 `true`)

## 차단 원인

198차와 동일하게 Supabase가 스토리지 쿼터 초과로 **서비스 자체를 잠근 상태**입니다. 업로드뿐 아니라 **list / objects 카탈로그 조회까지** 같은 메시지로 막혀, 서비스 롤 키가 있어도 드라이런 목록을 만들 수 없습니다. (닭–달걀: 정리하려면 API가 필요한데, 쿼터 잠금이 API를 막음)

## 201차 전에 필요한 것 (택1)

1. **일시 플랜/쿼터 해제** 후 `npx tsx scripts/200cha-storage-cleanup-dryrun.ts` 재실행 → JSON 검토 → 201차 삭제
2. **SQL Editor / DB 직접 접속**으로 아래를 실행해 CSV/JSON으로 검토 (Storage REST를 우회)

```sql
-- images 버킷 드라이런용 집계 (삭제 없음)
select
  name as path,
  created_at,
  coalesce((metadata->>'size')::bigint, 0) as bytes,
  case
    when created_at < now() - interval '3 days' then 'delete'
    else 'keep'
  end as action
from storage.objects
where bucket_id = 'images'
order by created_at asc;
```

폴더 요약:

```sql
select
  split_part(name, '/', 1) as folder,
  count(*) as files,
  sum(coalesce((metadata->>'size')::bigint, 0)) as total_bytes,
  min(created_at) as oldest,
  max(created_at) as newest,
  count(*) filter (where created_at < now() - interval '3 days') as to_delete,
  count(*) filter (where created_at >= now() - interval '3 days') as to_keep
from storage.objects
where bucket_id = 'images'
group by 1
order by total_bytes desc;
```

## 참고 — 로컬 세션에 남은 최근 스토리지 경로 (API 목록 대체 아님)

181차 라이브 세션 URL 예 (버킷 전량이 아님, 최근 테스트 흔적 확인용):

- `2f01ed61-ed80-465d-9c1a-712bbf01a658/1789434134895-…-enhanced.png` (food)
- `2f01ed61-ed80-465d-9c1a-712bbf01a658/1789427605805-…-enhanced.png` (beauty)

파일명 앞 epoch(ms)≈2026-09-15 전후 → 3일 컷오프 기준 **보존 후보**로 보이지만, `created_at` 확정은 API/SQL 복구 후 가능합니다.
