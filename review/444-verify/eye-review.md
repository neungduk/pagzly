# 444차 눈 검수 결과표 (정적 export 캡처, 클라우드)

## 방법과 한계
- `scripts/eye-capture.ts`(페이지 시트)·`scripts/eye-sections.ts`(섹션 단독)·`scripts/eye-compare.ts`(전/후). 서버·외부 네트워크 없음: Playwright route로 export HTML을 열고 `/qa-fixtures/ph`·`/fonts`는 저장소 파일, Google Fonts CSS는 로컬 Noto Sans KR로 대체.
- **폰트: 실제 Noto Sans KR(`@fontsource/noto-sans-kr`의 woff2, `node scripts/build-detail-fonts.mjs`가 `public/fonts`로 복사)로 렌더**했다. 지시서가 걱정한 시스템 폴백이 아니라서 글자 폭·줄바꿈 판단은 export 기준으로 신뢰할 수 있다. 다만 **라이브(React/Tailwind) 화면은 한 번도 못 봤다.**
- 사진은 글자 없는 플레이스홀더(`/qa-fixtures/ph`)라 사진 비율·여백·겹침은 볼 수 있지만 **실사진의 밝기·색 편차·가림은 못 본다.**
- 끝까지 본 페이지(390px, 화면 844px 단위 시트): 뷰티 `fx-skincare-serum`(6시트)·`fx-makeup-tint`(5시트), 테크 `fx-tier-rich-tech-6p`(6시트)·`fx-tech-keyboard`(3시트), 패션 `fx-fashion-dress-floral`(5시트), 생활 `fx-tier-normal-living-3p`(4시트), 빈약 입력 `fx-tier-sparse-beauty-1p`(2시트 + 구매 띠). 그 밖 11종은 첫 화면 접촉 시트와 섹션 단독 캡처로만 봤다. 750px는 섹션 단독 시트로 FAQ·표·강조 카드·고지를 봤다. 시트 경로: `review/444-verify/eye/<픽스처>/w390/sheet-NN.png`(로컬, 커밋 안 함. 재생성: `npx tsx scripts/eye-capture.ts`).
- 입력 풍부 픽스처 3종(`fx-compare-*`, 비교표·신뢰 근거)은 시트 몇 장만 확인.

## 443차 변경 항목 합격/결함 표
| # | 항목 | 판정 | 근거 시트 | 비고 |
|---|---|---|---|---|
| 1 | FAQ 카드형 | 합격 | `sections/faq-w390.png`·`faq-w750.png` | 흰 카드+hairline+soft, Q/A 원형 마크, 간격 자연스러움. **합성 말뭉치 페이지 전체에서는 FAQ가 임팩트 `faqcards`로 대체돼 안 나옴** → 섹션 단독으로만 확인 |
| 2 | spec_table 라벨 면·줄무늬·hairline | 합격(+값 조정) | `sections/spec_table-w390.png`·`w750.png` | 라벨 면+줄무늬+둥근 껍데기 좋음. 라벨 글자 알파 0.72 → 0.65(4.5:1 최소값, 2번 판단) |
| 3 | comparison_table 숫자 열 | 합격 | `sections/comparison_table-synth-숫자-w390.png`, `…글-…` | 숫자 열 우측 정렬+단위 12px 깔끔, 글·O/X 열 혼합도 자연스러움 |
| 4 | 주의·고지 박스 | 합격 | `sections/caution-w390.png`·`ai_disclosure-w390.png` | 얇은 면 박스, 글 14/500 읽기 좋음. 고지 문구 불변 |
| 5 | 사진 톤 오버레이 | 합격(보수적) | 사진 레이아웃이 있는 시트들(serum 시트4, floral 시트3~4) | 플레이스홀더가 단색 계열이라 "통일감"이 있는지는 판단 불가, 어색한 얼룩·경계는 없음. 실사진 확인 필요 |
| 6 | 히어로 B 고스트 페이드 | 합격 → 확장 | `eye/first-screens-18.png`, `before-after/D5-*.png` | B형 좌우·위 페이드 자연스러움. C·D형은 같은 문제(왼쪽 글자 잘림)라 확장(D5) |
| 7 | 간격(AI 안내 32) | 합격 | serum 시트5, living 시트4, sparse 시트2 | 배송 안내 ↔ AI 안내 ↔ 구매 띠 사이가 구획으로 읽힘, 빈칸 느낌 해소 |
| 8 | 하이라이트·페르소나 제목 17·20 | 합격 | `sections/highlight_box-w390.png`·`highlight_box-synth-신뢰-w390.png`, `target_persona-w390.png` | 일반 카드 17/700·신뢰 근거 20/800 위계 분명. 페르소나 문장 17/700은 짧은 라벨로 읽혀 과하지 않음(1번 판단: 유지) |
| 9 | 구분선·모티프·면 리듬 전체 인상 | 대체로 합격 | serum·makeup·rich-tech·floral·living 전 시트 | 면이 교차하고 강조 블록·사진·표가 번갈아 나와 단조롭지 않음. 아래 "관찰" 참고 |

## 결함 표 (즉시 수정)
| ID | 결함 | 어디서 봤나 | 원인 | 수정 | 전/후 |
|---|---|---|---|---|---|
| D1 | 뷰티 강조 카드에서 가운데 카드 제목이 **강조색 면 위 어두운 글자**(대비 약 3:1 이하) | serum 시트2, makeup 시트2~3 | 정보 면(info) CSS가 강조 카드를 강조색으로 칠하는데, boldBlock 강조 카드는 흰 카드용 어두운 제목(lightEm) | v4+info에서는 lightEm 안 씀(라이브·export 쌍둥이) | `before-after/D1-info강조카드-makeup.png`·`-serum.png` |
| D2 | 일러스트 배너(`제품 특징`, `맑게, 촉촉하게`) 글 스크림 카드가 390px에서 **화면 좌우로 잘림** | serum 시트3, rich-tech 시트3 | 스크림 `inset:-10%`가 좁은 글 상자(342px)에서 ±34px 번져 화면(390) 초과 | `inset:-10% -4%`(토큰 `BANNER_SCRIM_INSET_V4`) | `before-after/D2-배너스크림-richtech.png` |
| D3 | 사진 칸이 **비어 보임**(밝은 플레이스홀더가 면과 비슷) | serum 시트4, rich-tech 시트4 | 플레이스홀더 도형이 면과 비슷한 색 | 도형·그림자·지면 띠를 진하게 재생성 | 첫 화면 시트 전/후(`eye/first-screens-18.png`는 후) |
| D4 | 구매 띠 위로 번지는 **지저분한 그림자 띠** | sparse·living·makeup의 AI 안내 → 구매 띠 경계 | 정적 구매 띠에 스티키용 그림자(`0 -8px 24px`) | v4는 shadow none(스타일 값만) | `before-after/D4-구매띠그림자-sparse.png` |
| D5 | C·D형 히어로 고스트 글자가 **왼쪽에서 글자 중간이 잘림**(D형은 구간 끝에서 아래도 평평하게) | living(D)·keyboard(C) 첫 화면 | 443차 페이드가 B형만 | C·D형까지 확장, 좌우 22%, D형 아래 30% | `before-after/D5-고스트-living.png`·`-keyboard.png`(1x에서는 미묘, 확대 비교로 확인) |
| T1·T2 | (도구) 화면 밖 `loading="lazy"` 사진이 빈 칸으로 찍힘 → decode 전에 찍힘 | 캡처 | 캡처 방식 | eye-lib에서 eager+decode 후 캡처 | — |

새 픽스처가 드러낸 결함(눈이 아니라 DOM 측정): 뷰티 퀵포인트 줄 섹션 위·아래 여백 12px가 3단 스케일 밖 → v4는 섹션 여백 0 + 카드 바깥 여백 12(같은 간격)(4-4 커밋).

## 관찰(수정 안 함)
- 첫 화면 21종 히어로 분포: A(풀사진) 5 · B(아치 사진) 9 · C(어두운 면) 4 · D(밝은 면+사진) 3, E 0. 뷰티·식품이 모두 B라 비슷해 보이지만 면 색이 다르다(초록·보라·주황·분홍·파랑). **같은 파란 면이 3종**(저자극 강아지 샴푸·수분 진정 토너·현미 누룽지 칩) 겹침 — 팔레트 풀의 문제(`assignFaces`가 아니라 히어로 면 색 선택)라 이번엔 두지 않음.
- 퀵포인트 줄 사이에 좁은 흰 띠가 보임(뷰티 info 레이아웃, 면 `soft` 배경이 섹션마다 따로 칠해짐) — 3단 밖 여백 해결 후에도 남은 시각적 틈, 낮은 우선순위.
- 합성 페이지 내용이 카테고리와 안 맞는 문구(전자제품에 "에센스 미스트" 등)는 픽스처 데이터 문제.
- 첫 화면 접촉 시트의 사진 비율·텍스트 가림: 가격 칩·훅 텍스트가 사진에 가려지는 곳 없음.

## 집계
- 합격 9항목(그중 값 조정 1, 확장 1), 결함 5건(D1~D5) + 도구 2건 → **전부 같은 차수에서 수정**, 새 결함 발견 후 미해결 0(관찰 3건은 수정 안 함).
