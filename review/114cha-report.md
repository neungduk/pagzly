# 114차 — 카피에 맞는 사진 배정

생성: 2026-09-04  
전제: 새 Vision/Replicate 호출 없음. `TEST_MODE=true`.

## 완료 체크리스트

- [x] Vision 프롬프트에 `tags` 스키마 확장 (기존 `analyzeImagesWithClaude`만)
- [x] `parseVisionTags` + `expandVisionTagsByIndex` 방어적 파싱
- [x] `lib/copy-image-match.ts` — `scoreImageForCopy` / `sectionCopyText`
- [x] `allocatePreferQueue` — detail 후보 안에서만 타이브레이커; 점수≤0이면 기존 순서
- [x] role 불일치 이미지 끌어오기 금지
- [x] 파이프라인: `generateCopyWithDeepSeek` → `assignDistinctSectionImages` (카피 선생성 확인)
- [x] tags 없으면 점수 0 → 기존 DETAIL_SLOT_PRIORITY 폴백 (단위 스모크)
- [x] `114cha-copy-match-smoke` PASS + `tsc --noEmit`

## 파이프라인 순서

route.ts: Vision 분석 ∥ 카피 생성 후, **카피가 채워진 sections**에 assign.  
heading/body 기반 매칭 가능.

## 검증

```bash
npx tsx scripts/114cha-copy-match-smoke.ts
# tags 없는 실데이터 회귀(네트워크): npx tsx scripts/105cha-replay-assign.ts
```

## 비용

추가 API 호출 **$0**.
