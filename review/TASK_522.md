# TASK 522 (개정판) — 토스 미니앱을 PC 버전과 같은 화면으로

> 이 문서는 이전 TASK_522(화면을 새로 그리는 안)를 **대체**한다. 이전 안으로 이미 만든 파일(`screens/Home.tsx` 등)이 있으면 버린다.

## 1. 목표 한 줄
토스 미니앱(`toss-app/`)의 점검·결과 화면을 **웹 `/label-check`(517·518차 화면)과 같은 컴포넌트·같은 CSS로** 보여 준다. 새로 디자인하지 않는다. **그대로 가져와서 폰 화면에 맞게 다듬는다.**

## 2. 왜 이렇게 하는가
- 지금 토스 화면(521차)은 체크박스·버튼·글상자가 나열된 임시 화면이라 "구글폼 같다"는 평가를 받았다.
- 웹 화면은 이미 여러 차수에 걸쳐 다듬어 사용자가 만족한 화면이다. 같은 것을 다시 그리면 품질이 떨어지고 두 화면이 계속 어긋난다.
- 521차 보고서는 재사용을 "포기"했다고 적었다. 직접 확인한 결과 **재사용을 막는 것은 아래 세 가지뿐이고 모두 풀 수 있다.**
  1. 웹은 Tailwind 기본 초기화(preflight)에 기대고 있다. `toss-app`에는 Tailwind가 없어서 버튼·제목·문단이 브라우저 기본 모양으로 나온다. → **작은 초기화 CSS**를 `toss-app`에 넣는다(3-B).
  2. Tailwind 유틸리티 클래스는 517 컴포넌트에서 **딱 두 종류**만 쓴다: `sr-only`(파일 입력 숨김), `underline-offset-2 hover:underline`. → 같은 이름의 CSS를 `toss-app`에 직접 정의한다. `sr-only`가 없으면 파일 입력이 화면에 그대로 보인다.
  3. `ResultView517`만 `next/link`를 쓴다. → 521차에 만든 `src/shims/next-link.tsx`로 이미 연결돼 있다.
- 그 밖의 517 컴포넌트(`CheckStart517`, `OcrReview517`, `CheckBusyOverlay517`, `FindingBody518`, `LabelSourcePanel517`, `useOcrThumbnail518`, `pin-match-517`)와 `OcrLimitBanner509`, `LawBaselineClient516`은 `next/*` 의존이 없고 일반 CSS(`label-check-507.css`, `label-check-517.css`)만 쓴다.

## 3. 해야 할 일

### A. 화면 로직: 웹 페이지를 그대로 옮긴다
- `app/label-check/page.tsx`(470줄)의 상태·흐름을 `toss-app/src/CheckScreen.tsx`로 옮긴다. **동작을 바꾸지 않는다.** 옮길 것:
  - 상태 전부(시장, 입력 옵션, 파일, 붙여넣기 글, 범위, 진행 문구, 오류, 결과, 글자 확인(`ocrReview`), 한도 안내 등)
  - `runCheck`, `startOcr`, `confirmOcr`, `recheck`, `onFile`, `showSample`, `focusPaste`와 그 안의 분기(HEIC 안내, PDF 크기 검사 `assertClientPdfSize`, `fetchOcrAvailable508`, 읽기 품질 값 전달, `OCR_LIMIT` 처리)
  - 렌더: `lc517` 바탕 + `lc517-wash` + `CheckBusyOverlay517` + `CheckStart517`(글자 확인은 `reviewSlot`에 `OcrReview517`) + `ResultView517` + `OcrLimitBanner509` + 오류 상자 + `샘플 결과 보기` + 문의 이메일 복사
- 스타일은 웹과 **같은 파일을 import**한다: `@/components/label-check/ui-507/label-check-507.css`, `@/components/label-check/ui-517/label-check-517.css`.
- 빼는 것(토스 규칙·환경 때문에):
  - 웹 머리말(`lc517-header`: Pagzly 로고, `내 결과`, `로그인`) — 토스 내비게이션 바가 이미 있다. 넣지 않는다.
  - 웹 바닥글(`LabelFooter511`) — 넣지 않는다.
  - 결과 화면의 `가입하면 결과를 다시 볼 수 있어요. 가입` 줄과 `인쇄/PDF로 저장` 버튼 — 토스에서는 가입 유도·외부 이동이 심사 사유이고 WebView에서 인쇄가 되지 않는다. 숨긴다(3-C의 선택 속성).
  - 저장(`save: true`)·`/api/label-check/runs` 호출 — 쓰지 않는다(`isMember={false}`, `save: false`).
- 제목 문구(토스 화면 맨 위, 웹의 `h1` 자리): `라벨을 올리면, 바로 읽어서 점검해요` (`바로 읽어서`만 파란색 `#1D4ED8`, 웹과 동일). 아래 한 줄은 웹의 "설정은 오른쪽에서 고르세요" 대신 `파일 하나면 충분해요. 설정은 아래에서 골라요.`
- 실험 화면(`LabPanel`)은 그대로 둔다. 이 제목을 3초 안에 5번 누르거나 `?lab=1`이면 열린다(지금 동작 유지).
- 521차의 `src/check/CheckFlow.tsx`, `src/check/SimpleResult.tsx`는 삭제한다.

### B. `toss-app` 전용 CSS (웹 CSS는 고치지 않는다)
- `toss-app/src/base.css` — **초기화 + 유틸리티**. 최소한 아래를 넣는다(Tailwind preflight에서 517 화면이 기대는 부분만).
  - `*, ::before, ::after { box-sizing: border-box; border: 0 solid; }` 계열, `html { -webkit-text-size-adjust: 100%; line-height: 1.5; }`, `body { margin: 0; }`
  - `h1~h6, p, figure, blockquote, dl, dd, pre { margin: 0; }`, `h1~h6 { font-size: inherit; font-weight: inherit; }`
  - `ol, ul, menu { list-style: none; margin: 0; padding: 0; }`
  - `button, input, select, textarea { font: inherit; color: inherit; margin: 0; padding: 0; }`, `button { background: transparent; cursor: pointer; }`, `button:disabled { cursor: default; }`
  - `img, svg, video, canvas { display: block; max-width: 100%; }`, `a { color: inherit; text-decoration: inherit; }`, `textarea { resize: vertical; }`
  - `.sr-only`(Tailwind와 같은 정의), `.underline-offset-2`, `.hover\:underline:hover`
  - 517 컴포넌트는 인라인 스타일로 테두리를 직접 주는 곳이 많다. 초기화를 넣은 뒤 **웹 화면과 나란히 놓고** 테두리·여백이 사라지거나 생긴 곳이 없는지 확인한다(3-E).
- `toss-app/src/toss-overrides.css` — **폰 전용 보정**. 모든 규칙은 `.toss-app`(최상위 래퍼 클래스) 아래로 범위를 준다. 웹의 `@media (max-width: 860px)` 규칙은 이미 적용되므로 그 위에 필요한 것만 얹는다.
  - 글꼴: 글꼴 파일을 추가하지 않는다. `font-family: "Noto Sans KR", system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif`. 모노는 `ui-monospace, "SF Mono", Menlo, monospace`.
  - 높이: `.lc517 { min-height: 100dvh; }`(주소창 없는 WebView에서 `100vh` 어긋남 방지).
  - 위 여백: 머리말이 없으므로 본문이 토스 내비게이션 바 바로 아래에서 시작한다. 위 여백 16~20px.
  - 제목: 웹 40px → 폰 **28px**(`clamp(26px, 7.4vw, 30px)`), 줄간격 1.25, `text-wrap: balance`, `word-break: keep-all`.
  - 파일 놓는 곳(`.lc517-drop`): 웹 `min-height: 420px` → 폰 **280~300px**. 안쪽 문서 그림은 그대로 두되 화면 폭을 넘지 않게.
  - 미리보기(`.lc517-preview`): 위에 뜨는 파일 이름 알약과 `다시 고르기` 버튼이 좁은 폭(360px)에서 서로 겹치지 않게(이름은 말줄임).
  - **입력 글자 크기 16px 이상**: `textarea`, `input`은 모두 16px 이상으로 올린다. iOS는 16px 미만 입력칸에 초점이 가면 화면을 자동 확대한다(웹은 15px인 곳이 있다).
  - 붙여넣기 글상자: 웹 `min-height: 360px` → 폰 220px.
  - 하단 고정 버튼(`.lc517-mobile-bar`, `.lc507-bar`): 안전 영역(`env(safe-area-inset-bottom)`) 반영 확인. 글상자에 초점이 가서 키보드가 올라온 동안에는 하단 고정 막대가 입력을 가리지 않게 한다(초점 중에는 막대를 숨기거나 `position: static`).
  - 글자 확인(`.lc517-ocr`): 썸네일이 위, 글상자가 아래로 쌓이고(웹 모바일 규칙 있음) 버튼 두 개가 한 줄에 꽉 차게.
  - 결과: 요약 카드(`.lc517-summary`) 1단, 라벨 원문 패널(`.lc517-source`) 높이 제한 안에서 **안쪽만** 스크롤, 필터 줄(`.lc517-filters`)은 화면 폭을 넘으면 **그 줄만** 가로 스크롤(페이지 전체가 가로로 밀리면 안 된다), 펼친 카드 본문(`.lc518-open`) 왼쪽 들여쓰기 42px → 폰에서는 0~12px.
  - 터치: 누를 수 있는 것은 높이 44px 이상. `@media (hover: none)`에서 `:hover` 이동·그림자 효과를 끈다(터치 후 붙어 있는 hover 방지). `-webkit-tap-highlight-color: transparent`. 누를 때 `:active`로 살짝 눌림(scale 0.98).
  - `overscroll-behavior-y: none`, 가로 스크롤 금지(`overflow-x: clip`은 웹 규칙에 이미 있다. 360px에서 실제로 0인지 확인).
  - `prefers-reduced-motion` 처리는 웹 CSS에 있다. 새로 넣는 움직임에도 같은 처리를 한다.
- 이모지, 새 글꼴 파일, 새 npm 패키지(TDS 포함) 추가 금지.

### C. 공용 컴포넌트에 허용하는 변경 (딱 두 군데, 기본값은 지금과 100% 같게)
웹 화면은 **글자 하나도 달라지면 안 된다.** 아래 선택 속성만 추가하고, 속성을 주지 않으면 지금 결과와 같아야 한다(테스트로 보장).
1. `CheckStart517`에 `touch?: boolean`, `accept?: string`
   - `touch`가 참일 때만 문구 3개를 바꾼다.
     - `라벨 PDF나 사진을 여기에 놓으세요` → `라벨 사진이나 PDF를 골라 주세요`
     - `눌러서 파일 고르기` → `여기를 눌러 파일을 골라요`
     - `준비 완료 · 오른쪽에서 점검하기를 누르세요` → `준비 완료 · 아래 점검하기를 눌러요`
   - `accept`가 있으면 파일 입력의 `accept`를 그 값으로 쓴다(없으면 기존 계산값).
2. `ResultView517`에 `embedded?: boolean`
   - 참일 때만 `가입하면 결과를 다시 볼 수 있어요` 줄(및 `내 결과` 줄)과 `인쇄/PDF로 저장` 버튼을 그리지 않는다. 나머지는 동일.
- 이 두 군데 말고 공용 컴포넌트·공용 CSS·`lib/`를 고쳐야 할 것 같으면 **고치지 말고** `toss-overrides.css`로 해결한다. 그래도 안 되면 멈추고 보고서 맨 위에 "막힌 곳"으로 적는다.

### D. 토스 환경 맞춤
- **뒤로가기**: 단계(시작 → 글자 확인 → 결과)를 `history.pushState`/`popstate`에 쌓는다. 토스 내비게이션의 뒤로가기를 누르면 결과 → 시작으로 돌아가고, 시작 화면에서는 앱이 닫힌다. 화면 안에 자체 뒤로가기 버튼은 만들지 않는다(토스 규칙: 이중 노출 금지). `다시 고르기`, `취소` 같은 기존 버튼은 그대로 둔다.
- **설정 상수** `toss-app/src/config.ts`
  - `TOSS_ACCEPT`: 기본 `"application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"`. PDF가 토스 WebView에서 안 되는 것으로 실측되면 이 값에서 PDF만 빼서 대응한다(그때 `touch` 문구도 사진만 말하게 상수 하나로 같이 바뀌어야 한다).
  - `TOSS_SHOW_US_MARKET`: 기본 `true`(웹과 동일하게 한국·미국 선택). 끄면 한국 고정.
- **외부 이동 금지**: `href="http…"`·`window.open`·`location.href` 이동 없음. 문의 이메일은 웹과 같이 "눌러서 복사"만.
- **API**: 521차 그대로(`labelApiUrl`, 기본 `https://pagzly.com`). 서버 코드는 건드리지 않는다.
- **번들 검사 가드**: `toss-app/scripts/scan-bundle-eval.mjs`를 만들어 `vite build` 뒤 `dist/` 전체에서 `eval(`·`new Function(`이 나오면 빌드를 실패시킨다. `ait:build`를 `node scripts/copy-label-check-pdfjs.mjs && vite build && node scripts/scan-bundle-eval.mjs && ait build`로 바꾼다(토스가 `eval`로 번들을 반려한 전례가 있다).
- 사용자 파일·글자 원문을 콘솔·로그에 남기지 않는다.

### E. 눈으로 확인 (이번 차수의 핵심 — 건너뛰지 말 것)
- PC에서 `toss-app`의 `npm run dev`를 띄우고, 브라우저 개발자 도구의 폰 화면(가로 **360, 390, 430**)으로 아래를 본다. 같은 폭으로 `https://pagzly.com/label-check`도 나란히 연다.
- 확인표(보고서에 표로 적는다. 각 줄에 `같음 / 다름(이유) / 못 봄`):
  1. 시작 화면(파일 없음) — 버튼·칩·탭이 웹과 같은 모양인가(회색 기본 버튼이 보이면 초기화 누락)
  2. 파일을 고른 뒤 미리보기(사진 1장) — 알약·`다시 고르기` 겹침 없음
  3. `문구 붙여넣기` 탭 — 글상자, 범위 칩, 글자 수
  4. 점검 중 화면(`CheckBusyOverlay517`)
  5. 결과 화면(`샘플 결과 보기`로 열면 서버 없이 볼 수 있다) — 요약, 필터, 카드 접힘/펼침, `BEFORE`/`AFTER`, 복사 버튼, 하단 복사 막대
  6. 결과에서 토스 뒤로가기(브라우저 뒤로) → 시작 화면으로 돌아옴
  7. 360px에서 가로 스크롤 0(`document.documentElement.scrollWidth === clientWidth`)
  8. 글상자에 초점을 줬을 때 확대되지 않음(글자 16px 이상)
- 스크린샷을 `review/522-screens/`에 저장한다: `start-390.png`, `picked-390.png`, `text-390.png`, `result-390.png`, `result-open-390.png`, `start-360.png`, 그리고 비교용 `web-result-390.png`. 실제 고객 라벨 사진은 쓰지 않는다(샘플 결과·예시 문구만). 못 찍으면 "못 찍음"과 이유를 적는다.
- **웹과 다르게 보이는 곳은 전부 "의도한 차이"(3-A에서 뺀 것, 3-C의 문구 3개, 3-B의 폰 보정)여야 한다.** 그 밖의 차이는 버그로 보고 고친다.

### F. 테스트
- `scripts/regression/label-check-522.ts`를 만들고 `regression:label-check`에 넣는다.
  1. `toss-app/src`가 `CheckStart517`, `OcrReview517`, `ResultView517`, `CheckBusyOverlay517`을 import해서 쓴다. `SimpleResult`·`CheckFlow`는 없다.
  2. `toss-app`이 `label-check-507.css`와 `label-check-517.css`를 import한다.
  3. `base.css`에 `.sr-only`와 버튼 초기화(`button` 배경 투명)가 있다.
  4. 기본값 보장: `CheckStart517`에서 `touch`가 없을 때의 문구 3개와 `ResultView517`에서 `embedded`가 없을 때의 `가입`·`인쇄/PDF로 저장`이 소스에 그대로 남아 있고, 새 문구는 `touch` 분기 안에만 있다(정적 검사).
  5. `toss-app` 화면이 `embedded`와 `touch`를 넘긴다. `isMember`를 참으로 넘기지 않는다. `save: true`가 없다.
  6. `toss-app/src`에 `href="http`, `window.open`, `location.href =`, `window.print`가 없다. 금지어(`무료`, `요금`, `1분`, `위반입니다`, `적법`, `완벽`, `보장`, `안전합니다`, `100%`) 없음(단 재사용하는 웹 컴포넌트 파일은 검사 대상이 아니다. `toss-app/src`만).
  7. `history.pushState`와 `popstate`를 쓴다. `config.ts`에 `TOSS_ACCEPT`, `TOSS_SHOW_US_MARKET`이 있다.
  8. `toss-overrides.css`의 모든 규칙이 `.toss-app` 범위 안이고, 입력칸 16px 규칙과 `prefers-reduced-motion`·`hover: none` 처리가 있다.
  9. `scan-bundle-eval.mjs`가 있고 `ait:build`가 호출한다.
  10. 521 가드 중 새 구조와 안 맞는 것(예: 제목 문구, `SimpleResult` 관련)은 고치고 무엇을 왜 고쳤는지 보고서에 적는다. `법적 판단이 아닙니다` 고지는 재사용 컴포넌트가 보여 주므로, 그 고지가 화면에 나오는 경로(시작 화면의 `DISCLAIMER_PRINT_485`, 결과 화면 바닥 문구)를 검사한다.
- 통과해야 하는 것: 루트 `npx tsc --noEmit`, `toss-app`의 `npx tsc --noEmit`, `toss-app`의 `npm run build`, 기존 회귀 33개 전부. `npm run ait:build`는 실행해 보고 결과(성공/막힌 단계와 에러 한 줄)를 적는다.

### G. 보고서와 커밋
- `review/522cha-report.md`
  - 맨 위 **"확인하지 못한 항목"**: 토스 폰 실측, 실제 사진·PDF·HEIC 올리기, 실제 서버 점검 결과 화면, 키보드가 올라왔을 때 하단 막대, 뒤로가기의 토스 내비게이션 동작 등.
  - 그 다음 3-E의 확인표와 스크린샷 목록.
  - "웹과 다른 곳" 목록(의도한 차이만 있어야 한다).
  - 해요체가 아닌 문구 목록(웹과 같은 문구를 쓰므로 이번에는 고치지 않는다. 목록만).
- 커밋 최대 4개. 마지막 커밋에 코드 변경이 들어가야 한다. cloud-work에만 push. main에는 push하지 않는다.

## 4. 하지 말 것 (요약)
- 화면을 새로 디자인하지 않는다. 새 카드·새 목록·새 단계 화면을 만들지 않는다.
- 웹 화면(`app/`), 공용 CSS, `lib/`, 서버, 판정 로직, 규칙 JSON을 고치지 않는다(3-C의 선택 속성 두 군데 제외).
- 루트 `package.json`을 고치지 않는다. `toss-app`에도 패키지를 추가하지 않는다.
- 확인하지 않은 것을 "확인함"으로 적지 않는다.
