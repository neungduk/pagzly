# 222차 — 표시광고 컴플라이언스 모듈 (반려동물·패션·생활용품)

생성: 2026-09-18 · 유료 API 0건 · tsc 0

## 한줄 결론

화장품/식품/전자에 이어 `pet`·`fashion`·`living` 3개 카테고리에도 AI 프롬프트 가이드 + 서버 정규식 최종 치환을 동일 패턴으로 확장. 검증 스크립트 ALL PASS.

---

## 1. 신규 파일

| 파일 | 카테고리 상수 (`CreateProductForm` 일치) | 규칙 수 |
|------|------------------------------------------|---------|
| `lib/pet-compliance.ts` | `반려동물` | 10 |
| `lib/fashion-compliance.ts` | `의류/패션` | 6 |
| `lib/living-compliance.ts` | `생활용품` | 5 |

구조는 `lib/electronics-compliance.ts`와 동일: `*_AI_PROMPT` · `sanitizeText` · `review*Copy` · `is*Category`.

### 정규식 치환 표

#### Pet

| 원문(패턴) | 치환 |
|------------|------|
| 모든 질환에 효과 | 다양한 상황에 도움 |
| 평생 건강 보장 | 건강 관리 지원 |
| 의약품 수준 | 전문적인 관리 수준 |
| 수의사 추천/승인 | 반려인들의 선택 |
| 부작용 없음 | 안전 기준 준수 |
| 100% 안전 | 높은 안전성 |
| 질병 예방 | 건강 관리에 도움 |
| 질병 치료 / 치료 효과 | 컨디션 관리 지원 |
| 완치 | 컨디션 개선 |
| 약효 | 기능성 |

#### Fashion

| 원문(패턴) | 치환 |
|------------|------|
| 평생 무료 수선 | 애프터서비스 지원 |
| 영구 변형 없음 | 우수한 형태 유지력 |
| 완전 탈색 방지 | 우수한 색상 지속력 |
| 절대 줄어들지 않음 | 수축 방지 가공 |
| 평생 보증 | 품질 보증 지원 |
| 완벽한?/완벽 핏 | 편안한 핏 |

#### Living

| 원문(패턴) | 치환 |
|------------|------|
| 환경호르몬 전혀 없음 | 환경호르몬 안전 기준 준수 |
| 완전 무독성 | 안전 기준을 준수한 소재 |
| 100% 항균 / 완벽 항균 | 항균 처리 |
| 평생 보장 | 품질 보증 지원 |
| 반영구적? | 장기간 |

---

## 2. 배선 — `app/api/generate/route.ts`

- import 3개 추가 (electronics 바로 아래)
- `generateCopyWithDeepSeek`에 `petGuide` / `fashionGuide` / `livingGuide` 삽입
- 최종 검수 분기 3-way → 6-way (`reviewPetCopy` / `reviewFashionCopy` / `reviewLivingCopy`)
- cosmetics / food / electronics 분기·정규식 **미변경**

---

## 3. 검증 (API 0)

`npx tsx scripts/222cha-pet-fashion-living-compliance-verify.ts` → **ALL PASS**

- pet 12 / fashion 7 / living 7 hit 케이스
- 중첩: pet 복합 문구, fashion `평생 무료 수선`→`평생 보증` 순서, living `반영구적으로` 잘림 없음 (`반장기간` 미발생)
- clean copy 과치환 없음
- `review*Copy` fixture OK
- 7카테고리 게이트 상호 배타 + electronics 회귀 OK

---

## 4. 완료 기준

- [x] 3개 compliance 모듈
- [x] generate route 6-way 배선
- [x] 검증 스크립트 + 리포트
- [x] tsc 0 · API 0
