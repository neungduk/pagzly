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

## B. 글자 추출 품질

### 정규화
- 추출 후 NFC. 비교 시 `normalizeLabelText`: 공백·ZWSP 제거, 전각/일반 콜론 통일(`내용량:` / `내 용 량` / `내용량 :` 동일 매칭).
- 항목 존재 검사는 줄 순서 비의존(전체 텍스트 includes).

### 글자 크기 (pdfjs transform)
- `/Tf` 대신 pdf-parse 번들 pdf.js v2 텍스트 아이템 `transform` 스케일(hypot).
- 샘플 A 실측: 리모넨·리날룰 **3pt**, 전성분 본문 **6.75pt**, 본문 라벨 8.25~10.5pt. (시안 CSS 4px/9px가 PDF pt로 0.75배 스케일된 값으로 보임. **5pt 미만 vs 이상 구분은 가능**.)
- 크기 못 읽으면 `fontSizesPt=null` → 전성분 표시 방법 규칙은 **확인 불가(unknown)**, 통과 금지.

### 생성기 비교 (같은 문구)
문구: `내용량: 100mL / 제조번호: LOT484-TEST / 사용기한: 2028.12.31까지 / 전성분 정제수, 글리세린, 향료, 리모넨`

| 생성기 | 파일 | 추출 | 비고 |
|--------|------|------|------|
| Chromium (Playwright page.pdf) | `generators-484/gen_chromium.pdf` | 63자, fonts [12], 한글 OK | 사용자 샘플과 동일 계열 |
| pdfkit + 맑은 고딕 TTF | `generators-484/gen_pdfkit_malgun.pdf` | 63자, fonts [12], 한글 OK | reportlab 대체(로컬 Python 없음) |
| LibreOffice | — | 미실시 | 환경에 LibreOffice 미설치 |
| Helvetica only | `gen_helvetica_nohangul.pdf` | 영문만 68자 | 한글 라벨 없음 → 항목 누락 다수 |
| 텍스트 없음 | `gen_empty_notext.pdf` | 0자, readable=false | **확인 불가** 안내(통과 금지). OCR은 다음 차수 |

스크립트: `scripts/build-label-generators-484.mjs`

## C. 판정 오류 점검·수정

### 스키마 적응 (새 규칙 발명 없음)
- `load-rules.ts`: `title`→label, `severity_if_missing`(위반→possible, 주의→attention), allergens `items[].ko|inci`.
- 검색 패턴은 **title/rule/examples**에서만 유도(제조번호→LOT/배치, 사용기한→까지/개봉 후/제조일로부터 등 규칙 문구 근거).
- ADV `examples`·rule의 재생/염증 등 → soft 스캔(확인 필요). 내부 id 응답 미포함. UI 상태는 위반 가능/확인 필요만.

### 오탐·누락 수정
| 이슈 | 근거 | 수정 |
|------|------|------|
| A 주소 통과 오탐 | 상호만 있고 시·구·로 없는데 `\d`(150mL)로 주소 인정 | 행정구역·도로명 패턴만 주소로 인정. 상호만 있으면 attention |
| LOT 변형 | 규칙: 제조번호 표시. 샘플 C `제조번호: LOT2411A` | `제조번호`/`LOT`/`Lot`/`배치` 매칭 |
| 사용기한 변형 | 규칙 문구: 사용기한·까지·개봉 후 ○○개월 | expiry 모드로 위 패턴+날짜형 |
| B 기능성·제조번호 | 기능성 입력인데 '기능성화장품' 없음, LOT 없음 | possible(위반 가능) |
| A 4pt 알레르기 | pdfjs 3pt < 5 | allergen found에 pt·5pt 미만 확인 필요 |
| C 장벽 | ADV-003 기능성 오인 + 규칙 applies 피부장벽 맥락 | `피부 장벽`/`장벽 강화` attention |

### 수정 후 실측 (요약)
| 샘플 | 실측 | 기대 대비 |
|------|------|-----------|
| A | 사용기한·제조번호 possible, 재생/완전 제거 attention, 리모넨·리날룰+3pt attention, 전성분 표시 방법 5pt 미만 possible, 주소 attention | 핵심 일치(제조번호 누락도 실제 없음) |
| B | 제조번호·기능성화장품 possible | 일치(확인 필요≈위반 가능 UI) |
| C | possible=0, 장벽 강화 attention, pass≥15 | 일치 |

"위반" 단정 문자열·rule id(`KR-LBL-*`) API 응답 0.
