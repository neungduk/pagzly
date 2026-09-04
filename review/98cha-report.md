# 98차 — highlight_box 카드 0개 빈 공백

생성: 2026-09-03

## 요약

`highlight_box`의 `cards`가 빈 배열이면 `renderSection`이 `null`을 반환해도, 상위가 **구분선(점) + scroll-mt 래퍼**를 남겨 뷰포트 분량의 흰 공백이 생겼습니다. 이제 콘텐츠가 없으면 **섹션·구분선·래퍼를 전부 스킵**합니다. 생성 파이프라인에서는 빈 카드를 저장 전에 드롭하고, 필수 슬롯이 비면 **1회 재생성**합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `components/DetailSectionRenderer.tsx` | 빈 highlight_box/checklist 등 skip + wrapper/breather 제외 |
| `lib/highlight-box-guard.ts` | 빈 카드 드롭·필수 슬롯 검사 |
| `app/api/generate/route.ts` | cards sanitize, drop, 1회 retry |
| `lib/export-detail-html.ts` | 빈 highlight_box HTML 생략 |
| `lib/cosmetics-compliance.ts` / `food-compliance.ts` | `cards` undefined 가드 |

## tsc

```bash
npx tsc --noEmit  # exit 0
npx tsx scripts/98cha-empty-highlight-smoke.ts  # OK
```

## 작업 A — 렌더러

- `highlight_box` cards 0개 → `console.warn` + `null`
- **상위 map:** `content`가 없으면 Fragment/breather/`DetailScrollReveal`/`scroll-mt` **전부 return null**
- breather는 **실제로 렌더된 직전 섹션** 기준으로만 삽입 (빈 highlight_box를 prev로 보고 점을 그리지 않음)
- 같은 패턴: `checklist` items 0, `stat_infographic` metrics 0, `gallery` indexes 0, `faq` items 0, `step_card` steps 0

## 작업 B — 생성 파이프라인

**기존:** `highlight_box`는 `cards.slice(0, 4)`만 하고 0개여도 통과. 재시도 없음.

**근본 원인:** DeepSeek가 `cards: []`인 섹션 JSON을 내려도 서버가 저장함. 파싱 유실 경로(문자열 슬라이스)보다는 **모델 응답 자체가 빈 배열**일 가능성이 큼 — 해당 상품 원본 생성 로그는 로컬에 남아 있지 않아 확정 불가. `cards`가 undefined면 예전 코드는 `.slice`에서 throw했을 것이므로, 이번 케이스는 **빈 배열로 온 응답**으로 보는 게 맞음.

**조치:**
1. title/body가 있는 카드만 남김
2. 0개면 섹션 drop + warn
3. 필수 `highlight_box`가 없으면 DeepSeek **1회 재생성**
4. 그래도 비면 drop하고 진행 (빈 채로 페이지에 안 남김)

## 기존 상품

`49f8192b-…` 글로위스트 v3는 **재생성 없이** 미리보기만 다시 열면 빈 공백이 사라져야 함 (렌더러 방어). 카드 3장을 채우려면 재생성.

## 체크리스트

- [x] 섹션+구분선 완전 스킵
- [x] 콘솔 warn
- [x] checklist 등 동일 패턴
- [x] 생성 검증 + 1회 retry
- [x] 근본 원인 기록 (AI 빈 cards 통과)
- [x] tsc 0
- [ ] 실기기 스크린샷(수동)
