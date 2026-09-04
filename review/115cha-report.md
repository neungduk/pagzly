# 115차 — 빈손 씬 생성 실패 게이팅

생성: 2026-09-04  
전제: 112차 실측(이중 병). `TEST_MODE=true` 유지. **유료 재검증은 승인 대기.**

## 조사 — 기존 손 검출 재사용 여부

`detectHandPlacementForProduct` / `detectHandPlacementWithGraspRetry`는 **배치 좌표 제안**만 함.  
프롬프트 전제: 「이미지 1: 아직 상품 없음」. `gripSpaceVisible`은 log-only.  
→ **물체 유무 판정에 재사용 불가.** 별도 게이트 구현.

## 구현

| 항목 | 내용 |
|------|------|
| (a) 게이트 | `lib/empty-scene-gate.ts` — Haiku Vision `heldObjectVisible` 1문. Vision 실패 시 production **fail-closed(drop)**. 휴리스틱은 단위·TEST 보조 |
| 배선 | `generate-lifestyle-shots` — 합성 전 `ensureCleanEmptyScene`: occupied → 프롬프트 강화 **1회** 재생성 → 또 occupied면 **컷 폐기** |
| 로그 | `[empty-scene-gate] result=<clean\|already-occupied> retried=<bool> action=<composite\|retry\|drop>` |
| (b) 프롬프트 | `emptyHandCore` + `KONTEXT_EMPTY_HAND_SCENE_LOCK` 부정문 강화 |
| (c) 안 2 | **미구현** |

## 무비용 검증

- `115cha-empty-scene-gate-smoke` PASS (decide / 합성 픽스처 / 프롬프트 / 112 픽스처 Vision 시뮬)
- `111cha-physical-scale-smoke` PASS
- `npx tsc --noEmit` 0건

## 저비용 유료 재검증 결과 (승인 후 실행)

### `--execute` (게이트 포함, 1회)

| 항목 | 결과 |
|------|------|
| Kontext | timeout → **Gemini fallback** 씬 생성 |
| 게이트 | **`result=clean retried=false action=composite`** (`vision-empty`, $0.0015) |
| 합성 | 실패 — data URL을 png로 잘못 표기(실제 JPEG). Vision 400 |
| billed | **$0.1056** |
| empty 씬 | `review/112cha-lifestyle-empty-scene.png` — **손만 있고 병 없음** (게이트 판정 맞음) |

### 후속 수정 + `--composite-only` (같은 clean 씬)

- `lifestyle-product-composite` / 112 스크립트: magic bytes로 media type sniff
- 합성 결과: **`safeguard-not-overlapping-grasp-region`** → `requirePixelPaste`로 컷 폐기 ($0.015)
- 원인: 씬이 빈손이긴 하나 **펼친 손바닥(resting)** 이라 grasp 틈이 약함. 점유 게이트와는 별개(포즈 품질).

### 115 게이트 판정

- **성공**: 이중 병 원인(씬에 이미 병)은 이번 컷에서 재발하지 않음. Vision이 clean을 맞게 냄.
- **잔여**: 빈손이라도 “쥐는 제스처”가 약하면 111 합성 게이트가 drop — 의도된 fail-closed.
- 안 2: 여전히 미구현.

### 누적 비용 (이번 승인 구간)

| | |
|--|--|
| execute | $0.1056 |
| composite-only | $0.0150 |
| **합계** | **~$0.12** |

`TEST_MODE` restore → true.
