# TASK_465 — 상세페이지 디자인 V5: "페이지 아키타입" 시스템 + 스토리보드 구성기 + 부품 라이브러리 대확장 (코딩 전용, 유료 API 0회) — 지시서 요약본

시작 문장: "465차 시작: 상세페이지 디자인 V5 — 아키타입·구성기·부품 확장(코딩 전용, 오래 진행)". 시작 전 `git pull --no-rebase origin cloud-work`(464차 보고서 커밋 이후). `docs/phone-session-rules.md` 준수. 오래 걸려도 됨. **단계(Phase)마다** 커밋·cloud-work push·`review/465-progress.md`(완료/진행 중/남은 것) 갱신 push. 한도/시간 부족 시 `review/465cha-report.md`를 먼저 쓰고 push. main 금지.

## A. 배경 (요지)
463~464차 변형만으로는 "같은 공장 페이지"로 보임: 변형은 섹션 하나의 모양만 바꾸고 페이지 전체의 성격(모서리·선·그림자·바탕 전략·제목 양식·여백·사진 프레임·장식·번호 양식·구분선)은 모든 상품이 같음. V5 세 축: ① 페이지 아키타입(8종, 상품마다 결정적으로 선택, 토큰 한 벌이 전체 성격을 결정) ② 스토리보드 구성기(박자 hook→empathy→proof→desire→objection→action, 강약 곡선, 기존 `planV4` 위에 얹음) ③ 부품 라이브러리 대확장(새 변형 20개 이상 + 장식 부품). 눈으로 확인하지 않음 → 전부 새 플래그 뒤, 꺼짐 출력 잠금, 문자열 렌더 정적 안전망(8종 × 말뭉치 21).

## B. 규칙
- 금지: 캡처·PNG·퍼징·pc-verify·launch-smoke·next build/dev·run-all 전체·Playwright(브라우저 쓰는 기존 회귀 포함)·네트워크·사진 다운로드/업로드. 임시 파일 scratchpad(커밋 안 함). 허용: tsc, 새/고친 정적 회귀 단독, 브라우저 없는 문자열 렌더(export·라이브 SSR), 자식 프로세스 환경변수 주입. 브라우저 쓰는 새 도구는 `assertHeavyEntry`, 문자열 전용 도구는 `heavy-guard-461` 예외 목록에 사유.
- 유료 API 0, 키·`.env*` 금지. **새 문구·수치 금지**: 입력 필드 원문 재배치·재표현만. 허용 추가물 = 순번·기호·장식·`lib/v5-labels.ts` 닫힌 구조 라벨 목록(`STEP`·`POINT`·`NO.`·`Q`·`A`·`CHAPTER`·`SPEC`·`NOTE` 같은 짧은 영문 표지, 한글 문장·주장 금지; 보고서에 전체 표; `V5_LABELS_ENABLED` 스위치). 고지·결제·`cta_price`·`data-pz-buy`·스티키 바·편집 UI·인터랙션(접힘·색상 옵션) 불변(FAQ 등은 스타일만, DOM 역할 유지). 숫자 주장 큰 문장은 `checkText` 통과 필수. 화장품·식품·건강 규정 문구 위치·크기·내용 불변. 폰트 추가 금지(`font-pairs` 조합만).
- 플래그 `NEXT_PUBLIC_DESIGN_V5`(on일 때만, 기본 꺼짐, V4 꺼짐이면 항상 꺼짐; V5 켜짐은 UP1 포함). 출력 잠금 3종 diff 0: ① V5 꺼짐+UP1 꺼짐 = 464차 끝 ② V5 꺼짐+UP1 켜짐 = 464차 끝 ③ V4 꺼짐 = 438차(4a·4b·4c). 기준은 시작 시 현재 HEAD에서 scratchpad로 뽑아 Phase마다 비교. 새 코드는 전부 `DESIGN_V5_ENABLED` 뒤, 꺼짐에서 미호출을 정적 회귀로 잠금. 편집 모드에는 V5 미적용(회귀로 잠금).
- 렌더 제약: 라이브·export 같은 함수 한 벌(`v4Html` 계열); 인라인 스타일+flex·position·transform·radius·SVG·gradient만; 금지 기법(`:has()`·container query·`text-wrap`·`mix-blend-mode`·`clip-path`·`mask`·`-webkit-text-stroke`·filter 남용) 금지; 외부 이미지/폰트 요청 추가 금지; 750 초과 고정 폭 금지; 본문 ≥14px·라벨 ≥12px; 대비 4.5:1(28px 이상 굵은 글자만 3:1); 터치 44px; 사진 프레임은 `photo-fallback` 사용; export 크기 UP1 대비 +25% 이내. `git add` 파일명, `run-all.ts` SUITES 하나씩 덧붙임, Write/Edit(heredoc 금지).
- 막히면 추측으로 큰 구조 변경 금지: 항목 건너뛰고 progress에 "막힘: 파일·줄·이유·대안".

## C. Phase
- **0 지도** `docs/v5-architecture-465.md`: 토큰 정의/사용 위치, 라이브·export 공유 함수/분리 지점, 섹션 종류 전수 지도(경로·바탕/제목/여백 결정 위치·라이브/export 공유 여부·아키타입 주입 지점/불가 시 대안). 기준 말뭉치·출력 잠금 비교 스크립트(임시).
- **1 아키타입 토큰** `lib/page-archetype-v5.ts` + `lib/v5-labels.ts`: 토큰 차원(radius·선·그림자·바탕 전략·제목 양식·여백 척도·사진 프레임·장식 세트·번호 양식·글꼴 조합·밀도·대비 강도), 8종(editorial·catalog·softlife·impact·techsheet·narrative·luxe·pop) 서로 눈에 띄게 다름(쌍 거리 회귀), 카테고리 적합표+mood+시드로 결정적 선택(`NEXT_PUBLIC_V5_ARCHETYPE`로 강제), 규정 충돌 조합 제외, 대비·글자 크기·색상군 ≤3 만족, `getArchetypeTokens(ctx)` 단일 소스.
- **2 스토리보드** `lib/storyboard-v5.ts`: 박자 분류, 강도 1~5 곡선 규칙(높음/낮음 3연속 금지, 처음 1/3에 높음 2회↑, 마무리 직전 높음 1회), `planV4` 결과 위에서 변형·바탕·밀도·구분선·모티프·강조 띠 선택; 기존 규칙이 이김; 일반 섹션 래퍼 여백 가능 여부 판단(464차 교훈: 효과 없으면 되돌림); 지표 확장(강도·박자 위반, 아키타입 쌍 거리, 느낌 대리 지표) — 목표를 먼저 문서에.
- **3 부품 확장** 새 변형 20개↑ (FAQ 3↑·후기/신뢰/인증 3↑·비교 2↑·benefits 2↑·concern 2↑·story 2↑·spec 2↑·phototext 2↑·closing/touch 2↑ + 구분선 6·모티프 6·사진 프레임 6·배지 4), `variantFits` 요건+폴백, 아키타입 토큰을 읽음, 극단 입력 안전. 히어로 2종은 여유 있을 때만.
- **4 조립**: 토큰을 새/기존 v4 부품에 연결(V5 켜짐일 때만), 일반 섹션은 래퍼 레벨만, 라이브↔export 패리티.
- **5 정적 안전망** `scripts/regression/v5-465*.ts`: 말뭉치 21 × 8종에서 잠금 3종·꺼짐 미호출·편집 미적용·대비·글자 크기·금지 CSS·고정 폭·nowrap·외부 URL·결정성·쌍 거리·새 문구 없음·극단 입력·사진 0장/일부 실패 폴백·색상군·크기 +25%·강도/박자 위반 0·규정 문구 노드 동일. 위반은 토큰/변형을 고쳐 통과, 못 고치면 조합 제외+사유.
- **6 갤러리·문서**: `scripts/v5-gallery-465.ts`(문자열 렌더 → `review/465-gallery/` git 무시, 커밋 금지, 외부 URL 없음 검사, 이번엔 1~2개만 생성해 예외 없음 확인), `docs/v5-overview.md`·`docs/v5-architecture-465.md`·`docs/pc-todo.md` V5 눈 검수·`docs/v4-overview.md` 링크, `v5-labels` 전체 표.
- **7 마무리**: tsc 0, 새/고친 회귀 통과, 잠금 3종 재확인, heavy-guard 예외 갱신. `review/465cha-report.md` 맨 위: push 여부, Phase별 완료/미완료, 잠금 결과, 아키타입 8종 표, 부품 표, 지표 전/후(목표 먼저), 안전망 결과, `v5-labels` 목록, 실행하지 않은 것, 집 PC 명령(이전 완료 전엔 pull→npm ci→tsc→run-all까지), 못 한 것.

## D. 완료 기준 (○/△/×): 잠금 3종 diff 0 · 아키타입 8종 서로 다른 출력 · 새 변형 20↑ · 안전망 전 항목 통과 · 편집 미적용·같은 함수 사용 · 새 문구 0 · 문서/갤러리/pc-todo.

## E. 하지 않는 것
금지 실행 전부, 유료 호출, 새 문구·수치, main push, 마이그레이션, 결제·`cta_price`·편집 UI·인터랙션 변경, 비밀값·`.env*`, 사진 다운로드·업로드, 폰트 추가, 배너 기본값 변경, V5/UP1 기본값 켜기, V5 꺼짐 출력 변경, 지표 기준 낮춰 통과.
