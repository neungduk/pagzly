# 77차 — 캔버스 표(table) 요소 셀 편집 UX

## 목표

표 요소의 `rows` 라벨/값을 UI에서 편집·추가·삭제할 수 있게 한다. export 로직 변경 없음.

## 범위

- `components/CanvasTableEditPanel.tsx` — AI 패널과 동일한 조건부 노출
- `patchCanvasElement`로 `rows` 즉시 반영
- 마지막 1행 삭제 비활성

## QA

```bash
npx tsx scripts/capture-77cha-canvas-table-edit.ts
npx tsc --noEmit
```
