# 489차 — API 처리 표

플래그: `NEXT_PUBLIC_DETAIL_PAGE_ENABLED` (`"1"`만 켜짐). 꺼짐 시 거절 본문 `{ "error": "서비스가 일시 중단되었습니다" }` status 503. 가드는 핸들러 최상단(`detailPageDisabledResponse`).

| 라우트 | 외부 유료 호출 | 처리(꺼짐) | 근거 |
|--------|----------------|------------|------|
| `/api/generate` | Anthropic 등 | 503 거절 | 상세 생성 |
| `/api/generate-backdrop` | 이미지 AI | 503 | 상세 |
| `/api/generate-lifestyle-shots` | 이미지 AI | 503 | 상세 |
| `/api/generate-social` | AI | 503 | 소셜/상세 |
| `/api/enhance-image` | 이미지 AI | 503 | 상세 |
| `/api/canvas-ai-image` | 이미지 AI | 503 | 상세 |
| `/api/lifestyle-composite` | 합성/스토리지 | 503 | 상세 |
| `/api/patch-page` | AI | 503 | 상세 |
| `/api/patch-section` | AI | 503 | 상세 |
| `/api/scene-images` | 이미지 AI | 503 | 상세 |
| `/api/section-backdrops` | 이미지 AI | 503 | 상세 |
| `/api/info-backdrops` | 이미지 AI | 503 | 상세 |
| `/api/autofill-draft` | AI | 503 | 상세 |
| `/api/protect-product-images` | 스토리지 | 503 | 상세 전용 |
| `/api/image-jobs/[id]` | (잡 조회, 생성 연계) | 503 | 상세 |
| `/api/products/[id]` | DB/상세 상품 | 503 | 상세 |
| `/api/generations` | DB/생성 기록 | 503 | 상세 |
| `/api/generations/[id]` | DB | 503 | 상세 |
| `/api/support-chat` | LLM | 503 | 생성 지원 챗 |
| `/api/proxy-image` | 업스트림 fetch | 503 | export/상세 전용(검수 미사용) |
| `/api/storage/upload-url` | R2 서명 | 503 | 상세 업로드 전용 |
| `/api/storage/remove` | R2/스토리지 | 503 | 상세 전용 |
| `/api/cron/cleanup-expired-images` | 스토리지 삭제 | no-op 200 | 상세 이미지 정리 → 스킵 |
| `/api/label-check` | 없음(로컬 PDF) | **유지** | 검수 |
| `/api/billing/*` | 결제 | **유지** | 계정·결제(생성 아님) |
| `/auth/*` · 로그인·약관 | — | **유지** | 계정 |

복원: 환경변수 `NEXT_PUBLIC_DETAIL_PAGE_ENABLED=1` 후 재빌드/재기동.
