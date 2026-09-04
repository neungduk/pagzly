# 101차 — image_urls 동일 URL 중복 저장 (99차 원인 정정)

생성: 2026-09-03

## 근본 원인 정정

| 99차 결론 | 101차 정정 |
|-----------|------------|
| (2) 배정/인덱스 0 수렴 | **풀(`image_urls`) 자체에 동일 URL이 3번** 들어 있었음 |

브라우저 세션 REST 실측(사용자):

- 글로위스트 v3: `n=5 unique=3` → 상품컷 URL×3 + compare-before + compare-after  
- 히알루론: `n=9 unique=9`

배정 로직은 5 슬롯에 5 인덱스를 나눴지만, 그중 3개가 같은 파일이라 DOM에서 30회 반복처럼 보였습니다. 99차 가드는 유지(필요조건), 이번에 충분조건(중복 URL 제거)을 추가합니다.

## 중복이 들어가는 지점

| 위치 | 역할 |
|------|------|
| `lib/photo-pipeline-client.ts` `enhanceImages` — `[...results, ...extras]` (~393 부근) | 뷰티에서 업로드 부족 시 `-ingredient`/`-texture` 파생을 `uploaded[0]` 기준으로 extras에 추가. **길이 3 패턴(상품×3+compare×2)과 일치**. 실패 시 원본을 extras에 넣지는 않음(`if (extra) push`). 다만 extras 성공 URL이 히어로와 같아지거나, 이미 중복된 `body.imageUrls`가 draft→final로 들어오면 풀에 동일 문자열이 반복됨. |
| `app/api/generate/route.ts` compare push (~1526) | before/after는 **새** URL — 정상. |
| 명시적 `while (len<3) push(urls[0])` | **코드베이스에 없음** |

### 글로위스트: 업로드 소실 vs 애초에 1장

- 배열 형태가 **상품 슬롯 3 + compare 2** → 뷰티 extras(히어로+성분+텍스처) 구조와 같고, 상품 고유 URL은 **1개**.
- 히알루론은 업로드 고유 7장이 그대로 유지.
- **판정: 업로드 소실(5→1) 후 채움이라기보다, 유효 고유 업로드 1장(+ extras 슬롯이 같은 URL로 채워진) 케이스에 가깝다.**  
  작업 B(탈락 원본 폴백 배열 복구)는 **불필요** — extras 실패 시 원본 복제는 원래 안 함. 대신 **중복 URL을 저장하지 않도록** 처리.

## 수정

1. **저장 직전 중복 제거** — `lib/dedupe-image-urls.ts` + generate에서 sections index 재매핑  
2. **로그** — `[generate] image_urls n=… unique=… urls=[파일명…]`  
3. **파이프라인** — enhance merge 시 URL dedupe + `[photo-pipeline] uploaded=… enhanced=… passthrough=… finalUnique=…`  
4. extras 실패 시 “원본 복제하지 않음” 로그 명시

## 검증

- `npx tsc --noEmit` — 0  
- `scripts/101cha-dedupe-image-urls-smoke.ts` — PASS (글로위스트형 5→3)  
- 신규 1장/7장 실생성 DOM·REST 실측 — **미실행**(비용). 배포 후 스니펫으로 확인 권장.

## 변경 파일

- `lib/dedupe-image-urls.ts` (신규)
- `lib/photo-pipeline-client.ts`
- `app/api/generate/route.ts`
- `scripts/101cha-dedupe-image-urls-smoke.ts`
- `review/101cha-report.md`
