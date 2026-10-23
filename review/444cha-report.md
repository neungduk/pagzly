# 444차 보고서 — 클라우드 눈 검수와 리듬 재설계

실행 환경: 클라우드 세션(`.env`·외부 키·dev 서버 없음), 정적 export 캡처만. 유료 API 0회, 마이그레이션 없음, 결제 코드·편집 UI·인터랙션 미수정. 변경은 모두 `NEXT_PUBLIC_DESIGN_V4` 안.

## 0. 먼저 읽을 것
- **push: 성공.** 모든 커밋이 `cloud-work`에 올라갔다(이번 차수 403 없음). main에는 push하지 않았다.
- **눈 검수 결과: 합격 9항목(그중 값 조정 1·확장 1), 결함 5건(D1~D5) + 도구 결함 2건 → 전부 수정, 미해결 0.** 합성 21종 중 7종은 끝까지, 11종은 첫 화면·섹션 단독으로 봤다. 표: `review/444-verify/eye-review.md`.
- **폰트 때문에 확정 못 한 판단: 없음.** `@fontsource/noto-sans-kr`의 woff2를 `node scripts/build-detail-fonts.mjs`(gitignore 대상 `public/fonts`)로 복사해 **실제 Noto Sans KR로 렌더**했다(시스템 폴백 아님). 대신 **라이브(React/Tailwind) 화면과 실사진은 한 번도 못 봤다.**
- 리듬: 같은 면 이웃 사이 빈 간격(gapBig) **7 → 0**.
- 폐기 1건: spec_table 값 칸 숫자 정렬(눈 검수에서 어색해 코드 되돌림).
- 완료 못 한 것: **4-1 라이브 정밀 검토는 부분만**(아래), 4-2 cta_price는 깊이(그림자)만.
- 시작 시점(443차 끝 `df33280`) 대비 off 출력 문자열 diff 0(export 21종·라이브 21종·섹션 단독 944건·합성 비교표/신뢰 근거).

## 1. 커밋(오래된 순, `df33280` 이후)
| 항목 | 커밋 |
|---|---|
| 지시서 저장 | `2b4632f`(초안) · `61e52b3`(전문) |
| 1 눈 검수 도구 + 플레이스홀더 대비 | `bf787fc` |
| 1 결함 수정(D1·D2·D4·D5) | `7fad74f` |
| 3 리듬 재설계(`lib/rhythm-v4.ts`) | `5e77599` |
| 4-4 입력 풍부 픽스처 3종 + 퀵포인트 여백 | `7dd2a24` |
| 4-3 spec 숫자 정렬(폐기, 되돌림) | `3e4381e` |
| 2 443 판단 3건 확정 | `fd041cd` |
| 5 저장소 정리 | `cccc817` |
| 1 결함 수정2(고스트 22%·D형 아래) + 전/후 도구 | `e8a9e10` |
| 1 눈 검수 결과표·전/후 이미지 | `107c084` · `8154980` |

## 2. 눈 검수(1) 요약
- 도구: `scripts/eye-lib.ts`(서버 없이 export HTML 열기: Playwright route, 사진·폰트는 저장소 파일, 외부 요청 차단), `eye-capture.ts`(21종 × 390/750, 844px 단위 시트 + 첫 화면 접촉 시트), `eye-sections.ts`(말뭉치에서 빠지는 섹션을 단독 캡처 + 합성 입력), `eye-compare.ts`(전/후).
- 결함:
  - **D1** 뷰티 강조 카드: 정보 면 CSS가 강조색으로 칠한 카드에 흰 카드용 어두운 제목 → v4+info에서 lightEm 제외(라이브·export).
  - **D2** 일러스트 배너 글 스크림이 390px에서 화면 좌우로 잘림 → `inset:-10% -4%`(토큰).
  - **D3** 사진 칸이 비어 보임(플레이스홀더가 면과 비슷) → 진한 도형·그림자·지면 띠.
  - **D4** 구매 띠 위로 번지는 스티키 그림자 → v4 none.
  - **D5** C·D형 고스트 글자 잘림 → 페이드 확장(좌우 22%, D형 아래 30%).
  - (도구) lazy·decode 때문에 빈 칸으로 찍히던 것 수정.
  - (DOM 측정) 새 픽스처가 드러낸 뷰티 퀵포인트 12px 여백(3단 밖) → 섹션 0 + 카드 바깥 12.
- 전/후 이미지(커밋됨): `review/444-verify/before-after/*.png` 7장. 시트는 로컬(재생성: `npx tsx scripts/eye-capture.ts`).
- 못 본 것: 라이브 화면, 실사진, 750폭 전체 페이지 시트(만들기만 함), 합성 11종의 중간 부분.

## 3. 443 판단 3건 확정(2)
1. **페르소나 문장 17/700: 유지.** `sections/target_persona-w390.png` — 짧은 문장이 라벨로 읽혀 과하지 않음.
2. **spec_table 라벨 글자: 0.72 → 0.65.** 합성 21종 accent × (보통 행·줄무늬 행) 면 위에서 4.5:1을 만족하는 가장 약한 잉크 알파가 0.64라 0.65로 확정(55%는 최저 3.54:1, 72%는 5.85:1). 토큰 `SPEC_LABEL_INK_ALPHA`, 회귀 `decisions-444`가 "한 단계 더 낮추면 미달"까지 확인.
3. **FAQ 카드형: 유지**(깊이·여백 값 조정 불필요). `sections/faq-w390.png`·`faq-w750.png`.
- 근거 시트(로컬): `review/444-verify/sections/…`.

## 4. 리듬 재설계(3)
- 원인: 이웃 섹션 사이 빈 간격 = 앞 섹션 아래 여백 + 뒤 섹션 위 여백(겹치지 않음).
- 규칙 `lib/rhythm-v4.ts`(원천 한 곳): `resolveTopPad` — 같은 면 이웃이면 앞 아래 + 뒤 위 ≤ 96(64+32)이 되는 3단 스케일 값(0·32·48·64), 면이 바뀌면 그대로. 표시 계획 마지막에 `markTightTops`가 같은 면 임팩트(와 접점 띠 바로 뒤)에 `rhythm:"tight"`를 달고, 라이브·export가 같이 쓰는 `impactHtml`이 첫 태그 위 여백만 줄인다 → Tailwind 클래스 쌍 없이 같은 결과. 모티프가 있는 v4 블록은 제외(모티프 안전 영역 회귀). 면 판정은 `faceKeyOf`(임팩트만).
- **한계:** 임팩트가 **아닌** 이전 섹션(표·FAQ·주의 등 라이브 Tailwind 클래스 / export 변수)은 계획에 면 정보가 없어 이번 규칙 밖이다. 그라데이션 면은 "흰 쪽에서 시작"으로 보고 흰 면과 같은 면으로 쳤다(측정 지표와 맞추기 위한 판단, 눈으로 어색하지 않은 것까지만 확인).
- 측정(합성 21종 export DOM, 같은 지표로 `df33280` 대비): gapBig **7 → 0**, gapUneven 0 → 0(지표 보강: 가장자리까지 닿는 사진·배너와 맞닿은 쪽은 불균형 비교에서 제외), 3단 밖 여백 0, 급변 0. 지표 정의·근거는 `scripts/design-metrics-dom.ts` 주석.
- 면 리듬(`assignFaces`/`assignMotifs`)은 눈 검수에서 산만·단조한 곳을 못 찾아 조정하지 않았다.

## 5. 남은 섹션 마감(4)
1. **step_card·brand_story·review_highlight 라이브 정밀 검토: 부분만.** export 단독 캡처(step_card·brand_story)는 합격이고, 라이브 코드는 클래스를 일부 대조했을 뿐 전수하지 못했다. **review_highlight는 말뭉치에 없어 눈으로도 못 봤다(미완료).** 변경 없음.
2. **cta_price: 깊이(그림자)만**(D4, 스타일 값). 여백·글자 크기 토큰화는 눈 검수에서 결함이 없고 라이브·export 값이 같아 건드리지 않았다. `data-pz-buy`·구조는 한 글자도 안 바꿨고 회귀 `eye-fixes-444`가 구매 섹션 수·마크 수를 확인한다.
3. **spec_table 값 칸 숫자 정렬: 시도 후 폐기.** 2열 표에서 "용량 | 30 mL"만 오른쪽 끝에 붙어 열이 들쭉날쭉(`review/444-verify/discarded/spec-numeric-align-w390.png`). 숫자 정렬은 값 열이 여럿인 비교표에서만 유지.
4. **입력 풍부 픽스처 3종**(`fx-compare-tech/beauty/fashion`, `scripts/gen-rich-fixtures.ts`): 판매자 비교 입력 3행 + 신뢰 근거 카드. 말뭉치가 18 → 21종. 눈 검수와 린트에 포함. 비교표·신뢰 근거는 이 페이지들에서 임팩트 블록으로 표시된다(레거시 `comparison_table`/신뢰 카드 마크업은 여전히 합성 입력 `eye-sections`로만 직접 본다).

## 6. 저장소 정리(5)
- 삭제: `public/qa-fixtures/synth/`(62개, 5.8MB; 픽스처·코드·회귀가 이미지로 읽지 않음 — `scripts/sanitize-fixtures.ts`는 이 폴더를 새로 만드는 도구, `gen-fixture-placeholders.ts`는 있으면 크기만 읽고 없으면 ph에서 읽음), 루트 `_verify-146cha/`(10 jpg, 24MB, 참조 0), `public/_verify146/*.jpg`(10개, 24MB, 참조 0 — 스크립트 5개가 읽는 `reviews_148cha.txt`는 유지).
- `public/qa-fixtures/fx/`·`review/442-verify/_probe`: 저장소에 없음.
- **추적 파일 용량(public + `_verify-146cha`): 78,298,925 B → 22,569,225 B(약 53MB 감소).** 이 중 플레이스홀더 `public/qa-fixtures/ph`는 1.3MB.
- 주의: `sanitize-fixtures.ts`를 저장 세션에서 다시 돌리면 픽스처가 synth 주소로 되돌아간다 → 이어서 `gen-fixture-placeholders.ts`를 돌려야 한다.

## 7. 검증
| 항목 | 결과 |
|---|---|
| 회귀 `scripts/regression/run-all.ts` | **91/91**(시작 88 → 신규 3: `eye-fixes-444`·`rhythm-v4`·`decisions-444`) |
| tsc | 새 오류 0(기존 1건 `app/layout.tsx(50,50) LayoutProps` — next typegen 산출물 필요) |
| export v4 off diff(`check-v4-off`) | 0 — 21종(기준 = `df33280` 코드 + 새 픽스처로 저장) |
| 라이브 v4 off diff(`check-v4-off-live`) | 0 — 21종 |
| 섹션 단독 off diff(export+라이브) | 0 / 944건 |
| 합성 비교표·신뢰 근거 off | `df33280`과 동일 |
| 문자열 패리티 `twin-sections` | 통과(8섹션 + 합성 3종, 라이브 = export) |
| 린트 21종 평균·최저(각 트리의 자기 규칙) | 전 82.4·73 → 후 83.0·74 |
| R16 | 잔여 0 → 0 (저장 세션 6종이 없어 442차 "잔여 8페이지"는 여전히 재측정 불가) |
| R17(페이지 수) | 8 → 0 (전 8은 새 픽스처의 퀵포인트 12px 여백 등, 3단 밖 warn 포함) |
| gapBig / gapUneven | 7 → 0 / 0 → 0 |

Playwright 리비전 불일치(`chromium_headless_shell-1234` 없음)는 443차처럼 설치된 `/opt/pw-browsers`의 headless_shell을 스크래치 폴더에 링크해 `PLAYWRIGHT_BROWSERS_PATH`로 우회했다(저장소 변경 없음).

## 8. 미검증·한계(PC에서 다시 볼 것)
- **라이브 화면**(React/Tailwind): 문자열 패리티는 통과하지만 실제 렌더는 못 봄. 특히 D1(info 강조 카드)·D2(배너 스크림)·D4(구매 띠)·highlight/faq/spec 등 443·444차 변경 전부.
- **실제 사진**: 사진 톤 오버레이의 "통일감", 고스트 페이드와 실사진 위 가독성, 밝기·색 편차.
- 저장 세션 6종(s411·s414·s417·s418·s422·selec) 기반 R16·패리티·428 DOM·750폭 가로 넘침.
- `next build`, `launch-smoke`: 이번에도 안 함.
- 750px 전체 페이지 시트는 열어 보지 않음. 합성 11종은 중간 부분을 안 봄.
- "off = 438차" 증명은 **443차 끝 코드(`df33280`)** 기준(438차 원본 스냅샷·저장 세션이 저장소에 없음).
- review_highlight 눈 검수 없음, 라이브 정밀 검토 부분.
- 히어로 면 색 중복(같은 파란 면 3종)·퀵포인트 줄 사이 좁은 흰 띠는 관찰만(수정 안 함).

## 9. 적용 안 한 것
- spec 숫자 정렬(폐기), cta_price 여백·글자 크기, 임팩트 아닌 이전 섹션의 같은 면 간격 규칙, 히어로 색 중복 조정.

## 10. PC에서 실행할 검증 체크리스트(순서대로)
1. `git pull origin cloud-work` — 확인: 최신 커밋 `8154980` 이후 기록, 충돌 없음.
2. `npm ci`
3. `node scripts/build-detail-fonts.mjs` (dev/build 전에 자동 실행되지만 눈 검수 캡처에는 필요) — 확인: `public/fonts` 생성.
4. `npx tsc --noEmit` — 확인: 새 오류 0(`LayoutProps` 1건은 `next build`/typegen 뒤 사라질 수 있음).
5. `npx tsx scripts/regression/run-all.ts` — 확인: **91/91**. Playwright 리비전 오류가 나면 `npx playwright install chromium` 뒤 재실행.
6. off 증명(PC에는 438차 원본이 있을 것): 438차 커밋 worktree에서 `npx tsx scripts/check-v4-off.ts --write` · `OUT=… npx tsx scripts/check-v4-off-live.tsx --write` 로 기준을 만든 뒤 현재 트리에서 `NEXT_PUBLIC_DESIGN_V4=off npx tsx scripts/check-v4-off.ts` · `check-v4-off-live.tsx` — 확인: diff 0. (이번에 합성 픽스처 사진 주소·퀵포인트·구매 띠 CSS가 바뀌었으니 438차 기준은 같은 픽스처로 다시 저장해야 비교 가능.)
7. `npx next build` — 확인: 성공.
8. `launch-smoke`(기존에 쓰던 명령 그대로) — 확인: 53/53.
9. 저장 세션 6종: 패리티(`scripts/255cha-parity-verify.ts` 등 기존 명령)·428 DOM 24/24·750폭 가로 넘침 0 — 확인: 0.
10. 눈 검수(PC 크롬, 실제 라이브 화면): `npm run dev` 후 저장 세션 6종 + `/dev/detail-preview` 합성을 390·750폭으로 — 확인: D1(뷰티 강조 카드 제목 흰색), D2(배너 카드 안 잘림), D4(구매 띠 위 그림자 없음), FAQ 카드·spec 라벨 면·비교표 숫자 열, 사진 톤 오버레이(실사진), 고스트 페이드, 간격(AI 안내 32, 같은 면 이웃 ≤96). 정적 export 캡처가 필요하면 `npx tsx scripts/eye-capture.ts`.
11. 합격 시 434차(배포 직전 점검)로.

## 11. 전체 상태 요약
- **v4 기본 on 배포 가능 여부**: 코드·회귀 기준으로는 가능하다(91/91, 플래그 off가 443차 끝과 문자열 동일 → 즉시 롤백 가능, 결제·편집 UI 미수정). 이번에 처음으로 export 화면을 실제 폰트로 보고 결함 5건을 잡았다. 그러나 **라이브 화면·실사진·저장 세션이 전부 비어 있어** "배포 가능"이 아니라 "위 PC 체크리스트(특히 9·10)를 통과하면 가능"이라고 판단한다.
- **434차·유료 실사진 검증 전 남은 위험**
  1. 라이브 화면에서 443·444차 변경(특히 D1·D2·D4와 FAQ·표·카드)의 실제 모양 — 문자열 패리티는 통과, 렌더는 미확인.
  2. 실사진 위 오버레이·고스트 페이드·텍스트 가림.
  3. 임팩트가 아닌 이전 섹션의 같은 면 간격(규칙 밖)과 gapBig 밖의 리듬.
  4. 저장 세션 기반 R16 잔여 8페이지 해소·428 DOM·750폭 — 합성에서만 0.
  5. 히어로 면 색 중복·퀵포인트 틈 같은 관찰 사항.
  6. review_highlight 미확인, 라이브 정밀 검토 부분.
