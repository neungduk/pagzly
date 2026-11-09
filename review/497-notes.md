# 497차 노트 — 코드 전 측정·원인 분류

## 시안 실측 (수정 전)
| 파일 | 실측 | 기대 | 분류 |
|------|------|------|------|
| us1_ok | possible 0, att 0, US-013 없음. Fragrance/Linalool은 US-012 manual만 | OK | — |
| us2_missing | possible 내용량·상호·성분·연락처 + US-013 att 1 | 내용량·성분·상호 possible + US-013 | **기대 완화 OK**(연락처 추가 possible은 규칙상 타당) |
| us3_korean_only | US-007 + identity att + 상호·성분·연락처 possible 연쇄 | 영어 아님 우선·나머지 보류 | **코드 개선 필요** |
| us4_image_only | skip + 구 아웃라인 안내(US·KR) | 새 이미지 안내 | **안내 문구 개선** |

## 수정 후
| 파일 | 결과 |
|------|------|
| us1 | possible 0, US-013 없음, 원산지 pass(imported) |
| us2 | 내용량·상호·성분·연락처 possible + US-013 attention 1 |
| us3 | NOTICE_US_NON_ENGLISH_497 + US-007 possible 1만 (연쇄 없음) |
| us4 US/KR | skip + NOTICE_IMAGE_PDF_497 (+빈 쪽 suffix 조건부) |

## extractFallback 호출 위치
- `extractLabelPdf` 말미: 본문 0자일 때 `runExtractFallback(buffer, null)` (항상 null). OCR 연결 시 인자만 교체.

## US-013 단어 경계
- `includesUsWord`: 단일 토큰은 굴절(s/es/ed/ing)만 허용 → `Treatment`⊃`treat`, `healthy`⊃`heal` 방지.
- cream/gel/lotion 단독은 의약품 주장으로 잡지 않음(시안·텍스트 회귀).
- net qty: 숫자+단위(g/oz/ml) 동반만 인정(기존 유지).
