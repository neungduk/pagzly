# 177차 — 프리미엄 아이콘 recraft-v4-svg + 다이어그램 동일 언어

생성: 2026-09-14

## 요약

| 트랙 | 결과 |
|------|------|
| A 프리미엄 checklist/usage/highlight | **flux-dev → recraft-v4-svg** (비프리미엄 flux-schnell 유지) |
| B 단색 실루엣 + SVG tint | **적용** — 배지 프레임 제거 프롬프트, `normalize`→`tint(theme.accent)`→PNG |
| tint 가능 여부 | **가능** — recraft-v4-svg는 SVG 반환(143/174 확인). 래스터면 스킵+경고 |
| 폴백 | **유지** — 3회 실패 시 flux-schnell 1회 |
| 실 API 스모크 | **통과** (크레딧 충전 후) — A 3/3, B 6/6, 전부 v4-svg+tint (폴백 0) |
| 이미지 API 호출 | **9** 성공 (`$0.24` + `$0.48` = **$0.72**) |
| `npx tsc --noEmit` | **EXIT 0** |

---

## 트랙 A — 프리미엄 전환

### 변경
- `lib/concept-icons.ts` `modelForIconGroup`: premium checklist/usageSteps/highlightBox → `"recraft-v4-svg"`
- `lib/premium-mode.ts` 주석 동기화
- recraft 동시성 **1 + 11s** (기존 `iconConcurrency`) 유지
- 156차 폴백 유지

### 원가 (9슬롯 가정, `ICON_COST_USD_BY_MODEL`)

| | 단가 | ×9 |
|--|------|-----|
| 이전 premium (flux-dev) | $0.025 | **$0.225** |
| 이후 premium (v4-svg) | $0.08 | **$0.72** (**+$0.495**) |
| 비프리미엄 (schnell) | $0.003 | **$0.027** (미변경) |

요금표(`pagzly-pricing-cost-model-2026.md`)는 **미수정** — 원가 영향만 보고.

### 실패율 · live 스모크
- 176차 근거: flux-dev 샘플 3/9는 **429/402**(저크레딧), 모델 품질 실패 아님.
- 충전 직후 1차 실행은 전파 지연으로 초반 402 → Track B 중 크레딧 반영(5/6, 일부 schnell 폴백).
- **재실행(최종):** Track A **3/3**, Track B **6/6**, 전부 `recraft-v4-svg` + silhouette tint, **폴백 0**.

---

## 트랙 B — 다이어그램과 같은 언어

### 변경
- `recraft-v4-svg` 경로: **단색 실루엣** 프롬프트 (원형 배지/리본/그라데이션 금지)
- SVG면 `lib/monochrome-svg.ts`로 정규화 → `theme.accent` tint → sharp PNG
- `lib/monochrome-svg.ts` 신규 (174 정규화 로직 공용화; 174/175 스크립트 import 전환)

### tint
| | |
|--|--|
| 가능? | **예** (v4-svg → SVG) |
| 방식 | 생성 직후 서버 후처리 (매 생성마다 — 정적 재사용 아님) |
| 불가 시 | 래스터만 오면 tint 스킵 + warn 로그 |

### 스크린샷 (live after 반영)
| 파일 | 내용 |
|------|------|
| `177cha-badge-vs-silhouette-paired.png` | before=176 배지 v4-svg \| **after=실생성 실루엣+accent tint** (6쌍) |
| `177cha-silhouette-with-diagrams.png` | concept 실루엣 3 + diagram 정적 3 (같은 `#2F4858` tint) |
| `177cha-premium-smoke.png` | Track A TEST_MODE checklist/usage/highlight 각 1장 |

### 육안
- after는 배지·리본·다색 제거 → 단색 실루엣으로 세트감 확보.
- 다이어그램과 나란히 두면 **같은 accent·실루엣 언어**로 읽힘(concept 쪽이 네거티브 디테일이 조금 더 풍부한 정도).

---

## 변경 파일

- `lib/concept-icons.ts`
- `lib/premium-mode.ts`
- `lib/monochrome-svg.ts` *(new)*
- `scripts/174cha-generate-diagram-icons.ts` / `174cha-normalize-diagram-icons.ts` / `175cha-generate-diagram-icons.ts`
- `scripts/177cha-premium-silhouette-verify.ts` / `177cha-offline-boards.ts`

## 하지 않은 것

- 비프리미엄 모델 전환 없음
- 요금표 미수정
- specTable / 타이포 / comparison-chart-guard / assign-section-images 미수정
- 174~175 다이어그램 자산 재생성 없음
