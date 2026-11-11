# 523차 보고서 — 토스 미니앱 출시용 마감

## 확인하지 못한 항목
- 토스 앱 실기기에서 내비게이션 뒤로가기·안전 영역·키보드 가림·햅틱 진동
- 실제 상품 사진·PDF·HEIC 업로드와 실서버 OCR/판정 응답
- `@apps-in-toss/web-framework` 햅틱 API 문서 확인 전이라 진동 미연동(보고서에만 기록)

## 3장 흠 12개 전·후

| # | 흠 | 전 | 후 |
|---|-----|----|----|
| 1 | 제목 줄바꿈 | `523-baseline/start-390.png` | `523-screens/final/start-390-fold.png` |
| 2 | 준비완료 알약 잘림 | `523-baseline/picked-390.png` | `523-screens/final/picked-390-fold.png` |
| 3 | 회색 CTA 막대 | baseline start | final start (준비 전 숨김) |
| 4 | 샘플 눈에 안 띔 | baseline start | final start (예시 CTA 행) |
| 5 | 필터 두 줄 | baseline result | final result (한 줄 칩+가로 스크롤) |
| 6 | 오른쪽 목록 문구 | baseline | final (`listBelow`) |
| 7 | 점검일 줄중간 끊김 | baseline | final (meta nowrap 조각) |
| 8 | 제목+칩 좁음 | baseline | final (stack pill) |
| 9 | 다른 라벨 없음 | baseline | final (`toss-reset`) |
| 10 | 가상 브랜드 띠 | baseline | final (`toss-sample-banner`) |
| 11 | ✓ 글자 아이콘 | baseline busy | final busy (SVG) |
| 12 | 하단 빈 바탕 | baseline | final (패딩·접기) |

## 부품 표 (5-B)

| 부품 | 크기·모양 |
|------|-----------|
| 주 버튼 | 56px 높이, `#111214`, 모서리 16px |
| 보조 버튼 | 48px, 흰 바탕·테두리 |
| 칩(필터) | 40px, 999px, 선택 시 검정/흰 |
| 카드 | 모서리 20px, 그림자 1단계 |
| 행(설정·예시) | 56~64px, 모서리 16px |
| 입력 | 16px 글자, 모서리 14px |

## 문구 표 (5-F, 요약)

| 웹 | 토스 (`copy.ts`) |
|----|------------------|
| (히어로 기본) | 라벨을 올리면, / 바로 읽어서 점검해요 |
| 샘플 링크 | 결과가 어떻게 나오는지 먼저 볼까요 |
| 가상 브랜드… | 예시 결과예요 · 가상 브랜드로 만든 화면이에요 |
| 읽은 글자를 확인해 주세요 | 이렇게 읽었어요 |
| 발견 없음 verdict | 고칠 것을 찾지 못했어요 |
| (없음) | 다른 라벨 점검하기 |

## 추가한 선택 속성 (기본값 = 웹 불변)

| 속성 | 기본 | 토스 |
|------|------|------|
| `CheckStart517.touch` | false | true |
| `CheckStart517.deferMobileCta` | false | true |
| `CheckStart517.initialTab` | undefined | demo text 시 |
| `CheckStart517.accept` | 계산값 | `TOSS_ACCEPT` |
| `ResultView517.embedded` | false | true |
| `ResultView517.cleanHeadline/Note` | undefined | TOSS_COPY |
| `ResultView517.unreadable*Label` | undefined | TOSS_COPY |
| `LabelSourcePanel517.listBelow` | false | true |
| `LabelSourcePanel517.collapsible` | false | true |
| `CheckBusyOverlay517.useIcons` | false | true |
| `OcrReview517.title/desc/useIcons` | undefined/false | TOSS_COPY / true |

## 라운드 요약
- r0: golden + demo — `0ef17d0`
- r1: 12흠·4장 설계 — `5b92aff` · `523-critique.md` 라운드 1
- r2: 5장 품질·폴드 필터 — `aca5168`
- r3: 6장 견고함·가드 — `83cfaea`
- r4: 잔여 0·final·보고서 — 본 커밋

자기 점검: `review/523-critique.md`

## 번들 크기 (gzip)
- r1 demo: JS 93.05KB / CSS 7.24KB
- r4 production (`ait:build`): JS 94.28KB / CSS 7.99KB (목표 JS≤120 · CSS≤12 이내)

## 출시 빌드 demo 꺼짐 확인
1. `toss-app`에서 `npm run ait:build` 완료(eval scan ok, pagzly.ait 생성)
2. `dist/assets/*.js`에서 `DEMO_PASTE_TEXT`·`demo-label`·`DEMO_NAMES`·`makeDemoLabelFile` 검색 → 일치 없음
3. `demo/enabled.ts`는 `import.meta.env.DEV || VITE_DEMO===1`만 true (`ait:build`에 VITE_DEMO 없음)

## 사용자가 폰에서 확인할 일
1. 토스에서 미니앱 열고 시작 화면이 스크롤 없이 보이는지
2. 사진 한 장 고른 뒤 `점검하기`가 아래에서 올라오는지
3. 점검 중 뒤로가기 후 늦게 온 결과가 안 덮는지
4. 글자 확인 화면에서 키보드가 하단 버튼을 가리는지
5. 결과 필터를 가로로 밀고 sticky가 유지되는지
6. `다른 라벨 점검하기`로 입력이 초기화되는지
7. 설정 시트를 바깥 터치·시스템 뒤로가기로 닫히는지
8. HEIC를 올리면 안내만 보이고 앱이 죽지 않는지
