# 218차 — 211차 매칭 3축 보정 강도 보강

생성: 2026-09-17 · **유료 API 0건** · 유닛 테스트만 검증

## 한줄 결론

`matchCutoutWhiteBalance` / `matchCutoutGrain` 상수만 상향. 제안값으로는 극단 색역 축소율이 **24.9%**(목표 ≥30%)에 못 미쳐 WB 상수를 한 단계 더 올렸고, 회귀(오버슈트)·그레인·211 기존 검증 **전부 pass**.

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/photo-composite.ts` | `matchCutoutWhiteBalance`·`matchCutoutGrain` **상수·주석만** |
| `scripts/211cha-lifestyle-matching-verify.ts` | grain alpha 공식/assert를 0.03~0.07에 맞춤 |
| `scripts/218cha-matching-intensity-verify.ts` | **신규** — 극단 색역 / 회귀 / 그레인 |

손대지 않음: `matchCutoutSharpness`, `detect-held-object-placement.ts`, `lifestyle-product-composite.ts`.

### diff 요약 (`photo-composite.ts`)

- WB 주석에 `218차 — 매칭 강도 보강…` 1줄 추가
- `colorMix` / `lumMix` / `contrastMix` / `clampScale` / `clampContrast` 숫자만 변경
- grain 주석 갱신 + `alpha = 0.03 + t * 0.04` (skipThreshold 2.2 유지)

---

## 최종 적용 상수

| 상수 | 변경 전 | 브리프 제안 | **최종 적용** |
|------|---------|-------------|---------------|
| colorMix | 0.22 | 0.34 | **0.38** |
| lumMix | 0.14 | 0.20 | **0.24** |
| contrastMix | 0.16 | 0.24 | **0.28** |
| clampScale | [0.82, 1.18] | [0.70, 1.32] | **[0.65, 1.40]** |
| clampContrast | [0.88, 1.15] | [0.80, 1.25] | **[0.75, 1.30]** |
| grain alpha | 0.02~0.05 | 0.03~0.07 | **0.03~0.07** (제안 그대로) |
| grain skipThreshold | 2.2 | (유지) | **2.2** |

### 왜 제안값과 다른가

제안 WB 상수로 1차 실행 시 극단 색역 케이스:

```
dist before=150.04 legacy=97.24 prod=73.05 reduction=24.9%  → FAIL (≥30% 필요)
```

회귀는 통과. 브리프 지침(“실패 시 상수 조정 후 재검증, 최종값을 보고”)에 따라 **WB만** 상향해 재검증 → reduction **35.3%** pass. 그레인 제안값은 그대로.

---

## 211cha-lifestyle-matching-verify.ts 전체 로그

```
ok: grain: smooth scene returns identical cutout
ok: sharpness: smooth scene returns identical cutout
ok: WB on smooth gradient: returns valid opaque cutout
ok: WB toward blue scene (B/R before=1.000, after=1.646)
ok: rough grain >= skipThreshold (got 3.528)
ok: grain: rough scene modifies cutout
ok: grain alpha in range (alpha=0.039)
ok: pasteCutoutOnScene returns png
ok: output size matches scene (320x320)
ok: no canvas overflow vs scene
API generate: 0
VERIFY:0
```

---

## 218 신규 테스트 (`scripts/218cha-matching-intensity-verify.ts`)

### 실행 로그

```
[218] matching intensity verify — paid API: 0
[218] extreme WB dist before=150.04 legacy=97.24 prod=62.88 reduction=35.3%
ok: legacy WB reduces distance (97.24 < 150.04)
ok: prod WB closer than legacy (62.88 < 97.24)
ok: prod reduces remaining distance vs legacy by ≥30% (got 35.3%)
[218] regression means before=(210.0,200.0,185.0) after=(213.0,205.0,192.0) target=(214.1,207.6,198.1)
ok: no channel overshoot (none)
ok: similar-color WB does not increase distance (6.70 vs 15.66)
ok: rough grain >= skipThreshold (got 3.528)
ok: grain modifies cutout on rough backdrop
[218] grain alpha=0.0389 (t=0.221, grain=3.528)
ok: grain alpha in 0.03~0.07 (got 0.0389)
API generate: 0
VERIFY:0
```

### 실측 수치

| 케이스 | 수치 |
|--------|------|
| 극단 — 보정 전 거리 | 150.04 |
| 극단 — legacy(구 상수) 거리 | 97.24 |
| 극단 — prod(218 최종) 거리 | 62.88 |
| 극단 — legacy 대비 추가 축소율 | **35.3%** (≥30%) |
| 회귀 — before→after→target RGB | (210,200,185)→(213,205,192) vs (214.1,207.6,198.1) |
| 회귀 — 채널 오버슈트 | **없음** |
| 회귀 — 거리 | 15.66 → 6.70 (감소) |
| 그레인 alpha | **0.0389** ∈ [0.03, 0.07] |

### 테스트 방식 요지

- 극단: 어두운 중립 배경 `(40,40,45)` + 파랑/주황 그라디언트 컷아웃. 같은 이미지에 **LEGACY_MIXES**로 한 번, 프로덕션 `matchCutoutWhiteBalance`로 한 번 → 배경 코너 평균까지 RGB 유클리드 거리 비교.
- 회귀: warm smooth gradient + soft beige 컷아웃. 채널별 target 역전(±4) 금지.
- 그레인: 기존 rough feTurbulence 배경, `0.03 + t*0.04` 범위 assert.

---

## 유료 API 호출

**0건** — Replicate / Claude Vision / DeepSeek 미호출. 순수 함수 + sharp 로컬만.

---

## 이번 라운드가 다루지 않는 것

- `matchCutoutSharpness`
- unreliable placement 위치/스케일
- `minGraspOverlapFraction` 세이프가드
- 216 electronics 페어 유료 육안 재검증 (별도 허가 필요)
