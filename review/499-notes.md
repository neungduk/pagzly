# 499차 노트

## 경로 분기
1. 파일 선택 ≤100MB
2. 동적 import `client-extract-pdf` → public pdfjs 스크립트 추출
3. 성공 → `POST /api/label-check` JSON `{ extracted, options… }`
4. 실패 + 파일 ≤4MB → FormData 서버 업로드(기존)
5. 실패 + 파일 >4MB → `ERR_TOO_LARGE_485`

## pdfjs 로딩
- Turbopack이 `pdfjs-dist/build/pdf.js`를 클라에 넣으면 `node:module`/`canvas`로 실패.
- `prebuild`/`predev`로 `public/label-check-pdfjs/{pdf,pdf.worker}.min.js` 복사 후 `<script>` 로드.

## 브라우저 실측
- Node에서 스크립트 로드 방식은 DOM 필요로 **브라우저 실측 미실시**(동일성 시험은 서버 추출→페이로드 왕복).
