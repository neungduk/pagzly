# 497차 보고서

## 확인하지 못한 항목
- OCR 미구현(`extractFallback`은 항상 null).
- 혼합 PDF(일부 쪽만 텍스트 없음) 실기 시안 미보유 — 쪽 번호 suffix 로직만 검증.
- Production·main 배포·푸시 미실시.

## 시안 기대 vs 실제
| 파일 | 기대 | 실제 | 분류 |
|------|------|------|------|
| us1_ok | possible 0, US-013 0, 수입 원산지 pass | 동일 | 일치 |
| us2_missing | 내용량·성분·상호 possible + US-013 att | +연락처 possible(규칙 타당) | 기대 완화 |
| us3_korean_only | 영어 아님 안내 + US-007, 연쇄 보류 | notice + possible 1 | 코드 개선 |
| us4_image_only | readable false + 새 이미지 안내(US·KR) | 동일 | 안내 개선 |

## 안내 문구 전/후
- 전: `NOTICE_OUTLINE_485`(아웃라인 변환 추정)
- 후: `NOTICE_IMAGE_PDF_497` + 해결 2개. 혼합 시 `텍스트가 없는 쪽: N.` suffix

## 변경 요지
- us3: 한글 위주 → `NOTICE_US_NON_ENGLISH_497` + US-007만
- US-013/identity: `includesUsWord` 단어 경계
- `extractFallback` 인터페이스 + 0자 호출(null)
- 회귀 `label-check-497` → run-all 등록. 483 empty 기대 갱신

## 검증
- `npx tsc --noEmit` / `npm run build` / 회귀 497·483 OK
- push: cloud-work only (main 미푸시)

## 커밋
- `8b84d9d` docs(497): record targets before US PDF fixtures
- `db28c12` feat(497): image-PDF notice, US hangul deferral, word-boundary claims
- (본 보고서·notes 커밋) docs(497): notes + cha-report

