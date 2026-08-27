# 33차 — 상세페이지 이미지 "반복돼 보임" 근본 원인 및 수정 지시

## 사용자 리포트

프로덕션 실제 생성 결과(`id=7dca0930-46dd-4ddd-91c5-c286af77c359`, 32차 검증 때 만든 것)의
전체 페이지 스크린샷을 보고 "같은 이미지가 너무 반복이 심하다"고 지적. 스크롤하며 보면 여러
섹션에서 사실상 같은 톤·구도의 사진이 계속 나오는 것처럼 보임.

## 근본 원인 (코드로 확정)

`lib/photo-pipeline-client.ts`의 `enhanceImages()`, 198~202행:

```ts
const backdropByIndex = [
  heroBackdrop,
  sectionBackdrops?.ingredientUrl || heroBackdrop,
  sectionBackdrops?.textureUrl || heroBackdrop,
];
```

이 배열은 **딱 3칸**(인덱스 0/1/2)뿐이다. 그런데 실제로 이 배열을 쓰는 306행:

```ts
const resolvedBackdrop = backdropByIndex[index] ?? heroBackdrop;
```

`index`는 업로드된 사진 전체(`uploaded.length`, 최대 10장까지 가능 — `MAX_PRODUCT_IMAGES`)를
0부터 순회한다. **인덱스 3번 이상인 사진은 배열에 해당 칸이 없어 전부 `undefined`가 되고,
`?? heroBackdrop`으로 떨어져 히어로 배경과 완전히 동일한 배경 위에 합성된다.**

즉 사진을 7장 올리면:
- idx 0 → heroBackdrop (히어로 전용, 실제로 다름)
- idx 1 → ingredientUrl (있으면 다름, 없으면 heroBackdrop)
- idx 2 → textureUrl (있으면 다름, 없으면 heroBackdrop)
- **idx 3, 4, 5, 6 → heroBackdrop 전부 동일**

7장 중 최소 4장(그리고 ingredient/texture가 생성 안 된 카테고리라면 최대 6장)이 **글자
그대로 같은 배경 이미지** 위에 합성된다. `assignDistinctSectionImages()`(섹션별 이미지
배정 로직)는 정상 작동해서 서로 다른 원본 사진을 골고루 쓰지만, 그 사진들에 입혀지는 배경
종류가 3개뿐이라 최종 결과물이 시각적으로 반복돼 보이는 것 — **배정 로직의 결함이 아니라
배경 재사용 로직의 결함.**

같은 함수 402~404행 주석에 이미 의도가 명시돼 있다: "사진 1장이어도 섹션별 배경을 생성해
히어로와 동일 배경 반복을 피한다" — `sectionBackdrops`(ingredient/texture)를 만드는
이유 자체가 반복 방지였는데, `backdropByIndex`가 인덱스 3 이상을 커버 못 해서 그 의도가
실제로는 절반도 지켜지지 않고 있었다.

참고로 `sectionBackdrops`는 카테고리 무관하게(화장품 전용 아님, 405행 `if
(backdropResult.shadowAnalysis && uploaded.length >= 1)`) 생성되므로 이 수정은 전 카테고리에
적용된다.

## 수정 지시 — 무료(추가 API 비용 0): 3개 배경을 라운드로빈으로 순환

`backdropByIndex[index] ?? heroBackdrop`을 인덱스 초과 시 heroBackdrop으로 고정 폴백하는
대신, **가진 배경 3개를 순환(modulo)** 하도록 바꾼다:

```ts
const resolvedBackdrop = backdropByIndex[index % backdropByIndex.length] ?? heroBackdrop;
```

`backdropByIndex` 배열 자체(198~202행)는 그대로 둔다 — `ingredientUrl`/`textureUrl`이 없는
경우 이미 `|| heroBackdrop`으로 폴백하므로 배열 구성은 안전하다.

이렇게 하면 idx 3은 다시 heroBackdrop(0%3), idx 4는 ingredientUrl(1%3), idx 5는
textureUrl(2%3), idx 6은 다시 heroBackdrop... 순으로 돈다. 완전히 새로운 배경은 아니지만
**서로 다른 원본 사진 + 서로 다른(또는 최소 순환하는) 배경** 조합이라 지금처럼 "idx
3~6이 전부 히어로와 동일"인 것보다는 확실히 반복이 줄어든다.

`backdropAlreadyComposited` 관련 313행 `resolvedBackdrop === heroBackdrop ? ... : false`
비교는 그대로 유지해도 안전하다 — 라운드로빈으로 idx가 다시 heroBackdrop과 같은 URL로
떨어질 때도 여전히 값 동등 비교라 정확히 동작한다. **이 줄은 건드리지 말 것** (28차/30차와
얽힌 로직이라 회귀 위험 있음).

## 승인 필요 — 다음 라운드 검토 항목 (이번엔 구현하지 말고 보고만)

라운드로빈은 "가진 배경을 최대한 활용"하는 무료 개선이지 "배경 종류 자체를 늘리는" 것은
아니다. 사진이 7장을 넘어가거나(예: 10장) 애초에 ingredient/texture 배경 생성이 실패한
경우, 여전히 배경 다양성 체감은 제한적일 수 있다. 다음 두 가지는 **구현하지 말고** 비용
영향과 함께 판단 근거만 보고할 것:

1. flux-schnell(장당 $0.003, 지금 성분/텍스처와 동일 저가 모델)로 "스튜디오"류 추가 배경
   1~2종을 더 생성해서 `backdropByIndex`를 4~5칸으로 늘리는 안 — 상품당 +$0.003~0.006
   수준으로 예상되나 실제 호출 지점(`/api/section-backdrops` 확장 여지) 확인 후 정확한
   비용 보고.
2. 지금은 `sectionBackdrops` 생성이 `shadowAnalysis` 존재 여부에만 걸려 있는데, 실패율이
   실제로 얼마나 되는지(로그 기준) — 실패가 잦으면 라운드로빈 자체의 실효성이 떨어지므로
   우선순위 판단에 필요.

## 검증 요청

수정 후 `lib/assign-section-images.ts`가 이미 하고 있는 대로 동일 레시피(히알루론 딥
모이스처 세럼, Pexels 사진 7장)로 재생성해서, `enhanceImages` 실행 시 각 인덱스가 어떤
backdrop으로 매핑됐는지(가능하면 콘솔 로그 1줄 추가 — `[enhance] idx=N backdrop=hero|ingredient|texture`)
확인하고 결과 이미지 URL과 함께 보고. `tsc --noEmit` 통과 확인도 포함.
