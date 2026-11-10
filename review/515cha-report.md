# 515차 보고서 — 랜딩 v4(색 배경·움직임·문구 띠)

## 확인하지 못한 항목
- 실브라우저 360/390 캡처·가로 스크롤 육안(정적 CSS·모바일 규칙으로 대체)
- 형광펜 draw·bob·띠 흐름의 실기기 `prefers-reduced-motion` 체감

## 적용 요약
- 랜딩 래퍼 `#F3F5FB` + wash 3색(`#D5DEFF`/`#FFDCCB`/`#CFEFE0`), blur 70, drift 9s. `--lc-bg`(점검/결과) 미변경.
- 구간: 히어로·제품=번짐 / 숫자 띠 `#111214` / 전·후 흰 풀폭 / CTA `linear-gradient(135deg,#1D4ED8,#3B5BFF,#6C7DFF)`.
- 라벨 카드 tilt -2.2°·호버 0°, float 칩(고칠/확인 수는 `landingDemoChipCounts514()`), mk draw, 문구 띠 40s(hover pause).
- 514 문구·사실 확인·요금/무료/1분 금지 유지.

## 검증
- `npx tsc --noEmit` 통과
- `npm run regression:label-check` 27/27 통과
- `npm run build` 통과

## 커밋 해시
- `e05148c` feat(515): landing wash background and section color bands
- `b4a8e38` feat(515): demo tilt, float chips, mk draw, and phrase belt
- 이 커밋 `test(515): landing v4 guards, CSS motion, cha-report` — `git log -3 --oneline` 기준 확인
