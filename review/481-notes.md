# 481차 — 실사↔픽스처 격차 노트

실사 product `e8c1c270-dc6a-435d-a915-efab06ab6dd1` → `scripts/fixtures/live-481.json`.  
로컬 자동 선택 렌더 = `editorial` (`review/481-captures/live-481-auto-editorial-*.png`).  
프리뷰 캡처(`review/480-captures/result-*.png`)와 **아키타입·섹션 골격은 같음**(첫 원인 ≠ 로컬≠프리뷰 렌더 불일치).

| # | 가설 | 실측 | 결론 |
|---|------|------|------|
| 1 | 아키타입 선택 | `CATEGORY_FIT["화장품/뷰티"]` = softlife·luxe·editorial·narrative. 이 상품 `detectArchetype`→beauty-skincare, `mood=clinic`. `pickArchetype(seed=상품명\|카테고리)` → **editorial**. `NEXT_PUBLIC_V5_ARCHETYPE` 강제 없음. mood null 시 뷰티 200시드 분포 ≈ softlife 64 / luxe 71 / editorial 65 (narrative 제외·상위3만). **뷰티가 항상 editorial은 아님**이나, 이 시드·clinic 보너스 조합에서 editorial 확정. 8종 분화는 강제 렌더에서만 보이고 실사 1회 생성은 1종만. | 원인: 결정적 1종 선택 + 뷰티 풀이 softlife/luxe/editorial에 몰림. 수정: 톤·팔레트 명도/채도로 8종 후보 확장·결정적 유지, `data-pz-bsig` 노출 유지. |
| 2 | 제목 서체 | export HTML: `typeSystemCssV5`가 `--pz-v5-title:'Gowun Batang'` + `:is(h1,h2,[data-pz-title],[data-hero-name],.pagzly-display-headline)!important`. 폰트 링크 `/fonts/gowun-batang.css` 포함. **라이브** `DetailSectionRenderer`는 `archetypeCssV5`(서체) **뒤에** `fontPairCss`를 넣어 `.pagzly-display-headline{font-family:var(--pz-f-title)!important}`(Noto)가 **후승**. export는 fontPair→V5 순이라 통과. 히어로 `h1[data-hero-name]` 인라인은 `--pz-f-title`(Noto 변수). | 원인: 라이브 CSS 순서. 수정: V5 on일 때 fontPair 제목 규칙을 덮지 않게 순서/가드, 히어로도 `--pz-v5-title` 사용. |
| 3 | hero-stack 미적용 | 로컬·실사 모두 `data-pz-vsig="editorial"` `data-pz-vsig-bg`·레시피(beside/card/md) 존재. 히어로 `data-hero-v2="D"`. 사용자가 본 “연보라 면+큰 병”은 **editorial 시그니처 자체가 약해 보이거나** AI 히어로 사진 배경(`#A7BED0` 계열)과 V5 면색이 겹쳐 스택 차이가 묻힌 것. 조건 미충족으로 스택이 빠진 것은 **아님**. | 원인: 적용은 됐으나 시각 대비 약함 + 사진 뒤 AI 파스텔과 충돌. 수정: 사진 주변 면을 color-roles 면색으로 맞춤. |
| 4 | 실사 섹션 종류 | live 슬롯 중 `SLOT_LABELS` 미등록: `seller_trust_evidence`, `ingredient_circle_pair`, `comparison_chart`, `packaging_design`, `how_it_works`, `size_options`, `customer_scenario`. `slotDisplayLabel`이 note=slot 그대로 반환 → **영문 slug 노출**. V5 `prefer`/레이아웃은 `highlight_box`+seller_trust·ingredient_circle에 일부 분기 있으나 라벨·일부 변형 경로가 픽스처에 없던 슬롯. | 원인: 라벨 맵 공백 + 실사 전용 슬롯. 수정: 한글 라벨 보강, 미매핑은 일반 라벨, V5 별칭 매핑. |
| 5 | 사진 뒤 배경 | 히어로 사진 래퍼 `background:#A7BED0`(테마/backdrop 잔여). V5 `color-roles`·`paper`와 별개. 인포/블리드 구간도 AI infoBackdrop URL 파스텔. | 원인: backdrop 면색 ≠ V5 surface. 수정: 사진 주변 면을 `--pz-cr-surface` 등으로 통일, 가장자리 마감을 아키타입 어휘로. |

## A 확인 요약
- 프리뷰 실사 ≈ 로컬 `auto-editorial`(동일 bsig/vsig·같은 이미지 CDN).
- 8종 강제 렌더는 서체·시그니처가 갈라짐(로컬 갤러리 HTML 로그 확인).
- 사용자가 느낀 “나아진 게 없다” = **한 상품=editorial 1장** + 라이브 제목 서체 덮임 + slug 노출 + 파스텔 면 충돌.
