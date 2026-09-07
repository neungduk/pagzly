# 126차 — 제품 높이(cm) 입력 필드 실제 구현 (124·125차 검증 실패 재작업)

생성: 2026-09-07
전제: `TEST_MODE=true` 유지. 유료 Replicate 호출 0회.

## 0. 왜 이 브리프가 다시 나왔는가 — 있는 그대로 말씀드립니다

124차, 125차 리포트 모두 "실제 경로에 연결했다"고 보고했지만, 제가 두 번 다 코드를 직접 읽어서 **사실이 아님을 확인했습니다.**

- 125차는 "`CreateProductForm`에 `#productHeightCm` 필드를 추가했다"고 했지만, `components/CreateProductForm.tsx`를 `height`로 전체 검색(대소문자 무관)한 결과 **0건**입니다. `productHeightCm`, `productSizeHint`, `enableAiLifestyleShots` 셋 다 이 파일에 없습니다.
- `formSnapshot` 타입(56~89행)과 실제 객체 리터럴(595~608행) 어디에도 이 필드들이 없는데, `app/create/draft/page.tsx`는 `snap.productHeightCm` 등을 읽고 있습니다 — 타입에 없는 속성을 읽는 코드라 정상적으로는 `tsc` 에러가 나야 합니다. 그런데 리포트는 "`tsc --noEmit`: 0건"이라고 썼습니다.
- 스크린샷도 "승인 후 로컬에서 실행 가능"이라고만 적혀 있고 실제로 찍힌 파일이 없었습니다.

**이번 라운드는 "구현했다"는 서술이 아니라, 아래 두 가지 원본 증거를 리포트에 그대로 붙여넣는 것을 완료 조건으로 합니다.**

## 1. 할 것 (매우 구체적으로)

### A. 실제 입력 필드 구현

`components/CreateProductForm.tsx`에서 `lifestyleImage`/`lifestylePreview` state가 있는 곳(현재 129~130행 부근) 근처에 새 state 추가:

```ts
const [productHeightCm, setProductHeightCm] = useState("");
```

라이프스타일 사진 업로드 UI 바로 아래에 **선택적** 숫자 입력 필드 렌더링 — 라벨: "제품 높이 (선택, cm) — 입력하면 손 크기 대비 정확한 합성이 가능해요". `type="number"`, 비어 있어도 에러 없음.

`formSnapshot` **타입 정의**(56~89행)에 필드 추가:
```ts
formSnapshot: {
  // ...기존 필드...
  productHeightCm: string; // 빈 문자열 허용
}
```

폼 제출 시 만드는 `formSnapshot` **객체 리터럴**(현재 595~608행)에도 실제로 값을 채워넣기:
```ts
formSnapshot: {
  // ...기존 필드...
  productHeightCm: productHeightCm.trim(),
}
```

### B. `draft/page.tsx` 쪽 타입 정합

`snap.productHeightCm`을 문자열로 받아서 숫자로 파싱(현재처럼 `typeof === "number"` 체크가 아니라 문자열 → `Number()` 파싱으로 수정) 후 `runPhotoEnhancementPipeline`에 전달. `snap.productSizeHint`/`snap.enableAiLifestyleShots`도 실제 폼에 대응 필드가 있는지 같이 확인하고, 없으면 **그 필드들도 같은 방식으로 실제 구현**하거나, 정말 필요 없으면 해당 코드를 제거해주세요(존재하지 않는 타입 속성을 읽는 죽은 코드로 남겨두지 않기).

## 2. 검증 — 이번엔 "원본 그대로" 요구합니다

리포트에 다음을 **요약하지 말고 원문 그대로** 붙여넣어주세요:

1. `git diff components/CreateProductForm.tsx`와 `git diff app/create/draft/page.tsx`의 실제 diff 전체(또는 diff가 너무 길면 최소한 변경된 hunk 전체).
2. `npx tsc --noEmit` 실행 후 터미널에 찍힌 **전체 출력**(에러 있으면 에러까지 그대로, 성공이면 "성공" 한 줄이라도 실제 실행 로그로).
3. 로컬 dev 서버에서 실제로 `/create` 폼을 열어 라이프스타일 사진 업로드 섹션 아래 새 필드가 보이는 스크린샷 — "실행하면 찍을 수 있다"가 아니라 **이번 라운드에 실제로 찍은 파일**.
4. 필드에 숫자 입력 후 제출까지 진행했을 때(실제 상품 생성 API 호출 없이, 폼 값만) 콘솔에 `[125cha]`/`[126cha]` 로그가 실제 값과 함께 찍히는 것도 스크린샷 또는 로그 파일로.

## 하지 않는 것

- mL→cm 환산 (지어내기 금지, 불변)
- 유료 Replicate 호출
- 필드를 필수로 만들기 (선택 유지)

## 완료 보고 체크리스트

- [ ] `CreateProductForm.tsx`에 실제 입력 필드 + state + formSnapshot 타입/객체 반영 (diff 원문 첨부)
- [ ] `draft/page.tsx`의 `snap.productHeightCm` 등이 실제 타입과 일치 (더 이상 존재하지 않는 속성 읽지 않음)
- [ ] `npx tsc --noEmit` 원본 출력 첨부
- [ ] 새 필드가 보이는 실제 스크린샷 첨부 (이번 라운드에 찍은 것)
- [ ] 유료 API 호출 0회
