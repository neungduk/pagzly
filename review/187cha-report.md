# 187차 — matchCutoutGrain (배경 그레인 매칭)

생성: 2026-09-15 · API **0**

`matchCutoutSharpness`와 동일 패턴으로 `matchCutoutGrain` 추가: 배경 고주파 잔차 측정 → &lt;2.2면 스킵 → 넘으면 알파 **0.02~0.05**만 컷아웃 RGB에 overlay. `unifyCompositeGrain` 호출부는 유지. `photo-enhance` 합성 경로에서 sharpness 직후에 배선.

**실측 상수:** skipThreshold **2.2**, span **6** (스켈레톤 유지). 실측 smooth≈0.004 / 강한 텍스처≫2.2.  
검증: `npx tsx scripts/187cha-grain-verify.ts` OK · `tsc` 0.
