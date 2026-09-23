# 211차 — 라이프스타일 pasteCutoutOnScene 매칭 3축 보강 (API 0)

생성: 2026-09-17

## 요약

메인 히어로 경로(162~187)에만 있던 `matchCutoutWhiteBalance` / `matchCutoutSharpness` / `matchCutoutGrain`을 `pasteCutoutOnScene`에도 동일 순서로 배선. 함수 본체·배치/리사이즈 로직은 미변경. API 0.

## Diff (핵심)

`lib/lifestyle-product-composite.ts` — photo-composite import 3개 추가 + resize 확정 직후:

```ts
cutoutPrepared = await matchCutoutWhiteBalance(cutoutPrepared, sceneBuffer);
cutoutPrepared = await matchCutoutSharpness(cutoutPrepared, sceneBuffer);
cutoutPrepared = await matchCutoutGrain(cutoutPrepared, sceneBuffer);
```

## 검증

| # | 항목 | 결과 |
|---|------|------|
| 1 | 매끈 씬 → grain/sharpness identical, WB valid | pass |
| 2 | 파란 씬 → 컷아웃 B/R↑ | pass |
| 3 | 거친 씬 → grain alpha 0.02~0.05 | pass |
| 4 | pasteCutoutOnScene PNG size = scene | pass |
| 5 | `npx tsc --noEmit` | 0 |
