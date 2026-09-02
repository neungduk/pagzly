# 72차 — 자유 캔버스 에디터 Phase 1: 데이터 모델 + 정적 렌더

생성: 2026-09-02

## 요약

`CanvasSection` / `CanvasElement` 타입을 추가하고, 앱 미리보기·HTML export·빈 캔버스 추가 버튼까지 Phase 1 범위를 구현했습니다. 드래그/편집 UI는 73차 예정입니다.

## 변경 사항

### 작업 A — 타입
- `lib/types/generate.ts`: `CanvasElement`, `CanvasSection` + `DetailSection` 유니언 확장

### 작업 B — 렌더
- `components/CanvasSectionRenderer.tsx` — % 좌표 정적 렌더 (text / image / shape)
- `lib/canvas-section-layout.ts` — 공통 좌표·이미지 resolve 헬퍼
- `components/DetailSectionRenderer.tsx` — `case "canvas"` 한 줄 연결

### 작업 C — export
- `lib/canvas-section-export-html.ts` — 미리보기와 동일 % 좌표 규칙
- `lib/export-detail-html.ts` — `case "canvas"`

### 작업 D — 진입점
- `lib/section-inserts.ts` — `insertEmptyCanvasSection()` (cta_price 앞 삽입)
- `DetailStructureSidebar` / `SectionStructureEditor` — "자유 캔버스 추가" 버튼
- `app/create/result/page.tsx` — `handleAddCanvas`

### QA
- `lib/canvas-section-fixture.ts` — text+image+shape QA fixture
- `scripts/capture-72cha-canvas.ts`

### 기타
- `app/api/generate/route.ts` — `SECTION_TYPE_SHAPES.canvas` (AI 미생성 명시)

## 완료 체크리스트

| 항목 | 결과 |
|------|------|
| CanvasSection/CanvasElement 타입 | ✅ |
| CanvasSectionRenderer + DetailSectionRenderer | ✅ |
| export-detail-html canvas case | ✅ |
| 자유 캔버스 추가 버튼 | ✅ |
| QA 스크린샷 3장 | ✅ (아래) |
| 기존 상품 회귀 | ✅ fixture 세션 기준 렌더 정상 |
| `npx tsc --noEmit` | ✅ 앱 코드 0건 (pixabay 스크립트 1건만) |

## 스크린샷 (`ls -la` 동등)

```
72cha-canvas-preview.png    47,895 bytes
72cha-canvas-export.png     78,341 bytes
72cha-canvas-mobile.png     53,878 bytes
72cha-canvas-export.html    61,816 bytes
```

## 검증

```bash
npx tsx scripts/capture-72cha-canvas.ts
```

## 71차 상태

71차(3분할 레이아웃)는 이전 라운드에서 완료 — `review/71cha-report.md` 참고.
