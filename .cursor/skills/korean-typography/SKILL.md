---
name: korean-typography
description: 한글 제목·본문의 줄바꿈, 글자 크기, 자간, 줄 균형을 다루는 작업에서 사용한다. keep-all, .pz-fit, joinNumericSuffix, text-wrap, globals.css 자간 덮어쓰기 문제, 한 글자만 남는 줄 점검을 포함한다.
---

# 한글 타이포그래피

## 줄바꿈

- 기본은 `word-break: keep-all`이다. 긴 어절만 `.pz-fit`으로 줄여 맞춘다.
- 말줄임(…)으로 넘기지 않는다.
- 퍼센트·수치 뒤 줄바꿈 방지는 `lib/detail-typography.ts`의 `joinNumericSuffix`, `longestTokenEm`을 쓴다.
- 줄 균형: 제목은 `text-wrap: balance`, 본문은 `text-wrap: pretty`. 좁은 칸의 짧은 문구(띠·말풍선 등)도 balance로 한 글자 넘김을 막는다.

## 기준 크기

- 스펙표 한글 라벨 13px, 일반 자간.
- 섹션 라벨 11px.
- export 섹션 타이틀은 라이브와 같은 위계가 되게 토큰(`FONT_SIZE` 등)으로 맞춘다.

## 자간 주의

- `app/globals.css`의 unlayered 규칙이 Tailwind 자간 클래스를 덮어쓴다(mono 0.18em, heading -0.025em 고정).
- 자간을 바꿀 때는 클래스만 보지 말고 브라우저 computed `letter-spacing`으로 실제 적용값을 확인한다.

## 확인

- 390·750 폭에서 한 글자만 남는 줄, 어색한 음절 끊김이 없는지 눈으로 확인한다.
- 라이브와 export를 같이 바꾸고 live-export-parity 스킬 절차로 검증한다.
