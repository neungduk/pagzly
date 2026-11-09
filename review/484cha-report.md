# 484차 보고 — 진짜 PDF 글자 추출·검수 정확도

## 확인하지 못한 항목
- **LibreOffice PDF**: 로컬에 LibreOffice 미설치 → 생성기 비교 생략.
- **Python reportlab**: Python/pip 없음 → pdfkit+맑은 고딕 TTF로 대체.
- **OCR**: 이미지 스캔/텍스트 0자 PDF는 확인 불가만 안내(유료 OCR 금지).
- **알레르기 한글명·고시 원문**: `allergens-kr-25_draft.json` 초안. 함량 임계값 자동 판정 불가.
- **run-all 전체 녹색**: `표시사항 484`·482 계열·상세 관련 최근 항목은 통과. 전체 172중 24실패는 V4/V5·폰트 정책 등 **기존 상세페이지 회귀**(이번 변경과 무관). label-check·상세페이지 코드 경로는 수정하지 않음.

## 목표 / 실측

| 목표 | 실측 |
|------|------|
| 진짜 Chromium 한글 PDF로 재검증 | A/B/C 임베드 폰트 샘플 추출 170/285/301자 |
| 기준선 기록 | `484-notes.md` A표 — 수정 전 스키마 붕괴(possible=22) |
| NFC·공백/콜론 정규화·순서 비의존 | `normalizeLabelText` |
| pdfjs transform 글자 크기 | A: 알레르기 3pt / 전성분 6.75pt 구분. 불가 시 unknown |
| 생성기 비교 | Chromium·pdfkit OK, LibreOffice 없음, empty→확인 불가 |
| 오탐·누락(LOT/사용기한/주소) | C에서 수정·notes 근거 기록. 위반 단정·id 노출 0 |
| 회귀 | `label-check-483.ts` 갱신 통과. 표→카드로 320폭 min-width 제거 |

## 발견된 오류와 수정
1. 사용자 JSON(`title`/`severity_if_missing`/`items[].ko`) vs 483 로더(`label`/`keywords`) → 전량 실패 → 로더·검사기 적응.
2. `/Tf` 폰트 크기 Chromium에서 무효 → pdfjs text item transform.
3. 주소 판정에 용량 숫자 오탐 → 행정구역·도로명만 인정.
4. 결과 테이블 `min-w-[640px]` 가로 넘침 위험 → 카드 목록·`break-words`.

## 생성기별 추출 비교

| 생성기 | 추출 | 안내 |
|--------|------|------|
| Chromium page.pdf | 한글 63자 | 정상 |
| pdfkit+malgun | 한글 63자 | 정상 |
| LibreOffice | — | 미설치 |
| Helvetica only | 영문만 | 한글 항목 누락(판정 다수 실패) |
| empty notext | 0자 | **확인 불가**(통과 금지) |

## 변경 파일
- `review/TASK_484.md`, `484-targets.md`, `484-notes.md`, `484cha-report.md`
- `review/data/samples/generators-484/*`
- `lib/label-check/{extract-pdf,load-rules,run-check}.ts`
- `app/label-check/page.tsx`
- `scripts/build-label-generators-484.mjs`, `scripts/regression/label-check-483.ts`
- `package.json` (pdfkit)

## 남은 문제
- LibreOffice·reportlab 환경 확보 후 생성기 표 보완.
- 고시 원문 대조, OCR, 함량 기준 자동 판정.
- run-all 기존 24실패(상세 V4/V5)는 별도 차수.

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: `46eae17` (`docs(484): add cha report for real-PDF label-check accuracy`)
- 항목: targets `e2262fa` → A `4a5c422` → B `5920e23` → C `abfa98d` → D `4d20e82` → E `46eae17`
