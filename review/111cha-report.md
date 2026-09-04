# 111차 — AI 사용샷 픽셀 합성 전환

생성: 2026-09-04  
전제: `TEST_MODE=true`, **유료 검증은 사용자 합의 후**. 업로드 인물컷 합성 경로는 변경 없음.

## 채택안 (a)

**안 1 — 빈손 지시** (`PRODUCT_LIFESTYLE_EMPTY_SCENE`).  
근거: 기존 paste·grasp 파이프라인을 그대로 쓸 수 있고, 플레이스홀더 교체(안 2)보다 occlusion 처리가 단순함. 유료 1회 검증으로 빈손 생성 품질을 확인한 뒤 필요 시 안 2로 전환 가능.

## 완료 체크리스트

- [x] (a) 빈손 인물 씬 프롬프트 + Kontext 전용 lock (제품 보존 lock 제외)
- [x] (b) `detectHandPlacementWithGraspRetry` 재사용, `LIFESTYLE_GRASP_ENSEMBLE_ENABLED` 기본 off 유지
- [x] (c) `lib/lifestyle-physical-scale.ts` — `ADULT_HAND_WIDTH_CM=8.5`, 단위 테스트
- [x] 치수 파싱 실패 / 프레임 80% 초과 시 컷 폐기 (`requirePixelPaste`)
- [x] (d) `compositeProductOnLifestylePhoto` 재사용 + 물리 스케일 override
- [x] 배지·고지·옵트인 문구: "연출 배경·인물은 AI" / 제품은 원본 합성
- [x] 103차 스케일 프롬프트 문장 제거 (`buildScaleHint` 삭제)
- [x] 무비용 검증 PASS (`111cha-physical-scale-smoke`, `105cha-lifestyle-prompt-smoke`)
- [ ] 유료 검증 — **사용자 합의 후**

## 옵트인

브리프 §4: 제품이 진짜가 되어도 인물·배경은 AI이므로 **옵트인 기본 off 유지**.  
기본 on으로 바꿀지는 프로와 상의.

## 핵심 배선

`generateLifestyleShots` → 빈손 씬 → (높이 cm 필수) → pixel paste → 실패 시 drop (nano-banana 폴백 금지)
