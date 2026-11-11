# 520차 보고서 — 토스 미니앱 대비 서버 준비

## 확인하지 못한 항목
- 실제 `*.apps.tossmini.com` Origin·브라우저 프리플라이트 실측 없음(단위·정적만).
- `label_toss_daily` 마이그레이션을 Supabase에 적용하지 않음 → 일일 합계 RPC 실동작 미확인.
- 토스 WebView에서 `NEXT_PUBLIC_LABEL_API_BASE` 절대 URL 호출·파일 업로드 미검증.

## 커밋 (cloud-work, main 미푸시)
1. `eebcad8` — labelApiUrl·클라 fetch
2. `47d3d2f` — CORS·OPTIONS·토스 OCR 한도·마이그레이션
3. `fb16734` — 회귀·문서·보고서

## A. API 주소
- `lib/label-check/api-base-520.ts` — `labelApiUrl`
- 적용: `client-submit.ts`, `client-ocr-submit.ts`, `LawBaselineClient516.tsx`
- **미적용:** `/api/label-check/runs/**`(로그인 전용, 토스 미사용)
- PDF 도구 `/label-check-pdfjs` 경로 변경 없음 → 521차 번들 포함 시 검토

## B. CORS
- `LABEL_TOSS_ENABLED=1`일 때만 헤더. `*`·Credentials 금지.
- 라우트: `label-check` POST, `ocr` GET/POST, `law-watch/baseline` GET + 각 OPTIONS
- middleware·supabase middleware: 위 경로 OPTIONS는 세션 갱신 없이 통과

## C. 토스 OCR 한도
- 토스 Origin만: IP 일일 `LABEL_TOSS_OCR_PER_IP_DAILY`(기본 5)
- 전체 일일 조각 합계 DB: `20261111130000_label_toss_daily.sql` — **파일만**, 적용은 검수자
- RPC 실패 시 OCR 통과 + `toss-daily-rpc-failed` 경고(서비스 중단 방지)

## D. 문서
- `docs/toss-miniapp-notes.md` — 환경변수·대기 질문·미작업 항목

## 남은 일(521+)
- 토스용 화면 프로젝트, PDF.js 번들, runs API, 로그인·결제
- 마이그레이션 적용 후 일일 캡 실측

## 검증
- `npx tsc --noEmit` 통과
- `npm run regression:label-check` (520 포함) 통과 목표
