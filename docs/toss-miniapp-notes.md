# 토스(앱인토스) 미니앱 — 서버 준비 메모 (520)

웹 `/label-check` 동작은 기본값에서 그대로다. 아래 환경변수를 켜야만 토스 Origin이 API를 쓸 수 있다.

## 환경변수

| 이름 | 용도 | 기본(꺼짐) | 켜는 법 |
|------|------|------------|---------|
| `NEXT_PUBLIC_LABEL_API_BASE` | 클라 `fetch`에 붙일 API 절대 주소(끝 `/` 무관). 비우면 상대 경로 `/api/...` | 비움 = 웹과 동일 | 예: `https://pagzly.com` |
| `LABEL_TOSS_ENABLED` | CORS·토스 OCR 한도 스위치 | 꺼짐(헤더 없음 → 토스 요청 차단) | `"1"` |
| `LABEL_CORS_ORIGINS` | 토스 정규식 외 추가 허용 Origin(쉼표 구분, **글자 일치**) | 비움 | 샌드박스 URL을 그대로 나열 |
| `LABEL_TOSS_OCR_PER_IP_DAILY` | 토스 Origin IP당 일일 OCR 한도 | `5` | 숫자 |
| `LABEL_TOSS_OCR_DAILY_MAX` | 토스 Origin **전체** 일일 조각 합계 상한(DB) | `300` | 숫자 |

비상 끄기: `LABEL_TOSS_ENABLED`를 빼면 CORS가 사라져 토스 쪽 `fetch`가 브라우저에서 막힌다. 웹(상대 경로·같은 Origin)은 영향 없다.

마이그레이션 `supabase/migrations/20261111130000_label_toss_daily.sql`은 **파일만** 있다. 검수자가 Supabase에 적용해야 `label_toss_consume`이 동작한다. 미적용·RPC 실패 시 OCR은 막지 않고 경고만 남긴다.

## 토스 쪽에 확인할 질문 (대기)

1. 미니앱이 **정적 번들**인지, 우리 도메인을 WebView로 여는지(또는 `apps.tossmini.com` 하위만인지).
2. 파일·사진·**HEIC** 업로드가 WebView에서 허용되는지, 용량·포맷 제한.
3. 서비스 정책·개인정보 항목(외부 OCR 전송 고지, 저장 안 함)을 토스 심사에 어떻게 넣는지.

## 이번에 하지 않은 것 (520 기준)

- 토스용 화면 프로젝트 → **521에서 `toss-app/` 실험 화면 추가**
- 토스 로그인·인앱결제
- `/api/label-check/runs` CORS·절대 URL(로그인 전용, 토스 미사용)

## 출시 전 확인 목록 (521)

출처: 공식 문서 [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame), [UI/UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide), [FAQ](https://developers-apps-in-toss.toss.im/guide/faq), [WebView 튜토리얼](https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview). 열람 실패한 페이지는 없음(검색·문서 요약 기준).

| 항목 | 요지 | 우리 화면 위험 |
|------|------|----------------|
| 정적 번들만 | SSR 금지, CSR/SSG만. 자사 도메인 WebView/iframe·`location`으로 외부 사이트 렌더 금지 | ⚠ API만 `pagzly.com` 호출은 가능하나 **웹 전체를 WebView로 띄우면 반려**. 정적 `toss-app` 번들 필수 |
| 네비게이션 바 | 앱인토스 내비 사용, 최초 화면 뒤로가기=종료, 자체 뒤로가기와 토스 뒤로가기 동시 노출 금지 | ⚠ 현재 실험 UI에 토스 내비 연동 없음 — 출시 전 SDK 내비 적용 필요 |
| 라이트 모드 | 다크 모드 미지원, 라이트만 | ○ 라이트 기준 |
| TDS | 전 컴포넌트 필수는 아님(권장). 모달 등에서 TDS 요구 사례 있음 | ⚠ TDS 미적용 — 검수 시 예외/추가 작업 가능 |
| 다크패턴 | 진입 즉시 바텀시트·강제 유도·예상 밖 광고·나갈 길 없음 금지 | ○ 해당 UI 없음 |
| 외부 링크 | 꼭 필요한 외부 링크만, 자사 앱 설치 유도 금지 | ⚠ 결과/안내에 `pagzly.com` 링크를 넣으면 심사 이슈 가능 — 넣지 말 것 |
| 권한 | 사진 등 권한은 동의 후, 거부해도 나머지 동작 | ⚠ `<input type=file>`·앨범 API 실측 필요. HEIC/PDF 미확인 |
| 개인정보 | 민감정보 암호화 저장·전송 권장, 외부 OCR 고지 | ⚠ OCR 외부 전송 고지·개인정보 문구를 심사 자료에 넣을 것 |
| 해요체 라이팅 | 제품 문구 해요체 | △ 실험 화면은 기능 우선 — 출시 전 다듬기 |
| SDK 빌드 | `@apps-in-toss/web-framework` + `ait build` / `ait init` → `apps-in-toss.config.ts`(3.x). 구버전 `granite.config.ts` 문서도 혼재 | ○ `toss-app/granite.config.ts`에 defineConfig 유지, 자리표시자 교체 |

### PDF.js

`toss-app` 빌드 시 `scripts/copy-label-check-pdfjs.mjs`가 루트 `pdfjs-dist`를 `public/label-check-pdfjs/`로 복사한다(git 제외). 런타임은 `window.__PAGZLY_PDFJS_BASE__="./label-check-pdfjs"`.
