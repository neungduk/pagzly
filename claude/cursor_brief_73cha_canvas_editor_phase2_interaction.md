# 73차 — 자유 캔버스 Phase 2: 드래그/리사이즈 편집기

생성: 2026-09-02  
참고: `pagzly-canvas-editor-architecture-2026.md` Phase 2

## 목표

72차에서 만든 정적 `CanvasSection`에 **편집 UI**를 얹습니다.

- `react-rnd` (또는 동급)로 드래그·리사이즈
- 텍스트 더블클릭 인라인 편집
- 요소별 레이어 패널: 숨김(눈) / 잠금 / 삭제
- `editMode` + 기존 `SectionEditApi.onChange`로 섹션 저장

## 하지 않는 것

- 도형 라이브러리 확장, 표, AI 이미지 (74~75차)
- `/api/generate`·AI 자동 생성 변경
- export 좌표 규칙 변경 (hidden만 반영)

## 검증

- 편집 모드 스크린샷, 레이어 패널, 드래그 후 스크린샷
- `npx tsx scripts/capture-73cha-canvas-edit.ts`
