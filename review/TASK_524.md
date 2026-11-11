# TASK 524 — 사진형(글자 층 없는) PDF를 자동으로 글자 인식(OCR)으로 넘기기

## 왜 하는가
- 토스 폰 테스트에서 `FireShot Capture …pdf`(화면 캡처로 만든 PDF)를 올리면 "글자를 읽지 못해 점검하지 못했어요 / 글자가 이미지로 들어 있어 읽지 못했습니다…"가 나온다.
- 원인(코드 확인 결과):
  - `app/label-check/page.tsx`와 `toss-app/src/CheckScreen.tsx`의 `runCheck`는 **사진 파일(`isOcrImageFile508`)만** OCR로 보내고, **PDF는 무조건 `submitLabelCheckClient`(글자 층 읽기)** 로 보낸다.
  - 그런데 `runOcrFromFile508`(`lib/label-check/client-ocr-submit.ts`)는 **이미 PDF를 처리한다**: 글자 층이 충분하면 그대로 쓰고, 아니면 `prepareOcrTilesFromFile508`이 쪽을 JPEG 조각으로 렌더해 OCR로 보낸다(최대 10쪽, 518차).
  - 즉 "사진형 PDF → OCR" 길은 이미 있는데 **연결이 안 되어 있다.** 새 렌더·OCR 엔진을 만들 필요 없이 **분기만 바꾸면 된다.**
- 목표: 글자 층이 있는 PDF는 지금과 **똑같이** 동작하고, 글자 층이 없거나 극히 적은 PDF만 OCR 흐름(OCR 확인 화면 포함)으로 넘어간다. 웹(`/label-check`)과 토스 앱 **둘 다** 적용한다.

## 원칙 (어기면 안 되는 것)
- 글자 층이 충분한 PDF의 결과·화면·서버 호출은 **지금과 완전히 같아야 한다**(회귀 테스트로 보장).
- 판정 로직(`run-check*.ts`)·규칙 JSON·서버 라우트 수정 금지. 서버는 건드리지 않는다.
- OCR이 꺼져 있으면(`ocrAvailable === false`) 지금과 똑같이 기존 안내 문구가 나온다(자동 전환 없음).
- 사용자 파일·글자 원문을 콘솔·로그에 남기지 않는다.
- 고객 화면 문구에 `무료`, `요금`, `1분`, `위반입니다`, `적법`, `완벽`, `보장`, `안전합니다`, `100%` 금지. `법적 판단이 아닙니다` 고지 유지.
- OCR 비용 보호: 기존 일일·월간 한도(`OCR_LIMIT`)와 토스 일일 한도가 그대로 적용된다. 한도 문구도 기존 것을 쓴다. 한도 로직 수정 금지.

## A. 판단 함수 (공용, 새 파일 1개)
`lib/label-check/client-pdf-route-524.ts` (클라이언트 전용, 서버 모듈 import 금지)

```ts
export type PdfRoute524 = "text" | "ocr" | "unknown";
export async function probePdfRoute524(file: File): Promise<PdfRoute524>;
```
- `extractLabelPdfInBrowser`(client-extract-pdf.ts)를 호출해 글자 수를 센다. 쪽수 초과(`TOO_MANY_PAGES`)는 `"unknown"`이 아니라 **그대로 throw**해 호출부가 기존 안내(`ERR_TOO_MANY_PAGES_485`)를 쓰게 한다.
- 판단 기준은 **기존 상수를 재사용**한다. `decideTextLayer518`(글자 층이 충분하면 `preferText`, 일부만이면 `mixed`)의 결과를 쓴다:
  - `preferText` 이고 `mixed`가 아님 → `"text"`
  - 전체 글자 수가 0이거나, 서버가 "읽을 수 없음"으로 보는 기준(`run-check.ts`의 `!extracted.readable && charCount < 40` 과 같은 의미)에 해당 → `"ocr"`
  - `mixed`(일부 쪽만 글자 있음) → `"ocr"` (`runOcrFromFile508`가 이미 혼합 안내 `NOTICE_OCR_MIXED_TEXT_518`을 붙임)
  - pdfjs 로드·파싱 실패(Worker 문제 등) → `"unknown"`
- 임계값을 새로 만들지 말고 위 기존 로직에서 가져온다. 어떤 기존 상수·함수를 썼는지 보고서에 적는다.
- `"unknown"`일 때: **기존 동작(글자 층 경로)** 으로 간다(지금보다 나빠지지 않게).

## B. 분기 변경 (웹·토스 동일하게 2곳)
`app/label-check/page.tsx`와 `toss-app/src/CheckScreen.tsx`의 `runCheck`:
1. `file`이 PDF이고 `ocrAvailable`이 true일 때만 `probePdfRoute524(file)`를 부른다. (OCR이 꺼져 있으면 probe하지 않고 기존 그대로.)
2. 결과가 `"ocr"`이면 `runOcrCore()`로 보낸다(사진과 같은 길). 진행 문구는 사진과 같은 OCR 진행 문구를 쓴다.
3. `"text"` 또는 `"unknown"`이면 기존 `submitLabelCheckClient` 경로.
4. 같은 PDF를 **두 번 추출하지 않도록** 신경 쓴다. probe에서 이미 한 번 추출하므로, 성능이 크게 나빠지면(큰 PDF) probe 결과를 `WeakMap<File, ...>` 등으로 캐시해 `submitLabelCheckClient` 쪽 재사용 여부를 검토한다. 어렵다면 재추출을 허용하되 보고서에 소요 시간(대략)을 적는다. 기존 함수 시그니처를 바꾸지 말 것.
5. 상태·중복 호출 방지(`busyLock`, `reqSeq`)는 기존 방식을 그대로 둔다. probe 중에도 `busy` 표시가 유지되어야 한다(깜빡임 금지).
6. OCR로 간 PDF에서 OCR이 실패하거나 글자를 못 읽으면, 이미 있는 OCR 실패 안내(`out.error`)를 그대로 보여 준다. 새 문구 추가는 최소화한다.

## C. 안내 문구 (최소)
- 기존 `NOTICE_IMAGE_PDF_497`은 **OCR이 꺼진 경우의 안내로 그대로 유지**한다. 수정 금지.
- OCR로 자동 전환될 때 사용자가 헷갈리지 않도록, OCR 확인 화면 위에 한 줄만 표시한다(기존 `ocrNotice`/`notices` 자리 재사용, 새 UI 만들지 말 것):
  - 문구 후보: "글자가 이미지로 들어 있는 PDF라서 사진처럼 읽었어요. 읽은 글자를 확인해 주세요."
  - 웹과 토스에 모두 같은 문구. `types.ts`에 상수로 추가(`NOTICE_PDF_AS_IMAGE_524`).
- 이 상수 추가 외에 기존 문구는 바꾸지 않는다.

## D. 토스 앱 쪽 추가 확인
- `toss-app/src/config.ts`의 `TOSS_ACCEPT`는 PDF를 그대로 포함한다(변경 금지).
- `touch` 안내 문구가 "PDF는 글자가 살아 있어야 한다"는 식으로 되어 있다면, 이번 변경에 맞게 **한 줄 정도만** 수정한다(없으면 건드리지 말고 보고서에 "해당 없음").
- 토스 `lab` 진단 패널(`src/lab/LabPanel.tsx`)에 **버튼 1개**를 추가한다: `PDF 경로 판단(probe)` → `probePdfRoute524` 결과(`text`/`ocr`/`unknown`)와 글자 수·쪽수만 표시. 원문 표시 금지.

## E. 테스트 (`scripts/regression/label-check-524.ts`, `run-label-check.ts`에 등록)
- 브라우저 없이 가능한 범위에서 단위 테스트:
  1. `probePdfRoute524`의 판단 로직을 **순수 함수로 분리**(`decidePdfRoute524(extracted)`)하고 다음을 검증: (a) 글자 충분 → `"text"`, (b) 글자 0 → `"ocr"`, (c) 일부 쪽만 글자 → `"ocr"`, (d) 글자 40자 미만·읽을 수 없음 → `"ocr"`.
  2. 소스 검사: `page.tsx`·`CheckScreen.tsx`가 PDF 분기에서 `ocrAvailable`이 false면 probe를 부르지 않음(문자열/AST 수준으로 확인 가능한 범위).
  3. `NOTICE_IMAGE_PDF_497` 문구가 **변경되지 않았음**(497 회귀 테스트 통과).
  4. 금지어 검사(새 문구에 금지 단어 없음).
- 기존 회귀 전체 통과: `npm run regression:label-check`, `npx tsc --noEmit`(루트), `toss-app`에서 `npx tsc --noEmit`.
- 웹 출력 골든 테스트(517 마크업)가 그대로 통과해야 한다.

## F. 실제 확인 (가능한 만큼)
- Playwright(`/opt/npm-tools/node_modules/playwright` 또는 `toss-app/scripts/shots.mjs` 방식)로, **글자 층이 없는 PDF**를 만들어 확인한다. 예: 이미지 한 장을 `pdf-lib`/Python `img2pdf`/Chromium 인쇄 등으로 PDF로 감싼 파일(글자 없음). 글자가 있는 이미지(한글 라벨 문구가 그려진 PNG)를 쓰면 좋다.
- 서버가 샌드박스에서 접속되지 않을 수 있다. 이 경우 `/api/label-check/ocr`를 **네트워크 가로채기(route mock)** 로 흉내 내서 다음을 확인하고 한계를 보고서에 적는다.
  1. 글자 없는 PDF → `OCR 요청(POST /api/label-check/ocr)`이 나간다(이미지 조각 base64 포함, 원문 로그 금지).
  2. 글자 있는 PDF → 이전처럼 `POST /api/label-check`(글자 층 JSON)이 나가고 OCR 요청은 나가지 않는다.
  3. OCR이 꺼진 응답(`available:false`) → 이전과 똑같은 안내 문구.
- 웹·토스 **둘 다** 확인한다. 가능하면 360/390/430px 스크린샷 1~2장을 `review/524-shots/`에 둔다(PDF 샘플 파일 자체는 올리지 않는다).
- 실제 Google/CLOVA OCR 호출은 하지 않는다(비용·네트워크). 실제 호출 확인은 사용자 폰 테스트로 남긴다.

## G. 하지 말 것
- 서버 OCR 라우트·한도·CORS·Vision/LLM 로직 수정.
- 새 OCR 엔진, 새 렌더 방식, 새 npm 패키지.
- `pdf.min.js` 교체, 번들·빌드 스크립트 변경(이미 eval 제거 처리됨).
- `scripts/vercel-ignore-docs.sh` 수정.

## H. 보고서 `review/524cha-report.md`
- 바꾼 파일 목록, 쓴 기존 상수·함수(임계값 출처).
- 테스트 결과(회귀 개수, tsc 2개).
- 위 F 확인 결과(성공/한계), 스크린샷 경로.
- "사용자 폰 확인 목록"(아래 3개를 그대로 포함):
  1. 사진형 PDF(예: FireShot 캡처 PDF) 올리기 → 글자 확인 화면이 뜨는가
  2. 글자가 살아 있는 PDF → 이전처럼 바로 결과가 나오는가
  3. 사진(JPG/PNG) → 이전처럼 동작하는가
- 커밋은 최대 3개로 묶어 `cloud-work`에 push. **main에는 push하지 않는다.**
