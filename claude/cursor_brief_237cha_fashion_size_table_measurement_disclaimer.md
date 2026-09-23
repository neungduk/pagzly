# 237차 브리프 — 패션 사이즈표(실측 다이어그램) 측정 오차·체형 안내 문구 누락

생성: 2026-09-22 · 예상 유료 API: **0건** (순수 고정 문구 + JSX/문자열 렌더링 추가)

## 배경

사용자 지시: "237차 지시사항 남겨줘. 조건은 코딩만으로 디자이너와 후커블이 만든 상세페이지
퀄리티가 나와야해." 158/159/160/181/219/228/230차와 같은 4축(레이아웃 / 타이포·여백 / 이미지
합성 자연스러움 / 정보 위계) + 격차 3분류(버그 / 취향 차이 / 입력 부족) 방법론을 그대로
적용했습니다. 직전 재벤치마크(228/230차)가 전자제품·생활용품·화장품을 훑었고 패션/의류는
181차(2026-09-14, 6개 카테고리 얕은 패스) 이후 깊이 있는 재크롤링이 없었던 카테고리라 이번
라운드 타깃으로 선택했습니다.

## 방법 — 패션 카테고리 신규 크롤링 (무료, Behance)

Behance에서 "의류 상세페이지"/"청바지 상세페이지" 검색 후 2건을 스크롤 전체 열람:

1. **"반팔 상세페이지 디자인" — Sora Shin** (로얄리노, 스퀘어넥 여자 반팔티): 히어로 →
   FREE SIZE 실측 다이어그램+표 → 1+1 SET 프로모 → 피처 콜아웃(SQUARE NECK/ROUND SHAPE) →
   DAILY LOOK 모델 멀티컷 갤러리 → WASHING TIPS → PRODUCT INFO(색상/사이즈/제조국/소재) 순.
   전체 스크롤 직접 열람, 스크린샷 다수.
2. **"상세페이지 13 #의류 #청바지 # JEAN" — Yilurira.D La-Star**: 스톡사진 기반 저품질
   템플릿(청바지와 무관한 "SUNGLASSES MID SALE" 배너 포함)이라 벤치마크 근거로 채택하지
   않음(148/160차 "억지 채택 금지" 원칙 — 낮은 퀄리티 레퍼런스는 기준으로 삼지 않음).

148/160차의 "입력 기근 함정" 교훈에 따라, 레퍼런스에서 본 모든 패턴을 채택 후보로 올리기 전에
먼저 실제 코드(`lib/section-templates.ts`의 FASHION 슬롯 정의, `lib/fashion-size-diagram.ts`,
`components/FashionSizeDiagram.tsx`, `DetailSectionRenderer.tsx`, `export-detail-html.ts`)를
전부 열어 "이미 있는지/입력이 있는지/진짜 버그인지"부터 확인했습니다.

## 조사 결과 — 대부분 이미 해결됨 (재작업 불필요, 재확인만)

레퍼런스에서 관찰한 패턴을 하나씩 코드와 대조한 결과:

- **실측 다이어그램(의류 실루엣 + 치수선 오버레이)**: 레퍼런스의 "어깨넓이/소매길이/가슴둘레/
  기장" 화살표 오버레이 다이어그램을 보고 신규 격차로 의심했으나, `lib/fashion-size-diagram.ts`
  + `components/FashionSizeDiagram.tsx`로 **110/113/161/175차에 이미 구현·정제 완료**되어
  있었고, `DetailSectionRenderer.tsx:2101`(라이브)과 `export-detail-html.ts:690`(export) 양쪽에
  동일하게 배선돼 있음을 grep으로 확인. **재작업 불필요.**
- **피처 콜아웃(사진 위 텍스트 강조, "SQUARE NECK"/"ROUND SHAPE")**: Pagzly의 `feature_callout`
  (말풍선 스타일, `layout:"callout"`)이 이미 동일 목적의 사진+강조문구 패턴을 제공. 레퍼런스는
  말풍선이 아니라 큰 영문 워드+하이라이터 박스 스타일이라는 **시각 표현 차이**뿐 — 기능적 격차가
  아니라 **취향 차이**로 분류, 채택하지 않음(158차 3분류 원칙).
- **PRODUCT INFO 표(색상/사이즈/제조국/소재)**: Pagzly의 `spec_table`이 이미 임의의
  라벨/값 행을 렌더링하므로 이미 대응됨. 재작업 불필요.
- **1+1 SET, 컬러 스와치**: `package_contents`(157차, 입력에 "1+1"/"세트" 언급 있을 때만),
  `color_variation` 슬롯이 이미 존재하고 라이브·export 케이스 핸들러(`case "color_variation"`)가
  양쪽에 정확히 1개씩 존재함을 grep으로 확인(패리티 문제 없음).
- **라이브/export 케이스 핸들러 전수 대조**: `DetailSectionRenderer.tsx`와
  `export-detail-html.ts`의 모든 `case "..."` 문자열을 추출해 diff한 결과 **양쪽 완전히 동일**
  (한쪽에만 있는 타입 0건). `isFashionCategory(category)` 사용처도 양쪽 각각 6곳, 조건문
  전부 문자 그대로 동일 — 236차 이전까지 반복 발견되던 "라이브만 배선, export 누락" 패턴이
  패션 카테고리에는 없음.

## 발견 — 사이즈 실측 다이어그램에 측정 오차·체형 안내 문구가 아예 없음

레퍼런스의 FREE SIZE 다이어그램+표 바로 아래에는 항상 이런 안내 문구가 붙어 있습니다(스크린샷
확인):
> \* 사이즈는 측정 방법에 따라 1~3cm 오차가 발생할 수 있습니다.
> \* 사람마다 체형이 다르기 때문에 착용감이 조금씩 다를 수 있습니다.

한국 패션 이커머스 상세페이지에서 사실상 표준으로 붙는 문구로, 교환/환불 분쟁을 줄이는
신뢰 구축 요소입니다. `lib/fashion-size-diagram.ts`·`components/FashionSizeDiagram.tsx`·
`section-templates.ts`(259~263행)를 전부 grep한 결과 이런 안내 문구가 **어디에도 없음**을
확인했습니다 — `size_table` 슬롯의 note는 "판매자 확인 필요" 폴백만 언급할 뿐, 다이어그램 자체에
대한 고정 안내 문구는 없습니다.

**이건 입력 기근도 취향도 아닌 순수 코드 격차**입니다: AI가 생성하는 텍스트가 아니라
`ai_disclosure` 슬롯(335행, "서버가 고정 문구로 채움")과 같은 클래스의 **서버 고정 캡션**이므로
새 입력도, 새 AI 호출도, 환각 위험도 없습니다. 다이어그램이 실제로 표시될 때만(즉
`sizeDiagramMatches.length > 0` / `sizeMatches.length > 0`일 때만) 붙이면 되므로 스코프도
명확합니다.

## 수정

### 라이브 — `components/DetailSectionRenderer.tsx`

`case "spec_table"` 블록의 테이블을 감싼 `<div>...</div>`가 닫히는 지점, `</section>` 직전
(2256행 `</div>` 다음, 2257행 `</section>` 앞)에 삽입. 스타일은 같은 파일의 `stat_infographic`
각주 블록(2808~2816행, `footnotes.map(...)`)과 완전히 동일한 클래스를 재사용해 기존 각주
컨벤션과 시각적으로 통일:

```tsx
            </table>
          </div>
          {sizeDiagramMatches.length > 0 ? (
            <div className="mx-auto mt-4 max-w-xl space-y-0.5">
              <p className="text-center text-[11px] leading-relaxed text-ink/40">
                * 사이즈는 측정 방법에 따라 1~3cm 오차가 발생할 수 있습니다.
              </p>
              <p className="text-center text-[11px] leading-relaxed text-ink/40">
                * 사람마다 체형이 다르기 때문에 착용감이 조금씩 다를 수 있습니다.
              </p>
            </div>
          ) : null}
        </section>
      );
    }
```

### export — `lib/export-detail-html.ts`

`case "spec_table"`의 반환 템플릿(739~749행)에서 테이블 div 다음, `</section>` 앞에 추가.
스타일은 같은 파일 339행의 `stat_infographic` 각주(`opacity:.4`, 다른 색상 알파 접미사 없이
CSS `opacity`만 사용하는 기존 패턴)를 그대로 재사용:

```ts
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${specTableBg}${bgCss}" class="${isShipping ? "pagzly-shipping" : ""}">
        <p style="text-align:center;font-size:${FONT_SIZE.caption};letter-spacing:.2em;color:${deepText}">INFO</p>
        ${dh2(category, esc(section.heading), `text-align:center;font-size:${FONT_SIZE.section}`)}
        ${thumbHtml}
        ${diagramHtml}
        ${
          isShipping
            ? `<div class="pagzly-shipping-table" style="max-width:560px;margin:${tableMargin} auto 0;border:2px solid ${accent}59;border-radius:${RADIUS.md}px;overflow:hidden;background:${sectionBg}80">${tableHtml}</div>`
            : `<div style="max-width:560px;margin:${tableMargin} auto 0">${tableHtml}</div>`
        }
        ${
          sizeMatches.length > 0
            ? `<div style="max-width:560px;margin:16px auto 0"><p style="text-align:center;font-size:11px;line-height:1.6;opacity:.4;margin:0 0 2px">* 사이즈는 측정 방법에 따라 1~3cm 오차가 발생할 수 있습니다.</p><p style="text-align:center;font-size:11px;line-height:1.6;opacity:.4;margin:0">* 사람마다 체형이 다르기 때문에 착용감이 조금씩 다를 수 있습니다.</p></div>`
            : ""
        }
      </section>`;
    }
```

`sizeMatches`는 같은 `case` 블록 상단(609~612행)에 이미 선언돼 있는 변수를 그대로 재사용합니다
(신규 변수 선언 불필요).

## 작업 파일

`components/DetailSectionRenderer.tsx` + `lib/export-detail-html.ts` 딱 2곳. `lib/
fashion-size-diagram.ts`/`components/FashionSizeDiagram.tsx`는 이미 정상이라 무변경.

## 검증 스크립트 요청

`scripts/237cha-size-disclaimer-verify.ts` 신규 작성:

1. `npx esbuild lib/export-detail-html.ts components/DetailSectionRenderer.tsx --bundle=false --format=esm [--loader:.tsx=tsx] --outfile=NUL` 구문 통과
2. `buildDetailPageHtml()`을 FASHION 카테고리 + 실측 데이터가 있는 `size_table` 픽스처로 호출해
   결과 HTML을 `측정 방법에 따라` 문자열로 grep — 1건 존재 확인
3. 같은 함수를 **비패션 카테고리**(예: FOOD) + `spec_table`/`nutrition_table` 픽스처로 호출해
   같은 문자열이 **나타나지 않는지** 확인(스코프 밖 카테고리에 새지 않는지 회귀 검증)
4. FASHION이지만 실측 데이터가 매칭되지 않는(다이어그램 자체가 안 뜨는) `size_table` 픽스처로도
   호출해 문구가 함께 생략되는지 확인(다이어그램 없이 문구만 뜨는 상태 방지)
5. 기존 231/232/236차 회귀 스크립트가 있다면 재실행해 무관 기능 회귀 없는지 확인

스크린샷 1장(FASHION size_table export HTML을 브라우저로 렌더링해 다이어그램 아래 안내 문구
2줄이 보이는지)이 있으면 좋습니다 — `review/237cha-fashion-size-disclaimer/`에 저장.

## 포함하지 않는 것 (이번엔 손대지 않음, 취향/후보로만 기록)

- 피처 콜아웃의 "큰 영문 워드 + 하이라이터 박스" 스타일 변형 — 현재 말풍선 스타일과 기능적으로
  동등, 취향 차이로 분류(위 "조사 결과" 참고). 다음 라운드 후보로만 기록, 이번엔 미채택.
- 저품질 스톡사진 템플릿(#2 레퍼런스)에서 관찰된 "무관한 프로모 배너 삽입" 패턴 — 애초에
  벤치마크 기준으로 채택하지 않음.

## 절대 원칙 (재확인)

- 경쟁사 복제 금지(구조·문구 패턴만 참고, 실명·로고 노출 없음)
- anti-fabrication: 추가하는 문구는 AI가 생성하지 않는 서버 고정 캡션이며, 수치·근거를 새로
  지어내지 않음(측정 오차/체형차 안내는 일반론일 뿐 특정 제품 데이터 주장이 아님)
- 입력 기근 함정 회피: 새 입력·새 필드 요구 없음, 기존 `sizeDiagramMatches`/`sizeMatches` 매칭
  결과에만 조건부로 붙임

유료 API 0건.
