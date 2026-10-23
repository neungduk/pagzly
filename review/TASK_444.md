# TASK_444 — 클라우드에서 눈 검수(정적 export 캡처) + 443 판단 3건 확정 + 리듬 재설계 + 남은 섹션 마감 (코딩 중심, 유료 API 0회)

실행 환경: 클라우드 세션(`cloud-work` 브랜치, `.env`·외부 키·dev 서버 없음). 선행: 443차 완료(`review/443cha-report.md`).
시작 문장: "444차 시작: 클라우드 눈 검수와 리듬 재설계".

## 배경
443차는 화면을 한 번도 보지 못한 채(캡처 0) 이전 섹션을 고쳤다. 그런데 **클라우드에도 Chromium + Playwright가 설치돼 있고**(PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers), export HTML은 서버 없이 `page.setContent`로 열 수 있다. 서버가 필요한 것은 라이브 화면뿐이므로 **export 렌더 기준 눈 검수는 클라우드에서 가능하다.** (443차 "캡처 금지"는 이번 차수에서 해제 — 단 **정적 export HTML 캡처만**, dev 서버·외부 네트워크 사진 로딩 없이.)

## 0. 규칙
- **유료 API 0회**, `.env*` 열지 않기, 새 로그인/계정 생성 금지, 마이그레이션 없음, 결제 코드·편집 UI·인터랙션 변경 금지(`cta_price`의 `data-pz-buy`·스티키 바 구조 불변, 스타일 값만).
- **새 문구·수치 생성 금지.** 고지(AI 생성 콘텐츠 안내) 문구 불변.
- 모든 변경 `NEXT_PUBLIC_DESIGN_V4` 안, **off = 443차 시작 시점(`df33280`) 출력과 문자열 diff 0**(`check-v4-off`·`check-v4-off-live` + 섹션 단독 off diff). 라이브↔export 문자열 패리티(회귀 `twin-sections`) 유지. export 금지 기법(`:has()`, container query, `text-wrap`, `mix-blend-mode`, `clip-path`, `mask`, `-webkit-text-stroke`) 금지. 대비 4.5:1, 본문 14px·라벨 12px 하한. 회귀 88+ 통과, tsc(기존 1건 `app/layout.tsx` 외 신규 0).
- Playwright가 리비전 불일치로 실패하면 443차처럼 `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`의 설치된 chromium을 임시 폴더에 링크해 실행(저장소 변경 금지). **정규식·스크립트는 heredoc 말고 Write/Edit로 파일 작성.**
- 항목마다 커밋하고 **`cloud-work`에 push**(push가 403이면 보고서 맨 위에 쓰고 계속 진행). main push 금지.

## 1. 눈 검수 (먼저, 상한 40분)
- `scripts/design-corpus.ts`의 `exportHtmlOf`로 합성 픽스처 18종의 export HTML을 만들고, Playwright `setContent`로 390px·750px 두 폭을 캡처(사진은 `/qa-fixtures/ph/…` 로컬 플레이스홀더라 `file://`/`route`로 정적 서빙). 폰트는 Noto Sans KR 파일이 없으면 시스템 폴백으로 렌더되므로 **글자 폭·줄바꿈 판단은 보수적으로** 하고 보고서에 명시한다.
- 긴 페이지는 **화면 높이(844px) 단위로 잘라 시트**(`review/444-verify/eye/<픽스처>/sheet-NN.png`)로 만들고 **직접 이미지를 열어** 본다. 최소 뷰티 2종(`fx-skincare-serum`, `fx-makeup-tint`), 테크 2종(`fx-tier-rich-tech-6p`, `fx-tech-keyboard`), 패션 1종(`fx-fashion-dress-floral`), 생활 1종, 빈약 입력 1종은 **끝까지** 열어 본다.
- 443차 변경 항목별 **합격/결함 표**: FAQ 카드형, spec_table(라벨 면·줄무늬·hairline), comparison_table 숫자 열, 주의·고지 박스, 사진 톤 오버레이, 히어로 B 고스트 페이드, 간격(AI 안내 32), 하이라이트/페르소나 제목 17·20, 구분선·모티프·면 리듬 전체 인상.
- 첫 화면 18종을 **한 장 접촉 시트**(`first-screens-18.png`)로 만들어 히어로 변형 분포·색 다양성·텍스트 가림·사진 비율을 눈으로 평가.
- 결함은 즉시 수정(v4 안, 토큰 한 곳 값 조정 우선). 수정한 페이지만 재캡처해 **전/후 한 장**. 눈 검수 결과표는 `review/444-verify/eye-review.md`.

## 2. 443 판단 3건 확정 (눈 검수 결과로 결정)
1. 페르소나 문장 17/700 굵기 — 과하면 토큰을 소 17/600 또는 body로 낮춤.
2. spec_table 라벨 글자 55% → 72%(면 위 대비 확보 목적) — 대비 4.5:1 충족하는 가장 약한 값으로.
3. FAQ 카드형 — 어색하면 hairline 줄 목록+간격으로 되돌리는 대신 카드 깊이·여백 값을 조정.
- 결정 근거(시트 경로)를 보고서에 남긴다.

## 3. 리듬 재설계 (코딩 핵심)
- 443차 gapBig 7·gapUneven 2: 같은 면 이웃 사이 빈 간격 112~128(v4 블록끼리 64+64 등). **인접 섹션 간격은 앞 섹션 아래 패딩과 뒤 섹션 위 패딩이 더해지는 구조**가 원인.
- **간격 해석 규칙(`lib/rhythm-v4.ts`)**: 같은 면 색이 이어질 때는 뒤 섹션 위 패딩을 줄이고(최대 64 이내), 면이 바뀔 때는 구획으로 읽히게 유지. 모든 값은 3단 스케일(32·48·64) 안. 라이브(Tailwind 클래스 쌍)와 export가 같은 계산 결과를 읽게(원천 한 곳).
- 린트 R17 gapBig·gapUneven을 **0~2건**으로 줄이는 것이 목표(합성 18종). 점수가 아니라 눈 검수 시트에서 **리듬이 좋아졌는지** 확인.
- 면 리듬(중립·틴트·그라데이션·반전 교차)이 산만하거나 단조로운 곳을 1번 눈 검수에서 찾으면 `assignFaces`/`assignMotifs` 규칙 조정.

## 4. 남은 섹션 마감
1. **step_card·brand_story·review_highlight 라이브 정밀 검토**(443차는 export만 검토, 라이브는 구조만 훑음): 제목·여백·행간·반경이 토큰과 다른 곳이 있으면 쌍둥이 수정.
2. **cta_price 하단**: 스타일 값(여백·글자 크기·깊이)만 토큰화. 애매하면 건너뛰고 사유 기록. **결제·`data-pz-buy`·스티키 바 구조는 한 글자도 변경 금지.**
3. **spec_table 값 칸 숫자 정렬**: 2열 표에서 값이 숫자+단위인 행만 우측 정렬/단위 작게 하는 규칙(원문 불변, 편집 UI 불변)을 시도하고, 눈 검수에서 어색하면 폐기.
4. 합성 말뭉치에 없는 **비교표·신뢰 근거 카드**를 픽스처에 추가(입력 풍부 3종)해 눈 검수와 린트에 포함.

## 5. 저장소 정리
- `public/qa-fixtures/synth/`(5.8MB)가 코드·스크립트·회귀·픽스처에서 참조되는지 `rg`로 확인하고, 참조가 없으면 삭제(참조가 있으면 목록만 보고). `public/qa-fixtures/fx/`·`review/442-verify/_probe` 같은 임시 폴더가 저장소에 있으면 같은 방식으로 정리(삭제는 이 클라우드 환경에서 가능).
- 정리 전후 `public/` 용량을 보고서에.

## 6. 검증·보고서
- 회귀(신규: rhythm-v4 간격 규칙, 추가 픽스처, 신규 토큰 값), check-v4-off 18종+추가분 diff 0, 라이브 off diff 0, 섹션 단독 off diff 0, 문자열 패리티, 린트 평균·최저 전/후(합성), R16·R17 수치, tsc.
- 보고서 `review/444cha-report.md` 맨 위에: push 성공 여부, 눈 검수 결과 요약(합격/결함/수정 건수), **폰트 폴백 때문에 확정 못 한 판단**, PC에서 다시 봐야 할 것(실제 폰트·라이브 화면·저장 세션 6종·next build·launch-smoke).
- 마지막에 **PC에서 실행할 검증 체크리스트**(순서대로 명령어와 확인 항목)를 정리: `git pull origin cloud-work` → `npm ci` → `tsc` → 회귀 → `next build` → `launch-smoke` → 저장 세션 6종 패리티·428 DOM·750폭 가로 넘침 → 눈 검수 → 합격 시 434차(배포 직전 점검).

## 7. 하지 않는 것
- 유료 호출·AI 이미지·새 문구 생성, push to main, 폰트 추가, 마이그레이션, 결제 코드·편집 UI·인터랙션 변경, 외부 사진 다운로드, dev 서버 실행, 434차 배포 점검 항목 자체.
