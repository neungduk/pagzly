# 마켓플레이스·경쟁사 PDP 학습 (2026-08-31)

자동 생성: `npx tsx scripts/marketplace-pdp-scan.ts`

> 이번엔 텍스트뿐 아니라 실제 화면도 캡처함 — `review/competitor-screens/` (AI 도구 랜딩)

## 요약

- **크롤 대상**: AI 상세 도구 7곳 + 마켓 PDP 가이드 3곳 (공개 HTML, API 비용 $0)
- **학습 방법**: 랜딩/가이드 텍스트에서 Page Maker 모듈 키워드 매칭 → Pagzly 슬롯과 대조
- **비목표**: 가짜 리뷰, AR/3D, Figma 네이티브 (비용·정책)

## 크롤 스냅샷

## AI 상세페이지 도구

### 후커블
- URL: https://www.hookable.ai/
- kind: ai_tool
- title: 국내 1위 상세페이지 AI | 후커블
- 모듈 신호: 리뷰·신뢰(3), 하단 고정 CTA(1)
- excerpt: 후커블, 가장 퀄리티 좋은 상세페이지 AI입니다. 이커머스 셀러들의 상세페이지 고민을 완벽하게 해결합니다. 대한민국 1등 AI가 수만 개의 히트 상품 데이터를 분석하여 팔리는 상세페이지를 완성해 드립니다. — 국내 1위 상세페이지 AI | 후커블 홈 주요 기능 이용 요금 블로그 채용 지금 시작 문의하기 홈 주요 기능 이용 요금 블로그 채용 지금 시작 문의하기 150만+ 장 이상의 이커머스 상세페이지가 후커블로 생성되었어요 압도…
- 스크린샷: `review/competitor-screens/hookable-landing.png`

### 크리에이지
- URL: https://creazy.ai/
- **크롤 실패**: 페이지에서 텍스트를 추출하지 못했습니다.

### GENCY
- URL: https://gency.ai/
- kind: ai_tool
- title: GENCY - 상세페이지 자동 생성 서비스
- 모듈 신호: (없음)
- excerpt: 이미지만 업로드하면 15초만에 상세페이지 완성! GENCY와 함께 쉽고 빠른 자동 생성 서비스를 경험해보세요 — GENCY - 상세페이지 자동 생성 서비스
- 스크린샷: `review/competitor-screens/gency-landing.png`

### 알잘AI
- URL: https://alzal.kr/
- kind: ai_tool
- title: 알잘ai - 전문 업체가 만든 고퀄리티 상세페이지 제작 AI
- 모듈 신호: 핵심 포인트 3~4(2), 사용법 스텝(1)
- excerpt: 알잘ai - 전문 업체가 만든 고퀄리티 상세페이지 제작 AI. 이제 상세페이지 업체에 제작 그만하세요. 상페 전문 업체의 노하우로 ai가 상세페이지 기획부터 이미지 생성, 디자인을 — 알잘ai - 전문 업체가 만든 고퀄리티 상세페이지 제작 AI 알잘AI 홈 로그인 이제 상세페이지는 전문가에게 맡기세요. 기획부터 · 촬영까지 단 ' 5 분' 만에 0원으로 시작해보기 AI가 당신의 제품을 분석하고, 전문가 수준의 상세페이지를 완성…
- 스크린샷: `review/competitor-screens/alzal-landing.png`

### 드랩아트
- URL: https://draph.art/
- kind: ai_tool
- title: 상세페이지 AI & 썸네일 AI 제작, 쇼핑몰 AI 솔루션 | 드랩아트
- 모듈 신호: 사용법 스텝(2), 히어로 훅(1), 핵심 포인트 3~4(1), 리뷰·신뢰(1), 하단 고정 CTA(1)
- excerpt: 매출을 부르는 상세페이지 AI, 클릭을 유도하는 썸네일 AI, 쇼핑몰 AI 이미지까지. 촬영 없이 클릭 한 번으로 자동 생성하세요. — 상세페이지 AI & 썸네일 AI 제작, 쇼핑몰 AI 솔루션 | 드랩아트 [이벤트] SNS 리뷰 작성 시 네이버페이 포인트 100% 증정! [이벤트] 회원 가입시 상세페이지 1회 생성 무료! AI 믹스 AI 인물 AI 상세페이지 쇼츠메이커 회원 기능 기능 소개 스톡 블로그 요금제 ko 기능 소개…
- 스크린샷: `review/competitor-screens/draph-landing.png`

### 가비아 AI 에디터
- URL: https://aieditor.gabia.com/
- kind: ai_tool
- title: AI 기반 상품상세페이지 생성 에디터
- 모듈 신호: 리뷰·신뢰(1)
- excerpt: 최신 AI 기술로 상품 상세 페이지를 몇 분 안에 생성하세요. AI 에디터는 마케팅 콘텐츠 제작을 간소화하고 창의적인 디자인을 가능하게 합니다. 지금 시작해 보세요! — AI 기반 상품상세페이지 자동 생성 에디터 | AI 에디터 기능 이용 방법 요금제 고객센터 공지사항 업데이트 문의하기 매뉴얼 로그인 내 요금제 무료 신청하기 NEW · AI 상품상세 3.0 상품 설명 하나로 완성도 높은 상세페이지 체험하기 무료 신청하기 AI …
- 스크린샷: `review/competitor-screens/gabia-landing.png`

### 셀러비서
- URL: https://sellerbiseo.com/ko/
- kind: ai_tool
- title: 셀러비서 - 쿠팡 스마트스토어 상세페이지 AI 자동 생성
- 모듈 신호: 사용법 스텝(2)
- excerpt: AI 기반 상세페이지 자동 생성 서비스. 쿠팡, 스마트스토어 최적화된 상세페이지를 몇 분 만에 완성하세요. 상품 이미지만 업로드하면 전문적인 상세페이지가 자동으로 생성됩니다. — 셀러비서 - 쿠팡 스마트스토어 상세페이지 AI 자동 생성 서비스 ✕ 로그인 이메일 비밀번호 로그인 또는 Google로 로그인 카카오로 로그인 계정이 없으신가요? 회원가입 닉네임 이메일 비밀번호 비밀번호 확인 회원가입 또는 Google로 회원가입 카카오…
- 스크린샷: `review/competitor-screens/sellerbiseo-landing.png`

## 마켓·PDP 가이드 (공개)

### 스마트스토어 상세 가이드
- URL: https://silmupack.com/smartstore-product-detail-page/
- kind: market_guide
- title: 스마트스토어 상세페이지 작성법 (2026) | 신뢰·전환·검색 노출 균형 잡는 구조 - 실무팩
- 모듈 신호: 핵심 포인트 3~4(2), 리뷰·신뢰(2), 하단 고정 CTA(2), 히어로 훅(1), 풀폭 사용 장면(1)
- excerpt: 스마트스토어 상세페이지는 디자인이 아니라 신뢰·전환·검색 노출 세 축의 균형입니다. 모바일 기준으로 대표 영역·요약·이미지·옵션·신뢰 요소·CTA 6블록을 위에서 아래로 배치하는 순서와 블록별 점검 항목을 확인하세요. — 스마트스토어 상세페이지 작성법 (2026) | 신뢰·전환·검색 노출 균형 잡는 구조 - 실무팩 실무팩 SILMUPACK 자료실 글 계산기 용어사전 소개 연락처 무료 PDF 받기 컨텐츠로 건너뛰기 실무팩 메뉴 …

### 쇼핑몰 상세 구성
- URL: https://sangbao.kr/blog/shopping-mall-detail-page-guide
- **크롤 실패**: 응답 시간 초과로 접근하지 못했습니다.

### 2026 PDP 트렌드
- URL: https://oscsnm.com/product-detail-page-design-2026/
- kind: market_guide
- title: 상세페이지 디자인 2026 완벽 총정리 5가지 - OSC
- 모듈 신호: 핵심 포인트 3~4(1), 사용법 스텝(1), FAQ 이의 처리(1)
- excerpt: 상세페이지 디자인 2026 트렌드부터 직접 제작 vs 외주 비교까지 5가지 핵심 전략을 확인하세요. — 상세페이지 디자인 2026 완벽 총정리 5가지 - OSC Skip to content O OSC Online Sales Consulting Commerce &#8964; Marketing &#8964; Blog Contact KR 진단 신청 &#8594; 01 Why OSC OSC Commerce operating team …


## 모듈 커버리지 (크롤 히트 합산)

| 모듈 | 크롤 히트 | Pagzly 대응 |
|------|-----------|-------------|
| 히어로 훅 | 2 | hero + badge |
| 혜택 요약 스트립 | 0 | TrustStrip (배송·인증·CTA 배지) |
| 핵심 포인트 3~4 | 6 | checklist 4열 |
| 풀폭 사용 장면 | 1 | editorial bleed image_text |
| 사용법 스텝 | 6 | step_card 3단 |
| 리뷰·신뢰 | 7 | review_highlight (입력 리뷰만) |
| 고시·스펙 표 | 0 | spec_table + shipping_info |
| FAQ 이의 처리 | 2 | faq 카드형 |
| 하단 고정 CTA | 4 | cta_price sticky |
| 숏폼·GIF | 0 | custom_gif + GSAP reveal |

## Pagzly vs 경쟁사 갭

| 갭 | 경쟁사 | 조치 | 우선순위 |
|-----|--------|------|----------|
| 채팅형 섹션 편집 | 크리에이지, 후커블(부분) | patch 탭 고도화 (대규모 UX) | P2 |
| Figma 네이티브 연동 | 크리에이지 | 비목표 (단기) | — |
| AR/3D 뷰어 | 고가 에이전시 PDP | 비목표 (프로바이더 비용) | — |
| 가짜 리뷰 모자이크 | 일부 셀러 상세 | 의도적 비목표 — 입력 리뷰만 review_highlight | — |

## 이번 라운드 코드 반영 (45차)

- lib/landing-content.ts — 레퍼런스 이미지 마케팅 문구
- lib/url-crawler.ts — extractCompetitorDifferentiation
- app/create/draft/page.tsx — 경쟁사 대비 차별화 포인트 카드
- scripts/competitor-gap-scan.ts — 가비아·셀러비서 + 스크린샷
- lib/marketplace-pdp-patterns.ts — 6블록 CRO 가이드 + 혜택 키워드 추출
- lib/designer-detail-patterns.ts — 마켓 가이드 병합
- lib/extract-trust-chips.ts — 배송·혜택 칩 확장
- lib/enrich-product-sections.ts — keyFeatures → CTA 배지 보강
- lib/assign-section-images.ts — step_card 중복 배정 완화
- lib/food-compliance.ts — 원산지·알레르기·보관 슬롯 규율
- app/api/generate/route.ts — lengthGuide 로그·식품 슬롯 블록

## 디자이너·마켓 공통 원칙 (습득)

1. **6블록**: 대표 → 혜택 요약 → 이미지 스토리 → 신뢰 → FAQ → CTA
2. **8~12 스크롤 구간**: 짧은 구성 모드 + AI 요약으로 길이 압축
3. **혜택은 첫 스크롤**: 무료배송·당일발송·인증을 히어로 직후 스트립에
4. **사진 우선 리듬**: 풀폭 사용 장면 → 스텝 → 고시표
5. **근거 있는 신뢰만**: 입력 리뷰·인증·고시 — 날조 금지

## 다음 (코드만)

1. 채팅형 patch 탭 — 섹션별 재생성 UX
2. HTML export 인터랙티브 스와치 — 마켓 script 정책 검증 후
3. 이미지 dedup QA — 소스 장수 부족 시 STRUCTURAL 분류 (45차 qa-visual-check 반영)
