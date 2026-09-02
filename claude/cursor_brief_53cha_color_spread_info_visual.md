# 53차 — 배경색 다양화(제품 색상 반영) + 정보 섹션 비주얼 보강 (코드 전용, 실생성 없음)

생성: 2026-09-01

## 배경

52차 결과물(5개 카테고리 실제 스크린샷)을 직접 다시 열어보고 확인한 내용입니다.

**1) 배경색이 카테고리·제품과 상관없이 다 비슷한 베이지/크림톤으로 보이는 문제 — 원인 특정함**

`lib/color-extract.ts`를 코드 레벨로 직접 추적했습니다. `extractProductTheme()`가 제품
사진에서 색상(hue)을 뽑아 `baseNeutral`을 계산하는 로직 자체(`buildThemeFromHue`,
`ensureWarmNeutral`)는 있는데, 다음 두 상수 조합 때문에 결과가 사실상 다 비슷해집니다:

```ts
// lib/color-extract.ts
const MIN_BASE_NEUTRAL_SATURATION = 0.14;

function ensureWarmNeutral(hex: string, hue: number): string {
  ...
  if (s >= MIN_BASE_NEUTRAL_SATURATION) return hex;
  const targetL = Math.min(0.97, Math.max(0.5, l));
  const [wr, wg, wb] = hslToRgb(hue, MIN_BASE_NEUTRAL_SATURATION, targetL);
  return rgbToHex(wr, wg, wb);
}
```

스튜디오 사진 배경은 대부분 채도가 거의 0에 가까운 흰색·회색이라 `ensureWarmNeutral`이
거의 항상 발동하는데, 이때 채도를 `0.14`로만 올리고 명도는 원본 그대로(보통 0.85~0.97로
매우 밝음) 유지합니다. **명도가 이렇게 높은 상태에서는 채도 14%는 사람 눈에 hue 차이가
거의 안 보입니다** — 빨강이든 파랑이든 초록이든 "옅은 아이보리색"으로 다 비슷하게
읽힙니다. 그래서 색 추출 로직 자체는 제품마다 다른 hue를 뽑아내고 있을 가능성이 높은데,
최종 `baseNeutral` 색은 시각적으로 거의 구분이 안 되는 겁니다. 51차/52차에서 카테고리별
악센트 라인·배지 색은 다양했지만 캔버스 전체를 덮는 `baseNeutral`이 계속 베이지로
보였던 게 바로 이것 때문입니다.

**2) 정보(spec_table) 섹션이 텍스트만 있어서 단조롭다는 피드백**

`components/DetailSectionRenderer.tsx`의 `spec_table` case(1306번 줄)를 보면 각 행에
작은 SVG 아이콘(`ConceptBadgeIcon`)만 붙고, 실제 제품 사진은 전혀 안 들어갑니다.

참고로 실제 쇼핑몰(올리브영)을 다시 확인해보니, 법적 고시 정보("상품정보 제공고시")
자체는 실제로도 텍스트 위주로 심플하게 유지하는 게 일반적이었습니다 — 이 부분은 우리가
특별히 뒤처진 건 아닙니다. 다만 그렇다고 완전히 밋밋하게 둘 필요도 없고, 이미 갖고 있는
제품 사진을 재사용해서 시각적 앵커 하나만 추가해도 체감 차이가 클 것 같습니다.

**3) (덤으로 발견) 반려동물 카테고리 사진 결함**

52차 `review/qa-screenshots/51cha-final-pet.png`의 "하루 1~2개" 섹션 썸네일 사진이
심하게 블러 처리되어 내용물이 거의 안 보입니다. 이것도 같이 봐주세요.

## 이번 라운드 원칙 — 비용 발생 없음

**이번 라운드는 코드 수정 + 무료 검증(스크립트/로그 확인)만 합니다. 실제 유료 생성
테스트(Claude Vision/DeepSeek/Replicate/Bria 호출)는 이번 라운드에 하지 않습니다.**
아래 A/B 작업 모두 기존 색상 계산 함수를 조정하거나 이미 갖고 있는 사진을 재사용하는
것이라 새로운 API 호출이 필요 없습니다. 실제 화면 재확인(스크린샷)은 이 코드가 다음에
실제로 생성될 때 자연스럽게 같이 보면 됩니다 — 이번 라운드에서 별도로 유료 생성을
돌리지 마세요.

## 작업 A — baseNeutral 채도/명도 재조정 (제품 색상이 실제로 보이게)

`ensureWarmNeutral()`을 다음 방향으로 조정해주세요 (정확한 수치는 아래 검증 스크립트로
직접 확인하면서 조율하되, 시작점 제안):

1. `MIN_BASE_NEUTRAL_SATURATION`을 `0.14` → **`0.30` 전후**로 올려보세요.
2. `targetL` 상한을 `0.97` → **`0.90` 전후**로 낮춰서, 채도가 너무 밝은 흰색에 묻히지
   않게 하세요 (하한 `0.5`는 유지 — 너무 어두워지면 안 됨).
3. 다만 컴플라이언스·가독성 문제가 생기면 안 되므로, 텍스트 대비(`theme.deepAccent`
   글자색과 `baseNeutral` 배경 사이 명도 대비)가 여전히 충분한지 반드시 같이 확인하세요.

**중요**: 정확한 수치는 제가 지금 눈대중으로 정한 것이라 확정값이 아닙니다.
아래 검증 스크립트로 여러 hue에 대한 실제 결과 hex를 뽑아보고, 서로 육안으로 구분되는
수준까지 조정해주세요 (숫자로만 다른 게 아니라 실제로 봤을 때 달라야 함).

### 검증 스크립트 (신규, `scripts/verify-53cha-color-spread.ts`)

```ts
import { getPaletteCurve } from "../lib/color-extract"; // 필요시 내부 함수 export 추가

const TEST_HUES = [0, 40, 80, 120, 160, 200, 240, 280, 320];
// 스튜디오 화이트 배경을 흉내낸 저채도·고명도 neutral 샘플
const FAKE_NEUTRAL = { r: 235, g: 232, b: 227, count: 100 };

for (const hue of TEST_HUES) {
  // buildThemeFromHue(hue, FAKE_NEUTRAL) 결과의 baseNeutral hex를 출력
  // 수정 전/후 값을 나란히 찍어서 채도 상승이 실제로 반영됐는지 확인
}
```

(정확한 함수 시그니처는 실제 코드에 맞춰 조정하세요 — `buildThemeFromHue`가 현재
export 안 되어 있으면 테스트용으로 export 추가하거나, `extractProductTheme`에 테스트용
neutral 주입 경로를 임시로 열어도 됩니다.) 9개 hue에 대해 나온 `baseNeutral` hex 값을
보고서에 표로 남겨서, 이전 상수(0.14)일 때와 비교해 확실히 달라 보이는지 눈으로 확인할
수 있게 해주세요.

## 작업 B — spec_table에 기존 제품 사진 재사용

`DetailSectionRenderer.tsx`의 `spec_table` case와 `export-detail-html.ts`의 동일
case에, **새 이미지 생성 없이** 이미 있는 `imageUrls` 중 하나(예: 대표 이미지
`imageUrls[0]` 또는 이미 다른 곳에서 안 쓰인 사진)를 헤더 옆이나 테이블 상단에 작게
(예: 정사각형 썸네일, rounded) 배치해주세요. 표 자체의 정보량을 바꾸는 게 아니라
시각적 앵커 하나 추가하는 정도로 충분합니다. `certifications`/카테고리 패턴 텍스처(51차
T1-C)와 겹쳐도 상관없습니다 — 오히려 같이 있으면 더 풍성해 보일 수 있습니다.

## 작업 C — 반려동물 사진 블러 결함 조사

`review/qa-screenshots/51cha-final-pet.png`에서 "하루 1~2개" 섹션 사진이 심하게
흐릿합니다. 해당 섹션에 어떤 이미지 슬롯이 매핑됐는지, 소스 사진 자체가 저해상도인지
아니면 백드롭 합성/블러 처리 로직이 잘못 적용됐는지 원인만 코드 레벨로 확인해서
보고해주세요 (수정까지 이번 라운드에 포함해도 되고, 원인이 크면 다음 라운드로 넘겨도
됩니다 — 원인 파악이 우선입니다).

## 하지 않는 것

- 실제 유료 생성 테스트 (다음 라운드로 이월)
- `accent`/카테고리별 고정 팔레트(`category-theme.ts`) 자체를 갈아엎는 것 — 이번엔
  `baseNeutral` 계산 로직만 조정
- spec_table 외 다른 섹션에 새 이미지 슬롯 추가 (범위 밖)

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] `verify-53cha-color-spread.ts` 실행 결과 — 9개 hue의 `baseNeutral` hex 값이
      서로 육안으로 구분 가능한 수준인지 (수정 전/후 비교표 포함)
- [ ] `baseNeutral` 배경 위 텍스트 대비가 여전히 충분한지 (극단적으로 어두워지거나
      가독성 깨지는 hue 없는지 9개 테스트 hue 전부 확인)
- [ ] spec_table에 기존 사진이 실제로 렌더링 분기에 들어갔는지 (미리보기 + export
      HTML 양쪽 다)
- [ ] 반려동물 블러 결함 원인 조사 결과

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, 9개 hue 색상 비교표, spec_table 이미지 추가
스크린샷(로컬 미리보기 캡처 정도는 무료이니 코드 확인용으로 괜찮습니다 — 다만 유료
API를 호출하는 완성 생성은 하지 마세요), 반려동물 블러 원인 조사 결과를 포함해주세요.
