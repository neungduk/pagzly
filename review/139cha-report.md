# 139차 — 다중 카테고리 회귀 QA

생성: 2026-09-08

## 요약

130~138차 누적 UI/조건부 로직을 카테고리 5종(+리뷰 유무)으로 회귀 확인. **자동 판정 이슈 0건.** 신규 유료 API 0건. `tsc --noEmit` EXIT_CODE=0.

## 방법

- `/api/generate`·enhance 등 **미호출** (유료 0). `TEST_MODE` 전제.
- 기존 세션(`beauty-showcase-one`, `pexels-electronics-detail`) + 135/137 픽스처로 결정론 섹션 삽입 후 `/create/result` 검증.
- 결과 미리보기는 기본 접힘(히어로+본문 2) → `detail-preview-expand` 클릭 후 전체 캡처.
- 카테고리 네이티브 비주얼 보조: `detail-preview?capture=58-*|133-*|135|137`.
- 스크립트: `scripts/139cha-regression-qa.ts`

## 체크리스트 표

| 카테고리(케이스) | 135/137 리뷰 조건부 | 138 프레임워크 라벨 | 134 편집 패널 | 48 색상 스와치 | KC 인증 | 유령 사각형 | 비고 |
|---|---|---|---|---|---|---|---|
| 화장품/뷰티 (cosmetics-review) | 정상 | 정상 | 정상 | 해당없음 | 정상 | 정상 | 매칭 배지 3 + measured chart |
| 화장품/뷰티 (cosmetics-noreview) | 정상 | 정상 | 정상 | 해당없음 | 정상 | 정상 | review/chart 미노출 |
| 패션/의류 (fashion) | 정상 | 정상 | 정상 | 정상 | 정상 | 정상 | 스와치 클릭 이미지 변경 + export radio |
| 식품 (food) | 정상 | 정상 | 정상 | 해당없음 | 정상 | 정상 | |
| 전자/가전 (electronics) | 정상 | 정상 | 정상 | 해당없음 | 정상 | 정상 | spec_table KC 인증 행 노출 |
| 생활/리빙 (living) | 정상 | 정상 | 정상 | 해당없음 | 정상 | 정상 | |

## 스크린샷

- 케이스별: `review/qa-screenshots/139cha-{id}-full.png` + `-1/-2/-3`, `-sidebar`, `-edit`, `-preview`
- 스와치: `139cha-fashion-swatch-0.png` / `139cha-fashion-swatch-1.png`
- export 스니펫: `review/139cha-fashion-color-export-snippet.html`

## 진단만 남긴 관찰 (수정 안 함)

1. **카테고리 키 이중성** — `enrichSectionsWithProductMetadata` / `resolveTemplateCategory`는 폼 키 `"전자제품"`을 써야 전자 스켈레톤(KC 포함)이 적용됨. 브리프 표기 `"전자/가전"`을 그대로 넘기면 `생활/리빙` 폴백. 재현: `resolveTemplateCategory("전자/가전") === "생활/리빙"`. 다음 라운드에서 입력 정규화(alias) 후보.
2. **결과 미리보기 접힘** — 회귀 시 `상세정보 더보기`를 누르지 않으면 하위 섹션(리뷰/스와치/KC)이 DOM에 없어 오탐 가능. 기능 버그는 아니나 QA 스크립트 함정으로 기록.

## 이슈 (수정 라운드 후보)

- 자동/육안 기준 **차단급 회귀 없음**.
- 위 1번은 기능 결함 후보(키 불일치)로만 백로그.

## 비용 / tsc

- 금지 API 히트: **0건** (`/api/generate`, `/api/enhance`, backdrop 계열)
- 신규 유료 API 호출: **0**
- `tsc --noEmit` EXIT_CODE=**0**
