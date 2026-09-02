# 76차 — 캔버스 Phase 5: 안정화

## 목표

72~75차 캔버스 에디터를 프로덕션 품질로 마무리한다.

## 범위

### 모바일
- `useCanvasMobileEdit` — 1023px 이하에서 Rnd 드래그 비활성, 정적 % 레이아웃 유지
- `canvas-mobile-edit-hint` 안내 배너

### 성능
- `sortCanvasElements` `useMemo`
- `StaticCanvasElement` / `EditableCanvasElement` `memo`
- `buildCanvasStressFixtureSection` — 24+ 요소

### 미리보기·export 정리
- `visibleCanvasElements({ hideIncompleteAi: true })` — 미완료 AI 이미지는 뷰/export에서 제외

### tsc
- `review/pixabay-cosmetics-test/crawl-pixabay.mts` Page 타입 수정

### QA
```bash
npx tsc --noEmit
npx tsx scripts/capture-76cha-canvas-stabilization.ts
```

스크린샷: beauty/electronics 회귀, stress 24요소, 모바일 힌트
