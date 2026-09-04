# 97차 — moisture/nourishing 히어로 오배정 차단

생성: 2026-09-03

## 요약

히어로 헤드라인에 「촉촉」등이 있을 때 moisture가 히어로에 붙어 가짜 브랜드 라벨처럼 보이던 경로를 막았습니다. moisture/nourishing은 **히어로 제외** 후 ingredient/texture(또는 다른 비히어로 컷)에만 배정하고, 비히어로 컷이 없으면 **스킵**합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/concept-effects.ts` | `pickOverlayAssignments` 히어로 제외 + fallback 스킵 + 로그 |
| `review/quality-log.md` | 2026-09-03 발견/원인/조치 기록 |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## 단위 확인 (tsx)

- 히어로 headline「촉촉」+ ingredient/texture 있음 → moisture → non-hero, cooling → hero 유지
- 이미지 1장뿐 → moisture 스킵

## 체크리스트

- [x] moisture/nourishing 히어로 제외
- [x] fallback=hero 극단 케이스 스킵
- [x] 로그 라인
- [x] quality-log.md
- [x] tsc 0
- [ ] 실기기 재생성 스크린샷(수동 — 상품 `7dca0930-…` 재생성 권장)
