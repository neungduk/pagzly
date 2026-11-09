# 484차 노트 — 진짜 PDF 기준선·추출·판정

## A. 데이터 교체와 기준선 (현재 코드, 수정 전)

- 규칙/알레르기/샘플: `7b148b5`에서 사용자 원본으로 교체됨. Chromium 임베드 한글 PDF 3종. 483 마커 샘플은 `samples/legacy-483/`.
- 추출(pdf-parse): A 170자 / B 285자 / C 301자 — **한글 본문 읽힘**(마커 불필요).
- 로더/검사기: 483 초안 스키마(`label`/`keywords`/`ko_draft`) 가정. 원본은 `title`/`severity_if_missing`/`items[].ko` → **라벨 undefined, code 22건 전부 관련 표기 못 찾음(possible)**.

| 샘플 | 기대 결과 | 실제 결과(수정 전) | 일치 |
|------|-----------|-------------------|------|
| A 모아리 토너 | 사용기한 없음(위반 가능), 재생/완전 제거 확인 필요, 리모넨·리날룰 확인 필요, 알레르기 글자 4pt(5pt 미만 확인 필요) | readable·170자. summary possible=22 / pass=0 / attention=0. 전 findings 라벨 `undefined`, found="관련 표기를 찾지 못함". 폰트 `/Tf` null. 기대 항목 미검출 | ❌ |
| B 로반 선크림 | 기능성 표기·제조번호 확인 필요 | 동일 스키마 붕괴(possible=22). 제조번호/기능성 미판정 | ❌ |
| C 솔트 바디워시 | 대부분 통과 + 피부 장벽 강화 확인 필요 | 동일(possible=22, pass=0). 장벽 미검출 | ❌ |

### 원인 (코드 수정 근거)
1. `load-rules.ts`가 `label`/`keywords`/`allergens[].ko_draft`를 읽어 원본 JSON과 불일치.
2. `run-check.ts`가 keywords 기반 presence만 수행 → 키워드 없으면 전부 실패.
3. 글자 크기: Chromium PDF에서 `/Tf` 추정 실패 → fontSizesPt null.

→ B에서 NFC·정규화·pdfjs transform, C에서 title/severity/allergens 스키마 적응(새 규칙 발명 금지).
