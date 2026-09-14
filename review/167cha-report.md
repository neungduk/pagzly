# 167차 — 인포그래픽 입력 매칭 감사 + 캔버스 초과 버그 수정

생성: 2026-09-14

## 요약

| 트랙 | 결과 | 생성 |
|------|------|------|
| A stat_infographic / tradeoff_card | **(a) 입력·프롬프트** — 로직 버그 아님. note/length guide 명확화 | **0회** |
| B 인물 합성 캔버스 초과 | **수정 완료** + 단위 테스트 PASS | **0회** (클램프 데모 PNG만) |

`npx tsc --noEmit` → **EXIT 0**  
`npx tsx scripts/167cha-canvas-overflow-verify.ts` → **PASSED**

---

## 트랙 A — stat_infographic / tradeoff_card

### 확인한 파일
- `scripts/167cha-analyze-sessions.ts` (166차 방법론 확장)
- `review/139cha-session-*.json`
- `lib/section-templates.ts` / `app/api/generate/route.ts` (스타일 분기 미변경)

### 기존 세션 집계

| 케이스 | 수치 입력 | stat | tradeoff | 판정 |
|--------|-----------|------|----------|------|
| electronics (`testMode:false`) | dB·배터리·IP 실수치 | **채움** | — | **정상 채움** |
| cosmetics / food / fashion / living | 뷰티 KF 오염 픽스처 | 미채움 | living: 추천문구 없음→생략 | **(a) 입력 기근/오염** — 미채움 판정 불가 |
| living tradeoff | 추천/유의 문구 없음 | — | 생략 | **(a) 정상 생략** |

**결론:** 유효한 풍부 입력(electronics)에서는 `stat_infographic`이 채워짐 → sanitize/슬롯 로직 버그(**b**) 아님.  
오염 픽스처·추천문구 부재는 166차와 동일한 **(a)**. 신규 생성으로 재진단하지 않음(usage 절약).

### 수정 (a — 프롬프트만)
- `buildSectionLengthGuide` common + 카테고리별 `stat_infographic` “수치 있으면 적극 채움”
- 생활 `tradeoff_card`: 추천/이런 분/참고 있으면 생략 금지 문구 강화
- bar/ring/number 분기 로직 **미변경**

### 생성 횟수 / 비용
- **0 / $0**

---

## 트랙 B — 캔버스 초과

### 확인·수정한 파일
- `lib/lifestyle-physical-scale.ts` — 재중심 후 75% 캡 + 프레임 클램프, 불가 시 null
- `lib/lifestyle-product-composite.ts`
  - `pasteCutoutOnScene`: **rotate → resize**, 씬 초과 시 재축소, `pasteLeft/Top` 클램프
  - `pixelPasteFailReason` 보존 → `require-pixel-paste-no-fallback`가 sharp 사유를 덮지 않음 (`canvas-overflow-or-sharp: …`)
- `photo-enhance.ts` / `photo-composite.ts` / Vision detect **미수정**

### 단위 테스트 (수정 후)
`scripts/167cha-canvas-overflow-verify.ts`
- 물리 스케일로 yPct가 음수 될 케이스 → **클램프 yPct=0**, reasonable 통과
- 극단 스케일 → null 거부
- rotationDeg ±45 / 가장자리+스케일+45도 / 음수 placement → **예외 없이** 씬 크기 유지

### 시각 데모
- `review/qa-screenshots/167cha-canvas-clamp-demo.png` (합성 API 없이 sharp 데모)
- 풀 라이브 generate 1건: **스킵** — 단위 테스트로 회귀 확인 충분, usage 최소화. 168차 후보로 실사 1건 남김.

### 생성 횟수 / 비용
- **0 / $0** (데모 PNG만)

---

## 168차 후보
1. productHeightCm + 손 사진 있는 실라이브 1건으로 B 실사 스크린샷
2. 오염되지 않은 food/fashion/living 픽스처로 A 재감사
3. tradeoff_card 풍부 입력 living 1회 채움률 확인
