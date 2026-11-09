# 492차 변이·변형 시험 노트

## 판정 기준 (위반 가능 vs 확인 불가)
| 상태 | 기준 |
|------|------|
| 위반 가능(possible) | 필수 표시로 보이는 항목이 **텍스트에 없는 것으로 판단**될 때(severity_if_missing=위반) |
| 확인 필요(attention) | 단서·금지 문구·알레르기 등 **추가 확인**이 필요할 때 |
| 확인 불가(unknown) | 글자/영역(전성분 pt)을 **읽거나 구분할 수 없을** 때 — 통과로 보지 않음 |
| skipJudgment | 한글·본문이 거의 없음 → 위반 가능 폭탄 금지, 안내만 |

Ingredients 단독 표기는 규칙표에 '전성분' 근거만 있어 자동 통과 대상이 아님(확인 필요).

## 변이 시험 (PDF)
| 변이 | 기대 | 실제(대상) | 기타 오탐 | 결과 |
|------|------|------------|-----------|------|
| base | possible=0 | possible=0 | — | PASS |
| drop-org-addr | fail(영업자의 상호 및 주소) | possible | spill=0 | PASS |
| drop-volume | fail(내용물의 용량 또는 중량) | possible | spill=0 | PASS |
| drop-expiry | fail(사용기한 또는 개봉 후 사용기간) | possible | spill=0 | PASS |
| drop-lot | fail(제조번호) | possible | spill=0 | PASS |
| drop-country-with-import | fail(수입화장품의 제조국·제조회사명·소재지) | possible | spill=0 | PASS |
| drop-ingredients | fail(제조에 사용된 성분(전성분)) | possible | spill=0 | PASS |
| drop-allergen | attention(향료) | attention: 향료 관련(“향료”) — 알레르기 개별 성분 표기 여부 확인 필요 | — | PASS |
| allergen-4pt | possible/unknown | possible | — | PASS |
| drop-caution | fail(사용할 때의 주의사항) | possible | spill=0 | PASS |
| func-no-mark | fail(기능성화장품 도안 또는 '기능성화장품' 표시) | possible | spill=0 | PASS |
| inject-forbidden | fail(의약품 오인 우려 표현 금지) | attention | spill=0 | PASS |

변이 요약: 실패(누락) 0, 오탐(번짐) 0

## 표기 변형 시험 (텍스트)
| id | 핵심 통과 | 결과 |
|----|-----------|------|
| exp-dot | ok | PASS |
| exp-dash | ok | PASS |
| exp-exp | ok | PASS |
| exp-from-mfg | ok | PASS |
| exp-pao | ok | PASS |
| vol-ml | ok | PASS |
| vol-space | ok | PASS |
| vol-hangul-ml | ok | PASS |
| vol-g | ok | PASS |
| vol-floz | ok | PASS |
| lot-std | ok | PASS |
| lot-lotno | ok | PASS |
| lot-ln | ok | PASS |
| lot-colon | ok | PASS |
| lot-batch | ok | PASS |
| org-full | ok | PASS |
| org-slash | ok | PASS |
| org-mfr | ok | PASS |
| ing-jeon | ok | PASS |
| ing-break | ok | PASS |

변형 통과율: 20/20

## 배치 변형 (PDF 2단·셔플)
| layout-twocol | ok | PASS |

## 글자 크기 경계 (PDF)
| font-4.9pt | possible|unknown | possible | PASS |
| font-5pt | pass|unknown | pass | PASS |
| font-5.1pt | pass|unknown | pass | PASS |

## 알레르기 경우 구분 (텍스트)
| frag-only | attention+구분 | attention:향료 관련(“향료”) — 알레르기 개별 성분 표기 여부 확인 필요 | PASS |
| all-only | attention+구분 | attention:리모넨(Limonene) / 글자 크기 확인 불가 | PASS |
| both | attention+구분 | attention:리모넨(Limonene) / 글자 크기 확인 불가 | PASS |

## 글자 거의 없음 → 위반 가능 폭탄 금지
| tiny | skipJudgment & possible=0 | skip=true possible=0 | PASS |
