# 502 notes

## 금지어 검사(496)
- 원인: `lib/label-check/**` 소스 **주석**의 「위반」도 검사됨(501차).
- 판단: 주석 전용 줄(`//` `/*` `*`)은 제외. 화면·응답 문자열(코드/문자 리터럴이 있는 줄)은 유지. `forbidden-words-496.ts`에 최소 반영.

## 회귀 명령
- `npm run regression:label-check` — 표시사항만(`label-check-suites.ts`).
- `npm run regression` — 전체(상세페이지 포함). 혼동 방지: `docs/label-check-rules-update.md` 한 줄.

## 무거운 도구 가드 vs label-check
- 가드 전수 대상: `scripts/`·`scripts/lib` 중 playwright/chromium 닫힌 집합. **`app/api/label-check*`는 대상 아님**(API 라우트).
- 우리 쪽이 가드 NG에 더하는 사실: `scripts/regression/label-check-492.ts`·`493.ts`가 `from "playwright"` 직접 import → 회귀 폴더 금지 규칙에 걸림. `scripts/label-check-mutation-492.ts`는 가드 import 없음.
- 제안(미적용, 판단 요청): (a) 회귀 예외 목록에 492/493 PDF 하네스 명시, 또는 (b) chromium PDF를 `scripts/` 하네스로만 두고 회귀는 미리 만든 PDF만 읽기, (c) mutation 스크립트에 `assertHeavyEntry`.

## baseline
- 표시사항 직전: `742cdd9` (482 마지막 docs, `77c0b87` TASK_483 직전).
