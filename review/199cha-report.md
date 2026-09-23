# 199차 — 198차 QA 스크립트 죽은 코드 제거 (API 0)

생성: 2026-09-16

## 요약

`scripts/198cha-reshoot-with-local-assets.ts`에서 미사용 `waitImg()` 헬퍼·호출·`nw1` 디버그 로그를 삭제. 프로덕션(`components/`, `lib/`) 미수정. API 0.

## 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 |
| `npx tsx scripts/198cha-reshoot-with-local-assets.ts` | failed 0 (에디토리얼 8 + 배너 2, 전부 `naturalWidth ≥ 1`) |
| `grep waitImg` | 0건 |
| API | 0 |

## Diff (핵심)

- 삭제: `waitImg()` 함수 정의 전체
- 삭제: 에디토리얼 루프의 `const nw = await waitImg(...)` + 주석
- 유지: `el.evaluate(...)` 이미지 대기 → 변수명 `nw`로 통일, FAIL 로그에서 `nw1` 제거
