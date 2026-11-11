# 522차 보고서 — 토스 미니앱 = 웹 517 화면 재사용

## 확인하지 못한 항목
- 토스 폰·샌드박스 실측 없음
- 실제 사진·PDF·HEIC 업로드·서버 점검 결과 화면 없음(샘플 결과로 결과 UI 확인)
- 키보드 상승 시 하단 고정 막대 가림 — CSS `:has(textarea:focus)`로 처리했으나 실기기 미확인
- 토스 내비게이션 뒤로가기 — 브라우저 `history`/`popstate`만 확인(토스 내비 연동 미실측)
- 점검 중 오버레이(`CheckBusyOverlay517`) — 실서버 점검 없이 **못 봄**
- 파일 선택 후 미리보기(`picked-390.png`) — 자동화 파일 선택 제한으로 **못 찍음**

## 막힌 곳
- 없음(공용 컴포넌트는 `touch`/`accept`/`embedded`만 추가)

## 3-E 확인표 (PC Vite `npm run dev`, 폭 360/390)

| # | 항목 | 판정 |
|---|------|------|
| 1 | 시작 화면(파일 없음) 버튼·칩·탭 모양 | **같음** (초기화 후 브라우저 기본 버튼 아님). 드롭 문구 3개는 `touch`로 **의도한 차이** |
| 2 | 파일 고른 뒤 미리보기 | **못 봄** (파일 선택 자동화 제한) |
| 3 | 문구 붙여넣기 탭 | **같음** (범위 칩·글자 수). 글상자 min-height 폰 보정은 **의도** |
| 4 | 점검 중 오버레이 | **못 봄** |
| 5 | 결과(샘플) 요약·필터·카드·고지 | **같음**. 가입/인쇄 숨김·헤더 없음은 **의도** |
| 6 | 결과 → 브라우저 뒤로 → 시작 | **같음** (`popstate`) |
| 7 | 360px 가로 스크롤 0 | **같음** (`scrollWidth===clientWidth` 360·390) |
| 8 | 입력 글자 16px | **같음** (textarea computed `16px`) |

## 스크린샷 (`review/522-screens/`)
| 파일 | 상태 |
|------|------|
| `start-390.png` | 있음 |
| `text-390.png` | 있음 |
| `result-390.png` | 있음 |
| `result-open-390.png` | 있음(결과 요약 뷰; 펼침 카드 스크롤 샷은 요약과 동일 세션) |
| `start-360.png` | 있음 |
| `web-result-390.png` | 있음(웹 샘플 결과, 헤더·가입 줄 포함) |
| `picked-390.png` | **못 찍음** |

## 웹과 다른 곳 (의도만)
1. 헤더(Pagzly·내 결과·로그인)·푸터 없음
2. 부제: `설정은 아래에서 골라요`(웹: 오른쪽에서…)
3. 드롭 문구 3개(`touch`)
4. 결과 `embedded`: 가입 유도·인쇄 버튼 숨김
5. 폰 보정: 제목 28px대, 드롭 min-height ~290px, textarea 16px·min-height 220px 등(`toss-overrides.css`)

## 해요체가 아닌 문구 (웹 동일 → 미수정)
- CheckStart/ResultView에 남아 있는 `~하세요`/`~습니다` 계열은 웹과 같아 이번 차수에서 고치지 않음(예: 「눌러서 파일 고르기」는 touch 시 「여기를 눌러 파일을 골라요」로만 분기).

## 521 가드 수정
- 고지 검사: toss-app 문자열 직접 검색 대신 `CheckScreen`→`CheckStart517`/`ResultView517` 재사용 경로 + `DISCLAIMER_PRINT_485`로 확인(522 구조에 맞춤).

## 검증
- 루트 `npx tsc --noEmit` 통과
- `toss-app` `npx tsc --noEmit` · `npm run build` 통과
- `npm run regression:label-check` **34/34**
- `npm run ait:build` 성공 (`pagzly.ait`, scan-bundle-eval ok)

## 커밋 (cloud-work, main 미푸시)
1. `e23f7ab` — CheckStart touch/accept · ResultView embedded
2. `a4327b0` — toss-app CheckScreen·CSS·scan-eval
3. `30319bd` — 회귀·확인표·스크린샷·보고서
