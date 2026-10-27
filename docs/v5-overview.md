# 디자인 V5 개요 (465차)

**한 줄**: 변형 몇 개로는 "같은 공장 페이지"가 풀리지 않아, 페이지마다 **디자인 성격(아키타입) 한 벌**을 정하고, 섹션을 **박자·강도 곡선**으로 점검하며, 부품 24종을 늘렸다. 눈으로 확인하지 않았다 — 전부 플래그 뒤에 있고 문자열 안전망만 통과했다.

## 플래그와 롤백
| 변수 | 값 | 효과 |
|---|---|---|
| `NEXT_PUBLIC_DESIGN_V5` | `on` | V5 켜짐(**기본 꺼짐**). V5는 UP1(463·464차 기능)을 포함한다. v4(`NEXT_PUBLIC_DESIGN_V4=off`)가 꺼져 있으면 항상 꺼짐 |
| `NEXT_PUBLIC_V5_ARCHETYPE` | `editorial` `catalog` `softlife` `impact` `techsheet` `narrative` `luxe` `pop` | 아키타입 강제(비교·일부 롤백용). 비우면 자동 |
- **롤백 = `NEXT_PUBLIC_DESIGN_V5`를 지우고(또는 `off`) 재배포**. 꺼짐 출력은 464차 끝과 문자열이 같다(말뭉치 export 21개 + 섹션 단독 export·라이브 SSR, UP1 꺼짐/켜짐 두 가지로 확인, 4a·4b·4c 통과).
- 한 성격이 마음에 안 들면 `NEXT_PUBLIC_V5_ARCHETYPE`를 다른 값으로 고정해 임시로 피할 수 있다.
- `lib/v5-labels.ts`의 `V5_LABELS_ENABLED=false`로 두면 새 변형의 영문 표지(`CHAPTER` 등)가 모두 빈 문자열이 되고 순번·기호만 남는다.
- 편집 모드에서는 V5가 적용되지 않는다(`applyDisplayRules`가 편집 중이면 v4 계획 앞에서 끝남 — 464차 확인, 회귀가 잠금).

## 구조 (코드 위치)
| 축 | 파일 | 하는 일 |
|---|---|---|
| 아키타입 | `lib/page-archetype-v5.ts` | 8종 토큰(반경·알약·테두리·그림자·종이색·여백 3단·제목 정렬·아이브로·사진 프레임·구분선·번호 양식·마커·장식·배지·선호 변형), 선택(`pickArchetype`: 카테고리 적합표 + mood 보너스 + 시드, 상위 3개 중 결정적), 후처리(`applyArchetypeHtml`), 일반 섹션 래퍼 CSS(`archetypeCssV5`) |
| 스토리보드 | `lib/storyboard-v5.ts` | 박자(hook·empathy·proof·desire·objection·action) 분류, 강도 1~5, 곡선 규칙 점검·보정(`data-pz-ax` 표식), 변형 강도표 |
| 부품 | `lib/v5-parts.ts` | 새 변형 24개 + 번호 양식 4·마커 5·사진 프레임 6·배지 4 |
| 장식 | `lib/page-archetype-v5.ts`(`decorHtml`), `lib/dividers.ts` | 보조 장식 6종(`dots-grid`·`arc`·`squiggle`·`plus-field`·`bracket`·`ring`), 구분선 6종(`wave2`·`stripe`·`stitch`·`thin2`·`dotwave`·`tape`) |
| 연결 | `lib/display-sections.ts`, `lib/impact-templates.ts`, `lib/layout-variants.ts`, 두 렌더러 | 표시 단계가 토큰을 고르고 임팩트에 `ax`를 찍음 → `impactHtml` 끝에서 후처리 → 일반 섹션은 래퍼 표식 + 같은 CSS 함수 |
| 갤러리 | `scripts/v5-gallery-465.ts` | 말뭉치 × 8종 정적 HTML(집 PC에서 열어 비교; 로컬 placeholder 사진만) |

라이브와 export는 **같은 함수**(`impactHtml`/`v4Html`/`archetypeCssV5`)를 읽는다. 일반 섹션 내부 마크업(두 벌)은 건드리지 않았다 — 그 부분은 래퍼 여백·위쪽 선만 아키타입을 따른다(`docs/v5-architecture-465.md`).

## 아키타입 8종
| id | 성격 | 반경 | 테두리 | 그림자 | 종이색 | 여백(조밀/보통/여유) | 제목 | 장식 | 어울리는 카테고리(앞이 우선) |
|---|---|---|---|---|---|---|---|---|---|
| `editorial` | 에디토리얼 매거진 | 0(알약 2) | 1px 실선 진하게 | 없음 | `#FAF7F1` | 40/64/88 | 왼쪽·번호 | 위쪽 가는 선 | 패션, 뷰티, 리빙 |
| `catalog` | 카탈로그 그리드 | ×0.6(알약 6) | 2px 실선 | 없음 | `#F3F2EE` | 28/40/56 | 왼쪽·번호 | 모서리 브래킷 | 전자, 식품, 리빙, 반려 |
| `softlife` | 소프트 라이프스타일 | ×1.6(알약 유지) | 1px 부드럽게 | 따뜻한 번짐 | `#FFFBF6` | 40/56/72 | 가운데·알약 | 번지는 빛 | 뷰티, 식품, 리빙, 반려 |
| `impact` | 하이콘트라스트 임팩트 | ×0.5(알약 6) | 3px 실선 | 하드 4px | `#FFFFFF` | 32/48/64 | 왼쪽·번호 | 왼쪽 굵은 띠 | 전자, 패션 |
| `techsheet` | 클리닉/테크 스펙시트 | 0(알약 0) | 1px 점선 진하게 | 없음 | `#EEF3F8` | 28/40/52 | 왼쪽·라벨 | 모서리 눈금 | 전자, 뷰티(clinic mood) |
| `narrative` | 스토리 스크롤 | ×1 | 1px 실선 | 부드러움 | `#FDFBF8` | 48/72/96 | 왼쪽·번호 | 세로 척추 | 뷰티·식품·리빙·반려 |
| `luxe` | 프리미엄 미니멀 | ×0.1(알약 2) | 1px 옅게 | 없음 | `#FBFAF6` | 56/80/104 | 가운데·라벨 | 가운데 짧은 선 | 뷰티, 패션, 전자 |
| `pop` | 플레이풀 팝 | ×1.8(알약 유지) | 2px 굵게 | 하드 3px | `#FFFDF4` | 32/44/60 | 가운데·알약 | 기울어진 스티커 | 반려, 식품 |
선택은 카테고리 적합표 상위 3개 안에서 시드로 정한다(같은 상품 = 항상 같은 성격). 규정이 걸린 구매 카드·주의·고지 섹션에는 표식도 후처리도 붙이지 않는다(회귀가 이 섹션들의 글 노드가 V5 켜짐/꺼짐에서 같음을 확인).

## 새 변형 24개 (V5 켜짐에서만)
| 계열.변형 | 입력 요건 | 선호하는 아키타입 | 말뭉치×8종에서 선택됨 |
|---|---|---|---|
| `benefits.stackbig` | 항목 2~5, 제목 ≤40, 설명 ≤90 | editorial·impact·narrative | 6종 |
| `benefits.rows2` | 항목 4~6, 제목 ≤24, 설명 ≤60 | catalog·softlife·techsheet·pop | 선택 안 됨(요건 까다로움, 단위 렌더로 확인) |
| `benefits.iconlist` | 항목 3~6, 제목 ≤40, 설명 ≤90 | editorial·softlife·techsheet·narrative·luxe | 선택 안 됨(단위 렌더) |
| `concern.memo` | 항목 3~6, 제목 ≤40 | editorial·catalog·techsheet·luxe | 4종 |
| `concern.deck` | 항목 3~5, 제목 ≤36 | softlife·impact·narrative·pop | 4종 |
| `story.chapter` | 인용문 ≥8자 또는 본문 ≥40자 | editorial·catalog·impact·techsheet·narrative | 선택 안 됨(앞 1/3 자리에서 더 큰 변형이 먼저 뽑힘) |
| `story.letter` | 본문 ≥60자 | editorial·softlife·narrative·luxe | 선택 안 됨(같은 이유) |
| `spec.panel` | 행 2~8, 라벨 ≤20, 값 ≤60 | editorial·catalog·techsheet | 6종 |
| `spec.tags` | 행 2~8, 라벨 ≤12, 값 ≤16 | catalog·softlife·narrative·luxe | 2종 |
| `spec.big3` | 행 2~3, 값 ≤10 | impact·techsheet·pop | 선택 안 됨(값이 짧은 입력이 말뭉치에 없음) |
| `phototext.stack` | 사진 1장 항목 1개 | editorial·catalog·impact·narrative | 8종 |
| `phototext.polaroid` | 사진 1장 항목 1개 | softlife·pop | 7종 |
| `phototext.dframe` | 사진 1장 항목 1개 | editorial·techsheet·luxe | 8종 |
| `faq.numlist` | 질문 2~8, 질문 ≤70, 답 ≤200 | editorial·techsheet·narrative·luxe | 8종 |
| `faq.twocol` | 2~6, 질문 ≤50, 답 ≤120 | catalog·techsheet·pop | 6종 |
| `faq.qband` | 2~8 | editorial·softlife·impact·luxe | 5종 |
| `faq.chat` | 2~6, 질문 ≤60, 답 ≤160 | softlife·narrative·pop | 8종 |
| `faq.tabs` | 2~8 | catalog·impact | 2종 |
| `proof.lead` | 신뢰 근거 박스 카드 2~4 | editorial·softlife·narrative·luxe | 8종 |
| `proof.wall` | 카드 3~4 | editorial·catalog·impact·techsheet·pop | 5종 |
| `proof.badges` | 카드 2~4, 제목 ≤14 | catalog·impact·techsheet·pop | 5종 |
| `proof.seal` | 카드 2~4, 제목 ≤20 | softlife·narrative·luxe | 3종 |
| `touch.ticket` | 접점(가격 입력 있을 때) | catalog·softlife·impact·pop | 8종 |
| `touch.ledger` | 접점 | editorial·techsheet·narrative·luxe | 8종 |
- 모든 문구는 입력 원문. 추가되는 글자는 순번과 `lib/v5-labels.ts`의 닫힌 영문 표지뿐(`STEP POINT NO. Q A CHAPTER SPEC NOTE CHECK STORY DETAIL`).
- FAQ(`faq.*`)는 **이미 정적으로 펼친 FAQ 카드(`faqcards` 임팩트)** 를 다시 그린다 — 접힘 인터랙션이 있는 일반 FAQ 아코디언(`FaqAccordion`)은 건드리지 않았다. 신뢰 근거(`proof.*`)는 `seller_trust_evidence` 강조 박스에서만 만든다.
- 제외(다음 차수 후보): 후기(`review_highlight` — 집계·고지), 비교(`comparison_chart` — 측정 근거 정책), 히어로 확장(첫 화면 규칙 때문에 눈 검수 없이 위험).

## 스토리보드 규칙과 결과 (말뭉치 21 × 2종 샘플, 섹션 순서는 바꾸지 않음)
- 강도 곡선: 높음(≥4)/낮음(≤2) 3연속 금지, 처음 1/3(히어로 제외)에 높음 2개 이상, 구매 카드 앞 3개 안에 높음 1개.
- 보정 수단: 표식 가능한 일반 섹션의 강도(=여백 단계), 앞 1/3 자리 변형 선택에서 큰 변형 우선, 앞 섹션이 낮으면 강도 3 이상 변형 우선, 구매 카드 앞 "마무리 띠".
- 결과(위반 합계, 말뭉치 21페이지, editorial 기준 — V5 꺼짐(UP1)→V5): 높음 3연속 3→4(+1, 회귀 허용치 +2 안), **낮음 3연속 86→34**, 처음 1/3 높음 부족 3→3(변화 없음), **마무리 직전 높음 없음 21→10**. **0이 되지는 않았다**: 임팩트·v4 블록끼리의 낮은 연속과 페이지 끝의 정보 꼬리(스펙·FAQ·주의·고지)는 순서를 바꾸지 않는 한 표식으로 못 고친다.

## 알려진 한계
- 눈 검수 없음. 아키타입 8종이 "눈에 띄게 다르다"는 것은 문자열 대리 지표(영향받는 블록 스타일 서명 집합 거리 최소 0.97 — 포화된 약한 지표; 속성별 평면 토큰 집합 거리는 0.16~0.30)로만 확인했다.
- 일반 섹션 내부(카드 반경·제목 정렬)는 아키타입을 따르지 않는다(두 벌 마크업).
- 지표 일부는 UP1보다 나빠졌다(보고서): 가운데 정렬 섹션 비율 0.33→0.42(가운데 정렬 아키타입 3종), 평탄 구간 37→53.
- 눈 검수 순서와 항목: `docs/pc-todo.md` "V5 눈 검수".
