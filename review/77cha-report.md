# 77차 리포트 — 캔버스 표 셀 편집 UX

## 요약

표(`table`) 요소에 **행·라벨·값 편집 패널**을 추가했다. `rows` 데이터는 기존 렌더/export가 그대로 읽으므로 export 로직 변경 없음.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `components/CanvasTableEditPanel.tsx` | 행 추가/삭제, 라벨·값 input |
| `components/CanvasSectionRenderer.tsx` | 표 선택 시 패널 조건부 노출 |
| `scripts/capture-77cha-canvas-table-edit.ts` | 미리보기·export QA |

## 동작

- 표 요소 선택 → `canvas-table-edit-panel` 표시
- 각 행: 라벨/값 `<input>` + 삭제 (1행만 남으면 삭제 비활성)
- 「행 추가」→ `{ label: "새 항목", value: "" }` append
- 변경 즉시 `patchCanvasElement` → 캔버스 미리보기 반영

## QA 스크린샷

- `review/qa-screenshots/77cha-canvas-table-edit-panel.png`
- `review/qa-screenshots/77cha-canvas-table-preview.png`
- `review/qa-screenshots/77cha-canvas-table-export.png`
- `review/qa-screenshots/77cha-canvas-table-export.html`

```bash
npx tsx scripts/capture-77cha-canvas-table-edit.ts
npx tsc --noEmit
```

## 체크리스트

- [x] `CanvasTableEditPanel` 신규 + `CanvasSectionRenderer` 연결
- [x] `patchCanvasElement`로 rows 반영
- [x] 마지막 1행 삭제 비활성
- [x] 미리보기·export 스크린샷
- [x] `tsc --noEmit` 0건
