# 다이나믹 대공사 진단 (467차 Phase 0 — 측정·조사, 목표는 코드 전에 확정)

도구: `scripts/dynamics-metrics-467.ts`(문자열 전용, 반복 style 묶음 해제 후 본문 섹션 마크업을 읽는다). 말뭉치 21 × (UP1 + 아키타입 8종, 466차 끝 상태).

## 1. 전 기준선 (페이지당 평균, 지표 정의는 도구 머리말)
| 조건 | ①겹침 | ②기울임 | ③원·도형(작은 아이콘 원 포함) | ④초점 스케일 중앙값 | ⑤같은 카드 서명 비율 | ⑥직선 이음새 비율 | ⑦사진 틀 종류 | ⑧비대칭 구도 |
|---|---|---|---|---|---|---|---|---|
| UP1 | 4.0 | 1.1 | 69.1 | 1.73 | 0.79 | 0.82 | 4.0 | 8.4 |
| editorial | 4.9 | 0.0 | 62.9 | 1.80 | 0.61 | 0.79 | 3.4 | 10.2 |
| catalog | 4.6 | 0.0 | 65.2 | 1.67 | 0.61 | 0.80 | 3.0 | 7.7 |
| softlife | 3.3 | 1.2 | 76.0 | 1.73 | 0.61 | 0.80 | 3.6 | 8.6 |
| impact | 6.2 | 0.0 | 66.6 | 1.93 | 0.79 | 0.79 | 3.7 | 8.4 |
| techsheet | 4.2 | 0.0 | 50.7 | 1.60 | 0.61 | 0.81 | 3.1 | 10.7 |
| narrative | 8.5 | 4.1 | 69.7 | 1.80 | 0.61 | 0.79 | 3.9 | 10.0 |
| luxe | 9.5 | 0.4 | 57.7 | 1.73 | 0.61 | 0.80 | 3.0 | 10.2 |
| pop | 4.6 | 6.8 | 71.0 | 1.87 | 0.77 | 0.80 | 3.4 | 7.7 |
읽는 법: ④ 1.7 = 섹션 안 가장 큰 글자가 본문(15px)의 약 1.7배(≈26px)뿐 — 초점이 약하다. ⑥ 0.8 = 섹션 경계 열 중 여덟이 이음새 도형 없는 수평 직선. ⑤ 0.6~0.8 = 카드 열 중 여섯~여덟이 같은 반경·그림자 상자. ② 기울임은 pop·narrative 외엔 거의 0. 사용자 평가("그림판 같다")와 맞는다.

## 2. export·PNG 경로에서 안전한 SVG·CSS 조사
PNG 다운로드는 `lib/capture-detail-png.ts`가 `html-to-image`(`toSvg`, foreignObject 복제)로 만든다. 즉 브라우저가 그리는 인라인 스타일·인라인 SVG는 그대로 복제되고, 외부 이미지는 data URL로 인라인한다.
| 요소 | 레포 내 사용(파일 수) | 말뭉치 export 등장 | 판정 |
|---|---|---|---|
| `transform: rotate/translate` | 6 | 있음(스티커·접점 띠) | **사용** |
| 음수 `margin` | 4 | 있음(히어로 스트립 겹침 −12px 등) | **사용**(래퍼 `overflow:hidden` 안) |
| SVG `path·circle·ellipse·polygon·linearGradient·radialGradient`, `stroke-dasharray` | 모티프·구분선·일러스트·링 다이어그램 | 있음 | **사용** |
| CSS `linear/radial-gradient` 배경 | 다수 | 있음 | **사용** |
| `clip-path` | 5 | 사진 오버레이 일부 | **쓰지 않음**(지시서 금지, 기존 사용은 그대로) |
| `mix-blend-mode`, `filter`, `backdrop-filter` | 2~3 | `filter`/`backdrop-filter`는 기존 일부 | **쓰지 않음**(지시서 금지) |
| SVG `textPath`, `<filter>`, `feGaussianBlur` | 2(일러스트 라이브러리) | 없음 | **쓰지 않음**(foreignObject 복제 호환 미확인 → **불확실 목록**) |
| `<use>`/`<symbol>` | 0 | 없음 | **쓰지 않음**(레포에 사용례 없음 → 불확실) |
| `<mask>` | 0 | 없음 | **쓰지 않음** |
| CSS 애니메이션 | 라이브 전용 | - | Phase 6(별도 플래그)에서만 |
불확실 목록(쓰지 않음): `<use>`/`<symbol>` 재사용, `textPath`, SVG `<filter>`, `clip-path` 신규 사용, `mix-blend-mode`. 같은 SVG 반복은 문자열로 그대로 쓰되 크기 상한(UP1 +35%)을 회귀가 본다.

## 3. 일반 섹션 후보 (V5 단일 소스로 다시 그릴 수 있는 것)
말뭉치 21페이지 V5 표시 섹션 구성: v4 블록 208 · 기존 임팩트 132 · 히어로 21 · image_text 21 · ai_disclosure 21 · cta_price 20 · highlight_box 15 · illustration_banner 15 · stat_infographic 15 · gallery 9 · spec_table 8 · target_persona 5 · comparison_table 3 · checklist 3 · color_variation 2 · review_highlight 1 · step_card 1. (FAQ·사용 순서·신뢰 근거는 이미 v4 블록으로 변환됨.)
| 순위 | 종류 | 빈도 | 라이브/export | 인터랙션 | 판단 |
|---|---|---|---|---|---|
| 1 | image_text | 21 | 두 벌 | 없음 | 다시 그리기 후보(사진+글) |
| 2 | highlight_box | 15 | 두 벌 | 없음 | 후보(카드 묶음) |
| 3 | stat_infographic | 15 | 두 벌 | 없음 | 후보(큰 숫자 — **입력 수치만**, 게이트 통과) |
| 4 | illustration_banner | 15 | 두 벌 | 없음 | 배너 기본값 변경 금지 → 래퍼 레벨만 |
| 5 | gallery | 9 | 두 벌 | 없음 | 후보(모자이크·사진 틀) |
| 6 | spec_table | 8 | 두 벌 | 없음 | 후보 |
| 7 | target_persona | 5 | 두 벌 | 없음 | 후보 |
| 8 | comparison_table/chart | 3 | 두 벌 | 정렬 없음 | 측정 근거 정책 → 래퍼 레벨만 |
| - | color_variation | 2 | 두 벌 | **색상 선택** | 스타일만(래퍼 레벨) |
| - | checklist·review_highlight·step_card | 5 | 두 벌 | 없음 | 낮은 빈도 — 래퍼 레벨 |
466차 `docs/v5-macro-466.md`의 주입 지점(면 전략·히어로 선호·변형 선호·타이포 토큰)을 그대로 쓴다.

## 4. 목표 (코드 전에 확정 — 낮추지 않는다)
원칙: 기준선(466차 끝)의 2배 이상 개선. 다이나믹 강도: 5 = impact·pop, 4 = softlife·narrative·catalog, 3 = editorial·techsheet·luxe. 페이지당 평균(말뭉치 21):
| 지표 | 강도 5 | 강도 4 | 강도 3 | 기준선 |
|---|---|---|---|---|
| a ①겹침 ≥ | 12 | 10 | 8 | 3.3~9.5 |
| b ②기울임 ≥ (기울임 + 큰 비직선 장식 SVG 합은 보고) | 8 | 5 | 3 | 0~6.8 |
| c ④초점 스케일 중앙값 ≥ | 3.0 | 2.6 | 2.2 | 1.6~1.9 |
| d ⑥직선 이음새 비율 ≤ | 0.45 | 0.55 | 0.65 | 0.79~0.82 |
| e ⑤같은 카드 서명 비율 ≤ | 0.40 | 0.45 | 0.50 | 0.61~0.79 |
| f ⑦서로 다른 사진 틀 ≥ | 8 | 7 | 6 | 3.0~3.9 |
추가(보고용): ⑧비대칭 구도, V5 export 크기 ≤ UP1 +35%, 장식 레이어 섹션당 ≤ 4·페이지당 스티커/테이프 상한, 가격·규정 문구·구매 버튼 안전 여백 침범 0.
