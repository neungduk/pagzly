# 112차 — AI 사용샷 단독 저비용 검증 스크립트

생성: 2026-09-04
전제: 111차(픽셀 합성 전환) 완료, `review/111cha-report.md` 기준 무비용 검증(`111cha-physical-scale-smoke`) PASS 확인함. **유료 전체 페이지 생성(1회전)은 여전히 나중으로 미룹니다.** 이 브리프는 그것과 다른, 훨씬 싼 대안입니다.

---

## 1. 왜 필요한가

프로가 "AI 인물샷 제품 사이즈 문제를 다시 정확히 고쳐달라"고 재요청했습니다. 제가 코드를 직접 확인한 결과:

- `lib/generate-lifestyle-shots.ts` — 빈손 씬 생성(`PRODUCT_LIFESTYLE_EMPTY_SCENE`) → `productSizeHint` 높이(cm) 파싱 실패 시 **AI 사용샷 전체 스킵**(라인 109-114) → `compositeProductOnLifestylePhoto` 호출 시 `requirePixelPaste: true`로 nano-banana 재생성 폴백 차단(라인 179).
- `lib/lifestyle-product-composite.ts` — `detectHandPlacementWithGraspRetry`로 손 검출 → `applyPhysicalScaleToPlacement`(실측 스케일)로 배치 크기 계산 → 실패 시 `fallbackReason: "physical-scale-rejected"`로 폐기(라인 851-881) → `requirePixelPaste`면 모든 대체 경로 차단(`"require-pixel-paste-no-fallback"`, 라인 1015-1020).
- `lib/lifestyle-physical-scale.ts` — 손 너비(px) × 8.5cm 기준 순수 함수, 단위 테스트 PASS 확인함(`scripts/111cha-physical-scale-smoke.ts`).

**결론: 코드 레벨에서는 요청하신 내용이 이미 정확히 구현되어 있습니다.** 프로가 보신 "이상하게 큰 사이즈" 스크린샷은 111차 이전(순수 img2img 재생성 방식)의 결과물이고, 111차 이후로 **실제 이미지로 재확인한 적이 아직 없습니다.**

그런데 프로는 유료 1회전 테스트를 계속 미루고 계십니다. 전체 페이지 생성은 배경·목업·인포그래픽 등 다른 비용이 다 같이 들어가서 회당 약 $0.36입니다. **이 문제 하나만 보려고 그 전체를 태울 필요가 없습니다.** 사용샷 생성 함수는 이미 독립적으로 호출 가능한 형태(`generateLifestyleShots`)라서, 그것만 단독 실행하면 됩니다.

---

## 2. 만들 것

`scripts/112cha-lifestyle-composite-isolated-test.ts` — 페이지 생성 파이프라인 전체를 타지 않고 `generateLifestyleShots()` 하나만 직접 호출하는 CLI 스크립트.

입력(스크립트 인자 또는 상수로):
- 실제 제품 사진 URL 1장 (기존 테스트 상품의 원본 이미지 재사용 가능 — 새로 업로드 불필요)
- `category`, `productName`, `productSizeHint`(예: "35mL, 높이 약 9cm")

동작:
1. `TEST_MODE`, `IMAGE_ROUTER_ENABLED` 등 환경변수를 스크립트 안에서 일시적으로 override(실제 `.env.local`은 건드리지 않음 — `process.env`만 스크립트 실행 컨텍스트에서 조정).
2. `generateLifestyleShots({ ...uploadCount: 1... })`을 호출해 **빈손 씬 1장만** 생성(안 1, `count: 1`로 제한 — 3장 다 만들면 비용이 3배).
3. 결과 합성 이미지를 `review/112cha-lifestyle-composite-sample.png`로 로컬 저장.
4. 실행 종료 시 콘솔에 **실제 청구 비용**(Replicate 응답의 cost 필드 합산)을 명확히 출력.

## 3. 실행 전 반드시 지킬 것

- **실행 전 예상 비용을 먼저 사용자에게 보고**하고 승인받으세요. `flux-kontext-pro` 1회 호출 기준이므로 전체 페이지 생성($0.36)의 극히 일부(대략 1/10 이하로 추정 — 정확한 수치는 `image-router`의 비용 테이블에서 확인해 보고)입니다.
- 실행은 **정확히 1회**로 제한하세요. 결과가 나쁘면 프롬프트/로직을 코드로 고친 뒤 다시 승인받고 재실행합니다(반복 실행 금지).
- 실행 후 `.env.local`의 `TEST_MODE`가 `true`로 남아있는지 확인하세요(스크립트가 건드리지 않았는지).

## 4. 완료 보고 체크리스트

- [ ] 스크립트 작성 (`generateLifestyleShots` 단독 호출, count=1)
- [ ] 예상 비용 사전 보고
- [ ] 사용자 승인 후 정확히 1회 실행
- [ ] 결과 이미지 `review/`에 저장 + 실제 청구 비용 보고
- [ ] 육안 확인: 병 크기가 손에 맞는지, 라벨/형태가 원본과 동일한지(픽셀 합성이므로 동일해야 정상)
- [ ] 문제 발견 시 원인(검출 실패/스케일 계산/합성 블렌딩 등) 코드 레벨로 재진단하여 후속 브리프 필요 여부 판단
