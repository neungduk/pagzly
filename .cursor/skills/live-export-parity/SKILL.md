---
name: live-export-parity
description: 상세페이지 렌더링 코드(섹션 레이아웃, 글자 크기, 이미지 비율, 여백, 사진 배정 표시)를 고칠 때 사용한다. 라이브 렌더러(components/DetailSectionRenderer.tsx)와 export HTML(lib/export-detail-html.ts)을 항상 함께 고치고 390·750 폭 패리티를 검증한다. "export 타이틀 크기", "섹션 스타일 변경", "패리티" 질문에도 사용한다.
---

# 라이브 ↔ export 패리티

## 두 렌더러를 함께 고친다

- 라이브: `components/DetailSectionRenderer.tsx`
- export: `lib/export-detail-html.ts`
- 한쪽만 고치지 않는다. 라이브의 Tailwind 클래스와 export의 인라인 CSS가 같은 값이 되게 한다. 예를 들어 export에서 뒤에 오는 `margin:0`이 앞의 `margin:auto`를 덮지 않는지 확인한다.

## 값은 토큰을 거친다

- 크기·비율·여백은 하드코딩하지 않는다. `lib/design-tokens.ts`의 토큰(`FONT_SIZE`, `IMAGE_RATIO`, `SLOT_IMAGE_RATIO` 등)과 `resolveSlotImageRatio`, `imageRatioCss`를 거친다.
- 새 수치가 필요하면 토큰을 추가하고 두 렌더러가 같은 토큰을 읽게 한다.

## 같은 입력, 같은 표시 규칙

- 렌더 시점에 계산하는 규칙은 `lib/display-sections.ts`의 `applyDisplayRules`(흐름 순서 → 굵은 블록 1개 → 같은 소스 사진 상한 → 말풍선 정리 → 고민 사진 띠)에 모으고, 라이브와 export가 같은 입력으로 부른다.
- 입력 순서는 결과 페이지와 같다: 사용자 숨김 → 표시 예산(`applySectionDisplayBudget`) → `applyDisplayRules`. export는 전체 섹션 + `hiddenIndexes`를 받아 같은 순서로 직접 적용한다.
- 저장 데이터는 바꾸지 않는다. 편집 모드에서는 순서만 맞추고, 원본 인덱스 매핑(`sourceIndexes`)으로 편집 콜백을 되돌린다.

## 사진 반복 상한

- 같은 소스 사진(같은 URL·파생본)은 한 페이지에서 `IMAGE_SOURCE_CAP.maxUses`(2)를 넘기지 않는다.
- 사진이 모자라면 같은 사진을 반복하지 말고 텍스트·인포그래픽 형태로 바꾼다.

## 검증

1. dev 서버를 켠다(`npm run dev`).
2. 글자 패리티를 돌린다(약 13분):
   ```
   $env:PLAYWRIGHT_BROWSERS_PATH="$env:LOCALAPPDATA\ms-playwright"; $env:SESSION="review/beauty-sample-1012/session.json"; $env:LABEL="NNN"; npx tsx scripts/286cha-type-parity-verify.ts *> review/NNN-parity.txt
   ```
3. 판정: `diff=` 272줄 중 `diff=0`·`diff=-`·illustration_banner를 뺀 나머지가 0줄이어야 한다. 기존에 있던 `export=- diff=-` 22줄은 예외다.
4. `review/286cha-parity-NNN/side-*.jpg`(390·750 나란히 캡처)를 눈으로 비교한다.
5. 새 요소(data 속성 마커, 열 수, `<img>` 수)를 추가했으면 라이브 DOM과 export HTML의 개수를 견본별로 비교한다.
6. 끝나면 환경변수(`SESSION`, `LABEL` 등)를 지우고 dev 서버를 끈다.
