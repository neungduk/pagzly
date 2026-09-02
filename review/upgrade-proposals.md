# 코드 변경 제안 목록 (29차 리서치)

생성: 2026-08-26  
근거: `review/reference-patterns.md` §10–§11  
규칙: **슬롯 신설·템플릿 구조 변경은 승인 전 구현 금지.** 여기 목록만 남기고, 항목별로 기존처럼 좁은 브리프 → Claude 재검증 → 커밋.

---

## 이번 라운드에 이미 구현한 것 (소규모·안전)

| ID | 내용 | 파일 | 이유 |
|----|------|------|------|
| R29-A | `FALLBACK_BY_CATEGORY`에 패션·식품·전자·생활·펫 폴백 추가 | `lib/concept-brief.ts` | 화장품만 상세 폴백이던 비대칭 해소 (§11.4) |
| R29-B | `buildSectionLengthGuide`에 전자·생활·펫 규율 블록 추가 + 패션 `size_table` 한 줄 | `lib/section-templates.ts` | 27차와 같은 “전 카테고리 길이 규율” 잔여 구멍 |
| R29-DOC | §3 템플릿 동기화, §10 전 카테고리, §11 횡단 리서치 | `review/reference-patterns.md` | 리서치 본문 |
| R30-A | `SOURCE_IMAGE_EXPIRED` + 무보정 조용한 폴백 제거 | generate-backdrop / photo-pipeline / draft | 30차 2번 |
| R30-B | `protected_until` 조기 보호 (업로드·승인·enhance + cleanup) | migration / CreateProductForm / protect API / cleanup edge | 30차 1번 승인 구현 |
| R30-C | enhance 후 원본 삭제 중단 + draft URL을 보정본으로 즉시 동기화 | enhance-image / photo-pipeline / draft | 재승인 404 근본 원인 |

`npx tsc --noEmit` 통과 후 보고.

---

## P0 — 구현 완료 (48차 Track 2-D)

| ID | 내용 | 파일 | 상태 |
|----|------|------|------|
| P0-1 | 패션 `size_table` note — 호칭만 쓰지 말고 실측·없으면 판매자 확인 | `lib/section-templates.ts` FASHION `size_table.note` | ✅ 29차+ |
| P0-2 | 식품 슬롯 — 원산지·알레르기·보관은 입력·고시 근거만 | `lib/food-compliance.ts` FOOD_SLOT_FACT_PROMPT + FOOD slot notes | ✅ 29차+ |
| P0-3 | 생성 로그 `category` + lengthGuide 헤더 | `app/api/generate/route.ts` | ✅ 29차+ |
| P0-4 | 패션 업로드 힌트 — 착장·디테일·코디 | `lib/image-roles.ts` getUploadRoleGuide | ✅ 36차+ |

---

## P0 — (이전) 다음 브리프 후보

_위 항목은 모두 구현 완료. 아래는 아카이브._

| ID | 제안 | 파일/위치 | 근거 | 구현 시 주의 |
|----|------|-----------|------|--------------|
| P0-1 | 패션 `size_table` note에 “호칭만 쓰지 말고, 입력 cm만 / 없으면 판매자 확인 필요” 문구 강화 | `lib/section-templates.ts` FASHION `size_table.note` | §10.3 반품 핵심 | 슬롯 추가 아님 |
| P0-2 | 식품 DeepSeek 슬롯 지시에 “원산지·알레르기·보관은 입력·고시 근거만” 한 블록 | `app/api/generate/route.ts` 또는 FOOD slot notes | §10.4 / 1분상세 식품 | `food-compliance`와 중복 최소화 |
| P0-3 | 생성 로그에 `category` + `buildSectionLengthGuide` 헤더명 한 줄 | `app/api/generate/route.ts` | QA 때 규율 적용 여부 확인 | 동작 변경 없음 |
| P0-4 | 업로드 UI 카피: 패션은 “착장·디테일·코디 컷을 섞어 올려 주세요” 힌트 | `CreateProductForm` FAQ/힌트 | GENCY 실패모드·§10.3 | UI 문구만 |

---

## P1 — 구조 제안 (승인 필요, 이번엔 구현 금지)

| ID | 제안 | 근거 | 리스크 |
|----|------|------|--------|
| P1-7 | **채팅형 편집 Phase 2** — 전체 페이지 단위 채팅(섹션 추가·순서 변경 지시) | 크리에이지 1단계 벤치마크 (48차) | 슬롯 신설·순서 변경 — 승인 필요 |
| P1-8 | **채팅형 편집 Phase 3** — 요소 단위 클릭 + 레퍼런스 이미지 채팅 첨부 | 크리에이지 3단계 + `lib/reference-analysis.ts` 연동 여지 | UI·API 범위 큼 |
| P1-9 | patch-section 토큰 과금 여부 | 46차 토큰 SSOT — completion만 과금 중 | 제품 결정 |
| P1-1 | `반려동물` 전용 `TemplateCategory` + 급여/성분 중심 슬롯 (FOOD와 HOME 하이브리드) | §10.6 — 중기 후보 | 슬롯 순서·렌더러·프롬프트 전면 |
| P1-2 | 패션 사진 역할 힌트(착장/디테일/코디)를 `assignDistinctSectionImages` prefer에 연결 | 경쟁툴 컷 분류 vs 우리 편중 이슈 | 배정 회귀 |
| P1-3 | `review_highlight`를 “입력된 리뷰 요약이 있을 때만” 전 카테고리 선택 슬롯화 | CRO trust cascade | 가짜 후기 위험 — **입력 있을 때만** 전제 필수 |
| P1-4 | 모바일 sticky CTA (결과 미리보기) | 2026 PDP CRO | 마켓플레이스 HTML export와 별개 UX |
| P1-5 | ~~원본 사진 보호 시점 앞당기기~~ → **R30-B로 구현됨** (`protected_until`) | 30차 | — |
| P1-6 | 히어로 `generateBackdrop` 실패와 개별 enhance/이펙트를 **분리**해 나머지 컷 보정은 살림 | 30차 “한 곳 실패=전체 폴백” | 파이프라인 구조 |

---

## 설계안 (구현 완료) — P1-5 / R30-B 원본 사진 조기 보호 · 30차

**채택:** 권장안 A — `product_images.protected_until`

| 단계 | 구현 |
|------|------|
| 마이그레이션 | `supabase/migrations/20260826163000_product_images_protected_until.sql` |
| 업로드 | `CreateProductForm` insert 시 `now()+24h` |
| 승인 직전 | `POST /api/protect-product-images` (draft finalize) |
| enhance | insert/update 시 보호 연장 |
| cleanup | `protected_until IS NULL OR < now()` 만 삭제 |

**프로덕션 배포 필수:** 코드만으로는 컬럼이 생기지 않음. 프로덕션 Supabase(`sblnth…`)에 마이그레이션 적용 + `cleanup-expired-images` 엣지 함수 재배포.
---

## P2 — 연구·실험 (프로바이더/정책)

| ID | 제안 | 비고 |
|----|------|------|
| P2-1 | 영상/짧은 모션 히어로 | 새 AI 프로바이더 필요 — 범위 밖 |
| P2-2 | HTML export 인터랙티브 컬러 스와치 | **48차 결론:** 스마트스토어·쿠팡 상세 HTML은 `<script>`·`<style>` 태그 차단(네이버 FAQ 4414). CSS-only `:checked`+radio는 **Pagzly 미리보기·자체 HTML 다운로드**에서 동작. 마켓 업로드용 export는 스타일 태그 제거 시 정적 그리드로 폴백 필요 — 별도 브리프. 구현: `ColorVariationInteractive`(미리보기) + `export-detail-html` radio 스와치 |
| P2-3 | 3색 → 카테고리별 추가 토큰 | **비권장** — CHECKLIST·토큰과 충돌 |

---

## 50차 — 실제 쇼핑몰 벤치마킹 아이디어 (범위 밖, P2)

| ID | 제안 | 근거 (올리브영·무신사) | 비고 |
|----|------|------------------------|------|
| P2-4 | 사진 핫스팟 클릭 → 연관 상품 카드 (크로스셀) | 무신사 상세 내 핫스팟 UI | Pagzly는 단일 상품 페이지 생성 툴 — 멀티 SKU 연결은 별도 스코프 |
| P2-5 | AI 가상 피팅 / AR 착용 아이콘 | 무신사 상세 상단 피팅 진입점 | Replicate·3D 파이프라인 추가 필요, 비용·법적 고지 검토 선행 |

---

## 명시적 비목표 (리서치해도 하지 않음)

- 후기·채팅·인증·QC 그리드 슬롯 신설
- 레퍼런스 브랜드 카피/슬로건 복제
- 히어로 밖 장식, 네이비 솔리드 풀폭 USP 밴드
- 승인 없는 `CATEGORY_SLOT_TEMPLATES` 순서 개편
