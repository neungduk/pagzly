# 142차 — recraft-v3 선별 적용 보고

생성: 2026-09-08  
범위: `illustration_banner` + `stat_infographic`만 recraft-v3, 나머지 아이콘 그룹은 `ICON_MODEL`(기본 flux-schnell)

## 코드 변경 요약

| 파일 | 내용 |
|------|------|
| `lib/concept-illustration.ts` | `ILLUSTRATION_BANNER_MODEL = "recraft-v3"` 고정 (ICON_MODEL 무시). 142차 주석 |
| `lib/concept-icons.ts` | `generateSingleConceptIcon(..., model)` 파라미터화. `statInfographic`→recraft-v3, 나머지→`getIconModel()`. 모델별 `runInBatches` 분리 (recraft 동시성1+11s / schnell 동시성6) |
| `lib/concept-icons.ts` | `RECRAFT_STYLE_DEFAULT` → `digital_illustration/hand_drawn_outline` |
| `.env.local` | `ICON_MODEL=flux-schell` **미변경** (전역 기본 전환 없음) |

## 로그 검증 (모델 분기)

```
[concept-icons] ICON_MODEL=flux-schnell … | 142 selective: statInfographic=recraft-v3
[concept-icons] batch model=flux-schnell n=3 concurrency=6
[concept-icons] model=flux-schnell …   ← checklist / usage_steps / spec_table
[concept-icons] batch model=recraft-v3 n=1 concurrency=1
[concept-icons] model=recraft-v3 …     ← stat_infographic
[cost] generateConceptIcons (4/4 icons): $0.0490 byModel={"flux-schnell":0.009,"recraft-v3":0.04}
[concept-illustration] TEST_MODE — recraft-v3 일러스트 1장만 생성 (142 selective)
[cost] generateIllustrationBanner (recraft-v3): $0.0400
```

그룹별 기대치와 **일치**.

## 실측 원가 vs 추정

TEST_MODE 화장품 1건 (아이콘 타입당 1장 + 배너 1장 = 5장):

| 항목 | 수량 | 단가 | 실측 |
|------|------|------|------|
| checklist / usage / spec (flux-schnell) | 3 | $0.003 | $0.009 |
| stat_infographic (recraft-v3) | 1 | $0.04 | $0.04 |
| illustration_banner (recraft-v3) | 1 | $0.04 | $0.04 |
| **합계** | 5 | — | **$0.0890** |

| 비교 | 값 |
|------|-----|
| 동일 5장 전부 flux-schnell 가정 | $0.015 |
| **선별 적용 델타 (실측)** | **+$0.074** |
| 문서 추정 델타 (`pagzly-recraft-cost-impact-long` / 브리프) | ~$0.07~0.15 |
| 판정 | **추정 구간 안** (하단에 가깝게 일치). TEST_MODE라 stat 1장·배너 1장만이라 상단($0.15)보다 낮음 — 실서비스에서 stat metrics가 많으면 델타가 커질 수 있음 |

전면 전환(아이콘+배너 전부 recraft) 대비: 이번 스모크 기준 recraft 2장만 → 전면 5×$0.04=$0.20 대비 약 1/2 이하 원가.

## 가짜 텍스트 회귀 (육안)

style 기본값 `digital_illustration/hand_drawn_outline` + no-typography clause:

| 자산 | 가짜/깨진 글자 |
|------|----------------|
| `illustration_banner` (recraft) | **0** |
| `stat_infographic` (recraft) | **0** |

참고: flux-schnell 쪽 usage/spec 배지에 유사 글리프가 보일 수 있으나 이번 선별 적용 범위 밖(141차 대상은 recraft).

## 산출물

- `review/qa-screenshots/142cha-selective-recraft-full.png` — 배너·체크리스트·stat 클러스터 포함 미리보기
- `review/qa-screenshots/142cha-selective-recraft-board.png` — 5장 모델 라벨 보드
- `review/142cha-*.png` — 개별 자산
- `review/142cha-console.txt` — 생성 로그
- `scripts/142cha-selective-recraft.ts` — 재현 스크립트 (`CAPTURE_ONLY=1`로 재캡처 가능)

## tsc

`npx tsc --noEmit` → **EXIT_CODE=0**

## 완료 체크리스트

- [x] illustration_banner → recraft-v3 고정
- [x] statInfographic만 recraft-v3, 나머지 3그룹 getIconModel()
- [x] 모델별 배치 분리 (recraft 1+11s / schnell 6)
- [x] RECRAFT_STYLE_DEFAULT → hand_drawn_outline
- [x] TEST_MODE 생성 + 로그 모델 확인 + 스크린샷
- [x] 실측 vs 추정 원가 표
- [x] 가짜 텍스트 회귀 (banner + stat = 0)
- [x] tsc --noEmit EXIT_CODE=0
- [x] ICON_MODEL env 미변경 (`flux-schell`)
