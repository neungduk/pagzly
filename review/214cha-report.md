# 214차 — 라이프스타일 합성 매칭 3축 실사 검증

생성: 2026-09-17 · 유료 허가 **정확히 2건** (`TEST_MODE=false`) · 코드 변경 없음

## 한줄 결론

2건 모두 **성공(composited=true)** 했으나, 손 배치 세이프가드(`not-overlapping-grasp-region`) 때문에 **`pasteCutoutOnScene`(211차 화이트밸런스·선명도·그레인 매칭) 경로는 한 번도 타지 않았고**, 둘 다 **`nano-banana-fallback`** 으로 끝났습니다. 이번 2건만으로는 211 매칭 3축의 육안 검증은 **미완**입니다.

---

## 실행 조건

| 항목 | 값 |
|------|-----|
| 스크립트 | `scripts/214cha-lifestyle-matching-live.ts` |
| 호출 | `compositeProductOnLifestylePhoto` (사용자 라이프스타일 사진 + 상품 컷아웃) |
| AI 라이프스타일 img2img | OFF |
| `TEST_MODE` | `false` |
| 실행 건수 | **2 / 2** (3건째 없음, 재시도 없음) |
| 산출물 폴더 | `review/214cha-live/` |

---

## 사용한 2건

### 1) 화장품/뷰티 (`beauty`)

| | |
|--|--|
| 상품명 | 214차 매칭 검증 세럼 |
| 상품 사진 | `beauty-6800936.jpeg` ← `scripts/test-assets/_181cha-live/` (복사본: `review/214cha-live/beauty-product.jpeg`) |
| 라이프스타일 | `pixabay-6886590.jpg` ← `scripts/test-assets/_pixabay-cosmetics-run/` (복사본: `review/214cha-live/beauty-lifestyle.jpg`) |
| 합성 결과 | **`review/214cha-live/beauty-composite.png`** |
| method | `nano-banana-fallback` |
| direct-paste | **skipped** — `safeguard-not-overlapping-grasp-region` (handPlacement 3회, graspOverlap 0.171→0.192→0.386) |

### 2) 전자제품 (`electronics`)

| | |
|--|--|
| 상품명 | 214차 매칭 검증 이어폰 (실사용 상품 컷은 우드 아로마 디퓨저형) |
| 상품 사진 | `electronics-6915262.jpeg` ← `scripts/test-assets/_181cha-live/` (복사본: `review/214cha-live/electronics-product.jpeg`) |
| 라이프스타일 | `hand-31203656.jpeg` ← `scripts/test-assets/_168cha-living/` (복사본: `review/214cha-live/electronics-lifestyle.jpeg`) |
| 합성 결과 | **`review/214cha-live/electronics-composite.png`** |
| method | `nano-banana-fallback` |
| direct-paste | **skipped** — `safeguard-not-overlapping-grasp-region` (handPlacement 3회, graspOverlap 0.184→0.192→0.360) |

---

## 합성 이미지 경로 (device_stage_files용)

```
review/214cha-live/beauty-composite.png
review/214cha-live/electronics-composite.png
review/214cha-live/beauty-product.jpeg
review/214cha-live/beauty-lifestyle.jpg
review/214cha-live/electronics-product.jpeg
review/214cha-live/electronics-lifestyle.jpeg
review/214cha-live/summary.json
```

---

## API 비용 로그 (콘솔 그대로)

### 건별 — beauty

```
[cost] claude/handPlacementForProduct (claude-haiku-4-5-20251001): $0.0049  ×3
[lifestyle-composite] stage=direct-paste skipped, reason=safeguard-not-overlapping-grasp-region
[lifestyle-composite] CALL nano-banana (fallback-full)
[lifestyle-composite] stage=nano-banana-fallback success
[cost] lifestyle-composite (fallback): $0.0541
→ result cost=0.054062
```

### 건별 — electronics

```
[cost] claude/handPlacementForProduct (claude-haiku-4-5-20251001): $0.0051  ×3
[lifestyle-composite] stage=direct-paste skipped, reason=safeguard-not-overlapping-grasp-region
[lifestyle-composite] CALL nano-banana (fallback-full)
[lifestyle-composite] stage=nano-banana-fallback success
[cost] lifestyle-composite (fallback): $0.0547
→ result cost=0.054659
```

### 합계 (2건 증명)

| 구분 | 금액 |
|------|------|
| lifestyle-composite 반환 cost 합 (`summary.json`) | **$0.108721** |
| Vision handPlacement (로그 합, 반환 cost 밖) | ~$0.0147 + ~$0.0153 ≈ **$0.0300** |
| 관측 총액 (composite + Vision) | ≈ **$0.139** |
| 실행 건수 | **runsAttempted=2**, maxRuns=2 |

`summary.json`:

```json
{
  "testMode": "false",
  "maxRuns": 2,
  "runsAttempted": 2,
  "totalCost": 0.108721
}
```

→ 유료 final 경로 **정확히 2건**만 실행됨 (3건째 없음).

---

## 육안 1차 소견 (참고용 — 최종 판단은 이미지 직접 확인)

### beauty-composite.png

- 세럼 드롭퍼를 두 손으로 잡는 라이프스타일 컷. 조명·피부·병 가장자리가 **생성형 풀샷**처럼 한 장으로 자연스러움.
- 상품 스튜디오컷(페디스탈·베이지 배경)과 **동일 라벨/병 형태**로 보이지만, 배경·손 포즈가 원본 라이프스타일 프레임을 유지한 **픽셀 페이스트**가 아니라 **nano-banana가 장면을 다시 그린 결과**로 읽힘.
- 컷아웃이 배경 위에 “붕 뜸” 현상은 **관찰 대상이 아님** — 211 매칭 경로 미사용.

### electronics-composite.png

- 우드 디퓨저(내부 적광·증기)를 야외 보케 앞에서 잡는 컷. 손·제품 접촉면은 그럴듯하나, 제품 채도(강한 적색 글로우) 대비 손·자켓의 색온도가 살짝 분리되어 **생성 합성 특유의 분위기**가 남음.
- 역시 **direct-paste + 3축 매칭이 아닌 fallback** 결과.

### 211 매칭 검증 관점

| 축 | 이번 2건에서 검증 가능? |
|----|------------------------|
| 화이트밸런스 매칭 | ❌ pasteCutoutOnScene 미실행 |
| 선명도 매칭 | ❌ |
| 그레인 매칭 | ❌ |

**차단 원인:** Vision hand-placement가 3회 모두 `reliable=false` / `reject=not-overlapping-grasp-region` → direct-paste skip → nano-banana fallback.

단위 테스트(211차 `scripts/211cha-lifestyle-matching-verify.ts`)는 순수 함수 경로만 통과한 상태이고, **실사에서 매칭이 보이는지**는 아직 미확인입니다.

---

## 다음 (허가 필요 — 이번 브리프 범위 밖)

211 매칭을 실제로 보려면 **grasp-region 세이프가드를 통과하는 라이프스타일 페어**(손이 명확히 제품을 잡을 위치와 겹치는 샷)로 **추가 유료 1~2건**이 필요합니다. 또는 `requirePixelPaste`/디버그 플래그가 있으면 fallback 없이 paste만 강제하는 옵션을 **별도 허가 후** 검토.  
이번 라운드 하드 가드레일(2건·실패 시 재시도 금지·코드 무변경)에 따라 **여기서 중단**합니다.
