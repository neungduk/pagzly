# 491차 — `/label-check` 동작 감사 (읽기 전용)

결론: **저장·외부 전송 없음** → B 문서 수정 진행 가능.

| # | 질문 | 사실 | 근거 |
|---|------|------|------|
| 1 | PDF가 디스크·DB·R2/Supabase에 저장되는가 | **저장 0**. 요청 중 `Buffer` 메모리만. Storage/DB 호출 없음 | `app/api/label-check/route.ts` 25–73 (form→buffer→`runLabelCheck483`→JSON). 주석 L2–3. `lib/label-check/*`에 storage/supabase 미사용 |
| 2 | PDF 본문이 외부 AI/OCR/분석으로 전송되는가 | **전송 0**. 로컬 `pdf-parse`/`pdfjs`만 | `extract-pdf.ts` L61–97 require 로컬 파서. route L3 "유료 AI/OCR 없음". `fetch(`/Anthropic 없음 |
| 2b | 로그에 파일명·본문 | **남기지 않음**. 성공 시 `readable`/`skip`/`findings.length`만. 실패는 `"failed"`/`"extract-limit"` | `route.ts` L64–76. `safe-upload.ts` L2–3 |
| 3 | `/label-check` 쿠키·분석·광고 픽셀 | **페이지에 분석/픽셀 스크립트 없음**. layout은 metadata만 | `app/label-check/layout.tsx`, `page.tsx`(gtag 등 없음). 루트 layout에도 analytics Script 없음. (로그인 시 Supabase 세션 쿠키는 계정용·검수 API와 무관) |
| 4 | 검수 결과 서버 저장 | **저장 0**. 응답 JSON만. 샘플은 정적 import | `route.ts` L73 `NextResponse.json(result)`. `sample-result-a.json` + `page.tsx` L63–69 |
| 5 | IP 일시 보관 | **있음(인메모리)**. `SlidingWindowLimiter`: IP→타임스탬프 배열. 창 **60초·최대 10회**. 인스턴스 로컬, 콜드스타트 시 초기화, maxKeys 5000 prune | `safe-upload.ts` L18–26, `rate-limit.ts` L11–41·L50–58 (`x-forwarded-for` 첫 값) |

## 문서·날짜
- privacy/terms 기존 시행일: **2026년 8월 20일** 유지. 새 자리표시자 날짜 추가하지 않음.
