# 500차 보고서

## 확인하지 못한 항목
- Production 환경변수 실값·검색엔진 noindex 반영.
- `permanently sealed cap` 포장 문구 오탐 — 데이터 수정 여부는 기획 판단(미수정).
- 브라우저에서 수정 제안 UI 실측.

## 미국 광고 교체 전/후 (us2_missing)
| | 전 | 후 |
|--|----|----|
| 광고 attention | US-013「불실표시·오인 광고」1건 | disease / structure_function / stem_exosome / cosmetic_concern_drug / evidence (항목별, 히트≤3) |
| identity | attention | 동일 |
| US-013 행 | pass/att | **제거**(us-ad-phrases로 대체) |

## 오탐 시험
- Treatment/healthy/prevention: 미일치. regenerat 접두: 일치. Ingredients Growth factor: 마스킹 후 0. us1 광고 오탐 0.

## 점검표
`review/500-release-checklist.md`

## 검증
- tsc / build / 회귀 500·497·483 OK
- push: cloud-work only

## 커밋
- (targets / 구현 / docs·회귀 — push 후 해시)
