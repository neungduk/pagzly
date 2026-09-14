# 144차 — $0.50 프리미엄 페이지 실측 보고

생성: 2026-09-08  
원칙: **비교·실측만**. 프로덕션 배선/기본값 미변경. `.env.local` 측정 후 원복.

## 핵심 결론

1. **127차 불일치 확정**: 라이브 `BACKDROP_PROVIDER=flux-kontext-pro`는 `BACKDROP_CANDIDATES`가 아니라 **`BRIA_BACKDROP_CANDIDATES`(기본 2)** 로 호출한다. 로그 `[replicate] CALL flux-kontext-pro x2`. beauty-showcase `photoCostBreakdown.backdrop=0.08`. → 원가 문서의 히어로 배경 **$0.04 앵커는 틀렸고, 실제는 $0.08**.
2. **`$0.45~0.55` 추정은 화장품 실 아이템 수 기준으로 빗나감**: 실제 DeepSeek 카피 기준 checklist 4 + spec 13 + banner 1에 v4-svg/flux-dev를 켜면 **아이콘만 $0.505**. 프리미엄 스택 합은 **≈$0.86** (목표 밴드 밖).
3. **프로덕션 env만으로 후보 4장 불가**: `getBriaBackdropCandidateCount()`가 `Math.min(3, …)`. `BRIA=4` → 실제 getter=3. 4장 실측은 스크립트 로컬 호출로 수행.

## 0. 배선·env

| 확인 | 결과 |
|------|------|
| `statInfographic` → `recraft-v3` | 유지 |
| `ILLUSTRATION_BANNER_MODEL` → `recraft-v3` | 유지 |
| `computeStudioCompositeLimit(8)=4` | 유지 (lib 미수정) |
| `ICON_MODEL` | `flux-schell` (미변경) |
| `.env.local` 원복 | **restored=true** |

### before / after (tracked keys)

```json
{
  "before": {
    "TEST_MODE": "true",
    "BACKDROP_PROVIDER": "flux-kontext-pro",
    "BACKDROP_CANDIDATES": "7",
    "BRIA_BACKDROP_CANDIDATES": "2",
    "ICON_MODEL": "flux-schell"
  },
  "after": {
    "TEST_MODE": "true",
    "BACKDROP_PROVIDER": "flux-kontext-pro",
    "BACKDROP_CANDIDATES": "7",
    "BRIA_BACKDROP_CANDIDATES": "2",
    "ICON_MODEL": "flux-schell"
  },
  "restored": true
}
```

## 1. A — 배경 후보

| 항목 | 실측 |
|------|------|
| 프로덕션 요청 횟수 | **x2** (`BRIA_BACKDROP_CANDIDATES=2`) |
| 세션 앵커 | backdrop=$0.08 |
| script-local n=4 | **$0.16** (4×$0.04) |
| env=4 → getter | **3** (코드 상한) |

스크린샷: `review/qa-screenshots/144cha-backdrop-candidates-2v4.png`  
육안: n=4가 조명/배경톤 선택폭이 넓음 (쿨 그레이 / 웜 베이지 등). `pickBestBackdrop` 자동 선택은 **현재 코드에 없음**(휴먼 픽 UI만).

## 2. B — 스튜디오 컴포지트 4→8

| | USD |
|--|-----|
| limit=4 (idx0–3) | **$0.085** |
| limit=8 (전체) | **$0.172** |
| 델타 | **+$0.087** |

스크린샷: `review/qa-screenshots/144cha-studio-composite-4v8.png` (idx4–7 RAW vs COMP)

## 3. C — AI 라이프스타일샷

| 경로 | 추정 단가 | 실측 단가 | 모델 |
|------|-----------|-----------|------|
| standard | $0.040 | **$0.040** | flux-kontext-pro |
| premium | $0.115 | **$0.104** | gemini-3-pro-image |

- 추정 vs 실측: standard **일치**, premium 실측이 추정보다 약 $0.01 낮음.
- `generateLifestyleShots()` 전체 경로(게이트/재시도)는 ImageRouter→Supabase cookies라 **Next request scope 밖 스크립트에서 실패**. 이번 실측은 provider 직접 호출(게이트 비용 미포함). 게이트 재시도는 풀 파이프라인 HTTP에서만 추가될 수 있음.

스크린샷: `review/qa-screenshots/144cha-lifestyle-shots-standard-vs-premium.png`

## 4. D — 라이프스타일 합성

| 케이스 | cost | 결과 |
|--------|------|------|
| 높이 없음 | **$0** | skip `missing-product-height-cm` |
| 높이 9cm | **$0.015** | `composited=false`, `safeguard-not-overlapping-grasp-region` (시도 비용은 청구 — Haiku placement 재시도) |

→ “상시 적용”해도 높이 없으면 $0; 있어도 게이트 실패 시 합성본 없이 비전 비용만 남을 수 있음(127차와 동일 계열).

## 5. E — recraft-v4-svg + flux-dev (실 아이템 수)

beauty-showcase 세션 실제 카피:

| 그룹 | 개수 | 모델 | 원가 |
|------|------|------|------|
| checklist | 4 | flux-dev $0.025 | $0.100 |
| usage_steps | 0 | — | $0 |
| spec_table | **13** | flux-dev $0.025 | **$0.325** |
| stat_infographic | 0 | — | $0 |
| illustration_banner | 1 | recraft-v4-svg $0.08 | $0.080 |
| **합** | | | **$0.505** |

**스펙 표 아이콘이 원가의 대부분.** 아이콘만으로도 $0.50 밴드를 채움 → “아이콘 업그레이드만으로 페이지 $0.45–0.55” 추정은 **스펙 row 수가 많은 화장품 실페이지에서 과소평가**.

## 6. F — 이펙트 1→3

| | USD |
|--|-----|
| 1장 | $0.003 |
| 3장 (스크립트 강제) | $0.009 |
| 프로덕션 live max | **2** (`maxConceptEffects`, env 없음) |

## 7. G — $0.50 조합 종합

컴포넌트 합(실측 파트; 단일 `/api/generate` 1회가 아님):

| 컴포넌트 | USD | 비고 |
|----------|-----|------|
| backdrop kontext×2 | 0.08 | 세션/127 앵커 (문서 갱신 필요) |
| (+ 후보 4장으로 확장 시) | +0.08 | script-local 실측 |
| studio limit8 | 0.172 | |
| lifestyle standard×1 | 0.040 | 상시 시 maxCount=2면 ×2 |
| lifestyle-composite 시도 | 0.015 | 이번 픽스처는 합성 실패 |
| icons v4-svg+flux-dev | **0.505** | 실 아이템 수 |
| effects×3 | 0.009 | |
| LLM 잔여(세션) | ~0.02 | |
| **합 (x2 backdrop)** | **≈$0.84** | 목표 0.45–0.55 **밖** |
| **합 (x4 backdrop)** | **≈$0.92** | |

스크린샷: `review/qa-screenshots/144cha-full-050-page.png`

### 상품성 육안 (한 줄)

배너/아이콘을 프리미엄 모델로 바꾸면 디테일은 올라가지만, **스펙 아이콘 13장을 flux-dev로 찍는 비용 대비 체감 이득은 작다**(작게 보이므로). 배경 후보 4장은 선택 폭이 체감된다. 스튜디오 4→8은 passthrough 컷이 정리되어 페이지 밀도가 균일해진다.

## 다음 라운드 권고 (미적용)

1. 원가 문서: 히어로 kontext **$0.08(×2)** 로 수정.
2. `$0.50` 목표면 **스펙 아이콘까지 flux-dev 전면은 비추천** — checklist/usage만 flux-dev, banner/stat만 recraft, spec은 schnell 유지가 마진에 맞음.
3. 후보 4장 쓰려면 `getBriaBackdropCandidateCount` 상한(3) 코드 변경이 필요(이번엔 lib 미수정).
4. 라이프스타일 샷 상시: standard $0.04/장으로 추정≈실측 일치 — 게이트 비용은 별도 E2E 필요.

## 산출물

- `review/144cha-cost-breakdown.json`
- `review/144cha-report.md` (본 파일)
- `review/qa-screenshots/144cha-*.png`
- `scripts/144cha-premium-050-probe.ts`

## tsc

`npx tsc --noEmit` → **EXIT_CODE=0**
