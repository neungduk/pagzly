# 176차 — 아이콘 시각 언어 통일 probe (전환 없음)

생성: 2026-09-14

## 요약

| 항목 | 결과 |
|------|------|
| 프로덕션 배선 | **미변경** (`getIconModel` / `modelForIconGroup` 그대로) |
| 프롬프트 | `concept-icons.ts`와 **동일 조립** (라벨 9개 × checklist/highlight/usage) |
| 성공 생성 | schnell **9/9**, v4-svg **9/9**, flux-dev **6/9**, stat용 v4 **0/1** |
| 이미지 API(대략) | **~36** (재시도 포함 카운트) · 성공 산출물 **24** |
| `npx tsc --noEmit` | **EXIT 0** |

---

## 비교표

### A — 기본 경로 (현재 checklist/highlight/usage = flux-schnell)

| 기준 | flux-schnell | recraft-v4-svg |
|------|--------------|----------------|
| 단가 | **$0.003** | **$0.08** |
| 9개 슬롯/페이지 가정 | **$0.027** | **$0.72** (**+$0.693**) |
| 실패율 (이번 런) | **0/9** | **0/9** |
| 평균 지연 | ~5.6s | ~15.6s (+순차 11s 간격) |
| 스타일 | 광택·그라데이션 **래스터 배지**, 슬롯마다 굵기·여백 편차, 가짜 글자 잔여 가능 | **플랫 벡터** 라인/채움, 배지 프레임·선 굵기가 서로 더 비슷 |
| 다이어그램(단색 실루엣)과 | **이질적** (사진풍 배지 vs 실루엣) | 벡터 계열로는 가깝지만, 여전히 **컬러 배지**라 다이어그램과 “한 세트”까지는 아님 |

### B — 프리미엄 경로 (현재 = flux-dev)

| 기준 | flux-dev | recraft-v4-svg |
|------|----------|----------------|
| 단가 | **$0.025** | **$0.08** |
| 9개 슬롯/페이지 | **$0.225** | **$0.72** (**+$0.495**) |
| 실패율 (이번 런) | **3/9 (33%)** — 원인: Replicate **429 throttle / 402 insufficient credit** (저크레딧 burst=1), 모델 품질 실패와 구분 | **0/9** (A에서 생성분 재사용) |
| 스타일 | schnell보다 디테일↑이나 여전히 래스터 배지 계열 | A와 동일 벡터 언어 |

### 동시성

- recraft 계열: 기존과 같이 **concurrency=1 + 배치 간격 11s** 유지해 호출 (143차 제약 재확인).

---

## 스크린샷

| 파일 | 내용 |
|------|------|
| `review/qa-screenshots/176cha-schnell-vs-v4svg-paired.png` | 동일 프롬프트 페어 (schnell \| v4-svg) |
| `176cha-fluxdev-vs-v4svg-paired.png` | 프리미엄 페어 (dev \| v4-svg) |
| `176cha-style-family-board.png` | schnell / v4-svg / 다이어그램 정적 / stat(v4 FAIL) |
| `176cha-flux-schnell-board.png` | schnell 9장 |
| `176cha-recraft-v4-svg-board.png` | v4-svg 9장 |
| `176cha-flux-dev-board.png` | flux-dev 9장(실패분 FAIL) |

원본 PNG: `review/176cha-icon-probe/`  
메타: `review/176cha-icon-style-probe.json`

---

## 측정만의 관찰 (전환 권고 아님)

1. **스타일 통일 후보로는 v4-svg가 schnell/dev보다 세트감이 큼** — 다만 174~175 다이어그램(단색 tint 실루엣)과 완전 동일 언어는 아님(배지+컬러 채움 vs 모노 실루엣).
2. **원가 충격이 큼** — 9슬롯 기준 기본 **~$0.03 → ~$0.72**. 전면 전환은 마진·선택적 롤아웃(142 패턴) 없이 비추.
3. **flux-dev 실패 3/9** — 프리미엄에서도 안정성 이슈 가능(이번 샘플).
4. 다음 라운드 후보: (a) checklist/highlight/usage만 **선별** v4-svg, (b) 프롬프트를 다이어그램에 가깝게(단색·배지 축소) A/B, (c) elevation 감사.

## 하지 않은 것

- 기본/프리미엄 아이콘 모델 **미전환**
- specTable / 타이포 / comparison-chart-guard / assign-section-images **미수정**
