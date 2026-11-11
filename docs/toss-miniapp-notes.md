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

## 이번에 하지 않은 것

- 토스용 화면 프로젝트(521차 이후)
- 토스 로그인·인앱결제
- PDF 도구(`/label-check-pdfjs`)를 토스 번들에 포함
- `/api/label-check/runs` CORS·절대 URL(로그인 전용, 토스 미사용)
