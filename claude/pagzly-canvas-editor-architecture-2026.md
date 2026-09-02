# Pagzly 자유 캔버스 에디터 — 아키텍처 & 단계별 계획

생성: 2026-09-02

## 왜 "브리프"가 아니라 이 문서인가

지금까지의 라운드(63~71차)는 전부 기존 구조(`DetailSection` 배열 + `DetailSectionRenderer`) 위에서 기능을 추가/보정하는 작업이었습니다. 이번 요청 — 후커블처럼 왼쪽에서 텍스트/도형/표/AI이미지를 페이지 아무 곳에나 자유 배치하고 개별 요소를 레이어로 관리 — 은 **페이지 데이터 모델 자체를 바꿔야** 합니다. 한 라운드짜리 지시서로 끝날 일이 아니라서, 먼저 전체 그림을 문서로 잡고 이후 라운드들을 이 계획에서 하나씩 떼어내는 방식으로 갑니다.

사용자 결정: "브리프가 아니라 갈아엎는 수준이라고 하더라도" 자유 캔버스 방향으로 간다 — 확인.

## 지금 구조 (바꾸기 전에 정확히 알아야 할 것)

- 페이지 = `DetailSection[]` — `hero`, `image_text`, `spec_table`, `gallery` 등 미리 정해진 타입의 배열. 각 섹션은 고정된 필드(heading/body/imageIndex 등)만 가짐.
- 렌더: `components/DetailSectionRenderer.tsx` (2,700줄+)가 `section.type`으로 switch — 화면 미리보기·인라인 편집(EditableText/ImageReplaceHit) 담당.
- 내보내기: `lib/export-detail-html.ts`가 같은 switch를 정적 HTML 문자열로 별도 구현 (69차에서 이 두 곳이 어긋나서 문제 됐던 전례 있음 — 이번에도 반드시 같이 감).
- 섹션 삽입 전례: `lib/section-inserts.ts`가 "히어로 바로 아래에 끼워넣기" 방식으로 이미 배열 중간 삽입을 하고 있음 (`insertSellerTrustEvidence`, GIF 삽입) — 완전히 새로운 개념은 아님.
- 색상: `lib/category-theme.ts`에 카테고리별 프리셋(`CategoryTheme`: accent/baseNeutral/deepAccent 등)이 이미 있고 렌더러가 `theme` prop으로 받아씀.
- 71차(진행 예정): result 페이지를 좌(섹션 목록)-중(캔버스)-우(섹션 채팅) 3분할로 재배치. 이건 그대로 유지 — 캔버스 에디터는 이 3분할 레이아웃 "중앙 영역" 안에 들어가는 걸로 봄.
- **참고**: 후커블 레이어 패널을 보면 페이지 전체가 무한 캔버스가 아니라, 텍스트/이미지/도형 요소들이 있고 "Frame 15090" 같은 프레임(=우리 개념의 섹션)으로 묶여 있음. 즉 후커블도 "섹션(프레임) 단위 자유 배치"이지 "페이지 전체 무한 캔버스"가 아닙니다 — 이 점이 마이그레이션 난이도를 크게 낮춰줍니다.

## 새 데이터 모델 (추가형 — 기존 타입 안 건드림)

`DetailSection` 유니언에 새 타입 하나만 **추가**합니다. 기존 타입(hero/image_text/spec_table 등)은 그대로 둡니다 — AI 자동 생성은 계속 안전한 기존 구조를 씀. 캔버스는 "사용자가 직접 추가/전환한 섹션"에서만 쓰이는 새 선택지입니다.

```ts
type CanvasElement =
  | { id: string; kind: "text"; role: "main" | "sub" | "body" | "custom";
      text: string; x: number; y: number; w: number; h: number; // % 기준 좌표
      fontSize?: number; color?: string; align?: "left" | "center" | "right"; z: number }
  | { id: string; kind: "image"; imageIndex?: number; url?: string;
      x: number; y: number; w: number; h: number; radius?: number; z: number }
  | { id: string; kind: "shape"; shape: "rect" | "circle" | "line";
      x: number; y: number; w: number; h: number; fill?: string; stroke?: string; z: number }
  | { id: string; kind: "table"; rows: { label: string; value: string }[];
      x: number; y: number; w: number; h: number; z: number }
  | { id: string; kind: "ai-image"; prompt: string; refImageUrl?: string; resultUrl?: string;
      x: number; y: number; w: number; h: number; z: number; status: "pending" | "done" | "failed" };

type CanvasSection = {
  type: "canvas";
  slot: string;
  frameWidth: number;   // 디자인 기준 폭 (예: 1080) — 요소 x/y/w/h는 이 좌표계의 %
  frameHeight: number;  // 프레임 높이 (auto 또는 고정)
  background?: { color?: string; imageUrl?: string };
  elements: CanvasElement[];
};
```

- 좌표는 **% 기반**(디자인폭 대비 비율)으로 저장 — 반응형 스케일링이 쉬움 (컨테이너 폭만 알면 어느 화면에서든 동일 비율로 렌더).
- `z`는 레이어 순서(=쌓임 순서). 후커블 "레이어" 패널의 눈(표시)/자물쇠(잠금)는 `hidden?: boolean` / `locked?: boolean` 필드로 나중에 추가.

## 렌더 & 내보내기 — 반드시 둘 다 같이

- `DetailSectionRenderer.tsx`에 `case "canvas":` 추가 — `elements`를 `position:absolute; left:{x}%; top:{y}%; width:{w}%; height:{h}%` 스타일로 `z` 순서대로 그림. 프레임 컨테이너는 `aspect-ratio: frameWidth/frameHeight`로 반응형 스케일.
- `export-detail-html.ts`에도 **같은 턴에** `case "canvas":` 추가 — 동일한 절대좌표 인라인 스타일로 정적 HTML 생성. (69차 교훈: 렌더러만 하고 export 빼먹으면 다운로드본이 깨짐 — 이번엔 처음부터 체크리스트에 못박음.)

## 편집기 UI (좌측 툴박스 → 후커블 매핑)

| 후커블 | Pagzly 대응 |
|---|---|
| 텍스트 (메인/서브/본문 카피 추가) | "텍스트 추가" 버튼 → 현재 선택된 캔버스 섹션에 `text` 요소 삽입, 기본 위치는 빈 공간 자동 배치 |
| 사진 | 기존 업로드 흐름 재사용, 캔버스 섹션 안에서는 `image` 요소로 드롭 |
| AI 생성 (프롬프트+참조이미지→이미지/GIF) | "AI 이미지 생성" 도구 — 프롬프트+선택적 참조이미지 → 기존 이미지 생성 파이프라인(`lib/photo-enhance.ts` 계열, Bria/Replicate) 재사용 → `ai-image` 요소로 삽입. 기존 크레딧 차감 로직(`app/api/generate` 결제 훅) 그대로 재사용 — 새 과금 로직 만들지 않음 |
| 도형 (표/선/도형 라이브러리) | `shape`/`table` 요소, 처음엔 사각형/원/선/기본 표 정도로 제한 (후커블 풀 라이브러리 전체를 1:1로 복제하지 않음) |
| 레이어 | 선택된 섹션의 `elements` 목록을 z순으로 보여주는 패널 (페이지 레벨 섹션 목록은 71차의 좌측 사이드바가 이미 담당 — 레이어 패널은 그 안에서 "섹션 선택 시 하위 요소 목록"으로 한 단계 더 들어감) |
| 색상 무드 | 기존 `CategoryTheme` 프리셋을 스와치로 노출 + 캔버스 요소 개별 색상 오버라이드 |

드래그/리사이즈는 직접 구현하지 않고 검증된 라이브러리(예: `react-moveable`, `react-rnd`, `interactjs`) 도입을 권장 — 스냅/충돌/터치 처리를 처음부터 새로 만드는 건 버그 리스크가 큼.

## 마이그레이션 전략 — 기존 상품 페이지를 절대 깨지 않는다

- 기존에 이미 생성된 상품들의 `sections` 데이터에는 `canvas` 타입이 없음 — 아무 마이그레이션도 필요 없이 그대로 계속 렌더됨.
- AI 자동 생성(`/api/generate`, `section-templates.ts`)은 **당분간 canvas 섹션을 생성하지 않음** — 자동 생성은 계속 안전한 기존 구조 사용. 캔버스는 "사용자가 결과 화면에서 직접 추가/편집할 때만" 쓰이는 기능으로 시작 → AI 생성 품질/안정성에 전혀 영향 없음.
- `assign-section-images.ts`, `apply-ingredient-circle-pair.ts`, `patch-section` API 등 기존 로직은 `canvas` 타입을 만나면 그냥 건드리지 않고 지나치도록(no-op) 처리 — 이번 단계에서 이 로직들을 canvas까지 확장할 필요 없음.

## 단계별 라운드 계획 (각 단계가 별도 cursor_brief가 됨)

- **72차 (Phase 1 — 데이터 모델 + 정적 렌더)**: `CanvasSection`/`CanvasElement` 타입 정의, 렌더러+익스포트 양쪽에 정적(드래그 없는) 절대좌표 렌더 추가, "빈 캔버스 프레임 추가" 버튼으로 섹션 배열에 삽입 가능하게. 편집 UI(드래그)는 아직 없음 — 우선 "보이기"만 맞춘다.
- **73차 (Phase 2 — 드래그/리사이즈 편집기)**: 라이브러리 도입, 텍스트/이미지 요소 드래그·리사이즈·인라인 텍스트 편집, 요소별 레이어 패널(눈/잠금/삭제).
- **74차 (Phase 3 — 도형·표·색상)**: 도형/표 요소 추가, 색상 테마 피커(전체 재적용 + 요소별 오버라이드).
- **75차 (Phase 4 — AI 이미지 생성 요소)**: 프롬프트+참조이미지 → 기존 생성 파이프라인 연동, 크레딧 차감 연동, 실패/재시도 처리.
- **76차 (Phase 5 — 안정화)**: 여러 카테고리 실제 생성물로 회귀 테스트, 모바일 반응형 스케일링, 요소 많은 페이지 렌더 성능, `npx tsc --noEmit` 전체 통과.

각 단계는 이전 단계가 실제로 화면에서 동작하는 걸 스크린샷으로 확인한 뒤에만 다음 단계로 넘어갑니다 (69차 사례처럼 "코드는 있는데 export만 빠짐" 같은 어긋남을 단계마다 잡기 위함).

## 리스크 / 솔직한 우려

- 볼륨이 큼 — 5단계 전부 합치면 최소 몇 주 분량. 중간에 우선순위 재조정 가능성 있음 (예: Phase 3~4는 나중으로 미루고 Phase 1~2만 먼저 프로덕션에 낼 수도 있음).
- `DetailSectionRenderer.tsx`가 이미 2,700줄대라 새 케이스 추가만으로도 파일이 더 커짐 — 이번 기회에 canvas 렌더 로직은 별도 컴포넌트(`CanvasSectionRenderer.tsx`)로 분리해서 넣는 걸 72차 브리프에서부터 못박아둠.
- AI 자동 생성 경로는 안 건드리므로 기존 판매자들이 쓰는 핵심 기능(상세페이지 자동 생성)은 이 프로젝트 기간 내내 리스크 없음 — 캔버스는 순수 추가 기능.
