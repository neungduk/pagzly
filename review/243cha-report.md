# 243차 — image_text 카피 매칭을 preferForSlot 전 슬롯으로 확장

생성: 2026-09-23 · 유료 API **0** · 파일 1개

## 한줄 결론

`preferForSlot`의 role/lifestyle 후보가 2장 이상일 때 `scoreImageForCopy` 타이브레이커를 적용. DETAIL_SLOT_PRIORITY 11개 밖 슬롯도 글·태그 겹침으로 사진을 고름.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/assign-section-images.ts` | `pickBestIndexByCopy` export + `preferForSlot`에 sectionText/tags/reasons + bestByCopy 래퍼; 호출부 인자 추가 |

무변경: `allocatePreferQueue`(11개 슬롯), `texture_feel`의 `details[1]` 직접 분기, `pick()` 엔진

안전장치: 후보 ≤1 · 카피 없음 · 점수 전부 0 → 기존 first-index와 동일

---

## 2. 검증

`npx tsx scripts/243cha-image-text-copy-match-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| pickBestIndexByCopy a~e | OK |
| DETAIL_SLOT 경로 결정성 | OK |
| usage_scenario / coordination | 태그 매칭으로 서로 다른 lifestyle 선택 |
| role당 1장 | 태그 바꿔도 결과 불변 |
| texture_feel details[1] | 소스 유지 |
| 238 / 242 회귀 | ALL PASS |

API generate: 0
