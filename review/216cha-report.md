# 216차 — QA 세이프가드 우회로 211 매칭 3축 최종 검증

생성: 2026-09-17 · 유료 **정확히 1건** · QA 플래그 임시 추가 후 **완전 되돌림**

## 한줄 결론

`qaBypassGraspSafeguard: true`로 **`pasteCutoutOnScene`이 실제로 실행**됐고, `method=pixel-paste`로 성공했습니다 (nano-banana 미사용).  
다만 육안상 **화이트밸런스·선명도·그레인이 배경에 자연스럽게 녹았다**고 보기 어렵고, 컷아웃이 손 위·기존 케이스 위에 **떠 보이는** 합성입니다. 211 매칭 함수는 호출 경로에 들어갔으나, 이 페어에서는 효과가 충분하지 않아 보입니다.

---

## 코드 변경 → 되돌림

| 항목 | 내용 |
|------|------|
| 변경 파일 | `lib/lifestyle-product-composite.ts`만 (프로덕션 `app/api/generate` 미연결) |
| 변경 요약 | 선택 파라미터 `qaBypassGraspSafeguard?: boolean` 추가. `true`이고 `placement` 있으면 `reliable===false`여도 paste 진행. 미지정/`false`면 기존과 동일 |
| diff 보관 | **`review/216cha-live/qa-flag.diff`** (216 전용 hunk만) |
| 되돌림 | QA 분기·파라미터 **완전 제거 확인** (`qaBypassGraspSafeguard` / `allowPaste` grep 0건) |
| 검증 스크립트 | 실행 후 삭제 (산출물에 미포함) |

### 검증 전 상태로의 복귀

- 216이 넣은 QA 플래그: **없음** ✓  
- 워킹트리에 남는 `lib/lifestyle-product-composite.ts` diff는 **211차 매칭 3축 배선만** (216 이전부터 있던 미커밋 변경). 216이 만든 것이 아니며, 이번 검증 대상 파이프라인이라 **유지**.  
- `app/api/generate/route.ts`의 기존 수정분도 216에서 건드리지 않음.

---

## 1건 실행

| | |
|--|--|
| 상품 | `02-pexels-33936400.jpeg` ← `scripts/test-assets/전자제품/` |
| 라이프스타일 | `01-pexels-35599938.jpeg` ← `scripts/test-assets/전자기기-액세서리/` (215 electronics와 동일) |
| `TEST_MODE` | `false` |
| 플래그 | `qaBypassGraspSafeguard: true` |
| method | **`pixel-paste`** |
| grasp-refine | 미적용 (`pixel-paste`만 — grasp overlap이 refine 매칭에도 부족했던 것으로 보임) |

### grasp 재시도 로그

```
[hand-placement-retry] ensembleEnabled=false
[cost] claude/handPlacementForProduct: $0.0050
[hand-placement] confidence=high hands=true grip=true handRegions=1 graspRegions=1
  reliable=false reject=not-overlapping-grasp-region
  box=(35.0,40.0,25.0x28.0) rot=15.0
[hand-placement-retry] attempt=1/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.257

[cost] claude/handPlacementForProduct: $0.0050
[hand-placement] confidence=high … reject=not-overlapping-grasp-region
[hand-placement-retry] attempt=2/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.220

[cost] claude/handPlacementForProduct: $0.0050
[hand-placement] confidence=high … reject=not-overlapping-grasp-region
[hand-placement-retry] attempt=3/3 reliable=false reject=not-overlapping-grasp-region graspOverlap=0.134

[lifestyle-composite] QA bypass grasp safeguard — paste with unreliable placement reject=not-overlapping-grasp-region
[lifestyle-composite] stage=direct-paste success method=pixel-paste
[cost] lifestyle-composite (pixel-paste): $0.0154
```

※ 세이프가드는 여전히 reject, 우회로 paste 진입 성공. 2건째 없음.

### API 비용

| 항목 | 금액 |
|------|------|
| Vision handPlacement ×3 | $0.0050 × 3 = $0.0150 |
| lifestyle-composite 반환 cost (rembg+Vision 누적) | **$0.015365** |
| nano-banana | $0 (미호출) |
| 실행 건수 | **1 / 1** |

---

## 결과 이미지 (비교용)

```
review/216cha-live/electronics-lifestyle.jpeg   ← 원본 LS (검은 오픈 케이스 쥐기)
review/216cha-live/electronics-product.jpeg     ← 상품 (블루/오렌지 조명 스튜디오 이어버드 세트)
review/216cha-live/electronics-composite.png    ← pixel-paste 결과
review/216cha-live/summary.json
review/216cha-live/run-log.txt
review/216cha-live/qa-flag.diff
```

---

## 육안 1차 소견 (참고용)

### 배치

- Vision box가 손바닥 중앙에 컬러풀한 **케이스+이어버드 세트 컷아웃 전체**를 올림.
- 원본 LS의 **검은 오픈 케이스가 그대로 비침** — 교체가 아니라 위에 덮어쓴 느낌. 손가락 사이로 끼워진 그립이 아님.
- 접촉 그림자가 약해 **붕 떠 보임**.

### 211 매칭 3축

| 축 | 소견 |
|----|------|
| 화이트밸런스 | 상품의 강한 블루/오렌지 스튜디오 조명이 LS의 어둡고 중립적인 손·가방 조명과 **대비가 큼**. 매칭이 호출됐다면 강도 부족하거나, 이 상품 컷의 색역이 너무 극단적. |
| 선명도 | 컷아웃 가장자리가 LS 손·케이스 디테일 대비 **다소 부드럽거나 이질적**. |
| 그레인 | LS 암부에 보이는 디지털 그레인이 컷아웃 표면에는 **거의 없어** 스튜디오 매끈함이 남음. |

### 종합

- **경로 검증 성공**: 우회 → `pasteCutoutOnScene` → `pixel-paste` (211 매칭 함수 배선 경로 실사 진입 확인).
- **품질 검증**: 이 1페어 기준으로는 **아직 자연스럽지 않음**. 원인 후보 — (1) 매칭 강도 부족, (2) 상품이 다중 오브젝트 플로팅 스튜디오컷이라 컷아웃 형태 자체가 쥐기 장면에 안 맞음, (3) unreliable placement로 위치/스케일이 어긋남, (4) 원본 held object를 가리지 않음.
- grasp-refine 미적용이라 손가락 occlusion도 없음.

---

## 이후 원칙 복귀

- 사용자 허가 없이 생성 API **0건**
- 관찰만 / 코드 변경 기본 금지
- 216 QA 우회 플래그는 **파이프라인에 남아 있지 않음**
