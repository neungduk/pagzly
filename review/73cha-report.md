# 73차 — 자유 캔버스 Phase 2: 드래그/리사이즈 편집기

생성: 2026-09-02

## 요약

`react-rnd`로 캔버스 요소 드래그·리사이즈, 더블클릭 텍스트 편집, 레이어 패널(숨김/잠금/삭제)을 구현했습니다. `editMode` + 기존 `DetailSectionRenderer` edit API로 연결됩니다.

## 변경 사항

- `react-rnd` 의존성 추가
- `lib/types/generate.ts` — `hidden` / `locked` 필드
- `lib/canvas-section-mutations.ts` — 요소 CRUD·토글 헬퍼
- `components/CanvasSectionRenderer.tsx` — 편집 모드(Rnd), 툴바(텍스트/이미지 추가)
- `components/CanvasLayerPanel.tsx` — 레이어 목록 + 눈/잠금/삭제
- `lib/canvas-section-export-html.ts` — `hidden` 요소 export 제외
- `DetailSectionRenderer` — canvas `edit` prop 전달

## 사용법

1. result 페이지에서 **편집 시작**
2. 캔버스 섹션에서 요소 드래그·모서리 리사이즈
3. 텍스트 더블클릭 → 인라인 수정
4. 레이어 패널에서 숨김/잠금/삭제

## 완료 체크리스트

| 항목 | 결과 |
|------|------|
| react-rnd 드래그/리사이즈 | ✅ |
| 인라인 텍스트 편집 | ✅ |
| 레이어 패널 (눈/잠금/삭제) | ✅ |
| export hidden 반영 | ✅ |
| QA 스크린샷 | ✅ |
| `npx tsc --noEmit` | ✅ 앱 코드 0건 |

## 스크린샷

```
73cha-canvas-edit-mode.png      36,393 bytes
73cha-canvas-layer-panel.png    15,053 bytes
73cha-canvas-after-drag.png     48,869 bytes
```

## 검증

```bash
npx tsx scripts/capture-73cha-canvas-edit.ts
```

## 다음

74차 — 도형·표·색상 테마 피커 (Phase 3)
