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

`npx tsc --noEmit` 통과 후 보고.

---

## P0 — 다음 브리프 후보 (범위 작음, 회귀 위험 낮음)

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
| P1-1 | `반려동물` 전용 `TemplateCategory` + 급여/성분 중심 슬롯 (FOOD와 HOME 하이브리드) | §10.6 — 중기 후보 | 슬롯 순서·렌더러·프롬프트 전면 |
| P1-2 | 패션 사진 역할 힌트(착장/디테일/코디)를 `assignDistinctSectionImages` prefer에 연결 | 경쟁툴 컷 분류 vs 우리 편중 이슈 | 배정 회귀 |
| P1-3 | `review_highlight`를 “입력된 리뷰 요약이 있을 때만” 전 카테고리 선택 슬롯화 | CRO trust cascade | 가짜 후기 위험 — **입력 있을 때만** 전제 필수 |
| P1-4 | 모바일 sticky CTA (결과 미리보기) | 2026 PDP CRO | 마켓플레이스 HTML export와 별개 UX |

---

## P2 — 연구·실험 (프로바이더/정책)

| ID | 제안 | 비고 |
|----|------|------|
| P2-1 | 영상/짧은 모션 히어로 | 새 AI 프로바이더 필요 — 범위 밖 |
| P2-2 | HTML export 인터랙티브 컬러 스와치 | 마켓플레이스 script 제거 여부 미검증 (27차에서도 보류) |
| P2-3 | 3색 → 카테고리별 추가 토큰 | **비권장** — CHECKLIST·토큰과 충돌 |

---

## 명시적 비목표 (리서치해도 하지 않음)

- 후기·채팅·인증·QC 그리드 슬롯 신설
- 레퍼런스 브랜드 카피/슬로건 복제
- 히어로 밖 장식, 네이비 솔리드 풀폭 USP 밴드
- 승인 없는 `CATEGORY_SLOT_TEMPLATES` 순서 개편
