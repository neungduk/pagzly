# 249차 — 일러스트 배너 텍스트 가독성 버그 + 배송·교환 표 중복행 버그 (유료 API 불필요)

생성: 2026-09-23 · 유료 API **0건** — 순수 코드 로직/레이아웃 수정, 새 생성 없음

## 배경

248차로 확보한 실사 전체 스크린샷(`review/248cha-export-full.png`, 750×19,541,
Supabase 이미지 26/26 정상 로드 — 화장품 카테고리 28섹션 전체)을 Claude가 9등분해
전부 육안 검토함. 243차부터 이어온 사용자 요청("배경색이랑 인포쪽 더 자연스럽고
디자이너가 만든 수준으로", "사진 배치도 글에 맞게")에 대해 이번 라운드에서 **코드로
근본 원인까지 확인한 버그 2건**을 발견함. 사진 배치(hero, brand_story, 각 image_text,
step_card, comparison_chart 등) 자체는 전 구간에서 문구와 실제로 잘 맞았고 문제
없음 — 아래 2건은 배경/인포그래픽·표 관련 버그로 한정됨.

---

## 버그 1 — illustration_banner 텍스트가 배경 패턴과 겹쳐 가독성 낮음

**증거**: `review/248cha-export-full.png`의 "맑게 스며드는 하루" 섹션
(illustration_banner 타입). 서브카피 2번째 줄("...장면을 담았습니다.")이 AI가 그린
장식용 소용돌이 패턴 배경 위에 낮은 대비로 겹쳐 잘려 보이는 것처럼 보임 — 디자이너가
만들었다면 절대 통과하지 않았을 가독성 결함.

**근본 원인** (코드로 확인):

1. `lib/concept-illustration.ts`의 `generateIllustrationBanner()`는 AI에게
   `"clean empty center area, atmospheric backdrop for product detail page"`라고만
   지시할 뿐, 실제로 AI가 그 "빈 공간"을 어디에 얼마나 크게 그렸는지에 대한 좌표
   피드백이 렌더러로 전혀 넘어오지 않음. 즉 오버레이 텍스트가 항상 정중앙에
   배치된다는 보장이 없음.
2. `components/DetailSectionRenderer.tsx`의 `TYPO.bannerSub`/`TYPO.bannerTitle`
   (~219-226행)에는 다른 섹션에 쓰이는 `HEADLINE_CLAMP`("line-clamp-2")/`BODY_CLAMP`
   ("line-clamp-3") 같은 줄 수 제한이 전혀 없음 — 카피 길이에 따라 2줄까지 자유롭게
   늘어날 수 있음.
3. `illustration_banner` 케이스(~2812-2891행)의 가독성 보정은 상단 28%·하단
   45%(≈55%~100%)만 어둡게 하는 범용 세로 그라디언트(`getHeroGradient` +
   `linear-gradient(180deg, ...)`)뿐이라, 텍스트가 정중앙보다 아래로 밀리거나
   2줄이 되면 이 어둡게 처리된 영역 경계를 벗어나 AI가 그린 밝은/복잡한 패턴
   위에 바로 얹힐 수 있음.

**수정 제안** (둘 다 적용 권장, 라이브 렌더러 `components/DetailSectionRenderer.tsx`
~2812-2891행 + export `lib/export-detail-html.ts`의 `illustration_banner` 케이스
~966-975행 모두 동일하게):

- 오버레이 텍스트 블록 바로 뒤에 텍스트 크기에 맞춰 고정적으로 어둡게 깔리는
  전용 스크림(반투명 다크 패널 또는 텍스트 블록 중심의 radial-gradient)을 추가해,
  배경에 뭐가 그려지든 대비가 항상 보장되게 함 — 범용 상/하단 그라디언트에만
  의존하지 않음.
- `bannerSub`(및 필요시 `bannerTitle`)에 `line-clamp-2` 같은 줄 수 제한을 추가해
  텍스트가 무한정 늘어나 안전 영역을 벗어나는 상황 자체를 줄임(다른 섹션들의
  `BODY_CLAMP`/`HEADLINE_CLAMP`과 동일한 패턴).

구체적 구현(패널 크기·블러·opacity 수치 등)은 Cursor 재량. **일러스트 자체를
재생성할 필요 없음** — 레이아웃/CSS만 수정.

---

## 버그 2 — "배송·교환 안내" 표(spec_table, slot: shipping_info)에 중복행

**증거**: `review/248cha-export-full.png` 페이지 최하단 "배송·교환 안내" 섹션.
6개 행이 사실상 3쌍의 중복:

| 행 | 값 |
|---|---|
| 배송비 | 구매 금액·지역에 따라 달라질 수 있습니다 |
| 배송기간 | 판매자 확인 필요 |
| 교환·환불 | 판매자 확인 필요 |
| 배송 기간 | 판매자 정책을 확인해주세요 |
| 교환·반품 | 판매자 정책을 확인해주세요 |
| 환불 | 판매자 정책을 확인해주세요 |

"배송기간"/"배송 기간"(공백 차이), "교환·환불"/"교환·반품"/"환불"이 사실상 같은
정보를 두 가지 문구("판매자 확인 필요" vs "판매자 정책을 확인해주세요")로 중복
표시함 — 디자이너 수준은커녕 명백히 버그로 보이는 결과물.

**근본 원인** (코드로 확인, `lib/enrich-product-sections.ts`):

- `mergeSpecRows()`(~128-160행)는 먼저 `SHIPPING_SKELETON`(~78-82행, 정식 라벨:
  "배송비"/"배송기간"/"교환·환불")을 순회하며, 각 스켈레톤 항목마다 **정규식
  기반** `rowMatches()`로 AI가 생성한 기존 행(`existing`) 중 매칭되는 걸 찾아
  흡수함 — 이때 값에 "판매자"가 포함돼 있으면(플레이스홀더로 판단) 스켈레톤의
  고정 플레이스홀더 `"판매자 확인 필요"`로 덮어씀.
- 그 다음 "스켈레톤에 없는 나머지 기존 행은 그대로 유지"하는 루프(~154-158행)가
  있는데, 이 루프는 `merged`에 이미 들어간 라벨과 **정확히 문자열이 같은지**
  (`m.label === row.label`)만 검사함. 반면 위 흡수 단계는 정규식 부분매칭을 씀.
- AI가 생성하는 `shipping_info` 원본 카피(`app/api/generate/route.ts:987`
  지침 — "shipping_info는 type:'spec_table'로 배송비/기간/교환·환불 행을
  채우세요")는 라벨을 정확히 "배송기간"/"교환·환불"로 쓴다는 보장이 없고, 실제로
  "배송 기간"(공백 포함)·"교환·반품"·"환불"처럼 다르게 나옴. 이 라벨들은 정규식
  매칭 단계(`/배송기간|출고|발송/`, `/교환|환불|반품/`)에서는 스켈레톤에 흡수된
  것으로 처리되지만, 그 뒤의 "누락분 유지" 루프에서는 정확 문자열 비교라서
  "아직 merged에 없다"고 오판 → **원본 그대로 다시 append** → 중복 발생.
  (참고: 페이지 중간의 상품 정보 spec_table에서는 이 버그가 안 보이는데, 그건
  단지 그쪽 AI 생성 라벨이 스켈레톤 라벨과 우연히 정확히 일치했기 때문 — 코드
  경로는 동일하게 취약함.)

**수정 제안**: `mergeSpecRows()`의 "누락분 유지" 루프를 정확 문자열 비교 대신
동일한 `rowMatches()` 판정으로 바꿔 스켈레톤 어느 항목에든 이미 매칭된 행은
다시 append하지 않도록 함. 예:

```ts
for (const row of existing) {
  const alreadyCovered = skeleton.some((skel) => rowMatches(row, skel));
  if (!alreadyCovered) merged.push(row);
}
```

(정확한 변수명·타입은 실제 파일 기준으로 맞출 것. `skeleton`은 함수 인자로 이미
들어와 있음.)

**중요**: `SPEC_SKELETONS`(상품 정보용, shipping 아닌 쪽)에도 구조적으로 동일한
취약점이 있으니, 이번 수정은 `SHIPPING_SKELETON`에 국한하지 말고 `mergeSpecRows()`
자체를 고쳐 두 경로 모두에 적용되게 할 것.

---

## 검증 (유료 API 없음)

### 버그 2 (표 중복) — 유닛 테스트로 결정적 검증 가능

새 스크립트(`scripts/249cha-spec-table-dedupe-verify.ts` 등, 이름 자유)에서
**실제 `mergeSpecRows`/`enrichSpecTableSection`을 그대로 import**해서(재구현 금지):

1. 248차에서 실제로 나온 값을 그대로 재현한 fixture:
   `existing = [{label:"배송비", value:"..."}, {label:"배송 기간", value:"판매자
   정책을 확인해주세요"}, {label:"교환·반품", value:"판매자 정책을 확인해주세요"},
   {label:"환불", value:"판매자 정책을 확인해주세요"}]`를 `slot: "shipping_info"`
   spec_table 섹션에 넣고 `enrichSpecTableSection` 실행.
2. 결과 `rows`에서 `SHIPPING_SKELETON`의 각 항목에 대해 매칭되는 행이 **정확히
   1개씩만** 있는지 assert(중복 없음). 수정 전 코드로 먼저 돌려 실제로 6행이
   나오는 걸 확인한 뒤, 수정 후 3행(또는 정당하게 다른 정보인 행만 추가)으로
   줄어드는 걸 비교 캡처해서 보고에 포함.
3. 기존 스크린샷(228~248차 등)에서 쓰인 다른 카테고리의 정상 케이스(제품 정보
   spec_table)로도 회귀 테스트 — 정상 라벨 매칭 케이스가 이번 수정으로 깨지지
   않는지 확인.

### 버그 1 (일러스트 텍스트 가독성) — 기존 자산 재사용으로 검증(새 생성 없음)

`review/247cha-recovered/session.json`에 저장된 `imageUrls`(이미 생성된 이미지
URL들) 중 아무거나, 또는 `illustration_banner` 섹션이 실제 사용했던
`illustrationUrl`(session.json/showcase.html에서 추출 가능)을 재사용해서, 일부러
긴 2줄짜리 더미 body 텍스트로 `illustration_banner` 섹션 하나만 독립적으로
렌더링(라이브 컴포넌트 또는 export HTML 함수를 로컬에서 직접 호출)해 스크린샷
비교(수정 전/후). **새 이미지 생성 API 호출 없음** — 이미 있는 이미지 재사용만.

## 보고 형식

`review/249cha-report.md`에:
- 버그 2: 수정 전/후 `mergeSpecRows` 출력 행 수·내용 비교, 유닛 테스트 결과.
- 버그 1: 수정 전/후 스크린샷(같은 일러스트 이미지 재사용, 더미 긴 텍스트로 렌더).
- `git diff --stat`.
- API generate: 0 (모두 로직 수정 + 기존 자산 재사용 검증).
