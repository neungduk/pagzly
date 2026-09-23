# 214차 실행 검증 (Cursor 완료 보고 → Claude 독립 재검증)

생성: 2026-09-17 · 유료 허가 정확히 2건 소진(`TEST_MODE=false`) · 코드 변경 없음(검증 완료)

## 결론

**Cursor의 보고는 정확합니다 — 다만 214차의 원래 목적("211차 매칭 3축이 실사에서 육안으로
자연스러운지 확인")은 이번 2건으로는 달성되지 못했습니다.** 이는 Cursor의 실수나 코드 결함이
아니라, (1) 89차부터 있던 정당한 안전장치(grasp-region 세이프가드)가 정상 작동한 것과 (2)
이번에 고른 2쌍의 라이프스타일 사진이 마침 그 세이프가드를 통과하지 못하는 조합이었던 것이
겹친 결과입니다. 아래는 보고서·`summary.json`·실제 코드·산출 이미지를 직접 대조한 근거입니다.

---

## 1. 문서 정합성 대조

`review/214cha-report.md`와 `review/214cha-live/summary.json`을 바이트 수준으로 대조:

| 항목 | report.md | summary.json | 일치 |
|------|-----------|---------------|------|
| 실행 건수 | 2/2 | `runsAttempted: 2`, `maxRuns: 2` | ✅ |
| beauty cost | $0.054062 | `0.054062` | ✅ |
| electronics cost | $0.054659 | `0.054659` | ✅ |
| 합계(composite) | $0.108721 | `totalCost: 0.108721` | ✅ |
| beauty method | `nano-banana-fallback` | `"method": "nano-banana-fallback"` | ✅ |
| electronics method | `nano-banana-fallback` | `"method": "nano-banana-fallback"` | ✅ |
| composited | true/true | `true`/`true` | ✅ |

숫자·플래그 전부 일치. 사용자가 relay한 요약("2건 모두 grasp 세이프가드로 pasteCutoutOnScene
스킵, nano-banana-fallback만 성공")도 원본 문서 내용과 정확히 같습니다.

## 2. 실행 스크립트 자체 감사 — 가드레일 준수 확인

`scripts/214cha-lifestyle-matching-live.ts`(197줄)를 전체 읽고 확인:

- `MAX_RUNS = 2`, `CASES.length !== MAX_RUNS`면 throw — 하드코딩된 2건 상한.
- `process.env.TEST_MODE = "false"` 강제 — 테스트 모드로 몰래 도는 경로 없음.
- 매 케이스 `if (runCount >= MAX_RUNS) break`, 실패 시(`!result.composited`) 즉시 `break` —
  재시도 루프 전혀 없음(브리프의 "1회 실패 시 즉시 중단" 요구 그대로 구현).
- `compositeProductOnLifestylePhoto` 외 다른 함수 import 없음 — `/api/generate`, DeepSeek
  카피 생성, AI 라이프스타일 img2img 경로는 전혀 호출되지 않음.
- 상품/라이프스타일 사진 전부 `scripts/test-assets/` 기존 자산 재사용(`_181cha-live`,
  `_pixabay-cosmetics-run`, `_168cha-living`) — 신규 이미지 생성·구매 없음.

**브리프가 요구한 모든 가드레일이 스크립트 레벨에서 실제로 지켜졌습니다.**

## 3. 세이프가드가 실재하는 사전 코드인지 확인

`lib/lifestyle-product-composite.ts`를 grep + 직접 읽어 확인:

- `detectHandPlacementWithGraspRetry()`(약 410~530행) 함수 주석에
  `/** 89차 — not-overlapping-grasp-region일 때만 Vision 재호출 (최대 3회) */` —
  **211차·214차보다 훨씬 이전(89차)에 이미 존재하던 코드**이지 이번에 새로 만들어진 것이
  아님을 확인.
- 로직: `detectHandPlacementForProduct()`(Vision, `claude-haiku-4-5-20251001`)를 최대 3회
  호출하며 `graspOverlapFraction`을 추적. `reliable`이면 즉시 반환. 3회 모두
  `not-overlapping-grasp-region`으로 거부되면 마지막 시도로 ensemble 병합을 시도하고, 그마저
  실패하면 마지막(비신뢰) 결과를 그대로 반환.
- `method` 타입 정의(약 872행)에 `"pixel-paste" | "pixel-paste+grasp-refine" |
  "nano-banana-fallback" | "none"`이 명시돼 있어, `nano-banana-fallback`은 이번에 즉흥적으로
  튀어나온 경로가 아니라 **파이프라인이 원래부터 갖고 있던 정식 폴백 경로**임을 타입 레벨에서
  확인.

## 4. 구조적 증명 — `pasteCutoutOnScene`이 도달 불가능했음을 코드로 확인

`compositeProductOnLifestylePhoto()` 본문(약 880행~)의 게이트:

```ts
if (detection.reliable && detection.placement) {
  // ... pasteCutoutOnScene(...) 호출 — 211차가 수정한 경로
} else {
  // ... nano-banana-fallback 경로
}
```

보고서에 기록된 두 건 모두 Vision이 3회 시도 후 `reliable=false`로 귀결됐으므로
(beauty: graspOverlap 0.171→0.192→0.386, electronics: 0.184→0.192→0.360 — 3회 다 임계값
미만), 이 `if` 분기 자체가 거짓이 되어 `pasteCutoutOnScene()`은 **호출될 수조차 없는 구조**였습니다.
이건 "Cursor가 실행을 잘못했다"가 아니라 "애초에 이 두 이미지 조합으로는 이 분기에 들어갈 수
없었다"는 뜻입니다.

## 5. 산출물 육안 확인

`review/214cha-live/beauty-composite.png`, `electronics-composite.png`를 직접 열어봄:

- **beauty**: 세럼 드롭퍼를 두 손으로 잡은 장면. 조명·피부톤·병 형태가 하나의 새로 그려진
  장면처럼 통일돼 있음 — 픽셀 페이스트 특유의 "원본 라이프스타일 프레임 위에 컷아웃만 얹은"
  이질감이 없고, `nano-banana-fallback`(전체 재생성)이라는 보고와 일치하는 결과물.
- **electronics**: 우드 디퓨저를 야외에서 손으로 든 장면. 손과 제품의 접촉면은 자연스러우나
  제품의 강한 적색 글로우와 손/재킷의 색온도가 살짝 분리돼 있어, 이 역시 생성형 합성의
  특징과 일치.

두 이미지 모두 Cursor의 "육안 1차 소견"(생성형 재구성으로 보임, 픽셀 페이스트 아님)과
제 판단이 일치합니다.

## 6. 비용 대조

- `summary.json`의 `totalCost`(composite 함수 반환값 합) = $0.108721 — 코드 대조 완료.
- Vision `handPlacementForProduct` 비용은 함수 반환값에 포함되지 않고 콘솔 로그로만
  남아(`$0.0049×3`, `$0.0051×3`), 보고서가 이를 별도 합산(~$0.03)해 총 관측액 ≈$0.139로 제시한
  것도 계산이 맞음(0.054062+0.054659+0.0147+0.0153 ≈ 0.1387).
- 사용자가 허가한 "정확히 2건"은 `runsAttempted=2`로 실제로 지켜졌고, 3건째 실행 흔적은
  스크립트·로그·summary.json 어디에도 없음.

---

## 종합 판단

| 확인 대상 | 결과 |
|-----------|------|
| 보고서 vs summary.json 일치 | ✅ |
| 스크립트가 브리프 가드레일(2건·무재시도·코드무변경·실제사진만) 준수 | ✅ |
| 세이프가드가 진짜 사전 코드(89차)인지 | ✅ (신규 발명 아님) |
| `pasteCutoutOnScene` 도달 불가였는지 구조적 증명 | ✅ |
| 산출 이미지가 fallback 방식과 일치하는지 육안 확인 | ✅ |
| **211차 매칭 3축(화이트밸런스·선명도·그레인) 육안 검증** | ❌ **미달성** — 경로 자체가 실행되지 않음 |

**214차는 "정확히 2건, 실제 API, 코드 무변경"이라는 자기 목적은 완벽히 달성했지만, 그 상위
목적이었던 "211차 매칭이 실사에서 자연스러운가"라는 질문에는 여전히 답하지 못한 상태입니다.**
이건 낭비된 라운드가 아니라 — grasp 세이프가드가 이런 이미지 조합에서 정확히 의도대로
작동한다는 것을 확인한 유의미한 결과이지만, 원래 던진 질문은 열려 있는 채로 남아있습니다.

## 다음 결정 (사용자 판단 필요 — 추가 유료 실행은 재허가 전까지 0건)

1. **grasp-overlap 세이프가드를 통과할 가능성이 높은 이미지 쌍**(손이 제품을 쥐는 위치가
   명확한 라이프스타일 사진)으로 추가 1~2건 재시도 — 추가 유료 허가 필요.
2. `pasteCutoutOnScene`을 강제하는 디버그 플래그(fallback 없이 paste만 실행) 도입 — 이는
   214차 브리프 범위 밖의 **코드 변경**이므로 별도 스코프 정의와 허가가 필요.
3. 지금 상태로 멈추고, 211차의 순수 함수 단위 테스트(`scripts/211cha-lifestyle-matching-verify.ts`,
   이미 전부 통과)만으로 충분하다고 보고 실사 육안 검증은 보류.

이 셋 중 어느 것도 사용자 명시적 지시 없이는 진행하지 않습니다(생성 API 관련 절대 원칙).
