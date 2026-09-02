# 74차 리포트 — 캔버스 Phase 3 (도형·표·색상)

## 요약

자유 캔버스 편집 모드에 **도형(사각형·원·선)·표 추가**와 **카테고리 테마 색상 피커**를 구현했다. 미리보기와 HTML export 모두 `table` kind를 지원한다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/types/generate.ts` | `CanvasElement`에 `table` kind |
| `lib/canvas-section-mutations.ts` | shape/table 생성, 테마 배경·요소 색 패치 |
| `components/CanvasSectionRenderer.tsx` | table 렌더, 도형/표 툴바, theme prop |
| `components/CanvasThemePicker.tsx` | 스와치 + 요소별 color input |
| `components/DetailSectionRenderer.tsx` | canvas에 `theme` 전달 |
| `lib/canvas-section-export-html.ts` | table export HTML |
| `lib/canvas-section-fixture.ts` | QA fixture에 표 요소 |
| `scripts/capture-74cha-canvas-shapes.ts` | QA 캡처 |

## 동작

1. **편집 툴바** — 텍스트·이미지 외에 사각형/원/선/표 추가. 새 요소는 테마 `accentSoft`·`deepAccent`를 기본 색으로 사용.
2. **색상 테마** — `baseNeutral` / `accentSoft` / `accent` / `deepAccent` 스와치. 요소 미선택 시 캔버스 배경, 선택 시 text→color, shape→fill, table→headerColor.
3. **표** — 2열 스펙 테이블(라벨/값). 드래그·리사이즈·레이어 패널은 73차와 동일.
4. **Export** — hidden 요소 제외, table border/header 색 인라인 스타일 유지.

## QA 스크린샷

- `review/qa-screenshots/74cha-canvas-toolbar-shapes.png`
- `review/qa-screenshots/74cha-canvas-theme-picker.png`
- `review/qa-screenshots/74cha-canvas-shapes-table.png`

```bash
npx tsx scripts/capture-74cha-canvas-shapes.ts
```

## 다음 단계

**75차** — AI 이미지 캔버스 요소 + 생성 파이프라인 (`claude/pagzly-canvas-editor-architecture-2026.md`)
