# 499차 목표 (코드 전)

## Next 16 + pdfjs 워커 로딩 (docs 요지)
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`: 외부 라이브러리는 **동적 `import()`**로 클라에서 필요 시에만 로드(번들 분리).
- Turbopack은 `pdfjs-dist/build/pdf.js`를 클라 청크에 넣으면 `canvas`·`node:module`로 실패 → **번들 금지**.
- 방식: `prebuild`/`predev`에서 `pdf.min.js`+`pdf.worker.min.js`를 `public/label-check-pdfjs/`로 복사 후 `<script>` 로드. `GlobalWorkerOptions.workerSrc` = 동일 public 경로.
- 워커 실패 시 `disableWorker: true` 폴백.
- `/label-check`·`/label-check/new`에서만 `import('@/lib/label-check/client-extract-pdf')` 동적 로드.

## 의존성
- `pdfjs-dist@2.16.105` (pdf-parse 내장 pdf.js **2.x** 계열; npm에 2.0.550 없음 → 2.x 최신). 런타임은 public 복사본.

## 성공 기준
1. `ExtractedLabelPayload` + `runLabelCheckFromExtracted`. 기존 buffer 경로 유지·코어 공유.
2. 항상 클라 추출 우선 → 실패 시 ≤4MB만 서버 업로드 폴백. >4MB+실패 → 큰 파일 안내.
3. 클라 파일 100MB / 쪽 10 / JSON·항목·문자열 상한 서버 검증. `{error,code}`.
4. 회귀 499: A/B/C·i·us 동일성 + 스키마. tsc/build. 커밋 ≤4. main 미푸시.

## 비목표
- OCR, 임시 스토리지, Production/main, 규칙 JSON 수정, "안전합니다" 문구.
