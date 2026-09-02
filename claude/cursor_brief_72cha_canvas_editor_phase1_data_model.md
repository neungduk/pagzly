# 72차 — 자유 캔버스 에디터 Phase 1: 데이터 모델 + 정적 렌더

생성: 2026-09-02

## 배경

후커블(hookable.ai) 편집 화면처럼 텍스트/도형/표/AI이미지를 자유 배치하는 캔버스 에디터를 만들기로 결정했습니다 (전체 계획: `pagzly-canvas-editor-architecture-2026.md` 참고 — 이번이 5단계 중 Phase 1입니다).

**이번 라운드 목표는 "편집 가능하게" 만드는 게 아니라, 새 섹션 타입이 데이터로 존재하고 화면/다운로드본 양쪽에 정적으로(드래그 없이) 정확히 보이게 만드는 것**입니다. 드래그·리사이즈·레이어 패널 등 실제 편집 UI는 73차(Phase 2)에서 합니다.

## 왜 이렇게 나누나

기존 `DetailSection`(hero/image_text/spec_table 등) 구조는 **절대 건드리지 않습니다.** AI 자동 생성(`/api/generate`, `section-templates.ts`)은 이번 단계에서 canvas 섹션을 전혀 만들지 않습니다 — 캔버스는 사용자가 결과 화면에서 수동으로 추가하는 새 섹션 타입 하나를 추가하는 것뿐입니다. 기존에 이미 생성된 상품들은 영향 없음(마이그레이션 불필요).

## 작업 A — 타입 정의

`lib/types/generate.ts`의 `DetailSection` 유니언에 새 타입 추가 (기존 타입들 옆에 추가만, 삭제/수정 없음):

```ts
export type CanvasElement =
  | { id: string; kind: "text"; role: "main" | "sub" | "body" | "custom";
      text: string; x: number; y: number; w: number; h: number;
      fontSize?: number; color?: string; align?: "left" | "center" | "right"; z: number }
  | { id: string; kind: "image"; imageIndex?: number; url?: string;
      x: number; y: number; w: number; h: number; radius?: number; z: number }
  | { id: string; kind: "shape"; shape: "rect" | "circle" | "line";
      x: number; y: number; w: number; h: number; fill?: string; stroke?: string; z: number };

export type CanvasSection = {
  type: "canvas";
  slot: string;
  frameWidth: number;
  frameHeight: number;
  background?: { color?: string; imageUrl?: string };
  elements: CanvasElement[];
};
```

- `x/y/w/h`는 `frameWidth`/`frameHeight` 기준 **%**(0~100)로 저장 — 반응형 스케일링을 쉽게 하기 위함, px 절대값 저장 금지.
- 도형(`shape`)과 표(`table` 요소)는 타입만 미리 만들어두고, 실제 UI는 74차에서. AI 이미지 요소 타입도 74~75차에서 추가 — 이번엔 text/image/shape 세 종류 타입만.

## 작업 B — 렌더 (앱 내 미리보기)

새 파일 `components/CanvasSectionRenderer.tsx`를 만들어서 여기에 canvas 렌더 로직을 넣어주세요 (`DetailSectionRenderer.tsx`가 이미 2,700줄대라 더 키우지 않기 위함). `DetailSectionRenderer.tsx`의 섹션 switch에 `case "canvas": return <CanvasSectionRenderer section={section} .../>` 한 줄만 추가.

- 프레임 컨테이너: `aspect-ratio: frameWidth / frameHeight`, `position: relative`, `width: 100%`.
- 각 요소: `position: absolute; left: {x}%; top: {y}%; width: {w}%; height: {h}%`, `z-index: {z}`.
- text 요소: `role`에 따라 기존 타이포 토큰(`TYPO.sectionTitle` 등, 파일 안에서 이미 쓰는 것) 재사용해서 폰트 크기 기본값 정하고, `fontSize`/`color`/`align`이 있으면 override.
- image 요소: 기존 `SectionImage`/`resolveImage` 헬퍼 재사용 (imageIndex 있으면 `imageUrls`에서, 없으면 `url` 직접).
- shape 요소: 이번엔 `rect`(둥근 사각형 div)와 `circle`(border-radius:50%)만 스타일로 렌더, `line`은 `<div>` 얇은 바로. SVG 라이브러리 새로 도입할 필요 없음.
- 드래그/클릭 편집 기능 없음 — 이번 라운드는 순수 정적 렌더.

## 작업 C — 내보내기 (export-detail-html.ts) — **반드시 B와 같은 커밋에서**

`lib/export-detail-html.ts`의 섹션 switch에 `case "canvas":`를 추가해서, 작업 B와 **동일한 절대좌표 규칙**으로 인라인 스타일 정적 HTML을 생성해주세요.

> 69차 때 렌더러만 고치고 export를 빼먹어서 다운로드본이 미리보기와 달라지는 문제가 있었습니다 (`cursor_note_69cha_real_verification.md` 참고 — 이건 나중에 확인해보니 실제로는 반영돼 있었던 걸로 정정됐지만, 앞으로도 "렌더러+export 동시 반영"은 원칙으로 지켜주세요). 이번엔 처음부터 B/C를 같은 작업 단위로 묶어서, 검증 때 둘 다 확인합니다.

## 작업 D — "빈 캔버스 프레임 추가" 버튼 (최소한의 진입점)

`app/create/result/page.tsx`의 "구조" 탭(또는 71차에서 만들어질 좌측 사이드바)에 "자유 캔버스 추가" 버튼 하나만 추가 — 클릭하면 빈 `CanvasSection`(요소 0개, 기본 `frameWidth: 1080, frameHeight: 720`, 배경은 현재 카테고리 테마의 `baseNeutral`)을 섹션 배열 끝(cta_price 바로 앞)에 삽입. `lib/section-inserts.ts`의 기존 삽입 패턴(`insertSellerTrustEvidence` 등) 참고해서 같은 스타일로 함수 하나 추가 (`insertEmptyCanvasSection`).

요소를 실제로 추가/편집하는 UI는 이번 라운드에 없습니다 — 빈 프레임이 보이기만 하면 됩니다 (다음 라운드에서 요소 추가 UI를 얹음). 검증을 위해, 이번 라운드에 한해서만 **테스트 스크립트에서 코드로 요소 2~3개(text 1개 + image 1개 + shape 1개)를 채운 fixture**를 만들어서 렌더/export가 맞는지 확인해주세요 (사용자가 쓸 UI는 아니고, QA 전용).

## 하지 않는 것

- 드래그/리사이즈/클릭 편집 없음 (73차).
- 도형 라이브러리 전체, 표 요소, AI 이미지 요소 없음 (74~75차).
- 레이어 패널 없음 (73차).
- 기존 `DetailSection` 타입/AI 생성 로직/`assign-section-images.ts`/`apply-ingredient-circle-pair.ts`/`patch-section` API 변경 없음 — canvas 타입을 만나면 그냥 지나치도록 두면 됨(no-op), 이 로직들을 canvas까지 확장하지 않음.
- 71차(3분할 레이아웃)와 별개 작업입니다 — 71차가 먼저 끝났으면 그 위에서, 아직이면 기존 result 페이지 구조에 그냥 추가.

## 검증 방법

- QA fixture로 text+image+shape 요소가 섞인 canvas 섹션 1개를 만들어서:
  - 앱 내 미리보기 스크린샷 (`review/qa-screenshots/72cha-canvas-preview.png`)
  - **"다운로드" 버튼으로 받은 실제 export HTML 파일**을 브라우저로 열어서 스크린샷 (`72cha-canvas-export.png`) — 미리보기와 픽셀 단위로 같은 위치에 나오는지 육안 확인
  - 좁은 화면(모바일 폭)에서도 요소 비율이 안 깨지는지 스크린샷
- 기존 상품(canvas 섹션 없는 것) 렌더에 회귀 없는지 확인.
- `npx tsc --noEmit` 에러 0건.

## 완료 보고 체크리스트

- [ ] `CanvasSection`/`CanvasElement` 타입 추가 (`lib/types/generate.ts`)
- [ ] `components/CanvasSectionRenderer.tsx` 신규 + `DetailSectionRenderer.tsx` 연결
- [ ] `export-detail-html.ts`에 canvas case 추가, 미리보기와 동일 좌표 규칙 확인
- [ ] "자유 캔버스 추가" 버튼 + `insertEmptyCanvasSection` 함수
- [ ] QA fixture 스크린샷 3장 (미리보기/export/모바일), `ls -la`로 실존·바이트 크기 확인 후 보고서 첨부
- [ ] 기존 상품 렌더 회귀 없음 확인
- [ ] `npx tsc --noEmit` 에러 0건
