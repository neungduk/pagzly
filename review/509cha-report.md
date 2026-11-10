# 509차 보고서 — OCR 마무리 보강

## 확인하지 못한 항목
- **실제 CLOVA·Google Vision 네트워크 호출** — 금지(가짜 fetch·fixture만).
- **브라우저 실측**(320px·390px 가로 스크롤, 한도 배너·확인 카드 렌더) — 정적 CSS/`overflow-x:hidden`·폭 클래스만 확인, 실기기 미실시.
- Supabase `label_ocr_consume` 실호출·한도 카운터 라이브 확인 — 사용자 적용분, 에이전트 미검증.
- Hobby 배포 인스턴스에서 `maxDuration=30` 실제 강제 여부 — 문서·플랫폼 한도만 확인.

## 1. maxDuration 문서·조각 상한 계산

### Next.js `maxDuration`
- `node_modules/next/dist/docs/.../maxDuration.md`: 라우트 세그먼트 실행 시간(초). 플랫폼이 빌드 출력의 값을 한도로 사용. Hobby 구체 수치는 Next 문서에 없음.
- Vercel Functions(Fluid) 문서(2025-06 이후): **Hobby default=maximum 300s**.

### 조치
- 허용 범위(300s) > 기존 10 → **`maxDuration = 30`** 으로 상향(`OCR_MAX_DURATION_SEC_508=30`).
- 동시에 한 요청 조각 상한 **CLOVA 6 / Google 8** (클라 배치 + 서버 거부).

### 계산식 (동시 4 · 호출당 8s)
- 웨이브 수 = `ceil(조각수 / OCR_PARALLEL_508)` , `OCR_PARALLEL_508=4`
- 최악 초 = 웨이브 × 8
- CLOVA 6: `ceil(6/4)=2` → **16s** ≤ 30
- Google 8: `ceil(8/4)=2` → **16s** ≤ 30
- (참고) 구 `maxDuration=10`이면 16s 최악을 못 막아 조각 상한만으로는 부족 → 상향이 맞음.

## 2. 작업별 파일

### 2-1. 공급자 시간 제한
- `lib/label-check/ocr/fetch-timeout.ts` (신규)
- `lib/label-check/ocr/clova.ts` · `vision-provider.ts` · `google-vision.ts`
- `lib/label-check/ocr/constants.ts` · `run-ocr-batch.ts`
- `lib/label-check/client-ocr-prepare.ts`
- `app/api/label-check/ocr/route.ts`
- 주석: 시간 초과 시 **consume 미되돌림**(보수적)

### 2-2. 회원 OCR 확인 = 게스트 공용
- `components/label-check/ui-507/OcrReviewCard.tsx` (편집·보정·전송안내·신뢰도 경고)
- `components/label-check/ui-507/label-check-507.css` (폭·가로스크롤)
- `app/label-check/page.tsx` · `app/label-check/new/page.tsx` (동일 카드·OCR 흐름)
- 회원 저장: 기존 API 규칙 유지(`unreadable` 미저장)

### 2-3. 한도 문구
- 월: `ERR_OCR_LIMIT_508` + `limitKind:"monthly"`
- 일: `ERR_OCR_DAILY_LIMIT_509` + `limitKind:"daily"`
- `components/label-check/ui-507/OcrLimitBanner.tsx` + 붙여넣기 CTA
- `lib/label-check/client-ocr-submit.ts` · 게스트/회원 페이지 배선

### 2-4. 테스트
- `scripts/regression/label-check-509-ocr-hardening.ts`
- `scripts/regression/label-check-suites.ts` 등록
- `label-check-508-ocr.ts` maxDuration 고정검사 완화

## 3. 검증
- `npx tsc --noEmit` 통과
- `npm run build` 통과
- `npm run regression:label-check` **20/20** 통과

## 4. 커밋·push (cloud-work only, main 미push)
`git log --oneline` 확인 해시(기능·테스트 3개 + 본 docs tip):
- `ee25db1` feat(509): OCR fetch 8s timeout, maxDuration 30, tile caps 6/8
- `7cb775b` feat(509): shared OCR review on member, daily/monthly limit CTAs
- `db3795d` test(509): OCR hardening suite for timeout, tiles, limits, shared UI
- tip: `docs(509): cha-report for timeout, shared review, limit copy` (push 직후 `git log -1 --oneline`)
