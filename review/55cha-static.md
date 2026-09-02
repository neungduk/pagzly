# 55차 정적 검증

생성: 2026-09-01

| 체크 | 결과 | 상세 |
|------|------|------|
| 사이즈 다이어그램 — 4개 치수 매칭 | PASS | matched keys: shoulder, chest, length, sleeve |
| 사이즈 다이어그램 — 플레이스홀더/비매칭 라벨 화살표 제외 | PASS | labels shown: 어깨너비, 가슴단면, 총장, 소매길이 |
| 사이즈 다이어그램 — 부분 매칭만 표시 | PASS | matched: shoulder |
| 사이즈 다이어그램 — 비패션 카테고리 비활성 | PASS | isFashionCategory(화장품)=false |
| 퀵팩트 — 화장품 spec_table에서 추출 | PASS | 용량:50ml | 제형:젤 크림 | 향:무향 | 원산지:국내 |
| 퀵팩트 — spec_table 없으면 빈 배열 | PASS | facts=0 |
| 앵커 — 존재 섹션만 링크 | PASS | 제품정보→#pagzly-info, FAQ→#pagzly-faq, 배송→#pagzly-shipping |
| 앵커 — 패션 사이즈·갤러리 | PASS | 사이즈, 구성 |
| export HTML — 앵커 nav 포함 | PASS | anchor nav + 제품정보 링크 |
| export HTML — 퀵팩트 스트립 포함 | PASS | brand card 직후 spec 요약 |
| export HTML — section id 부여 | PASS | pagzly-info id on spec_table |
| export HTML — 패션 사이즈 SVG | PASS | size_table diagram in export |

**합계:** 12/12 PASS

## 마켓플레이스 호환성

sticky 앵커 바·`scroll-behavior: smooth`는 로컬 export HTML·프리뷰에서 동작 확인. 스마트스토어 등 외부 에디터 붙여넣기 시 sticky/앵커 스크립트 보존 여부는 **확인 필요**.
