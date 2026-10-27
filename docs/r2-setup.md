# Cloudflare R2 이미지 저장소 설정 (459차)

이미지(Storage 버킷 `images`)만 R2로 옮긴다. DB·로그인은 Supabase 그대로. **코드는 기본값이 Supabase라 아래를 하기 전에는 아무것도 바뀌지 않는다.**
**키(액세스 키·시크릿)는 채팅·저장소·문서에 붙여 넣지 말고 Vercel 환경변수에만 입력한다.** 이 문서의 단계 중 Cloudflare 화면 이름·요금·카드 필요 여부는 **직접 확인해야 하는 미검증 내용**이다.

## 1. 준비
1. Cloudflare 가입(카드 없이 가능한지는 직접 시도해서 확인 — **미검증**). R2 활성화 단계에서 결제수단을 요구할 수 있다.
2. R2 → 버킷 만들기(예: `pagzly-images`). 위치는 자동/가까운 곳.
3. **공개 접근 방식**
   - 운영: Cloudflare에 연결한 **자체 도메인**(버킷 → 설정 → 사용자 지정 도메인, 예 `img.example.com`). 캐시·CDN 규칙을 쓸 수 있다.
   - 도메인이 없으면 `r2.dev` 공개 주소로 시작할 수 있으나 개발·테스트용으로 속도 제한이 있을 수 있어 운영에는 권하지 않는다(한계는 직접 기록). 
4. **API 토큰**(R2 → API 토큰 관리): 권한 **Object Read & Write**, 적용 범위 **해당 버킷만**. 발급된 Access Key ID·Secret은 한 번만 보이므로 곧바로 Vercel에 입력.
5. **CORS 규칙**(버킷 → 설정 → CORS 정책). 브라우저가 서명 주소로 PUT하고, 캡처·PNG 다운로드(`lib/capture-detail-png.ts`)가 `crossOrigin="anonymous"` 이미지를 읽기 때문에 필요:
```json
[
  {
    "AllowedOrigins": ["https://<서비스 주소>", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["content-type", "content-length"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```
`AllowedOrigins`에는 실제 서비스 도메인(프리뷰 주소를 쓰면 그것도)을 넣는다. 서명 PUT에는 `Content-Type`·`Content-Length`가 서명에 묶여 있어 다르면 거절된다. 공개 읽기(GET)는 사용자 지정 도메인이면 도메인 쪽 CORS도 확인.

## 2. Vercel 환경변수
| 이름 | 값 | 공개 |
|---|---|---|
| `STORAGE_PROVIDER` | `r2` | 아니오 |
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID | 아니오 |
| `R2_ACCESS_KEY_ID` | 토큰의 Access Key ID | 아니오 |
| `R2_SECRET_ACCESS_KEY` | 토큰의 Secret | 아니오 |
| `R2_BUCKET` | 버킷 이름 | 아니오 |
| `R2_PUBLIC_BASE_URL` | 공개 주소(끝 `/` 없이) — 서버가 만드는 이미지 주소 | 아니오 |
| `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` | **위와 같은 공개 주소** — 브라우저가 r2 모드로 전환하는 기준이자 이미지 허용 호스트 계산에 쓰임 | **예(비밀 아님)** |

`STORAGE_PROVIDER=r2`와 `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`은 **함께** 설정한다(서버만 r2이고 공개 주소가 없으면 브라우저는 계속 Supabase로 올리고, 반대면 서명 경로가 409를 돌려준다). `R2_*` 중 하나라도 비면 업로드할 때 이름만 담은 오류가 난다(조용히 Supabase로 떨어지지 않음). `NEXT_PUBLIC_*`는 빌드 때 들어가므로 바꾼 뒤 **다시 배포**해야 한다.

## 3. 켜기 전 점검표
- [ ] 버킷·토큰(버킷 한정)·CORS·공개 주소 준비, 공개 주소로 브라우저 접속 가능
- [ ] 프리뷰 배포에서 먼저(운영 값은 나중에) — 프리뷰 도메인을 CORS에 추가
- [ ] 위 7개 환경변수 입력, 재배포
- [ ] 기존 Supabase 이미지가 계속 보이는지(이전 전까지 Supabase 주소가 그대로 동작해야 정상)

## 4. 켠 뒤 확인
1. 상품 사진 1장 업로드 → 응답의 이미지 주소가 R2 공개 주소로 시작하는지, 화면에서 보이는지.
2. 결과 화면에서 사진 교체·GIF 올리기·PNG 다운로드가 되는지(CORS).
3. 새 이미지 주소가 상세페이지 저장·불러오기 후에도 열리는지.
4. 다른 계정으로 로그인한 상태에서 남의 경로로 서명 주소를 요청하면 거절되는지(`/api/storage/upload-url`, 403).

## 5. 롤백
`STORAGE_PROVIDER`와 `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`을 제거하고 재배포 → 다시 Supabase Storage로 업로드한다. R2에 이미 올라간 이미지는 R2 주소로 저장돼 있으므로 **R2 버킷·공개 주소는 지우지 말 것**(지우면 그 이미지가 깨진다).

## 6. 기존 이미지와 이전(460차)
기존 이미지는 이번 차수에서 옮기지 않는다. 이전 전까지 Supabase 주소가 계속 동작하고(`next.config`·proxy 허용 호스트 유지), 새 업로드만 R2로 간다. egress를 줄이는 임시 조치로 쓸 수 있으나 **기존 이미지 조회 egress는 줄지 않는다**(이전은 460차: 복사·DB 주소 교체·검증).

## 7. 만료 이미지 정리 — 주의
`supabase/functions/cleanup-expired-images`는 R2 객체를 지우지 못한다(고아 객체가 남는다). **버킷 전체에 나이 기반 수명 주기 삭제 규칙을 걸지 말 것** — 완성된 상품의 이미지가 영구 보존 대상이라 같이 지워진다. 대안과 근거는 `review/459-verify/url-assumptions.md`.

## 8. 비용 메모(직접 확인 필요 — 미검증)
R2는 이그레스(전송) 요금이 없고 저장 용량·요청 수에 과금되며 무료 구간이 있다고 알려져 있으나 **요금표는 Cloudflare 문서에서 직접 확인**해야 한다.
