# 105차 — 무비용 작업 통합 (102~104 실행)

생성: 2026-09-04  
전제: `TEST_MODE=true` 유지. Replicate/유료 생성 미실행. 최종 1회 유료 검증은 사용자 지시 대기.

검증 상품: `a4e33e41-2348-40b6-b6b8-2536ce17ac3e`

## 1번 — Vision 역할 배선 (102차) — 근본 원인

| 가설 | 판정 |
|------|------|
| draft→final 경로 유실 | **아님** — 전달 경로는 정상. draft에서 roles가 비면 final도 기본값 |
| confidence 0.5 탈락 | **아님** |
| Vision JSON에서 roles 유실 | **주원인** — analysis-first + `max_tokens:2000` 절단 → `roles=[]` |

이미 102차에서 수정됨(roles-first, 4096, salvage, retry). 105차는 `102cha-vision-roles-smoke` 회귀 PASS로 확인.

## 항목별 수정 요약

| # | 항목 | 핵심 파일 | diff 요약 |
|---|------|-----------|-----------|
| 1 | Vision roles | `parse-image-analysis-response.ts`, `analyzeImagesWithClaude`, `generation-pipeline-summary` | 102차 유지·스모크 OK |
| 2 | before/after gallery | `app/api/generate/route.ts` | gallery 강제 배정 제거, append-only 로그 |
| 3 | circle 인덱스 | `lib/apply-ingredient-circle-pair.ts` | solo는 ingredient와 **다른** 인덱스 |
| 4 | prefer 큐 | `lib/assign-section-images.ts` | `allocatePreferQueue`, package 선점, text_only, reserved 가로채기 방지 |
| 5 | productSizeHint | form → pipeline → planner → kontext `aspect_ratio` | 스케일 문장 주입, 원본 `uploaded[0]` 참조, dry-run |
| 6 | aHash dedup | `lib/image-ahash.ts` + assign `imageHashes` | 인접 유사도 페널티, generate 경로에서 해시 계산 |
| 7 | lifestyle gate | `lib/lifestyle-shot-quality-gate.ts` + `generate-lifestyle-shots.ts` | 생성 후 게이트·1회 재시도 (배선만; 생성은 TEST_MODE에서 skip) |
| 8 | 역할 부족 | `lib/role-shortage.ts` + route notices | 경고 + `textOnlySlots` → assign |

## replay 결과 (수정 후)

`npx tsx scripts/105cha-replay-assign.ts`

| 지표 | before (DB) | after (replay) |
|------|-------------|----------------|
| unique | 16 | 14~15 |
| maxRepeat | 2 | 2 |
| adjacentDup image_text | 0 | 0 |
| prefer 미충족 | ingredient / texture / packaging | **[] (0)** |
| packaging_design | other(fx) | **package @3** |
| ingredient_highlight | other | **detail @1** |
| texture_feel | compare-before | **text_only** (detail 1장 부족 경고) |
| gallery | lifestyle-ai 등 (before/after 강제 없음) | 동일 패턴 유지 |
| circle-solo | 있음, ingredient와 다른 idx | idx 12 등 alternate |

## buildHumanShots 프롬프트 덤프 (1건)

```
The product is 35mL, 높이 약 9cm. Render it at true handheld scale — the bottle or package must fit entirely within one adult palm...
aspect_ratio: "3:4" (match_input_image 아님)
```

`npx tsx scripts/105cha-lifestyle-prompt-smoke.ts` PASS.

## 게이트 스모크 (기존 lifestyle-ai URL)

| file | pass | centerSimilarity |
|------|------|------------------|
| lifestyle-ai-1 | true | 0.641 |
| lifestyle-ai-2 | true | 0.655 |

## 검증 명령

- `npx tsc --noEmit` → **0건**
- `99cha-assign-images-smoke` → PASS
- `verify-54cha-quick-points` → 6/6 PASS
- `105cha-ahash-matrix` / `role-shortage` / `lifestyle-prompt` / `replay` / `lifestyle-gate` → OK

## 9번 — AI 사용샷 고지 (선택 3: 옵트인 + 배지)

- 폼: `enableAiLifestyleShots` 체크박스 기본 **끔**. 안내 문구 포함.
- 파이프라인/API: 옵트인 아니면 lifestyle-ai 생성 스킵 (인물 사진 합성은 별개).
- 결과: `SectionImage`가 `lifestyle-ai` URL에 **AI 연출 컷** 배지 자동 표시.
- `ai_disclosure`: 사용샷이 풀에 있으면 형태·크기·라벨 확인 문구 추가.

## 하지 않은 것

- 상품 생성 / Replicate 호출
- 픽셀 합성 전환, 카피 임베딩 선택
- 과거 DB 소급 수정, BACKDROP_CANDIDATES 변경

## 최종 유료 프로토콜

사용자가 지시할 때만: `TEST_MODE=false` + 브리프 §6 입력·체크리스트.
