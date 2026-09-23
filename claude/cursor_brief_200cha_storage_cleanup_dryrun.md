# 200차 — Supabase `images` 버킷 정리 1단계: 드라이런(목록만, 삭제 안 함) (API 0)

생성: 2026-09-16

## 하드 가드레일 (반복 + 이번 라운드 전용 추가 규칙)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.

**이번 라운드 전용 — 절대 규칙**: **이번 라운드는 실제 파일을 하나도 삭제하지 않습니다.**
목록만 뽑아서 보고하는 "드라이런"입니다. `storage.from("images").remove(...)`
호출을 이 라운드 코드에 넣지 마세요 — 실제 삭제는 이 드라이런 결과를 사용자가 확인한
뒤 다음 라운드(201차)에서 별도로 진행합니다. 삭제는 되돌릴 수 없는 작업이라, 목록부터
사람이 눈으로 확인하는 절차를 반드시 거칩니다.

## 배경 — 사용자 결정 (원문)

> "아직은 전부다 내가 테스트했던 것들이니까 최근 3일전에 만든것 빼고는 전부다 지워도
> 될거같은데 어떻게 할까 정리쪽으로 하자"

198차에서 발견한 Supabase 스토리지 쿼터 초과(402) 문제를, 요금제 업그레이드가 아니라
**오래된 테스트 이미지 정리**로 해결하기로 사용자가 결정했습니다. 기준: **생성된 지
3일이 넘은 파일은 전부 삭제, 최근 3일 이내 파일은 보존**.

**대상 버킷 확인** — 코드 전체를 grep한 결과, 이미지 업로드는 전부 같은 버킷
`"images"` 하나만 씁니다(`app/api/generate/route.ts`, `app/api/generate-social/route.ts`,
`app/api/generate-lifestyle-shots/route.ts`, `app/api/enhance-image/route.ts`,
`app/api/generate-backdrop/route.ts`, `app/api/section-backdrops/route.ts`,
`lib/upload-png.ts`, `lib/image-router/jobs/job-store-config.ts`의
`GENERATION_STORAGE_BUCKET`). 다른 버킷은 없으니 이 버킷 하나만 정리하면 됩니다.

**인증 재사용** — `lib/supabase/service-role.ts`의 `createServiceRoleClient()`를 그대로
쓰세요. `SUPABASE_SERVICE_ROLE_KEY`(또는 `SUPABASE_SECRET_KEY`) 환경변수가 이미 로컬
`.env`에 설정돼 있을 겁니다(다른 서버 라우트들이 이미 이 키로 스토리지에 업로드하고
있으므로). **이 키 값을 로그·보고서에 절대 출력하지 마세요.**

## 작업 — `scripts/200cha-storage-cleanup-dryrun.ts` 신규 작성

1. `createServiceRoleClient()`로 클라이언트를 얻고 `supabase.storage.from("images")`를
   씁니다.
2. **재귀적으로 전체 버킷을 순회**하세요. Supabase Storage의 `list(prefix, { limit, offset })`은
   한 단계(해당 prefix 바로 아래)만 반환하고 페이지네이션이 필요합니다(기본
   limit 100) — 폴더(하위 항목이 더 있는 것, `id`가 없거나 파일 확장자가 없는 항목)를
   만나면 그 경로로 재귀 호출하고, 파일이면 목록에 추가하세요. 각 파일 항목의
   `created_at`, `metadata.size`, 전체 경로를 기록하세요.
3. 컷오프 계산: `cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000`(스크립트 실행 시점 기준
   "3일 전"). `created_at < cutoff`인 파일은 "삭제 대상", 그 외는 "보존 대상"으로
   분류하세요.
4. **삭제는 절대 호출하지 마세요** — `remove()` 호출 코드 자체를 이번 라운드에는
   작성하지 않습니다.
5. 결과를 `review/200cha-storage-cleanup-dryrun.json`에 저장하세요:
   ```json
   {
     "generatedAt": "...",
     "cutoffIso": "...",
     "bucket": "images",
     "totalObjects": 0,
     "toDelete": { "count": 0, "totalBytes": 0, "paths": ["..."] },
     "toKeep": { "count": 0, "totalBytes": 0, "paths": ["..."] }
   }
   ```
   `paths`가 너무 많으면(수천 건 예상) 전체를 다 담되, 사람이 훑어보기 쉽게
   `review/200cha-storage-cleanup-dryrun-sample.md`에 상위 폴더별(uuid별) 집계
   표(폴더당 파일 수·총 용량·가장 오래된/최신 `created_at`)도 같이 만들어 주세요 —
   전체 JSON은 기계 확인용, 요약 MD는 사람이 빠르게 훑어볼 용도입니다.
6. 콘솔에 요약(전체 객체 수, 삭제 대상 수/용량, 보존 대상 수/용량, 실행 시간)을
   출력하세요.

## 검증

1. `npx tsc --noEmit` — 0.
2. 삭제 대상 수 + 보존 대상 수 = 전체 객체 수가 정확히 맞는지 (분류 로직 누락 없음).
3. **보존 대상(3일 이내) 목록에 198차가 방금 확인한 최근 세션(`review/181cha-live/`가
   아니라 실제 스토리지 경로) 관련 파일들이 포함돼 있는지** — 즉 최근 파일을 실수로
   "삭제 대상"으로 잘못 분류하지 않았는지 샘플 몇 개를 `created_at` 값과 함께
   보고서에 직접 인용해서 보여주세요.
4. 서비스 롤 키 값이 로그·보고서 어디에도 노출되지 않았는지 확인.
5. 이미지 생성 API 호출 0회 확인.

## 하지 않는 것

- **실제 삭제(`remove()`) 절대 금지** — 이번 라운드는 목록/집계만.
- 생성 API 호출 전부 금지(0회).
- 다른 Supabase 리소스(DB 테이블, Auth 등)는 손대지 않음 — 이번 라운드는 Storage
  `images` 버킷 하나만 대상.
- 서비스 롤 키를 코드에 하드코딩하지 않음(환경변수만 사용).

## 완료 보고 형식

3~5줄 요약 + 전체/삭제대상/보존대상 개수·용량 + 보존 대상 샘플 3~5개(파일명+`created_at`)
+ 삭제 대상 샘플 3~5개(파일명+`created_at`) + `review/200cha-storage-cleanup-dryrun.json`
경로.

## 백로그 마스터

이 라운드는 코드 기능 변경이 아니라 인프라 정리라 백로그 마스터에는 안 올립니다. 드라이런
결과를 제가 검토한 뒤, 사용자님 확인을 받아 201차로 실제 삭제를 진행하겠습니다.
