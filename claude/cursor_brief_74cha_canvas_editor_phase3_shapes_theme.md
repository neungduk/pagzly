# 74차 — 캔버스 Phase 3: 도형·표·색상 테마

## 목표

72–73차에서 만든 자유 캔버스 편집기에 **도형 추가**, **표 요소**, **카테고리 테마 색상** 적용을 붙인다. 렌더와 HTML export를 함께 맞춘다.

## 범위

### 데이터 모델
- `CanvasElement` union에 `kind: "table"` 추가 (`rows`, `headerColor`, `borderColor`)
- `createCanvasShapeElement`, `createCanvasTableElement`
- `applyCanvasThemeBackground`, `patchCanvasElementColorFromTheme`

### UI
- 편집 툴바: 사각형 / 원 / 선 / 표 버튼 (`data-testid`: `canvas-add-rect` … `canvas-add-table`)
- `CanvasThemePicker`: `CategoryTheme` 스와치 4종 — 선택 없으면 배경, 요소 선택 시 해당 요소 색
- 요소별 직접 색 입력 (text color, shape fill/stroke, table header/border)
- `DetailSectionRenderer` → `CanvasSectionRenderer`에 `theme` 전달

### Export
- `lib/canvas-section-export-html.ts`에 table 렌더 분기

## QA

```bash
npx tsx scripts/capture-74cha-canvas-shapes.ts
```

스크린샷:
- `review/qa-screenshots/74cha-canvas-toolbar-shapes.png`
- `review/qa-screenshots/74cha-canvas-theme-picker.png`
- `review/qa-screenshots/74cha-canvas-shapes-table.png`

## 완료 기준

- [x] table 타입 + mutations
- [x] 도형/표 툴바 + 렌더/export
- [x] 테마 스와치 + 요소 색 오버라이드
- [x] QA 캡처 스크립트

## 다음 (75차)

AI 이미지 요소 + 생성 파이프라인 연동 (`pagzly-canvas-editor-architecture-2026.md` 참고)
