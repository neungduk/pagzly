# TASK 521 — 토스(앱인토스) 미니앱용 정적 점검 화면 (실험 우선)

## 왜 하는가
- 토스 개발자 커뮤니티 운영진 답변으로 확인된 것
  - **Next.js SSR은 미니앱으로 못 올린다.** 정적 번들(CSR/SSG)만 된다.
  - 우리 서버 주소로 넘기거나 외부 URL을 불러오는 방식은 **심사에서 반려**된다. 즉 `pagzly.com`을 그대로 띄울 수 없다.
  - 번들은 공식 `ait build`(`@apps-in-toss/web-framework`)로만 만든다. `createArtifact` 직접 호출은 지원하지 않는다.
  - `<input type="file">`은 txt 기준으로 가능하다는 답이 있다. 사진은 앨범 API도 있다. **PDF·HEIC는 확인된 답이 없다.**
- 그래서 이번 차수는 "토스 안에서 **사진·PDF 올리기 → 우리 API로 점검 → 결과 보기**가 실제로 되는지"를 **직접 실험**할 수 있는 정적 화면을 만든다. 예쁜 화면은 목표가 아니다. 실험 결과가 먼저다.
- 520차에서 서버 쪽 준비(API 절대 주소, 토스 전용 CORS, 토스 일일 한도)는 끝났다. 이번에는 **클라이언트 쪽 별도 프로젝트**만 만든다.

## 원칙 (어기면 안 되는 것)
- **웹 사이트(pagzly.com)의 동작·화면·빌드는 달라지면 안 된다.** 루트 `package.json`의 의존성은 바꾸지 않는다. 루트 `next build`가 새 폴더 때문에 깨지면 안 된다.
- 판정 로직·규칙 JSON·기존 `/label-check` 화면·기존 문구 수정 금지.
- 새 npm 패키지는 **새 폴더 안(`toss-app/package.json`)에서만** 추가한다. 루트에는 추가 금지.
- 사용자 파일·글자 원문을 콘솔·로그·화면 진단 영역에 **그대로 남기지 않는다**(파일 이름·크기·형식·길이 정도만).
- 고객 화면 문구에 `무료`, `요금`, `1분`, `위반입니다`, `적법`, `완벽`, `보장`, `안전합니다`, `100%` 금지. `법적 판단이 아닙니다` 고지는 화면에 둔다.
- 토스 로그인·인앱결제·저장 기능(로그인 전용 `/api/label-check/runs`)은 이번에 **붙이지 않는다**.

## A. 새 프로젝트 `toss-app/` (Vite + React + TypeScript)
- 위치: 저장소 루트의 `toss-app/`. 자체 `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `granite.config.ts`.
- 의존성(이 폴더 안에서만): `react`/`react-dom`(루트와 같은 버전), `vite`, `@vitejs/plugin-react`, `typescript`, `@apps-in-toss/web-framework`.
  - `@apps-in-toss/web-framework`는 **공식 문서(https://developers-apps-in-toss.toss.im)의 WebView 튜토리얼을 먼저 읽고** 그 안내대로 설치·설정한다. 요구 SDK 버전(3.x 이상)을 지킨다. 문서와 이 지시서가 다르면 문서를 따르고 보고서에 적는다.
  - 빌드 스크립트는 `ait build`를 쓴다(공식 방식). 일반 웹용 `vite build`도 따로 둔다(결과물 `toss-app/dist`).
- `granite.config.ts`의 `appName` 등 사람이 정해야 하는 값은 `PAGZLY_TOSS_APP_NAME` 같은 **임시 자리표시자**로 두고 보고서 "사용자가 할 일"에 적는다. 임의로 정하지 않는다.
- `@/` 별칭은 **저장소 루트**를 가리키게 한다(`vite.config.ts`의 `resolve.alias`, `tsconfig` `paths`). 기존 클라이언트 모듈을 복사하지 말고 **그대로 import해서 재사용**한다.
  - 재사용 대상(클라이언트 전용인 것만): `lib/label-check/client-submit.ts`, `client-ocr-submit.ts`, `client-ocr-prepare.ts`, `client-extract-pdf.ts`, `api-errors.ts`, `types.ts`, `api-base-520.ts`, `ui-status-507.ts` 등.
  - 서버 전용 모듈(`extracted-payload.ts`, `load-rules*.ts`, `extract-pdf.ts`, `run-check*.ts`, `fs`/`node:` 사용 파일)은 import하지 않는다. 빌드에 `fs`가 들어가면 실패로 본다.
- `next/link`를 쓰는 기존 컴포넌트(`ResultView517` 등)를 재사용하려면 `vite.config.ts`에서 `next/link`를 **작은 대체 파일**(`toss-app/src/shims/next-link.tsx`, `<a>` 렌더)로 연결한다. 이 방식으로 안 풀리면(다른 `next/*` 의존이 더 나오면) 기존 결과 컴포넌트 재사용을 포기하고 **B-3의 단순 결과 목록**으로 간다. 어느 쪽으로 갔는지 보고서에 적는다.
- API 주소: 520차 `labelApiUrl`이 `process.env.NEXT_PUBLIC_LABEL_API_BASE`를 읽는다. Vite에서는 `define`으로 `process.env.NEXT_PUBLIC_LABEL_API_BASE`를 `VITE_LABEL_API_BASE` 값(기본 `https://pagzly.com`)으로 치환한다. 루트 코드는 수정하지 않는다.
- PDF 도구 경로: 현재 `client-ocr-prepare.ts`·`client-extract-pdf.ts`의 `PDFJS_BASE`가 `"/label-check-pdfjs"`로 **고정**이다. 토스 번들에서는 이 절대 경로가 맞지 않을 수 있다. 아래 최소 변경만 허용한다.
  - 두 파일에서 기준 경로를 `window.__PAGZLY_PDFJS_BASE__`가 있으면 그 값을, 없으면 기존 `"/label-check-pdfjs"`를 쓰도록 바꾼다. **기본 동작은 글자 그대로 같아야 한다**(웹 영향 없음, 테스트로 보장).
  - `toss-app`은 시작할 때 이 값을 `./label-check-pdfjs`(상대 경로)로 설정하고, 빌드 때 `pdf.min.js`·`pdf.worker.min.js`를 `toss-app/public/label-check-pdfjs/`로 복사한다(`scripts/copy-label-check-pdfjs.mjs`와 같은 방식, 새 스크립트는 `toss-app/scripts/`에).
  - 복사본은 git에 올리지 않는다(`.gitignore`).
- 루트 쪽 격리: 루트 `tsconfig.json`의 `exclude`에 `toss-app`을 추가하고, `eslint`도 무시하게 한다. 루트 `npx tsc --noEmit`이 그대로 통과해야 한다. **`scripts/vercel-ignore-docs.sh`는 수정하지 않는다.**

## B. 화면 (단일 페이지, 필요한 것만)
### B-1 실험 화면 (가장 중요, 먼저 만든다)
화면 맨 위에 "실험" 영역을 둔다(이번 차수에서는 항상 보이게 하고, 나중에 숨길 수 있도록 `?lab=1` 같은 스위치 한 줄로 분리해 둔다).
1. 파일 선택 버튼 3개(각각 다른 `accept`):
   - `accept="image/*"` (사진)
   - `accept="application/pdf,.pdf"` (PDF)
   - `accept="image/*,.heic,.heif,application/pdf"` (전체)
2. 파일을 고르면 **진단 표**를 보여 준다(원문 내용은 제외): 파일 이름, 크기, `file.type`, 확장자, `FileReader`로 앞 8바이트를 읽어 성공 여부와 매직 바이트 종류(PDF/JPEG/PNG/HEIC 추정), 읽는 데 걸린 시간.
3. 버튼 4개로 단계별 실험:
   - `PDF 읽기 도구 불러오기` → pdfjs 스크립트 로드 성공/실패와 에러 문구.
   - `PDF 글자 추출` → `client-extract-pdf` 호출, 성공 시 **글자 수와 쪽수만** 표시.
   - `사진 준비(축소)` → `client-ocr-prepare`의 이미지 준비 함수 호출, 성공 시 가로×세로·조각 수만 표시.
   - `서버 연결 확인` → `GET {API}/api/label-check/ocr`와 `GET {API}/api/law-watch/baseline`을 부르고 상태 코드와 CORS 성공 여부만 표시.
4. 진단 결과를 한 번에 복사하는 버튼(`진단 결과 복사`). 사용자가 토스 폰 화면에서 복사해 우리에게 붙여 줄 수 있게 한다. 복사 내용에는 위 항목만 들어간다(원문 금지). 복사가 막히면 선택 가능한 글상자로 대신 보여 준다.
5. 실패를 숨기지 않는다. 각 단계는 `성공 / 실패(에러 한 줄) / 실행 안 함` 중 하나로 표시한다.

### B-2 점검 화면 (실험이 통과했을 때 쓰는 최소 흐름)
- 기존 `app/label-check/page.tsx`의 **핵심 흐름만** 옮긴다: 시장(한국) 고정, `씻어내는 제품` / `기능성` 체크, 파일 선택(사진·PDF) 또는 문구 붙여넣기, `점검하기` 버튼.
- 호출은 기존 `submitLabelCheckClient`·`submitLabelCheckTextClient`·`runOcrFromFile508`·`submitOcrReviewedText508`를 그대로 쓴다. 글자 읽기 결과 확인 단계(OcrReview)는 `OcrReview517` 재사용이 가능하면 쓰고, 안 되면 글상자 한 개(읽은 글자 수정 가능)로 대신한다.
- HEIC가 안 되는 경우를 대비해 기존 `isHeicFile508`/`ERR_OCR_HEIC_508` 안내 문구를 그대로 보여 준다.
- 토스 앱 안에서 쓰는 화면이므로 모바일 폭(360~430px) 기준으로 만든다. 가로 스크롤이 생기면 안 된다.

### B-3 결과 보기
- 재사용이 가능하면 `ResultView517`(또는 `ResultView`)을 쓴다.
- 불가하면 단순 목록: 상태 색 점 + 규칙 제목 + 근거 한 줄 + `고칠 문구 예시`(있을 때). 번호는 연속 번호. 레이아웃은 단순해도 된다.
- 어느 경우든 화면 맨 아래에 `법적 판단이 아닌 사전 점검 도구입니다` 고지를 둔다.
- 520차 한도 응답(429 `OCR_LIMIT`)이 오면 기존 `OcrLimitBanner` 문구와 같은 안내를 보여 준다.

## C. 토스 규칙 확인 (구현이 아니라 조사)
- 공식 문서에서 WebView 미니앱의 **디자인·출시 가이드**(예: 토스 디자인 시스템(TDS) 사용 의무, 상단 바·뒤로가기 처리, 다크 모드, 외부 링크 제한, 개인정보·권한 문구, 심사 반려 사례)를 읽고 `docs/toss-miniapp-notes.md`에 **"출시 전 확인 목록"** 절을 추가한다. 우리 화면이 위반할 소지가 있는 항목을 표시한다.
- 이번에 구현하지 않아도 된다. 다만 심사에 걸릴 항목이 B 화면 구조를 바꿔야 할 정도면 보고서 맨 위에 적는다.
- 확인하지 못한 문서·페이지는 "열람 실패"로 적고 추측하지 않는다.

## D. 서버 쪽 (필요 최소)
- 520차 코드는 건드리지 않는다. 실험에 필요한 환경변수는 문서와 보고서에 **사용자가 할 일**로만 적는다(Cursor는 Vercel 환경변수를 바꿀 수 없다).
  - `LABEL_TOSS_ENABLED=1`, `LABEL_CORS_ORIGINS`에 샌드박스·개발 서버 주소(정확히 일치하는 Origin).
- 520차 CORS는 `GET, POST, OPTIONS`와 `Content-Type`만 허용한다. 실험 중 다른 헤더·메서드가 필요해 막히면 코드를 고치지 말고 **보고서에 막힌 요청과 이유만** 적는다(검수자가 판단).

## E. 테스트
- `scripts/regression/label-check-521.ts`를 만들고 `regression:label-check`에 넣는다.
  1. `toss-app/**` 소스가 서버 전용 모듈(`extracted-payload`, `load-rules`, `run-check`, `extract-pdf.ts`(서버용), `node:fs`, `next/server`)을 import하지 않는다(정적 검사).
  2. 루트 `package.json`의 `dependencies`·`devDependencies`에 `vite`, `@apps-in-toss/*`가 **없다**.
  3. `PDFJS_BASE` 변경: 전역 값이 없을 때 결과가 기존 `"/label-check-pdfjs"`와 **글자 그대로 같다**. 전역 값이 있으면 그 값을 쓴다.
  4. 루트 `tsconfig.json` `exclude`에 `toss-app`이 있다.
  5. `toss-app` 화면 소스에 금지어(위 원칙 목록)가 없다. 진단 표시 코드에 `console.log(` 로 파일 내용·글자 원문을 찍는 줄이 없다.
  6. `법적 판단이 아닌` 고지가 `toss-app` 화면에 있다.
  7. `toss-app/.gitignore`가 복사된 pdfjs 파일을 제외한다.
- `npx tsc --noEmit`(루트) 통과. 기존 회귀 32개 전부 통과. 깨지면 이유를 보고서에 적는다.
- `toss-app` 안에서 `npm install` 후 `npm run build`(`vite build`)가 성공해야 한다. `ait build`는 토스 계정·앱 이름이 필요해 막히면 "실행 못 함"으로 적는다(막힌 단계와 에러 한 줄 포함).
- 사용자의 PC에서 `npm run dev`(Vite 개발 서버)로 B-1 화면이 뜨는지 확인할 방법을 보고서에 적는다.

## F. 보고서와 커밋
- `review/521cha-report.md` — 맨 위에 **"확인하지 못한 항목"**을 먼저 적는다(`ait build` 실행 여부, 토스 샌드박스 실측, 개발 서버에서 B-1 화면 동작, 재사용 컴포넌트가 실제로 되는지, 모바일 폭 확인 등).
- 그 다음 **"사용자가 할 일"** 번호 목록을 쓴다. 비개발자가 따라 할 수 있게 한 줄에 한 동작으로:
  1. 토스 개발자 콘솔 가입·앱 등록(앱 이름 정하기), 샌드박스 앱 설치(토스 앱이 깔린 폰 필요).
  2. `toss-app/granite.config.ts`의 자리표시자에 들어갈 값.
  3. Vercel 환경변수 `LABEL_TOSS_ENABLED=1`, `LABEL_CORS_ORIGINS`(필요 시) 추가 후 재배포.
  4. PC에서 개발 서버를 띄우고 폰의 샌드박스 앱으로 접속하는 명령.
  5. 실험 화면에서 `진단 결과 복사` 후 결과를 우리에게 붙여 넣기.
- 커밋은 최대 3개. **마지막 커밋에 코드 변경이 들어가야 한다**(문서만이면 Vercel 빌드가 건너뛰어진다). 단 `toss-app/**`만 바꾼 커밋은 루트 빌드에 영향이 없어야 한다.
- cloud-work에만 push. main에는 push하지 않는다.
