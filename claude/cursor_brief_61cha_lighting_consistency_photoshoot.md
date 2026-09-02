# 61차 — 촬영 통일감 (조명/색온도 일관성, 59·60·62차 이후 착수)

생성: 2026-09-01

## 배경

채점 결과 기준 2(촬영 통일감)는 불합격 경향입니다. 같은 페이지 안에서 배경
합성 스타일이 섞여 보입니다 — 예) 화장품: 어두운 스튜디오 무드컷(드로퍼+화장솜)
바로 옆에 밝은 우드톤 소품 아이콘 사진, 그 옆에 순수 그라데이션 배경 아이콘
사진. 베르가모 레퍼런스는 히어로컷·텍스처컷·손등컷·패키지컷이 전부 같은
조명·색온도로 찍은 한 세트처럼 보이는데, 우리는 그렇지 않습니다.

코드에서 원인을 특정했습니다. `lib/photo-enhance.ts`를 보면 `enhanceProductImage`,
`generateBackdropViaBria`, `generateBackdropViaNanoBanana`,
`generateBackdropViaFluxKontext`, `generateBackdropViaBriaGenFill` 등 여러
호출부가 **각각 자기 소스 이미지에 대해 개별적으로**
`analyzeShadowDirection(sourceBuffer)`를 새로 실행해서 `shadow`
(`lightFrom`/`colorTemperature`)를 뽑고, 그 값으로 각자 다른 백드롭을
생성합니다 (예: 582행, 884행, 995행, 1094행, 1188행, 1837행 각각 독립 호출).
즉 한 상품 페이지 안에서 히어로/피처컷/텍스처컷이 원본 업로드 사진마다 제각각
분석된 조명값을 따라가서, 결과 배경도 각자 다른 조명·색온도로 나옵니다.

`generateSectionBackdropVariants` 함수(1382행 근처)엔 이미
`lightingLockPrompt(shadow)`로 "같은 세트처럼" 통일시키려는 장치가 있고, 주석에도
"히어로에서 고른 스튜디오 배경과 다른 섹션(업로드 2·3번) 연출"이라고 명시돼
있습니다 — 그런데 여기 들어가는 `shadow` 파라미터 자체가 호출 시점마다 다시
계산되는 건지, 히어로에서 쓴 것과 실제로 같은 값을 공유하는지가 호출 스택
추적 없인 불확실합니다. `EnhanceImageOptions`엔 `shadowHint?: ShadowAnalysis`
필드도 이미 있는데(316행), 이게 실제로 채워져서 전달되는 경로인지도 확인이
필요합니다.

## 작업

1. `app/api/generate/route.ts`(또는 실제 오케스트레이션 파일)에서 한 상품 생성
   시 `analyzeShadowDirection`이 몇 번 호출되는지, 어느 이미지 기준으로 호출되는지
   먼저 추적해주세요.
2. **히어로 이미지 기준으로 최초 1회만 `analyzeShadowDirection`을 실행**하고,
   그 결과(`ShadowAnalysis`)를 이후 모든 섹션 배경 생성 함수(`generateBackdrop`,
   `generateSectionBackdropVariants`, `generateBackdropViaBria` 등 해당 상품의
   나머지 이미지에 쓰이는 모든 배경 생성 호출)에 파라미터로 전달하도록 호출
   경로를 정리해주세요. 이미 있는 `shadowHint`/`shadow` 파라미터를 실제로
   채워서 넘기는 배관(plumbing)만 고치는 작업입니다 — 그림자 분석 알고리즘
   자체나 `matchCutoutWhiteBalance`는 그대로 둡니다.
3. 히어로 이미지가 없거나 분석 실패 시 폴백은 기존 `DEFAULT_SHADOW`를 그대로
   사용(현재와 동일한 안전장치 유지).

## 검증 (실제 생성 필요, 카테고리 1개로 제한)

- 화장품 또는 전자제품 카테고리(무드 차이가 뚜렷했던 카테고리) 1개 상품으로
  실제 `mode: final` 생성 1회.
- 페이지 내 히어로/피처컷/텍스처컷 등 배경 합성이 들어간 이미지 2~3장을 나란히
  캡처해서, (a) 조명 방향이 통일됐는지, (b) 색온도(밝기/난색-한색)가 이전보다
  가까워졌는지 육안 확인. 가능하면 51차 때 썼던 방식으로 각 이미지 배경 영역의
  평균 hex색을 뽑아서 수치로도 비교해주세요.
- QA 계정 크레딧 부족 시 `grant_credits`로 최소량만 충전(기존 라운드와 동일 방식).

## 하지 않는 것

- 카테고리별 배경 프롬프트 템플릿 내용 변경 (57차 영역, 이번과 무관)
- `matchCutoutWhiteBalance`, `buildSilhouetteShadowBuffer` 등 합성 로직 자체
  변경 — shadow 값을 "누가 계산하고 누구에게 전달하는지"만 수정
- 전체 5카테고리 재검증 (비용 최소화 — 1개 카테고리만)
- 59·60·62차가 먼저 끝난 뒤 착수해주세요 (통합 지시서 참고, 4개 중 가장 범위가
  큰 파이프라인 배관 수정이라 마지막 순서로 뒀습니다)

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 한 상품 생성 시 `analyzeShadowDirection` 호출이 히어로 기준 1회로 줄고,
      나머지 배경 생성이 그 결과를 재사용함 (호출 로그로 확인)
- [ ] 실제 생성 1회, 페이지 내 배경 합성 이미지들의 조명/색온도가 이전보다
      통일됨 (육안 + 가능하면 수치)
- [ ] `matchCutoutWhiteBalance`/그림자 생성 로직 미변경
- [ ] 히어로 분석 실패 시 기존 `DEFAULT_SHADOW` 폴백 유지

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, 체크리스트 결과, 이전/이후 스크린샷
경로·바이트 크기, 실제 생성 비용/횟수.
