# Pagzly 백로그 마스터 (2026-09-15)

생성: 2026-09-15  
목적: 45차~184차 문서에 흩어진 「다음 라운드 후보 / 채택하지 않은 것 / 미해결」을 한곳에서 고르게 한다.  
규칙: 새 라운드는 이 문서를 먼저 열고 항목을 고른 뒤, 완료 시 상태만 갱신한다.

상태 키:

| 상태 | 의미 |
|------|------|
| `완료됨` | 이후 라운드에서 실제로 처리됨 (처리 차수 명시) |
| `의도적 보류` | 버그 아님 · 취향/가드레일/카테고리 특성상 안 함 |
| `미해결·API불필요` | 코드만으로 지금 가능, 아직 미착수 |
| `API필요·허가대기` | DeepSeek/Replicate 등 생성 API 또는 유료 실사가 필요 |

---

## 요약 (2026-09-23 / 252차 — cta_price "생성 누락" 오탐 정정: 실제 원인은 QA 스크린샷 도구의 position:sticky 미출력 버그, 고객 PNG 다운로드는 정상)

> 250차 후커블 비교 연장선에서 248차 풀페이지 스크린샷 맨 끝에 `cta_price`(가격·대상고객·
> 인증배지 섹션)가 안 보이는 걸 발견 — 처음엔 "DeepSeek이 cta_price 생성을 빼먹었다"는
> 가설로 `ensureAiDisclosure()` 등을 추적했으나, **`session.json`의 실제 `sections` 배열을
> 직접 열어보니 `cta_price`가 마지막(28번째)에 정상 값(price·badges 4개·targetCustomer)으로
> 이미 들어있었음을 확인** — "생성 누락" 가설은 틀렸음을 스스로 정정. 진짜 원인은
> **Playwright `page.screenshot({fullPage:true})`가 `position:sticky`(`.pagzly-cta`) 요소를
> 레이아웃 좌표는 맞는데 실제로 페인트하지 않는** Chromium 렌더링 버그 — 247차 실제 산출물
> (`showcase.html`)로 직접 재현 성공(`before-broken-tail.png`). **중요: 진짜 고객용 PNG
> 다운로드(`lib/capture-detail-png.ts`, html-to-image 기반)는 캡처 메커니즘이 달라 이 버그가
> 없음을 동일 마크업으로 직접 재현해 확인**(`customer-png-export-unaffected-tail.png`) —
> 즉 제품 자체는 문제없고, **QA 스크린샷 스크립트에만 있는 사각지대**였음. 이 사각지대는
> `scripts/`에 이미 `fullPage:true`를 쓰는 스크립트가 6개 있어 과거 여러 시각 검수 라운드가
> `cta_price`류 sticky 섹션을 소리 없이 못 보고 지나쳤을 가능성을 시사. 수정은 제품 코드
> 무변경 — 새 공용 헬퍼 `scripts/lib/neutralize-sticky.ts`(`neutralizeStickyForScreenshot()`,
> `fullPage` 캡처 직전 CSS로 sticky 무력화)를 만들어 앞으로의 QA 스크린샷 스크립트에서
> 기본으로 쓰도록 `cursor_brief_252cha_qa_screenshot_sticky_paint_bug.md`에 지시. 기존 6개
> 스크립트 소급 수정은 불필요(이미 완료된 1회성 검증). **유료 API 0건** — 신규 생성 없이
> 기존 247차 자산만 재사용, 수정 전/후를 직접 재현·검증까지 마친 뒤 브리프 작성.

---

## 요약 (2026-09-23 / 251차 — 사용자 결정: illustration_banner를 실사진 기반으로 전환, 브리프 작성)

> 250차가 남긴 유일한 미결정 항목("illustration_banner를 계속 쓸지")에 대해 사용자가
> "실사진 기반 배너로 전환"을 명시적으로 선택. `generateIllustrationBanner()`(Replicate
> recraft-v3/v4-svg, $0.04~0.08/장) 호출과 로컬 합성 폴백(`illustration-banner-fallback.ts`)을
> 제거하고, 이미 업로드된 상품 사진을 `assignDistinctSectionImages()` 경유로 배정해 실사진
> 풀블리드 배경으로 대체하는 `cursor_brief_251cha_illustration_banner_photo_based_conversion.md`
> 작성. 249차가 만든 텍스트 전용 다크 패널 스크림/2줄 clamp는 실사진에도 여전히 필요해
> 그대로 유지. **유료 API 신규 추가 없음 — 오히려 기존 Replicate 호출 1건을 완전히
> 제거하는 순비용 절감 라운드.** 기존 DB에 이미 저장된 상품(구 AI 일러스트 URL 보유)이
> 깨지지 않도록 하위호환 순서(`illustrationUrl` 있으면 우선, 없으면 `imageIndex`)를
> 브리프에 명시.

---

## 요약 (2026-09-23 / 250차 — 실제 디자이너 상세페이지 + AI 경쟁사(레이메이커·후커블) 신규 크롤링 벤치마크, 대부분 이미 해결됨 재확인)

> 사용자가 249차 검증 결과 스크린샷을 기준으로 "쇼핑몰 디자이너들이 만든 상세페이지 혹은
> AI가 자동으로 만들어주는 사이트들 견본"과 비교해달라고 요청. 신규 레퍼런스 3건을 크롤링:
> ① 토리든(실제 판매 수분세럼 브랜드) 상세페이지 해부 글, ② 레이메이커(AI 경쟁사, 신규 —
> 갤러리 35건 직접 열람), ③ 후커블(랜딩페이지 내 실제 생성 예시 "구강스프레이" 끝까지 스크롤
> 확인). 발견 6건을 코드와 대조한 결과 **4건은 이미 구현·렌더링까지 완료**(POINT 배지 타이포,
> `evidenceQuotes` 리뷰 근거 비교차트, `presentationStyle:"checklist"` 체크마크 그리드),
> **1건은 248차부터 미확정이던 "원형 성분 시각화 2종류 공존"을 코드로 확정**(`ingredient-ring-
> diagram.ts` vs `apply-ingredient-circle-pair.ts` — 버그 아니라 의도된 별개 기능), **1건은
> 의도적 설계 차이로 확인**(단일 브랜드컬러 서사 vs Pagzly의 기준색 파생 warm/cool/bold 순환
> 팔레트 — 둘 다 유효, 취향 차이). **유일한 신규 관찰**: 레이메이커 갤러리 35건 전부와 후커블
> 예시 전부 실사진+타이포 오버레이만 쓰고 추상 AI 일러스트 배경(소용돌이 패턴 등)은 하나도
> 없었음 — `illustration_banner` 섹션 자체를 계속 쓸지가 코드 버그가 아닌 제품 방향 질문으로
> 남음(249차가 그 섹션의 즉각적 가독성 버그는 이미 고쳤으므로 시급하지 않음). 새 브리프는
> 작성하지 않음 — 즉시 코드로 고칠 신규 버그 없음, 남은 1건은 사용자 결정 대기.

---

## 요약 (2026-09-23 / 249차실행검증 완료 — 버그 2건 모두 독립 검증 PASS)

> Cursor의 249차 보고("버그 2건 수정 완료, API 0")를 Claude가 코드·스크린샷 직접
> 열람으로 독립 검증(보고·콘솔 로그 신뢰하지 않음, PC에서 파일 재staging):
>
> - **버그 2(배송·교환 표 중복행)**: `lib/enrich-product-sections.ts`를 직접 읽어
>   확인 — 누락분 유지 루프가 `m.label === row.label`(정확 문자열)에서
>   `skeleton.some((skel) => rowMatches(row, skel))`(정규식 판정 통일)로 바뀌었고,
>   `SHIPPING_SKELETON`의 기간 매칭도 `/배송\s*기간|출고|발송/`로 공백을 허용하도록
>   넓어짐. 248차 fixture(배송비/배송 기간/교환·반품/환불 4행)를 손으로 직접
>   추적(regex 매칭을 한 줄씩 재계산)해 6행→3행으로 줄어드는 걸 코드 로직만으로
>   재확인함(스크립트 콘솔 출력에 의존하지 않음) — PASS. 회귀 케이스(내용량→용량
>   동의어)도 직접 추적해 중복 없음 확인.
> - **버그 1(illustration_banner 가독성)**: `components/DetailSectionRenderer.tsx`·
>   `lib/export-detail-html.ts` 양쪽에 텍스트 블록 전용 다크 패널 스크림(`rgba(27,27,24,.9)`,
>   inset -10%, 라운드+그림자) + `line-clamp-2`(export는 `-webkit-line-clamp:2`)가
>   실제로 들어갔음을 직접 읽어 확인. `review/249cha-illustration-banner/before.png`·
>   `after.png`를 직접 열람 — before는 248차 실제 프로덕션에서 봤던 것과 동일한
>   문제(흰 글자가 소용돌이 패턴과 겹쳐 저대비)를 정확히 재현했고, after는 어두운
>   패널 위에 2줄로 말줄임(…) 처리되어 대비·가독성이 확실히 개선됨을 육안으로 확인.
>   검증에 쓰인 일러스트는 247/248차 실제 생성물의 URL을 그대로 재사용(신규 생성 없음).
>
> **결론**: 243차부터 이어온 "배경색/인포그래픽 자연스러움" 요청에 대해 구체적 버그
> 2건을 찾아 코드로 고치고 스크린샷·로직 추적으로 직접 검증 완료. "사진 배치가 글에
> 맞는가" 쪽은 248차 28섹션 전수 검토에서 불일치를 못 찾았으므로 현재 코드 기준 문제
> 없음으로 결론.

---

## 요약 (2026-09-23 / 249차 — 248차 풀페이지 스크린샷 9등분 전수 검토 완료, 배경/인포그래픽 버그 2건 근본원인까지 확인해 브리프 작성)

> 248차로 확보한 `review/248cha-export-full.png`(750×19,541, Supabase 이미지 26/26
> 정상 로드, PC 렌더)를 9등분해 28섹션 전체를 Claude가 직접 육안 검토함. **사진 배치는
> 전 구간에서 문구와 잘 맞았음** — hero·brand_story·quick_points·성분 feature
> 섹션들·step_card·comparison_chart 등 어디서도 사진-카피 불일치를 발견하지 못함
> (243차부터 이어온 "사진 배치가 글에 맞는가" 우려는 현재 코드 기준 근거 없음으로 판단).
> **배경/인포그래픽 쪽은 코드로 근본원인까지 확인된 버그 2건**을 발견:
>
> 1. **illustration_banner 텍스트 가독성 버그** — "맑게 스며드는 하루" 섹션에서 서브카피
>    2번째 줄이 AI가 그린 장식 패턴 위에 낮은 대비로 겹침. 원인: `bannerSub`/`bannerTitle`에
>    다른 섹션과 달리 줄 수 제한(line-clamp)이 없고, 가독성 보정용 그라디언트가 상/하단
>    범용 밴드뿐이라 AI가 실제로 어디에 "빈 공간"을 그렸는지와 무관하게 텍스트가 겹칠 수
>    있음(`components/DetailSectionRenderer.tsx` TYPO.bannerSub 및 illustration_banner
>    케이스, `lib/export-detail-html.ts` 동일 케이스).
> 2. **"배송·교환 안내" 표 중복행 버그** — 페이지 최하단 spec_table(slot: shipping_info)에
>    "배송기간"/"배송 기간", "교환·환불"/"교환·반품"/"환불"처럼 사실상 동일 정보가 서로
>    다른 문구("판매자 확인 필요" vs "판매자 정책을 확인해주세요")로 중복 표시됨. 원인:
>    `lib/enrich-product-sections.ts`의 `mergeSpecRows()`가 스켈레톤 흡수 단계에서는
>    정규식 부분매칭(`rowMatches()`)을 쓰면서, "누락분 유지" 루프에서는 정확 문자열 비교만
>    써서 AI가 생성한 라벨(공백·표현 차이)을 이미 흡수된 걸로 인식 못 하고 원본을 그대로
>    다시 append함 — 그래서 중복 발생. 상품 정보 spec_table은 라벨이 우연히 정확히 일치해
>    안 드러났을 뿐 동일 코드 경로라 구조적으로 같은 취약점을 가짐.
>
> 둘 다 코드 레벨 버그로 분류(취향차이·입력부족 아님), 유료 API 불필요(레이아웃/로직
> 수정 + 기존 자산 재사용 검증)로 판단해
> `cursor_brief_249cha_illustration_banner_text_safety_and_shipping_table_dedupe.md`
> 작성.

---

## 요약 (2026-09-23 / 248차 — 247차 복구 성공 독립 검증 + Claude 자체 렌더가 샌드박스 네트워크 차단으로 신뢰 불가 판명, PC 재렌더 요청)

> Cursor의 247차 보고("`/create/history` 최상단이 246차 상품과 일치, result 정상 로드,
> 스크린샷·session.json·export HTML 전부 확보, API 0")를 Claude가 독립 검증: 실제
> `review/247cha-recovered/`의 `showcase-full.png`(라이브 미리보기)를 직접 열람해
> "라이트 워터 히알루론 세럼" 제품명·AI 비용 $1.2522·28섹션 배지가 246차와 일치함을
> 확인. **여기서 한 걸음 더 나아가 export HTML(`showcase.html`)을 Claude 자신의 클라우드
> 샌드박스에서 Playwright로 직접 렌더해 28섹션 전체를 스스로 검증하려 시도했으나**, 샌드박스의
> 조직 egress 정책이 이미지가 호스팅된 Supabase Storage(`qnstsrplqzoqlndojuyw.supabase.co`)
> 접근을 막고 있어(`curl` 403 확인) **렌더 결과의 이미지 영역이 전부 빈 박스로 나옴** —
> 이 상태로 "사진 배치가 이상하다"거나 "배경에 빈 공간이 크다"고 판단하면 샌드박스 네트워크
> 제약을 프로덕션 버그로 오판하는 것이므로, **그 렌더 결과를 근거로 채택하지 않고 전부
> 폐기**. `pagzly-seo-text` 클래스(export 최상단의 순수 텍스트 SEO/접근성 요약 블록,
> `aria-label="상품 정보 텍스트 요약"`, 전용 CSS 존재 확인)는 별도 의도된 기능으로 확인 —
> 배경/인포그래픽 이슈와 무관, 버그 아님. 이미지가 정상 로드되는 PC에서 export HTML을
> 다시 렌더·캡처하도록 `cursor_brief_248cha_export_html_full_screenshot.md` 작성(유료 API
> 0건 — 이미 있는 정적 HTML을 브라우저로 열어 캡처만). 결과 수신 후 243차부터 이어온
> "배경색/인포그래픽 자연스러움"·"사진 배치가 글과 맞는가" 최종 판단 예정.

---

## 요약 (2026-09-23 / 247차 — 246차 실사 결과 "복구" 시도: 서버는 최종 생성 성공(200)했으나 클라이언트 캡처만 실패 — 재생성 대신 `/create/history` 경유 무료 복구 브리프 작성)

> 246차 보고("서버 최종 generate 200(3.1min) 성공, 그러나 `waitForURL(/create/result)` 480초
> 타임아웃으로 캡처 실패, 비용 ≈$1.28")를 Claude가 코드로 추적: `run-console-246.txt`
> 원문(UTF-16 디코딩)이 보고와 정확히 일치함을 확인(Pexels 8→폼 OK→배경 후보 #0 선택→
> `waitForURL` 타임아웃, 재시도 0). `app/create/draft/page.tsx:517`에서 최종 generate
> 성공 시 `router.push(`/create/result?id=${json.productId}`)`로 이동하는 코드를 직접
> 확인 — 즉 서버가 `productId`를 발급했다면 DB에 상품이 실제로 저장됐을 가능성이 높고,
> Playwright가 놓친 건 네비게이션/캡처뿐일 수 있음을 코드로 근거 확보. `app/create/history/page.tsx`가
> `products` 테이블을 `user_id`·`created_at desc`로 조회해 `/create/result?id=` 링크를
> 보여주는 걸 확인 — **재생성(추가 유료) 대신 이 목록 최상단 항목으로 246차가 이미 결제한
> 결과물을 무료로 복구 시도**하도록 `cursor_brief_247cha_recover_246cha_result_via_history.md`
> 작성. 성공하면 246차의 ~$1.28로 목적(실사 결과물 확보) 달성, 추가 비용 없음. 부수적으로
> `handleApproveAndFinalize`의 `backdropFailed` 분기(추가 클릭 필요한 중간 상태)와
> Next.js App Router의 네비게이션-데이터-페칭 지연 두 가지를 246차 실제 실패 원인 후보로
> 코드에서 특정 — 이번 라운드는 조사만, 수정은 247차 결과 보고 후 판단.

---

## 요약 (2026-09-23 / 246차 — 사용자가 "지시해줘"로 화장품 실사 재허가: 245차 수정 반영본 정확히 1회 실행 지시)

> 245차실행검증 완료 후 Claude가 사용자에게 재허가 여부를 직접 질문 → 사용자 "지시해줘"로
> 명시 승인. 244차와 동일한 스크립트·동일한 가짜 제품 정보, 진입 URL만 `/create/detail`로
> 고쳐진 상태로 **정확히 1회** 재실행하도록 `cursor_brief_246cha_beauty_showcase_one_live_generation_retry.md`
> 작성 — 244차와 동일한 "정확히 1회, 실패해도 재시도 금지" 스코프 유지. 목적은 243차까지
> 코드 조사로만 판단했던 "배경색/인포그래픽 자연스러움"·"사진 배치가 글과 맞는가"를 실제
> 최신 코드 기준 렌더 결과물로 직접 검토하는 것. Cursor 실행 대기.

---

## 요약 (2026-09-23 / 245차실행검증 완료 — beauty showcase 스크립트 URL 수정 확정, 재실행은 사용자 확인 대기)

> Cursor 보고("`git diff --stat`: 1 file changed, 1 insertion(+), 1 deletion(-)", esbuild
> 구문 검증 OK, 실사 미실행)를 Claude가 PC 실제 파일 재스테이징 후 독립 검증: 148행이
> 정확히 `/create` → `/create/detail`로만 바뀌었고, 그 외 `BASE_URL`·`waitForURL(/create\/draft)`·
> `waitForURL(/create\/result)` 등 다른 URL 참조는 전부 무변경임을 grep으로 직접 재확인.
> `review/245cha-report.md` 내용도 diff·검증 결과와 일치. 실제 실사 재실행 여부는 Claude가
> 임의로 결정하지 않고 사용자에게 재확인 요청(아래 채팅 참고) — "허가 주시면 1회
> 돌리겠습니다"는 Cursor의 대기 상태 보고였지 사용자의 명시적 허가가 아니었음.

---

## 요약 (2026-09-23 / 245차 — 244차 실패 원인 코드로 확정·수정(유료 API 0건), 재실행은 사용자 재허가 대기)

> Cursor의 244차 실패 보고("`/create` 폼에서 `select` 480초 타임아웃, 재시도 없이 중단,
> 유료 0건")를 Claude가 독립 검증: `review/beauty-showcase-one/`의 각 파일 mtime을
> 직접 대조해 `pexels-sources.json`·`run-console.txt`만 오늘 갱신되고 나머지(showcase·
> session 등)는 8/28 그대로임을 확인(보고와 일치), `run-console.txt` 원문(UTF-16 인코딩,
> 직접 디코딩해 재확인)도 "Pexels 8장 성공 → `locator('select').first()` 480초 타임아웃"
> 그대로임을 확인 — 재시도 흔적 없음, 조작 없음.
>
> 원인을 코드로 직접 추적: `app/create/page.tsx`가 더 이상 폼이 아니라 "무엇을
> 만드시겠어요?" 선택 페이지(카드 2개, `<select>` 0개)로 바뀌어 있었고, 실제
> `CreateProductForm`은 `app/create/detail/page.tsx`로 옮겨져 있었음 — 스크립트가 139차
> 시점 작성된 옛 URL(`/create`)을 그대로 참조해 생긴 실패, 프로덕션 코드 버그 아님. 나머지
> 셀렉터(필드 id 8개·제출 라우팅·`backdrop-*`/`detail-preview` testid)는 전부 현재 코드와
> 여전히 호환됨을 grep으로 확인 — `page.goto` URL 한 줄만 `/create/detail`로 고치면 됨.
> `cursor_brief_245cha_beauty_showcase_route_fix.md` 작성 — **이 브리프는 스크립트 1줄
> 수정만 지시(유료 API 0건), 수정된 스크립트의 실제 재실행은 Cursor가 임의로 하지 않고
> 사용자 재허가를 기다리도록 명시**(244차와 동일한 "정확한 횟수 허가" 원칙 유지).

---

## 요약 (2026-09-23 / 244차 — 사용자 지시로 화장품 카테고리 실사 1건 최초 승인: `generate-beauty-showcase-one.ts` 재사용해 "가짜정보 자동입력→최종생성" 전체 플로우 실행 요청)

> 사용자 지시: "상세페이지 길게 딱 한개의 카테고리만 만들어 보자 / 커서에 상세페이지
> 화장품 카테고리로 만들어 보라고 하고 정보들은 그냥 자동으로 가짜정보들 싹 넣고 한번
> 제작 해보라해 / 결과물 한번 봐보자" — **실제 `/create` 최종 생성(유료 API 포함)을
> 정확히 1건, 화장품 카테고리로 실행하라는 명시적 신규 허가**(214차 "2건만"과 동일
> 성격의 스코프 한정 허가, 이번엔 "1건").
>
> 코드 재작성 없이 기존 자산 재사용 — `scripts/generate-beauty-showcase-one.ts`(139차
> 시점 제작, 현재 export 함수 시그니처와 grep으로 호환 재확인)가 정확히 이 요청과 같은
> 일을 하는 스크립트임을 확인: Pexels 무료 사진 크롤(화장품 세럼류 8장) → `/create` 폼에
> 하드코딩된 가짜 제품 정보(제품명 "라이트 워터 히알루론 세럼", 브랜드 "페이즐리랩",
> 가격 34800원, 타겟/핵심기능/성분/인증/도매상세 전부 더미 텍스트로 미리 채워짐) 자동
> 입력 → "승인하고 최종 생성" 클릭(실제 프로덕션 생성 파이프라인, 배경 후보 피커까지
> 자동 처리) → 결과 페이지에서 `sessionStorage`의 `pagzly-create-result` 저장 → 같은
> 세션으로 export HTML(`buildDetailPageHtml`) 재생성 → 라이브 미리보기·풀페이지
> 스크린샷 2장 캡처. 새 스크립트 설계 불필요, 실행만 하면 됨 — `cursor_brief_244cha_...md`
> 작성해 정확히 1회 실행·정확한 비용 보고를 명시.
>
> 목적: 243차까지의 코드 조사로는 확인 못 했던 "배경색/인포그래픽이 디자이너급으로
> 자연스러운가"를 실제 최신 코드 기준 렌더 결과물로 직접 육안 대조할 첫 기회 — 스크린샷·
> export HTML 둘 다 받아 Claude가 독립적으로 시각 검토 예정. 결과에 따라 버그/취향
> 재분류.

---

## 요약 (2026-09-23 / 243차실행검증 완료 — image_text 카피 매칭 preferForSlot 전 슬롯 확장 확정)

> Cursor가 `review/243cha-report.md`로 실행 완료 보고("ALL PASS", 파일 1개
> `lib/assign-section-images.ts`, 유료 API 0). Claude가 PC 실제 파일 재스테이징 후
> 독립 검증: `preferForSlot()` 시그니처에 `sectionText`/`imageTags`/`imageReasons` 3개
> 파라미터 추가, 신규 export `pickBestIndexByCopy()`(브리프의 `bestByCopy` 설계와
> 로직 완전 동일 — 후보 0장→fallback, 1장→그대로, 카피 없음→첫 후보, 전부 0점→첫 후보
> 폴백)가 `rolePrefer`/`preferLifestyleComposite`/`preferLifestyleAi` 3곳에 전부
> 배선된 것을 코드로 직접 대조·확인. `texture_feel`의 `details[1]` 직접 분기(카피
> 매칭 대상에서 명시적으로 제외하기로 브리프에서 정한 부분)가 원본 그대로 보존된 것도
> 정규식 대조로 확인. 호출부(`sections.forEach` 안)가 `sectionCopyText(section)`·
> `options?.imageTags ?? []`·`options?.imageReasons ?? []`를 정확히 넘기는 것도 확인.
> Cursor의 검증 스크립트(`243cha-image-text-copy-match-verify.ts`)를 전문 열람 —
> `assignDistinctSectionImages()` 실제 함수를 그대로 호출하는 공정한 테스트(재구현
> 아님) 확인, 그 안의 usage_scenario/coordination 픽스처 채점 결과(각각 이미지 인덱스
> 2/1로 서로 다른 사진 배정)를 Claude가 `scoreImageForCopy`의 토큰/부분문자열 겹침
> 규칙으로 **손으로 직접 재계산**해 동일한 승자가 나옴을 스크립트 신뢰 없이 재확인
> (예: usage_scenario 카피 "면소재 코튼 데일리룩…" vs 후보1 태그 ["가죽가방","레더"]=0점,
> 후보2 태그 ["면소재","코튼","데일리룩"]=9점 → 후보2 승). `DETAIL_SLOT_PRIORITY`
> 경로(`allocatePreferQueue`)는 이번 수정과 완전 무관하다는 브리프의 설계 그대로 유지
> 확인. §3에서 §1로 이동. 유료 API 0건.

---

## 요약 (2026-09-23 / 243차 — 사용자 지시 "사진 배치도 글에 맞게" 조사: image_text 카피 매칭이 11개 슬롯에만 배선된 구조적 원인 확정·브리프 작성, "배경색/인포그래픽 자연스러움"은 입력 기근으로 보류)

> 사용자 지시 2건 동시 접수: (1) "뒤에 배경색이랑 인포쪽 더 자연스럽고 디자이너가 만든
> 수준으로", (2) "사진 배치도 글에 맞게 들어가야해". 둘 다 스크린샷 없이 텍스트로만
> 전달돼, 148/160차 "억지 채택 금지"·"입력 기근 함정" 원칙에 따라 코드부터 먼저
> 감사해 버그/취향/입력부족을 나눔.
>
> **(2) 사진 배치 — 코드로 원인 확정, 브리프 작성 완료.** `lib/assign-section-images.ts`
> 전수 대조 결과, 114차가 만든 카피 매칭 타이브레이커(`scoreImageForCopy`/
> `sectionCopyText`, `lib/copy-image-match.ts`)가 실제로 존재하지만
> `DETAIL_SLOT_PRIORITY` 11개 슬롯(ingredient_highlight/texture_feel/detail_zoom 등)
> 에만 배선돼 있고, 그 외 `image_text` 슬롯(quick_points/coordination/usage_scenario/
> model_multicut/serving_suggestion/packaging_design 등 — 실무에서 더 자주 쓰이는
> 슬롯들)은 `preferForSlot()`이 role 태그의 **고정 첫 번째 인덱스**만 기계적으로 고름 —
> 글 내용과 전혀 무관. 사용자 체감 "사진이 글과 안 맞는다"의 구조적 원인을 코드로 특정.
> 114차와 동일 안전장치(role 게이팅 안 넘음, 후보 1장 이하면 기존 동작 100% 동일, 전부
> 0점이면 first-index 폴백)를 그대로 상속하는 방식으로 `scoreImageForCopy` 재사용 범위만
> 확장 — 새 스코어링 로직 설계 없음(240/242차와 동일 "재사용 우선" 원칙). Vision 태그는
> 이미 파이프라인에 있는 기존 데이터라 유료 API 신규 호출 0건.
> `cursor_brief_243cha_image_text_copy_match_scope_widen.md` 작성, Cursor 실행 대기.
>
> **(1) 배경색/인포그래픽 자연스러움 — 입력 기근으로 판단, 브리프 보류.**
> `lib/design-tokens.ts`(패턴 A/B/D/E 그라디언트, `SECTION_PATTERN_CYCLE`,
> `getSectionBackground()`)를 코드로 감사했으나 명확한 버그(계산 오류·토큰 오사용 등)를
> 찾지 못함 — 이 시스템은 148/169/188/189/194차에 걸쳐 이미 여러 번 튜닝됐고(194차엔
> 사용자 피드백 "물방울이 튀는 것 같다"로 `CATEGORY_PATTERN_ENABLED=false` 처리한 전례도
> 있음), "더 자연스럽게"·"디자이너급"이 코드 결함인지 톤 튜닝(취향)인지 텍스트만으로는
> 구분 불가능. 최근 생성된 실제 렌더 결과물(라이브/export 스크린샷)도 세션에 없어 시각
> 대조로도 확인 못 함 — **버그로 단정해 억지로 브리프를 쓰지 않음**. 사용자에게 구체적인
> 스크린샷(어느 카테고리·어느 섹션의 배경/인포그래픽이 어떻게 부자연스러운지) 또는 참고
> 레퍼런스를 요청함 — 148/160차와 동일 원칙.

---

## 요약 (2026-09-23 / 242차실행검증 완료 — comparison_table 불린 셀 export 배지 확정)

> Cursor가 `review/242cha-report.md`로 실행 완료 보고("ALL PASS"), 스크린샷 `review/242cha-
> comparison-table-boolish/comparison-table-badges-export.png`. Claude가 PC 실제 파일을
> 재스테이징해 독립 검증. **파일 범위**: 브리프 스코프 그대로 3개(신규 `lib/comparison-cell-
> classify.ts`, 수정 `components/DetailSectionRenderer.tsx`·`lib/export-detail-html.ts`).
> `DetailSectionRenderer.tsx`에서 `function classifyBoolishCell` 지역 정의가 삭제되고
> `import { classifyBoolishCell } from "@/lib/comparison-cell-classify"`로 교체됐음을 grep으로
> 확인, 호출부(`ComparisonValueCell`)는 무변경. 신규 `lib/comparison-cell-classify.ts`는
> 라이브 원본 정규식과 바이트까지 동일(복붙 추출, 로직 변경 없음). `export-detail-html.ts`의
> `case "comparison_table":`에 브리프가 지정한 `comparisonCellHtml` 헬퍼(28px 원형 배지,
> accent 틴트 0.12/0.2·회색, `&#10003;`/`&#10005;` 글리프)가 정확히 삽입되고 두 `<td>` 호출부
> (`row.values[0]`→`emphasized:false`, `row.values[1]`→`emphasized:true`)가 브리프와 완전히
> 일치. **독립 재검증**: Cursor의 검증 스크립트를 신뢰하지 않고 실제 생성된
> `comparison-table-export.html`을 직접 grep — `border-radius:9999px` 발생 7건을 발견해
> 처음엔 브리프가 예상한 6건(3행×2열)과 안 맞는 것처럼 보였으나, Python으로 각 발생 위치의
> 주변 문맥을 직접 대조해 7번째가 이번 수정과 무관한 기존 섹션 브리더(section breather)
> 장식용 6×6px 점(`border-radius:9999px`, 원래부터 있던 코드)임을 확인 — 실제 신규 배지는
> 정확히 6개(방수/무선/보증 3행×2열), "무게"(3.5kg/2.1kg) 행은 배지 없이 일반 텍스트 그대로
> 보존됨을 재확인. 각 셀의 `aria-label`(있음/없음/지원/미지원/O/X)과 체크/X 글리프 대응도
> 직접 grep으로 3/3 일치 확인. 스크린샷 직접 열람 — 방수/무선/보증 3행 모두 "일반" 열엔
> 진한 회색 체크, "본 제품" 열엔 옅은 X 원형 배지, "무게" 행만 숫자 텍스트로 정확히
> 렌더링됨을 육안 확인. `comparison_chart` case는 무관 영역이라 이번 수정의 영향 없음도
> 코드 위치로 재확인. **유료 API 0건, §3에서 §1로 이동.**

## 요약 (2026-09-23 / 242차 — comparison_table "있음/없음"류 불린 텍스트가 export에서 체크/X 배지가 아닌 맨 텍스트로 나오는 버그 발견, 브리프 작성)

> 241차실행검증 완료 직후, 같은 날 시작한 "React 컴포넌트 태그 전수 대조" 축을 이어서 재검토
> — 처음엔 무관/오탐으로 기각했던 `ComparisonValueCell`을 재조사(comparison_chart의
> `ComparisonMetricRow`/`ComparisonChecklistRow`와 달리, `ComparisonValueCell`은 별도
> 섹션 타입 `comparison_table`(2열 표)에서 쓰임을 확인 — 처음 스크리닝에서 comparison_chart
> 하나로 뭉뚱그려 기각한 것이 안일한 판정이었음, 재확인해 정정).
>
> **확정**: `lib/types/generate.ts:260`이 `comparison_table`을 "**불린/텍스트 2열**
> 비교"(comparison_chart의 수치 바 차트와 대비)로 명시 — "있음/없음"류 텍스트 셀은 이
> 섹션의 예외가 아니라 설계 의도 그 자체. 라이브(`DetailSectionRenderer.tsx:356-408`)는
> `classifyBoolishCell()`(정규식으로 "있음/지원/가능/O/예" 등→yes, "없음/미지원/불가/X/
> 아니오" 등→no 판정)로 분류해 `ComparisonValueCell`이 원형 체크/X 배지(28px, accent 틴트/
> 회색)로 렌더링하는데, export(`export-detail-html.ts`의 `case "comparison_table":`)는
> 이 판정 로직이 전무해 항상 `esc(row.values[...])` 맨 텍스트로 나감 — `classifyBoolishCell`이
> 애초에 컴포넌트 파일 내부 비export 지역 함수라 import 자체가 불가능한 구조였음.
> `comparison_chart`의 checklist ✓/✗(`comparisonChecklistPresent`)는 숫자(0/100 플래그)
> 기반의 별도 함수라 재사용 불가 확인, 별도 구현 필요.
>
> **수정 설계 — 240차와 동일 원칙(재사용 우선)**: `classifyBoolishCell`을 신규
> `lib/comparison-cell-classify.ts`로 추출(로직 완전 무변경), 라이브는 지역 함수 정의 삭제 후
> import로 교체(동작 100% 동일), export는 같은 함수를 import해 라이브와 동일한 판정 기준으로
> 원형 배지 HTML을 생성 — 두 렌더러가 서로 다른 텍스트 정규식을 독립적으로 유지하다 또
> 갈라지는 것을 애초에 구조적으로 방지(공유 파일 1곳만 고치면 항상 양쪽 동시 반영).
> 아이콘은 export가 기존에 이미 쓰던 "원형 배지+유니코드 글리프" 관례(comparison_chart
> checklist가 이미 이 패턴)를 그대로 따름, 신규 시각 언어 도입 아님.
> `cursor_brief_242cha_comparison_table_boolish_cell_export_missing.md` 작성·전달, Cursor
> 실행 대기. 유료 API 0건(조사·브리프 작성 모두).

## 요약 (2026-09-23 / 241차실행검증 완료 — stat_infographic ring 원형 게이지 export 배선 확정)

> Cursor가 `review/241cha-report.md`로 실행 완료 보고("ALL PASS · 231~238 회귀 OK"), 스크린샷
> `review/241cha-stat-infographic-ring/ring-gauge-export.png`. Claude가 PC 실제 파일을
> 재스테이징해 독립 검증. **파일 범위**: `lib/export-detail-html.ts` 1개만 변경(75528→
> 77577바이트, +2049바이트), `components/DetailSectionRenderer.tsx`는 mtime 완전 동일(무변경)
> 확인. Python으로 바이트 단위 재계산 — 신규 `if (m.style === "ring")` 분기 블록 1864바이트+
> CSS keyframe/reduced-motion 추가분 171바이트 ≈ 2035바이트로 전체 diff(2049바이트)를 거의
> 전부 설명, 그 외 설명 안 되는 변경이 사실상 없음을 확인(잔여 14바이트는 reduced-motion
> 셀렉터에 `.ring-fill` 10자 추가 등 사소한 경계 오차). **diff 대조**: `case "stat_infographic":`
> 내부에 브리프가 지정한 그대로 `if (m.style === "number")` 분기 다음·기존 bar 폴백(`const
> barColor = ...`) 이전에 `if (m.style === "ring")` 분기가 삽입됐고, size=112·strokeWidth=10·
> `radius=(size-strokeWidth)/2`·`circumference=2π·radius`·`offset=circumference*(1-pct/100)`
> 공식이 브리프 스펙과 코드 대조로 완전히 일치, 기존 number/bar 분기 코드는 위치만 그대로
> (재배치 없이) 바이트까지 동일하게 보존됨을 확인. 공유 `<style>` 블록에도 `@keyframes
> ringFill`+`.ring-fill` 애니메이션과 `prefers-reduced-motion` 셀렉터로의 `.ring-fill` 추가가
> 브리프와 정확히 일치. **독립 재검증**: Cursor의 검증 스크립트(`241cha-stat-infographic-
> ring-verify.ts`)를 전문 열람 — 실제 프로덕션 `buildDetailPageHtml()`을 직접 호출하는(재구현
> 아닌) 공정한 테스트로, number/ring×2/bar 혼합 픽스처와 ring 전용 스크린샷 픽스처 둘 다
> 생성함을 확인. 그와 별개로 Claude가 Cursor의 콘솔 출력을 신뢰하지 않고, 실제 생성된
> `mixed-styles.html` 파일을 직접 grep — `class="ring-fill"` 정확히 2개, `class="fill-bar"`
> 1개(bar 스타일 유지), `40h`+`font-size:3rem`(number 스타일 유지), 각주 마크+"자사 설문"
> 텍스트(각주 로직 ring에서도 정상), `@keyframes ringFill`·reduced-motion 셀렉터 전부 실제
> 파일 내용으로 재확인. **`stroke-dashoffset` 값을 Claude가 직접 손으로 재계산**(radius=51,
> circumference=2π·51≈320.4424, percent=30→offset≈224.3097, percent=80→offset≈64.0885)해
> 파일에서 추출한 실제 값(`224.30971546631122`/`64.08849013323176`)과 완전히 일치함을
> 재확인 — 스크립트의 assert 결과가 아니라 별도 계산으로 도달. `ring-gauge-export.png`
> 스크린샷을 직접 열람 — 65%·80% 두 원형 게이지가 정확히 그 비율만큼 채워진 원호로,
> 중앙 숫자·하단 라벨과 함께 실제로 렌더링됨을 육안 확인(디자인 의도와 완전히 일치).
> `comparison_chart` case는 무관 영역이라 `ring-fill` 참조 없음도 grep으로 재확인. **유료
> API 0건, §3에서 §1로 이동.**

## 요약 (2026-09-23 / 241차 — stat_infographic "ring"(원형 게이지) 스타일이 export에서 막대바로 오출력되는 버그 발견, 브리프 작성)

> 240차실행검증 완료 후 "다음 지시사항"으로, 233~235차가 소진시킨 "hero vs 라이프스타일 함수
> 대조" 기법 대신 새 축으로 전환 — `DetailSectionRenderer.tsx`에서 쓰는 React 컴포넌트
> 태그를 전수 나열(`grep -oE '<[A-Z][A-Za-z0-9]*'`)해 `export-detail-html.ts`에 동일 이름
> 참조가 없는 항목들을 1차 스크리닝. 대부분(FoodRatioDiagram·IngredientRingDiagram 등)은
> export가 다른 함수명(`buildXxxSvg`)으로 이미 구현 중임을 확인해 기각, `UsageOrderFlowDiagram`도
> `buildUsageOrderFlowSvg`로 이미 두 case(`usage_steps`·`step_card`) 양쪽에 배선돼 있음을
> 코드로 확인해 기각(오탐). `ColorVariationInteractive`는 라이브 전용 인터랙티브 위젯(정적
> export엔 애초에 불필요)으로 판단, 기각. `ComparisonChecklistRow`/`ComparisonMetricRow`/
> `ComparisonValueCell`/`MetricBar`는 export의 `comparison_chart` case가 같은 시각 결과를
> raw HTML로(컴포넌트명 없이) 이미 구현 중임을 코드 대조로 확인, 기각.
>
> **확정 1건**: `RadialGauge`만 export에 대응 코드가 전혀 없음 — `lib/types/generate.ts:370`에
> `stat_infographic` metric의 `style`이 `"bar"|"number"|"ring"` 3종 정식 타입이고,
> `app/api/generate/route.ts`의 DeepSeek 프롬프트가 "비율/점유율 수치는 style:bar|ring+percent로
> (원형 강조는 ring)"이라고 명시적으로 지시해 실제 생성 데이터에 등장하는 정상 경로임을 확인.
> 라이브(`DetailSectionRenderer.tsx:2619-2621,2747`)는 `numberMetrics`/`ringMetrics`/
> `barMetrics` 3그룹으로 나눠 ring은 `RadialGauge`(SVG 원, size=112·strokeWidth=10)로
> 렌더링하는데, export(`export-detail-html.ts:319-329`)는 `m.style === "number"` 분기
> 하나뿐이고 `"ring"`을 별도 취급하는 코드가 전무(grep 0건) — `"ring"` metric이 그대로
> `"bar"` 폴백으로 흘러 판매자가 실제로 내보내는 페이지에서 원형 게이지가 막대바로
> 바뀌어 나감. 231/232/236차와 같은 "라이브/익스포트 시각 불일치" 결함 계열.
>
> **수정 설계**: RadialGauge의 기하(size 112·strokeWidth 10·`stroke-dashoffset`로 percent
> 표현)를 정적 SVG로 그대로 이식 — 애니메이션은 기존 `.fill-bar`(scaleX keyframe) 패턴과
> 동일하게 순수 CSS `@keyframes`(`stroke-dashoffset` 보간)로 대체해 JS/IntersectionObserver
> 불필요, `prefers-reduced-motion` 대응도 기존 셀렉터 목록에 `.ring-fill` 추가로 일관 유지.
> **스코프 밖으로 명시 제외**: 라이브가 number/ring 그룹에 씌우는 `LayeredPanel` 카드+
> `ConceptBadgeIcon` 장식(export는 단순 리스트)은 이번 수정보다 훨씬 큰 스코프라 손대지
> 않음 — "모양 자체가 다른 것(원↔막대)"이라는 명백한 버그만 좁게 수정.
> `cursor_brief_241cha_stat_infographic_ring_style_export_missing.md` 작성·전달, Cursor
> 실행 대기. 유료 API 0건(조사·브리프 작성 모두).

## 요약 (2026-09-23 / 240차실행검증 완료 — 라이프스타일 hero급 안전장치 배선 확정, 매칭 3축 재검증은 목적 미달성으로 정직 기록)

> Cursor가 `review/240cha-report.md`로 실행 완료 보고("ALL PASS · 231/232/236/237 회귀 OK").
> Claude가 PC 실제 파일을 재스테이징해 독립 검증. **파일 범위**: `lib/photo-enhance.ts`·
> `lib/lifestyle-product-composite.ts` 2개만 변경, `photo-composite.ts`·`generate-lifestyle-
> shots.ts`·`components/` 전부 무변경(mtime 대조). **diff 대조**: `photo-enhance.ts`는
> `export` 키워드 3곳 추가만(로직 무변경)임을 **바이트 단위로 교차검증** — 원본 80696바이트
> → 수정본 80717바이트, 차이 정확히 21바이트 = `"export "` 7글자×3, 이 80KB+ 파일에서 그
> 외 어떤 문자도 바뀌지 않았음을 강력히 뒷받침. `lifestyle-product-composite.ts`는 브리프가
> 지정한 `scoreLifestyleCutout`/`isLifestyleCutoutAcceptable`(hand -1000/plateRisk -500/
> transparentRatio<0.05 -400/cornerAlpha≥40 -300, 나머지는 120·0.8·45·20 가중합) 상수·공식이
> hero와 정확히 동일하게 이식됐음을 확인, `removeProductBackground()`가 hero와 동일한 3단
> `cropAttempts`([pad 0.04]→[pad 0.025,strict]→[pad 0.012,strict,skipIfBoxAreaAbove 0.95])
> 재시도 루프로 재작성됨을 확인, 구 호출부의 중복 trim/purge/defringe가 제거되고 새
> `removeProductBackground()` 내부 한 곳으로 통합돼 `rg`로 각 함수가 정확히 1곳에서만
> 호출됨을 재확인(죽은 코드 없음). **사소한 브리프 이탈 1건(문제 아님으로 판단)**: Cursor가
> `data:` URL 입력에도 `preCropSourceToProduct`를 시도 후 실패 시 원본 폴백하는 try/catch를
> 추가 — 브리프의 "data: URL은 preCrop 스킵"보다 더 견고한 방향의 자체 개선.
>
> **실사진 2건 라이브 검증 결과 — 정직 기록**: electronics(아로마 디퓨저, 어두운 배경+
> 유광 반사+컬러 조명)·fashion(옷걸이+행거 프레임이 그대로 잡힌 오버사이즈 티셔츠) 두
> 케이스 전부 **3회 rembg 재시도 전부 `plateRisk=true`로 실패**(corner-alpha 124~214로
> 임계값 40을 크게 초과) → 신규 게이트가 정확히 발동해 픽셀 페이스트를 드롭하고 기존
> nano-banana AI 폴백으로 대체(비용 ≈$0.099). 손-오염 검출 0/6, clarity-upscaler는 **6회
> 시도 전부 HTTP 429**(Replicate 레이트리밋)로 보정 전 컷아웃으로 폴백. Claude가 직접
> `electronics-product.jpeg`(근접·유광·저조도)·`fashion-product.jpeg`(옷걸이 레일 프레임이
> 사진 모서리를 채움)를 열람 — 둘 다 **스튜디오 화이트-백 상품컷이 아니라 그 자체로
> "스타일드" 촬영물**이라 segmentation이 실제로 어려운 입력임을 육안 확인, 게이트 발동이
> 캘리브레이션 결함이 아니라 정당한 안전장치 동작이라는 정황 증거로 판단. **다만 이번
> 2건의 라이브 호출은 원래 목적("211~218차 매칭 3축이 실사에서 자연스러운 결과를 내는지
> 재검증")을 달성하지 못했음을 분명히 기록** — `pasteCutoutOnScene`(매칭 3축 코드가 있는
> 곳)은 컷아웃이 게이트를 통과해야 호출되는데, 이번 2건 모두 게이트에서 드롭돼 그 이후
> 코드 경로 자체가 실행되지 않았음. 즉 hero급 안전장치 자체의 "거부 동작"은 실증됐지만,
> 매칭 3축이 실제 사진에서 자연스러운 합성을 만드는지는 **여전히 육안 미확인** 상태 — §4의
> 211차 항목은 완료 처리하지 않고 그대로 유지.
>
> **§1로 이동 2건(코드·배선 완료로 판단)**: (1) rembg 3단 재시도+손-오염 검사+품질 게이트
> — 게이트의 "거부" 분기가 의도대로 정확히 작동함을 실사진으로 실증했으므로 안전장치 자체는
> 완료로 인정. (2) 라이프스타일 clarity-upscaler 배선 — 호출 자체는 6/6 정상 발생 확인(다만
> 전부 429로 실제 보정 성공 사례는 미관측, 운영 이슈로 별도 기록). **§4에 남긴 1건**: 211차
> 매칭 3축 "실사 자연스러움" 검증은 이번 2건으로 답을 얻지 못해 계속 미해결 유지 — 다음에
> 재검증하려면 게이트를 통과할 만큼 깨끗한(스튜디오 화이트-백) 상품컷으로 테스트하거나,
> 게이트를 임시 우회하는 별도 QA 경로가 필요. **유료 API 2건 소진($0.099), 허가 범위(hero급
> 안전장치 영구 기본값 + 실사진 2건) 내에서 정확히 사용 완료 — 추가 허가 없이는 더 이상
> 생성 API 호출 금지 원칙 복귀.**

## 요약 (2026-09-23 / 240차 — 라이프스타일 hero급 안전장치 유료 허가·브리프 작성)

> 239차("솔직한 레벨 체크")에서 "정보·레이아웃은 후커블급 근접, 사진 합성은 아직"이라고 정직하게
> 보고한 뒤, 사용자가 "이거 하는데 지금 유료api 호출은 더 해도 상관은 없어 / 지시사항 남겨줘"로
> 응답. 영구 프로덕션 비용 증가가 걸린 결정이라 AskUserQuestion으로 범위를 재확인 — (1) 라이프
> 스타일 hero급 안전장치(rembg 재시도 3회+손-오염검사+clarity-upscaler)를 **기본값으로 영구
> 적용**(권장 선택), (2) 211~218차 매칭 3축의 실사진 재검증 **정확히 2건**으로 확정.
>
> 코드 조사 결과 §4가 "신규 Claude vision 손-오염 검사 추가 필요"라고 적어뒀던 것과 달리,
> `lib/vision-utils.ts`의 `detectCutoutHasHandOrPerson()`이 **이미 존재하고 hero가 실제로
> 쓰고 있는 바로 그 함수**임을 확인 — 신규 설계 불필요, import만 추가하면 재사용 가능. 마찬가지로
> hero의 `preCropSourceToProduct()`/`sharpenCutout()`(photo-enhance.ts)도 `export` 키워드
> 추가만으로 그대로 재사용 가능함을 확인 — 새 로직을 설계하지 않고 검증된 hero 로직을 그대로
> 이식하는 방향으로 브리프를 확정. `lib/lifestyle-product-composite.ts`의
> `removeProductBackground()`를 hero의 `cropAttempts`+`scoreCutout`+`isCutoutAcceptable`
> 패턴(상수·공식 동일 복제)으로 재작성, 호출부의 중복 trim/purge/defringe 제거(이제
> `removeProductBackground()` 내부에서 스코어링 이전에 적용), `runNanoBanana` 폴백 경로가 쓰는
> `cutoutUrl`은 유지하면서 픽셀 페이스트용 `cutoutBuffer`를 추가 반환하는 설계로 기존 폴백
> 호환성 보존. `cursor_brief_240cha_lifestyle_hero_parity_safeguards.md` 작성·전달 완료,
> Cursor 실행 대기. §4의 "Vision 주석 오버레이 4카테고리 확장" 항목은 이번 허가 범위 밖으로
> 명시적으로 제외.

## 요약 (2026-09-23 / 238차실행검증 완료 — 사진 1장 패션 컬러옵션 오인 버그 수정 확정)

> Cursor가 `review/238cha-report.md`로 실행 완료 보고("검증 ALL PASS · 231/232/236/237
> 회귀 OK"). Claude가 PC 실제 파일을 재스테이징해 독립 검증. **파일 범위**: `lib/`·
> `components/`·`scripts/` 전체 mtime 대조 결과 브리프 스코프 그대로 `lib/assign-section-
> images.ts` 1개 파일만 새 mtime으로 변경, `components/DetailSectionRenderer.tsx`·
> `lib/export-detail-html.ts`는 237차 시점 mtime 그대로(무변경) 확인, `scripts/`에 신규
> 파일은 검증 스크립트(`238cha-single-photo-color-variation-verify.ts`) 1개뿐, `review/`에
> 신규 파일은 보고서 1개뿐(스크린샷 없음 — 이번 수정은 순수 함수 변경이라 Playwright 캡처가
> 브리프 검증 스펙에 없었음, 타당함). **diff 대조**: 변경 파일이 브리프 스펙과 바이트 단위로
> 일치(주석 포함) — `imageCount === 1` 분기에서 `color_variation`을 filter로 제거, 도달
> 불가능해진 구 매핑 브랜치 삭제. grep으로 `color_variation` 참조 5곳 확인 — 분기 안엔 filter
> 1곳만 남고, `imageCount >= 2`용 "least-used 전역 배정" 경로(693·820·924행)는 브리프가
> 약속한 대로 손대지 않았음을 재확인. **독립 재검증**: Cursor의 검증 스크립트를 전문 열람 —
> `assignDistinctSectionImages()`를 직접 호출하는 공정한 테스트(imageCount=1/2/3, color_
> variation 없는 픽스처, 기타 5개 슬롯 회귀)임을 확인. 그와 별개로 Claude가 Cursor의 스크립트를
> 신뢰하지 않고, staged 소스에서 직접 읽은 `imageCount===1` 분기 로직을 **처음부터 별도로
> 독립 재구현**해 클라우드 샌드박스에서 `tsx`로 실행 — color_variation 완전 제거·나머지 5개
> 섹션(hero/gallery/step_card/spec_table/image_text) imageIndex 전부 0 강제·섹션 개수·순서
> 정확히 일치를 Cursor 스크립트와 완전히 무관한 경로로 재확인(`ALL PASS`). **유료 API 0건,
> §1로 이동, §3 237차 항목 이동에 이어 다시 소진.**

## 요약 (2026-09-23 / 238차 — "모든 카테고리·어떤 사진 입력이든 디자이너급" 전수 감사, 사진 1장 컬러옵션 오인 버그 1건 채택·나머지 3건은 §2/§4로 라우팅)

> 사용자 지시("우리는 모든카테고리가 어떻게 사용자가 사진을 넣어도 다 디자이너 수준의
> 상세페이지가 나오도록 하고 있는거야 그렇게만들어야하고")를 원 지시("사진합성 부분을
> 코딩으로 해결하자")의 스코프 확장으로 해석 — "카테고리 무관 + 사용자가 업로드하는 사진이
> 무엇이든"으로 조사 축을 넓힘. 일반-목적 서브에이전트에 사진 파이프라인 전반(카테고리별
> 조건문, 사진 장수·화질·비율 가정, 폴백 처리)을 감사 위임, 억측·수정 금지·최대 4건 캡·
> 235차 rembg 격차 재보고 금지 조건으로 스코프. 보고받은 4건을 Claude가 전부 직접 코드로
> 재확인:
> 1) 전자제품·화장품만 Vision 주석 오버레이 지원(`AnnotationDomain`이 두 카테고리 전용
> 타입, Claude Haiku Vision API 실호출 확인) — 나머지 4카테고리 확장은 매 생성 신규 유료
> Vision 호출 증가라 §4 등록, 미착수.
> 2) 라이프스타일 AI 일상샷이 cm 높이 파싱 실패 시 전체 스킵, 반려동물만 예외
> (`generate-lifestyle-shots.ts:109-117`) — `parseProductHeightCm()` 주석이 "추정 합성
> 금지"를 명시한 111차 anti-hallucination 가드레일임을 확인, 반려동물 예외는 애초에 다른
> 코드 경로(`usePixelComposite=false`)를 쓰는 구조적 차이 — 버그 아님, §2 등록.
> 3) hero는 rembg 직후 Replicate clarity-upscaler로 화질 보정하는데 라이프스타일 픽셀
> 페이스트엔 없음 — `sharpenCutout()`이 실제 유료 Replicate 호출($0.016/회)임을 확인,
> 확장 시 프로덕션 유료 호출 증가 — §4 등록, 미착수.
> 4) **(채택)** 업로드 사진이 1장뿐일 때 패션 `color_variation`(컬러별 스와치) 섹션이
> 모든 컬러 옵션에 동일 사진 1장을 강제 배정 — 라벨은 "블랙/베이지/네이비" 등 서로 다른
> 색을 주장하는데 사진은 전부 동일해 직접적 오해 유발(`assign-section-images.ts`
> `assignDistinctSectionImages()` `imageCount===1` 분기). `color_variation`이
> FASHION 전용 슬롯임을 grep으로 재확인(다른 5카테고리엔 슬롯 자체가 없음), `imageCount>=2`
> 일반 배정 경로(최소-사용 전역 배정 알고리즘)는 이미 정상 동작해 손대지 않음을 확인.
> **수정**: 사진 1장일 때 `color_variation` 섹션을 배열에서 필터링(생략) — 새 사진 생성·
> 추정 없이, package_contents/stat_infographic과 같은 "생략이 오인보다 낫다" 관례 적용.
> `cursor_brief_238cha_single_photo_color_variation_duplicate_fix.md` 작성·전달, §3 등록,
> Cursor 실행 대기. **유료 API 0건(조사·수정 모두).**

## 요약 (2026-09-22 / 237차실행검증 완료 — 패션 사이즈표 측정 오차·체형 안내 문구 배선 확정)

> Cursor가 `review/237cha-report.md`로 실행 완료 보고("검증 ALL PASS · 231/232/236 회귀
> OK"), 스크린샷 `review/237cha-fashion-size-disclaimer/size-disclaimer.png`. Claude가 PC
> 실제 파일을 재스테이징해 독립 검증. **파일 범위**: `lib/`·`components/`·`scripts/` 전체
> mtime 대조 결과 브리프 스코프 그대로 2개 파일(`components/DetailSectionRenderer.tsx`·
> `lib/export-detail-html.ts`)만 동일 타임스탬프로 변경, `lib/fashion-size-diagram.ts`·
> `components/FashionSizeDiagram.tsx`는 브리프 지시대로 무변경(구 mtime 그대로), 신규
> 파일은 검증 스크립트(`237cha-size-disclaimer-verify.ts`) 1개뿐임을 확인. **diff 대조**:
> 두 파일 모두 브리프 스펙과 정확히 일치 — 라이브는 `sizeDiagramMatches.length > 0` 게이트로
> `text-ink/40`·`text-[11px]` 기존 각주 컨벤션(같은 파일 `stat_infographic` 각주 패턴 재사용)을
> 그대로 쓴 2줄 `<p>`, export는 `sizeMatches.length > 0` 게이트로 `opacity:.4` 인라인 스타일의
> 동일 문구 2줄 — 테이블 바로 아래·`</section>` 직전 삽입 위치까지 브리프와 문자 단위로 일치.
> **독립 재검증**: Cursor의 검증 스크립트(`237cha-size-disclaimer-verify.ts`)를 전문 열람 —
> `buildDetailPageHtml()`을 실제로 호출해 FASHION+실측 매칭/FOOD `nutrition_table`/전자
> `spec_table`/FASHION+플레이스홀더(매칭 0건) 4가지 케이스를 API 호출 없이 테스트하고, 231/232/
> 236차 기존 회귀 스크립트까지 재실행하는 공정한 스크립트임을 확인. 그와 별개로 Claude가
> Cursor의 검증 스크립트를 신뢰하지 않고, 그 스크립트가 생성한 실제 export HTML 픽스처 3개
> (`fashion-with-diagram.html`·`fashion-no-diagram.html`·`fashion-session-export.html`)를
> **직접 grep으로 재확인** — 실측 매칭 케이스에 안내문 A/B 각 정확히 1건, 플레이스홀더·FOOD·
> 전자 케이스엔 0건, 181차 실제 패션 라이브 세션 export(`fashion-session-export.html`, 실측
> 매칭 0건인 실제 데이터)에도 0건으로 게이팅이 올바르게 작동함을 스크립트의 콘솔 출력이 아닌
> 실제 파일 내용으로 재확인. 스크린샷(`size-disclaimer.png`) 직접 열람 — 사이즈표(어깨너비/
> 가슴단면/총장/소매길이) 바로 아래 회색 소문자로 안내 2줄이 정확히 렌더링됨을 육안 확인.
> **유료 API 0건, §1로 이동, §3 다시 소진.**

## 요약 (2026-09-22 / 237차 — 패션 카테고리 신규 디자이너 벤치마크: 사이즈표 측정 오차·체형 안내 문구 누락 발견, 나머지는 대부분 이미 해결됨 확인)

> 사용자 지시 "237차 지시사항 남겨줘. 조건은 코딩만으로 디자이너와 후커블이 만든 상세페이지
> 퀄리티가 나와야해"에 직접 응답. 228/230차가 같은 날 전자제품·생활용품·화장품/뷰티를 이미
> 재크롤링했으므로, `Projects.project_search`로 카테고리별 최근 크롤링 이력을 먼저 확인한 뒤
> **패션/의류**(마지막 전용 크롤링 151/181차, 8일+ 경과)를 이번 라운드 타깃으로 선택. Behance에서
> "의류 상세페이지"/"청바지 상세페이지" 검색 후 "반팔 상세페이지 디자인"(Sora Shin, 로얄리노
> 스퀘어넥 반팔티)을 전체 스크롤 직접 열람(히어로→사이즈 실측 다이어그램+표→1+1 SET→피처
> 콜아웃→모델 멀티컷 갤러리→세탁 안내→PRODUCT INFO 순), 158/159/160/181/219/228/230차와 동일한
> 4축+3분류 방법론 적용. 두 번째 후보("청바지" 검색 1위, Yilurira.D La-Star)는 청바지와 무관한
> 스톡 배너가 섞인 저품질 템플릿이라 벤치마크 기준으로 채택하지 않음(148/160차 "억지 채택 금지").
> **관찰한 패턴을 전부 코드와 먼저 대조**(148/160차 "입력 기근 함정" 교훈) — 레퍼런스의 실측
> 다이어그램(의류 실루엣+치수선 오버레이)을 신규 격차로 의심했으나 `lib/fashion-size-diagram.ts`+
> `components/FashionSizeDiagram.tsx`로 110/113/161/175차에 이미 구현되고 라이브
> (`DetailSectionRenderer.tsx:2101`)·export(`export-detail-html.ts:690`) 양쪽에 동일 배선돼
> 있음을 확인, 피처 콜아웃(사진 위 강조 문구)도 이미 `feature_callout`(말풍선 스타일)로 대응됨을
> 확인(시각 표현 차이만 있음 — 취향 차이로 분류, 미채택), PRODUCT INFO 표·1+1 SET·컬러 스와치도
> 전부 기존 슬롯으로 대응됨을 재확인. 라이브·export의 모든 `case "..."` 문자열과
> `isFashionCategory()` 사용처를 diff — **완전히 동일**(패리티 문제 0건), 236차 이전까지 반복
> 발견되던 "라이브만 배선, export 누락" 패턴이 패션 카테고리엔 없음을 확인. **확정 1건**: 사이즈
> 실측 다이어그램+표 바로 아래에, 레퍼런스엔 항상 있는 "측정 방법에 따라 1~3cm 오차 발생 가능"/
> "체형마다 착용감 차이" 안내 문구가 Pagzly엔 어디에도 없음 — `ai_disclosure` 슬롯과 같은 클래스의
> **서버 고정 캡션**(AI 생성 아님, 새 입력 불필요, 환각 위험 없음)이라 다이어그램이 실제로 표시될
> 때만(`sizeDiagramMatches.length > 0`) 조건부로 붙이면 되는 순수 코드 격차. 스타일은 같은 파일의
> `stat_infographic` 각주 컨벤션(라이브: `text-ink/40` + `text-[11px]`, export: `opacity:.4`)을
> 그대로 재사용해 기존 패턴과 통일. `cursor_brief_237cha_fashion_size_table_measurement_disclaimer.md`
> 작성·동기화, Cursor 실행 대기. 유료 API 0건.

## 요약 (2026-09-22 / 236차 — "흐름·인포그래픽" 축으로 전환: 식품 TOC 앵커 누락 + hero/CTA 북엔드 클립 export 누락 발견, 브리프 작성)

> 235차실행검증 완료 후 "다음 지시사항"으로, 233~235차를 이끌던 "hero vs 라이프스타일 함수
> 호출 대조" 기법이 소진됐음을 먼저 직접 확인(남은 3개 함수 `buildSoftContactShadowSvg`/
> `unifyCompositeGrain`/`makeComparisonPair`를 각각 코드로 추적 — Bria 사전합성 전용 분기,
> 실사진엔 불필요한 전체 프레임 균일 그레인, 완전히 무관한 before/after 텍스처 기능으로 확정,
> 억지 구현 금지 원칙에 따라 전부 제외). 원 지시의 나머지 절반 "흐름과 인포그래픽"으로 축
> 전환 — 일반 목적 서브에이전트에게 `section-templates.ts`(카테고리별 실제 슬롯 진실)를
> 먼저 읽고 흐름/인포그래픽 관련 코드(앵커 내비, 스크롤 진행바, AIDA, 사용 순서 플로우
> 다이어그램 등)를 추적하는 조사를 위임, "재현 가능·코드 결함만, 취향/추측 금지" 기준을
> 명시. 보고받은 2건 후보 전부 Claude가 직접 코드로 재확인(제3의 후보 `resolveSplitFlexRatio`는
> flexbox order 특성상 실제로는 정상 동작으로 판명돼 기각). **확정 1**: `section-anchor-nav.ts`의
> "제품정보" TOC 규칙이 `slot === "spec_table"` 리터럴만 검사해 FOOD의 실제 슬롯명
> `nutrition_table`과 영구 불일치(232차와 같은 결함 계열) — `buildSectionAnchors()`가 라이브
> (`DetailSectionRenderer.tsx:3837`)·export(`export-detail-html.ts:1099`) 양쪽에서 동일하게
> 호출되는 공유 로직이라 파일 하나만 고치면 양쪽 동시 해결. **확정 2**: 156차가 도입한 hero
> 직후·CTA 밴드의 "북엔드" 대각선 클립(`design-tokens.ts`의 `HERO_TRANSITION_CLIP_PATH`/
> `CTA_TRANSITION_CLIP_PATH`, 152차 다이슨코리아 등 벤치마크 근거)이 `DetailSectionRenderer.tsx`
> 에는 배선돼 있으나(hero 직후 wrapper div, cta_price 섹션 자체) `export-detail-html.ts`엔
> grep 0건 — `hero`·`cta_price`가 6개 카테고리 전부 `required: true`임을 `section-templates.ts`
> 12곳 직접 대조로 확인해 모든 생성 페이지 export에 영향을 미침을 확정. CTA 쪽은 기존
> `case "cta_price":` 블록에 clip-path+마진 2줄만 추가하는 간단한 수정, hero 쪽은 트러스트칩+
> 스펙벤토그리드를 클립 wrapper로 감싸는 수정(라이브처럼 다음 섹션 본문까지 같은 wrapper에
> 넣으면 export 루프의 bodyIndex/pointIndex/브리더 카운터 계산 순서를 건드려야 해서 회귀
> 위험이 커 이번엔 트러스트칩+벤토그리드만으로 스코프를 좁힘 — 브리프에 이 부분 차이를
> 명시적으로 문서화). `cursor_brief_236cha_food_anchor_nav_and_hero_cta_bookend_export.md`
> 작성·동기화, Cursor 실행 대기. 유료 API 0건.

## 요약 (2026-09-22 / 235차실행검증 완료 — 라이프스타일 픽셀 페이스트 컷아웃 페더링 배선 확정)

> Cursor가 `review/235cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일을 재스테이징해
> 독립 검증. **파일 범위**: `lib/`·`components/`·`scripts/` 전체 mtime 대조 결과 브리프
> 스코프 그대로 `lib/lifestyle-product-composite.ts` 1개만 변경(신규 mtime), `photo-composite.ts`·
> `photo-enhance.ts`·`components/` 전부 234차 시점과 완전 동일. 신규 파일은 검증 스크립트 1개
> (`235cha-lifestyle-feather-verify.ts`)뿐 — 234차 때와 달리 이번엔 브리프 밖 파일 터치 0건.
> **diff 대조**: import 목록에 `featherCutout`이 알파벳 순서(`defringeCutoutEdges`와
> `matchCutoutGrain` 사이)로 정확히 삽입, 호출 위치도 "극단 축소" 블록 직후·WB 매칭 직전으로
> 브리프 지정 순서(feather→WB→sharpness→grain)와 정확히 일치, `Math.max(sceneW, sceneH)` 인자·
> try/catch+`console.warn` 폴백까지 브리프 스펙과 완전히 동일. **독립 재검증**: Cursor의 검증
> 스크립트를 전문 열람 — 하드엣지(anti-alias 없는 이진 알파) 테스트 픽스처로 전/후 반투명
> 픽셀 수를 직접 측정하고 `git diff`로 photo-composite/photo-enhance 무변경까지 자체 검증하는
> 공정한 스크립트임을 확인. 그와 별개로 Claude가 **실제 staged 소스를 esbuild로 완전히 새로
> 번들한 독립 Node 샌드박스**에서 처음부터 다시 작성한 테스트 실행 — 동일한 하드엣지 픽스처에
> `featherCutout`을 직접 호출해 반투명 경계 픽셀 **0 → 4,288개로 완전히 동일 재현**(Cursor
> 보고 수치와 정확히 일치), 정사각형(1200×1200)·가로로 긴 씬(2000×500) 양쪽에서 **실제
> 프로덕션 `pasteCutoutOnScene` 함수를 직접 호출**해 씬 크기 보존 재확인. 스크린샷 2장
> (`edge-before-feather-closeup.png`·`edge-after-feather-closeup.png`) 직접 열람 — 수정 전
> 완전히 날카로운 수직 경계, 수정 후 살짝 부드러워진 경계 그라데이션을 육안으로 확인.
> `rg featherCutout lib` 결과 정의 1곳(`photo-composite.ts`)+라이프스타일 import/호출
> 2곳뿐임도 재확인. **유료 API 0건, §1로 이동, §3 다시 소진.**

## 요약 (2026-09-22 / 235차 — photo-composite.ts 17개 함수 hero/lifestyle 호출 전수 대조: 컷아웃 페더링 누락 발견 + rembg 품질 재시도 격차는 API비용 문제로 §4 분리)

> 234차실행검증 완료 후 "다음 지시사항"으로 같은 기법(233/234차가 썼던 `lib/photo-composite.ts`
> export 함수의 hero vs 라이프스타일 호출부 grep 대조)을 나머지 미확인 함수 7개
> (`measureTransparentRatio`/`measureCornerMeanAlpha`/`measureCutoutPlateRisk`/`featherCutout`/
> `buildSoftContactShadowSvg`/`unifyCompositeGrain`/`makeComparisonPair`)에 적용. **발견 1
> (채택)**: `featherCutout()`(알파 1px erode+블러로 rembg의 날카로운 경계를 반투명하게 만드는
> 순수 픽셀 보정)이 hero에서는 WB/선명도/그레인 매칭보다 먼저 반드시 거치는데(`photo-enhance.ts:1930`)
> 라이프스타일 `pasteCutoutOnScene`엔 import조차 안 돼 있음 — 실사진 배경이라 이 결함이 더 잘
> 드러나는 경로(165차 defringe와 동일 논리)인데 오히려 빠져 있었음. 실제 staged
> `photo-composite.ts`를 esbuild 번들해 별도 샌드박스에서 하드엣지 합성 이미지로 직접 재현 —
> 반투명 경계 픽셀 0→3,964개 발생(페더링 효과 실증), 비정사각 씬(1600×900)·극단 종횡비
> (2400×600) 전부 예외 없음 확인. 시그니처 변경 불필요(`canvasSize` 스칼라 1개, `buildSceneShadowSvg`
> 선례대로 `Math.max(sceneW,sceneH)` 재사용). **발견 2 (초기 오판정 자체 정정 → §4로 재분류)**:
> `measureTransparentRatio`/`measureCornerMeanAlpha`/`measureCutoutPlateRisk`를 처음엔 "QA
> 로깅 전용"으로 스코프 제외하려 했으나, `photo-enhance.ts:1725~1787`(`evaluateCutout`/
> `scoreCutout`/`isCutoutAcceptable`)을 다시 읽어 이것이 실은 **rembg 품질 재시도 루프**의
> 판정 기준(최대 3회 재호출해 최고점 채택, 전부 미달이면 AI 합성 포기하고 원본 폴백)임을
> 확인 — 라이프스타일의 `removeProductBackground()`는 rembg를 1번만 호출하고 재시도·손-오염
> 검사·폴백이 전혀 없어 hero보다 훨씬 큰 격차이지만, 이를 메우려면 프로덕션에서 판매자가
> 라이프스타일 합성을 쓸 때마다 유료 API 호출이 늘어나는 구조적 변경이라(Claude 자신의 검증
> 호출이 아님) "허가 없이 유료 API 호출 금지" 원칙 대상 — §3이 아닌 §4(API 필요·허가 대기)에
> 등록만 하고 이번 스코프에서 제외. `buildSoftContactShadowSvg`(hero 전용 추가 컨택트
> 섀도우)·`unifyCompositeGrain`(AI 생성 배경-실사 이음매용, 실사진 배경 라이프스타일엔 적용
> 대상 불분명)·`makeComparisonPair`(양쪽 다 미사용)는 다음 후보로만 기록.
> `cursor_brief_235cha_lifestyle_feather_cutout.md` 작성·동기화(페더링 1건만), Cursor 실행
> 대기. 유료 API 0건.

## 요약 (2026-09-22 / 234차실행검증 완료 — 라이프스타일 픽셀 페이스트 실루엣 그림자 배선 확정)

> Cursor가 `review/234cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일을 재스테이징해
> 독립 검증. **파일 범위**: `lib/`·`components/`·`scripts/` 전체 mtime 대조 결과 브리프
> 스코프 3개 파일(`photo-composite.ts`·`photo-enhance.ts`·`lifestyle-product-composite.ts`)
> 외에 브리프에 없던 `scripts/162cha-shadow-tint-verify.ts`(구 라운드 스크립트)가 함께
> 변경돼 있음을 발견 — 231차의 `section-display-budget.ts` 선례와 동일하게 취급해 별도로
> 스테이징·전문 열람. 실제 diff는 `buildSilhouetteShadowBuffer(cutout, 400, 400, ...)`처럼
> 새 2-인자 시그니처에 맞춰 호출부 인자 개수만 맞춘 것으로, 테스트 로직(tint 유무에 따른
> 픽셀 차이 검증)은 완전히 그대로 — Cursor의 "시그니처 맞춤(호출부 깨짐 방지)" 설명과
> 정확히 일치, 범위 이탈이나 은폐된 동작 변경 없음 확인. `components/`는 전혀 변경되지
> 않음(mtime 232차 시점 그대로)도 함께 확인. **diff 대조**: 3개 메인 파일 전부 브리프
> 스펙과 정확히 일치 — `buildSilhouetteShadowBuffer`가 `canvasSize:number` 단일 인자에서
> `canvasWidth`/`canvasHeight` 2개로 변경(내부 로직은 최종 빈 캔버스 `create` 블록 2줄만
> 변경, 알파 추출·블러·오프셋 계산 등 나머지는 전부 무변경), `photo-enhance.ts`의 유일한
> 기존 호출부는 `CANVAS_SIZE, CANVAS_SIZE`로 동작 완전 보존, `lifestyle-product-composite.ts`의
> `pasteCutoutOnScene`은 hero와 동일한 try(실루엣)/catch(`buildSceneShadowSvg` 타원 폴백,
> 완전 무변경) 패턴으로 신규 배선. `buildProductShadowSvg`(정사각형 전용 API)는 손대지
> 않고 그대로 유지됨도 확인. **독립 재검증**: Cursor의 검증 스크립트(`234cha-silhouette-
> shadow-verify.ts`)를 전문 열람해 공정한 테스트임을 확인한 뒤, 그와 별개로 Claude가
> 실제 staged 3개 파일(`photo-composite.ts`·`lifestyle-product-composite.ts` 및 그 전이
> 의존성 6개)을 esbuild로 완전히 새로 번들한 독립 Node 샌드박스에서 처음부터 다시 작성한
> 테스트를 실행 — 정사각형 1200×1200과 직사각형 1600×900 양쪽에서 그림자 불투명 픽셀 수
> **35,663개로 완전히 동일하게 재현**(Cursor 보고서의 "1200×1200 opaque 35,663 / 1600×900
> opaque 35,663"과 정확히 일치 — 그림자 모양이 컷아웃·placement에만 의존하고 canvasWidth/
> Height는 최종 캔버스 크기에만 영향을 준다는 설계 의도와도 부합), 2400×600 극단 종횡비+
> 가장자리 배치도 예외 없이 정상 출력, `pasteCutoutOnScene`(재구현이 아닌 **실제 프로덕션
> 함수를 직접 호출**)이 800×500 씬 크기를 그대로 보존함을 재확인. 스크린샷 3장
> (`lifestyle-paste-with-silhouette.png`·`compare-silhouette-layer.png`·
> `hero-square-shadow.png`) 직접 열람 — 합성 이미지·그림자 레이어 단독 렌더 결과가 코드
> 로직과 일치함을 육안 확인. `buildSilhouetteShadowBuffer` 호출부 grep 결과 정의 1곳 +
> `photo-enhance.ts`(hero) + `lifestyle-product-composite.ts`(lifestyle) + 검증 스크립트
> 2개(162cha·234cha)뿐, 구 시그니처로 남은 호출부 0건 확인. **유료 API 0건, §1로 이동,
> §3 다시 소진.**

## 요약 (2026-09-22 / 234차 — 233차에서 스코프 제외했던 실루엣 그림자 후보 재조사, 실제로는 작은 시그니처 일반화로 해결 가능함을 확인·브리프 작성)

> 233차 브리프 작성 시 "canvasSize(정사각형 전용) 시그니처라 임의 종횡비 실사진에 못 쓴다"며
> 스코프 제외했던 `buildSilhouetteShadowBuffer`를 재조사. 함수 본문을 다시 읽어보니
> `canvasSize`는 최종 빈 캔버스 생성부 딱 2줄에서만 쓰이고, 실루엣 알파 마스크·블러·오프셋
> 계산은 전부 컷아웃 자체 픽셀 크기와 `placement`만 참조 — "정사각형 전용"이 아니라
> "정사각형 값을 두 번 넘기는 호출부만 있었을 뿐"이었음을 확인, 233차의 판단을 정정.
> `canvasSize: number` → `canvasWidth/canvasHeight` 2개 파라미터로 일반화(내부 로직 무변경,
> 최종 캔버스 생성부 2줄만 변경), 기존 유일한 호출부(`photo-enhance.ts`)는 `CANVAS_SIZE`를
> 두 값에 똑같이 넘겨 동작 완전 불변. 라이프스타일 경로(`pasteCutoutOnScene`)는 hero와
> 동일한 try(실루엣)/catch(타원 폴백) 패턴으로 신규 배선(233차 때는 실루엣을 아예
> import조차 안 하고 타원 폴백만 쓰고 있었음 — `buildProductShadowSvg` 자체 주석이 스스로를
> "폴백용(실루엣 실패 시)"이라 규정하는데 본선인 실루엣이 시도조차 안 되던 상태였음).
> Claude가 수정된 `photo-composite.ts`를 esbuild로 번들해 직접 샌드박스에서 실행 검증 —
> (1) 정사각형 1200×1200 회귀 확인(hero 동작 불변) (2) 직사각형 1600×900(라이프스타일
> 씬 모사) → 정사각형으로 늘어나거나 클리핑되지 않고 정확히 1600×900 출력, 그림자 픽셀
> 67,884개 확인(빈 버퍼 아님) (3) 극단 종횡비 2400×600 + 가장자리 배치도 예외 없이 정상
> 출력. 3개 파일(`photo-composite.ts`·`photo-enhance.ts`·`lifestyle-product-composite.ts`)
> 전부 esbuild 구문 검증 통과, 정의 1곳+호출 2곳만 있음을 grep으로 확인.
> `cursor_brief_234cha_lifestyle_silhouette_shadow.md` 작성·동기화, Cursor 실행 대기.
> 유료 API 0건.

## 요약 (2026-09-22 / 233차실행검증 완료 — 라이프스타일 컷아웃 플레이트/프레임 잔여 제거 확정)

> Cursor가 `review/233cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일을 재스테이징해
> 독립 검증. **파일 범위**: `lib/`·`components/`·`scripts/` 전체 mtime 대조 결과 예상한
> `lib/lifestyle-product-composite.ts` 1개만 변경(이번 세션 중 가장 최신 mtime), 브리프가
> 명시적으로 무변경을 요구한 `lib/photo-composite.ts`·`lib/photo-enhance.ts`는 그대로,
> 신규 파일은 검증 스크립트 1개뿐. **diff 대조**: import 2개 추가 + `defringeCutoutEdges`
> 직전 trim→플레이트 제거 삽입이 브리프와 정확히 일치(주석까지 동일). **독립 재검증**:
> Cursor의 검증 스크립트를 읽어 공정함을 먼저 확인한 뒤, 그 스크립트와는 별개로 Claude가
> 직접 `photo-composite.ts`(수정 없음, 원본 그대로)를 esbuild 번들해 Cursor가 만든 실제
> `synthetic-dirty.png` 픽셀 파일을 그대로 가져와 재실행 — `defringeCutoutEdges` 단독(구
> 경로)은 테두리 잔여 23,100픽셀 중 0개 제거, `trimCutoutToOpaqueBounds`+`purgeDarkPlateFringe`
> (신규)는 23,100→0(완전 제거) — Cursor 보고 수치와 정확히 일치함을 동일 픽셀 데이터로
> 직접 재현해 확인(스크립트를 신뢰한 게 아니라 같은 입력으로 별도 실행해 같은 결론 도달).
> 실제 픽스처는 원래 플레이트 잔여가 없어 차이 없음(스킵)이라는 Cursor의 정직한 보고도
> 확인. 파일 esbuild 구문 검증 통과. **유료 API 0건, §1로 이동, §3 다시 소진.**

## 요약 (2026-09-22 / 233차 — 사진합성 파이프라인 재감사: 라이프스타일 픽셀 페이스트 컷아웃 플레이트/프레임 잔여 제거 누락 발견, 브리프 작성)

> "사진합성 부분이 아직 미약한거 같으니 코딩으로 해결하자" 원 지시의 아직 덜 다룬 쪽을
> 이어서 감사(231차는 선명도 매칭만 다룸). 일반-목적 서브에이전트로 `lib/photo-composite.ts`의
> 17개 export 함수가 두 병렬 합성 경로(스튜디오 히어로 `photo-enhance.ts` vs 라이프스타일
> 픽셀 페이스트 `lifestyle-product-composite.ts`) 사이에서 대칭 배선됐는지 1차 조사 위임,
> 보고받은 후보를 전부 Claude가 직접 코드로 재확인. **확정**: 두 경로가 정확히 동일한
> rembg 모델(`851-labs/background-remover`)을 쓰는데도, hero 경로만 `trimCutoutToOpaqueBounds`
> +`purgeDarkPlateFringe`(원본 프레임/어두운 플레이트 잔여 제거, 두 함수 헤더 주석이 이 결함을
> 명시)를 적용하고 라이프스타일 경로는 이 두 함수를 아예 import하지 않음(`defringeCutoutEdges`
> 만 적용 — 이 함수 자체 주석이 "purgeDarkPlateFringe와 달리 색상 무관 일반 번짐만 다룬다"고
> 스스로 명시, 즉 이 결함을 애초에 커버 못 함). `lib/photo-pipeline-client.ts:788`의 "103차
> A — enhanced 대신 원본 업로드 컷" 주석을 근거로, AI 일상샷 경로가 의도적으로 판매자 원본
> 사진을 그대로 rembg에 넣도록 설계돼 있어 이 결함이 가장 잘 드러나는 경로임을 확인. 샌드박스
> 재현 테스트(실제 staged `photo-composite.ts` 원본 그대로, 수정 없음) — 테두리에 반투명
> 어두운 사각 잔여가 있는 합성 이미지에 기존 방식(defringe 단독)은 잔여 23,100픽셀 중 0개
> 제거(완전 무효), 신규 방식(trim+purge)은 23,100→0(완전 제거)으로 결함 실재·수정 효과를
> 둘 다 코드 실행으로 증명. 서브에이전트가 함께 제시한 "실루엣 그림자 미배선"(Finding 2,
> "plausible, 확실하지 않음"으로 자체 표시)은 `buildSilhouetteShadowBuffer`가 정사각형
> 캔버스 전용 시그니처(hero의 고정 `CANVAS_SIZE` 상수 의존)라 임의 종횡비 라이프스타일
> 씬에 그대로 못 쓰는 더 큰 시그니처 변경 작업이라 이번 스코프에서 제외, 다음 라운드 후보로만
> 기록. `lib/lifestyle-product-composite.ts` esbuild 구문 검증 통과.
> `cursor_brief_233cha_lifestyle_cutout_plate_cleanup.md` 작성·동기화, Cursor 실행 대기.
> 유료 API 0건.

## 요약 (2026-09-22 / 232차실행검증 완료 — FOOD 무게 게이트 복구 + spec_table 행 필터링 동기화 확정)

> Cursor가 `review/232cha-report.md`로 실행 완료 보고, 스크린샷
> `review/232cha-food-weight-rows/food-weight-diagram.png`. Claude가 PC 실제 파일을
> 재스테이징해 독립 검증. **파일 범위**: `lib/`·`components/`·`scripts/` 전체 mtime
> 대조 결과 예상한 2개 소스 파일(`DetailSectionRenderer.tsx`·`export-detail-html.ts`)만
> 변경, `lib/weight-comparison-diagram.ts`·`lib/section-display-budget.ts`는 브리프
> 지시대로 무변경, 신규 파일은 검증 스크립트(`scripts/232cha-food-weight-rows-verify.ts`)
> 1개뿐임을 확인. **diff 대조**: 두 파일 모두 브리프의 diff와 정확히 일치(`weightMatch`
> 게이트에 FOOD `nutrition_table` 조건 추가, export에 `visibleRows` 필터+early return
> 추가, 6개 매처+`rowsHtml` 전부 치환). **독립 재검증**: Cursor의 검증 스크립트를 신뢰하지
> 않고 실제 staged `weight-comparison-diagram.ts`·`food-compliance.ts`(수정 없음, 원본
> 그대로)를 별도 Node 샌드박스에서 esbuild로 번들해 6개 케이스(FOOD+nutrition_table 매치,
> FOOD+spec_table 레거시 유지, 전자 회귀 없음, FASHION 배제, 유령 행 필터링, 슬롯명만으로는
> 안 뚫림 확인)를 직접 실행해 전부 기대값과 일치. **export HTML 직접 grep**: food/
> electronics/pet/living 4개 export HTML 전부에서 `aria-label="무게 비교 다이어그램"`을
> 직접 카운트 — food 1건(신규), 나머지 3개 각 1건(회귀 없음), food-export.html에 빈
> `<th></th>` 0건(유령 행 필터링 실제 반영 확인). **스크린샷**: `food-weight-diagram.png`
> 직접 열람 — "무게 비교" 타이틀·200g/450g/1kg 기준선·"중량 450g" 스펙 행이 실제로 렌더링됨을
> 육안 확인. 2개 파일 esbuild 구문 검증 통과. **유료 API 0건, 2건 전부 §1로 이동, §3 다시
> 소진.**

## 요약 (2026-09-22 / 232차 — spec_table 감사로 FOOD 무게 게이트 도달불가 + 라이브/익스포트 행 필터링 불일치 발견, 브리프 작성)

> "다음지시사항" 지시로 231차와 같은 기법(다이어그램 게이트 도달 가능성 감사)을
> `case "spec_table":`(`DetailSectionRenderer.tsx` 1992행·`export-detail-html.ts` 600행)에
> 재적용. **Finding 1**: `lib/weight-comparison-diagram.ts` 헤더 주석(162차)이 "전자/가전·
> 식품·반려동물·생활용품" 커버를 명시했으나 게이트가 `section.slot === "spec_table"`만
> 검사 — `lib/section-templates.ts` 6개 카테고리의 실제 spec 슬롯 이름을 grep으로 전수
> 확인한 결과 FOOD만 유일하게 `nutrition_table`(다른 5개는 전부 `spec_table` 또는
> FASHION의 `size_table`)이라 FOOD에서 단 한 번도 매칭 불가능했음을 확인 — 실측 무게가
> 입력에 있어도 무게 비교 다이어그램이 FOOD에서 영구 미노출. **Finding 2**: 라이브는
> `visibleRows = section.rows.filter(row => row.label.trim())`로 빈 라벨 행을 매처/
> 테이블 진입 전에 걸러내는데 export에는 이 필터가 전혀 없었음(6개 매처 호출부 + 테이블
> 바디 `rowsHtml` 전부 원본 `section.rows` 사용). `rowLooksLikeWeight()`의 별칭 매칭이
> `alias.includes(n)`이라 `n=""`(빈 라벨)일 때 항상 true가 되는 구조적 약점을 코드 읽기로
> 확인 — 실제 staged `weight-comparison-diagram.ts`를 esbuild로 번들해(원본 그대로, 수정
> 없음) `[{label:"", value:"1개당 250g 소분 포장"}, {label:"원산지", value:"국내산"}]`를
> 투입하는 샌드박스 재현으로 유령 다이어그램(`{g:250}` 매치)이 실제로 발생함을 증명, 필터
> 적용 후 `null`로 라이브와 일치함도 함께 검증. Finding 3(export의 죽은 FOOD `foodSlices`
> 분기, 229차부터 플래그)은 이번 스코프 밖으로 기록만. `weightMatch`만 FOOD로 좁게 확장
> (noise/waterproof/power는 카테고리 무관 설계 또는 FOOD가 이미 다른 다이어그램으로 커버돼
> 확장 안 함 — 억지 구현 방지). 두 파일 esbuild 구문 검증 통과.
> `cursor_brief_232cha_food_weight_gate_and_spec_table_row_parity.md` 작성·동기화, Cursor
> 실행 대기. 유료 API 0건.

## 요약 (2026-09-22 / 231차실행검증 완료 — 펫 성분 링·export 브리더·선명도 양방향 매칭 3트랙 전부 확정)

> Cursor가 `review/231cha-report.md`로 실행 완료 보고, 스크린샷 `review/231cha-flow-infographic/`.
> Claude가 PC 실제 파일을 재스테이징해 독립 검증. **파일 범위**: `lib/`·`components/` 전체
> mtime 대조 결과 예상한 4개 파일만 변경(`DetailSectionRenderer.tsx`·`export-detail-html.ts`·
> `photo-composite.ts`·`section-display-budget.ts`), 나머지는 전부 이전 라운드 시점 그대로임을
> 확인. **트랙 A**: 소스 diff가 브리프와 정확히 일치(에디토리얼 블리드 분기에 링 다이어그램
> 호출 추가, 라이브·export 양쪽) — 추가로 Cursor가 브리프에 없던 `section-display-budget.ts`
> 보강을 자체적으로 발견·수정(반려동물 `material_feature`가 190차 `MAX_EXTRA_IMAGE_LOW=0`에
> 걸려 export에서 통째로 demote되면 트랙 A가 배선돼도 실제로는 안 보이는 문제) — Claude가
> `isIngredientRingCategory`/`prepareIngredientRingLabels`/`computeDemotedSectionIndexes`를
> 전부 별도 Node 샌드박스로 독립 재구현해 재검증: 반려동물만 예외 처리되고 생활/리빙과 반려동물의
> 나머지 3개 EXTRA_IMAGE_SLOTS(material_detail/packaging_design/care_tip)는 190차 그대로
> 데모트됨을 수치로 확인, 실제 `pet-export.html`에서 `ing-ring-` SVG 경로 15개·"성분 원형
> 배치" 1건 grep으로 최종 도달 확인. **트랙 B**: 소스 diff 일치, `food-export.html`/
> `fashion-export.html`/`pet-export.html`에서 브리더 개수를 직접 grep(`linear-gradient(90deg`
> 라인 수) — 보고서 표(pet 7·food 10·fashion 10)와 정확히 일치, 스크린샷으로 시각 확인.
> **트랙 C**: 소스 diff 일치, Claude가 `matchCutoutSharpness`를 실제 sharp 0.35.3(프로덕션
> 동일 버전)으로 별도 샌드박스에 로드해 합성 테스트 이미지 3케이스 재현 — (1) 흐린 컷아웃+
> 선명한 배경(ratio 6.7) → 엣지 강도 2.901→3.276 증가(선명화 확인), 알파 채널 바이트 단위
> 불변 확인 (2) 선명한 컷아웃+흐린 배경(기존 블러 분기) → 13.919→4.047 감소(회귀 없음 확인)
> (3) 중간 비율 → 입력과 출력 버퍼 완전 동일(패스스루 확인). `sharp().sharpen({sigma,m1,m2})`
> 객체 시그니처가 프로덕션 sharp 버전에서 실제로 동작함도 함께 확인. 4개 파일 전부 esbuild
> 구문 검증 통과. **유료 API 0건, 3트랙 전부 §1로 이동, §3 다시 소진.**

## 요약 (2026-09-22 / 231차 — 흐름·인포그래픽 코드 감사 + 컷아웃 선명도 양방향 매칭, 3트랙 브리프 작성)

> 사용자가 "흐름과 인포그래픽 부분을 확실하게 잡아달라 / 사진합성 부분을 코딩으로 해결하자"로
> 새 방향 지정. 이번엔 벤치마크가 아니라 **기존 코드를 직접 감사**해 실제로 도달 가능한데 빠진
> 부분을 찾음. **트랙 A(반려동물 성분 링 다이어그램 구조적 렌더 불가)**: `lib/ingredient-ring-diagram.ts`
> (185차)의 `isIngredientRingCategory()`가 화장품/뷰티·반려동물을 명시 허용하고 성분 노이즈
> 필터에 "조단백질/조지방/조회분"(사료 표기)까지 포함해 반려동물 지원이 원래 설계 의도였음을
> 확인했으나, 실제 렌더 게이트는 `section.slot === "ingredient_highlight"` 리터럴 검사라
> 반려동물 템플릿의 동일 의미 슬롯("material_feature")과 이름이 달라 도달 불가능 — 게다가
> `material_feature`가 `EDITORIAL_BLEED_SLOTS`(195차)에 속해 다이어그램 호출 자체가 없는
> 3번째 렌더 분기(전체폭 이미지 오버레이)로 떨어지는 것까지 확인, 그 분기에 다이어그램 호출을
> 새로 추가하는 브리프 작성. **트랙 B(브리더 live/export drift)**: `shouldInsertBreather()`
> (섹션 사이 그라디언트선+점 시각 호흡)가 라이브에만 배선되고 `lib/export-detail-html.ts`엔
> grep 0건 — 180/224/225차와 같은 계열의 live/export 불일치, `checklist`/`gallery` 등 흔한
> 섹션이 트리거라 사실상 상시 재현. export 조립 루프에 동일 판정 배선하는 브리프 작성. **트랙
> C(컷아웃 선명도 양방향 매칭)**: `matchCutoutSharpness()`(164차)가 "배경이 컷아웃보다 흐릴
> 때만 컷아웃을 블러"하는 단방향 함수임을 확인 — 218차가 이미 문서로 남기고 스코프 제외했던
> 한계("구조적으로 배경이 더 흐릴 때만... 별도 스코프 필요")를 이번에 상한(ratio>1.8) 분기로
> 대칭 추가(unsharp mask, sigma 0.6~1.3 보수적 상한). 순수 sharp 픽셀 연산이라 유료 API 없이
> 유닛 테스트로 검증 가능 — "코딩으로 해결" 요청과 부합. 그립세이프가드 임계값(0.4)은 과거
> 9건·$0.369 라이브 검증으로도 트레이드오프가 미확정이라 이번엔 손대지 않고 §4 유지,
> `section-display-budget.ts`의 export 전용 적용은 183/190차 원문 확인 결과 의도적 설계로
> 재확인(버그 아님, 제외). `cursor_brief_231cha_flow_infographic_and_sharpness_matching.md`
> 작성·동기화, Cursor 실행 대기. 유료 API 0건.

## 요약 (2026-09-22 / 230차 Cursor 재확인 완료 — 화장품/뷰티 null 결과 검증됨, 프로덕션 무변경)

> Cursor가 `review/230cha-report.md`로 230차 조사 결과를 코드 레벨에서 **읽기 전용으로 재확인**
> (Claude가 Cursor 실행 브리프를 발행하지 않은 라운드라 코드 실행이 아니라 독립 대조). Claude가
> PC 실제 파일을 다시 조회 — `lib/` 전체·`components/` 전체·`lib/types/generate.ts` mtime을
> 229차 시점과 전수 대조한 결과 **단 1바이트도 변경 없음**(`DetailSectionRenderer.tsx`는
> 229차 수정 시점 mtime 그대로, `export-detail-html.ts`/`review-insights.ts`는 228차 시점
> 그대로, `before-after-eligibility.ts`/`section-inserts.ts`/`generate.ts`는 227차 시점
> 그대로) — Cursor의 "프로덕션 소스 무변경" 주장을 확정 검증. `lib/before-after-eligibility.ts`
> 원문을 직접 열람해 Cursor가 근거로 든 `BEFORE_AFTER_EXCLUDED_CATEGORIES`(227차, 화장품/뷰티·
> 반려동물·식품/건강기능식품)를 정확히 재확인. Cursor의 패턴별 판정표(6개 패턴 전부 이미
> 해결/채택 금지/스키마 충분, 시계열 꺾은선 1건만 227차 A안 컴플라이언스와 충돌해 §3 미등록)가
> Claude의 230차 조사 결론과 전부 일치. **새 코드 실행 없음, §3 계속 비어 있음, 유료 API 0건.**

## 요약 (2026-09-22 / 230차 — 화장품/뷰티 디자이너 벤치마크 신규 크롤링, 정직한 null 결과)

> 229차실행검증 완료 후 사용자가 "디자이너가 만들었다고 할 정도로 나와야해 퀄리티가"로 장기
> 품질 과제를 재확인. 228차가 같은 날 이미 hookable.ai+전자제품·생활용품을 벤치마크했으므로
> 겹치지 않는 **화장품/뷰티** 카테고리(마지막 전용 크롤링 159차, 12일+ 경과)를 신규 선택 —
> Behance "Neriah Stellar Water Fluid Ampoule Page"(수분 앰플 자사몰 상세페이지) 전체 스크롤을
> Claude-in-Chrome으로 직접 크롤링, 158/159/160/181/228차와 동일한 4축+3분류 방법론 적용.
> **발견 6건 전부 코드 대조 완료**: (1) 리뷰 인용구 인라인 강조 — 228차가 같은 날 이미 구현,
> 재확인만. (2) 별점+실사진 리뷰 카드 — 226차 확정 채택 금지 재확인. (3) 원형 성분 사진 카드 —
> `apply-ingredient-circle-pair.ts`(207차)와 구조 동일, 신규 아님. (4) 실사진 Before/After —
> 227차 A안이 화장품/뷰티를 이미 서버·UI 이중 차단으로 명시 제외한 카테고리, 재확인만. (5)
> **"사용 전→직후→7일 후" 3시점 임상 추이 꺾은선 그래프** — `StatInfographicSection`(단일 시점
> bar/number/ring)·`ComparisonChartSection`(정적 2열 비교) 둘 다 시간 축을 표현 못해 실제
> 기능 공백은 맞으나, 227차가 확립한 컴플라이언스 경계(화장품/뷰티 등 효능-민감 카테고리엔
> "효과 확정 시각화"를 만들지 않음)가 사진 Before/After보다 이 패턴에 **더 강하게** 적용된다고
> 판단(수치화된 시계열 추이가 사진 대비보다 더 명시적인 효능 주장) — 6개 카테고리 전부 "만들지
> 않는 게 맞다"는 결론으로 §3에 올리지 않고 기록만 남김(158/159차 "억지 구현 금지" 원칙).
> (6) STEP 사용법 내 주의문구·TIP — `UsageStepsSection.steps`가 이미 자유 텍스트 배열이라
> 구조 변경 불필요. **새 코드 브리프 없음, §3 계속 비어 있음** — 정직한 null 결과. 조사 전문
> `claude/230cha-cosmetics-designer-benchmark-findings.md`. 유료 API 0건.

## 요약 (2026-09-22 / 229차실행검증 완료 — 식품 원재료 비율 도넛 중복 렌더 제거 확정)

> Cursor가 `review/229cha-report.md`로 실행 완료 보고(유료 API 0건, 파일 1개·블록 1개 삭제만).
> Claude가 PC 실제 파일을 재스테이징해 직접 대조 — `components/DetailSectionRenderer.tsx`의
> `case "spec_table":` 블록에서 문제의 `isFoodCategory(category)` 단독 게이팅 `FoodRatioDiagram`
> 블록(구 2100~2106행)이 정확히 삭제되고 바로 위 `showSizeComparison`/아래 `noiseMatch` 블록은
> 그대로 남아 있음을 줄 단위로 확인, `sourcing_story`(`image_text` case) 2곳(1720·1963행)의
> `section.slot === "sourcing_story" && isFoodCategory(category)` 게이팅도 미변경 확인. `lib/`
> 디렉토리 전체 mtime 대조로 `export-detail-html.ts`(228차 시점과 완전 동일)·`food-ratio-diagram.ts`·
> `section-templates.ts` 등 스코프 제외 파일 전부 미변경, 변경 파일이 `DetailSectionRenderer.tsx`
> 단 하나뿐임을 확인. `npx esbuild components/DetailSectionRenderer.tsx --bundle=false --format=esm
> --loader:.tsx=tsx --outfile=/dev/null` 구문 검증 통과. Cursor가 제공한 스크린샷 5장을 직접
> 열람 — 수정 전 `before-donut-section-1.png`(sourcing_story, 정상)·`before-donut-section-2.png`
> (배송·교환 안내/shipping_info 섹션에 원재료 비율 도넛이 **뜬금없이 중복 렌더링**된 상태를 육안
> 확인, 브리프가 예측한 버그 재현 확인)와 수정 후 `after-live-full.png`(sourcing_story 섹션에
> 도넛 정확히 1회, 뒤따르는 섹션엔 없음)를 비교해 수정 전/후 차이를 직접 확인. `food-export.html`을
> grep해 `data-diagram="food-ratio"` 마커가 정확히 1개뿐임도 재확인(export는 애초 정상이었으므로
> 변화 없음이 곧 정답). `tsc` 0(esbuild로 대체), 유료 API 0건 — §1로 이동, §5 등록, §3 다시 소진.

## 요약 (2026-09-22 / 229차 — "다시발굴" 재시도: 식품 원재료 비율 도넛 차트 spec_table 중복 렌더 버그 발견)

> 228차실행검증이 시도한 "새 축 자체 발굴"이 null 결과(`checklist.compactFollow`, 도달 불가능한
> 죽은 코드로 판명)로 끝나자 사용자가 **"다시발굴"** 한 단어로 재시도 지시. 이번엔 `spec_table`
> 다이어그램 계열(사이즈·용량·소음·방수·무게·소비전력·식품 원재료 비율, 총 7종)을
> `DetailSectionRenderer.tsx`의 `case "spec_table":` 블록 전체를 줄 단위로 정독하며 각 다이어그램의
> 게이팅 조건을 대조하는 방식으로 접근 — **식품 카테고리 전용 "원재료 구성 비율" 도넛 차트
> (`FoodRatioDiagram`/`prepareFoodRatioSlices`, 113차)만 유일하게 `section.slot` 조건 없이
> `isFoodCategory(category)`만으로 발동**함을 발견. `lib/section-templates.ts`의 FOOD 템플릿을
> 확인한 결과 `type: "spec_table"`인 슬롯이 `nutrition_table`(영양정보)·`shipping_info`(배송정보)
> 두 개 있어, 원재료 비율 텍스트("귀리 40%, 견과 25%, 기타 35%" 형태)가 있는 식품 상품은 라이브
> 에디터에서 이 도넛 차트가 의도된 `sourcing_story`(1회) 외에 두 표 섹션에도 추가로 나타나 **최대
> 3번 중복 렌더링**됨을 확인. 근거 3가지로 취향이 아닌 코드 결함임을 교차 확인: (1) 같은 블록의
> 나머지 6개 다이어그램은 전부 `section.slot === "spec_table"`(또는 `size_table`) 조건을 갖는데
> 이것만 빠져 있어 패턴이 깨짐, (2) 표 위 여백을 정하는 `mt-6`/`mt-10` 조건식에도 이 다이어그램이
> 누락돼 있어 렌더링돼도 레이아웃이 어긋남, (3) `lib/export-detail-html.ts`의 대응 코드는
> `section.slot === "spec_table"`로 게이팅돼 있으나 식품의 spec_table 타입 슬롯은 실제 이름이
> `nutrition_table`/`shipping_info`라 이 비교가 항상 거짓이 되어 **우연히 죽은 코드로 막혀 export
> 에는 중복이 나타나지 않음** — 즉 라이브 에디터 화면과 실제 발행되는 export HTML이 다른 상태.
> `sourcing_story`(`image_text` case) 쪽 2곳은 라이브·export 양쪽 다 `section.slot ===
> "sourcing_story" && isFoodCategory(category)`로 이미 정확히 일치해 손댈 필요 없음도 확인.
> `Projects.project_search`로 113/158차 관련 문서를 확인했으나 의도적 중복 배치였다는 근거는
> 없었고, `scripts/139cha-regression-qa.ts`에도 이 중복을 전제한 회귀 테스트가 없음을 grep으로
> 확인 — `checklist.compactFollow`(228차실행검증)와 달리 이번엔 **실제로 도달 가능한 흔한 입력
> 패턴**(식품 판매자가 원재료 비율을 텍스트로 적는 것은 드물지 않음)이라 정직한 액션 아이템으로
> 판단. `components/DetailSectionRenderer.tsx`의 `case "spec_table":` 블록(2100~2106행 부근)
> 7줄만 삭제하는 단일 삭제 브리프 `cursor_brief_229cha_food_ratio_diagram_duplicate_fix.md` 작성
> — §3에 등록, 유료 API 0건, Cursor 실행 대기.

## 요약 (2026-09-22 / 228차실행검증 완료 — 리뷰 하이라이트 키워드 강조 확정, 새 축 발굴 null 결과)

> Cursor가 `review/228cha-report.md`로 실행 완료 보고(유료 API 0건). Claude가 PC 실제 파일 3개
> (`lib/review-insights.ts`·`components/DetailSectionRenderer.tsx`·`lib/export-detail-html.ts`)를
> 재스테이징해 브리프와 줄 단위로 대조 — `splitTextByKeywords()`(키워드 길이 내림차순 정렬 +
> 정규식 특수문자 이스케이프)와 라이브·export 양쪽의 `matchCount>0` 게이팅·편집 모드 예외 처리가
> 전부 브리프 스펙과 정확히 일치. `lib/section-inserts.ts`·`app/api/generate/route.ts`·
> `lib/types/generate.ts`·6개 컴플라이언스 모듈은 mtime으로 227차 시점과 완전 동일해 미변경
> 확인(정확히 3개 파일만 건드림). Cursor의 검증 스크립트를 신뢰하지 않고 실제 스테이징된
> `review-insights.ts`를 `npx tsx`로 직접 import해 독립 테스트 20개(join 불변식, 빈 문자열,
> 1글자 토큰만 있는 경우, "210g/yd" 특수문자 키워드, 4개 캡, 접두사 충돌 시 긴 키워드 우선)를
> 처음부터 새로 작성해 실행 — 20/20 전부 통과. `esbuild`로 3개 파일 전체 구문 파싱 통과. Cursor가
> 제공한 `fixture-export.html`을 grep해 `matchCount>0`인 문장만 `accentSoft` 배경의 `<span>`으로
> 감싸지고 `matchCount=0`인 문장("매칭 없는 아쉬운 점 평문")은 평문 그대로임을 직접 확인.
> 스크린샷 3장(`live-review-highlight-read.png`·`live-review-highlight-edit.png`·
> `export-review-highlight.png`)을 직접 열람 — 읽기 모드는 라이브·export 둘 다 동일하게 키워드가
> 강조되고, "원문 매칭이 없어 강조되면 안 됩니다"라고 적힌 테스트 카드는 예상대로 강조 없이
> 평문으로 렌더링됨을 육안 확인. 편집 모드 스크린샷은 모든 텍스트가 강조 span 없이 일반
> `EditableText` 입력창(점선 테두리)으로만 보여 편집 동작이 깨지지 않았음을 확인. `tsc` 0(esbuild로
> 대체), 유료 API 0건 — §1로 이동, §5 등록, §3 다시 소진.
>
> **이어서 "다음 지시사항" 요청에 따라 새 축 자체 발굴을 시도했으나 이번엔 새 항목을 찾지
> 못함(정직한 null 결과)**. 223/224/225차와 같은 방식(라이브·export가 import하는 `@/lib/*` 목록
> 비교)으로는 신규 발견 0건(`concept-icons`는 타입 전용 import일 뿐 기능 차이 아님). 이어서
> `DetailSection` 타입의 전 필드를 라이브/export 양쪽에서 grep 커버리지 대조하는 새로운 방법을
> 시도해 `checklist.compactFollow`(gallery/image_text 직후 체크리스트의 여백·헤어라인 압축)가
> export에는 전혀 배선돼 있지 않음을 발견했으나, `lib/section-templates.ts`(6개 카테고리 전부)를
> 직접 확인한 결과 checklist 슬롯은 항상 hero/brand_story 직후 고정 위치이고 gallery/image_text
> 뒤에 오는 경우가 구조적으로 없으며, `app/api/patch-section/route.ts`(채팅 편집)도 기존 섹션의
> 내용만 수정할 뿐 섹션을 추가·재배치하지 않고, 판매자의 수동 up/down 재정렬도 이미 생성된
> `compactFollow` 필드값(항상 false)을 바꾸지 않음을 코드로 확인 — 즉 `compactFollow`가 true가
> 되는 경로 자체가 현재 파이프라인에 없어 **export에 구현해도 실제 화면에 어떤 차이도 만들지
> 않는 도달 불가능한 코드**로 결론. 224/225차와 겉보기엔 같은 패턴(라이브 전용 필드가 export에
> 없음)이지만 실제로는 트리거되지 않는 죽은 코드라 액션 아이템으로 등록하지 않고 §2에 기록만
> 남김(향후 라운드가 이 필드를 재발견해 시간을 낭비하지 않도록).

## 요약 (2026-09-22 / 228차 — 후커블·디자이너 재벤치마크(무료), 리뷰 하이라이트 키워드 강조 브리프 작성)

> 사용자 지시: "디자이너 그리고 후커블이 만든것과 똑같은 퀄리티가 나와야해 알아서 크롤링을
> 해도 되고 학습해서 우리가 보완해야할점 지시사항 남겨줘. 유료 api 호출은 하지마." 158/159/
> 160/181/219차와 동일한 4축(레이아웃/타이포·여백/이미지 합성 자연스러움/정보 위계) + 3분류
> (버그/취향 차이/입력 부족) 방법론으로 **hookable.ai 자사 마케팅 페이지**(로그인 없이 접근
> 가능한 랜딩만, Claude-in-Chrome)와 **Behance 디자이너 레퍼런스 2건**(전자제품 주방가전
> "RICOPA 오븐 토스터" — OHMY SOOJIN, 생활용품 수납함 "제니바코" — Sora Shin, 158/159/181차와
> 겹치지 않는 신규 레퍼런스, 최근 코드 변경(222~225차)이 집중된 카테고리 위주로 선택)를 새로
> 크롤링(181차 이후 처음). 이미지가 인페이지 줌으로 너무 작게 렌더링되는 문제는
> `javascript_tool`로 DOM에서 실제 풀해상도 CDN URL(`project_modules/max_1200_webp|hd_webp`)을
> 직접 추출해 그 URL로 이동 후 클릭 100% 줌 + 스크롤 캡처하는 방식으로 우회.
>
> **발견 패턴을 전부 실제 코드와 대조**한 결과 대부분 이미 해결됨을 확인: 설득 프레임워크
> 태그(`section-persuasion-labels.ts`, 138차), 부품/기능 포인트 오버레이
> (`annotated-image-overlay-svg.ts`, 223차), 섹션 hairline 구분선(`SectionAccentHairline`,
> grep 8곳), 별점+실사용자 사진(226차 확정 채택 금지), 히어로/라이프 실사 비중(183차,
> API 필요로 이미 등록). **신규 발견은 딱 1건** — 리뷰 하이라이트 섹션의 praise 문장에서
> `lib/review-insights.ts`의 `extractCoreKeywords()`가 이미 계산해 "N건 언급" 배지로만 쓰던
> 매칭 키워드를, 실제 리뷰 원문과 매칭된 문장(`matchCount>0`)에서만 인라인 형광펜 스타일로
> 시각화 — 신규 입력·신규 AI 호출 0, 순수 표시 로직만 변경. 나머지 2건(조리 가이드 캡션 박스,
> 실사진 위 치수선 직접 오버레이)은 각각 "가전 세부 카테고리 전용이라 일반화 애매"·"CV/좌표
> 검출 필요로 공수·정확도 리스크 큼"이라 후보로만 기록, 착수하지 않음. `size-comparison-diagram.ts`
> 코드를 직접 읽어 현재는 추상 실루엣 비교일 뿐 실사진 위 오버레이가 아님을 확인한 뒤 내린
> 판단. 조사 전문은 `claude/228cha-designer-hookable-benchmark-findings.md`, 구현 브리프는
> `cursor_brief_228cha_review_highlight_keyword_emphasis.md`(신규 함수
> `splitTextByKeywords()`를 `lib/review-insights.ts`에 추가해 라이브·export 양쪽 렌더러가
> 공유, 편집 모드에서는 강조 미적용, matchCount>0 게이팅으로 anti-fabrication 원칙 유지) —
> §3에 등록, 유료 API 0건, Cursor 실행 대기.

## 요약 (2026-09-22 / 227차실행검증 완료 — Before/After 효과 비교 입력 기능 확정)

> Cursor가 `review/227cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일 7개
> (`lib/before-after-eligibility.ts` 신규·`lib/types/generate.ts`·`lib/section-inserts.ts`·
> `app/api/generate/route.ts`·`components/CreateProductForm.tsx`·`components/DetailSectionRenderer.tsx`·
> `lib/export-detail-html.ts`)를 재스테이징해 `cursor_brief_227cha_before_after_input.md`와 줄 단위로
> 대조 — 게이팅 함수·타입 필드·`insertBeforeAfterSection`의 필터/캡/중복가드/삽입위치 로직·
> `route.ts`의 import와 삽입 호출 위치(axisComparison 직후·`applyHeroBadge` 직전)·업로드 UI·라이브·
> export 렌더링(BEFORE/AFTER 배지 색상까지 POINT 배지 패턴 재사용) 전부 브리프 스펙과 정확히
> 일치. `route.ts`의 `mode === "draft"` 분기가 line 1564에서 `return NextResponse.json(...)`으로
> 끝나는 것을 직접 확인해, before_after 삽입 호출(line 1744)이 final 모드에서만 실행됨을
> 재확인(브리프의 "draft에는 추가하지 말 것" 지침 준수). 3개 컴플라이언스 모듈(`pet`/`cosmetics`/
> `food-compliance.ts`)과 `section-templates.ts`는 mtime으로 이번 라운드에 미변경 확인. Cursor의
> 검증 스크립트(`scripts/227cha-before-after-verify.ts`)를 신뢰하지 않고, **실제 스테이징된
> `section-inserts.ts`/`before-after-eligibility.ts`를 `npx tsx`로 직접 import해 독립적으로 처음부터
> 작성한 테스트 29개**를 실행 — 카테고리 게이팅 7종, 3개 제외 카테고리 무삽입 확인, 정상 삽입·
> 필드 보존, URL 누락 쌍 필터링, 4쌍 캡, 중복 가드, null/undefined/빈배열 무동작, 삽입 위치 4가지
> (review_highlight 직후/ai_disclosure 직전/cta_price 직전/앵커 없을 때 말미), 기존 함수(sellerTrustEvidence/
> buildReviewHighlightSection) 회귀 없음 — 29/29 전부 통과(최초 실행에서 2건 실패는 삽입 위치 인덱스
> 어서션을 잘못 세운 Claude 자신의 테스트 버그로 판명, 수정 후 재실행해 전부 통과 — 실제 코드
> 결함 아님). `esbuild`로 7개 파일 전체 구문 파싱 통과(오류 없음). Cursor가 제공한 스크린샷
> (`electronics-before-after.png`)을 직접 열람해 BEFORE(짙은 색)/AFTER(accent색) 배지·캡션("2주
> 사용 후")·헤딩("실제 사용 전후")이 cta_price 섹션 바로 앞에 정확히 렌더링됨을 육안 확인, export
> HTML(`electronics-before-after-export.html`)도 grep으로 BEFORE·AFTER·컴플라이언스 각주 텍스트
> 존재 확인. Cursor의 검증 스크립트는 브리프가 요청한 "synthetic `/api/generate` 라운드트립" 대신
> 순수 함수(`insertBeforeAfterSection`/`buildDetailPageHtml`) 직접 호출로 검증했는데, 이는 route.ts
> 사이드이펙트 위험이 없는 더 안전한 방식이면서 동일한 결론을 입증하므로 결함으로 보지 않음.
> `tsc` 0(esbuild로 대체), 유료 API 0건 — §1로 이동, §5 등록, §3 다시 소진(현재 비어 있음).
>
> 226차 보고(`review/226cha-report.md`)도 함께 확인 — 226차는 애초 코드 변경 없는 크롤링 조사
> 라운드였고, Cursor는 이 보고서에서 추가 코드 없이 226차 결론(types 전수 검색 0건, `ReviewHighlightSection`
> 원문 인용 금지 주석 확인)을 자체 재확인만 했음. 내용이 226차 조사와 일치해 추가 조치 불필요.

## 요약 (2026-09-18 / 227차 — Before/After 입력 기능 설계 검토 + 브리프 작성, A안 채택)

> 226차가 발견한 "Before/After 실사진 비교" 패턴을 사용자가 "Before/After 입력 기능 설계 검토"로
> 선택. 코드 조사 결과 핵심 변수는 UI가 아니라 **법적 리스크** — Pagzly가 이미 컴플라이언스 모듈을
> 둔 3개 카테고리(화장품/뷰티·반려동물·식품/건강기능식품)가 정확히 "효과·효능 확정 주장"이 법적으로
> 민감한 카테고리이고, Before/After 사진은 텍스트 regex로 순화할 수 없는 효능 주장이라는 점을
> `227cha-before-after-input-design-review.md`에 정리. A안(민감 3카테고리 제외)/B안(전 카테고리+강화
> 고지)/C안(보류) 중 A안을 권장·제시했고 사용자가 A안 채택. `ReviewHighlightSection`(AI 미생성, 서버
> 조립 전용)과 `lib/section-inserts.ts`의 `insertReviewHighlightSection`/`insertSellerTrustEvidence`
> 기존 패턴을 그대로 재사용하는 구조로 설계 — 신규 `lib/before-after-eligibility.ts`(카테고리 게이팅
> +고정 컴플라이언스 각주), `ProductInput.beforeAfterPairs`/`BeforeAfterSection` 타입, `route.ts`
> 배선(`body`가 별도 검증 스키마 없이 직접 캐스팅됨을 확인해 필드 추가만으로 전달됨을 검증),
> `CreateProductForm.tsx`의 기존 `uploadAuxFile()` 헬퍼 재사용 업로드 UI(카테고리 비허용 시 블록
> 자체가 사라짐), `DetailSectionRenderer.tsx`/`lib/export-detail-html.ts`(917행에 이미 있는
> `review_highlight` case 확인 후 나란히 배치) 양쪽 렌더링까지 7개 파일 전체를 정확한 코드로 명시한
> `cursor_brief_227cha_before_after_input.md` 작성. 유료 API 0, Cursor 실행 대기.

## 요약 (2026-09-18 / 226차 — 새 마켓플레이스/카테고리 크롤링: 쿠팡 반려동물 사료, 코드 변경 없음)

> 225차실행검증으로 §3이 다시 비어 사용자가 "새 마켓플레이스/카테고리 크롤링"을 선택. 이미
> 접근 가능이 확인된 쿠팡(210차)에서, `marketplace_crawl_findings_2026-09-07.md`가 아직
> 다루지 않은 반려동물 카테고리(기능성 강아지 사료, 후기 23,922개)를 Claude-in-Chrome으로
> 직접 크롤링. **패턴 4건 발견**: (1) **Before/After 실사진 비교 모듈**(눈물자국 개선 전/후
> 사진 + 구매자 리뷰 인용, 반복 2세트 확인) — `lib/types/generate.ts`/`ProductInput` 전수
> 검색으로 이런 사진을 받는 입력 필드가 0건임을 확인, **코드 버그가 아니라 입력 기근**으로
> 판단(새 입력 슬롯 신설은 제품 결정 사항, 이번 스코프 밖). (2) **개별 리뷰어 스크린샷풍
> 인용 카드**(마스킹 닉네임+별점+하이라이트 형광펜) — `ReviewHighlightSection`(436행) 주석이
> "praises는 요약이지 원문 인용 아님, 특정 인물이 말한 것처럼(가짜 이름·별점) 표시 금지"를
> 이미 명시하고 있어 **Pagzly 자체 원칙과 정면 충돌, 채택 금지로 확정**. (3) 원형 인증 씰
> 그래픽(유기농70%/HACCP) — pill 배지 대비 스타일 차이일 뿐 기능 결손 아님, 취향 후보로만
> 기록. (4) 해시태그 뱃지 헤드라인("#유기농맛집") — 순수 장식, 취향 후보로만 기록. **4건
> 전부 §3에 추가할 코드 전용 항목이 아니라 208/210/213차와 같은 계열의 정직한 null
> 결과** — `226cha-coupang-pet-crawl-findings.md` 작성. 유료 API 0, 코드 변경 없음, §3
> 여전히 비어 있음.

## 요약 (2026-09-18 / 225차 실행·독립 검증 완료 — export `layout:"compact"` 섹션 복원 확정)

> Cursor가 `review/225cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일을 재스테이징해
> `lib/export-detail-html.ts`(69351바이트, +2675바이트)를 브리프 diff와 줄 단위로 대조 —
> `resolveCompactImageShape` import(57행), `sectionHtml()` 시그니처 말미의
> `compactImageTextIndex`/`totalCompactImageTextCount` 파라미터 2개(185~186행), 루프
> 레벨 카운터 계산(`totalCompactImageTextCount`는 루프 전 1회, `compactImageTextIndex`는
> 루프 안에서 라이브와 동일한 `slice(0,i).filter(...).length` 공식으로 매 반복 계산,
> 1049~1082행)과 `case "image_text":`의 `isCirclePair` 분기 뒤·`isCallout` 분기 앞에
> 삽입된 신규 `if (section.layout === "compact")` 분기(465~483행) 전부 브리프 스펙과
> 문자 단위로 일치. `components/DetailSectionRenderer.tsx`(155340바이트, 224차 검증 시점과
> mtime·크기 완전 동일)·`lib/compact-image-shape.ts`(491바이트, 12행 그대로)는 미변경
> 확인 — 브리프가 명시한 "export 전용 변경, 라이브·순수함수는 재사용만" 원칙 그대로 지켜짐.
> Cursor의 검증 스크립트를 신뢰하지 않고, **실제 스테이징된 `compact-image-shape.ts`를
> `npx tsx`로 직접 import해 5개 테스트**(명시적 imageShape 최우선, count&lt;2 항상 square,
> count≥2 인덱스 패리티 교대)와 **라이브의 카운터 공식을 별도로 손으로 재구현해 4-compact
> 합성 시퀀스로 5개 테스트**(순차 인덱스 0~3, 총개수 4 고정, 정사각/원형/정사각/원형 교대)를
> 새로 실행 — 10/10 전부 통과. `esbuild`로 수정된 파일 전체 구문 파싱 통과(59.6kb, 오류
> 없음). 스크린샷(`compact-thumbs.png`, 합성 3섹션)을 직접 열람해 400×400 정사각(포인트
> 하나·좌측 정렬)·401×401 원형+텍스트 우측 정렬(포인트 둘·`imagePosition:"right"`)·402×402
> 정사각(포인트 셋)이 예측한 square/circle/square 교대와 정확히 일치함을 육안 확인.
> `electronics-compact-thumbs.png`(실세션)는 "quick points" 라벨이 붙은 컴팩트 행이 존재함을
> 보여주나 이미지 자산 자체가 깨져 보임(플레이스홀더 소스 문제로 판단, 코드 로직과는 무관 —
> 결론에 영향 없음). `tsc` 0(esbuild로 대체), 유료 API 0건 — §1로 이동, §5 등록, §3 다시
> 소진(현재 비어 있음).

## 요약 (2026-09-18 / 225차 — 새 축 자체 발굴: export HTML `layout:"compact"` 완전 누락 발견, 브리프 작성)

> 224차로 §3이 다시 비어 사용자가 재차 "새 축 자체 발굴" 선택. 이번엔 라이브
> (`DetailSectionRenderer.tsx`)와 export(`lib/export-detail-html.ts`)가 `@/lib/*`에서
> import하는 목록을 서로 비교하는 방식으로 조사 — 라이브에만 있고 export엔 없는
> `compact-image-shape`(`resolveCompactImageShape`)를 추적한 결과, **`layout:"compact"`
> 섹션 전체가 export에서 처리되지 않는다는 것**을 발견. `case "image_text":`의 라이브
> 분기(circle-solo/pair→compact→annotated→callout→editorial-bleed→기본)와 달리 export는
> compact 분기가 아예 없어, compact 섹션이 맨 아래 기본(split) 분기로 떨어져 전체폭
> 정사각 이미지+텍스트라는 완전히 다른 레이아웃으로 나옴. `compact`는 드문 옵션이 아니라
> `lib/section-templates.ts`가 "quick_points: layout 반드시 'compact'"로 강제하는 필수
> 슬롯(2~4개 섹션) — 223/224차보다 더 흔하고 더 크게 눈에 띄는 불일치로 판단. 원본
> 렌더 로직(`DetailSectionRenderer.tsx:1609~1660`)을 export 관례(고정 px, 반응형 없음)에
> 맞게 이식하고, `sectionHtml()` 시그니처에 `compactImageTextIndex`/
> `totalCompactImageTextCount` 파라미터 2개를 추가해 정사각형/원형 교대 로직
> (`resolveCompactImageShape`, 이미 존재하는 순수 함수 재사용)까지 배선한
> `cursor_brief_225cha_export_compact_layout_missing.md` 작성. 유료 API 0, Cursor 실행
> 대기.

## 요약 (2026-09-18 / 224차 실행·독립 검증 완료 — 포인트 카운터 패리티 확정)

> Cursor가 `review/224cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일을 재스테이징해
> `components/DetailSectionRenderer.tsx`의 import(`shouldUseSplitLayout` 추가)와
> `isFullPoint` 계산부(`const isFullPoint = shouldUseSplitLayout(section);`)가 브리프
> diff와 정확히 일치함을 확인, 옛 인라인 조건식이 완전히 제거됐고 무관한
> `feature_callout`(isCallout 판별용, 1592행)은 그대로 남아있음을 grep으로 재확인.
> `lib/export-detail-html.ts`는 mtime 완전 불변(223차 이후 그대로)으로 무변경 확정 —
> 브리프가 명시한 "export는 이미 정답이라 손대지 않는다"는 원칙 그대로 지켜짐. `esbuild`로
> 수정된 155KB tsx 파일 전체 구문 파싱 통과(문법 오류 없음). 로직 정확성은 Claude가 실제
> `shouldUseSplitLayout`/`shouldUseEditorialBleed` 소스를 직접 읽고 독립적으로 재구현한
> Node 시뮬레이션으로 재확인 — 수정 전 옛 공식은 예측대로 `material_detail`에서 POINT
> 03·이미지 왼쪽(export는 POINT 02·이미지 오른쪽)으로 어긋났고, 수정 후 공식(=
> `shouldUseSplitLayout` 직접 호출)은 export와 pointIndex 수열이 완전히 일치함을 확인.
> 이제 라이브·export가 같은 공유 함수를 호출하므로 구조적으로 더 이상 드리프트가
> 불가능. `tsc` 0(esbuild 구문 검증으로 대체), 유료 API 0건 — §1로 이동, §5 등록, §3
> 다시 소진.

## 요약 (2026-09-18 / 224차 — 포인트 카운터 라이브·export 어긋남 확인, 브리프 작성)

> 223차로 §3이 다시 비었을 때, 223차 브리프 §4(스코프 밖)에 "확신 없음"으로만 각주
> 남겨뒀던 의심 사항 — 라이브 `isFullPoint`(`DetailSectionRenderer.tsx:3756`)와 export
> `shouldUseSplitLayout()`(`lib/export-detail-html.ts`가 재사용) 기반 포인트 카운터가
> 에디토리얼 블리드 섹션(`EDITORIAL_BLEED_SLOTS` 10개 슬롯 — usage_scenario·coordination
> 등)을 카운트에 포함하는지 다를 수 있다는 것 — 을 사용자가 이번 라운드로 직접 지정.
> Node 샌드박스에서 두 파일의 실제 조건식을 그대로 시뮬레이션해 **실제로 어긋남을 확정**:
> `shouldUseSplitLayout()`(export가 재사용)은 `shouldUseEditorialBleed()` 제외를 포함하는데,
> 라이브의 `isFullPoint`는 같은 조건을 직접 풀어쓰면서 이 제외를 빠뜨림. 재현 시나리오
> (hero→feature_detail→usage_scenario[에디토리얼 블리드]→material_detail→checklist→
> quality_detail)에서 `material_detail` 섹션이 **라이브는 "POINT 03"·이미지 왼쪽, export는
> "POINT 02"·이미지 오른쪽**으로 번호도 다르고 좌우까지 뒤집히는 것을 수치로 확인 — 사용자가
> 에디터에서 보는 레이아웃과 실제 export한 HTML의 레이아웃이 다른 실질적 버그. export 쪽은
> 이미 올바른 설계(에디토리얼 블리드 제외)라 손대지 않고, 라이브의 중복 작성된 조건식을
> 공유 함수 `shouldUseSplitLayout()` 재사용으로 교체하는 최소 변경(import 1개 + 5줄→1줄
> 교체)을 명시한 `cursor_brief_224cha_point_counter_editorial_bleed_parity.md` 작성.
> 유료 API 0, Cursor 실행 대기.

## 요약 (2026-09-18 / 223차 실행·독립 검증 완료 — export "부품/기능 주석 오버레이" 복원 확정)

> Cursor가 `review/223cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일을 재스테이징해
> 신규 `lib/annotated-image-overlay-svg.ts`(67행) 전문을 브리프 스펙과 줄 단위로 대조 —
> 정확히 일치(`clampPct`/`leaderEnd`/`buildAnnotatedImageOverlaySvg`, 원본
> `AnnotatedImageOverlay.tsx`와 동일 계수). `lib/export-detail-html.ts`의
> `shouldUseSplitLayout` 분기도 재대조 — `isAnnotatedSection` 판별, annotated 섹션 고정
> 50/50 비율, POINT 배지 숨김, `${annotationOverlayHtml}` 삽입까지 브리프 diff와 정확히
> 일치. 원본 `components/AnnotatedImageOverlay.tsx`는 mtime 불변으로 미수정 확인. Cursor
> 검증 스크립트를 신뢰하지 않고, **별도로 처음부터 작성한 18개 테스트 케이스를 실제
> 스테이징된 소스 파일(`npx tsx`로 직접 import)에 대해 실행** — side 판정(경계·타이 케이스
> 포함)·clamp·escapeXml·빈 배열·markup 전부 18/18 통과. `esbuild`로 수정된 파일 전체
> 구문 파싱도 통과(문법 오류 없음). 스크린샷(`electronics-annotated-overlay.png`)은
> 480×29px로 너무 작게 잘려 육안 확인에는 부적합했지만(라벨 배지 텍스트만 겨우 보임),
> 코드 대조·독립 재구현 증거가 충분히 강해 결론에는 영향 없음. 비-annotated 섹션은
> `annotationOverlayHtml`이 항상 빈 문자열이라 회귀 없음을 코드로 재확인. `tsc` 0(자체
> 검증은 esbuild 구문 파싱으로 대체), 유료 API 0건 — §1로 이동, §5 등록, §3 다시 소진.

## 요약 (2026-09-18 / 223차 — 새 축 자체 발굴: export HTML "부품/기능 주석 오버레이" 완전 누락 발견, 브리프 작성)

> 222차로 §3이 다시 비어 사용자가 재차 "새 축 자체 발굴" 선택. `image_text` 다이어그램류
> (`PackageContentsDiagram`/`FoodRatioDiagram`/`IngredientRingDiagram`) 호출 횟수가 라이브·
> export 간 다른 것을 실마리로 조사하다가, 그 다이어그램들 자체는 버그가 아님(라이브가
> `isAnnotated`/기본 분기 두 곳에 로직을 중복 작성했을 뿐, export는 `shouldUseSplitLayout()`
> 한 분기로 통합해 결과는 동일 — 코드 대조로 확인)을 확인했지만, 그 과정에서 진짜 문제를
> 발견: **`layout:"annotated"` 섹션의 `AnnotatedImageOverlay`(부품/기능 포인트 라벨 —
> 이미지 위 점+인출선+말풍선 라벨)가 `lib/export-detail-html.ts`에 아예 구현이 없음**
> (grep 0건). 이건 `lib/apply-electronics-annotations.ts`(전자제품 `feature_detail`)·
> `lib/apply-cosmetics-annotations.ts`(화장품/뷰티 최대 2섹션)가 **Vision API를 유료로
> 호출해 생성한 실제 콘텐츠**라, 라이브 미리보기엔 보이지만 사용자가 실제로 마켓에 올릴
> export한 정적 HTML에는 통째로 빠져 있었던 것 — 219/221차의 엣지 케이스보다 훨씬 흔하고
> 영향이 큰 콘텐츠 소실 버그. 원본(`components/AnnotatedImageOverlay.tsx`)의 기하 로직
> (`clampPct`/`leaderEnd`)을 1:1 이식한 `lib/annotated-image-overlay-svg.ts` 신규 작성,
> export의 `shouldUseSplitLayout` 분기에 오버레이 렌더 + (라이브와 맞춰) annotated 섹션엔
> POINT 배지 숨김 + 60/40 리듬 대신 고정 50/50 적용까지 함께 명시한
> `cursor_brief_223cha_export_annotated_overlay_missing.md` 작성. 조사 중 발견한 별도
> 미검증 의심 사항(라이브·export의 `isFullPoint`/포인트 카운터가 에디토리얼 블리드 섹션을
> 셈에 포함하는지 다를 수 있음)은 확신이 없어 이번 스코프에서 제외, 브리프 각주로만 기록.
> 유료 API 0, Cursor 실행 대기.

## 요약 (2026-09-18 / 222차 실행·독립 검증 완료 — 반려동물·패션·생활용품 컴플라이언스 3종 확정)

> Cursor가 `review/222cha-report.md`로 실행 완료 보고. Claude가 PC 실제 파일을 재스테이징해
> `lib/pet-compliance.ts`(278행)·`lib/fashion-compliance.ts`(274행)·`lib/living-compliance.ts`
> (280행) 전문을 처음부터 끝까지 읽고 `lib/electronics-compliance.ts`와 구조 100% 일치(동일
> `sanitizeText`/`sanitizeSection`/16-case switch/`review*Copy`/`mergeReplacements`) 확인,
> 카테고리 상수(`반려동물`/`의류/패션`/`생활용품`)가 `CreateProductForm.tsx`의 `CATEGORIES`와
> 정확히 일치함을 재대조. `route.ts`도 재스테이징해 import 3개·`generateCopyWithDeepSeek()`의
> `petGuide`/`fashionGuide`/`livingGuide` 삽입·최종 검수 6-way 삼항 분기가 브리프 그대로
> 배선됐고 cosmetics/food/electronics 3개 기존 분기는 무변경임을 확인. 마지막으로 Cursor의
> 검증 스크립트를 신뢰하지 않고, 3개 파일에서 읽어온 `REPLACEMENT_RULES` 배열을 그대로
> 옮겨 **별도 Node.js 샌드박스에서 완전히 새로 작성한 sanitizer**로 pet/fashion/living
> 각 5개(순서 의존 중첩 케이스·무히트 케이스 포함)씩 총 15개 테스트를 독립 재실행 —
> **15/15 전부 정확히 일치(ALL PASS)**. 219차(헤드라인 불확정) 같은 모호함 없이 이번 라운드는
> 코드 대조·정규식 재구현 전부 깔끔하게 확정. `tsc` 0, 유료 API 0건 — 222차로 3개 항목 §1로
> 이동, §3 다시 소진.

## 요약 (2026-09-18 / 222차 — 새 축 자체 발굴: 나머지 3개 카테고리 컴플라이언스, 브리프 작성)

> 222차: 221차로 §3이 완전히 비어, 사용자가 "새 축 자체 발굴"을 선택 → Claude가
> `lib/` 디렉토리를 재검토해 206차가 만든 "AI 생성 카피 표시광고법 위반 표현을 서버가
> 최종 강제 치환" 패턴(`cosmetics-compliance.ts`/`food-compliance.ts`/
> `electronics-compliance.ts`)이 6개 카테고리 중 3개(화장품/뷰티, 식품, 전자제품)에만
> 적용돼 있고 나머지 3개(반려동물, 의류/패션, 생활용품)엔 없다는 것을 발견. 특히
> **반려동물 카테고리는 사료관리법 등 관련 법령상 "질병 예방/치료 효과/수의사 추천"류
> 표현의 과장광고 리스크가 더 민감**하다고 판단해 우선순위를 높게 매김. `route.ts`를
> 재확인해 206차와 완전히 동일한 3곳 배선 패턴(import·프롬프트 가이드·최종 검수 분기)을
> 확인, 3개 신규 파일(`pet-compliance.ts`/`fashion-compliance.ts`/`living-compliance.ts`)
> 구조와 카테고리별 금지 표현·치환안을 제시한
> `cursor_brief_222cha_remaining_category_compliance_rollout.md` 작성. 카테고리
> 문자열은 203/204차 교훈대로 `CreateProductForm.tsx`의 `CATEGORIES` 배열
> ("의류/패션"·"생활용품"·"반려동물")을 미리 직접 확인해 브리프에 정확히 명시. 유료
> API 0, Cursor 실행 대기.

## 요약 (2026-09-18 / 221차 — 가로 오버플로우 수정 완료·검증 완료)

> 221차: 220차가 발견한 가로 오버플로우(공백 없는 40자+ 헤드라인이 line-clamp 대신
> 카드 밖으로 흘러넘침) 수정을 Cursor가 완료(`review/221cha-report.md`), Claude가
> PC 소스 재스테이징으로 독립 검증. Cursor는 브리프가 제안한 단순 `break-words` 1줄
> 추가만으로는 부족함을 스스로 발견해 더 깊은 원인을 특정 — `app/globals.css`의
> `[data-pagzly-preview][data-headline-face=…] .pagzly-display-headline`가
> `word-break:keep-all; overflow-wrap:break-word`를 Tailwind 유틸리티보다 높은
> 특이도로 이미 지정하고 있어, `break-words`(=`overflow-wrap:break-word`)를 더해도
> 같은 값이라 무공백 긴 토큰엔 효과가 없었음 — Claude가 globals.css 47~61행을 직접 읽어
> 해당 선택자·`word-break:keep-all`·`overflow-wrap:break-word`를 정확히 재확인.
> `![overflow-wrap:anywhere]`(important 강제)로 해결, `keep-all`은 유지돼 자연어
> 헤드라인(공백 있음)의 정상적인 어절 단위 줄바꿈은 그대로 보존. `export-detail-html.ts`의
> callout/split/default 3개 분기 헤드·본문 인라인 스타일에도 `overflow-wrap:anywhere`가
> 배선된 것을 코드 대조로 확인. Claude가 before/after 스크린샷 3장을 직접 열람해 육안
> 확정: 40자 무공백 더미는 카드 안에서 5줄 + "···"로 깔끔하게 클램프(가로 이탈 없음),
> electronics "방 안에 놓이는 디자인"·pet "2kg 한 봉 포장"은 기존처럼 자연스러운 공백
> 단위 줄바꿈으로 회귀 없이 렌더링. `tsc` 0, API 0 — §1로 이동, §3 완전히 소진.

## 요약 (2026-09-17 / 220차 — 헤드라인 잘림 최종 확정 + 신규 가로 오버플로우 발견)

> 220차: 219차 검증에서 미확정으로 남았던 `image_text` 헤드라인(`<h3>`) line-clamp 수정을
> 코드 변경 없이 스크린샷 1~2장으로 마무리. Cursor가 electronics `design_detail`·pet
> `packaging_design` 스크린샷을 캡처(`review/220cha-headline-check/`)해와, Claude가 이미지를
> 직접 열람(필요한 부분은 OCR로 위치를 먼저 찾은 뒤 육안 확인) — **electronics "방 안에
> 놓이는 디자인"(4줄), pet "2kg 한 봉 포장"(1줄) 둘 다 "···" 잘림 없이 완전히 렌더링됨을
> 최종 확정**. 219차 실측치가 before/after 동일했던 이유는 이 두 헤드라인이 애초
> line-clamp 경계 근처도 아니었기 때문으로 결론.
>
> 검증 과정에서 **신규 발견 1건**: Cursor가 함께 캡처한 40자 무공백 더미 헤드라인
> 스크린샷(`electronics-long-dummy.png`)에서, line-clamp이 아니라 **가로 오버플로우**가
> 발생 — 텍스트가 줄바꿈 없이 카드 오른쪽 경계를 뚫고 뷰포트 밖으로 흘러넘침. 219차의
> Playwright 스크립트는 세로축(`scrollHeight`/`clientHeight`)만 측정해 이 가로 오버플로우를
> 감지하지 못했음(clamp-after.json엔 `overflow:true`로만 기록, 원인이 세로 클램프인지
> 가로 오버플로우인지 구분 안 됨). 원인은 219차가 `TYPO.keywordDisplay`·
> `export-detail-html.ts`엔 `break-words`/`overflow-wrap`을 추가했지만 이 `<h3>`
> className엔 빠뜨린 것. 실제 생성 데이터(공백 포함 자연어 헤드라인)에서는 재현된 적
> 없는 인위적 극단 케이스라 §3에 낮은 우선순위 후보로 등록, 사용자 판단 대기.

## 요약 (2026-09-17 / 219차 실행·독립 검증 완료 — 2건 확정, 1건 부분확인)

> 219차 실행 검증: Cursor가 `review/219cha-report.md`로 완료를 보고해와, 보고 내용을
> 그대로 믿지 않고 PC의 실제 파일을 재스테이징해 대조. **버그 B(`parseMegaKeywordHeading()`
> 숫자 토큰 가드)는 깔끔하게 확정**: `lib/detail-visual-enhancements.ts`가 브리프 코드와
> 주석까지 정확히 일치, Claude가 Cursor의 검증 스크립트를 읽지 않고 함수 로직을 처음부터
> 별도 Bash/Node 샌드박스에 독립 재구현해 5개 테스트 케이스("210g/yd"→null,
> "코튼 100%"→"코튼", "수축 2%↓"→"수축", "AURA LAB"→"AURA", "단당 80kg"→"단당" 유지)
> 전부 보고서와 정확히 일치 확인. `TYPO.keywordDisplay`의 `break-words`, `export-detail-html.ts`
> 3곳의 `overflow-wrap:break-word` 추가도 코드 대조로 확인.
>
> **버그 A 중 본문(`<p>`) 잘림도 깔끔하게 확정**: `clamp-before.json`(207/148, overflow:true)
> → `clamp-after.json`(207/207, overflow:false)로 명확하고 깨끗한 수치 변화 — line-clamp-5→7
> 확장이 실제로 잘림을 해소했음을 실측으로 확인.
>
> **버그 A 중 헤드라인(`<h3>`) 잘림은 완전히 확정하지 못함(부분 확인)**: Cursor가 브리프의
> 제안(line-clamp-3, 클래스만 변경)을 넘어 line-clamp-5로 확장하면서 `pagzly-ink-headline`
> 클래스까지 제거(CSS cascade layers 충돌 — unlayered `.pagzly-ink-headline{display:inline-block}`가
> layered `.line-clamp-N{display:-webkit-box}`를 항상 이긴다는 근거)했는데, 이 메커니즘
> 자체는 Claude가 Playwright로 별도 격리 재현(`/home/claude/219check/`)해 실재함을 확인함.
> 다만 Cursor의 실제 프로덕션 before/after 수치가 electronics·pet 헤드라인 둘 다
> **before와 after가 완전히 동일**(electronics 216/211, pet 38/34, 둘 다 변화 없음) —
> 코드를 바꿨는데 측정값이 하나도 안 바뀐 것은 이 변경이 실제로 해당 헤드라인의 렌더링
> 결과에 영향을 줬다는 증거가 되지 못함. Claude의 격리 재현은 "완전히 무력화(gap=0)" 또는
> "진짜 2줄 클램프(gap≈157px)"라는 깨끗한 이분법 결과만 냈는데, 실제 프로덕션 값은 그
> 어느 쪽도 아닌 작고(~4~5px) 변화 없는 gap이라 두 설명 다 깔끔히 들어맞지 않음 — 가장
> 유력한 해석은 이 특정 헤드라인 텍스트(예: "방 안에 놓이는 디자인", 10자 내외)가 애초
> line-clamp 제한선 근처에도 못 미치고, 관측된 4~5px 갭은 폰트 메트릭/서브픽셀 반올림
> 수준의 잡음이라 line-clamp이나 ink-headline 어느 쪽과도 무관하다는 것 — 즉 헤드라인
> 잘림은 애초에 (적어도 이 두 실사례에서는) 본문만큼 심각한 문제가 아니었을 가능성.
> 코드 변경 자체(line-clamp-5, ink-headline 제거)는 저위험이고 롱더미(40자) 안전장치도
> 여전히 작동해 되돌릴 필요는 없다고 판단, 다만 "확정 완료"로 표시하지 않고 §3에 저비용
> 후속 확인(스크린샷 1장)을 남김.\n\n## 요약 (2026-09-17 / 219차 반영 — 무료 재벤치마크, 버그 2건 발견·브리프 작성)

> 219차: "후커블과 디자이너가 만든 수준" 장기 과제에서 사용자가 "실제 생성물 직접
> 열람 + 재벤치마크(무료)"를 선택 — 새 크롤링·새 생성 없이 기존
> `review/181cha-live/{beauty,electronics,fashion,food,living,pet}/03-result-full.png`
> 6개 카테고리 전체 페이지 스크린샷을 처음부터 끝까지 직접 재열람(158/181/208차
> 4축 방법론). 의심 지점은 반드시 각 `session.json`의 원문 heading/body와 대조해
> "실제로 잘렸는지" 확정(추측 금지). **버그 2건 확정**:
> (A) `image_text` 좁은 2단 레이아웃(`DetailSectionRenderer.tsx` `case "image_text"`,
> `HEADLINE_CLAMP`=`line-clamp-2`+본문 `line-clamp-5`)이 에디터 모바일 미리보기에서
> 정상 길이 헤드라인/본문도 "···"로 잘림 — electronics `design_detail`("방 안에
> 놓이는 디자인"→"방\n안에···"), pet `packaging_design`("2kg 한 봉 포장"→"2kg 한\n
> 봉···") 2건 실사례로 원문 대조 확정. 156차가 이미 이 위험을 인지하고 텍스트
> 컬럼 40% 하한을 뒀지만 부족했음. 정적 export HTML은 line-clamp를 안 써서
> 영향 없음(에디터 미리보기만 영향 — 판매자 신뢰도 이슈).
> (B) `parseMegaKeywordHeading()`(`lib/detail-visual-enhancements.ts`)이 첫 토큰을
> 길이만 보고 초대형 키워드로 승격시켜, fashion `highlight_box` 카드의 "210g/yd"
> (숫자+영문+기호 혼합, 줄바꿈 지점 없음)가 옆 카드 위로 흘러넘침 — **라이브
> 미리보기뿐 아니라 정적 export HTML(`export-detail-html.ts` 카드 그리드)에도
> 동일하게 존재해 구매자가 보는 최종 페이지에도 영향 가능**, 버그 A보다 우선순위
> 높음. 두 버그 모두 코드 원인을 파일·행 번호까지 특정하고, 유료 API 0건·
> Playwright(기존 devDependency) 실측 + 유닛 테스트로 검증 가능한 범위로 스코프를
> 좁혀 `cursor_brief_219cha_image_text_clamp_and_keyword_overflow_fix.md` 작성,
> Cursor 실행 대기. living `highlight_box`의 "단당 80kg"(원문 그대로, "1단당"에서
> 수사가 빠진 것으로 보임)은 렌더링은 의도대로 동작해 **버그 아님** — 카피
> 생성 완결성 문제로 판단해 이번엔 손대지 않고 후보로만 기록(§2 참고).
> `219cha-live-rebenchmark-findings.md`에 4축 전체 재검토 결과 기록.

## 요약 (2026-09-17 / 218차 반영 — 실행·독립 검증 완료, 매칭 강도 보강 프로덕션 반영)

> 218차 실행 검증: Cursor가 `review/218cha-report.md`로 완료 보고 → Claude가
> `lib/photo-composite.ts`를 재스테이징해 상수 diff를 직접 대조(colorMix
> 0.22→0.38, lumMix 0.14→0.24, contrastMix 0.16→0.28, 채널 클램프
> [0.82,1.18]→[0.65,1.40], 콘트라스트 클램프 [0.88,1.15]→[0.75,1.30], 그레인
> 알파 0.02~0.05→0.03~0.07 — 전부 보고서와 일치), `matchCutoutSharpness`·
> 세이프가드·`lifestyle-product-composite.ts`는 mtime이 216차 검증 시점과
> 완전히 동일해 미변경 확인. **핵심 수치(극단 색역 거리 150.04/97.24/62.88,
> 회귀 케이스 배경·컷아웃 평균색)를 Cursor의 스크립트를 실행하지 않고 별도
> Node 샌드박스에서 처음부터 재구현해 재계산** — 소수점 둘째 자리까지 정확히
> 일치 확인(`218cha-cursor-execution-report.md`). 보고서가 "브리프 제안
> 상수로 1차 실행 시 축소율 24.9%로 실패 → WB만 재조정해 35.3%로 통과"라고
> 밝힌 실패 서사도 브리프 지침과 일치해 정직하게 보고된 것으로 판단. **결론:
> 합성 테스트 케이스 기준으로 극단 색역 매칭이 구 상수 대비 35.3% 더
> 개선됐고 과보정(오버슈트) 없음을 확인 — 프로덕션에 반영된 상태 유지**.
> 단 이는 유닛 테스트 수준 개선이며, 216차 electronics 실제 사진으로 육안
> 체감되는지는 아직 미확인(유료 재검증 필요, 사용자 판단 대기).

## 요약 (2026-09-17 / 218차 반영 — 매칭 강도 보강 브리프 작성, Cursor 실행 대기)

> 218차: 217차 무료 조사에 이어, 사용자가 216차 원인 후보 (1) "매칭 강도 부족"을
> 진행하기로 선택. `lib/photo-composite.ts`를 읽어 `matchCutoutWhiteBalance()`의
> 보정 강도(`colorMix`0.22/`lumMix`0.14/`contrastMix`0.16)와 클램프 상한
> (채널 ±18%, 콘트라스트 ±12~15%)이 216차 같은 극단 색역 격차를 흡수하기엔
> 너무 보수적임을 코드로 확인, `matchCutoutGrain()`의 알파 상한(0.02~0.05)도
> 실사진 그레인 대비 미미함을 확인. **이번 라운드는 유료 생성 API를 전혀 쓰지
> 않고 기존 `scripts/211cha-lifestyle-matching-verify.ts` 같은 순수 함수 유닛
> 테스트로만 검증**하는 스코프로 제한 — `colorMix`→0.34, `lumMix`→0.20,
> `contrastMix`→0.24, 채널 클램프→[0.70,1.32], 콘트라스트 클램프→[0.80,1.25],
> 그레인 알파→0.03~0.07로 상향 제안. `matchCutoutSharpness()`와 세이프가드
> 임계값은 스코프 밖(별도 원인이라 판단)으로 명시적으로 제외. 극단 색역
> 케이스·회귀(과보정 방지) 케이스·그레인 케이스 3종 신규 유닛 테스트 추가를
> Cursor에 요구, 회귀 케이스(이미 잘 맞는 배경에서 과보정 없는지)를 "가장
> 중요한 안전장치"로 명시. `cursor_brief_218cha_matching_intensity_boost.md`
> 작성, Cursor 실행 결과 대기 중.

## 요약 (2026-09-17 / 217차 반영 — 무료 조사, 컷아웃 형태 문제 확인)

> 217차: 216차 보고서가 제시한 품질 미흡 원인 후보 3가지(매칭 강도 부족/색역 차이 큰
> 상품컷/unreliable placement로 인한 위치·스케일 어긋남) 중, 사용자가 "컷아웃 형태
> 문제부터 조사"(무료)를 선택. 코드 변경·유료 API 실행 없이 (1) electronics 상품컷
> `02-pexels-33936400.jpeg`을 직접 열람해 케이스+낱개 이어버드 2개, 총 3개 오브젝트가
> 흩어진 플랫레이 사진임을 확인, (2) `lib/lifestyle-product-composite.ts`
> 927~943행을 읽어 `removeProductBackground()`가 오브젝트 분리 없이 이미지 전체를
> 하나의 컷아웃으로 반환하는 구조임을 코드로 확인, (3) 216차 합성 결과 이미지를
> 재열람해 케이스+낱개 이어버드가 실제로 한 덩어리로 붙어있음을 육안 재확인 —
> **가설 확인: 컷아웃 형태 문제가 216차 품질 미흡의 실제 원인 중 하나**. 추가로
> `전자제품/` 폴더 나머지 4개 상품컷을 전부 열람해 대체 후보 조사:
> `05-pexels-1279107.jpeg`(구글 홈 미니 스피커 단독, 쥐기 적합 크기, 부드러운 조명)를
> 가장 유력한 대체 후보로 식별, `01-pexels-10104890.jpeg`(손에 쥔 이어폰 박스)도
> 차선책, `03/04`는 216차보다 더 심한 다중 오브젝트라 제외 권장. 단, 기존
> `전자기기-액세서리/` 라이프스타일 사진은 전부 "납작한 케이스 그립" 구도라 둥근
> 스피커와는 안 맞음 — 새 라이프스타일 사진 소싱이 별도로 필요함을 확인.
> `217cha-cutout-shape-investigation.md` 작성. 다음 방향(새 페어 유료 재검증 / 매칭
> 강도 보강 / 조사 종료)은 사용자 판단 대기.

## 요약 (2026-09-17 / 216차 반영 — 실행·독립 검증 완료, 211차 매칭 경로 최초 실사 도달·품질은 미흡)

> 216차: 215차 결과(4/4 재실패, electronics가 임계값 0.4에 0.018차 근접)를 보고한 뒤
> 4가지 선택지(임계값 완화/디버그 강제 플래그/추가 이미지 재시도/중단)를 제시했고
> 사용자가 "너가 권장하는 걸로 해"로 판단을 위임 → **디버그 강제 플래그**를 추천·채택
> (임계값 완화는 프로덕션 안전값을 영구 변경하는 리스크가 커서 기각, 추가 이미지 재시도는
> 최선의 215차 쌍도 임계값 미달이라 성공 불확실해서 기각). `compositeProductOnLifestylePhoto()`에
> QA 전용 `qaBypassGraspSafeguard` 플래그를 추가해 세이프가드를 우회하고 215차 electronics
> 쌍(overlap 0.382로 가장 근접했던 실제 조합)을 재사용해 **정확히 1건만** 유료 실행,
> 검증 후 코드 변경은 되돌리는 조건으로 `cursor_brief_216cha_qa_bypass_grasp_safeguard.md`
> 작성. Cursor가 실행 완료(`review/216cha-report.md`) → Claude가 report·summary.json·
> run-log·`qa-flag.diff` 전부 대조하고, **PC의 현재 소스 파일을 직접 재스테이징해
> `qaBypassGraspSafeguard`/`allowPaste` 문자열이 0건임을 grep으로 직접 재현 확인**
> (보고서 텍스트를 신뢰한 게 아니라 파일 내용 자체로 되돌림을 검증), `app/api/generate/
> route.ts` mtime이 216차 작업 구간보다 이전임도 확인해 프로덕션 미연결을 재확인
> (`216cha-cursor-execution-report.md`). **결과: `pasteCutoutOnScene`이 실사에서
> 처음으로 실행돼 `method: "pixel-paste"`로 성공** — 214+215차 8건 전부가
> `nano-banana-fallback`이었던 것과 대비됨(214→215→216차 조사에서 처음 도달). 다만
> 산출 이미지를 원본과 나란히 직접 열어본 결과 **품질은 아직 부자연스러움**을 육안으로
> 확인: 원본의 기존 케이스가 지워지지 않고 비침, 컷아웃의 블루/오렌지 스튜디오 조명이
> 원본의 어둡고 중립적인 조명과 크게 충돌, 접촉 그림자·그레인 거의 없어 붕 떠 보임.
> 이는 세이프가드가 막으려던 "부자연스러운 합성"의 구체적 실례이기도 해, 214/215차의
> "임계값이 과도하게 보수적" 가설에 대한 반대 증거로도 볼 수 있음 — §4에 갱신, 코드는
> 브리프대로 완전히 되돌려졌고 216차 종료로 "생성 API 0건/코드 변경 없이 관찰만" 원칙
> 기본값 복귀.

## 요약 (2026-09-17 / 215차 반영 — 실행·독립 검증 완료, 4/4 재실패 — 임계값 근접-미달 확인)

> 215차: 214차가 grasp 세이프가드에 걸려 211차 매칭 3축을 실사 검증하지 못한 뒤, 사용자가
> "211차 매칭 3축 실사 포함해서 214차 진행하자"는 요청에 따라 **더 나은 이미지 쌍으로
> 재시도**, 사용자가 "4건" 허가. 유료 생성 전 `scripts/test-assets/`를 무료로 전수
> 재검토해 214차 실패 원인(비비기 동작·카테고리 불일치)을 코드로 추적, 명확한 "쥐기"
> 포즈 + 형태 일치 4쌍(뷰티 세럼/전자 이어폰 케이스/식품 보충제 보틀/생활 머그컵)을
> 새로 선정해 `cursor_brief_215cha_lifestyle_matching_grasp_retry.md` 작성. Cursor가
> 정확히 4건 실행(합계 $0.203491, Vision 포함 관측 총액 ≈$0.250) → Claude가 보고서·
> summary.json·run-log·스크립트·mtime·산출 이미지 4장을 전부 대조하고, **grasp overlap
> 값을 원시 Vision 좌표에서 직접 재계산해 코드 공식과 소수점 셋째자리까지 일치함을
> 확인**(`215cha-cursor-execution-report.md`). **결과: 4건 모두 다시 nano-banana-fallback
> — pasteCutoutOnScene 0/4건.** 다만 이번엔 유의미한 데이터를 얻음: electronics 건이
> 임계값(`minGraspOverlapFraction=0.4`)에 **0.018 차이로 근접 실패**(overlap 0.382) —
> "이미지를 잘못 골라서"가 아니라 **세이프가드 임계값 자체가 보수적으로 설정돼 있다는
> 것**을 시사. 211차 매칭 3축의 실사 육안 검증은 214+215차 총 8건·$0.353을 들이고도
> 여전히 미해결 — §4에 재등록, 사용자에게 4가지 선택지(임계값 완화/디버그 강제 플래그/
> 추가 이미지 재시도/여기서 중단) 제시하고 다음 지시 대기 중.

## 요약 (2026-09-17 / 214차 반영 — 실행 완료·독립 검증 완료, 원래 목적은 미달성)

> 214차: 사용자가 "유료 생성 API 허가 요청" 방향을 선택하고 정확히 "2건만" 허가 → 브리프
> 작성 → Cursor가 정확히 2건 실행(합계 $0.108721, Vision 비용 포함 관측 총액 ≈$0.139) →
> Claude가 보고서·summary.json·실행 스크립트·실제 코드(`lib/lifestyle-product-composite.ts`)·
> 산출 이미지 2장을 전부 직접 대조해 독립 검증 완료(`214cha-cursor-execution-report.md`).
> **실행 자체는 브리프 가드레일(2건·무재시도·코드무변경) 그대로 정확히 지켜졌으나, 두 건
> 모두 89차부터 있던 정당한 안전장치(`detectHandPlacementWithGraspRetry` — Vision이
> grasp 위치를 3회 모두 `reliable=false`로 판정)에 걸려 `pasteCutoutOnScene()`(211차가
> 수정한 매칭 경로)이 구조적으로 도달 불가능했고, 대신 `nano-banana-fallback`(전체
> AI 재생성)으로만 완료됨.** 즉 214차가 원래 확인하려던 질문("211차 매칭 3축이 실사에서
> 자연스러운가")은 **여전히 미해결**입니다 — 돈은 정확히 허가된 만큼만 썼고 실행도 완벽했지만,
> 우연히 고른 이미지 쌍이 세이프가드를 통과하지 못해 목표 경로 자체가 실행되지 않았습니다.
> 추가 조치(더 나은 이미지 쌍 재시도, 또는 fallback을 막는 디버그 플래그 신설) 여부를
> 사용자에게 물었고, 사용자가 **"여기서 멈춤"**을 선택 — 211차 단위 테스트(전부 통과)를
> 실질적 검증 기준으로 채택하고 §2 의도적 보류로 이동. 재론 없음.

## 요약 (2026-09-17 / 213차 반영 — 코드 변경 없음, 정직한 null 결과)

| 상태 | 항목 수 (대략) |
|------|----------------|
| 완료됨 | 54 |
| 의도적 보류 | 17 |
| 미해결·API불필요 | **1** |
| API필요·허가대기 | 11 |

> 213차 (코드 변경 없음 — 새 마켓플레이스 크롤링 라운드): 사용자 지시 "새 마켓플레이스/사이트
> 재시도"에 따라 이전에 방문한 적 없는 사이트를 새로 크롤링. 네이버쇼핑(`search.shopping.naver.com`
> 등 서브도메인 포함) 재확인 → 여전히 도메인 전체 차단(3라운드 연속 실패, 정책적 차단으로 판단).
> 카카오쇼핑 → 내비게이션은 허용되나 렌더링 실패(원인 미상, 차단은 아님). 티몬 → 기업회생·인수
> 관련 정적 공지문만 노출, 정상 영업 재개 전이라 크롤 대상 아님. G9 → 서비스 종료 추정(에러
> 페이지). **W컨셉(wconcept.co.kr) → 신규 접근 성공**, 패션 실제 상품(니트 가디건) 상세페이지
> 전체 확인. 3개 후보 가설을 코드와 대조: (1) 법정 고시 "치수" 행이 "상세페이지참조"로 위임된
> 패턴(212차 11번가와 동일 계열) → `SPEC_SKELETONS["패션/의류"]`의 "사이즈" 행이 212차
> `SIZE_HINT_LABELS` 폴백에 이미 포함돼 있어 **선제적으로 이미 해결**돼 있음을 코드로 재확인.
> (2) "세탁방법" 행도 상세페이지 위임 패턴이나, `ProductInput`에 세탁·취급주의 입력 필드 자체가
> 없고(grep 0건) 원단별로 사실이 다른 정보를 AI가 지어내면 위험해 **의도적 보류**로 판단(신규
> §2 항목 추가, 의도적 보류 15→16). (3) 리뷰 상단 사이즈/색상/소재 정확도 % 배지 → 210차 쿠팡
> 크롤에서 이미 다룬 것과 동일 계열(플랫폼 집계 UI, Pagzly의 `buildAxisComparison`과 데이터
> 소스·프레이밍이 다름) — 재확인만 하고 결론 동일. **결론: 신규 사이트 접근엔 성공했지만 코드
> 변경 대상 없음 — 208/210차와 같은 정직한 null 결과.** `marketplace_crawl_findings_2026-09-07.md`
> §0 접근 결과 표 전체 갱신 + §6(W컨셉) 신규 추가.
>
> 212차 실행 검증 (Cursor 완료 보고 → Claude 독립 재검증): Cursor가 `review/212cha-report.md`로
> 완료를 보고해와, 보고 내용을 그대로 믿지 않고 `device_stage_files`로 PC의 실제 파일을 직접
> 대조했습니다. `lib/enrich-product-sections.ts`의 5곳 diff(전자/가전 스켈레톤에 "크기·용량·
> 형태" 행 추가, `resolveSkeletonValue`의 `productSizeHint` 폴백 — existing 값 우선순위
> 유지, 3개 함수 meta 타입 확장)와 `app/api/generate/route.ts` 1715행(`productSizeHint:
> body.productSizeHint`)이 브리프 지시와 정확히 일치함을 코드로 직접 읽어 확인. 카테고리
> 매핑도 `resolveTemplateCategory()`의 `"전자제품"→"전자/가전"` 별칭이 이미 있어 203차 같은
> 카테고리 문자열 혼동이 없었음을 grep으로 재확인. `lib/` 디렉토리 mtime 대조로 이번 라운드
> 변경 파일이 `enrich-product-sections.ts` 단 하나뿐임도 확인. **211차보다 한 단계 더
> 엄격하게**, 이번엔 Cursor의 검증 스크립트를 읽기만 한 게 아니라 핵심 로직을 별도 Node
> 샌드박스(`/tmp/212check/check.mjs`)에 처음부터 독립 재구현해 5개 검증 케이스(전자 크기
> 행=hint / 뷰티 용량=hint / hint 없으면 플레이스홀더 / 기존 값 있으면 hint로 안 덮어씀 /
> KC 인증 미입력 시 행 생략)를 직접 실행 — 전부 보고서의 "pass"와 일치. **결론: 212차
> 브리프대로 정확히 실행됨, 다른 파일 부작용 없음 — §3에서 §1로 이동, 완료됨 52건.**
>
> 212차 (브리프 작성, 코드 변경은 Cursor 실행 대기): 사용자 지시 "네이버 스마트스토어/
> 11번가 재시도"에 따라 실사 재크롤링. 네이버 스마트스토어는 이번에도 브라우저 접근
> 차단 상태 그대로(신규 정보 없음). 11번가는 210차 쿠팡처럼 이번에 새로 접근 가능해져
> 청소기 PDP(아이닉 아이타워 i50)를 크롤링 — "상품정보 제공고시"(법정 고시 표)에서
> "크기,용량,형태"/"KC 인증정보"/"정격전압,소비전력" 3개 항목이 전부 "상품상세설명
> 참조"로 위임 처리돼 있음을 확인. 이는 마켓플레이스가 이 정보를 셀러의 상세페이지
> 콘텐츠(Pagzly가 만드는 바로 그 페이지) 안에 있는 것으로 전제한다는 뜻. KC
> 인증정보/정격전압은 `SPEC_SKELETONS["전자/가전"]`에 이미 행이 있어 커버되지만
> "크기,용량,형태"는 전자/가전 스켈레톤에 행 자체가 없음을 코드로 확인. 더 나아가
> `lib/types/generate.ts:100`의 `productSizeHint`(폼 "용량·크기 힌트" 필드, 예:
> "35mL, 높이 약 9cm")가 정확히 이 데이터를 이미 판매자로부터 받고 있는데도, grep 전수
> 확인 결과 라이프스타일 합성 물리 스케일 매칭에만 쓰이고 `enrichSectionsWithProduct
> Metadata()`(spec_table 고시 표 보강 함수)에는 전달되지 않음(`app/api/generate/
> route.ts:1708~1715` meta 객체에 누락)을 확인 — 화장품(용량)·식품(내용량)·패션
> (사이즈)·생활리빙(규격) 카테고리도 동일 구멍. **입력 기근이 아니라 이미 받은 입력을
> 못 쓰고 버리는 배선 누락**으로 판단해 `cursor_brief_212cha_spec_table_size_hint_
> wiring.md` 작성 — `lib/enrich-product-sections.ts`(스켈레톤 행 1개 추가 + productSizeHint
> 폴백 배선)와 `app/api/generate/route.ts`(meta 객체 한 줄) 2개 파일만 대상, API 0.
>
> 211차 실행 검증 (Cursor 완료 보고 → Claude 독립 재검증): Cursor가 `review/211cha-report.md`로
> 완료를 보고해와, 보고 내용을 그대로 믿지 않고 `device_stage_files`로 PC의 실제 파일을 직접
> 대조했습니다. (1) `lib/lifestyle-product-composite.ts`의 import 목록에 `matchCutoutGrain`/
> `matchCutoutSharpness`/`matchCutoutWhiteBalance`가 실제로 추가됐고, `pasteCutoutOnScene()`
> 729~740행에서 브리프가 지시한 정확한 순서(화이트밸런스→선명도→그레인)로, 정확한 위치(크기/
> 회전 확정 직후, 그림자 계산 이전)에 배선된 것을 코드로 직접 읽어 확인. (2) mtime 대조로
> `lib/photo-composite.ts`(1789446527487)·`lib/photo-enhance.ts`(1789446548047)가 이번
> 라운드 이전 상태 그대로임을 확인 — "메인 파이프라인은 건드리지 않는다"는 하드 가드레일이
> 실제로 지켜짐. (3) Cursor가 작성한 `scripts/211cha-lifestyle-matching-verify.ts`를 직접
> 읽어 5개 검증 항목(매끈한 씬 스킵/파란 씬 화이트밸런스 이동/거친 씬 그레인 알파 범위/PNG
> 크기 일치/167차 캔버스 오버플로 회귀 없음)의 로직이 162~187차의 기존 검증 스크립트들과
> 동일한 방법론(순수 함수·결정론적 assertion)으로 타당하게 짜여 있음을 확인 — 보고서의 5개
> "pass"가 실제 코드 동작과 일치한다고 판단. **결론: 211차 브리프대로 정확히 실행됨, 다른
> 파일 부작용 없음 — §3에서 §1로 이동, 완료됨 51건.**
>
> 211차 (브리프 작성, 코드 변경은 Cursor 실행 대기): 210차 결과 보고 후 사용자가 "화면 배치
> 구성 / 이미지 합성 / 인포그래픽 상향 / 뒷배경 제품 색상에 맞게" 4개 영역을 지정해 재점검을
> 요청. 일반-목적 조사 서브에이전트로 4개 영역을 각각 (a) 관련 과거 라운드 문서 전수 대조,
> (b) 현재 코드 직접 열람으로 교차검증한 뒤, 제가 직접 핵심 주장(파일 경로·행 번호·import
> 목록)을 다시 코드로 재확인. 결과: **3개 영역(레이아웃, 인포그래픽, 배경색-매칭-로직 자체)은
> 이미 성숙하게 구현돼 있어 새 격차 없음** — 레이아웃은 151/183/190/195~198차 등 15개+
> 라운드가 이미 반복 정제, 인포그래픽은 각 다이어그램 타입(노이즈/무게/방수/전력/성분링 등)이
> 라이브·export 양쪽에 전부 동기화돼 있음을 직접 확인, 배경색 매칭은 `color-extract.ts`의
> 실제 픽셀 추출 테마가 히어로·섹션 배경 양쪽에 동일하게 흐르고 있음을 데이터 흐름으로 추적
> 확인(21~22차부터, 유사색조 전략은 53차부터 튜닝된 의도적 설계). **"이미지 합성" 1개 영역에서만
> 진짜 격차 발견**: 라이프스타일(AI 일상샷) 픽셀 페이스트 경로(`lib/lifestyle-product-composite.ts`
> `pasteCutoutOnScene()`)가 162차 그림자 색조 매칭만 받고, 그 후 163(콘트라스트)·164(선명도)·
> 187(그레인)차가 메인 히어로 경로에만 추가한 3개 매칭 축을 못 받은 채 방치돼 있었음 — 162차
> 문서 자체가 "이 파일도 동일하게 배선"이라 적어놓고 그림자 tint 하나만 실제로 배선했고, 이후
> 3개 라운드는 전부 이 파일을 언급조차 안 함(브리프·import 목록으로 직접 확인). 지어낸 문제가
> 아니라 문서 간 대조로 나온 실제 코드 격차 — `cursor_brief_211cha_lifestyle_composite_matching_axes_parity.md`
> 작성해 전달, §3에 신규 1건으로 등록. **결론: 4개 영역 중 3개는 재확인만, 1개(이미지 합성)는
> 실제 저위험 보강 브리프 발행.**
>
> 210차 (코드 변경 없음 — 신규 실사 크롤링 라운드): 사용자 지시("다시 한번 상세페이지들
> 싹 검토하고 크롤링해서 학습 한 다음 우리가 부족한 부분 지시사항으로 만들어봐")에 따라
> 208차와 달리 **기존 데이터 재사용이 아닌 신규 실시간 크롤링**을 수행. Claude in Chrome으로
> 쿠팡 실제 상품 상세페이지(쿠팡상품번호 9427713974, 무선 핸디 청소기)를 직접 열람 —
> 2026-09-07 `marketplace_crawl_findings_2026-09-07.md`에는 "브라우저 직접 접근 차단"으로
> 기록돼 있었으나 이번 라운드에는 정상 접근됨(신규 크롤링 소스 확보, 백로그 하단에 별도
> 기록). 히어로 갤러리 → 가격/스펙 → 새상품/반품 박스 → 교차판매 위젯 → "상품상세/상품평/
> 상품문의/배송" 탭바 → 실제 셀러 작성 "상품상세" 탭(충전 경고 레드 콜아웃 텍스트 → 마케팅
> 배너 이미지 시퀀스 → "상품정보 더보기" 접기) → 리뷰 탭(속성별 배지: 흡입력 92%·무게 97%·
> 소음 90%·사용시간 88%·가성비 96%, 각각 정성 태그 동반) 순으로 전체 구조를 스크롤·
> get_page_text로 확인. 추가로 hookable.ai/blog를 재방문해 2026-09-09 크롤링 이후 신규
> 게시물 7건(9/02~9/14)을 확인 — 대부분 콘텐츠 마케팅(촬영 단가, 추석 선물세트, 기획안
> 작성법 등)이라 코드 대조 대상이 아니었으나, "상세페이지 사이즈: 쿠팡·스마트스토어·
> 토스쇼핑 공식 규격 총정리"(8/28) 1건만 실제 검증 가능한 수치 주장이라 채택.
>
> 이번 라운드에서 나온 확인 가능한 가설 3건을 모두 현재 코드와 직접 대조:
> (1) 충전 경고 레드 콜아웃(마케팅 이미지 배치 전 안전 주의문) → `lib/types/generate.ts`의
> `CautionSection`(`type: "caution"`)이 이미 동일 역할로 존재 — 커버됨.
> (2) 리뷰 속성 배지(축별 % + 정성 태그) → 137차 `buildAxisComparison()`(`lib/review-insights.ts`)이
> 실제 업로드 리뷰 원문에서 결정론적으로 축별 매칭 비율을 뽑아 `insertReviewAxisComparisonSection()`
> (`lib/section-inserts.ts`)으로 `comparison_chart`에 이미 반영 중. 다만 프레이밍이 다름 —
> Pagzly는 "우리 제품 vs 일반 제품(기준선 50)" 비교형, 쿠팡은 플랫폼이 집계하는 중립적
> 절대 percentage+태그형(셀러가 작성하는 게 아니라 마켓플레이스 UI). 목적이 다른 두 UI라
> 버그도 취향 격차도 아니라고 판단 — 백로그 변경 없음.
> (3) 플랫폼별 권장 가로폭(스마트스토어 860px·쿠팡 780px·토스쇼핑 750px) → `lib/download-platforms.ts`
> 기존 값(smartstore 860 / coupang 780 / toss 750 / ohouse 750)과 정확히 일치. 웹서치로
> 2026년 최신 업계 가이드 다수와 대조해 780/860/750 수치가 지금도 표준임을 외부 검증 —
> 기존 구현이 정확했음을 재확인, 코드 변경 불필요.
> **결론: 신규 소스(쿠팡)를 포함한 실사 크롤링에서도 새 코드 버그는 발견되지 않음 —
> 3건 모두 이미 커버되었거나 기존 구현이 정확함이 확인됨. 208차와 마찬가지로 지어낸
> cursor_brief 없이 "재확인 완료"만 기록. 새 자산은 "쿠팡 접근 가능"이라는 크롤링 인프라
> 사실 하나 — 다음 라운드가 쿠팡을 벤치마크 소스로 쓸 수 있게 됨.**
>
> 209차 (코드 변경 없음 — 백로그 재분류 라운드): 사용자 지시("의도적 보류 항목 재검토")에
> 따라 §2(의도적 보류) 15건 전부를 현재 코드와 다시 대조. 가드레일 성격 항목(무지개차트·
> 경쟁사실명·anti-hallucination·가짜후기·AI인물생성)은 원칙 재확인만 하고 그대로 유지 —
> 이런 항목은 "재검토 대상"이 아니라 지켜야 할 제약이라 판단. 취향/공수 판단이었던 나머지
> 항목을 하나씩 확인한 결과 **2건이 실제로는 이미 완료돼 있었는데 백로그에 반영이 안 된
> 것**을 발견: (1) "히어로 그림자/색온도 A/B"(160, 취향) — 162차의 `tintedShadowColor()`가
> 이미 A/B 실험 없이 전 배경에 무조건 적용되는 프로덕션 기본값임을 코드로 재확인, 색온도
> 부분만 §1로 승격하고 그림자 "방향"(광원 각도)만 별도 항목으로 남김(실제 니즈 불확실이라
> 계속 보류). (2) "Track A 알파 soft/hard 미세 조정"(169, 사용자 취향 대기) —
> `design-tokens.ts`에 soft/hard를 고르는 토글·env가 전혀 없고 169차 대비 강화값이 44라운드째
> 유일한 프로덕션 값으로 운영 중임을 grep으로 확인, "대기 중인 결정"이 실은 존재하지 않아
> 완료로 재분류. 그 외 "POINT 배지 점선 연결선"(공수 사유는 185차 원형링 구현으로 무효화됐지만
> 디자인 언어 충돌이라는 원 사유는 여전히 유효 — 보류 유지), SPF/온도 기준표·색면 채도·
> Behance 전면교체·섹션 큐레이션·섹션 DnD 등 나머지 항목은 재확인 결과 원 판단 그대로
> 유효함을 확인. **결론: 코드 변경 없이 백로그 정확도만 개선 — §1에 2건 이동, §2 순항목
> 수는 그대로(재분류로 상쇄).**
>
> 208차 (코드 변경 없음 — 재조사 라운드): 사용자 지시("이전에 크롤링한 데이터와 내가
> 줬던 데이터 기반으로 확인해")에 따라 신규 크롤링·신규 생성 없이 (1) 기존 크롤링
> 문서 4건(`hookable_category_examples_2026-09-09.md`, `marketplace_crawl_findings_2026-09-07.md`,
> `151cha-category-layout-upgrade.md`, `159cha-designer-benchmark-footnote-dedupe.md`)의
> "다음 라운드 후보"를 전부 현재 코드와 재대조하고, (2) 사용자가 이미 만들어둔 실제
> 생성 세션 데이터(`review/181cha-live/{beauty,electronics,food,fashion,living,pet}/
> session.json·summary.json`, 6카테고리 실제 생성 결과)를 직접 열어 섹션 구성을 재검토함.
> 결과: 발견된 후보 전부 이미 이전 라운드에서 처리 완료로 확인됨 — `comparison_chart`
> 6카테고리 커버리지(151/161/181차 완료, rollup-final.json `charts:6`으로 재확인),
> `ingredient_highlight` 컴플라이언스 각주(160차 완료), 성분/균주 원형 배치도(185차
> `lib/ingredient-ring-diagram.ts` 완료), 전자제품 KC 인증 노출(기존 `enrich-product-sections.ts`
> 완료), 패션 "신장 대비 기장" 다이어그램(161차 의도적 스킵 — 모델키+기장 동시 입력 사례
> 0건, 억지 매핑 시 anti-hallucination 위반 위험이라는 근거 있음, 181cha-live 6개
> 세션 재확인으로도 해당 입력 패턴 여전히 없음), 저관여(생활/펫) step_card 데모트 여부
> (190차 판단·근거 있음, 재작업 금지 항목). living/electronics 세션에 `review_highlight`가
> 없는 것도 재확인 결과 리뷰 파일 미입력에 따른 정상 게이팅(입력 기근, 버그 아님)임을
> 확인. **결론: §3 미해결·API불필요 항목 0건 그대로 — 이번 라운드는 코드 변경 없이
> "재확인 완료"만 기록.** 다음 실제 새 축은 (a) 사용자가 새 방향을 지정하거나 (b) 생성
> API 허가 후 신규 실사 벤치마크 중 하나가 필요.
>
> 207차: 사용자 지시("후커블 및 디자이너가 만든 수준까지 나와야해")에 따라 Claude가
> 148차(2026-09-09) 실사 검증 문서에 59라운드째 "다음 라운드 후보"로만 남아있던 실제
> 버그를 코드 재검토로 확인·해소. `lib/apply-ingredient-circle-pair.ts`의
> `applyIngredientCircleVisual()`에서 성분 라벨 2개 이상(circle-pair) 경로가
> `texture_feel` 슬롯(선택 슬롯, `section-templates.ts` `required:false`)이 실제로
> 존재해야만 원형 성분 강조 비주얼을 만들었는데, DeepSeek가 이 슬롯을 자주 생략해
> 성분을 2개 이상 입력해도 원형 비주얼 자체가 조용히 통째로 스킵되고 있었음. 성분
> 1개짜리 circle-solo 경로가 이미 쓰고 있던 `pickAlternateIndex()`(texture_feel 우선
> 시도, 없으면 다른 상품 사진으로 폴백하는 기존 함수)를 circle-pair에도 그대로
> 재사용하는 것만으로 해소 — 신규 로직 0줄, 렌더링 컴포넌트(`DetailSectionRenderer.tsx`/
> `export-detail-html.ts`) 미수정. Cursor 구현 후 Claude가 diff를 코드 대조해
> `pickAlternateIndex` 재사용만 확인(신규 함수 없음), 4개 케이스(texture_feel
> 있음/없음/이미지 1장뿐/이미 circle 있음)를 별도 Node 샌드박스에서 독립 재시뮬레이션해
> 보고서 수치와 전부 일치함을 재확인. `tsc` 0, API 0.
>
> 206차: review-signal 계열(192~205차)이 205차로 종료된 뒤, 사용자 지시("코드 재검토해서
> 새 축 자체 발굴")에 따라 Claude가 코드를 직접 재검토해 발굴한 **컴플라이언스 축의 세
> 번째 카테고리 확장**. `lib/food-compliance.ts`(식품)·`lib/cosmetics-compliance.ts`
> (화장품)에 이미 있던 "AI 생성 카피에서 표시광고법 위반 표현을 서버가 최종 강제 치환"
> 패턴을 `전자제품` 카테고리로 확장(`lib/electronics-compliance.ts` 신규,
> `reviewElectronicsCopy()`) — 완벽 방수/고장 없음/평생 보장/전자파 없음/세계 최초 등
> 13개 금지 표현 치환 규칙. `mfdsReviewed`/`replacements` 필드가 이미 카테고리 무관 범용
> 타입이라 타입 파일·UI 컴포넌트 수정 없이 `route.ts` 3곳(import, 프롬프트 가이드,
> 최종 검수 3분기)만으로 배선 완료 — review-signal 계열보다 더 단순한 배선. Claude가
> 브리프 작성 중 정규식 13개를 직접 Node 샌드박스에서 시뮬레이션해 "반영구적으로"→
> "반장기간으로" 같은 단어 잘림 버그를 사전에 발견·수정(순서 조정 + `적?` 접미사 흡수).
> Cursor 구현 후 Claude가 파일을 재스테이징해 소스 100% 대조, 중첩 매칭 케이스를 별도
> 샌드박스에서 독립 재현해 재확인. `tsc` 0, DeepSeek 호출 경로 미추가, API 0.
>
> 205차: 사용자 지정("남은 카테고리에 review-signal 계속") — 192(반려동물)→203(식품)→
> 204(패션)에 이은 네 번째이자 마지막 review-signal 라운드. 화장품/뷰티·전자제품·
> 생활용품 3개 카테고리를 "장기 사용 후기 언급"(`countLongTermUseMentions`,
> `LONG_TERM_USE_PATTERN` — 숫자+기간 단위+사용 동사가 모두 붙은 경우만 매칭) 신호
> 하나로 동시에 커버 — 3카테고리가 "오래 써도 괜찮다"는 동일한 상업적 신호를 공유해서
> 카테고리별로 다른 정규식을 만들 필요가 없었음. 한글 고유어 숫자("한 달째")는 192차와
> 동일한 원칙으로 의도적 제외(안전한 과소집계). Cursor 구현 후 Claude가 정규식을 별도
> 샌드박스에서 독립 재구현해 hit/mixed 값과 오탐 방지 케이스("10개월 전에 상했어요",
> "가격이 10만원대") 전부 재확인, `route.ts`의 3중 OR 게이팅 문자열도 grep으로 재대조.
> **이걸로 "기타"를 제외한 실제 6개 카테고리 전부에 review-signal 롤아웃 완료** —
> 반려동물(나이·체중)/식품(재구매)/패션(사이즈·핏)/뷰티·전자·생활(장기 사용). `tsc` 0,
> DeepSeek 신규 호출 0, API 0.
>
> 204차: 사용자가 직접 방향 선택("패션 사이즈/핏 리뷰 신호") — 192(반려동물)→203(식품)에
> 이은 세 번째 review-signal 축. 패션 카테고리에 "사이즈/핏 언급" 신호
> (`countSizeFitMentions`, `SIZE_FIT_PATTERN`)를 동일 구조로 추가. "크다/작다" 단독
> 표현은 문맥 의존적 오탐 위험(예: "가격이 크게 부담되진 않아요")이 있어 애초 제외하고
> "사이즈" 키워드가 반드시 동반되는 명시적 어휘(`정사이즈`/`사이즈업`/`사이즈다운`/
> `사이즈 크게·작게`)만 다루도록 설계 — 203차에서 카테고리 문자열을 잘못 적었던 교훈으로
> 이번엔 `CreateProductForm.tsx`의 `CATEGORIES` 배열을 미리 확인해 `"의류/패션"`(단독
> `"패션"` 아님)을 브리프에 정확히 명시. Cursor 구현 후 Claude가 별도 샌드박스에서
> 정규식을 독립 재구현해 hit/miss/mixed 값과 오탐 방지 케이스("가격이 크게…", "작다고
> 느낄…" → 0건)를 재확인, `route.ts`의 게이팅 문자열도 grep으로 재대조. `tsc` 0,
> DeepSeek 신규 호출 0, API 0.
>
> 203차: §3이 비어 있어 Claude가 코드를 직접 재검토해 새 축 발굴(아래 §1 추가) —
> 192차 반려동물 "나이·체중 언급" 정규식 패턴(`countPetAgeWeightMentions`)이 다른
> 카테고리로 확장된 적이 없었던 것을 확인, 식품 카테고리에 "재구매 의사 언급" 신호
> (`countRepurchaseMentions`, `REPURCHASE_PATTERN`)를 동일 구조로 추가. Cursor가
> 브리프의 `body.category === "식품"` 게이팅 오류(실제 폼 값은 `"식품/건강기능식품"`
> 복합 문자열)를 스스로 발견해 `food-compliance.ts`의 `FOOD_CATEGORY`와 동일한 값으로
> 수정 — Claude가 코드 재조회(`grep`)로 이 수정이 정확한지 확인, 정규식 자체도 별도
> 샌드박스에서 재구현해 hit/miss/mixed 값과 "또 사용해보니"류 오탐 없음을 독립 검증.
> DeepSeek 호출 경로 불변(신규 호출 0) 확인. `tsc` 0, API 0.
>
> 195~198차: 사용자가 반복해온 "후커블과 똑같은 퀄리티" 요구에서, 183차가 "DeepSeek
> 재생성 필요"로 API 허가 대기(§4)에 넣어뒀던 "매거진풍 짧은 캡션/대형 타이포 오버레이"
> 항목이 실제로는 오판정이었음을 발견 — 이미 짧은 heading(기존 카피 재사용)을 이미지 위로
> 옮기기만 하면 되는 코드 전용 작업이었음(195). 그 과정에서 재사용한 `getHeroGradient`가
> 짧은 박스에서 사진과 브랜드색이 섞여 오염되는 회귀를 스크린샷 직접 대조로 발견해 중립
> 스크림으로 교체(196), 같은 패턴을 쓰는 다른 자리(`custom_gif`/`illustration_banner`)를
> 전수 감사(197), 검증에 쓴 QA 스크린샷이 실은 Supabase 스토리지 쿼터 초과(402)로 전부
> 깨진 이미지였던 것까지 발견해 로컬 자산으로 재검증(198) — 최종적으로 6카테고리 실사진
> 기준 오염 없음을 확인. "확인했다"는 보고를 매번 스크린샷 원본까지 열어 대조해 두 차례
> 회귀(196/198)를 잡아낸 사례.

---

## 1. 완료됨

| 항목 | 출처(후보로 남긴 차) | 완료 차 | 비고 |
|------|----------------------|---------|------|
| `image_text` 카피 매칭(114차 `scoreImageForCopy`)이 `DETAIL_SLOT_PRIORITY` 11개 슬롯에만 배선돼 있던 것을 `preferForSlot()`의 모든 role/lifestyle 기반 슬롯(quick_points/coordination/usage_scenario/model_multicut/packaging_design 등)으로 확장 — 사용자 지시 "사진 배치도 글에 맞게" | 243차 (사용자 지시 조사) | **243** | `lib/assign-section-images.ts` 딱 1개 파일. 신규 export `pickBestIndexByCopy()`(후보 0~1장·카피 없음·전부 0점이면 기존 first-index와 100% 동일 — 회귀 안전장치)가 `rolePrefer`/`preferLifestyleComposite`/`preferLifestyleAi` 3곳에 배선, `texture_feel`의 `details[1]` 직접 분기와 `DETAIL_SLOT_PRIORITY`(`allocatePreferQueue`) 경로는 브리프 설계대로 무변경 보존. Claude가 코드 diff 직접 대조 + Cursor 검증 스크립트가 실제 `assignDistinctSectionImages()`를 호출하는 공정한 테스트임을 확인 + 스크립트의 usage_scenario/coordination 채점 결과(이미지 인덱스 2/1로 분리)를 `scoreImageForCopy` 규칙으로 손수 재계산해 스크립트 신뢰 없이 동일 승자 확인. 유료 API 0건 |
| 업로드 사진이 1장뿐일 때, 패션 `color_variation`(컬러별 스와치) 섹션이 모든 컬러 옵션에 똑같은 사진 1장을 강제 배정하던 오인 유발 버그 수정 — 사진 1장이면 섹션 자체를 생략 | 238차 (서브에이전트 사진 파이프라인 전수 감사 + Claude 전수 재확인) | **238** | `lib/assign-section-images.ts` 딱 1개 파일, `assignDistinctSectionImages()`의 `imageCount === 1` 분기에서 `color_variation`을 filter로 제거하고 도달 불가능해진 구 매핑 브랜치를 삭제. Claude가 PC 실제 파일 재스테이징 후 `lib/`·`components/`·`scripts/` 전체 mtime 대조 — 브리프 스코프 그대로 `assign-section-images.ts` 1개만 변경, `DetailSectionRenderer.tsx`·`export-detail-html.ts`는 237차 시점 mtime 그대로(무변경) 확인, `scripts/` 신규 파일은 검증 스크립트 1개뿐. 코드 diff가 브리프와 바이트 단위로 일치(주석 포함), grep으로 `color_variation` 참조 5곳 전부 확인 — `imageCount===1` 분기 안엔 filter 1곳만 남고 구 매핑 브랜치 완전 삭제, `imageCount>=2`용 "least-used 전역 배정" 경로(693·820·924행)는 그대로 손대지 않음을 재확인. Cursor의 검증 스크립트(`238cha-single-photo-color-variation-verify.ts`)를 전문 열람 — `assignDistinctSectionImages()`를 직접 호출하는 공정한 테스트(imageCount=1/2/3, color_variation 없는 픽스처)임을 확인. 그와 별개로 Claude가 Cursor 스크립트를 신뢰하지 않고, staged 소스에서 직접 읽은 `imageCount===1` 분기 로직을 **처음부터 별도 독립 재구현**해 클라우드 샌드박스에서 `tsx`로 실행 — color_variation 완전 제거·나머지 5개 섹션 imageIndex 전부 0 강제·섹션 개수/순서 정확히 일치를 Cursor 스크립트와 무관하게 재확인(`ALL PASS`). 유료 API 0건 |
| 패션 사이즈 실측 다이어그램 아래 측정 오차·체형차 안내 문구 2줄(서버 고정 캡션) 추가 — 디자이너 레퍼런스는 항상 붙임, Pagzly엔 없었음 | 237차 (Behance 패션 신규 크롤링) | **237** | `components/DetailSectionRenderer.tsx`·`lib/export-detail-html.ts` 2개 파일, `sizeDiagramMatches`/`sizeMatches` 게이트로 다이어그램이 실제로 뜰 때만 조건부 노출. Claude가 diff를 브리프와 바이트 단위로 대조(완전 일치), `lib/`·`components/`·`scripts/` 전체 mtime 감사로 스코프 밖 파일 터치 0건 확인, Cursor 검증 스크립트를 직접 읽어 공정함(FASHION+실측/FOOD·전자 미노출/플레이스홀더 시 생략/231·232·236 회귀 전부 포함) 확인. 그와 별개로 Claude가 Cursor가 만든 실제 export HTML 픽스처 3개(`fashion-with-diagram.html`·`fashion-no-diagram.html`·`fashion-session-export.html`)를 직접 grep — 안내문 A/B 각 1건(있음 케이스)·0건(없음·타 카테고리 케이스) 전부 스크립트 신뢰 없이 재확인. 스크린샷(`size-disclaimer.png`) 직접 열람해 표 아래 2줄이 실제로 렌더링됨을 육안 확인 |
| 라이프스타일 픽셀 페이스트 컷아웃이 hero 경로와 동일한 rembg 모델(`851-labs/background-remover`)을 쓰면서도 `trimCutoutToOpaqueBounds`/`purgeDarkPlateFringe`를 import조차 안 해 어두운 플레이트/프레임 잔여가 그대로 붙여넣어짐 — 원본 업로드를 그대로 쓰도록 설계된 AI 일상샷 경로(103차 A)에서 가장 잘 드러남 | 233차 (사진합성 파이프라인 재감사로 자체 발굴, 서브에이전트 1차 조사 → Claude 전수 재확인) | **233** | `lib/lifestyle-product-composite.ts`에 `trimCutoutToOpaqueBounds`/`purgeDarkPlateFringe` import 추가, `defringeCutoutEdges` 직전에 hero와 동일한 순서(trim→플레이트 제거)로 try/catch 삽입. Claude가 PC 실제 파일 재스테이징 후 `lib/`·`components/`·`scripts/` 전체 mtime 대조 — 브리프대로 정확히 1개 파일만 변경(신규 mtime이 라이브러리 전체에서 최신), `photo-composite.ts`·`photo-enhance.ts` 무변경, 신규 파일은 검증 스크립트 1개뿐임을 확인. diff가 브리프와 정확히 일치, import 순서·주석까지 동일. `lib/lifestyle-product-composite.ts` esbuild 구문 검증 통과. Cursor의 검증 스크립트(`233cha-lifestyle-plate-purge-verify.ts`)를 읽어 공정한 테스트임을 확인한 뒤, **Cursor 스크립트와 무관하게 독립적으로** 실제 staged `photo-composite.ts`(수정 없음, 원본 그대로)를 esbuild 번들해 별도 샌드박스에서 재현 — Cursor가 만든 실제 `synthetic-dirty.png`(테두리 어두운 잔여, alpha 최대 140) 픽셀 파일을 그대로 가져와 직접 돌린 결과 `defringeCutoutEdges` 단독(구 경로)은 잔여 23,100픽셀 중 0개 제거(완전 무효), `trimCutoutToOpaqueBounds`+`purgeDarkPlateFringe`(신규 경로)는 23,100→0(완전 제거) — Cursor의 보고 수치와 정확히 일치함을 Claude가 자체 실행으로 재확인(스크립트 신뢰가 아니라 동일 픽셀 데이터로 직접 재현). 실제 픽스처(`fixture-before.png`)는 원래 플레이트 잔여가 없어 차이 없음(스킵 수준)이라는 Cursor의 정직한 보고도 코드로 확인. `scripts/` 디렉토리 mtime 전수 대조로 신규 파일 1개(검증 스크립트)뿐임을 확인. `tsc` 0(esbuild로 대체), 유료 API 0건 |
| FOOD 카테고리에서 `WeightComparisonDiagram` 게이트가 `section.slot === "spec_table"`만 검사해 FOOD의 실제 슬롯명 `nutrition_table`과 영구 불일치 — 162차 헤더 주석이 명시한 "식품" 커버 의도가 구조적으로 도달 불가였음 | 232차 (spec_table 감사로 자체 발굴, 231차와 동일 기법 재적용) | **232** | `weightMatch` 게이트에 `(section.slot === "spec_table" \|\| (isFoodCategory(category) && section.slot === "nutrition_table"))` 추가, `DetailSectionRenderer.tsx`·`export-detail-html.ts` 양쪽. Claude가 PC 실제 파일 재스테이징 후 `lib/`·`components/` 전체 mtime 대조 — 브리프대로 정확히 2개 파일만 변경, 나머지 전부 231차 시점 그대로임을 확인. 두 파일의 diff가 브리프와 정확히 일치. `weight-comparison-diagram.ts`·`food-compliance.ts`(수정 없음, 원본 그대로)를 esbuild로 번들해 별도 독립 샌드박스에서 6개 케이스(FOOD+nutrition_table 매치, FOOD+spec_table 레거시 유지, 전자+spec_table 회귀 없음, FASHION 배제, 유령 행 필터링, 다른 카테고리+nutrition_table 오매치 안 됨)를 Cursor 스크립트와 무관하게 직접 실행해 전부 기대값과 일치 확인. 실제 export HTML 4개(food/electronics/pet/living)를 grep으로 직접 대조 — `aria-label="무게 비교 다이어그램"` FOOD 1건(신규 발생), 나머지 3개 카테고리도 각 1건(회귀 없음), food-export.html에 빈 `<th></th>` 0건(유령 행 필터링 확인). 스크린샷(`food-weight-diagram.png`) 직접 열람 — "무게 비교" 타이틀·450g 기준선·중량 450g 스펙 행이 실제로 렌더링됨을 육안 확인. 두 파일 esbuild 구문 검증 통과, 신규 파일은 검증 스크립트 1개뿐(scripts 디렉토리 mtime 전수 대조로 확인), `lib/weight-comparison-diagram.ts`·`lib/section-display-budget.ts` 무변경(브리프 스코프 준수). `tsc` 0(esbuild로 대체), 유료 API 0건 |
| `export-detail-html.ts`의 `case "spec_table":`에 라이브의 `visibleRows`(빈 라벨 행 필터링)가 없어 (a) 내보낸 표에 빈 라벨 행이 그대로 노출되는 표시 차이 (b) `rowLooksLikeWeight()`의 별칭 매칭이 빈 라벨에 항상 매치하는 구조적 약점과 결합해 export에만 무게 비교 다이어그램이 뜨는 유령 다이어그램 위험 | 232차 (spec_table 감사로 자체 발굴, 실제 staged 코드로 유령 매치 재현 검증 완료) | **232** | `export-detail-html.ts`의 `case "spec_table":` 진입부에 `const visibleRows = section.rows.filter((row) => row.label.trim()); if (visibleRows.length === 0) return "";` 추가(파일 기존 관례인 `highlight_box` 케이스의 `return "";` 패턴과 동일), 6개 매처(`sizeMatches`/`comparisonDims`/`volumeEntries`/`noiseMatch`/`waterproofMatch`/`weightMatch`/`powerMatch`)와 `rowsHtml` 테이블 바디 생성 전부 `section.rows`→`visibleRows`로 교체. Claude가 실제 staged `weight-comparison-diagram.ts`(원본 그대로)를 esbuild 번들해 `[{label:"", value:"1개당 250g 소분 포장"}, {label:"원산지", value:"국내산"}]`을 필터 전/후로 각각 투입하는 재현 테스트를 독립 실행 — 필터 전엔 `{g:250}` 유령 매치 발생, 필터 후엔 `null`로 라이브와 일치함을 직접 확인(Cursor 검증 스크립트와 별개로 재현). `foodSlices`(죽은 FOOD 분기, 229차부터 플래그)는 스코프 밖으로 그대로 둠을 코드 확인. `tsc` 0(esbuild로 대체), 유료 API 0건 |
| 식품 카테고리 "원재료 구성 비율" 도넛 차트(`FoodRatioDiagram`)가 `case "spec_table":`에서 `section.slot` 조건 없이 `isFoodCategory(category)`만으로 발동해 `nutrition_table`/`shipping_info` 섹션에도 중복 렌더링(최대 3회) — export는 슬롯명 불일치(`nutrition_table`≠`"spec_table"`)로 우연히 죽은 코드라 중복 없음, 라이브·export 불일치 상태였음 | 229차 "다시발굴" 자체 발굴(spec_table 다이어그램 7종 게이팅 대조) | **229** | `components/DetailSectionRenderer.tsx`의 `case "spec_table":` 블록에서 문제의 7줄만 삭제(`sourcing_story` 쪽 2곳은 이미 정확해 미변경, import 유지). Claude가 PC 실제 파일 재스테이징해 줄 단위 대조 — 삭제 범위 정확, 나머지 6개 다이어그램·sourcing_story 게이팅 불변 확인. `lib/` 디렉토리 mtime 전수 대조로 `export-detail-html.ts`·`food-ratio-diagram.ts`·`section-templates.ts` 등 스코프 제외 파일 전부 미변경, 변경 파일 1개뿐임을 확인. `esbuild` 구문 검증 통과. 스크린샷 5장 직접 열람 — 수정 전 배송·교환 안내(shipping_info) 섹션에 도넛이 뜬금없이 중복 렌더링된 버그 재현 확인, 수정 후 sourcing_story 섹션에 정확히 1회만 표시 확인. export HTML grep으로 `data-diagram="food-ratio"` 마커 1개(변화 없음, 애초 정상)도 재확인. `tsc` 0(esbuild로 대체), 유료 API 0건 |
| 리뷰 하이라이트(review_highlight) praise/concern 문장 내 핵심 키워드 인라인 강조 — `extractCoreKeywords()`가 이미 계산한 매칭 키워드를 "N건 언급" 배지뿐 아니라 텍스트 자체에 `theme.accentSoft` 형광펜 스타일로 시각화 | 228차 후커블·디자이너 벤치마크(Behance 전자제품 레퍼런스 `#리얼후기` 섹션) | **228** | `lib/review-insights.ts`에 `HighlightSegment`/`splitTextByKeywords()` 신규(기존 함수 무변경, 키워드 길이 내림차순 정렬 + 정규식 특수문자 이스케이프로 접두사 충돌 방지), `components/DetailSectionRenderer.tsx`는 `edit?.enabled` 시 기존 `EditableText` 그대로 유지하고 읽기 모드에서만 `matchCount>0`인 항목에 한해 `<span style={{backgroundColor:theme.accentSoft}}>`로 감싸 렌더(praise·concern 카드 둘 다), `lib/export-detail-html.ts`는 `highlightTextHtml()` 헬퍼로 원문을 먼저 조각낸 뒤 조각별로 `esc()`(이스케이프 순서 주의)해 동일 강조. Claude가 3개 파일 전부 줄 단위 대조 + `lib/section-inserts.ts`/`route.ts`/`types/generate.ts`/6개 컴플라이언스 모듈 mtime 불변 확인 + 실제 스테이징 소스를 `npx tsx`로 직접 import한 독립 테스트 20개(join 불변식·빈 문자열·1글자 토큰·특수문자 키워드·4개 캡·접두사 충돌 우선순위) + esbuild 구문 검증 + `fixture-export.html` grep(matchCount=0 항목 평문 확인) + 스크린샷 3장(라이브 읽기·라이브 편집·export) 육안 확인까지 전부 완료. `tsc` 0(esbuild로 대체), 유료 API 0건 |
| "Before/After 효과 비교" 입력 기능 신설 — 판매자 실사진 쌍(최대 4개)+캡션만 사용, AI 미생성, A안(화장품/뷰티·반려동물·식품/건강기능식품 서버·UI 이중 차단) | 226차 쿠팡 반려동물 크롤링 → 227차 설계 검토(법적 리스크 확인, A안 채택) | **227** | 신규 `lib/before-after-eligibility.ts`(`isBeforeAfterEligibleCategory`, `BEFORE_AFTER_COMPLIANCE_NOTE`), `lib/types/generate.ts`에 `beforeAfterPairs`/`BeforeAfterSection`/union 추가, `lib/section-inserts.ts`에 `insertBeforeAfterSection`(review_highlight 있으면 직후, 없으면 ai_disclosure/cta_price 직전, 4쌍 캡·URL 없는 쌍 필터·중복가드), `route.ts`는 axisComparison 삽입 직후·`applyHeroBadge` 직전에 배선(draft 모드 early-return 이후 구간이라 draft에는 영향 없음), `CreateProductForm.tsx`는 기존 `uploadAuxFile()` 재사용 업로드 UI(카테고리 비허용 시 입력 블록 자체가 사라짐), `DetailSectionRenderer.tsx`/`export-detail-html.ts` 양쪽 `case "before_after":` 렌더(BEFORE/AFTER 배지는 기존 POINT 배지 색상 재사용, 고정 컴플라이언스 각주). Claude가 PC 실제 파일 7개 전부를 재스테이징해 브리프와 줄 단위 대조 — 전부 정확히 일치. 3개 컴플라이언스 모듈(`pet`/`cosmetics`/`food-compliance.ts`)·`section-templates.ts`는 mtime으로 미변경 재확인. Cursor의 검증 스크립트를 신뢰하지 않고 **실제 스테이징된 `section-inserts.ts`/`before-after-eligibility.ts`를 `npx tsx`로 직접 import해 독립 테스트 29개**(카테고리 게이팅 7, 제외 카테고리 무삽입 6, 정상 삽입 4, URL 누락 필터링, 4쌍 캡, 중복가드, null/undefined/빈배열 3, 삽입 위치 4가지, 기존 함수 회귀 2)를 처음부터 새로 작성해 실행 — 29/29 전부 통과. `esbuild`로 7개 파일 전체 구문 파싱 통과(오류 없음). Cursor가 제공한 스크린샷(`electronics-before-after.png`)을 직접 열람해 BEFORE/AFTER 배지·캡션·헤딩이 예측대로 렌더링됨을 육안 확인, export HTML(`electronics-before-after-export.html`)도 grep으로 BEFORE/AFTER·컴플라이언스 각주 텍스트 존재 확인. `tsc` 0(esbuild로 대체), 유료 API 0건(Cursor 검증 스크립트는 `/api/generate` 호출 없이 순수 함수만 테스트 — 브리프가 요청한 "synthetic 라운드트립"보다 더 안전한 방식이나 동일한 결론을 입증) |
| export HTML `layout:"compact"` 섹션 완전 누락 복원 — quick_points 등 필수 슬롯이 export에서 기본(전체폭 정사각) 분기로 떨어져 라이브와 완전히 다른 레이아웃으로 나오던 문제 | 225차 자체 발굴 | **225** | `lib/export-detail-html.ts`에 `resolveCompactImageShape` import 추가, `sectionHtml()` 시그니처에 `compactImageTextIndex`/`totalCompactImageTextCount` 2개 파라미터 신설, `buildDetailPageHtml` 루프에서 라이브(`DetailSectionRenderer.tsx:3763~3768`)와 동일한 공식으로 compact 인덱스·총개수 계산·전달, `case "image_text":`의 circle-pair 뒤·callout 앞에 compact 분기(120×120 썸네일, `RADIUS.md`/`RADIUS.pill` 정사각/원형 교대, `imagePosition` 기반 row/row-reverse+text-align, `overflow-wrap:anywhere`) 신설. Claude가 PC 실제 파일을 재스테이징해 브리프 diff와 코드를 줄 단위로 대조 — compact 분기·루프 카운터 계산부·`sectionHtml` 호출부 인자 순서 전부 브리프 스펙과 정확히 일치. `components/DetailSectionRenderer.tsx`(155340바이트, mtime 224차와 완전 동일)·`lib/compact-image-shape.ts`는 mtime·크기로 미변경 확인(export 전용 변경 원칙 준수). Cursor 검증 스크립트를 신뢰하지 않고 **실제 스테이징된 `lib/compact-image-shape.ts`를 `npx tsx`로 직접 import해 독립 테스트 10개 실행**(명시적 imageShape 우선권, count<2 항상 square, count≥2 인덱스 패리티 교대) + 라이브와 동일한 카운터 공식을 별도로 손으로 재구현해 4-compact 합성 시퀀스에서 순차 인덱스 0~3·총개수 4·정사각/원형/정사각/원형 교대가 정확함을 재확인 — 10/10 전부 통과. `esbuild`로 수정된 69KB 파일 전체 구문 파싱 통과. 스크린샷(`compact-thumbs.png`, 합성 3섹션)을 직접 열람해 400×400 정사각(포인트 하나)·401×401 원형+텍스트 우측 정렬(포인트 둘)·402×402 정사각(포인트 셋) 교대가 예측과 정확히 일치함을 육안 확인. `tsc` 0(esbuild로 대체), 유료 API 0건 |
| 라이브·export "POINT 번호/이미지 좌우/60:40 리듬" 포인트 카운터 어긋남 복원 — 에디토리얼 블리드 섹션 이후 번호·좌우가 서로 다르게 나오던 문제 | 223차 브리프 각주 → 224차 사용자 지정으로 확정 | **224** | `components/DetailSectionRenderer.tsx`의 인라인 `isFullPoint` 조건식을 export가 이미 쓰던 공유 함수 `shouldUseSplitLayout()` 재사용으로 교체(`lib/export-detail-html.ts`는 무변경 — mtime 불변으로 확인). Claude가 diff 정확 일치 확인 + 옛 공식/새 공식을 직접 읽은 실제 소스로 독립 재구현해 수정 전 불일치(POINT 03 vs 02, 이미지 좌우 반전)·수정 후 완전 일치를 재확인, `esbuild` 구문 파싱 통과. 이제 라이브·export가 동일 함수를 호출해 구조적으로 재발 불가 |
| export HTML "부품/기능 주석 오버레이"(`AnnotatedImageOverlay`) 완전 누락 복원 — 전자제품 `feature_detail`·화장품/뷰티 최대 2섹션의 Vision API 생성 포인트 라벨이 라이브엔 보이나 export엔 없던 문제 | 223차 자체 발굴 | **223** | 신규 `lib/annotated-image-overlay-svg.ts`(`clampPct`/`leaderEnd`/`buildAnnotatedImageOverlaySvg`, 원본 `AnnotatedImageOverlay.tsx`와 계수까지 동일 이식), `export-detail-html.ts`의 `shouldUseSplitLayout` 분기에 오버레이 렌더 + annotated 섹션 POINT 배지 숨김 + 고정 50/50 비율 배선. Claude가 파일 전문 대조 + 원본 컴포넌트 mtime 불변 확인 + 별도로 처음부터 작성한 18개 테스트를 실제 스테이징 소스에 직접 실행해 전부 일치 확인(side 경계·타이 케이스, clamp, escapeXml, markup 포함), `esbuild` 구문 파싱 통과. 비-annotated 섹션 회귀 없음(코드상 항상 빈 문자열) 확인. `tsc` 0, API 0 |
| `parseMegaKeywordHeading()` 초대형 키워드 오버플로우 방지 — 숫자 토큰(예: "210g/yd") 승격 제외 | 219차 자체 발굴 | **219** | Cursor 실행 완료, Claude가 `lib/detail-visual-enhancements.ts` 코드 대조(주석까지 일치) + Cursor 스크립트를 신뢰하지 않고 함수 로직을 별도 샌드박스에서 처음부터 독립 재구현해 5개 케이스 전부 일치 확인. `TYPO.keywordDisplay`의 `break-words`, `export-detail-html.ts` 3곳 `overflow-wrap` 추가도 코드 대조로 확인 |
| `image_text` 좁은 2단 레이아웃 본문(`<p>`) line-clamp 잘림 — line-clamp-5→7 확장 | 219차 자체 발굴 | **219** | Cursor 실행 완료, Playwright 실측 before/after(207/148→207/207)로 명확한 수치 변화 확인 — 깨끗하게 해소됨 |
| `image_text` 좁은 2단 레이아웃 헤드라인(`<h3>`) line-clamp 잘림 — line-clamp-5 + `pagzly-ink-headline` 제거 | 219차 자체 발굴, 220차에서 스크린샷으로 최종 확정 | **219** (확정: **220**) | 219차 실측치(before/after 동일)만으로는 확정 못했으나, 220차에 Claude가 electronics `design_detail`("방 안에 놓이는 디자인", 4줄 전체 노출)·pet `packaging_design`("2kg 한 봉 포장", 1줄 전체 노출) 스크린샷을 직접 열람해 두 실사례 모두 "···" 잘림 없이 완전히 렌더링됨을 육안으로 확정. 219차 실측치가 before/after 동일했던 이유는 이 두 헤드라인이 애초 line-clamp 경계 근처도 아니었기 때문으로 추정(잡음 수준 차이) |
| `image_text` 헤드라인·본문 가로 오버플로우 방지 — 공백 없는 극단적으로 긴 문자열(40자+)이 line-clamp 대신 카드 밖으로 흘러넘치던 문제 | 220차 스크린샷 검증 중 신규 발견 | **221** | Cursor가 브리프의 단순 `break-words` 제안을 넘어 실제 원인을 특정: `app/globals.css`의 `[data-pagzly-preview][data-headline-face=…] .pagzly-display-headline`이 `word-break:keep-all; overflow-wrap:break-word`를 Tailwind 유틸리티보다 높은 특이도로 이미 지정하고 있어 `break-words`만으로는 무공백 긴 토큰이 안 접힘 — Claude가 globals.css를 직접 읽어 해당 선택자·특이도·속성값을 코드로 재확인. `![overflow-wrap:anywhere]`(important 강제)로 해결, keep-all은 유지되어 자연어 헤드라인(공백 있음)의 줄바꿈은 그대로. `export-detail-html.ts`의 callout/split/default 3개 분기 전부에도 `overflow-wrap:anywhere` 배선 완료(코드 대조 확인). Claude가 before/after 스크린샷 3장(더미 40자 — 카드 안에서 5줄+ 말줄임으로 정상 클램프, electronics·pet 실제 헤드라인 — 자연스러운 공백 단위 줄바꿈, 회귀 없음)을 직접 열람해 육안 확정. `tsc` 0, API 0 |
| spec_table(상품정보 고시 표)에 `productSizeHint`(용량·크기 힌트) 폴백 배선 — 전자/가전 "크기·용량·형태" 행 신설 | 212차 자체 발굴(11번가 실사 재크롤링, 법정 고시 표 "상품상세설명 참조" 위임 발견) | **212** | Cursor 실행 완료, Claude가 PC 실제 파일 대조 + 별도 Node 샌드박스 독립 재구현으로 5개 케이스 재실행 검증. `lib/enrich-product-sections.ts` 5곳 + `route.ts` 1줄, 다른 파일 부작용 없음 |
| 라이프스타일 픽셀 페이스트(`pasteCutoutOnScene`)에 컷아웃-배경 매칭 3축(화이트밸런스·선명도·그레인) 보강 | 211차 자체 발굴(162/163/164/187차 방치분) | **211** | Cursor 실행 완료, Claude가 PC 실제 파일·mtime·검증 스크립트로 독립 재검증. 메인 파이프라인(`photo-composite.ts`/`photo-enhance.ts`) mtime 불변 확인 — 하드 가드레일 준수 |
| 채팅형 섹션 편집 Phase 1 (`SectionPatchChat` + `/api/patch-section`) | 45/48 | 48~96 | Phase 2=95 구성 채팅, Phase 3=96 요소+레퍼런스 |
| 채팅형 Phase UX: 적용 전 미리보기 / undo / 세션 히스토리 | 45 (고도화 반복) | **185** | API 호출 로직·횟수 불변, UI/상태만 |
| 성분/균주 원형 곡선 텍스트 (`textPath` 링) | 159 Behance | **185** | `lib/ingredient-ring-diagram.ts`, beauty/pet 게이팅 3~8 |
| Waterproof IP 다이어그램 | 160 후보 | 160 | |
| comparison_chart 카테고리 갭(패션·펫·홈 등 슬롯 정책) | 160→161 | **161**, 181 재확인 | 6/6 live `hasComparisonChart` |
| BRIA 배경 후보 2→4 | 145/160 | **166** | 스튜디오 8 유지 |
| electronics chart 채움 프롬프트/픽스처 | 166~170 | 167~171 경로 | 실사 재확인은 선택 사항으로 잔여 |
| export HTML 카테고리 SVG `url('data:...')` 이스케이프 | 169 | **170** | |
| 색면/리듬 보드·네이티브 픽스처 | 168~169 | 169 | |
| tradeoff / length guide | 170~171 | 171 | |
| 다이어그램 아이콘 세트 + monochrome normalize + tint | 174 후보 축 | **174~175** | |
| 아이콘 스타일 통일 프로브 → 실루엣 톤 | 176 | **177~178** | |
| elevation 토큰 감사·drift | 176/178 | **179** | |
| radius 스케일 축소·병합 | 178/179 | **180** | |
| Behance 벤치 + comparison 커버리지 재확인 | 181 | 181 | 코드 갭보다 포맷/취향 |
| FONT_SIZE 토큰화·역할 별칭 | 182 | **182** | |
| FONT_SIZE/ELEVATION 스케일 축소 | 182 미실시 | **184** | |
| living/pet display budget 28→20 + hero 대비 | 183 갭 | **183** | `section-display-budget` |
| comparison_chart 3토큰 대비 강화 | 183 | **183** | |
| lifestyle composite / height / grasp 계열 | 81~127 다수 | 81~127 | 세부 잔여는 보류표 |
| 사진 1장 상품도 섹션별 배경 생성(히어로와 동일 배경 반복 방지) | 13 (`uploaded.length>=2` 조건 지적) | 시점 불명 (코드 `uploaded.length>=1`로 이미 전환, 주석 확인) | 문서 추적 누락분, 187차 재점검 중 발견 |
| 후기 증거·안심 문장 게이팅 | 131~135 | 135 | |
| dead code / 과금 SSOT 정리 일부 | 136 | 136 | |
| persuasion framework labels | 138 | 138 | |
| 멀티카테고리 회귀 QA 픽스처 | 121/139 | 139 | |
| Recraft 선택 롤아웃·텍스트 환각 완화 | 141~143 | 141~143 | |
| 프리미엄 모드 프로브 | 144~146 | 145~146 | |
| canvas overflow clamp | 167 | 167 | |
| Pexels/업로드 상품 일치 가드 넛지 (UI 경고) | 181 | **186** | 폼·결과 안내 문구만 (유사도 검증 없음) |
| legacy `*-legacy-pexels.json` 삭제 | 170 | **186** | 코드 참조 0 → `139cha-session-electronics-legacy-pexels.json` 삭제 |
| food/fashion(+타 카테고리) 픽스처 뷰티 오염 잔여 정리 | 166 | **186** | keyFeatures는 168/169 완료; headlines·conceptBrief·wholesaleUrl 등 잔여 정리 + assert |
| electronics `comparison_chart` 네이티브 픽스처 커버리지 확인 | 169 | **186** | `139cha-session-electronics.json` chart metrics≥2 확인; legacy 삭제 |
| patch 미리보기 섹션 outline ring | 185 | **186** | `pendingHighlightIndex` → ring-2 registration-red + 스크롤 |
| ingredient_highlight 컴플라이언스 각주("*원료적 특성에 한함") | 159/160 | **160** (문서 누락 → **187**에 반영) | `INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE`(`cosmetics-compliance.ts`), live(`DetailSectionRenderer.tsx:1919`)·export(`export-detail-html.ts:513`) 양쪽 배선 코드로 재확인 완료 |
| 컷아웃/배경 그레인(노이즈) 매칭 (색상162·콘트라스트163·선명도164에 이은 4번째 매칭 축) | 164 후보 | **187** | `matchCutoutGrain()`(`photo-composite.ts`) — 배경 고주파 잔차 측정, `skipThreshold=2.2` 미만 스킵, 알파 0.02~0.05만 컷아웃에 overlay; `unifyCompositeGrain()`(합성 전체용)은 그대로 유지; `photo-enhance.ts`에서 sharpness 매칭 직후 배선 코드로 재확인 완료 |
| 색상 대비(WCAG) 감사 — 하드콘트라스트 블록(패턴C)·CTA/배지 accent 솔리드+paper 텍스트 조합 | 188 (자체 발굴, §3 소진 후 코드 재점검) | **188** | `ensureReadableOnPaper()`(`design-tokens.ts:558`) 신규 — 기존 `contrastRatioToken()` 재사용, hue/채도 유지·명도만 낮춤(`ensureReadableNeutralHue()`의 반대 방향). 패턴C `inkDeep`/`inkAccent`(121~133행)에 배선 + `solidAccentOnPaper()`/`solidDeepOnPaper()`(576~584행, CTA/배지용 UI 3:1) 신규 노출. 168개 조합(6카테고리×4변형×7) 감사 → 최초 9건 미달 → 재감사 168/168, `tsc` 0, API 0. 코드 대조 확인 완료 |
| 색상 대비(WCAG) 감사 — accent/deepAccent가 텍스트 색으로 밝은 배경(paper·옅은 틴트) 위에 직접 쓰이는 자리 (188 반대 방향) | 189 (자체 발굴, 188 감사 범위 밖 발견) | **189** | `readableTextAccent()`/`readableTextDeep()`(`design-tokens.ts:590~596`) 신규 — `ensureReadableOnPaper()` 그대로 재사용, 새 로직 없음. `DetailSectionRenderer.tsx`/`export-detail-html.ts`의 섹션 타이틀·라벨·체크아이콘 등 순수 텍스트 색 자리에 배선(라이브 44곳 배선 코드로 재확인). 96개 조합(역할4×카테고리6×변형4) 감사 → 최초 14건 미달(식품 base/warm/cool·펫 warm/bold) → 재감사 96/96, `tsc` 0, API 0 |
| 저관여(생활·펫) 표시 예산 추가 축소 — 183차가 API 필요로 분류했던 것을 코드 전용으로 재판단 | 183 트랙C (자체 재검토로 오판정 발견) | **190** | `section-display-budget.ts` 상수만 조정 — `MAX_EVIDENCE_LOW` 2→1(comparison_chart만 유지), `MAX_EXTRA_IMAGE_LOW` 1→0(material_detail/packaging_design/care_tip/material_feature 전부 데모트). 메커니즘·슬롯 목록·anti-hallucination 미변경. living/pet 181 raw 28 → 183차 20 → **190차 18**. `step_card`은 living「설치와 정리」·pet「급여 순서」로 실제 구매 정보라 판단해 유지(데모트 안 함). 뷰티/패션/식품/전자 영향 0건 확인 |
| 이미지 lazy-loading (성능, 신규 발굴) | 191 (자체 발굴, 174~190차 미다룬 축) | **191** | `components/SectionImage.tsx`에 `priority` prop 신설(기본 false→`loading="lazy" decoding="async"`, true→`loading="eager" fetchPriority="high"`). 라이브 히어로(`DetailSectionRenderer.tsx:1363`)만 `priority` 지정, 나머지 15곳 이상은 무변경으로 자동 lazy. `lib/export-detail-html.ts` 비히어로 `<img>` 13/13 lazy, 히어로 1곳만 `fetchPriority="high"` — grep으로 13/13·1 코드 대조 확인. 레이아웃/색/카피 변경 없음, `tsc` 0, API 0 |
| 반려동물 리뷰 나이·체중 언급 신호 (크롤링 재발굴) | 152차 크롤(펫프렌즈, 2026-09-09) — "다음 라운드 후보"로 43라운드 미착수 | **192** | `lib/review-insights.ts`에 `countPetAgeWeightMentions()`(정규식, `PET_AGE_WEIGHT_PATTERN`) 신규 — `lines` 순수 매칭, DeepSeek 호출 미증가, 모든 반환 경로에 `petAgeWeightMentionCount` 포함. `ReviewHighlightSection`에 필드 추가, `route.ts`에서 `body.category === "반려동물"`일 때만 값 전달(타 카테고리 "2kg"류 오작동 방지 게이팅). `DetailSectionRenderer.tsx`(3208~3216행)·`export-detail-html.ts`(885~888행) 양쪽에 조건부 캡션("반려동물 나이·체중 언급 리뷰 N건") 배선 — 코드 대조 확인. 품종 추출은 자유 텍스트라 지어내기 위험으로 제외(숫자 패턴만). `tsc` 0, API 0 |
| 갤러리 사진 그리드 간격 확대 + export 섹션 타이틀 폰트 누락 배선 (사용자 스크린샷 직접 지적) | 193 (사용자 스크린샷 피드백 직접 반영, 자체 코드 대조로 원인 특정) | **193** | 트랙A: `lib/design-tokens.ts` `galleryGapClass` DEFAULT+5카테고리 전부 `gap-0`/`gap-px`/`gap-1`(0~4px) → `gap-2`(8px) 통일, `DetailSectionRenderer.tsx` 뷰티 pairCompare도 `gap-2`, `export-detail-html.ts` 갤러리 그리드 하드코딩 `gap:2px` → `gap:8px`(live·export 픽셀값 일치). 트랙B: export HTML에서 117차 `dh2()`(카테고리별 헤드라인 폰트) 헬퍼를 안 거친 raw `<h2>` 섹션 타이틀 7곳(highlight_box/callout/gallery/caution/illustration_banner/review_highlight/fallback) 전부 `dh2()`로 전환, `dh2(` 카운트 16→23. 라이브 렌더러는 CSS 선택자(`[data-headline-face]`)로 이미 전체 적용돼 있어 문제 없었음 — export만 어긋나 있던 것. 코드 대조 확인 완료. `tsc` 0, API 0 |
| 섹션 배경 장식 텍스처("물방울") 전체 비활성화 (사용자 직접 지적 + 51차 원래 설계 의도 복원) | 51차(2026-09-01) 도입 시 "기본 꺼짐·옵트인" 명시됐으나 옵트인 스위치 누락으로 44라운드 항상 켜짐 | **194** | `lib/design-tokens.ts` `getCategoryPatternBackground()` 맨 앞에 `CATEGORY_PATTERN_ENABLED = false` 플래그 1줄 추가 — live(`composeSectionBackground`)/export(`resolveSectionSurface`) 공통 단일 지점이라 호출부 미수정으로 양쪽 자동 반영, `CATEGORY_PATTERN_SVG` 데이터·인코딩 로직은 삭제하지 않고 보존(재활성화 시 상수만 되돌리면 됨). 그라데이션 배경(패턴 A/B/D/E, 사용자가 말한 "단색 배경")·강조 색면 패턴 C는 미변경. `tsc` 0, 6카테고리 전부 `undefined` 반환 확인, API 0 |
| 에디토리얼 풀블리드(image_text) 섹션에 대형 타이포 오버레이 — 후커블 "이미지 풀블리드+대형 타이포+매거진풍 캡션" 격차 해소, 183차가 "DeepSeek 재생성 필요"로 오판정했던 것을 코드 전용으로 재판단 | 183 트랙C(오판정 발견) — "매거진풍 짧은 캡션" | **195~198** | 195: `EDITORIAL_BLEED_SLOTS`(usage_scenario/coordination 등 10슬롯) image_text에 한해 kicker+heading을 이미지 위 오버레이로 이동(`EDITORIAL_BLEED_OVERLAY_CLASS`, `TYPO.bannerTitle`/`heroCategory`), body는 이미지 아래 그대로 유지(정보량 무변화). 196: 195가 재사용한 `getHeroGradient`(브랜드 accent/deepAccent 기반)가 히어로보다 훨씬 짧은 `aspect-[4/5]` 박스에서 사진 색과 섞여 오염되는 회귀를 스크린샷 직접 대조로 발견 → `BRAND.ink` 중립 스크림(`getEditorialBleedScrim`, 정지점 0/24/42/55·불투명도 0.82)으로 교체, heading 1줄 고정. 197: 같은 `getHeroGradient` 패턴을 쓰는 다른 자리 전수 감사 — `custom_gif`도 동일 위험 확인돼 선제 수정(`getAspectVideoBleedScrim`), `illustration_banner`는 실사 확인 결과 "가짜 UI 가리기" 목적의 의도적 이중 그라데이션이라 문제없어 미수정. 198: 197차 스크린샷이 전부 깨진 이미지였던 것 발견(원인은 코드 버그가 아니라 **Supabase 스토리지 프로젝트 쿼터 초과 402** — 201~202차에서 해결됨, 아래 비고 참조) → 로컬 테스트 자산(`scripts/test-assets/_181cha-live/`)으로 재검증, 6카테고리(뷰티/전자/생활/펫/식품/패션) 전부 실사진 기준 스크림 정지점 조정 없이 오염 없음 최종 확인. `tsc` 0 전 라운드, API 0 |
| 식품 카테고리 재구매 의사 언급 리뷰 신호 (192차 정규식 패턴 확장) | §3 비어 있어 자체 발굴 — 192차 패턴이 타 카테고리로 확장된 적 없었음을 확인 | **203** | `lib/review-insights.ts`에 `countRepurchaseMentions()`(정규식, `REPURCHASE_PATTERN` = `재구매`\|`재주문`\|`또 (구매\|구입\|주문)`\|`계속 (구매\|구입)`) 신규 — `countPetAgeWeightMentions`와 동일 구조, DeepSeek 호출 미증가. `route.ts`에서 `body.category === "식품/건강기능식품"`일 때만 값 전달 — Cursor가 브리프의 `"식품"`(템플릿 키, 실제 폼 값 아님) 게이팅 오류를 스스로 발견해 `FOOD_CATEGORY`와 동일한 실제 폼 카테고리 문자열로 수정, Claude가 grep으로 이 수정을 재확인. 정규식도 Claude가 별도 샌드박스에서 재구현해 hit=2/miss=0/mixed=3 및 "또 사용해보니"류 오탐 없음을 독립 검증. `DetailSectionRenderer.tsx`·`export-detail-html.ts` 양쪽에 조건부 캡션("재구매 의사 언급 리뷰 N건") 배선. `tsc` 0, DeepSeek 신규 호출 0, API 0 |
| 패션 카테고리 사이즈·핏 언급 리뷰 신호 (192/203차 정규식 패턴 확장) | 사용자가 직접 방향 지정("패션 사이즈/핏") | **204** | `lib/review-insights.ts`에 `countSizeFitMentions()`(정규식, `SIZE_FIT_PATTERN` = `정사이즈`\|`사이즈(업\|다운\|크게\|작게)`) 신규 — "사이즈" 키워드 동반 표현만 매칭해 "크다/작다" 단독 문맥의존 오탐(예: "가격이 크게 부담되진 않아요") 원천 차단. `route.ts`에서 `body.category === "의류/패션"`일 때만 값 전달 — 203차 교훈으로 Claude가 브리프 작성 전 `CreateProductForm.tsx`의 `CATEGORIES` 배열을 직접 확인해 정확한 문자열을 미리 명시, Cursor 구현 후 grep으로 재대조. 정규식도 Claude가 별도 샌드박스에서 독립 재구현해 hit=2/mixed=3 및 오탐 방지 케이스 2건(0건 기대) 전부 재확인. `DetailSectionRenderer.tsx`·`export-detail-html.ts` 양쪽에 조건부 캡션("사이즈·핏 언급 리뷰 N건") 배선. `tsc` 0, DeepSeek 신규 호출 0, API 0 |
| 뷰티·전자·생활용품 장기 사용 후기 언급 리뷰 신호 (192/203/204차 정규식 패턴 확장, 3카테고리 동시 롤아웃) | 사용자 지정("남은 카테고리에 review-signal 계속") | **205** | `lib/review-insights.ts`에 `countLongTermUseMentions()`(정규식, `LONG_TERM_USE_PATTERN` = `\d+`+기간단위(일/주/개월/년)+`째?`+사용 동사) 신규 — 숫자+단위+동사가 모두 붙은 경우만 매칭, 한글 고유어 숫자("한 달째")는 192차와 동일 원칙으로 의도적 제외(안전한 과소집계). `route.ts`에서 `body.category`가 `"화장품/뷰티"`\|`"전자제품"`\|`"생활용품"` 3중 OR일 때만 값 전달(3카테고리가 동일 신호를 공유해 정규식 1개로 동시 커버). Claude가 별도 샌드박스에서 정규식을 독립 재구현해 hit/mixed 값과 오탐 방지 케이스("10개월 전에 상했어요", "가격이 10만원대") 전부 재확인, `route.ts` 3중 게이팅 문자열도 grep으로 재대조. `DetailSectionRenderer.tsx`·`export-detail-html.ts` 양쪽에 조건부 캡션("장기 사용 후기 N건") 배선. **"기타" 제외 실제 6개 카테고리 전부 review-signal 롤아웃 완료.** `tsc` 0, DeepSeek 신규 호출 0, API 0 |
| 전자제품 표시광고법 컴플라이언스 모듈 (식품/화장품 패턴 3번째 카테고리 확장, review-signal 종료 후 새 축) | Claude 자체 코드 재검토로 발굴("코드 재검토해서 새 축 자체 발굴") | **206** | `lib/electronics-compliance.ts` 신규 — `food-compliance.ts`/`cosmetics-compliance.ts`와 100% 동일 구조(`sanitizeText`/`sanitizeSection`/`reviewElectronicsCopy`), 13개 금지 표현(완벽 방수·고장 없음·평생 보장·전자파 없음·세계 최초 등) 치환 규칙. `route.ts` 3곳만 배선(import, `generateCopyWithDeepSeek`의 `electronicsGuide` 프롬프트 삽입, 최종 검수 3분기 `isElectronicsCopy` 추가) — `mfdsReviewed`/`replacements`가 이미 카테고리 무관 범용 타입이라 타입 파일·UI 컴포넌트 수정 불필요(review-signal 계열보다 단순). Claude가 브리프 작성 중 Node 샌드박스에서 정규식 13개를 직접 시뮬레이션해 "반영구적으로"→"반장기간으로" 단어 잘림 버그를 사전 발견·수정(순서 조정+`적?` 접미사 흡수). Cursor 구현 후 파일 재스테이징으로 소스 100% 대조, 중첩 매칭 케이스 별도 샌드박스 독립 재현 재확인, cosmetics/food 분기 회귀 없음 확인. `tsc` 0, DeepSeek 호출 경로 미추가, API 0 |
| ingredient_circle_pair texture_feel 필수 조건 완화 (148차부터 59라운드 미해결이던 후커블 격차) | 148차 실사(2026-09-09) 발견 — "다음 라운드 후보"로 59라운드 미착수 | **207** | `lib/apply-ingredient-circle-pair.ts`의 `applyIngredientCircleVisual()` circle-pair 경로가 `texture_feel`(선택 슬롯, 자주 생략됨) 필수였던 조건 제거 — circle-solo가 이미 쓰던 `pickAlternateIndex()`(texture_feel 우선, 없으면 다른 상품 사진 폴백)를 그대로 재사용. 신규 함수·로직 0, 렌더링 컴포넌트 미수정. Claude가 diff를 코드 대조해 재사용만 확인, 4개 케이스(texture_feel 있음/없음/이미지 1장뿐/이미 circle 있음)를 별도 Node 샌드박스에서 독립 재시뮬레이션해 보고서 수치와 전부 일치 확인. `tsc` 0, API 0 |
| 표시광고 컴플라이언스 모듈 — 반려동물·의류/패션·생활용품 3개 카테고리 확장 (화장품/식품/전자제품은 이미 완료, 6개 전 카테고리 완료) | 222차 자체 발굴 | **222** | `lib/pet-compliance.ts`(10규칙)·`lib/fashion-compliance.ts`(6규칙)·`lib/living-compliance.ts`(5규칙) 신규, `electronics-compliance.ts`와 구조 100% 동일. `route.ts` 최종 검수 3-way→6-way 삼항 분기, cosmetics/food/electronics 기존 3분기 무변경. Claude가 3개 파일 전문 대조 + 카테고리 문자열 재확인 + `route.ts` 배선 재대조에 더해, Cursor 스크립트와 독립적으로 처음부터 작성한 Node 샌드박스로 15개 테스트(순서 의존 중첩 케이스 포함) 전부 재실행해 100% 일치 확인. `tsc` 0, API 0 |
| 히어로 합성 그림자 **색온도** 매칭 (160차가 "히어로 그림자/색온도 A/B"로 "취향"만 놓고 미뤄뒀던 것 — 실제로는 이미 완료돼 있었음) | 209차 재분류 — §2 재검토 중 발견 | **162** (문서 반영 누락 → **209**에서 재분류만) | `lib/photo-composite.ts`의 `sampleBackdropAmbientColor()`(배경 4모서리 평균색 샘플)/`tintedShadowColor()`(ambient를 어둡게 눌러 그림자색 생성, darkness=0.78)가 `buildSilhouetteShadowBuffer`/`buildProductShadowSvg`/`buildSoftContactShadowSvg` 3개 함수 전부에 배선돼 있고, `lib/photo-enhance.ts`의 실제 합성 호출부 2곳(1612~1613행, 1945~1979행 부근)이 **A/B 실험 플래그 없이 무조건** ambient 샘플링 → tint 계산 → 적용하는 구조임을 코드로 재확인 — "따뜻한 우드톤 배경엔 어두운 브라운 그림자, 차가운 슬레이트 배경엔 어두운 네이비 그림자"가 이미 44라운드째(2026-09-11부터) 기본 동작. 188/189차 WCAG 감사도 이 값 기준으로 이미 통과했음. **그림자 "방향"(광원 각도)만 미해결로 남아 §2에 재기재** — 아래 참고 |
| Track A 알파 soft/hard 대비 강화 최종 확정 (169차가 "사용자 취향 대기"로 남겨뒀던 것 — 실제로는 이미 단일 값으로 확정 배선됨) | 209차 재분류 — §2 재검토 중 발견 | **169** (문서 반영 누락 → **209**에서 재분류만) | `lib/design-tokens.ts`의 `getSectionBackground()`에 soft/hard 두 버전을 고르는 토글이나 env 변수가 전혀 없음을 grep으로 확인(`SECTION_RHYTHM`/`RHYTHM_SOFT`/`RHYTHM_HARD` 등 매치 0건) — 169차가 만든 대비 강화값(A 0.48/0.24, B 168→125deg, D 175→210deg, E deepAccent 0.28/0.1)이 **유일한 프로덕션 값**으로 무조건 배선됨. 170~190차의 여러 라운드(특히 188/189차 WCAG 감사)가 이 값을 그대로 전제로 작업하며 별다른 재조정 요청 없이 44라운드 이상 운영됨 — "대기 중인 선택지"가 실제로는 존재하지 않음, 사용자가 다시 문제 제기하기 전까지는 확정으로 취급 |
| 반려동물 "주요 성분·원료"(`material_feature`) 슬롯 성분 원형 다이어그램 배선 + export 표시예산 예외 | 231 (코드 감사 자체 발굴) | **231** | `DetailSectionRenderer.tsx`·`export-detail-html.ts`의 에디토리얼 블리드(`shouldUseEditorialBleed`) 분기에 `section.slot === "material_feature" && isIngredientRingCategory(category)` 게이트로 `IngredientRingDiagram`/`buildIngredientRingDiagramSvg` 추가(185차 컴포넌트 재사용, 신규 로직 없음). Cursor가 브리프에 없던 상호작용을 자체 발견해 `section-display-budget.ts`에 "반려동물 material_feature는 EXTRA_IMAGE demote 제외" 예외 1줄 추가(190차 `MAX_EXTRA_IMAGE_LOW=0`이 그대로면 export에서 섹션째 사라져 링 배선이 죽은 코드가 됨) — Claude가 `computeDemotedSectionIndexes`를 독립 재구현해 이 예외가 반려동물의 `material_feature`에만 좁게 적용되고 생활/리빙 및 반려동물의 다른 EXTRA_IMAGE_SLOTS(190차 의도)는 그대로 유지됨을 수치로 재확인, 실제 `pet-export.html`에서 링 SVG 도달까지 최종 확인. 화장품/뷰티(기존 `ingredient_highlight` 경로)·생활/리빙 영향 0건 확인. `tsc`/esbuild 0, API 0 |
| 섹션 사이 브리더(`shouldInsertBreather`) export 배선 — live/export drift(180/224/225차 계열) | 231 (코드 감사 자체 발굴) | **231** | `lib/export-detail-html.ts` 섹션 조립 루프에 `lastRenderedSection` 추적 + 라이브(`SectionBreather`, `DetailSectionRenderer.tsx:813~831`)와 동일한 그라디언트선+점 HTML을 동일 판정(`shouldInsertBreather`, `section.type !== "hero"`)으로 삽입. 라이브 로직·`shouldInsertBreather` 자체는 무변경(export 쪽 소비 지점만 신설). Claude가 실제 export HTML 3카테고리에서 브리더 라인 수를 grep(pet 7·food 10·fashion 10)해 보고서 수치와 완전 일치 확인, 스크린샷으로 시각 확인. `tsc`/esbuild 0, API 0 |
| `matchCutoutSharpness()` 양방향 매칭 — 배경이 컷아웃보다 뚜렷이 더 선명한 경우 컷아웃을 보수적으로 선명화(218차가 지적하고 스코프 제외했던 단방향 한계 해소) | 218차 지적 → 231차 해결 | **231** | `lib/photo-composite.ts`에 상한(`ratio > 1.8`) 분기 추가 — 기존 하한(0.55, 블러) 분기는 무변경. `sharp().sharpen({sigma:0.6~1.3, m1:0.4, m2:0.4})` unsharp mask, 알파 채널 미변경. Claude가 프로덕션과 동일 sharp 0.35.3으로 별도 샌드박스 재현: 흐린 컷아웃+선명 배경(ratio 6.7)에서 엣지강도 증가·알파 바이트 불변 확인, 선명 컷아웃+흐린 배경(기존 분기)에서 감소 회귀 없음 확인, 중간 비율에서 완전 패스스루(바이트 동일) 확인. 라이브 검증(유료 생성) 없이 결정론적 유닛 테스트만으로 검증 완료 — 사용자의 "코딩으로 해결" 지시와 부합. `tsc`/esbuild 0, API 0 |
| 라이프스타일 픽셀 페이스트(`pasteCutoutOnScene`)에 hero와 동일한 실루엣 그림자(`buildSilhouetteShadowBuffer`) 배선 — 233차가 "정사각형 전용 시그니처라 불가"로 오판해 스코프 제외했던 것을 재조사해 정정, 라이프스타일 경로는 그때까지 타원 폴백(`buildProductShadowSvg`, 자체 주석상 "실루엣 실패 시" 전용 폴백)만 쓰고 있었음 | 234차 (233차 스코프 제외 항목 재조사로 자체 발굴) | **234** | `lib/photo-composite.ts`의 `buildSilhouetteShadowBuffer` 시그니처를 `canvasSize:number` 단일 인자에서 `canvasWidth`/`canvasHeight` 2개로 일반화(내부 로직은 최종 빈 캔버스 생성 2줄만 변경, 나머지 알파·블러·오프셋 계산은 컷아웃 자체 크기+placement만 참조해 무변경), `lib/photo-enhance.ts`의 유일한 기존 호출부는 `CANVAS_SIZE, CANVAS_SIZE`로 동작 완전 보존, `lib/lifestyle-product-composite.ts`의 `pasteCutoutOnScene`은 hero와 동일한 try(실루엣)/catch(`buildSceneShadowSvg` 타원 폴백, 완전 무변경) 패턴으로 신규 배선. 브리프에 없던 `scripts/162cha-shadow-tint-verify.ts`(구 라운드 스크립트, 옛 1-인자 시그니처 호출부)도 함께 변경됐으나 Claude가 전문 열람해 인자 개수만 새 시그니처에 맞춘 순수 호환성 수정(테스트 로직 무변경)임을 확인, 범위 이탈 아님. Claude가 PC 실제 파일 재스테이징 후 `lib/`·`components/`·`scripts/` 전체 mtime 대조로 정확한 변경 파일 목록 확인(`components/` 무변경), 3개 메인 파일 diff가 브리프와 정확히 일치함을 줄 단위로 확인. Cursor의 검증 스크립트를 신뢰하지 않고 **실제 staged 소스(및 전이 의존성 6개)를 esbuild로 완전히 새로 번들한 독립 Node 샌드박스**에서 처음부터 다시 작성한 테스트 실행 — 정사각형 1200×1200·직사각형 1600×900 양쪽에서 그림자 불투명 픽셀 수 **35,663개로 완전 동일 재현**(Cursor 보고 수치와 정확히 일치, 그림자 모양이 canvas 크기가 아닌 컷아웃+placement에만 의존한다는 설계와 부합), 2400×600 극단 종횡비+가장자리 배치도 예외 없음 재확인, **재구현이 아닌 실제 프로덕션 `pasteCutoutOnScene` 함수를 직접 호출**해 800×500 씬 크기 보존을 재확인. 호출부 grep으로 정의 1곳+hero+lifestyle+검증 스크립트 2개뿐, 구 시그니처 잔존 호출부 0건 확인. 스크린샷 3장 직접 열람. `tsc`/esbuild 0, 유료 API 0건 |
| 라이프스타일 픽셀 페이스트에 hero와 동일한 컷아웃 알파 페더링(`featherCutout`) 배선 — hero는 WB/선명도/그레인 매칭 전 반드시 거치는데 라이프스타일 경로엔 아예 빠져 있어 rembg의 날카로운 경계가 실사진 배경 위에 그대로 붙여넣어지고 있었음 | 235차 (`photo-composite.ts` 17개 export 함수 hero/lifestyle 호출 전수 대조로 자체 발굴) | **235** | `lib/lifestyle-product-composite.ts`의 `@/lib/photo-composite` import에 `featherCutout` 추가(알파벳 순서, `defringeCutoutEdges`와 `matchCutoutGrain` 사이), `pasteCutoutOnScene`의 "극단 축소" 블록 직후·WB 매칭 직전에 `try { cutoutPrepared = await featherCutout(cutoutPrepared, Math.max(sceneW, sceneH)); } catch {...}` 삽입 — hero와 동일한 feather→WB→sharpness→grain 순서, 시그니처 변경 불필요(`canvasSize`가 블러 강도 정규화용 스칼라 1개로만 쓰여 `buildSceneShadowSvg` 선례대로 `Math.max(sceneW,sceneH)` 재사용). Claude가 PC 실제 파일 재스테이징 후 `lib/`·`components/`·`scripts/` 전체 mtime 대조 — 브리프대로 `lifestyle-product-composite.ts` 1개만 변경, `photo-composite.ts`·`photo-enhance.ts`·`components/` 전부 234차 시점과 완전 동일, 신규 파일은 검증 스크립트 1개뿐(234차와 달리 브리프 밖 파일 터치 0건). diff가 import 위치·호출 순서·인자·try/catch까지 브리프와 정확히 일치. Cursor의 검증 스크립트(하드엣지 픽스처로 전/후 반투명 픽셀 직접 측정 + `git diff`로 다른 파일 무변경까지 자체 검증)를 전문 열람해 공정함을 확인한 뒤, 그와 별개로 **실제 staged 소스를 esbuild로 완전히 새로 번들한 독립 Node 샌드박스**에서 처음부터 다시 작성한 테스트 실행 — 동일 하드엣지 픽스처에 `featherCutout` 직접 호출해 반투명 경계 픽셀 **0→4,288개로 완전 동일 재현**(Cursor 보고 수치와 정확히 일치), 정사각형(1200×1200)·가로로 긴 씬(2000×500) 양쪽에서 **실제 프로덕션 `pasteCutoutOnScene` 함수를 직접 호출**해 씬 크기 보존 재확인. 스크린샷 2장(경계 전/후 클로즈업) 직접 열람 — 날카로운 수직 경계가 수정 후 부드러운 그라데이션으로 바뀜을 육안 확인. `rg featherCutout lib` 결과 정의 1곳+라이프스타일 import/호출 2곳뿐임도 재확인. `tsc`/esbuild 0, 유료 API 0건 |
| 라이프스타일 픽셀 페이스트의 `removeProductBackground()`에 hero와 동일한 rembg 3단 재시도(`cropAttempts`)+4중 스코어링(손-오염 -1000/plateRisk -500/투명도<0.05 -400/corner-alpha≥40 -300, 나머지 가중합)+손-오염 검사+품질 게이트 배선 — 종전엔 rembg를 1번만 호출하고 재시도·폴백이 전혀 없었음 | 235차(`photo-composite.ts` 17개 함수 hero/lifestyle 대조로 자체 발굴, 유료 API 필요로 §4行) → 238차 재확인 → 240차 사용자 명시 허가(2026-09-23, "hero급 안전장치를 기본값으로 영구 적용해도 된다") | **240** | `lib/photo-enhance.ts`는 `PreCropOptions`/`preCropSourceToProduct`/`sharpenCutout`에 `export` 추가만(로직 무변경) — Claude가 원본 80696바이트→수정본 80717바이트, 차이 정확히 21바이트(`"export "`×3)임을 바이트 단위로 재확인해 그 외 변경 없음을 강하게 뒷받침. `lib/lifestyle-product-composite.ts`는 hero의 `scoreCutout`/`isCutoutAcceptable`과 상수·공식까지 동일한 `scoreLifestyleCutout`/`isLifestyleCutoutAcceptable`을 신설, `removeProductBackground()`를 hero와 동일한 3단 `cropAttempts` 재시도 루프로 재작성, 구 호출부의 중복 trim/purge/defringe를 제거해 새 함수 내부 1곳으로 통합(`rg`로 각 함수 호출 1곳뿐임을 재확인, 죽은 코드 없음). `runNanoBanana` 폴백이 쓰는 `cutoutUrl`은 유지하면서 픽셀 페이스트용 `cutoutBuffer`를 추가 반환해 기존 폴백 호환성 보존. Claude가 PC 실제 파일 재스테이징 후 `lib/`·`components/`·`scripts/` 전체 mtime 대조로 브리프 스코프(2개 파일)만 변경됐음을 확인, diff가 브리프와 줄 단위로 일치(사소한 이탈 1건 — `data:` URL 입력에도 preCrop 시도 후 실패 시 원본 폴백하는 try/catch 추가, 브리프보다 더 견고한 방향의 자체 개선으로 판단, 문제 아님). **실사진 2건 라이브 검증**: electronics(아로마 디퓨저, 어두운 배경+유광 반사)·fashion(옷걸이 레일이 프레임에 잡힌 티셔츠) 둘 다 3회 재시도 전부 `plateRisk=true`(corner-alpha 124~214, 임계값 40 크게 초과)로 게이트가 정확히 발동해 픽셀 페이스트를 드롭하고 기존 nano-banana 폴백으로 안전하게 대체됨을 실사진으로 실증("억지 붙이기 방지"라는 설계 의도가 실제로 작동). Claude가 두 상품 사진을 직접 열람해 스튜디오 화이트-백이 아닌 "스타일드" 촬영물이라 segmentation이 실제로 어려운 입력임을 육안 확인 — 게이트 발동이 캘리브레이션 결함이 아니라는 정황 증거. **정직 기록**: 이번 2건은 게이트의 "거부" 분기만 실증했고, 품질 기준을 통과해 실제로 hero급 픽셀 페이스트가 성공하는 "수락" 분기는 이번 라이브 테스트에서 한 번도 관측되지 못함 — 다음에 더 깨끗한 상품컷으로 재확인 필요. 유료 API 이번 브리프 몫 포함 총 $0.099(2건) |
| hero 컷아웃은 배경 제거 직후 Replicate `clarity-upscaler`로 화질 보정(`sharpenCutout()`)을 거치는데 라이프스타일 픽셀 페이스트 컷아웃엔 이 단계가 아예 없던 것 — 위 rembg 재시도 항목과 같은 브리프로 통합 해결 | 238차(동일 조사) → 240차 사용자 명시 허가, 235차 항목과 통합 | **240** | `sharpenCutout()`을 `photo-enhance.ts`에서 `export`만 추가해 라이프스타일의 새 `removeProductBackground()`가 각 재시도 attempt마다(스코어링 이전) 그대로 호출하도록 배선 — hero와 완전히 동일한 함수 재사용, 신규 로직 0. Claude가 `console-tee.txt`·`summary.json` 원문을 직접 열람해 `sharpenUpscalerOns: 6`(케이스당 3회×2케이스, 실제로 6회 전부 호출됨)을 확인. **운영 이슈로 기록**: 6회 전부 Replicate `philz1337x/clarity-upscaler`가 HTTP 429(레이트리밋)를 반환해 보정 전 컷아웃으로 우아하게 폴백됨(크래시·깨진 출력 없음, 폴백 설계 자체는 정상 작동) — 배선은 완료됐으나 실제 화질 보정이 성공한 사례는 이번 라운드에서 한 번도 관측되지 못함. 이 계정/환경의 Replicate 동시 요청 한도가 향후 라운드에서 다시 문제될 수 있어 모니터링 필요 |

| `stat_infographic` metric의 `style:"ring"`(원형 게이지)이 export에서 별도 처리 없이 `"bar"`(막대바) 분기로 흘러가 라이브와 다른 모양(원↔막대)으로 출력되던 버그 수정 | 241차 (React 컴포넌트 태그 전수 대조 축, 자체 발굴) | **241** | `lib/export-detail-html.ts`의 `case "stat_infographic":`에 라이브 `RadialGauge`(size=112·strokeWidth=10)와 동일 기하의 정적 SVG `if (m.style === "ring")` 분기를 `"number"` 분기 다음·bar 폴백 이전에 삽입(`radius=(size-strokeWidth)/2`, `circumference=2π·radius`, `offset=circumference*(1-pct/100)`), 공유 `<style>`에 `.fill-bar`와 동일한 순수 CSS 패턴(`@keyframes ringFill`+`stroke-dashoffset` 보간, `prefers-reduced-motion` 대응)으로 `.ring-fill` 추가. Claude가 PC 실제 파일 재스테이징 후 `lib/export-detail-html.ts` 1개만 변경(+2049바이트)되고 `DetailSectionRenderer.tsx`는 mtime 완전 동일함을 확인, Python으로 바이트 단위 재계산해 신규 ring 분기(1864B)+CSS 추가(171B)가 전체 diff를 거의 전부 설명함을 재확인(설명 안 되는 변경 사실상 없음). Cursor의 검증 스크립트(`241cha-stat-infographic-ring-verify.ts`)가 재구현이 아닌 실제 `buildDetailPageHtml()`을 직접 호출하는 공정한 테스트임을 확인한 뒤, 그와 별개로 Claude가 실제 생성된 `mixed-styles.html`을 직접 grep — `ring-fill` 정확히 2개·`fill-bar`(bar 스타일 유지)·`font-size:3rem`+`40h`(number 스타일 유지)·각주 마크(ring에서도 정상) 전부 확인. `stroke-dashoffset` 값을 Claude가 직접 손으로 재계산(percent 30→offset≈224.3097, 80→offset≈64.0885)해 파일에서 추출한 실제 값과 완전히 일치함을 스크립트 신뢰 없이 재확인. 스크린샷(`ring-gauge-export.png`) 직접 열람 — 65%·80% 원형 게이지가 정확한 비율로 채워진 원호로 렌더링됨을 육안 확인. `comparison_chart` case에 `ring-fill` 혼입 없음도 재확인. 유료 API 0건 |

| `comparison_table` "있음/없음"류 불린 텍스트 셀이 export에서 원형 체크/X 배지가 아닌 맨 텍스트로 출력되던 버그 수정 | 242차 (React 컴포넌트 태그 전수 대조 축 재검토로 자체 발굴) | **242** | `classifyBoolishCell`을 신규 `lib/comparison-cell-classify.ts`로 추출(로직 완전 무변경)해 라이브·export 공용화 — 라이브(`DetailSectionRenderer.tsx`)는 지역 함수 정의 삭제 후 import로 교체(동작 100% 동일), export(`export-detail-html.ts`)의 `case "comparison_table":`에 동일 함수로 판정하는 `comparisonCellHtml` 헬퍼(28px 원형 배지, accent 틴트 0.12/0.2·회색, 체크/X 글리프) 신설, 두 `<td>` 호출부 교체. Claude가 PC 실제 파일 재스테이징 후 브리프 스코프 그대로 3개 파일(신규 1+수정 2)만 변경됨을 확인, `DetailSectionRenderer.tsx`에서 지역 함수 삭제+import 교체·호출부 무변경을 grep으로 재확인, 신규 공유 파일이 라이브 원본 정규식과 바이트까지 동일함을 확인, export 헬퍼가 브리프와 완전히 일치함을 줄 단위로 확인. Cursor의 검증 스크립트를 신뢰하지 않고 실제 생성된 export HTML을 직접 grep — `border-radius:9999px` 7건 중 6건이 신규 배지(3행×2열), 나머지 1건은 무관한 기존 섹션 브리더 장식 점임을 Python으로 문맥 대조해 재확인(수상해 보이는 카운트를 그냥 넘기지 않고 직접 진위 판별), "무게"(3.5kg/2.1kg) 행은 배지 없이 일반 텍스트 보존 확인, 각 셀 `aria-label`과 체크/X 글리프 대응 3/3 일치 확인. 스크린샷 직접 열람 — 방수/무선/보증 3행에 체크·X 원형 배지, 무게 행만 텍스트로 정확히 렌더링됨을 육안 확인. 유료 API 0건 |

**⚠️ 198차에서 발견한 운영 이슈 — 201~202차에서 해결 완료**: 세션 이미지가 저장된
Supabase 프로젝트 스토리지가 쿼터 초과(402 `exceed_storage_size_quota`)로 전체 잠긴
상태였습니다. 새 무료 조직/프로젝트(`pagzly-v2`, `qnstsrplqzoqlndojuyw`)로 전환해
해결했습니다 — 스키마 마이그레이션 16개, cron(`pg_cron`/`pg_net`) 등록까지 Claude가
Supabase 대시보드 SQL Editor로 직접 재확인 완료(자세한 내용은
`claude/pagzly-supabase-v2-migration-complete-2026-09-16.md` 참고). 기존 프로젝트
(`sblnthhayvrfkvaksest`)는 방치 상태로 남겨둠 — 급하지 않음.

---

## 2. 의도적 보류

| 항목 | 출처 | 사유 |
|------|------|------|
| SPF 기준표 다이어그램 | 160 | 연속량(dB)과 달리 카테고리형(15/30/50+); 뷰티는 용량(mL) 다이어그램으로 충분 |
| 온도(℃) 공개 기준표 | 160 | 판매자 스펙용 안정 기준 약함 |
| POINT 배지 ↔ 부위 점선 연결선 | 59/51 계열 | callout/pointLabel로 충분; 부위 좌표 연결은 공수 대비 이득 낮음 |
| 무지개 차트 / 경쟁사 실명 | 전 기간 | 가드레일 (`comparison-chart-guard`) |
| anti-hallucination 완화 | 160+ | 가드레일 |
| 가짜 후기·전문가·인증 배지·QC 그리드 | 48/159 | 거부 |
| AI 인물 생성 라이프스타일 | 64/81 | 원칙 |
| 144 env 추가 플립(이미지 레버) | 160 | 105/144 원칙 |
| effect 아이콘 전 카테고리 1→3 | 160 | 비용; live max 2 |
| 색면 A/B/D/E 채도 대폭 강화 | 166 | 취향 — 버그 아님 |
| Behance급 에디토리얼 여백·세리프 페르소나 전면 교체 | 183 | 174~184 타이포/토큰 축과 충돌; 카피 리듬 결합 필요 |
| 섹션 큐레이션 상한 A/B (취향만) | 181 | 코드 버그 아님; 실험 시 별도 허가 |
| 히어로 합성 그림자 **방향**(광원 각도) 다양화 | 160 (**209차** — "히어로 그림자/색온도 A/B" 항목에서 색온도 분리, 색온도는 완료로 이동) | AI 배경마다 광원 위치를 추정하는 로직이 없어 방향 매칭은 시도된 적 없음. 대부분의 스튜디오풍 상세컷은 수직 낙하 그림자가 업계 관례라 실제 니즈 자체가 불확실 — 사용자가 구체적으로 "이 사진 그림자가 어색하다"고 지적하기 전까지는 만들지 않음(158/159차 "억지 구현 금지" 원칙과 동일 결) |
| POINT 배지 ↔ 부위 점선 연결선 | 59/51 계열 | callout/pointLabel로 충분; 부위 좌표 연결은 공수 대비 이득 낮음. **209차 재확인**: 185차가 이보다 훨씬 복잡한 곡선 텍스트 링(`ingredient-ring-diagram.ts`)을 구현했으므로 "공수" 사유는 더 이상 유효하지 않지만, 여전히 기존 하이라이트 카드 디자인 언어(박스형)와 충돌 위험(159차 원 판단)이 핵심 사유라 보류 유지 |
| 섹션 드래그(DnD) 재배치 | 45/95 · §3 | **186 판단: 조치 없음** — `DetailStructureSidebar` up/down으로 충분. DnD는 공수 대비 UX 이득 낮음 |
| 패션 spec_table "세탁방법" 행 — 법정 고시가 상세페이지 위임(W컨셉 실사: "상품 품질표시 및 상품상세정보 참고")하지만 항상 플레이스홀더로 남음 | 213차 (W컨셉 실사 크롤링 자체 발굴) | `ProductInput`에 세탁·취급주의 입력 필드 자체가 없고(grep 0건), 원단 조성·가공별로 실제 세탁법이 다른 사실 정보라 AI가 일반화해서 채우면 잘못된 케어 정보를 지어내는 것 — 입력 필드 신규 추가도 위험(잘못된 표기 시 제품 손상·컴플레인). 213차 §6 참조 |
| living `highlight_box` 카드 제목 "단당 80kg" — "1단당"에서 수사(1)가 빠진 것으로 보이는 카피, 렌더링은 코드가 의도한 대로 정상 동작(버그 아님) | 219차 (181cha-live living 세션 원문 대조 자체 발굴) | 카피 생성(DeepSeek 프롬프트) 단계의 완결성 문제 — `parseMegaKeywordHeading()`을 고쳐도 원문 자체가 안 고쳐짐. 코드 전용·유닛 테스트 스코프를 벗어나 219차엔 손대지 않음, 다음에 카피 생성 프롬프트를 다룰 라운드가 있으면 후보로 재검토 |
| `checklist.compactFollow`(gallery/image_text 직후 체크리스트의 여백·헤어라인 압축)가 `lib/export-detail-html.ts`에 전혀 배선돼 있지 않음 — 겉보기엔 223/225차와 같은 "라이브 전용 필드가 export에 없음" 패턴이지만, 이 필드가 true가 되는 경로 자체가 현재 파이프라인에 없음(**재작업/액션 불필요, 기록만**) | 228차실행검증 (필드 커버리지 감사로 자체 발굴) | `lib/section-templates.ts` 6개 카테고리 전부에서 checklist 슬롯은 항상 hero/brand_story 직후 고정 위치이고 gallery/image_text 뒤에 오는 순서가 구조적으로 없음(route.ts 프롬프트도 "슬롯 순서 그대로" 출력을 강제). `app/api/patch-section/route.ts`(채팅 편집)는 기존 섹션 내용만 수정할 뿐 섹션 추가·재배치를 하지 않고, 판매자의 수동 up/down 재정렬도 생성 시점에 정해진 `compactFollow` 값(항상 false)을 바꾸지 않음 — 즉 export에 이 로직을 구현해도 실제 화면 결과는 달라지지 않는 도달 불가능한 코드. 향후 section-templates.ts의 슬롯 순서가 바뀌거나 섹션 재배치 기능이 신설되면 재검토 |
| 라이프스타일 AI 일상샷 생성이 `productSizeHint`에서 cm 높이 파싱 실패 시 전체 스킵, 반려동물만 예외(`generate-lifestyle-shots.ts:109-117`) — 카테고리별 불공평처럼 보이나 실제로는 안전장치 | 238차 (서브에이전트 사진 파이프라인 전수 감사로 발굴) | `lib/lifestyle-physical-scale.ts`의 `parseProductHeightCm()` 주석이 "높이 단서가 없으면 null(추정 합성 금지)"라고 명시 — 111차 anti-hallucination 원칙 그대로. 게이트를 느슨히 해 높이 추정치로 합성하면 원칙 정면 위반. 반려동물 예외는 불공평이 아니라 애초에 손-검출 픽셀 합성이 아닌 별도 전체 AI 씬 생성 경로(`usePixelComposite=false`)를 쓰는 구조적 차이 — 버그 아님 |

---

## 3. 미해결 · API 불필요 (코드만으로 가능)

| 항목 | 출처 | 브리프 |
|------|------|--------|
| 식품 카테고리 TOC "제품정보" 앵커 영구 미노출 — `section-anchor-nav.ts`가 `slot === "spec_table"`만 검사, FOOD 실제 슬롯명은 `nutrition_table`(232차와 같은 결함 계열) | 236차 (서브에이전트 위임 조사 + Claude 전수 재확인, "흐름·인포그래픽" 축으로 전환) | `cursor_brief_236cha_food_anchor_nav_and_hero_cta_bookend_export.md` |
| hero 직후·CTA 밴드 "북엔드"(bookend) 대각선 클립(156차, 다이슨코리아 등 벤치마크 근거)이 export에 전혀 배선 안 됨 — hero·cta_price가 6개 카테고리 전부 required라 모든 생성 페이지 export에서 이 시각 장치가 빠짐 | 236차 (동일 조사) | `cursor_brief_236cha_food_anchor_nav_and_hero_cta_bookend_export.md` |
> 243차실행검증 완료로 §3에서 §1로 이동 — 236차 2건만 잔여.
> 242차실행검증 완료로 §3에서 §1로 이동. 241차실행검증 완료로도 §3에서 §1로 이동 —
> 236차 2건 잔여.
> 236차실행검증은 아직 보고 대기 중(`review/236cha-report.md` 미수신) — 236차 §3 2건은
> 아직 §1로 이동되지 않음. 237차실행검증 완료로 §3에서 237차 항목은 §1로 이동, 238차가
> "모든 카테고리·모든 사진 입력" 축으로 채운 1건(컬러 옵션 섹션 동일사진 반복)은
> 238차실행검증 완료로 §1로 이동, 다시 소진.
> 233/234/235차가 3라운드 연속으로 같은 grep 전수 대조 기법(hero vs 라이프스타일 함수 호출
> 비대칭)으로 신규 항목을 찾다가 235차에서 소진(남은 후보 `buildSoftContactShadowSvg`/
> `unifyCompositeGrain`/`makeComparisonPair`는 전부 무관한 별도 용도로 확인 — Bria 사전합성
> 전용 분기, 실사진엔 불필요한 전체 프레임 그레인, 무관한 before/after 텍스처 기능). 236차가
> "흐름·인포그래픽" 축으로 전환해 서브에이전트에 `section-templates.ts` 기반 구조 감사를
> 위임하고 모든 주장을 Claude가 직접 코드로 재확인해 2건 확정(브리프 작성 완료, Cursor 실행
> 대기). 235차실행검증 완료로 소진됐다가 236차가 새로 채움.
> 234차실행검증 완료로 소진됐다가 235차가 같은 grep 전수 대조 기법으로 1건(컷아웃 페더링)을
> 새로 채움(브리프 작성·235차실행검증으로 확정·§1 이동 완료) — 같은 대조에서 발견한 더 큰 격차
> (rembg 품질 재시도·손-오염 검사 부재)는 프로덕션 유료 API 호출 증가가 걸려 §4로 등록.
> 233차실행검증 완료로 소진됐다가 234차가 233차의 "포함하지 않는 것" 항목을 재조사해 1건을
> 새로 채우고 234차실행검증으로 확정·§1 이동 완료. 232차실행검증 완료로 한 차례 소진됐다가
> 233차가 "사진합성 미약" 축으로 1건(라이프스타일 플레이트/프레임 잔여 제거)을 새로 채우고
> 233차실행검증으로 확정·§1 이동 완료. 231차실행검증 완료로 한 차례 소진됐다가
> 232차가 "새 축 자체 발굴"로 2건(FOOD 무게 게이트, spec_table 행 필터링)을 새로 채우고
> 232차실행검증으로 전부 확정·§1 이동 완료. 229차실행검증 완료로 한 차례 소진됐다가,
> 228차실행검증 후 첫 "새 축 자체 발굴" 시도는 신규 항목을 찾지 못함(정직한 null 결과,
> `checklist.compactFollow`는 도달 불가능한 코드로 판명돼 §2에만 기록) — 사용자 지시
> "다시발굴"로 재시도해 식품 원재료 비율 도넛 중복 렌더 버그를 발견, 229차실행검증으로
> 확정·§1 이동·§5 등록 완료. 230차는 화장품/뷰티 null 결과로 다시 소진. 231차가 "흐름·
> 인포그래픽·사진합성" 코드 감사로 3건(펫 성분 링·export 브리더·선명도 양방향)을 새로 채우고
> 231차실행검증으로 전부 확정·§1 이동 완료. 다음 라운드는 사용자 지정 방향으로 진행.)

> 206차 완료 후 Claude가 KC 인증정보 노출(marketplace_crawl_findings §2 후보)을 코드로
> 재확인 — `lib/enrich-product-sections.ts`의 `SPEC_SKELETONS["전자/가전"]`에 "KC 인증"
> 행이 이미 있고, 인증 미입력 시 행 자체를 생략(플레이스홀더 없음)하도록 이미 구현돼
> 있음을 확인(131~137행). **이 항목은 이미 해결된 상태라 브리프 불필요** — §1에 별도
> 추가하지 않고 여기 각주로만 기록.

---

## 4. API 필요 · 허가 대기

| 항목 | 출처 | 필요한 것 |
|------|------|-----------|
| 경쟁사 URL → 차별화 포인트 추출 (45 Track B) | 45 | DeepSeek/크롤+생성; 폼 필드는 이미 존재 |
| 매거진풍 짧은 캡션 | 183 | DeepSeek 톤/길이 재생성 |
| 히어로/라이프 **실사** 비중 확대 | 183 | Replicate/마켓 실사 재배정 |
| living/pet을 "대표+라이프 1~2컷" 수준까지 더 축소 | 183 | 템플릿 required 재설계 또는 short 기본 + 카피 재생성 (표시 예산 20은 183 완료) |
| DeepSeek JSON 복구 강화 | 181 | 생성 파이프라인 |
| Replicate 크레딧/402 운영 알림 | 181 | 운영/모니터링 |
| BRIA=4 픽커 UX + 기본값 승인 라이브 | 160/166 | 유료 1건+ |
| v4-svg 선별 롤아웃 A/B (checklist/highlight/usage) | 176 | Recraft |
| 아이콘 실패율 로그 집계(schnell 폴백) | 160 | 라이브 다건 |
| `/create/result` 풀 회귀 캡처 live↔export | 169 | 유료 가능 |
| 프리미엄 모드 실사용 1회 체험 | 145 | 사용자 허가 |
| 211차 라이프스타일 매칭 3축(화이트밸런스·선명도·그레인)이 실사에서 자연스러운 결과를 내는지 | 214+215+216차 (총 9건·$0.369) + 217차 무료 조사 + **218차 실행·검증 완료(유료 0건)** + **240차 실사진 2건 재검증 시도(목적 미달성)** | 214/215차는 전부 `nano-banana-fallback`. 216차는 QA 우회로 `pasteCutoutOnScene` 실사 최초 도달했으나 품질 미흡. 217차(무료)가 원인 중 하나를 특정: electronics 상품컷이 다중 오브젝트 플랫레이. **218차 완료**: `matchCutoutWhiteBalance()`/`matchCutoutGrain()` 상수를 상향(mix 0.22/0.14/0.16→0.38/0.24/0.28, 클램프 ±18%→±35~40%, 그레인 알파 0.02~0.05→0.03~0.07) — 브리프 제안값은 1차 실행에서 축소율 24.9%로 미달해 WB만 재조정 후 35.3%로 통과했다는 보고를 Claude가 별도 Node 샌드박스에서 핵심 수치를 처음부터 재구현·재계산해 소수점 둘째자리까지 일치 확인(`218cha-cursor-execution-report.md`), `matchCutoutSharpness`·세이프가드·`lifestyle-product-composite.ts`는 mtime으로 미변경 재확인. **프로덕션에 반영된 상태로 유지** — 단 이는 합성 유닛 테스트 기준 개선이며 실제 사진으로 육안 체감되는지는 여전히 미확인. **240차 재검증 시도(목적 미달성, 정직 기록)**: 사용자가 2026-09-23 실사진 2건 재검증을 명시 허가해 `cursor_brief_240cha_lifestyle_hero_parity_safeguards.md`에 재검증 스크립트를 포함시켰으나, 같은 브리프가 신설한 rembg 품질 게이트가 두 실사진 모두에서 발동(plateRisk 3/3 실패)해 `pasteCutoutOnScene`(매칭 3축 코드가 있는 곳) 자체가 호출되지 않음 — 즉 2건의 유료 호출은 소진됐지만 매칭 3축의 실사 자연스러움은 이번에도 육안으로 확인하지 못함. 다음 재검증은 게이트를 통과할 만큼 깨끗한(스튜디오 화이트-백) 상품컷을 쓰거나 게이트 임시 우회용 별도 QA 경로가 필요 — 계속 미해결 유지. |
| 전자제품·화장품만 Vision 주석 오버레이(`applyElectronicsAnnotatedSections`/`applyCosmeticsAnnotatedSections`) 지원, 나머지 4개 카테고리(패션·식품·생활·반려동물)는 없음 | 238차 (서브에이전트 사진 파이프라인 전수 감사 + Claude 전수 재확인) | `lib/analyze-product-annotations.ts`의 `AnnotationDomain`이 `"electronics" \| "cosmetics"` 전용 타입이고 Claude Haiku Vision API를 실제 호출. 나머지 4개 카테고리로 확장하려면 카테고리별 신규 프롬프트 작성 + **매 생성마다 신규 유료 Vision 호출 증가**가 필요. **240차 사용자 허가는 라이프스타일 안전장치·매칭 재검증 2건에 한정 — 이 항목은 별개, 여전히 미승인.** |

**사용자 허가 전까지 생성 API(`/api/generate`, Replicate, Claude, DeepSeek 카피) 실행 금지 — 라운드 지시문에 명시된 경우만. 214차의 "2건만", 215차의 "4건", 216차의 "1건 + QA 전용 코드 변경(검증 후 되돌림 확인 완료)" 허가는 모두 소진됨. 217차는 무료 조사만, 218차는 유료 API 없이 유닛 테스트로만 검증(독립 재계산까지 완료) — 코드 변경은 프로덕션에 반영된 상태. **240차: 사용자가 2026-09-23 "이거 하는데 지금 유료api 호출은 더 해도 상관은 없어"로 (1) 라이프스타일 hero급 안전장치(재시도+손검사+화질보정) 프로덕션 기본값 영구 적용과 (2) 매칭 3축 실사진 재검증 정확히 2건을 명시 허가(AskUserQuestion으로 범위 재확인 완료) — Cursor 실행·Claude 독립 재검증까지 완료, 안전장치 2건은 §1로 이동, 매칭 3축 재검증은 목적 미달성으로 §4에 유지(위 행 참고). 허가된 2건은 모두 소진 — 추가 허가 없이는 생성 API 호출 금지 원칙 복귀. Vision 주석 오버레이 4카테고리 확장은 이번 허가 범위 밖, 여전히 미착수.**

---

## 5. 이미 구현됨 · 재작업 금지 (185 조사)

| 기능 | 위치 | 비고 |
|------|------|------|
| 섹션 패치 API | `app/api/patch-section` + `handlePatchSection` | 호출 횟수 변경 금지(185) |
| 섹션별 채팅 메시지 히스토리 | `patchHistories` | 있음 |
| 구성 탭 순서 변경 | up/down (`DetailStructureSidebar`) | DnD 아님 — 186에서 DnD 보류 |
| 표시/숨김 | structure 에디터 | 95 Phase 2 |
| 요소 path + 레퍼런스 이미지 첨부 | 96 Phase 3 | |
| 174~184 아이콘/elevation/radius/font/hero/display-budget | — | **재작업 금지** |
| WCAG 대비 감사(`ensureReadableOnPaper`) | 188/189 | **재작업 금지** — 패턴C·CTA/배지 조합 168/168, 텍스트 색 조합 96/96 통과 상태 |
| 저관여 표시 예산(`section-display-budget.ts`) 생활·펫 18섹션 | 183/190 | **재작업 금지** — `MAX_EVIDENCE_LOW=1`/`MAX_EXTRA_IMAGE_LOW=0` 확정, `step_card` 유지 판단 근거 있음 |
| 이미지 lazy-loading (`SectionImage.tsx` `priority` prop, export 13곳) | 191 | **재작업 금지** — 히어로만 eager 확정, 나머지 전부 lazy |
| 반려동물 리뷰 나이·체중 신호 (`countPetAgeWeightMentions()`, `review_highlight` 캡션) | 192 | **재작업 금지** — 반려동물+count>0 게이팅 확정, 품종 추출 미포함 |
| 갤러리 그리드 간격(`galleryGapClass`=`gap-2`/8px), export `dh2()` 배선 7곳 | 193 | **재작업 금지** — 8px보다 더 키우지 않음, 카드/스텝 `<h3>`는 범위 밖으로 의도적 제외 |
| 섹션 배경 장식 텍스처 비활성화(`CATEGORY_PATTERN_ENABLED=false`) | 194 | **재작업 금지** — 그라데이션(A/B/D/E)·패턴 C는 그대로, SVG 데이터는 삭제 안 하고 플래그로만 끔 |
| 에디토리얼 풀블리드 오버레이(`EDITORIAL_BLEED_OVERLAY_CLASS`, `getEditorialBleedScrim`, `getAspectVideoBleedScrim`) | 195~198 | **재작업 금지** — 6카테고리 실사진 기준 정지점(0/24/42/55, 0/20/38/50)·불투명도(0.82) 확정, `illustration_banner`는 의도적으로 미수정(실사 확인 완료) |
| Supabase 프로젝트 전환(`pagzly-v2`, `qnstsrplqzoqlndojuyw`) — env/schema/cron | 201~202 (인프라, 이 백로그 §1에는 참고용으로만 기재) | **재작업 금지** — `.env.local` 3키·마이그레이션 16개·`pg_cron` 등록 전부 Claude 직접 재확인 완료. 기존 프로젝트는 건드리지 않음 |
| 식품 재구매 의사 리뷰 신호 (`countRepurchaseMentions()`, `REPURCHASE_PATTERN`, 카테고리 게이팅 `"식품/건강기능식품"`) | 203 | **재작업 금지** — 정규식·게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료 |
| 패션 사이즈·핏 리뷰 신호 (`countSizeFitMentions()`, `SIZE_FIT_PATTERN`, 카테고리 게이팅 `"의류/패션"`) | 204 | **재작업 금지** — "크다/작다" 단독 표현 의도적으로 미포함(오탐 위험), 정규식·게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료 |
| 뷰티·전자·생활 장기 사용 리뷰 신호 (`countLongTermUseMentions()`, `LONG_TERM_USE_PATTERN`, 카테고리 게이팅 `"화장품/뷰티"`\|`"전자제품"`\|`"생활용품"`) | 205 | **재작업 금지** — 한글 고유어 숫자("한 달째") 의도적으로 미포함, 정규식·3중 게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료. **review-signal 계열(192/203/204/205) 6개 카테고리 전부 완료** |
| 전자제품 표시광고 컴플라이언스 (`lib/electronics-compliance.ts`, `reviewElectronicsCopy()`, 13개 치환 규칙, 카테고리 게이팅 `"전자제품"`) | 206 | **재작업 금지** — `food-compliance.ts`/`cosmetics-compliance.ts`와 동일 구조 확정, `mfdsReviewed`/`replacements` 범용 필드 재사용, 정규식 순서(`반영구적?`→`영구적?`)·13개 규칙·게이팅 문자열·DeepSeek 호출 불변 전부 Claude 독립 재검증 완료 |
| ingredient_circle_pair texture_feel 폴백 (`apply-ingredient-circle-pair.ts`, `pickAlternateIndex()` 재사용) | 207 | **재작업 금지** — texture_feel 있으면 그쪽 우선(회귀 없음), 없으면 대체 이미지로 폴백, 이미지 1장뿐이면 여전히 스킵(가드 유지) 전부 Claude 독립 재시뮬레이션 완료. 렌더링 컴포넌트 미수정 확정 |
| `parseMegaKeywordHeading()` 숫자 토큰 가드 + `TYPO.keywordDisplay`/export `overflow-wrap` | 219 | **재작업 금지** — 5개 테스트 케이스("단당 80kg" 포함) 전부 Claude 독립 재구현으로 확정 |
| `image_text` 본문(`<p>`) line-clamp-5→7 | 219 | **재작업 금지** — Playwright 실측 207/148→207/207로 확정 |
| `image_text` 헤드라인(`<h3>`) line-clamp-5 + `pagzly-ink-headline` 제거 | 219 (확정 220) | **재작업 금지** — 220차 스크린샷 육안 확인으로 electronics·pet 둘 다 전체 노출 확정 |
| `image_text` 헤드라인·본문 가로 오버플로우 방지 (`break-words`+`![overflow-wrap:anywhere]`, export 3분기 `overflow-wrap:anywhere`) | 221 | **재작업 금지** — `word-break:keep-all` 특이도 충돌 원인 확정, 더미/실제 헤드라인 스크린샷 3장으로 회귀 없음 확인 |
| 반려동물·패션·생활용품 표시광고 컴플라이언스 (`lib/pet-compliance.ts`·`lib/fashion-compliance.ts`·`lib/living-compliance.ts`, `route.ts` 6-way 분기) | 222 | **재작업 금지** — `electronics-compliance.ts`와 동일 구조 확정, 카테고리 게이팅 문자열·정규식 순서(패션 "평생 무료 수선"→"평생 보증", 생활 "반영구적?")·cosmetics/food/electronics 기존 3분기 무변경 전부 Claude 독립 재검증(파일 전문 대조 + Node 샌드박스 15케이스 재구현) 완료. **표시광고 컴플라이언스 6개 전 카테고리("기타" 제외) 롤아웃 완료** |
| export HTML 부품/기능 주석 오버레이 복원 (`lib/annotated-image-overlay-svg.ts`, `export-detail-html.ts`의 `shouldUseSplitLayout` 분기 배선) | 223 | **재작업 금지** — 원본 `AnnotatedImageOverlay.tsx` 계수와 100% 동일 이식(mtime 불변으로 원본 미수정 확인), annotated 섹션 고정 50/50·POINT 배지 숨김 확정, 비-annotated 섹션 회귀 없음(항상 빈 문자열) 확정. Claude가 별도로 처음부터 작성한 18개 테스트를 실제 스테이징 소스에 직접 실행해 전부 일치 확인 |
| 라이브·export POINT 카운터 패리티 (`DetailSectionRenderer.tsx`의 `isFullPoint`를 `shouldUseSplitLayout()` 공유 재사용으로 교체) | 224 | **재작업 금지** — `export-detail-html.ts`는 무변경(이미 정답), 라이브만 공유 함수로 통일해 에디토리얼 블리드 섹션 이후 POINT 번호·60:40 리듬·이미지 좌우 어긋남 해소. Claude가 diff 정확 일치 + 옛/새 공식 독립 재구현으로 수정 전 불일치·수정 후 일치 재확인. **이제 두 파일이 동일 함수를 호출하므로 구조적으로 재발 불가** |
| export HTML `layout:"compact"` 섹션 복원 (`lib/compact-image-shape.ts`의 `resolveCompactImageShape` 재사용, `export-detail-html.ts`의 `case "image_text":` circle-pair~callout 사이 신규 분기 + `sectionHtml()` 카운터 파라미터 2개) | 225 | **재작업 금지** — quick_points 등 `layout:"compact"` 필수 슬롯이 라이브와 동일한 120×120 썸네일+한 줄 텍스트로 렌더링됨을 확정. `DetailSectionRenderer.tsx`/`compact-image-shape.ts`는 mtime·크기 불변으로 export 전용 변경 확인, Claude가 실제 스테이징 소스를 `npx tsx`로 직접 import한 독립 테스트 10개 + 스크린샷 육안 대조로 정사각/원형 교대·좌우 정렬 전부 일치 확인 |
| 리뷰 하이라이트 키워드 인라인 강조 (`lib/review-insights.ts`의 `splitTextByKeywords()`, 라이브·export `review_highlight` case 양쪽 배선, 편집 모드 예외 처리) | 228 | **재작업 금지** — `matchCount>0` 게이팅 확정(anti-fabrication), 편집 모드는 `EditableText` 그대로 유지해 강조 미적용 확정, 키워드 길이 내림차순 정렬로 접두사 충돌 처리 확정. Claude가 3개 파일 전부 줄 단위 대조 + 독립 테스트 20개(`npx tsx` 직접 import) + esbuild 구문 검증 + fixture HTML·스크린샷 3장 육안 확인 완료 |
| Before/After 효과 비교 입력 (`lib/before-after-eligibility.ts`, `lib/section-inserts.ts`의 `insertBeforeAfterSection`, `route.ts` 배선, `CreateProductForm.tsx` 업로드 UI, 라이브·export `case "before_after":`) | 227 | **재작업 금지** — 화장품/뷰티·반려동물·식품/건강기능식품 3카테고리 UI·서버 이중 차단 확정(서버가 최종 방어선), 최대 4쌍·URL 없는 쌍 자동 필터·중복가드 확정, 삽입 위치는 review_highlight 직후(있으면)·ai_disclosure/cta_price 직전(없으면) 확정. AI는 이 섹션을 생성하지 않음 — praises/review_highlight와 동일 원칙. Claude가 7개 파일 전부 줄 단위 대조 + 독립 테스트 29개(`npx tsx` 직접 import) + esbuild 구문 검증 + 스크린샷/export HTML 육안·grep 확인 완료 |
| 식품 "원재료 구성 비율" 도넛 spec_table 중복 렌더 제거 (`DetailSectionRenderer.tsx`의 `case "spec_table":`에서 `isFoodCategory` 단독 게이팅 블록 삭제, `sourcing_story` 쪽 2곳은 원래부터 정확해 미변경) | 229 | **재작업 금지** — 삭제 범위 정확히 7줄뿐임을 줄 단위 대조로 확정, `lib/` 전체 mtime 대조로 이 파일 1개만 변경됐음을 확정. 수정 전 스크린샷(배송·교환 안내 섹션에 도넛 중복)과 수정 후 스크린샷(sourcing_story 1회만) 직접 열람으로 버그 재현·해소 둘 다 육안 확인, export는 애초 정상이라 grep 결과 무변화(마커 1개) 확인 |

---

## 6. 사용법 (다음 라운드)

1. 이 문서 §3 또는 §4에서 1~2개만 고른다. (§3이 비면 §4는 허가 후)  
2. 지시서에 「백로그 마스터 ID/행」을 적는다.  
3. 끝나면 표를 `완료됨`으로 옮기고 차수를 적는다.  
4. 새 「다음 후보」를 라운드 리포트에만 남기지 말고 **여기에도 한 줄 추가**.

최종 갱신: **230차 Cursor 재확인** (Claude 직접 갱신 — Cursor가 `review/230cha-report.md`로 230차
조사(화장품/뷰티 디자이너 벤치마크, 코드 실행 없는 조사 라운드)를 코드 레벨에서 읽기 전용으로
재확인. Claude가 `lib/`·`components/`·`lib/types/generate.ts` 전체 mtime을 229차 시점과 대조해
프로덕션 소스 무변경을 확정 검증, `lib/before-after-eligibility.ts` 원문을 직접 열람해
`BEFORE_AFTER_EXCLUDED_CATEGORIES`(화장품/뷰티 포함, 227차)를 재확인. Cursor의 6패턴 판정표가
Claude의 230차 결론과 전부 일치 — 새 코드 실행 없음, §3 계속 비어 있음, 유료 API 0건.

이전 갱신: 230차 (Claude 직접 갱신 — 229차실행검증 완료 후 사용자 지시 "디자이너가 만들었다고
할 정도로 나와야해 퀄리티가"에 따라 장기 품질 과제 재확인. 228차가 같은 날 이미 다룬 카테고리와
겹치지 않도록 화장품/뷰티를 신규 선택해 Behance 레퍼런스("Neriah Stellar Water Fluid Ampoule
Page")를 Claude-in-Chrome으로 전체 크롤링, 158/159/160/181/228차와 동일한 4축+3분류 방법론
적용. 발견 6건 전부 코드 대조 — 5건은 이미 구현됨(228차 리뷰 하이라이트, 207차 원형 성분 카드,
227차 Before/After 화장품 제외 결정, `usage_steps` 기존 스키마로 충분)이거나 이미 채택 금지
확정(226차 별점+실사진), 1건("사용 전→직후→7일 후" 임상 추이 꺾은선 그래프)은 실제 기능 공백은
맞으나 227차가 화장품/뷰티 등에 세운 컴플라이언스 경계(효능 확정 시각화 금지)가 사진
Before/After보다 시계열 수치 추이에 더 강하게 적용된다고 판단해 6개 카테고리 전부 의도적으로
구현하지 않기로 결정(158/159차 "억지 구현 금지" 원칙). 새 코드 브리프 없음 — 정직한 null 결과,
§3 계속 비어 있음. 조사 전문 `claude/230cha-cosmetics-designer-benchmark-findings.md`, 유료
API 0건.

이전 갱신: 229차실행검증 (Claude 직접 갱신 — Cursor가 `review/229cha-report.md`로 실행 완료
보고(유료 API 0건, 파일 1개·블록 1개 삭제만). Claude가 PC 실제 파일을 재스테이징해
`components/DetailSectionRenderer.tsx`의 `case "spec_table":` 블록에서 문제의 `isFoodCategory`
단독 게이팅 `FoodRatioDiagram` 블록이 정확히 삭제되고 나머지 6개 다이어그램·`sourcing_story` 2곳
게이팅은 불변임을 줄 단위로 확인. `lib/` 디렉토리 전체 mtime 대조로 `export-detail-html.ts`·
`food-ratio-diagram.ts`·`section-templates.ts` 등 스코프 제외 파일 전부 미변경, 변경 파일이
`DetailSectionRenderer.tsx` 1개뿐임을 확인. `esbuild` 구문 검증 통과. 스크린샷 5장 직접 열람 —
수정 전 배송·교환 안내(shipping_info) 섹션에 도넛이 중복 렌더링된 버그 재현과, 수정 후
sourcing_story 섹션에 정확히 1회만 표시됨을 육안 확인. export HTML grep으로
`data-diagram="food-ratio"` 마커 1개(변화 없음)도 재확인. `tsc` 0(esbuild로 대체), 유료 API 0건 —
§1로 이동, §5 등록, §3 다시 소진.

이전 갱신: 229차 (Claude 직접 갱신 — 228차실행검증의 "새 축 자체 발굴"이 null 결과로 끝나자
사용자 지시 "다시발굴"로 재시도. `spec_table` 다이어그램 계열 7종의 게이팅 조건을 줄 단위로 대조해
식품 카테고리 "원재료 구성 비율" 도넛 차트가 `section.slot` 조건 없이 `nutrition_table`/
`shipping_info` 섹션에도 중복 렌더링되는 버그를 발견(export는 슬롯명 불일치로 우연히 죽은 코드라
중복이 나타나지 않아 라이브·export 불일치). 같은 블록의 나머지 6개 다이어그램과의 패턴 불일치·
여백 조건식 누락·export 슬롯명 불일치 3가지 근거로 취향이 아닌 코드 결함으로 확정,
`sourcing_story`(image_text case) 쪽 2곳은 이미 라이브·export 정확히 일치해 불필요함도 확인.
`components/DetailSectionRenderer.tsx` 1개 파일, 7줄 삭제만 지시하는 단일 삭제 브리프
`cursor_brief_229cha_food_ratio_diagram_duplicate_fix.md` 작성 — §3에 등록, 유료 API 0건, Cursor
실행 대기.

이전 갱신: 228차실행검증 (Claude 직접 갱신 — Cursor가 `review/228cha-report.md`로 실행 완료
보고(유료 API 0건). Claude가 PC 실제 파일 3개(`lib/review-insights.ts`·
`components/DetailSectionRenderer.tsx`·`lib/export-detail-html.ts`)를 재스테이징해 브리프와 줄
단위로 대조 — 전부 정확히 일치. `lib/section-inserts.ts`·`route.ts`·`types/generate.ts`·6개
컴플라이언스 모듈은 mtime으로 227차 시점과 완전 동일해 미변경 확인. Cursor의 검증 스크립트를
신뢰하지 않고 실제 스테이징된 `review-insights.ts`를 `npx tsx`로 직접 import해 독립적으로 처음부터
작성한 테스트 20개(join 불변식·빈 문자열·1글자 토큰·특수문자 키워드·4개 캡·접두사 충돌 우선순위)를
실행 — 20/20 전부 통과. `esbuild`로 3개 파일 전체 구문 파싱 통과. 제공된 `fixture-export.html`을
grep, 스크린샷 3장(라이브 읽기/편집·export)을 직접 열람해 matchCount>0 강조·matchCount=0 평문·편집
모드 미적용·라이브-export 패리티를 전부 육안 확인. `tsc` 0(esbuild로 대체), 유료 API 0건 — §1로
이동, §5 등록, §3 다시 소진.
이어서 "새 축 자체 발굴"을 시도했으나 신규 항목을 찾지 못함(정직한 null 결과) — 라이브·export
import 목록 비교(223/224/225차 방식)는 0건, `DetailSection` 전 필드 커버리지 감사에서
`checklist.compactFollow`가 export에 미배선임을 발견했으나 `section-templates.ts`·
`patch-section/route.ts` 확인 결과 이 필드가 true가 되는 경로 자체가 현재 파이프라인에 없어
도달 불가능한 코드로 판명, §2에 기록만 남기고 액션 아이템으로 등록하지 않음).

이전 갱신: 228차 (Claude 직접 갱신 — 사용자 지시 "디자이너 그리고 후커블이 만든것과 똑같은
퀄리티가 나와야해 알아서 크롤링을 해도 되고 학습해서 우리가 보완해야할점 지시사항 남겨줘,
유료 api 호출은 하지마"에 따라 158/159/160/181/219차와 동일한 4축+3분류 방법론으로 hookable.ai
자사 랜딩 페이지 + Behance 디자이너 레퍼런스 2건(전자제품 주방가전·생활용품 수납함, 181차
이후 첫 신규 크롤링)을 Claude-in-Chrome으로 직접 크롤링. 발견 패턴을 전부 실제 코드와 대조해
대부분 이미 해결됨(설득 프레임워크 라벨 138차, 포인트 오버레이 223차, hairline 구분선, 별점+
실사진 채택금지 226차, 히어로 실사 비중 183차 API대기)을 재확인, 신규 발견은 딱 1건 —
`lib/review-insights.ts`의 `extractCoreKeywords()`가 이미 계산한 매칭 키워드를 리뷰 하이라이트
praise 문장에 인라인 강조로 시각화(신규 입력·API 0, matchCount>0 게이팅으로 anti-fabrication
유지). 조사 전문 `claude/228cha-designer-hookable-benchmark-findings.md`, 구현 브리프
`cursor_brief_228cha_review_highlight_keyword_emphasis.md`(신규 공유 함수 `splitTextByKeywords()`
+ 라이브·export 양쪽 렌더러 배선, 편집 모드 예외 처리 명시) 작성. §3에 등록, 유료 API 0건,
Cursor 실행 대기).

이전 갱신: 227차실행검증 (Claude 직접 갱신 — Cursor가 `review/227cha-report.md`로 실행 완료
보고. Claude가 PC 실제 파일 7개 전부(`lib/before-after-eligibility.ts` 신규·`lib/types/generate.ts`·
`lib/section-inserts.ts`·`app/api/generate/route.ts`·`components/CreateProductForm.tsx`·
`components/DetailSectionRenderer.tsx`·`lib/export-detail-html.ts`)를 재스테이징해 브리프와 줄 단위로
대조 — 전부 정확히 일치. route.ts 삽입 지점이 draft 모드 early-return 이후 구간임을 확인해 draft에는
영향 없음 재확인, 3개 컴플라이언스 모듈(`pet`/`cosmetics`/`food-compliance.ts`)·`section-templates.ts`는
mtime으로 미변경 확인. Cursor의 검증 스크립트를 신뢰하지 않고 실제 스테이징된 소스를 `npx tsx`로
직접 import해 독립적으로 처음부터 작성한 테스트 29개(카테고리 게이팅, 제외 카테고리 무삽입, 정상
삽입, URL 필터링, 4쌍 캡, 중복가드, 삽입 위치 4가지, 기존 함수 회귀)를 실행 — 29/29 전부 통과(최초
2건은 Claude 자신의 테스트 어서션 실수로 확인, 수정 후 재실행해 전부 통과). `esbuild`로 7개 파일
전체 구문 파싱 통과. 제공된 스크린샷·export HTML을 직접 열람·grep해 BEFORE/AFTER 배지·캡션·
컴플라이언스 각주가 예측대로 렌더링됨을 확인. `tsc` 0(esbuild로 대체), 유료 API 0건 — §1로 이동,
§5 등록, §3 다시 소진(현재 비어 있음)).

이전 갱신: 227차 (Claude 직접 갱신 — 226차 발견을 이어받아 "Before/After 입력 기능 설계 검토"
진행. 법적 리스크(화장품/뷰티·반려동물·식품/건강기능식품이 이미 컴플라이언스 모듈이 있는, 효능
확정 주장에 민감한 카테고리라는 점)를 핵심 변수로 확인해 A/B/C안을 제시, 사용자가 A안(민감 3카테고리
제외) 채택. `review_highlight`/`section-inserts.ts` 기존 AI-미생성·서버-조립 패턴을 그대로 재사용하는
구조로 7개 파일 전체(신규 게이팅 lib, 타입, section-inserts, route.ts 배선, 업로드 UI, 라이브·export
렌더링)를 정확한 코드로 명시한 `cursor_brief_227cha_before_after_input.md` 작성. §3에 신규 항목 추가,
Cursor 실행 대기).

이전 갱신: 226차 (Claude 직접 갱신 — 225차실행검증으로 §3이 다시 비어 사용자가
"새 마켓플레이스/카테고리 크롤링" 선택. 쿠팡(210차 접근 확인)에서 미개척 카테고리인
반려동물(기능성 강아지 사료)을 Claude-in-Chrome으로 직접 크롤링해 패턴 4건 발견 — Before/After
실사진 비교 모듈(입력 기근으로 분류, 코드 브리프 대상 아님), 개별 리뷰어 스크린샷풍 인용 카드
(`ReviewHighlightSection` 자체 원칙과 충돌해 채택 금지 확정), 원형 인증 씰 그래픽·해시태그
뱃지(둘 다 취향 후보). 전부 §3에 추가할 코드 전용 항목이 아니라 정직한 null 결과 —
`226cha-coupang-pet-crawl-findings.md` 작성, 코드 변경 없음, §3 여전히 비어 있음).

이전 갱신: 225차실행검증 (Claude 직접 갱신 — Cursor가 `review/225cha-report.md`로
export `layout:"compact"` 섹션 복원 실행 완료 보고, Claude가 PC 소스 재대조 —
`lib/export-detail-html.ts`의 import·`sectionHtml()` 시그니처·루프 카운터·신규 compact
분기가 브리프 diff와 정확 일치, `DetailSectionRenderer.tsx`/`compact-image-shape.ts`는
mtime·크기 불변으로 미변경 확인. `npx tsx`로 실제 스테이징 소스를 직접 import한 독립
테스트 10개 전부 통과, `esbuild` 구문 검증 통과, 스크린샷 육안 대조로 정사각/원형 교대·
좌우 정렬 확정 — §1로 이동, §5 등록, §3 다시 소진).

이전 갱신: 225차 (Claude 직접 갱신 — 224차실행검증으로 §3이 다시 비어 사용자가 재차
"새 축 자체 발굴" 선택. 라이브·export의 `@/lib/*` import 목록을 비교하는 방식으로
`layout:"compact"` 섹션 전체가 export에서 처리되지 않는다는 것을 발견 — quick_points 등
템플릿이 강제하는 필수 슬롯이라 223/224차보다 흔하고 크게 눈에 띄는 불일치. 원본 렌더
로직을 export 관례에 맞게 이식하고 `sectionHtml()` 시그니처에 카운터 파라미터 2개를
추가한 `cursor_brief_225cha_export_compact_layout_missing.md` 작성. Cursor 실행 대기).

이전 갱신: 224차실행검증 (Claude 직접 갱신 — Cursor가 `review/224cha-report.md`로
POINT 카운터 패리티 실행 완료 보고, Claude가 PC 소스 재대조 — `DetailSectionRenderer.tsx`의
import·`isFullPoint` 교체가 브리프 diff와 정확 일치, `export-detail-html.ts` mtime 불변으로
무변경 확정, 옛 인라인 공식 완전 제거·무관 코드(`feature_callout` isCallout 판별) 보존
확인. 로직 정확성은 실제 `shouldUseSplitLayout`/`shouldUseEditorialBleed` 소스를 직접 읽고
독립 재구현한 Node 시뮬레이션으로 재확인(수정 전 불일치·수정 후 일치), `esbuild` 구문
파싱 통과. §1로 이동, §5 등록, §3 다시 소진 — 라이브·export가 이제 동일 함수를 호출해
구조적으로 재발 불가).

이전 갱신: 224차 (Claude 직접 갱신 — 223차실행검증으로 §3이 다시 비어 사용자가
"포인트 카운터 검토"를 직접 지정. 223차 브리프 각주의 의심 사항을 Node 샌드박스 시뮬레이션
으로 실제 확정 — 라이브 `isFullPoint`가 export의 `shouldUseSplitLayout()`과 달리
에디토리얼 블리드 섹션을 카운트에서 빼먹어 이후 섹션들의 POINT 번호·60:40 리듬·이미지
좌우가 라이브·export 간 어긋남을 수치로 증명(material_detail 예시: 라이브 "POINT 03"+
이미지 왼쪽 vs export "POINT 02"+이미지 오른쪽). export는 이미 올바른 설계라 라이브만
공유 함수 재사용으로 고치는 최소 변경을 명시한
`cursor_brief_224cha_point_counter_editorial_bleed_parity.md` 작성. Cursor 실행 대기).

이전 갱신: 223차실행검증 (Claude 직접 갱신 — Cursor가 `review/223cha-report.md`로
export "부품/기능 주석 오버레이" 복원 실행 완료 보고, Claude가 PC 소스 2개 파일 전문
재대조(신규 `annotated-image-overlay-svg.ts` + `export-detail-html.ts` 배선) + 원본
`AnnotatedImageOverlay.tsx` mtime 불변 확인 + 별도로 처음부터 작성한 18개 테스트를 실제
스테이징 소스에 `npx tsx`로 직접 실행해 100% 일치 확인, `esbuild` 구문 파싱도 통과. 제출된
스크린샷은 480×29px로 너무 작게 잘려 육안 확인엔 부적합했으나 코드 증거로 충분히 확정.
§1로 이동, §5 등록, §3 다시 소진).

이전 갱신: 223차 (Claude 직접 갱신 — 222차실행검증으로 §3이 다시 비어 사용자가 재차
"새 축 자체 발굴" 선택. `image_text` 다이어그램 호출 횟수 라이브·export 불일치를 조사하다
다이어그램 자체는 버그가 아님을 확인했지만, 그 과정에서 `layout:"annotated"` 섹션의
`AnnotatedImageOverlay`(Vision API 유료 생성 부품/기능 포인트 라벨)가 export HTML에
통째로 빠져 있는 진짜 콘텐츠 소실 버그를 발견. 원본 기하 로직을 1:1 이식한 신규 파일
+ export 배선을 명시한 `cursor_brief_223cha_export_annotated_overlay_missing.md` 작성.
Cursor 실행 대기).

이전 갱신: 222차실행검증 (Claude 직접 갱신 — Cursor가 `review/222cha-report.md`로
반려동물·패션·생활용품 컴플라이언스 3종 실행 완료 보고, Claude가 PC 소스 3개 파일 전문
재대조 + `route.ts` 6-way 배선 재확인 + Cursor 스크립트와 독립적인 Node 샌드박스 15케이스
재구현으로 100% 일치 확인(ALL PASS). 219차 같은 모호함 없이 깔끔하게 확정 — §1로 이동,
§5에 재작업 금지 등록, §3 다시 소진. 표시광고 컴플라이언스 6개 전 카테고리 롤아웃 완료).

이전 갱신: 222차 (Claude 직접 갱신 — 221차로 §3이 비어 사용자가 "새 축 자체 발굴"을
선택. `lib/` 재검토로 206차 컴플라이언스 패턴이 반려동물·의류/패션·생활용품 3개
카테고리엔 미적용임을 발견, 카테고리 문자열을 `CreateProductForm.tsx`에서 사전 확인해
`cursor_brief_222cha_remaining_category_compliance_rollout.md` 작성. Cursor 실행 대기).

이전 갱신: 221차 (Claude 직접 갱신 — 220차가 발견한 가로 오버플로우 버그 수정을
Cursor가 완료·보고, Claude가 PC 소스 재스테이징으로 독립 검증. Cursor가 브리프의 단순
`break-words` 제안을 넘어 실제 원인(`app/globals.css`의 `.pagzly-display-headline`
`word-break:keep-all`+`overflow-wrap:break-word`가 Tailwind 유틸리티보다 높은 특이도)을
스스로 특정한 것을 Claude가 globals.css 원문으로 재확인, `![overflow-wrap:anywhere]`
해결책과 export 3분기 배선을 코드 대조로 확인. 스크린샷 3장(더미 정상 클램프, 실제
헤드라인 2건 회귀 없음)을 직접 열람해 육안 확정 — §1로 이동, §3 완전히 소진).

이전 갱신: 220차 (Claude 직접 갱신 — 219차에서 미확정이었던 `image_text` 헤드라인
line-clamp 수정을 Cursor의 스크린샷(코드 변경 없음)으로 최종 확정. Claude가 스크린샷을
직접 열람(전체 페이지 캡처라 OCR로 위치를 먼저 찾은 뒤 육안 확인)해 electronics·pet
헤드라인 둘 다 "···" 잘림 없이 완전히 렌더링됨을 확인 — §1로 이동. 같은 검증 중 신규로
발견한 **가로 오버플로우 버그**(공백 없는 40자+ 더미 헤드라인이 line-clamp 대신 카드
경계를 뚫고 뷰포트 밖으로 흘러넘침, `break-words` 누락)를 §3에 신규 등록 — 실제 생성
데이터에서 재현된 적 없는 인위적 극단 케이스라 낮은 우선순위, 사용자 판단 대기).

이전 갱신: 219차 실행 검증 (Claude 직접 갱신 — Cursor의 219차 완료 보고를 그대로
믿지 않고 PC 실제 파일 재스테이징 + Playwright 실측 JSON(`clamp-before.json`/
`clamp-after.json`) 원본 대조 + 함수 로직 독립 재구현으로 검증. **확정 완료 2건**:
`parseMegaKeywordHeading()` 숫자 토큰 가드(5개 케이스 전부 일치), `image_text` 본문
line-clamp 잘림(207/148→207/207로 명확히 해소) — §1로 이동. **부분 확인 1건**:
`image_text` 헤드라인 line-clamp 수정은 Cursor가 브리프 제안(line-clamp-3)을 넘어
line-clamp-5+`pagzly-ink-headline` 제거로 확장했고 그 CSS cascade-layers 메커니즘
자체는 Claude의 별도 Playwright 격리 재현으로 실재함을 확인했으나, 실제 프로덕션
before/after 수치가 electronics·pet 둘 다 완전히 동일해 이 변경이 실제 렌더링에
영향을 줬다는 증거가 되지 못함 — 저비용 스크린샷 후속 확인을 §3에 남기고 완료로
표시하지 않음).

이전 갱신: 219차 (Claude 직접 갱신 — 사용자가 "실제 생성물 직접 열람 +
재벤치마크(무료)"를 선택해 기존 `review/181cha-live/*` 스크린샷 6개 카테고리
전체를 재열람 + 각 `session.json` 원문 대조로 버그 2건을 확정(§3 신규 등록):
`image_text` 레이아웃 line-clamp 잘림, `parseMegaKeywordHeading()` 키워드
오버플로우. `219cha-live-rebenchmark-findings.md` +
`cursor_brief_219cha_image_text_clamp_and_keyword_overflow_fix.md` 작성,
Cursor 실행 대기. 카피 완결성 이슈("단당 80kg")는 §2에 후보로만 기록).

이전 갱신: 218차 실행 검증 (Claude 직접 갱신 — Cursor의 218차 완료 보고를
diff 대조 + mtime 확인 + **별도 Node 샌드박스에서 핵심 수치 독립
재구현·재계산**(극단 색역 거리 150.04/97.24/62.88, reduction 35.3% 등 전부
일치)으로 검증. 매칭 강도 보강이 프로덕션에 안전하게 반영됐음을 확인,
`218cha-cursor-execution-report.md` 작성).

이전 갱신: 218차 (Claude 직접 갱신 — 217차 무료 조사에 이어 사용자가 216차 원인
후보 (1) "매칭 강도 부족"을 진행하기로 선택. `lib/photo-composite.ts`의
`matchCutoutWhiteBalance()`/`matchCutoutGrain()` 상수를 코드로 확인하고, 유료
API 없이 유닛 테스트로만 검증 가능한 범위로 스코프를 제한한
`cursor_brief_218cha_matching_intensity_boost.md` 작성. Cursor 실행 대기).

이전 갱신: 217차 (Claude 직접 갱신 — 216차 보고서가 제시한 품질 미흡 원인 후보 중
사용자가 "컷아웃 형태 문제부터 조사"(무료)를 선택 → 코드 변경·유료 API 없이 상품
이미지 직접 열람 + `lib/lifestyle-product-composite.ts` 코드 대조 + 216차 산출물
재확인으로 electronics 상품컷이 다중 오브젝트 플랫레이라는 원인을 확정. `전자제품/`
폴더 대체 후보 4개를 전부 열람해 단일 오브젝트 후보(`05-pexels-1279107.jpeg`)를
새로 식별. `217cha-cutout-shape-investigation.md` 참고).

이전 갱신: 216차 (Claude 직접 갱신 — 사용자가 판단을 위임한 QA 전용 우회 플래그를
Cursor가 실행 완료(1건·$0.015365)한 뒤, Claude가 report·summary.json·run-log·
`qa-flag.diff` 대조 + PC의 현재 소스 파일을 재스테이징해 `qaBypassGraspSafeguard`/
`allowPaste` 문자열 0건을 grep으로 직접 재현해 코드 되돌림을 검증(보고서 신뢰 아님),
`app/api/generate/route.ts` mtime으로 프로덕션 미연결도 시간상 재확인. **211차 매칭
경로(`pasteCutoutOnScene`, method=pixel-paste)가 214→215→216차 조사에서 처음으로
실사 도달**했으나, 산출 이미지를 원본과 직접 대조한 육안 확인 결과 화이트밸런스·그레인·
접촉 그림자가 아직 자연스럽지 않음을 확인 — §4 갱신, `216cha-cursor-execution-report.md`
참고. 코드는 완전히 되돌려짐, "생성 API 0건/관찰만" 원칙 기본값 복귀).

이전 갱신: 214차 (Claude 직접 갱신 — 사용자가 허가한 "2건만" 유료 실사 실행을
Cursor가 완료(합계 $0.108721)한 뒤, Claude가 보고서·summary.json·실행 스크립트·실제 코드·
산출 이미지 2장 전부 직접 대조해 독립 검증. 실행 자체는 가드레일 그대로 정확했으나, 89차
grasp 세이프가드가 두 건 모두에서 작동해 211차 매칭 경로(`pasteCutoutOnScene`)가 구조적으로
도달 불가능했음을 코드로 증명 — 원래 목적("211 매칭이 실사에서 자연스러운가")은 미해결로
§4에 재등록. 코드 변경 없음, `214cha-cursor-execution-report.md` 참고).

이전 갱신: 207차 (Claude 직접 갱신 — 사용자 지시 "후커블 및 디자이너가 만든 수준까지
나와야해"에 따라 148차부터 59라운드 미착수였던 `ingredient_circle_pair` texture_feel
필수 조건 버그 수정 완료·검증. `pickAlternateIndex()` 재사용만으로 해소돼 신규 로직
0줄, 렌더링 컴포넌트 미수정 확정. Claude가 diff 코드 대조 + 4개 케이스 별도 샌드박스
독립 재시뮬레이션으로 보고서 수치 전부 일치 확인. §3의 마지막 항목이 처리돼 다시
비게 됨 — 다음 라운드는 완전히 새 축 자체 발굴 또는 사용자 지정 필요).

이전 갱신: 206차 (Claude 직접 갱신 — 사용자 지시 "코드 재검토해서 새 축 자체 발굴"에
따라 식품/화장품 컴플라이언스 패턴을 전자제품으로 확장, `reviewElectronicsCopy()` 코드
대조 확인. 같은 조사 과정에서 marketplace_crawl_findings의 "전자제품 KC 인증 노출"
후보는 이미 `enrich-product-sections.ts`에 구현돼 있음을 확인해 §3 각주로 기록, 별도
브리프 불필요 판단).

그 이전: 205차 (Claude 직접 갱신 — 사용자 지정으로 review-signal 계열의 마지막
라운드 진행. 화장품/뷰티·전자제품·생활용품 3카테고리를 "장기 사용 후기" 신호 하나로
동시 커버, 정규식·3중 게이팅 문자열을 Claude가 독립 재검증. 이걸로 192/203/204/205
전체 review-signal 롤아웃이 "기타"를 제외한 실제 6개 카테고리 전부에서 완료됨 —
`countLongTermUseMentions()` 코드 대조 확인. §3을 review-signal 계열 종료로 갱신, 다음
라운드는 완전히 새 축이 필요함을 명시).

그 이전: 204차 (Claude 직접 갱신 — 사용자가 직접 지정한 "패션 사이즈/핏 리뷰 신호"를
192/203차와 동일 구조로 구현·검증. "크다/작다" 단독 표현의 오탐 위험을 사전에 배제하도록
"사이즈" 키워드 동반 조건으로 설계, 203차에서 겪은 카테고리 문자열 오류를 이번엔 사전에
`CreateProductForm.tsx` 확인으로 예방. Cursor 구현 후 Claude가 정규식·게이팅 문자열을
독립 재검증. `countSizeFitMentions()` 코드 대조 확인).

그 이전: 203차 (Claude 직접 갱신 — §3이 비어 있어 코드 재검토로 192차 반려동물
정규식 리뷰 신호 패턴이 타 카테고리로 확장된 적 없었음을 발견, 식품 "재구매 의사" 신호로
동일 구조 확장. Cursor의 카테고리 게이팅 문자열 자체 수정(`"식품"`→`"식품/건강기능식품"`)을
grep으로 재확인, 정규식 동작을 별도 샌드박스에서 독립 재구현해 검증. `countRepurchaseMentions()`
코드 대조 확인).

그 이전: 195~198차 (Claude 직접 갱신 — "후커블과 똑같은 퀄리티" 요구에서 183차가
API 필요로 오판정했던 "매거진풍 캡션/대형 타이포 오버레이"를 코드 전용으로 재판단·구현,
구현 중 발견한 회귀(브랜드색 스크림 오염) 2건을 스크린샷 직접 대조로 잡아 수정, QA
스크린샷 자체가 Supabase 쿼터 초과로 깨져 있던 것까지 발견해 로컬 자산으로 재검증 완료.
`getEditorialBleedScrim`/`getAspectVideoBleedScrim` 코드 대조 확인).

더 이전: 194차 이하는 이 문서 앞선 버전 히스토리 참고.
