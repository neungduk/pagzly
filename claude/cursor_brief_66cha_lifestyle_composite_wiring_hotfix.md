# 66차 — 64차 라이프스타일 합성 배선 누락 핫픽스

생성: 2026-09-02

## 배경

64차 완료 보고를 독립 검증했습니다. `lib/lifestyle-product-composite.ts`
(rembg 컷아웃 재사용 + nano-banana 합성 + 실패 시 원본 폴백)와
`app/api/lifestyle-composite/route.ts`는 코드도 정확하고, 비용도
`review/64cha-composite-summary.json`(합계 $0.07894)이 실제 계산과 정확히
일치했습니다. QA 스크립트로 직접 호출한 결과 스크린샷도 진짜 결과물이고
육안 평가(라벨 재해석, flatlay 어색함)도 솔직하게 적혀 있었습니다 — 이
부분들은 잘 만들어졌습니다.

**문제는 이 기능이 실제 상품 생성 흐름에는 연결돼 있지 않다는 것입니다.**

확인한 사실:

1. `app/create/draft/page.tsx` 280~297행에서 `runPhotoEnhancementPipeline({...})`
   호출 시 `lifestyleImageUrl: (currentDraft.payload.lifestyleImageUrl as
   string | null) ?? null`을 넘깁니다.
2. 그런데 `lib/photo-pipeline-client.ts`의 `runPhotoEnhancementPipeline()`
   함수 시그니처(404~417행)에는 `uploaded`, `category`, `productName`,
   `brandName`, `price`, `keyFeatures`, `ingredients`, `targetCustomer`,
   `referenceImageUrl`, `draftToken`, `pickBackdrop`, `onStage`만 있고
   **`lifestyleImageUrl` 파라미터 자체가 없습니다.**
3. `photo-pipeline-client.ts` 파일 전체를 `lifestyleImageUrl` /
   `lifestyle-composite`로 검색해도 **단 한 곳도 나오지 않습니다.**
   즉 함수 본문 어디에서도 이 값을 읽거나 `/api/lifestyle-composite`를
   호출하는 코드가 없습니다.

결과: 사용자가 "인물/라이프스타일 사진"을 업로드해도 그 URL은
`draft/page.tsx`에서 파이프라인 호출로 넘어가는 순간 그냥 버려집니다.
실제 상품 생성을 돌리면 라이프스타일 사진을 올렸든 안 올렸든 결과물이
완전히 동일합니다. 64차 보고서의 "`lib/photo-pipeline-client.ts` | enhance
후 `/api/lifestyle-composite` 호출" 항목은 사실과 다릅니다 — 아마 QA
스크립트(`scripts/64cha-lifestyle-composite-qa.ts`)에서 함수를 직접 호출해
테스트한 것을, 실제 파이프라인에 연결된 것으로 착각하고 보고서에 적으신
것 같습니다.

---

## 고쳐야 할 것

### 작업 A — `runPhotoEnhancementPipeline()` 시그니처에 파라미터 추가

`lib/photo-pipeline-client.ts` 404~417행 파라미터 타입에 추가:

```ts
lifestyleImageUrl?: string | null;
```

### 작업 B — 실제로 호출하도록 본문에 로직 추가

`uploaded`(원본 상품 사진 목록)와 히어로 배경 처리가 끝난 이후 지점에
(현재 파일 후반부, `finalImages`가 확정된 시점 근처 — 기존
`generate-lifestyle-shots` 호출 블록과 비슷한 위치가 적절해 보입니다)
다음을 추가해주세요:

- `params.lifestyleImageUrl`이 있을 때만 동작.
- 상품 히어로 이미지(첫 번째 enhance 완료 이미지, `finalImages[0]` 같은
  이미 배경 처리된 상품 컷)를 `productImageUrl`로 사용해서
  `/api/lifestyle-composite`에 POST (`lifestyleImageUrl`,
  `productImageUrl`, `category`, `productName`).
- 응답으로 받은 `composited`/`url`/`cost`를 처리:
  - `composited: true`면 결과 이미지를 `finalImages`에 추가(또는 별도
    슬롯으로 보관 — 이후 `image_text`/갤러리 섹션에서 쓸 수 있게).
  - `composited: false`면 아무것도 추가하지 않고 조용히 넘어감(이미
    API가 원본 폴백을 반환하므로 별도 처리 불필요).
  - 실패(fetch 자체 에러)해도 전체 파이프라인은 계속 진행(다른 배경
    생성 실패 처리와 동일한 원칙 — `try/catch`로 감싸고 실패해도
    나머지 파이프라인은 정상 진행).
- `photoProcessingCost`와 `photoCostBreakdown.lifestyleComposite`(이미
  타입엔 있음, 64차 확인됨)에 비용을 반영해주세요.
- `emit()`으로 진행 상태 이벤트도 하나 추가해주면 좋습니다(기존
  `PhotoPipelineStage` 타입에 `"lifestyle-composite"` 같은 값 추가 검토 —
  기존 `"lifestyle"` 스테이지는 이미 다른 기능(`generate-lifestyle-shots`,
  AI 일상샷 생성)이 쓰고 있으니 **이름이 겹치지 않게** 새 값을 쓰거나
  detail 텍스트로만 구분해주세요. 두 기능은 서로 다른 것입니다 — 헷갈리지
  않게 주의 바랍니다).

### 작업 C — 이 새 합성 결과가 실제로 상세페이지에 쓰이는지까지 확인

단순히 파이프라인 안에서 API를 호출하는 것만으로는 부족합니다. 합성된
이미지가 실제로 어느 섹션에 배치되는지까지 확인해주세요(예: 새 갤러리
컷으로 추가되거나, 특정 라이프스타일 슬롯에 배정되는 등). 호출만 하고
결과 이미지가 최종 페이지 어디에도 안 쓰인다면 이번 핫픽스도 반쪽짜리가
됩니다.

---

## 왜 이걸 놓쳤는지 (참고용, Cursor 재량)

`draft/page.tsx`에서 객체 리터럴로 `lifestyleImageUrl`을 넘기는 시점에
TypeScript가 "초과 속성 검사(excess property check)"로 걸러줬어야 할 수도
있는 상황인데 `tsc --noEmit` 에러 0건이라고 보고됐습니다. 실제로 tsc가
이 조합을 에러로 잡는지, 아니면 어떤 이유로 통과됐는지는 이번 고침
과정에서 자연히 확인될 것 같습니다 — 작업 A로 파라미터를 타입에 추가하는
순간 기존의 "숨겨진" 상태가 정상으로 바뀝니다.

---

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건 (관련)
- [ ] `runPhotoEnhancementPipeline()` 파라미터 타입에 `lifestyleImageUrl` 존재
- [ ] 함수 본문에서 `params.lifestyleImageUrl` 있을 때 `/api/lifestyle-composite` 실제 호출 (grep으로 셀프 확인 후 보고에 근거 남기기)
- [ ] 실제 상품 등록 화면에서 라이프스타일 사진 업로드 → 생성까지 E2E 1회 실행, 합성 결과가 최종 페이지에 실제로 노출되는지 스크린샷 확인 (유료 1회)
- [ ] 라이프스타일 사진 미업로드 시 기존 동작과 완전히 동일 (회귀 없음)
- [ ] 기존 `"lifestyle"` 스테이지(AI 일상샷 생성, `generate-lifestyle-shots`)와 이름/로직 충돌 없음

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, 체크리스트 결과, **E2E 스크린샷(업로드 →
생성 → 최종 페이지에 합성 이미지 노출 확인)**, 비용. 이번엔 특히 "코드에
호출부가 실제로 존재하는지" grep 결과를 보고서에 직접 인용해주시면
검증이 더 빨라집니다.
