# TASK_468 — V5 "진짜 다이나믹": 읽히는 제목 스케일 · 구도 깨기 · 배너 아키타입화 · 빈 사진 틀 해소 · 일반 섹션 확대 (코딩 전용, 유료 API 0회)

(원문 지시서의 요약본. 규칙·목표는 원문과 같다.)

시작 문장: "468차 시작: V5 진짜 다이나믹 — 읽히는 스케일·구도·배너·빈 틀·일반 섹션(코딩 전용, 오래 진행)".

## A. 467차를 실제 화면으로 본 평가
1. 진한 사진 배너가 8종 모두에 있다(466차 "진한 면 ≤12%"는 사진 배너를 제외하고 쟀다). `BANNER_STYLE` 3값(full-scrim/card-only/split)이 이미 있다.
2. 읽히는 글자는 작다(제목 20~28px, 본문 13~14px). 467차 초점 스케일은 장식 글자 때문이었다.
3. 구도가 여전히 "가운데 컬럼에 박스 쌓기"다(후처리 레이어의 한계).
4. 빈 사진 틀이 크게 남는다(gallery에 약 250×300px 빈 사각형 + 작은 사진 1장). 폴백 틀이 거의 무색.
5. 상품 정보·FAQ·배송·구매 카드 아래 규정은 8종 동일(일반 섹션).
6. 467차 지표: 사진 틀 종류 0/8, 일반 섹션 3/8, 비대칭 계획기 없음.
방침: 읽히는 글자를 키우고, 구도를 깨고, 배너를 아키타입에 묶고, 빈 틀을 없애고, 일반 섹션을 더 바꾼다. 장식 농도는 줄이거나 유지.

## B. 규칙 (467차와 동일 + 추가)
- 금지 실행: 캡처·PNG 대조·퍼징·pc-verify·launch-smoke·next build/dev·run-all 전체·Playwright·모든 네트워크·사진 다운로드/업로드. 허용: tsc, 새로/고친 정적 회귀 단독, 문자열 렌더, 자식 프로세스 환경변수 주입, 갤러리 도구(산출물 커밋 금지).
- 유료 API 0, 키·.env* 금지, 새 문구·수치 금지(입력 원문 재배치·확대·반복, 순번·기호·SVG, v5-labels만). 고지·결제·cta_price·data-pz-buy·스티키 바·편집 UI·인터랙션·규정 위치·내용 불변. 폰트 추가 금지. numeric-claim-gate 통과.
- 모든 변경은 NEXT_PUBLIC_DESIGN_V5=on 뒤, V4 꺼짐이면 꺼짐, 편집 모드 미적용. BANNER_STYLE 기본값·V5 꺼짐 배너 출력 불변(V5 켜짐에서만 아키타입별 값).
- 출력 잠금: V5 꺼짐(UP1 꺼짐/켜짐) = 467차 끝 출력, V4 꺼짐 = 438차 기준(4a·4b·4c). 매 Phase 재확인.
- 렌더 제약: 라이브·export 한 벌, 인라인 스타일, 금지 CSS(:has, container query, text-wrap, mix-blend-mode, clip-path, mask, text-stroke, filter, textPath, foreignObject, <filter>, 외부 요청, CSS 애니메이션, position:fixed), 750 초과 고정 폭 금지, 320~390 줄바꿈 안전. 큰 글자: 레포가 clamp/min/vw를 쓰면 따르고 아니면 글자 수 단계 함수. 본문 ≥14px, 라벨 ≥12px, 대비 4.5:1(28px+ 굵은 글자 3:1), 터치 44px. export 크기 V5 켜짐이 UP1 대비 +35% 이내(상한 유지).
- 파일은 먼저 Read한 뒤에만 Write/Edit, heredoc 금지, git add 파일명 지정, main 금지, run-all SUITES는 하나씩 덧붙임, 막힘은 "막힘: 파일·줄·이유·대안".

## C. 단계
- Phase 0 지표 재정의·목표 선기재(`docs/dynamics-audit-468.md`): 보이는 진한 면(사진 배너 포함), 읽히는 초점 비율, 구도 비대칭(단일/풀블리드/비대칭/겹침), 빈 틀, 사진당 고유 틀 종류, clamp 조사, photo-fallback 읽기.
  목표(먼저 기재, 낮추지 않음): lightOnly·tintAlt 6종 진한 면 평균 ≤15%·최악 ≤25% / blockAlt(impact) 평균 25~45% / colorCollide(pop) 30~55%; 읽히는 초점 비율 중앙값 강도5 ≥2.6 / 강도4 ≥2.2 / 강도3 ≥1.9; 단일 컬럼 ≤0.55, 풀블리드+비대칭 ≥0.30, 겹침 ≥0.25; 폴백 틀 최대 높이 ≤320px, 사진 수<틀 수 섹션에서 폴백이 사진 틀보다 큰 경우 0건; 사진당 고유 틀 종류 비율 ≥0.7.
- Phase 1 배너를 아키타입에 묶기(V5 한정): editorial·luxe·techsheet·catalog=split|card-only, softlife·narrative=card-only, impact·pop=full-scrim. 팔레트 전수 대비 4.5:1. 연속 배너 같은 값 금지. 전/후 표.
- Phase 2 읽히는 제목 스케일: 아키타입별 디스플레이 스케일 토큰(impact·pop 38~48 굵게, editorial 34~44 가는 굵기, luxe 28~34 넓은 자간, catalog·techsheet 30~38, softlife·narrative 32~40), 길이별 단계 선택(결정적), 큰 숫자·인용 확대, 장식은 글자 뒤. 폭 320/390/750 넘침 정적 검사.
- Phase 3 구도 깨기(변형 안에서): bleedPhoto, splitAsym, staggerGrid, heroNumber, pullOut, layerDeck. phototext·benefits·story·concern 1순위 변형부터. variantFits 미충족 시 기존 폴백.
- Phase 4 빈 사진 틀 해소: photo-fallback 대비·상한(V5 한정), 사진 수<틀 수 시 타일 수 축소, 0장이면 텍스트 구성 대체, onerror 경로 확인. 폴백 ≤320px.
- Phase 5 일반 섹션 추가 변환: spec_table(상품 정보), FAQ(접힘 DOM 유지·스타일만), 배송·교환·주의(래퍼만), target_persona·checklist·step_card·review_highlight·highlight_box 판정. cta_price 불변. 상위 8종 이상 V5 단일 소스/래퍼 다이나믹.
- Phase 6 구도 계획기(페이지 수준): 연속 3개 섹션이 모두 단일 컬럼이 되지 않게. 기존 규칙 우선.
- Phase 7 안전망·지표·갤러리(`--photos=none|partial|all`)·pc-todo 갱신.
- Phase 8 문서·`review/468cha-report.md`.

## D. 완료 기준(○/△/×)
1 출력 잠금 diff 0 / 2 배너 아키타입 묶음·진한 면 목표 / 3 읽히는 초점 비율 / 4 구도 지표 / 5 빈 틀 규칙 / 6 일반 섹션 8종+ / 7 안전 항목 / 8 사진당 고유 틀 ≥0.7. △·×는 수치·이유·다음 차수 제안.

## E. 하지 않는 것
금지 실행, 유료 호출, 새 문구·수치, main push, 마이그레이션, 결제·cta_price·편집 UI·인터랙션 변경, 비밀값, 사진 다운로드/업로드, 폰트 추가, 새 히어로, V5 꺼짐 배너/BANNER_STYLE 기본값 변경, V5/UP1 기본값 켜기, V5 꺼짐 출력 변경, 기준 낮추기, 규정·가격·구매 버튼 가림, 읽기 전 파일 쓰기.
