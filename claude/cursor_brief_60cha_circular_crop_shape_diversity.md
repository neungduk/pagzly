# 60차 — 사진 형태 다양성 (원형 크롭)

생성: 2026-09-01

## 배경

채점 결과 기준 5(채움률/형태 다양성)는 부분 합격입니다. `comparison_chart`/
`step_card`류는 5개 카테고리 전반에 실제로 잘 채워져 있어서 그 부분은 합격인데,
사진 형태는 51차 QA 스크린샷 5개 카테고리 전 구간을 다 봐도 예외 없이 전부
사각형(둥근 모서리)뿐이고 원형 크롭이 단 한 곳도 없습니다. 사용자가 제공한
베르가모 레퍼런스엔 원형 크롭 사진이 등장합니다.

코드에서 확인: `components/DetailSectionRenderer.tsx`의 `image_text` 섹션 중
`layout === "compact"` 분기(약 1074~1118행)를 보면 썸네일이

```tsx
<SectionImage
  src={src}
  ...
  className="h-24 w-24 rounded-xl object-cover sm:h-[7.5rem] sm:w-[7.5rem]"
/>
```

로 고정 사각형(둥근 모서리)입니다. "무향 케어", "3중 레이어" 같은 작은 아이콘형
사진들이 전부 이 컴포넌트를 씁니다 — 원형 크롭을 넣기 가장 적합하고 리스크가
작은 지점입니다 (히어로나 메인 제품컷처럼 제품 전체가 보여야 하는 곳이 아니라
보조 아이콘 사진이라, 원형으로 잘려도 제품 인식에 지장이 없음).

## 작업

- `lib/types/generate.ts`의 `ImageTextSection`에 optional 필드
  `imageShape?: "square" | "circle"` 추가.
- `DetailSectionRenderer.tsx`의 `compact` 레이아웃 렌더링에서
  `section.imageShape === "circle"`이면 `rounded-xl` 대신 `rounded-full`
  적용(정사각형 박스 크기 자체는 유지, 모서리 처리만 다르게).
- AI가 이 필드를 명시적으로 안 채워주는 경우를 대비한 fallback: 한 상세페이지
  안에서 `compact` 레이아웃 섹션이 2개 이상 등장하면, 등장 순서(0-based index)가
  짝수면 `square`, 홀수면 `circle`로 자동 배정 — AI 프롬프트 변경 없이 렌더러
  로직만으로 형태가 섞이게 해주세요. `compact` 섹션이 1개뿐이면 그대로 `square`
  유지(원형 하나만 튀어 보이는 것 방지).

## 검증 (무료)

`/dev/detail-preview?capture=1` 등 기존 프리뷰 라우트의 목업 데이터에 `compact`
레이아웃 `image_text` 섹션이 최소 2개 이상 포함된 시나리오가 있는지 확인하고,
없으면 최소한으로 추가해주세요. 캡처해서 사각형/원형이 섞여서 렌더링되는지
스크린샷으로 확인.

## 하지 않는 것

- 히어로, 메인 제품 갤러리, `layout: "full"`/`"callout"` 등 제품 전체가 보여야
  하는 이미지에는 원형 크롭 적용 안 함 (제품이 잘려 보이면 역효과)
- `gallery`, `highlight_box` 등 다른 섹션 타입으로 확장 안 함 — 이번은 `image_text`
  `compact` 레이아웃 한정
- 59차(주석형 콜아웃)가 같은 파일(`ImageTextSection`, `DetailSectionRenderer.tsx`
  image_text 분기)을 건드리니, 60차를 먼저 끝내고 59차를 그 위에 얹어주세요
  (통합 지시서 참고)

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] `imageShape: "circle"` 값일 때 compact 썸네일이 원형으로 렌더링
- [ ] 필드가 없을 때 index 기반 자동 배정으로 사각/원형이 섞여서 나옴
- [ ] 히어로/메인 갤러리 등 다른 섹션은 원형 적용 안 됨 (회귀 없음)
- [ ] `/api/generate` 호출 0건

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, 체크리스트 결과, 스크린샷 경로·바이트 크기.
