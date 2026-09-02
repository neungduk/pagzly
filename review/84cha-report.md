# 84차 — 실루엣 제거, 원본 직접 paste 구조 변경

생성: 2026-09-02

## 요약

81~83차의 **AI 실루엣 잔상 + paste 겹침** 구조를 제거하고, **원본 라이프스타일 + 상품 컷아웃**을 Vision에 함께 보여 배치를 제안한 뒤 **원본 위에 직접 paste**하는 파이프라인으로 교체했습니다.

**구조적 목표(이중 객체·블러 박스 제거)는 달성**했습니다. 다만 Vision이 **쥐는 제스처가 아닌 장면에서도 `confidence: high`** 를 내는 경우가 많아, **“물체가 손 옆/손가락 위에 붙어 있는”** 새 실패 모드가 뚜렷합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/detect-held-object-placement.ts` | `detectHandPlacementForProduct()` 신규 — 원본+컷아웃 2장 Vision 배치 제안. 기존 `detectHeldObjectPlacement()` 제거 |
| `lib/lifestyle-product-composite.ts` | 실루엣 단계·마스킹 제거. direct-paste → 폴백만 유지 |
| `scripts/84cha-lifestyle-direct-paste-qa.ts` | 84차 QA (신규) |
| `scripts/83cha-duplicate-artifact-qa.ts` | 84차 이후 보관용 스텁 (실행 불가) |

## 파이프라인 (84차)

```
removeProductBackground()
  → detectHandPlacementForProduct(원본 lifestyle, cutout)  [2-image Vision]
  → pasteCutoutOnScene(원본 lifestyle)  [마스킹 없음]
  → (실패 시) nano-banana fallback → (실패 시) 원본 URL
```

제거된 dead code: `LIFESTYLE_SILHOUETTE_PROMPT`, `generateLifestyleSilhouetteScene()`, `maskSilhouetteObjectRegions()`, `detectHeldObjectPlacement()`.

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## QA 결과

| 케이스 | method | confidence | 비용 | 관찰 |
|--------|--------|------------|------|------|
| `84cha-labeled-serum-hands` | pixel-paste | high | $0.0049 | **이중 객체·블러 없음**. 세럼이 손가락 위에 **작고 떠 보임**. 원본 흰 패드/용기 **그대로** |
| `84cha-labeled-jar-hands` | pixel-paste | high | $0.0052 | 튜브 paste만 추가. 원본 흰 용기와 **겹침**(대체 아님) |
| `84cha-non-grip-rubbing-hands` | pixel-paste | high | $0.0051 | **신규 실패 모드** — 손등 문지르기인데 high. 병이 손 사이에 **붙어 있음** |
| `84cha-arms-crossed-serum` | pixel-paste | high | $0.0052 | 손 미노출 인물 사진에 **목/턱에 paste** — high 오판 |
| `84cha-flatlay-fallback` | nano-banana-fallback | low | $0.0439 | Vision `low` → **폴백 정상** |

- **폴백 발동:** 1/5 (flatlay)
- **pixel-paste 성공:** 4/5 (그 중 3건은 제스처 부적합인데도 high)
- **총 QA 비용:** ~$0.064

### 비용 비교 (성공 경로 pixel-paste 1건)

| 라운드 | 구성 | 대략 비용 |
|--------|------|-----------|
| 82/83차 pixel-paste | bg + **nano-banana 실루엣** + Vision | **~$0.0415** |
| 84차 pixel-paste | bg + Vision(2-image) | **~$0.0051** |
| **절감** | nano-banana 1회 제거 | **~$0.036/건 (~87%)** |

폴백 경로는 82차와 동일하게 ~$0.044 (bg + nano-banana).

### 라벨 확대 비교

- 원본 상품(세럼/튜브)에서 Vision **텍스트 영역 미감지** — 82차와 동일.
- 합성 결과 crop도 텍스트 미감지 → **라벨 보존 여부는 이번에도 불확실** (억지 판단 안 함).

스크린샷: `84cha-*-label-compare.png`

### 81~83차 결함 vs 84차

| 결함 | 82차 | 84차 |
|------|------|------|
| 이중 객체 (작은 duplicate floating) | ✅ 재현 (`82cha-labeled-serum-hands-output.png` 좌측 작은 병) | ❌ **없음** |
| 블러 박스 (83차 마스킹) | ✅ | ❌ **없음** |
| AI 실루엣 잔상 | ✅ | ❌ **구조상 불가** |

82차 vs 84차 전체: `82cha-labeled-serum-hands-full-compare.png` vs `84cha-labeled-serum-hands-full-compare.png`

### 신규 실패 모드 (의도 확인)

1. **비-쥐는 제스처 + high confidence** — `84cha-non-grip-rubbing-hands-full-compare.png`
2. **쥴 공간 없음 + high confidence** — `84cha-arms-crossed-serum-full-compare.png` (목에 paste)
3. **원본 장면 소품 미제거** — lifestyle에 이미 흰 용기/패드가 있으면 paste만 추가되어 **두 물체 공존** (83차 “duplicate”와 원인 다름: AI 잔상이 아니라 **원본 prop**)

## 솔직한 결론

| 항목 | 상태 |
|------|------|
| 이중 객체 / 블러 박스 | ✅ **구조적으로 사라짐** |
| 비용 (pixel-paste 성공) | ✅ **~87% 절감** |
| flatlay → 폴백 | ✅ 정상 |
| 자연스러운 “쥐고 있음” | ❌ **대부분 부자연** — 크기·위치·제스처 불일치 |
| Vision confidence 보수성 | ❌ **미달** — 문지르기/팔짱/손 없음에도 high |
| 라벨 보존 검증 | △ 텍스트 미감지로 **불확실** |

**84차 구조 변경은 81~83차 반복 버그의 근본 원인(AI가 먼저 그림)을 제거했습니다.** 대신 **원본 pose·소품을 바꿀 수 없어** “그냥 붙여 넣은” 느낌과 **제스처 불일치**가 새 한계입니다. pixel-paste 성공률을 올리려면 Vision 프롬프트를 더 보수적으로 조정하거나, `confidence: high` 기준을 추가 휴리스틱(손 bbox 필요 등)으로 강화하는 후속이 필요합니다.

## 검증

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/84cha-lifestyle-direct-paste-qa.ts
```

스크린샷: `review/qa-screenshots/84cha-*`
요약 JSON: `review/84cha-composite-summary.json`
