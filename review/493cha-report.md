# 493차 보고서

## 확인하지 못한 항목
- 식약처 민원인안내서 원문 대조 미완(데이터는 협회 해설서 2025 기준).
- 문맥·이미지 전체 판단 불가(단어 일치 → 확인 필요만).
- 전성분 라벨이 없는 시안은 영역 마스킹 실패 가능(스캔은 유지).
- ad-phrases에 없는 KR-ADV 표현은 규칙표 쪽 확인 필요로 남김.

## 패턴 스캔 전/후

### i3_ads
| | 전(492) | 후(493) |
|--|---------|---------|
| 광고 확인 필요 | 의약품 오인 1건(통합) | 질병 진단·치료… / 의약품 효능·효과… / 미백 표현(기미·주근깨) 등 항목 분리 |

### 광고 변이 (mutation-492 확장)
| 변이 | 기대 항목 | 결과 |
|------|-----------|------|
| inject-forbidden (피부 재생) | 의약품 효능·효과 표방… | PASS |
| ad-whitening | 미백 표현… | PASS |
| ad-wrinkle | 주름 개선 표현… | PASS |
| ad-hospital | 의료인·의료기관… | PASS |
| ad-stem | 인체 유래·줄기세포·엑소좀 | PASS |
| ad-age | 피부 나이 표현 | PASS |
| ad-super | 절대적·즉각적·최상급 | PASS |
| ad-pct | 수치·기간·비교 표현 | PASS |

## 오탐 시험
i1·i5·sample C·정상 base·전성분(알부틴/천연)·주의사항(전문의)·재생지·정제수 100%·「보다」 → 광고 확인 필요 0.

## D 조사
- **i1 알레르기**: 주소 `향남읍`의 「향」이 allergen patterns 단독 `"향"`에 매칭. 규칙 대비 과도 → `"향"` 제거 제안만(미수정).
- **가격·바코드**: 규칙표 `severity_if_missing: "주의"` → attention. 이번 차수 수정 대상 아님. 상세는 `493-notes.md`.

## 변경 파일
- `lib/label-check/ad-phrases.ts` (신규)
- `lib/label-check/run-check.ts`
- `scripts/label-check-mutation-492.ts`
- `scripts/regression/label-check-493.ts`, `run-all.ts`
- `scripts/regression/label-check-483.ts` (A attention 기대 7)
- `review/493-targets.md`, `493-notes.md`, `493cha-report.md`

## 검증
- `npx tsc --noEmit` 통과
- `npm run build` 통과
- 회귀 label-check-483 / label-check-493 통과
- `git push origin cloud-work` 완료 (`main` 미푸시)
- tip: `26cbe89` (docs report) / `2502bb4` (feat) / `0fc5809` (targets)
