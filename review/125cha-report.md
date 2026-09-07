# 125차 — 라이프스타일 합성: 실제 폼 → API 높이 연결

생성: 2026-09-07  
전제: TEST_MODE 유지. 유료 Replicate **0회**.

## 0. 124차와의 정합 (직접 재확인)

| 주장 | 현재 코드 실측 |
|------|----------------|
| `photo-pipeline` fetch에 height 없음 | **124차 이후에는 이미 있었음** (`productHeightCm`/`productSizeHint` 바디). 사용자가 본 626행 부근은 구버전 라인 기준이거나, **값이 항상 비어 스킵**되는 UX와 혼동된 것으로 보임 |
| draft에 높이 필드 없음 | **맞음에 가까움** — `productSizeHint`(용량/크기)만 있고, 사용자 다수가 `35mL`만 넣으면 `parseProductHeightCm`이 **null** → 게이트가 100% 스킵 |
| `productSizeHint`가 파이프라인과 무관 | **틀림** — draft는 이미 `snap.productSizeHint`를 pipeline에 넘김. 문제는 **숫자 cm 전용 UI가 약함** |

**결론:** 게이트/API 배선은 살아 있었으나, **실사용자가 넣는 값 형태로는 발동이 안 됨** → 「기능이 조용히 꺼짐」체감. 이번 차는 **A안: 선택적 제품 높이(cm) 필드**로 입력 경로를 확보.

## 1. 선택한 안 — A안 (+ 기존 hint 보조)

- 폼 「인물/라이프스타일 사진」바로 아래: **제품 높이 (선택, cm)** `#productHeightCm`
- 필수 아님. 비우면 기존처럼 합성 생략 (옵션 1 유지)
- mL→높이 환산 **하지 않음** (지어내기 금지)
- `productSizeHint`에 「높이 약 9cm」가 있으면 보조 파싱 가능. **숫자 필드가 우선**

흐름:

```
CreateProductForm productHeightCmInput
  → formSnapshot.productHeightCm / payload.productHeightCm
  → draft runPhotoEnhancementPipeline({ productHeightCm })
  → buildLifestyleCompositeRequestBody(...)
  → POST /api/lifestyle-composite { productHeightCm }
  → compositeProductOnLifestylePhoto({ productHeightCm, requirePixelPaste: true })
```

## 2. 값 흐름 증거 (직접 확인)

### 2-1. 무비용 증명 스크립트 로그

`npx tsx scripts/125cha-height-thread-proof.ts` → `review/125cha-height-thread-proof.log`:

```
[125cha-proof] SOURCE: CreateProductForm#productHeightCm + formSnapshot.productHeightCm
[125cha-proof] SOURCE: draft page passes productHeightCm: snapHeight
[125cha-proof] WITH_HEIGHT body={...,"productHeightCm":9,"productSizeHint":"35mL"}
[125cha-proof] VOLUME_ONLY skip body=null
[125cha-proof] FETCH_MOCK posted productHeightCm=9
[125cha-proof] ALL_OK
```

- 높이 **9** + hint `35mL` → 바디에 `"productHeightCm":9` 포함 확인  
- hint만 `35mL` → `body=null` (스킵) 확인  
- `fetch` mock에 실제로 실린 JSON의 `productHeightCm===9` 확인

### 2-2. 런타임 로그 마커 (승인 플로우에서 콘솔에 남음)

- `[125cha][create-form] submit ... productHeightCm=...`
- `[125cha][draft] runPhotoEnhancementPipeline productHeightCm=...`
- `[125cha][photo-pipeline] POST /api/lifestyle-composite body.productHeightCm=...`
- `[125cha][api/lifestyle-composite] body.productHeightCm=...`

### 2-3. UI

`#productHeightCm` 필드 추가 (라이프스타일 업로드 하단). 스크린샷 스크립트: `scripts/125cha-capture-height-field.ts` (로컬 승인 후 실행해 `review/125cha-product-height-field.png` 저장 가능).

## 3. 검증

| 항목 | 결과 |
|------|------|
| 높이 O → body에 productHeightCm | PASS (proof.log) |
| 높이 X → 스킵 | PASS |
| 111/124 스케일 스모크 | PASS |
| `tsc --noEmit` | 0 |
| 유료 API | 0 |

## 4. 참고 (124차 리포트 정정)

124차에서 「연결했다」고 쓴 pipeline 바디는 **코드상으로는 반영돼 있었으나**, 폼이 **숫자 cm를 안정적으로 보내지 못해** 실사용에서는 스킵만 반복됐습니다. 125차에서 그 입력 구멍을 막았습니다.
