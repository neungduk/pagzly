# 500차 노트

## us2_missing 교체 전/후
| | 전(US-013 하드코드) | 후(us-ad-phrases) |
|--|---------------------|-------------------|
| attention 광고 | 불실표시·오인 광고 1건 | disease·structure_function·stem_exosome·cosmetic_concern_drug·evidence (항목별) |
| identity | attention 유지 | 동일 |
| US-013 pass/att 행 | 있음 | **제거**(데이터 스캔으로 대체, 중복 방지) |

## 오탐·굴절
| 케이스 | 결과 |
|--------|------|
| treat⊂Treatment | 미일치(497 경계) |
| heal⊂healthy | 미일치 |
| prevent⊂prevention | 미일치(굴절만; prevent 길이7 < 접두 임계8) |
| regenerat→regeneration | 일치(접두≥8) |
| Ingredients Growth factor | 마스킹 후 stem 오탐 0 |
| permanently sealed cap | **permanently 패턴에 걸릴 수 있음** — 데이터 수정 필요 시 보고(미수정) |

## 데이터 수정 제안(미적용)
- `permanently` 단독 → 포장 문구 오탐 가능. 완화 예: `permanently erase` 등 구로 한정(기획 판단).
