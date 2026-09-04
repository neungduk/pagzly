# 117차 — 헤드라인 전용 타이포그래피

생성: 2026-09-04  
전제: 본문 Noto Sans KR 유지. Google Fonts 무료. `TEST_MODE` 무관(이미지 생성 없음).

## 선정 (2종 페이스, 신규 패밀리 1개)

| 페이스 | 카테고리 | 근거 |
|--------|----------|------|
| **Noto Serif KR** | 화장품/뷰티, 의류/패션, 식품 | 클린 뷰티·에디토리얼 레퍼런스에 흔한 세리프. 식품도 따뜻한 존재감 |
| **Noto Sans KR 800 + tracking -0.045em** | 전자제품, 생활용품, 반려동물 | 새 폰트 없이 weight/자간으로 디스플레이감. 테크·생활 무드에 맞음 |

폴백 스택에 항상 `Noto Sans KR` 포함. `font-display: swap`.

## 적용 범위

- 히어로 mainHeadline + 섹션 디스플레이 타이틀 (`.pagzly-display-headline`)
- 본문 / sectionLabel / compact / spec 표 숫자·라벨 — **변경 없음**
- 미리보기(`data-headline-face`) + `export-detail-html` (`buildDetailExportFontCss`)

## 육안 (360px 스크린샷)

| 파일 | 평가 |
|------|------|
| `117cha-typography-cosmetics.png` | 세리프 대비 뚜렷, 뷰티 무드 ↑ |
| `117cha-typography-fashion.png` | 세리프 OK. `word-break:keep-all`로 중간 끊김 완화 |
| `117cha-typography-food.png` | 세리프+머스타드 배경 조화 |
| `117cha-typography-electronics.png` | 굵은 고딕 디스플레이, 테크 인상 |
| `117cha-typography-living.png` / `pet.png` | sans-display, 과하지 않음 |
| `117cha-typography-fallback.png` | 외부 폰트 차단 시 스택에 Sans 폴백 유지 |

## 검증

- [x] `117cha-typography-smoke` PASS (매핑·export CSS·폴백 문자열)
- [x] 6카테고리 스크린샷 + 폴백
- [x] `npx tsc --noEmit` 0건
