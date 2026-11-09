# 492차 — 규칙 커버리지 표

근거: `review/data/kr_label_rules_draft_v0.1.json` + `lib/label-check/load-rules.ts`·`run-check.ts` (2026-11-09).

## code인데 미구현 / 부분 (수정 대상 상단)

| id | 제목 | 상태 | 한계 |
|----|------|------|------|
| KR-LBL-019 | 소용량·견본품 간략 표시 | **부분(오분류)** | title에 `용량`이 있어 `presence`(내용량 패턴)로 유도됨. `skip_info`여야 함 → load-rules 순서 수정 |
| KR-LBL-021 | 전성분 표시 방법 | **부분** | 전성분 **영역**이 아니라 PDF 전역 pt. 영역 식별 실패 시 확인불가 미분리 |
| KR-LBL-003 | 제조에 사용된 성분(전성분) | **부분** | 패턴 `전성분`만. `Ingredients` 등은 규칙 근거 부족 → 확인 필요(notes) |
| KR-LBL-004 | 내용물의 용량 또는 중량 | **부분** | `㎖`·`fl. oz.` 등 표기 변형 약함 |
| KR-LBL-005 | 제조번호 | **부분** | `L/N`·`Lot.No` 등 일부 변형 약함 |
| KR-LBL-006 | 사용기한… | **부분** | `EXP`·`12M` 심벌 병기 등 규칙 문구 대비 약함 |
| KR-LBL-007 | 가격 | **부분** | `원`/`₩` 단순 존재. 견본품 대체 문구는 019와 연계 미구현 |
| KR-LBL-010 | 화장품 바코드 | **부분** | 텍스트 `바코드`/`EAN`만. 이미지 바코드 미검출 |
| KR-LBL-012~014,017,018,020,025 | 조건부·생략·포장 등 | **수동 확인 목록만** (`skip_info`) | 자동 판정 없음(의도) |
| KR-LBL-023 | 표준 국문 성분명 | **미구현(ai→presence 잔여)** | ai인데 examples 없어 presence로 떨어질 수 있음 → 수동/스킵 쪽이 맞음 |
| KR-LBL-026 | 세트 상품… | **부분** | ai+mode lot/forbid 혼선. 세트 전용 로직 없음 |
| KR-LBL-011,015,016 | 조건부 존재 | **부분** | trigger 있을 때만. 오탐·누락 여지 |

## 전체 35개

| id | 제목 | check_type(원본) | 구현 상태 | 근거 | 한계 |
|----|------|------------------|-----------|------|------|
| KR-LBL-001 | 화장품의 명칭 | code | 자동(부분) | `product_name` | 한글2+/영문3+면 통과. 구별성 미검증 |
| KR-LBL-002 | 영업자의 상호 및 주소 | code | 자동 | `address` | `판매원`만은 규칙 근거 부족(통과 안 함) |
| KR-LBL-003 | 전성분 | code | 자동(부분) | `presence` `전성분` | 영문 Ingredients 미인정 |
| KR-LBL-004 | 용량·중량 | code | 자동(부분) | `presence` | 단위 변형 보강 대상 |
| KR-LBL-005 | 제조번호 | code | 자동(부분) | `lot` | 표기 변형 보강 대상 |
| KR-LBL-006 | 사용기한·개봉후 | code | 자동(부분) | `expiry` | EXP/12M 등 보강 대상 |
| KR-LBL-007 | 가격 | code | 자동(부분) | `presence` | |
| KR-LBL-008 | 기능성 표시 | code | 자동 | `functional_mark` | functional 입력 시에만 |
| KR-LBL-009 | 주의사항 | ai→code | 자동(부분) | `presence` | 존재 힌트만 |
| KR-LBL-010 | 바코드 | code | 자동(부분) | `presence` | 이미지 미지원 |
| KR-LBL-011 | 기능성 효능·용법 | code | 자동(부분) | `conditional_presence` | functional 시 |
| KR-LBL-012 | 성분명·함량(제품명) | code | 수동 목록만 | `skip_info` | |
| KR-LBL-013 | 세포·조직 함량 | code | 수동 목록만 | `skip_info` | |
| KR-LBL-014 | 천연·유기농 함량 | code | 수동 목록만 | `skip_info` | |
| KR-LBL-015 | 수입 제조국 등 | code | 자동(부분) | `conditional_presence` | 수입 단서 시 |
| KR-LBL-016 | 의약품이 아님 | code | 자동(부분) | `conditional_presence` | functional+trigger |
| KR-LBL-017 | 영유아 보존제 | code | 수동 목록만 | `skip_info` | |
| KR-LBL-018 | 2차포장 최소기재 | code | 수동 목록만 | `skip_info` | |
| KR-LBL-019 | 소용량·견본품 | code | **부분(오분류→수정)** | 잘못 `presence` | skip_info로 교정 |
| KR-LBL-020 | 전성분 생략 가능 | code | 수동 목록만 | `skip_info` | |
| KR-LBL-021 | 전성분 표시 방법 | code | 부분 | `font_size` min 5pt | 영역 한정 필요 |
| KR-LBL-022 | 알레르기 25종 | code | 자동(부분) | `allergen` | 함량 임계 자동 불가→확인필요 |
| KR-LBL-023 | 표준 국문 성분명 | ai | 미구현/잔여 | — | 수동 쪽이 적절 |
| KR-LBL-024 | 수출 전용 | manual | 수동 | `skip_info` | |
| KR-LBL-025 | 맞춤형화장품 | code | 수동 목록만 | `skip_info` | |
| KR-ADV-001 | 의약품 오인 | ai→code | 자동 | `forbidden_phrase` | examples+고정 소량 |
| KR-ADV-002 | 범위 밖 효능 | ai→code | 자동 | `forbidden_phrase` | examples |
| KR-ADV-003 | 기능성 오인 | ai→code | 자동 | `forbidden_phrase` | |
| KR-PEND-001 | 개정안 | manual | 수동 | — | |
| KR-LBL-026 | 세트 제조번호·기한 | ai | 부분 | lot/forbid 혼선 | 세트 전용 없음 |
| KR-LBL-027 | 색조 착색제 ± | ai | 수동 목록만 | `skip_info` | |
| KR-ADV-004~007 | 광고 표현 | ai→code | 자동 | `forbidden_phrase` | examples |

## 집계(원본 check_type 기준이 아니라 **실효 구현**)
- 자동 판정(완전·실용): ~12
- 부분 판정: ~12 (이번 차수 보강 중심)
- 수동 확인 목록만(`skip_info`/manual): ~10
- 미구현·잔여: ~1–2 (023 등)
