# 240차 — 라이프스타일 픽셀 합성 hero급 안전장치

생성: 2026-09-23 · 유료 API **허가 범위 내** (프로덕션 영구 + 실사진 2건) · 파일 2개

## 한줄 결론

라이프스타일 `removeProductBackground`에 hero와 동일한 preCrop 3단 재시도·4중 스코어링·손-오염 검사·clarity-upscaler를 배선. 품질 미달 컷아웃은 픽셀 페이스트하지 않음.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/photo-enhance.ts` | `PreCropOptions` / `preCropSourceToProduct` / `sharpenCutout` **export만** (본문 무변경) |
| `lib/lifestyle-product-composite.ts` | rembg 3단 재시도 + score/accept + hand detect + sharpen; 호출부 trim 중복 제거·품질 게이트 |

무변경: `photo-composite.ts`, `generate-lifestyle-shots.ts` (mtime 확인)

---

## 2. 검증

`npx tsx scripts/240cha-lifestyle-hero-parity-verify.ts` → **ALL PASS**

### 유닛 (API 0)
- esbuild 2파일 OK
- score 상수·가중치 hero와 동일 (hand -1000 / plate -500 / α -400 / corner -300 / 120·0.8·45·20)
- cropAttempts 3단·게이트·cutoutBuffer 경로 확인
- `photo-composite` / `generate-lifestyle-shots` mtime 불변

### 실사진 2건 (허가, `/api/generate` 미사용)

| 건 | 결과 | 비고 |
|----|------|------|
| electronics | 3회 시도 전부 `plateRisk=true` → **픽셀 페이스트 드롭** → nano-banana fallback 성공 | cost ≈ $0.0496 |
| fashion | 동일 (3회 plateRisk) → 드롭 → nano-banana 성공 | cost ≈ $0.0495 |

**시도 로그 원문**
```
[lifestyle-cutout:0] transparent=0.334 corner=170.8 plateRisk=true hand=false
[lifestyle-cutout:1] transparent=0.273 corner=147.6 plateRisk=true hand=false
[lifestyle-cutout:2] transparent=0.262 corner=124.4 plateRisk=true hand=false
[lifestyle-cutout] best score=-500.0 acceptable=false
… (fashion도 0/1/2 전부 plateRisk=true, best=-500, acceptable=false)
```

- 손-오염(`hand=true`): **0건** (이번 2건에서는 미검출)
- clarity-upscaler: **6회 시도 전부 HTTP 429** → 보정 전 컷아웃으로 폴백 (과금은 시도 로그 기준 ON 기록, 실청구는 429라 불확실)
- rembg: 케이스당 최대 3회 (재시도 루프 실제 동작 확인)
- `cutout-quality-below-threshold` 경고: **2/2** (게이트가 실제로 발동)
- `requirePixelPaste: true` 경로: 이번 라이브는 기본값(false)으로 돌려 nano-banana 폴백까지 봄. 게이트 자체는 2건 모두 발동. AI 일상샷(`requirePixelPaste`) 전용 드롭은 코드상 동일 `pixelPasteFailReason`으로 early return됨(라이브 미실행).

**비용 합산 (함수 `result.cost` 기준)**  
total ≈ **$0.099** (2건). 구성 대략: rembg×시도 + (clarity 시도/폴백 회계) + Haiku preCrop·handDetect + nano-banana fallback×2.

샷: `review/240cha-lifestyle-hero-parity/`
- `*-product.jpeg` / `*-lifestyle.jpeg` / `*-composite.png`
- `run-log.txt` · `summary.json`

회귀: 238 OK · 237/236/232/231 재실행

---

## 3. 정직 메모

- 이번 픽스처 2건은 rembg 컷아웃이 hero와 같은 plateRisk 게이트에 **전부 걸려** 픽셀 페이스트는 의도적으로 생략됨 → “억지 붙이기” 방지 동작이 확인된 케이스.
- clarity 429로 화질보정 실효는 이번 런에서 관측 못 함(인프라 한도). 코드 경로는 배선·폴백 확인.
- 그림자 각도 매칭·Vision 주석 4카테고리 확장은 스코프 밖 유지.
