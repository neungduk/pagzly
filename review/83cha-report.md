# 83차 — 이중 컷아웃 아티팩트 원인 확인 + 방지

생성: 2026-09-02

## 요약

82차 QA에서 보고된 **이중 컷아웃(손 근처 큰 제품 + 작은 duplicate floating)** 문제를 실루엣 원본 저장으로 진단했습니다. **가설(실루엣에 물체 2개)** 은 이번 run에서는 육안·Vision 모두 **주로 1개**였고, 실제 원인은 **nano-banana 실루엣 잔상 + 진짜 컷아웃 paste가 겹쳐 보이는 구조**에 가깝습니다. 83차 수정(프롬프트 강화, Vision duplicate 필드, paste 전 bbox 마스킹)으로 **부분 개선**됐으나 **duplicate 완전 제거는 미달**입니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | SILHOUETTE exactly-one 제약, `maskSilhouetteObjectRegions`, `generateLifestyleSilhouetteScene`, duplicate 시 fallback |
| `lib/detect-held-object-placement.ts` | `hasDuplicateArtifact`, `extraProductRegions`, duplicate 시 paste 허용(위치 알 때) |
| `scripts/83cha-duplicate-artifact-qa.ts` | legacy/현행 실루엣 저장 + before/after QA (신규) |

## 1단계 진단 — 실루엣 원본

| 케이스 | 실루엣 파일 | 육안 물체 수 | Vision duplicate | Vision extras |
|--------|-------------|-------------|------------------|---------------|
| 세럼 | `83cha-labeled-serum-hands-silhouette-legacy-raw.png` | **1개** (손에 든 병). 좌측 faint blur 잔상 가능 | false | 0 |
| 튜브 | `83cha-labeled-jar-hands-silhouette-legacy-raw.png` | **1개** | false | 0 |

**결론:** 원본 상품 사진(단일 컷) 가설은 배제됨(82차와 동일). 실루엣 PNG 자체에 **뚜렷한 2개 물체**가 항상 있는 것은 아님. 그러나 **최종 합성**에서는 AI가 그린 형태(실루엣)가 **Vision 주 bbox 밖**에 남고, 그 위에 **진짜 컷아웃**이 paste되면서 **2개로 보이는** 패턴이 재현됨.

## 2단계 수정

1. **SILHOUETTE_PROMPT** — exactly ONE held object 제약 추가
2. **Vision** — `hasDuplicateArtifact` + `extraProductRegions[]` (extra 있으면 마스킹 후 paste, unlocated duplicate만 fallback)
3. **pasteCutoutOnScene** — paste 전 주 bbox(+ extra) 영역 blur 마스킹

## 3단계 재QA 결과

| 케이스 | method | duplicate→fallback | 82차 대비 |
|--------|--------|---------------------|-----------|
| 세럼 | pixel-paste | 0회 | 작은 duplicate **여전히 존재**, 중앙 blur patch 부작용 |
| 튜브 | pixel-paste | 0회 | 작은 튜브 duplicate **여전히 존재** |

- **안전장치(fallback) 발동:** 0건 (Vision duplicate=false, extras=0)
- **총 QA 비용:** ~$0.50 (진단+재QA 3회 run)

### 스크린샷

| 파일 | 설명 |
|------|------|
| `*-silhouette-legacy-raw.png` | 진단용 legacy 실루엣 (paste 이전) |
| `*-silhouette-raw.png` | 83차 실루엣 |
| `*-before-after.png` | 82차 vs 83차 전체 비교 |
| `*-output.png` | 83차 최종 |

## 솔직한 결론

| 항목 | 상태 |
|------|------|
| 원인 특정 | ✅ 실루엣 잔상 + paste 겹침 (2개 실루엣 가설은 이번 run에서 비주류) |
| 프롬프트 exactly-one | △ nano-banana 비결정적 — duplicate 재발 |
| Vision duplicate 감지 | ❌ 실루엣/최종에서 extras=0인데 육안 duplicate 존재 |
| bbox 마스킹 | △ 주 bbox만 가려져 **밖에 남은 AI 잔상** + blur patch 부작용 |
| 완전 해결 | ❌ |

### 남은 실패 모드

1. Vision이 duplicate 위치를 bbox로 못 잡음 → 마스킹/fallback 모두 miss
2. 주 bbox blur가 셔츠 텍스처를 깨뜨려 **새로운 시각 artifact**
3. 손 pose·원근 미반영은 여전히 (82차 이후와 동일)

### 다음 라운드 후보 (범위 밖 제안)

- paste **전** 실루엣 전체에서 제품색/형태 영역 자동 segmentation 마스킹
- 또는 pixel-paste base를 **원본 lifestyle**로 두고 손 영역만 nano-banana 마스크 사용

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/83cha-duplicate-artifact-qa.ts
```
