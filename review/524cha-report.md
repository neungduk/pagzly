# 524차 보고서 — 사진형 PDF → OCR 자동 분기

## 바꾼 파일
- `lib/label-check/client-pdf-route-524.ts` (신규: `decidePdfRoute524` / `probePdfRoute524` / `probePdfRouteMeta524`)
- `lib/label-check/types.ts` — `NOTICE_PDF_AS_IMAGE_524` 추가
- `app/label-check/page.tsx` — `runCheck` PDF+OCR 분기
- `toss-app/src/CheckScreen.tsx` — 동일 분기
- `toss-app/src/lab/LabPanel.tsx` — `PDF 경로 판단(probe)` 버튼
- `scripts/regression/label-check-524.ts` + `label-check-suites.ts` 등록
- `review/524-shots/` — 확인 스크린샷·summary.json

## 쓴 기존 상수·함수 (임계값 출처)
- `decideTextLayer518` / `TEXT_LAYER_MIN_CHARS_518` (= `MIN_CHARS_483` = **40**) / `TEXT_LAYER_MIN_HANGUL_518` (= `MIN_HANGUL_CHARS_485` = **10**) — `lib/label-check/ocr/text-layer-518.ts`
- `extractLabelPdfInBrowser` — `client-extract-pdf.ts` (`TOO_MANY_PAGES` throw 유지 → `ERR_TOO_MANY_PAGES_485`)
- 서버 의미 정렬: `run-check.ts`의 `!readable && charCount < 40` ≈ `charCount < 40` (`readable := charCount >= 40`)
- `NOTICE_IMAGE_PDF_497` — **수정하지 않음**(OCR 꺼진 경우 기존 안내)

판단 규칙 요약: `preferText && !mixed` → `text` / `mixed` 또는 `charCount < 40` → `ocr` / pdfjs 실패 → `unknown`(기존 글자 층 경로) / 쪽수 초과는 throw.

## 이중 추출
probe에서 한 번, `submitLabelCheckClient`가 text 경로일 때 다시 추출할 수 있음. 시그니처 변경 없이 재추출 허용. 짧은 샘플 PDF 기준 probe+제출은 수 초 이내(실측 도구 대기 포함 ~4s UI). 큰 PDF는 재추출 비용이 있을 수 있음 — WeakMap 캐시는 미도입.

## 토스 touch 문구
"PDF는 글자가 살아 있어야 한다"류 문구 **해당 없음**(미수정). `TOSS_ACCEPT` 변경 없음.

## 테스트 결과
- `npm run regression:label-check` → **37/37** 통과(524 스위트 포함, 523 golden 유지)
- 루트 `npx tsc --noEmit` 통과
- `toss-app` `npx tsc --noEmit` 통과

## F 확인 (Playwright + API mock, 토스 dist)
스크립트: `scripts/_524-verify-pdf-route.mjs` (로컬 검증용, PDF 샘플은 임시 생성 후 삭제)

| 케이스 | 결과 |
|--------|------|
| 글자 없는 PDF | `POST /api/label-check/ocr` 1회, label-check POST 0, OCR 확인 UI 표시 — **성공** |
| 글자 있는 PDF | label-check POST 1, OCR POST 0 — **성공** |
| OCR `available:false` | OCR POST 0, label-check POST 1(자동 전환 없음) — **성공** |
| 웹(`/label-check`) Playwright E2E | 샌드박스에서 Next 서버 미기동 — **한계**. 분기 코드는 웹·토스 동일 패턴으로 맞춤 |
| 실제 Google/CLOVA OCR | 호출하지 않음(mock). 폰 실측으로 남김 |

스크린샷: `review/524-shots/image-pdf-390.png`, `text-pdf-390.png`, `ocr-off-390.png`, `summary.json`

## 사용자 폰 확인 목록
1. 사진형 PDF(예: FireShot 캡처 PDF) 올리기 → 글자 확인 화면이 뜨는가
2. 글자가 살아 있는 PDF → 이전처럼 바로 결과가 나오는가
3. 사진(JPG/PNG) → 이전처럼 동작하는가
