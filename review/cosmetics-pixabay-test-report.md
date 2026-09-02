# 화장품 Pixabay QA 테스트 리포트

생성: 2026-08-31T23:58:46.509Z
BASE_URL: http://localhost:3000
TEST_MODE: false
실행 시간: 657.7s

## 입력 (가라 상품)

| 필드 | 값 |
|------|-----|
| 상품명 | 글로우밤 수분 크림 |
| 브랜드 | 루미에르 랩 |
| 카테고리 | 화장품/뷰티 |
| 가격 | 25000원 |
| 타겟 | 20~40대 민감성·건성 피부 |
| 핵심 특징 | 수분감 있는 텍스처, 산뜻한 마무리, 민감성 피부 사용 가능, 속당김 케어, 무향 포뮬러 |
| 성분 | 히알루론산, 세라마이드, 판테놀, 알로에베라잎추출물, 글리세린 |
| 인증 | 피부 자극 테스트 완료, 동물실험 없음 |
| wholesaleUrl | 원본: GlowBalm Moisture Cream 50ml / 워터리 크림, 무향, 민감성 피부 / 사용법: 세안 후 적당량을 얼굴에 펴 바름 |

## Pixabay 이미지 (page URL)

1. https://pixabay.com/photos/self-care-morning-routine-activity-6886590/
2. https://pixabay.com/photos/cosmetic-skincare-female-natural-2357981/
3. https://pixabay.com/photos/beauty-face-closeup-portrait-young-4664847/
4. https://pixabay.com/photos/cosmetics-beauty-health-make-up-5475900/
5. https://pixabay.com/photos/hygiene-cleanliness-skincare-870763/
6. https://pixabay.com/photos/sunblock-skincare-healthy-skin-1461397/
7. https://pixabay.com/photos/ai-generated-bottle-cosmetics-cream-8329349/

## 결과

- **스크린샷:** `review/qa-screenshots/cosmetics-pixabay-test-full.png`
- **session:** `review/pixabay-cosmetics-test/session.json`
- **productId:** 6b2c8740-bc00-4b55-8bf6-f738a07a4bfd
- **sections:** 23
- **generationCost:** 0.1389661688

## API 에러

없음

## 콘솔 (error/warning)

없음

## 품질 관찰

### 사진·합성 (compositing / backdrop)
- **히어로·디테일(0~2번):** `TEST_MODE=false`로 hero/ingredient/texture 슬롯에 AI backdrop·enhance 파이프가 적용됨. 히어로는 `-enhanced-fx-moisture` 연출, 텍스처 구간은 `-fx-cooling` 오버레이가 붙어 수분·쿨링 무드는 일관적.
- **고스트/이중 노출:** lifestyle 풀(3~6번)은 로그상 studio composite를 **skip**하고 Pixabay 원본 JPG/PNG를 그대로 사용. 인물·손·타사 느낌의 스톡 컷이 ‘글로우밤 튜브’ 카피와 **동일 제품 합성이 아님** → 이중 노출(제품 연출 컷 + 무관한 라이프스타일) 인상은 낮으나, **브랜드·SKU 연속성**은 약함.
- **컷아웃 품질:** 1번 enhanced PNG는 알파 채널 분산이 큼(rough cutout 가능성). 0·5번은 알파 std≈0(불투명 합성본). 6번(510×340) 저해상도 패키지 컷이 step/패키지 섹션에 **반복 재사용**되어 픽셀 품질 차이가 눈에 띌 수 있음.
- **백드rop:** `backdropFailed: false`, photoCost에 backdrop·sectionBackdrops 항목 존재. QA 러너는 백드rop 워커/피커 대기를 건너뛴 로그가 있으나 최종 세션에는 후보 확정 플로우가 반영된 것으로 보임. 히어로는 웜 브라운 악센트(#844F1F)와 dewy 연출이 conceptBrief(수분/물방울)와 정합.
- **갤러리:** compare before/after 2컷(9번 URL) 추가 — 더미 제품 실사가 아닌 **AI 비교 연출**임을 AI disclosure와 함께 인지 필요.

### 카피 톤·더미 상품 정확도
- **브랜드·SKU 매핑:** 입력 wholesale(GlowBalm Moisture Cream 50ml) → 출력 ‘글로우밤 수분 크림 / 루미에르 랩 / ₩25,000’으로 자연스럽게 한글화. 무향·민감성·히알루론산 등 **입력 스펙과 FAQ·spec_table이 대체로 일치**.
- **톤:** conceptBrief `copy_tone`(부드럽고 담백, 수분·산뜻함)과 hero/체크리스트/하이라이트 카피 톤이 맞음. 과장 수식어는 적고 화장품 상세에 무난한 **정보형+감성 혼합**.
- **규정·플레이스홀더:** MFDS형 **주의사항 전문** 포함. 제조사·제조국·사용기한·배송기간 등은 ‘판매자 확인 필요’로 남아 **실판매 전 human QA 필수**. `mfdsReviewed: false`, `qaSummary` 빈 문자열.
- **리스크:** 스톡 사진(세안·클로즈업 등)과 ‘튜브 패키지’ 카피가 시각적으로 완전히 같은 SKU를 가리키지 않을 수 있음 — 더미 QA에서는 허용 범위이나 실제 SKU 업로드 시 카피-이미지 정합 검수 필요.

### 섹션 간격·레이아웃 (48cha wow 기준)
- **전체 길이:** 프리뷰 스크롤 높이 약 **14,310px**(720×13927 풀페이지 캡처), 섹션 **23개** — long 템플릿에 해당하는 **풍부한 스택**.
- **리듬:** DOM section 높이 717→323→479px 등 hero·스토리·체크리스트 후 image_text 구간 진입. quick_points 두 블록은 높이 **~128–131px**로 다소 **촘촘** — 48cha ‘섹션 호흡’ 관점에서 micro-gap/패딩 튜닝 여지.
- **하이라이트·스텝:** highlight_box(~787px), step_card(~1148px), gallery(~912px)로 **중후반에 시각적 앵커**가 있음. illustration_banner는 높이 ~150px로 짧은 인터루드.
- **CTA:** 하단 cta_price + AI disclosure 순서는 컴플라이언스 우선 배치로 적절. spec_table이 상품/배송 **2회** 등장 — 정보는 분리되나 **배송·교환 행 중복**으로 간격이 다소 장문.

### 48cha 백로그 갭
- 자동 **detail-page QA 미기록**(`qaSummary` 공란) — Vision/룰 기반 품질 점수·이슈 리스트 파이프 연동 필요.
- **이미지-카피 정합:** lifestyle 원본 유지 정책 vs ‘패키지/튜브’ 카피 — SKU 단일 컷 가이드 또는 composite 강제 옵션.
- **해상도·재사용:** 510×340 컷의 step_card/패키지/용량 섹션 **다중 재사용** — upscaling 또는 슬롯별 전용 컷.
- **스펙 placeholder 일괄 치환:** 제조국·제조사·배송 SLA 템플릿/판매자 입력 연동.
- **섹션 간 vertical rhythm:** quick_points·illustration_banner 등 **저높이 구간** padding token (48cha spacing scale) 적용.
- **갤러리 compare 컷:** 실사 업로드 시 before/after 생성 정책·면책 문구 강화.
- *(본 QA는 create/result 프리뷰만 검증 — **섹션 채팅 UI**는 범위 외.)*
