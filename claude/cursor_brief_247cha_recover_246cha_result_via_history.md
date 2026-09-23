# 247차 — 246차 결과 복구 시도: `/create/history`로 이미 결제된 생성물 재확인 (유료 API 불필요)

생성: 2026-09-23 · 유료 API **0건(목표)** — 재생성 대신 이미 생성된 결과 복구 시도

## 배경 — 왜 재생성이 아니라 복구인가

246차 보고를 코드로 추적한 결과: 서버 로그상 `POST /api/generate`(최종) **200 (3.1min)**으로
**실제로 성공**했음. `app/create/draft/page.tsx:517`의 `router.push(`/create/result?id=${json.productId}`)`가
성공 응답의 `productId`로 결과 페이지 이동을 시도하는 코드도 확인함 — 즉 서버는 상품을
DB에 이미 저장했을 가능성이 높고, Playwright가 못 본 건 **클라이언트 네비게이션/캡처
단계**일 뿐 생성 자체가 날아간 게 아닐 수 있음. `app/create/history/page.tsx`가
`products` 테이블을 `user_id` 기준 `created_at desc`로 조회해 `/create/result?id=` 링크를
보여주는 페이지라는 것도 확인함.

**따라서 이번 라운드는 재생성(추가 유료) 대신, 이미 결제된 246차 결과물을 `/create/history`
경유로 복구하는 것부터 시도** — 성공하면 246차에서 이미 낸 ~$1.28로 목적(실사 결과물 확보)
달성, 추가 비용 없음.

---

## 1. 실행 (유료 API 없음 — 페이지 열람·캡처만)

1. dev 서버가 떠 있는 상태에서 `scripts/auth-state.json`으로 인증된 Playwright 세션으로
   `${BASE_URL}/create/history` 방문.
2. 목록의 **맨 위(최신) 항목**이 246차가 만든 상품인지 확인 — 기대값: `product_name`
   "라이트 워터 히알루론 세럼", `category` "화장품/뷰티", `created_at`이 246차 실행
   시각(2026-09-23 02시경, 로그 기준)과 가까운지.
3. 일치하면 그 항목 클릭(`/create/result?id=<실제 id>`로 이동) → 결과 페이지가 정상
   로드되는지 확인.
4. 정상 로드되면:
   - `[data-testid="detail-preview"]` 스크린샷 → `review/247cha-recovered/showcase-detail.png`
   - 전체 페이지 스크린샷 → `review/247cha-recovered/showcase-full.png`
   - 페이지의 `sessionStorage.getItem("pagzly-create-result")`가 있으면 저장, 없으면
     (DB 폴백 로드라 sessionStorage가 비어있을 수 있음) 페이지 DOM에서 섹션 구조를
     직접 읽거나, 가능하면 export 버튼/API로 export HTML을 받아
     `review/247cha-recovered/showcase.html`로 저장.
   - 실제 `id`(UUID)도 보고에 기록.
5. 목록 맨 위가 246차 상품이 아니거나, `/create/history`가 비어 있거나, 클릭해도
   `/create/result?id=`가 에러/빈 화면이면 — **그 사실 그대로 보고**(추측으로 채우지
   말 것). 이 경우 246차의 `productId`가 실제로 DB에 안 남았거나 다른 계정으로
   저장됐을 가능성 — 재시도(추가 유료 생성)는 이 브리프 범위 밖, 사용자 재확인 필요.

## 2. 보고 형식

`review/247cha-report.md`에:

- `/create/history` 최상단 항목의 `product_name`/`category`/`created_at`/링크된 id.
- 246차 상품과 일치 여부(제품명·카테고리·시각 기준).
- `/create/result?id=...` 방문 성공/실패, 성공 시 스크린샷 2장 + 가능하면 export HTML.
- 실패 시 정확히 어느 단계에서 어떤 에러/빈 상태였는지.
- API generate: 0 (이번 라운드는 열람·캡처만, 재생성 없음).

## 3. 참고 — 246차 실패의 진짜 원인(다음 라운드 후보, 이번엔 조사만·수정 안 함)

`handleApproveAndFinalize`(`app/create/draft/page.tsx:520`)는 `runPhotoPhase` 결과에
`backdropFailed`/`warning`이 있으면 `runFinalPhase`를 호출하지 않고 `photoPending` 상태로
멈춰 사용자의 추가 클릭("사진 보정 후 최종 생성"/원본 계속)을 기다리는 코드 경로가 있음.
246차 로그의 "section-backdrop NSFW 1건 실패"가 이 경로를 탔을 가능성과, 그게 아니라면
`runFinalPhase` 성공 후 `router.push` 시점에 Next.js App Router가 대상 페이지의 서버
컴포넌트 데이터 페칭이 끝날 때까지 네비게이션을 지연시키는 특성(`/create/result`가
느리거나 에러) 두 가지가 유력 후보 — **이번 247차에서 조사·수정하지 않음**, 247차 결과에
따라 이 부분이 실제 재현 가능한 버그인지 다음 라운드에서 판단.
