# 138차 — 섹션별 설득 프레임워크 라벨 (판매자 전용)

생성: 2026-09-08

## 요약

- 고정 매핑 `lib/section-persuasion-labels.ts` (21타입 라벨 / `canvas` 제외, AI·유료 API 0)
- 판매자 에디터 `DetailStructureSidebar`에만 소형 배지 노출 (`data-testid="section-framework-badge"`)
- 구매자 렌더러·export HTML에는 import/노출 없음 (grep 검증)

## 구현

### A. 매핑 상수
- `SECTION_FRAMEWORK_LABEL` + `getSectionFrameworkLabel()`
- 두려움 조성 표현("반박 제거" 등) 미사용 — `faq` → "질문 대응"

### B. 사이드바 배지
- 섹션 제목 옆 `text-[10px] text-slate-blue bg-slate-blue/10`
- 라벨 없는 타입(`canvas`)은 배지 DOM 자체를 렌더하지 않음

## 검증

| 항목 | 결과 |
|------|------|
| 손검산표 `review/138cha-label-map.txt` | 22행(21 매핑 + canvas 라벨 없음) |
| 스크린샷 | `review/qa-screenshots/138cha-framework-badges.png` |
| canvas 배지 | `canvas-badge=0` |
| buyer grep (`export-detail-html.ts`, `DetailSectionRenderer.tsx`) | CLEAN (import 없음) |
| `tsc --noEmit` | EXIT_CODE=0 |
| 신규 API 호출 | 0 |

## 채택하지 않은 것 (기록)

- 드랩아트식 가짜 리뷰/이벤트 자동 생성 — 금지 유지
- 구매자 상세/export에 라벨 노출 — 금지
- KC/pain-headline — 이미 완료되어 본 라운드 제외

## git diff --stat (핵심)

```
 components/DetailStructureSidebar.tsx    |  14 ++-
 lib/section-persuasion-labels.ts         |  32 ++++++
 scripts/138cha-framework-labels-smoke.ts | 181 +++++++++++++++++++++++++++++++
```
