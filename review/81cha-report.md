# 81차 — 라이프스타일 합성 2단계: 실제 상품 컷아웃 픽셀 합성

생성: 2026-09-02  
브리프: `claude/cursor_brief_81cha_lifestyle_composite_pixel_paste.md`

## 요약

68차(프롬프트 보강)를 건너뛰고 **실루엣 생성 → Vision 배치 → sharp 픽셀 붙여넣기** 4단계 파이프라인을 `compositeProductOnLifestylePhoto()`에 구현했습니다. Vision 신뢰도가 낮거나 실패 시 64차 nano-banana 전체 합성(+68차 라벨 보존 프롬프트)으로 폴백합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/detect-held-object-placement.ts` | Haiku Vision — 들고 있는 물체 bbox/회전 감지 (신규) |
| `lib/lifestyle-product-composite.ts` | 4단계 파이프라인 + 폴백 체인 |
| `scripts/81cha-lifestyle-pixel-paste-qa.ts` | 라벨 확대 비교 QA (신규) |

## 파이프라인

1. **실루엣** — nano-banana, 라벨/로고 그리지 말고 형태만
2. **Vision** — `detectHeldObjectPlacement()` → `{ xPct, yPct, wPct, hPct, rotationDeg, confidence }`
3. **픽셀 합성** — `removeProductBackground()` 컷아웃 + sharp resize/rotate/composite + 접지 그림자
4. **폴백** — Vision low/실패 → nano-banana 전체 합성(라벨 보존 프롬프트) → 최종 실패 시 원본

## QA 결과 (`TEST_MODE=false`)

| 케이스 | method | Vision | 비용 | 비고 |
|--------|--------|--------|------|------|
| self-care hands | **pixel-paste** | high (35,55 / 20×25%, rot -15°) | $0.0415 | 실루엣+Vision+paste 성공 |
| cosmetics flatlay | nano-banana-fallback | (실루엣 단계 실패) | $0.0395 | silhouette API 실패 후 폴백 |

**총 QA 비용: ~$0.081** (2케이스, 3번째 optional beverage는 URL 404로 스킵)

### 스크린샷

| 파일 | 설명 |
|------|------|
| `81cha-cosmetics-hands-full-compare.png` | 입력 vs pixel-paste 결과 |
| `81cha-cosmetics-hands-label-compare.png` | 원본 라벨 vs 합성 라벨 확대 |
| `81cha-cosmetics-flatlay-full-compare.png` | flatlay — fallback 결과 |
| `81cha-cosmetics-flatlay-label-compare.png` | fallback 라벨 확대 (여전히 재해석) |

## 솔직한 결론 — 라벨 정확도

### pixel-paste 경로 (hands 케이스)

- **픽셀 보존은 동작함** — 붙여넣은 영역은 AI가 다시 그린 게 아니라 `removeProductBackground()` 컷아웃 그대로입니다.
- **하지만 68차가 원했던 “라벨이 눈에 띄게 일치” 수준은 아직 미달:**
  - Vision bbox가 손 위치와 완전히 맞지 않아 제품이 손 위에 **떠 있는 듯** 보임
  - 이번 테스트 상품(`enhanced-fx-moisture.png`)은 **크림 텍스처 클로즈업**이라 라벨/로고 텍스트가 거의 없음 → 라벨 일치 여부를 육안 판단하기 어려움
  - rotate/resize만 적용 — 원근·손가락 가림 미반영

### fallback 경로 (flatlay 케이스)

- 실루엣 nano-banana가 `Failed to generate image`로 실패 → 64차 방식 폴백
- **라벨은 여전히 재해석됨** — 확대 비교에서 「글로밤 수분 크림」 등 텍스트가 원본과 다른 형태 (68차와 동일 문제)

### 남은 실패 모드

1. nano-banana 실루엣 단계 API 실패 (flatlay)
2. Vision `confidence: low` 또는 bbox 비합리적 → 폴백
3. 픽셀 paste 성공해도 **배치/각도 오차**로 부자연스러움
4. 손가락 가림·조명 불일치 미처리

## 체크리스트

- [x] `detectHeldObjectPlacement()` + `PAGZLY`-style bbox 검증
- [x] 실루엣 프롬프트 + sharp paste + contact shadow
- [x] 폴백 체인 + 단계별 로그 (`stage=pixel-paste`, `stage=nano-banana-fallback`)
- [x] QA 2케이스 + 라벨 확대 비교 스크린샷
- [x] `npx tsc --noEmit` 에러 0건
- [x] 비용 기록 (`81cha-composite-summary.json`)

## 검증 명령

```bash
npx tsc --noEmit
$env:TEST_MODE="false"; npx tsx scripts/81cha-lifestyle-pixel-paste-qa.ts
```

**주의:** `TEST_MODE=true`이면 Vision 배치 감지가 스킵되어 pixel-paste 경로를 테스트할 수 없습니다.
