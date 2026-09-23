# 212차 — spec_table에 productSizeHint(용량·크기 힌트) 배선 (API 0)

생성: 2026-09-17 · 발굴: 11번가 실사 재크롤링(사용자 지시 "네이버 스마트스토어/11번가 재시도")

## 절대 원칙 (반드시 준수)

**이 브리프는 어떤 생성 API 호출도 요구하지 않습니다.** Replicate/Claude/DeepSeek 호출,
`/api/generate` 실행 등 실제 생성 트리거는 절대 하지 마세요. 순수 함수 로직 추가 + 기존
필드 배선(threading)만입니다. 완료 후 보고서는 `review/212cha-report.md`에 작성하고,
**백로그(`claude/pagzly-backlog-master-2026-09-15.md`)는 이번에도 Cursor가 갱신하지
않습니다 — Claude가 직접 갱신합니다.**

## 배경 (실사 증거)

네이버 스마트스토어는 이번에도 브라우저 접근이 차단된 상태 그대로였습니다(신규 정보
없음). 11번가는 지난 라운드(210차 쿠팡)처럼 이번에 새로 접근 가능해져, 실제 청소기
PDP(아이닉 무선청소기 아이타워 i50, 11번가)를 크롤링했습니다.

이 상품의 "상품정보 제공고시"(공정거래위원회 규정 법정 고시 표) 중 세 행이 이렇게
채워져 있었습니다:

| 항목 | 값 |
|------|-----|
| 크기,용량,형태 | **상품상세설명 참조** |
| KC 인증정보 | 상품상세설명 참조 |
| 정격전압, 소비전력 | 상품상세설명 참조 |

"상품상세설명 참조"는 "이 정보는 상세페이지 콘텐츠 안에 있다"는 뜻입니다 — 즉 마켓플레이스는
이 3개 항목을 **셀러가 상세페이지(Pagzly가 만드는 바로 그 페이지) 안에 이미 명시했을 것으로
전제**하고 법정 고시 표에서는 위임 처리합니다. KC 인증정보/정격전압은 `lib/enrich-
product-sections.ts`의 `SPEC_SKELETONS["전자/가전"]`에 이미 행이 있어 커버되지만,
**"크기,용량,형태"에 해당하는 행이 전자/가전 스켈레톤에 아예 없습니다.**

더 중요한 발견: Pagzly는 이미 판매자로부터 이 정보를 입력받고 있습니다 —
`lib/types/generate.ts:100`의 `productSizeHint`(폼 라벨: "용량·크기 힌트", 예시 값
`"35mL, 높이 약 9cm"`)가 정확히 이 데이터입니다. 하지만 grep으로 전수 확인한 결과
`productSizeHint`는 현재 라이프스타일 합성 물리 스케일 매칭(`lib/lifestyle-physical-
scale.ts`의 `parseProductHeightCm()`, `lib/generate-lifestyle-shots.ts`,
`lib/lifestyle-composite-scale-gate.ts`)에만 쓰이고, **`enrichSectionsWithProductMetadata()`
(spec_table 고시용 표 보강 함수)에는 전혀 전달되지 않습니다** —
`app/api/generate/route.ts:1708~1715`의 meta 객체 리터럴에 `productSizeHint`가 없습니다.

그 결과 화장품(`용량`)·식품(`내용량`)·패션(`사이즈`)·생활/리빙(`규격`) 카테고리도 전부
같은 구멍이 있습니다: AI가 생성한 섹션 rows 안에 우연히 매칭되는 값이 없으면, 판매자가
폼에 직접 타이핑한 `productSizeHint`가 있어도 쓰이지 않고 그냥 "판매자 확인 필요"
플레이스홀더로 표시됩니다. **이건 입력 기근이 아니라 이미 받은 입력을 못 쓰고 버리는
배선 누락(버그)입니다.**

## 변경 대상 파일 (2개만)

### 1. `lib/enrich-product-sections.ts`

**(a) `SPEC_SKELETONS["전자/가전"]`에 행 1개 추가** (모델명 다음, KC 인증 앞 —
11번가 고시 표의 실제 항목 순서와 동일하게):

```ts
"전자/가전": [
    { label: "브랜드", match: /브랜드/ },
    { label: "제조사", match: /제조/ },
    { label: "모델명", match: /모델/ },
    { label: "크기·용량·형태", match: /크기|용량|규격|사이즈|형태/ },
    { label: "KC 인증", match: /KC|인증/ },
    { label: "정격전압", match: /정격|전압|전력/ },
    { label: "품질보증", match: /품질|보증|A\/S/ },
    { label: "제조국", match: /제조국|원산지/ },
],
```

**(b) `resolveSkeletonValue()` — `productSizeHint`를 폴백 값으로 추가.**
함수 시그니처의 `meta` 타입에 `productSizeHint?: string | null;` 추가하고, 기존
`existing` 매칭 확인 직후(브랜드 처리보다 먼저 또는 바로 뒤 — 순서 무관, 아래 예시
순서 권장)에 폴백 분기 추가:

```ts
function resolveSkeletonValue(
  skel: SkeletonRow,
  existing: { label: string; value: string }[],
  meta: {
    brandName?: string | null;
    certifications?: string | null;
    ingredients?: string | null;
    price?: number;
    productSizeHint?: string | null; // 212차
  },
): string {
  const found = existing.find((r) => rowMatches(r, skel));
  const trimmed = found?.value?.trim() ?? "";
  if (trimmed && !trimmed.includes("판매자")) return trimmed;

  if (skel.label === "브랜드" && meta.brandName?.trim()) return meta.brandName.trim();

  // 212차 — 용량/크기 계열 라벨은 판매자가 폼에 입력한 productSizeHint를 폴백으로 사용
  const SIZE_HINT_LABELS = new Set(["용량", "내용량", "사이즈", "규격", "크기·용량·형태"]);
  if (SIZE_HINT_LABELS.has(skel.label) && meta.productSizeHint?.trim()) {
    return meta.productSizeHint.trim();
  }

  if (skel.label === "주요 성분" && meta.ingredients?.trim()) {
    // ...기존 코드 그대로
```

**중요 — 우선순위 유지**: `existing`(AI가 생성한 섹션에 이미 값이 있는 경우)이 항상
`productSizeHint`보다 먼저 체크되고 우선합니다(위 diff 순서 그대로 유지). 즉
`productSizeHint`는 어디까지나 "AI가 못 채웠을 때"의 폴백이지, 기존 값을 덮어쓰지
않습니다.

**(c) `mergeSpecRows()`와 `enrichSpecTableSection()`의 `meta` 타입에도 동일하게
`productSizeHint?: string | null;` 한 줄씩 추가** (두 함수 모두 `meta`를 그대로
`resolveSkeletonValue`/하위 함수로 통째로 전달하는 구조라, 런타임 배선은 타입만
맞추면 자동으로 됩니다 — 값 전달 로직 자체는 추가로 만들 필요 없음).

**(d) `enrichSectionsWithProductMetadata()`의 `meta` 파라미터 타입에도**
`productSizeHint?: string | null;` **추가** (역시 타입만 — 이 함수는 이미 `meta`
객체를 통째로 `enrichSpecTableSection(section, meta.category, meta)`로 넘기고
있으므로 다른 코드 변경 불필요).

### 2. `app/api/generate/route.ts`

1708~1715행 근처, `enrichSectionsWithProductMetadata` 호출부의 meta 객체 리터럴에
`productSizeHint` 한 줄만 추가:

```ts
savedCopy.sections = enrichSectionsWithProductMetadata(savedCopy.sections, {
  certifications: enrichedBody.certifications ?? body.certifications,
  brandName: body.brandName,
  category: body.category,
  ingredients: body.ingredients,
  price: body.price,
  keyFeatures: body.keyFeatures,
  productSizeHint: body.productSizeHint, // 212차
});
```

`body`는 이미 `ProductInput`(`lib/types/generate.ts`)으로 타입돼 있고
`productSizeHint`가 그 타입에 이미 존재하므로 추가 타입 캐스팅이나 파싱 불필요합니다.

## 검증 스크립트 가이드 (`scripts/212cha-spec-table-size-hint-verify.ts`)

이전 라운드들(192/203/204/205차 review-signal, 187차 grain 등)과 동일하게 순수 함수
단위 테스트로 충분합니다. `enrichSectionsWithProductMetadata`를 직접 호출해 아래
항목을 assert로 확인하세요 (API 호출 없음):

1. **전자/가전, 기존 rows에 크기 관련 행 없음, `productSizeHint: "35mL, 높이 약 9cm"`
   전달** → 결과 rows에 `label: "크기·용량·형태"` 행의 `value`가 정확히
   `"35mL, 높이 약 9cm"`인지 (플레이스홀더 "판매자 확인 필요"가 아닌지).
2. **화장품/뷰티, 기존 rows에 "용량" 매칭 행 없음, `productSizeHint` 전달** → "용량"
   행이 힌트 값으로 채워지는지.
3. **회귀 없음 — `productSizeHint`가 `null`/`undefined`인 경우** → 기존 동작과 100%
   동일하게 플레이스홀더("판매자 확인 필요")가 그대로 나오는지 (즉 이번 변경이 기존
   경로를 깨지 않는지).
4. **우선순위 — 기존 rows에 이미 "용량: 500mL"처럼 유효한 값이 있는 경우** →
   `productSizeHint`를 전달해도 기존 "500mL"가 그대로 유지되는지 (덮어쓰지 않는지).
5. **KC 인증 행 로직 회귀 없음** — 이번 변경과 무관한 `KC 인증` 행의 "미입력 시 행
   자체 생략" 동작이 그대로인지 (기존 `mergeSpecRows`의 특수분기 미변경 확인).
6. `npx tsc --noEmit` → 0.

## 하지 않는 것

- `SPEC_SKELETONS`의 다른 카테고리(화장품/패션/식품/생활리빙/반려동물) 행 구성을
  재설계하지 않습니다 — 라벨 목록에 손대지 않고 오직 전자/가전에 행 1개만 추가합니다.
- `KC 인증` 행의 "미입력 시 생략" 특수 로직(`mergeSpecRows` 131~137행)은 건드리지
  않습니다.
- `SHIPPING_SKELETON`, `parseCertificationTokens()`는 미변경.
- `productSizeHint`를 파싱(`parseProductHeightCm` 등)하지 않습니다 — 판매자가 입력한
  원문 그대로("35mL, 높이 약 9cm") 표시만 합니다. 라이프스타일 합성 물리 스케일 매칭
  경로(`lib/lifestyle-physical-scale.ts`, `generate-lifestyle-shots.ts` 등)는 전혀
  건드리지 않습니다.
- `scripts/139cha-regression-qa.ts`의 기존 `enrichSectionsWithProductMetadata` 호출부는
  타입이 optional 필드 추가라 컴파일 깨지지 않습니다 — 굳이 수정할 필요 없음(원한다면
  커버리지 차원에서 `productSizeHint` 케이스를 추가해도 되지만 필수 아님).
- 새 UI 컴포넌트나 폼 필드를 만들지 않습니다 — `productSizeHint`는 이미 존재하는
  입력 필드입니다.

## 완료 보고 형식

`review/212cha-report.md`에 짧게: 요약, 핵심 diff(위 5곳), 검증 표(6개 항목 pass/fail),
`npx tsc --noEmit` 결과. 스크린샷·실사 생성 불필요(187/192/203~207차와 동일 수준의
순수 함수 검증으로 충분).
