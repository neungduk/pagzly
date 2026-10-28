# 471차 보고 — 첫 화면 대격변 + 겹침 정리 + 남은 일반 섹션

문자열 지표 기준(브라우저·실사진 확인 없음). 모든 변경은 `NEXT_PUBLIC_DESIGN_V5` 켜짐에서만 — 꺼짐 출력은 470차와 글자 단위 동일(락 `ALL_LOCKS_OK`).

## 목표 대비 실제

| 항목 | 목표 | 실제 | 판정 |
|---|---|---|---|
| A 첫 화면 시그니처(쌍 차이 칸 수) | 최소 ≥ 3 | 최소 3, 평균 5.55 | 달성 |
| B 장식 숫자 | 제목 겹침 ≤ 20%, 잘림·우상단 0 | 위험 0 / 우상단 0, 단위 시험 통과 | 달성 |
| C 평탄 구간 합계 ≤ 37 | 8종 모두 | editorial 41 · catalog 30 · softlife 30 · impact 43 · techsheet 25 · narrative 38 · luxe 39 · pop 34 | **미달 4종**(editorial·impact·narrative·luxe) |
| C 단일 3연속 ≤ 0.5 | 8종 모두 | 0.33~0.43, impact 0.57 | **impact 미달** |
| C 장면 쌍 사이 짧은 구간 | 빠진 쌍 0 | 0 | 달성 |
| C 큰 블록 연속 쌍(H4b) | 감소 | 8~23(아키타입별), 일부 미달 | 부분 |
| D 히어로 사진 하한 | 위반 0 | 0 | 달성 |
| E 일반 섹션 | 가능한 것만 | 전부 불가/보류(`review/471-notes.md`) | 사유 기록 |
| F 안전 | 회귀 통과·export ≤ 140% | 통과(최악 약 139%) | 달성 |

## 미달과 이유
- 평탄 구간은 구분 띠를 끼운 뒤 편집형·고채도·서사형·럭스형에서 오히려 늘었다(띠가 평탄 구간으로 세어짐). 지표 정의는 바꾸지 않았다. 다음 차에 띠의 모양을 강하게 하거나 띠 대신 장면 높이 조정으로.
- impact 단일 3연속 0.57: 남은 연속은 글만 있는 강조 블록(의도적 비변환)과 일반 섹션.
- H4b: 계획 단계 높이(`ctx.height`)와 지표 높이(`estHeight`)가 달라 일부 쌍이 남는다.
- E: 체크리스트/비교는 수치 게이트·비교 정책과 공용 렌더 함수에 묶여 CSS만으로 불가, spec_table 게이지는 단일 출처 수치가 없어 불가.

## 변경 파일
`lib/hero-stack-v5.ts`(신규), `lib/page-archetype-v5.ts`, `lib/hero-spec.ts`, `lib/dynamics-layer-v5.ts`, `lib/layout-variants.ts`(구분 띠·`isInterludeV5`), `lib/v5-parts.ts`, `lib/storyboard-v5.ts`, `lib/special-sections.ts`, `lib/info-v5.ts`, `lib/export-detail-html.ts`·`components/DetailSectionRenderer.tsx`(본문 번호에서 구분 띠 제외), `scripts/hero-metrics-471.ts`, `scripts/hero-report-471.ts`, `scripts/regression/hero-471.ts`(run-all 등록), `scripts/regression-v5-471.ts`, `scripts/regression/dynamics-469.ts`·`dynamics-470.ts`(구분 띠 허용), `review/471-targets.md`, `review/471-notes.md`.

## 켜는 법·되돌리기
`NEXT_PUBLIC_DESIGN_V5=on`(기본 꺼짐 유지). 끄면 즉시 470차 출력. 시험 훅: `setDesignV5ForTests`, `setV5ArchetypeForTests` 등 기존 그대로.

## 갤러리
`review/465-gallery/` 36장(4 픽스처 × 9 모드), 외부 URL 0, 커밋 안 함.

## 다음 후보
평탄 구간 4종 줄이기, impact 글만 강조 블록 처리, 비교/체크리스트 공용 렌더 통합 후 DOM 변형.

## 커밋
C 커밋 `92fc4eb`, E 기록 커밋 `8114721`. 보고서 커밋은 이 줄을 적기 직전 해시 `3725260`(push 확인).
