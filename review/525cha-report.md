# 525차 보고서 — 토스 시작 화면 PC결(설명 + 인라인 설정)

## A. 조사 (코딩 전)

1. **재사용**: `LandingStage519`/`FixShowcase519`는 `next/link`·랜딩 CSS·애니메이션 의존으로 토스 Vite 번들에 그대로 import 불가. `LandingBelt515`도 랜딩 CSS 묶음. → 토스 전용 작은 부품 `StartExplain525` 신규. 시각 값(#1D4ED8, 카드 그림자·모서리)은 PC CSS를 따름.
2. **숫자**: `labelRuleCounts514()`는 규칙 JSON import라 번들 금지. → `RULE_COUNTS_525 = { kr: 35, us: 13 }` 상수(실측과 회귀 대조).
3. **baseline**: `review/525-baseline/` (`start-360/390/430-fold|full`).

## B. 구역별 구현

| 구역 | 방식 | 이름 |
| --- | --- | --- |
| 히어로 보조 문구 | 수정 | `TOSS_COPY.heroSub` |
| 업로드 카드 | 유지 | `CheckStart517` |
| 점검 설정 인라인 | 공용 선택 props + 토스 CSS | `inlineSettings` → `.lc517-settings-inline` |
| 예시 행 | 유지 | `.toss-sample-cta` |
| 3단계·숫자·미니예시·근거·고지 | 신규 | `StartExplain525` |
| 미니 예시 문장 | PC 상수 재사용 | `LANDING_FIX_PAIRS_519` 앞 2개 |
| 설정 시트/요약 행 | **제거** | `settingsOpen`·`.toss-settings-summary` 삭제. 시작 화면에서만 쓰이던 시트라 정리. 키보드 포커스 트랩/히스토리 설정도 함께 제거(결과·OCR popstate는 유지). |

법령 확인 기준일: 서버/CORS로 토스에서 쉽게 못 붙임 → **미부착**(사유: 미리보기 Origin→API CORS).

## C. PC와 맞춘 값 (전→후)

| 항목 | 전 | 후 |
| --- | --- | --- |
| 배경 워시 | blob 2개 | 파랑·살구 + 세 번째 옅은 파랑 번짐 |
| 제목 자간/크기 | -0.03em / ~30px | -0.035em / clamp~32px |
| 카드 그림자 | 제각각 | `0 8px 24px rgba(40,60,140,.08)`, 모서리 20px |
| 보조 글자 | #6a6d74 일부 12.5px | #4a4d54·14px↑ |
| 설정 진입 | 하단 시트 | 업로드 바로 아래 인라인 카드 |
| 데스크톱 1280 | 전체폭 | `max-width:430px` 가운데 컬럼 |

## D. 테스트

- 회귀 `npm run regression:label-check` **38/38** (525 포함, 523 golden 포함)
- `npx tsc --noEmit` (루트) / `toss-app` tsc 통과
- `npm run build:demo` + `scan-bundle-eval` ok
- 샷: `review/525-shots/` (360/390/430 start·picked·text·ocr·result·error, 스크롤 top/mid/bottom, desktop-1280)
- 자동: 카드 `getBoundingClientRect` 뷰포트 안 (`problems.txt` 비어 있음)
- 설정 반영: mock POST에서 `market=KR`, `rinseOff=true` (`request-flags.json`, 원문 미저장)
- 미확인: 실기기 토스 상단 바 겹침, 실서버 OCR 가능 시 사진 경로 E2E

## E. 사용자 폰 확인 목록

1. 처음 열었을 때 위쪽 설명과 설정이 한눈에 들어오는가(스크롤 없이 업로드·설정이 보이는가)
2. 설정(국가·제품 칩)을 바꾸고 점검했을 때 결과에 반영되는가
3. 키보드(문구 붙여넣기)·하단 버튼이 서로 가리지 않는가
4. 토스 상단 바와 내용이 겹치지 않는가
