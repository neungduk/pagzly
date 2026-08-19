# Pagzly 자동 작업 로그

## GSAP·Playwright QA·합성 보완 (2026-08-18 오전)

### 1단계 재확인 (`review/final-approved/`)

| 항목 | 결과 |
|------|------|
| 조명 톤/방향 일치 | **PASS** — `lightingLockPrompt` + WB match + 방향 그림자 |
| halo 제거 | **PASS** — `featherCutout` blur 2.4 + premultiply |
| 섹션별 배경 다양화 | **PASS** — hero / moisture(fx) / texture / compare 5장 고유 URL |
| Before/After 동일 구도 | **PASS** — `makeComparisonPair`, gallery `[3,4]` |

보완: B/A 대비 강화(건조 saturation 0.58, after gloss 0.55), TEST_MODE 섹션 배경 `.cache/section-backdrops/` 디스크 캐시, TEST_MODE에서도 성분/텍스처 extras 합성 허용.

검증: `npx tsx scripts/verify-final-approved.ts` → **6/6 PASS**

### 2단계 GSAP

- `gsap` + `ScrollTrigger` 설치
- `RevealOnScroll` → GSAP fade/slide (랜딩)
- `DetailScrollReveal` → 상세 섹션 stagger 등장 (절제된 y-offset)
- `prefers-reduced-motion` → 즉시 opacity 1
- `freezeScrollRevealAnimations()` — html-to-image 다운로드 전 고정

**전후:** CSS transition 0.7s linear-ish → GSAP `power2.out` 0.82s + ScrollTrigger `top 90%` + index stagger. 체감상 더 부드럽고 섹션별 순차 등장.

### 3단계 Playwright QA

- `scripts/qa-visual-check.ts` — 화장품/전자/리빙 session.json 로드
- 스크린샷: `review/qa-screenshots/*.png`
- 리포트: `review/qa-report.md`
- 화장품: imageUrls 5/5 고유, DOM 중복 없음, 콘솔 에러 0
- 전자/리빙: session imageUrls 고유 PASS, DOM img 중복 WARN (같은 사진 재사용 슬롯 — 의도적)

### 4단계 화장품 5회 반복

- `/dev/detail-preview` 캡처 5회, API $0
- 평균: 4.52 → 4.56 → 4.56 → 4.58 → **4.60** (이전 4.50 대비 유지/향상)
- 상세: `review/quality-log.md` §2026-08-18

### 이번 작업 비용

| 항목 | USD |
|------|-----|
| API (Replicate/Claude/DeepSeek) | **$0** |
| Playwright 캡처 / QA | $0 |
| npm gsap 패키지 | $0 |

---

## 합성 퀄리티 (조명 잠금·섹션 배경·B/A) (2026-08-18)

`TEST_MODE=false`, `BACKDROP_CANDIDATES=3` (이번 확인만. 7장 fill-dev를 다시 돌리지 않음). 확인 후 `TEST_MODE=true`, `BACKDROP_CANDIDATES=7`로 복구.

### 코드

- `analyzeShadowDirection` → `colorTemperature`/`lightFrom` + `lightingLockPrompt()`. 배경·장식 프롬프트에 명시. 중립/쿨이면 골든/앰버 악센트 생략.
- 후보 variation은 구도만 바꾸고 색온도는 잠금과 동일하게.
- 합성: `featherCutout` + `matchCutoutWhiteBalance` + 광원 방향 SVG 그림자.
- 화장품: 성분(물방울/유리) · 텍스처(제형 매크로) 배경을 flux-schnell ×2. 히어로는 고른 스튜디오 후보 유지.
- 갤러리 Before/After는 히어로와 같은 구도, Sharp로 건조/광택만 다름. 컨셉 오버레이는 B/A에 안 입힘.

### 예상 (세럼 2장, 후보 3)

| 항목 | USD |
|------|-----|
| flux-fill-dev ×3 | $0.075 |
| 섹션 배경 schnell ×2 | $0.006 |
| 누끼+clarity ×3 (히어로/성분/텍스처) | ~$0.049 |
| 장식+효과+아이콘+분석 | ~$0.08–0.10 |
| **합계** | **~$0.21–0.24** |

### 실제 — 히알루론 세럼 1회

서버 로그 total **$0.2203**. pickBestBackdrop 없음. clarity-upscaler ON.

| 항목 | USD | 메모 |
|------|-----|------|
| flux-fill-dev ×3 | $0.0750 | 사람 선택 |
| 섹션 배경 schnell ×2 | $0.0060 | ingredient + texture |
| 누끼+clarity ×3 | $0.0494 | 히어로/2번째 컷/텍스처 extra |
| 장식 schnell | $0.0030 | 히어로만 |
| 효과 moisture+cooling | $0.0060 | 성분·히어로. B/A에는 미적용 |
| 아이콘 6/7 | $0.0180 | 1장 Replicate 503 |
| Claude (그림자+감지+분석+QA) | $0.0595 | |
| DeepSeek | $0.0033 | |
| 브리프 | $0.0001 | |
| **합계** | **$0.2203** | |

조명 분석: **neutral**, **upper-left**. 로그 `LIGHTING LOCK: neutral white 5000K studio... key light from upper left`.
합성 로그 3회: `feather + WB match, lightFrom=upper-left temp=neutral`.
갤러리: `before/after → [3,4] from hero[0]`.
QA: PASS, warning 6 (img1 골드 vs 0/2 쿨톤 등).

스크린샷: `review/final-approved/result-v1.png` (이전) / `result-v2.png` (이번, `result.png`도 동일). 컷별 `v2-hero.png`, `v2-ingredient.png`, `v2-texture.png`, `v2-before.png`, `v2-after.png`.

### v1 대비

나아진 점: 히어로가 골든아워가 아니라 쿨/뉴트럴 쪽. 섹션 배경이 스튜디오 / 물방울 / 워터 매크로로 갈림. B/A가 서로 다른 장면이 아니라 히어로 구도를 공유함.
남은 점: 원본 스틸라이프(유리잔·블라인드·페이퍼 소품)가 누끼에 같이 남아 새 배경 위에 사각 컷처럼 보임. 성분 컷(원본 2번)은 여전히 웜 페이퍼 톤. B/A 질감 차이는 첫 결과에서 약해 보여 Sharp 대비를 한 단계 더 올림(다음 생성부터).

---

## 최종 승인 배경 후보 선택 (2026-08-17)

`TEST_MODE=false`, `BACKDROP_CANDIDATES=7`. Claude `pickBestBackdrop` 생략, 사람 선택 UI.

### 예상 (1회, 세럼 2장)

| 항목 | 이전 (후보 3 + 자동선택) | 이번 (후보 7 + 사람) |
|------|--------------------------|----------------------|
| flux-fill-dev | 3 × $0.025 = $0.075 | 7 × $0.025 = **$0.175** |
| pickBestBackdrop (Sonnet 비전) | ~$0.015 | **$0** |
| 배경 구간 순증 | — | **+$0.085** |
| 누끼+clarity ×2 | $0.033 | $0.033 |
| 분석/카피/QA/아이콘 등 | ~$0.08 | ~$0.08 |
| **1회 합계** | ~$0.20 | **~$0.28–0.32** |

clarity-upscaler는 `isTestMode()`일 때만 생략. 최종 승인은 항상 ON.

### 실제 — 히알루론 세럼 1회

서버 로그 total **$0.2598**. 실패 후 과금분 포함하면 약 **$0.285**.

| 항목 | USD | 메모 |
|------|-----|------|
| flux-fill-dev ×7 | $0.1750 | 사람 선택, pickBestBackdrop 없음 |
| 그림자 Haiku | $0.0020 | |
| 누끼+clarity 1차 | $0.0165 | 히어로. 이후 장식 합성 Sharp 오류로 500, **원본 유지** |
| 장식 flux-schnell | $0.0030 | 합성 전에 실패. 이후 코드 수정 |
| 누끼+clarity 2차 | $0.0165 | 성공 |
| Claude Sonnet 분석 | $0.0342 | |
| DeepSeek 카피 | $0.0008 | |
| QA Haiku | $0.0080 | PASS, warning 6 |
| 효과 2장 | $0.0060 | Replicate 오류로 미적용, 과금은 발생 |
| 아이콘 7장 | $0.0210 | |
| 브리프 | $0.0003 | |

선택 UI: `review/final-approved/backdrop-picker.png` (후보 7장)  
결과: `review/final-approved/result.png`  
QA: PASS (6 warning)

히어로는 장식 합성 버그로 보정본이 빠짐. `compositeDecorOnBackdrop`의 Sharp `linear` 4채널 오류를 고쳤고, 장식 합성 실패 시 배경만 쓰도록 폴백을 넣음. 재실행은 하지 않음.

테스트 후 `.env.local`의 `TEST_MODE`는 다시 `true`. `BACKDROP_CANDIDATES=7`은 유지.

---

## 화장품 확장 학습 (2026-08-17) — 세럼 1종류만

목표: 5종류(세럼/크림/미스트/클렌저/마스크팩) 각각 생성 후 5~10사이클. **이번엔 세럼 1회만.**

### 예상 (진행 전)

TEST_MODE, 효과 최대 1장(flux-schnell $0.003). 파이프라인 재사용 캐시 전제.

| 항목 | 1종류 | 5종류 |
|------|-------|-------|
| Claude 분석 | ~$0.011 | ~$0.055 |
| DeepSeek 브리프+카피 | ~$0.0025 | ~$0.013 |
| backdrop + enhance | ~$0.0035 | ~$0.018 |
| 합성 효과 | $0.003 | $0.015 |
| 아이콘 (나올 때) | $0~$0.003 | $0~$0.015 |
| 레이아웃 사이클 | $0 | $0 |
| **합계** | **~$0.020–0.023** | **~$0.10–0.12** |

### 실제 — 세럼 1회

`히알루론 세럼` TEST_MODE total **$0.0230**

| 항목 | USD |
|------|-----|
| Claude Haiku 분석 | $0.0111 |
| DeepSeek 브리프 | $0.0002 |
| DeepSeek 카피 | $0.0023 |
| flux-schnell 배경 | $0.0030 |
| enhance | $0.0005 |
| 합성 효과 moisture ×1 | $0.0030 |
| 아이콘 ×1 | $0.0030 |
| **합계** | **$0.0230** |

나머지 4종류는 같은 단가면 약 **$0.092**. 확인 후 진행.

이미지 목록: `review/test-images.md` 화장품 확장 표.  
스크린샷: `review/iteration/화장품-확장/cycle-01-세럼.png`

---

## 컨셉 효과 합성 시험 (2026-08-17) — 뷰티만

레이아웃 파이프라인 재실행 없음. flux-schnell 효과 레이어만 추가 생성, 오버레이는 Sharp(로컬, $0).

**예상 (카테고리 1개, 최대 2장):** $0.003 × 2 = **$0.006**

**실제**

| 항목 | USD |
|------|-----|
| 성공 생성 moisture + cooling | $0.0060 |
| 실패 예측 (이전 실행 1 + 이번 moisture 재시도 1). 과금 여부는 Replicate 정책상 불확실 | 최대 +$0.0060 |
| Sharp 오버레이 / Playwright 캡처 | $0 |
| **이번 시험 상한** | **$0.0120** |

전자기기·리빙은 아직 안 돌림. 같은 단가면 카테고리당 성공 기준 **$0.006**, 3개 모두면 **$0.018** (+실패분).

결과: 두 효과 모두 quality-log **미채택**. 비교 컷은 `review/iteration/effects/`.

---

## 이미지 매핑 + 구조 패턴 루프 (2026-08-17)

### 1단계 원인
렌더러는 `imageIndex`를 그대로 씀. TEST_MODE 누끼 1장은 **원본 배열을 지우지 않음**.  
원인은 DeepSeek가 POINT에 같은 인덱스를 넣고, 전자는 원본 1장뿐이었던 것.  
수정: `lib/assign-section-images.ts`로 image_text/갤러리 순환. 히어로는 유지.

3장 재검증: 뷰티 `hero:0 / ingredient:1 / texture:2 / gallery:[0,1]`.

### 2단계 이미지
Pexels API만. 키는 `.env.local`의 기존 `PEXELS_API_KEY`. 목록·라이선스: `review/test-images.md`. 로고 컷 폐기.

### 3단계 구조
`reference-patterns.md` §10. 렌더러: 갤러리 BEFORE/AFTER(뷰티), STEP 01–03, 성분 밴드, `%` 막대, COMPARE 라벨, 히어로 tabular-nums. 슬롯 신설·카피 복제 없음.

### 4단계 점수 (5사이클 후 >4.5 종료)

| 카테고리 | 최종 | 사이클 | 경로 |
|----------|------|--------|------|
| 뷰티-스킨케어 | **4.66** | 5 | `review/iteration/뷰티-스킨케어/` |
| 전자기기 | **4.62** | 5 | `review/iteration/전자기기/` |
| 리빙 | **4.52** | 5 | `review/iteration/리빙/` |

### 비용 (이번 3회 생성, 레이아웃 $0)

| 서비스 | USD |
|--------|-----|
| Claude Haiku 분석 3회 | $0.0328 |
| DeepSeek 브리프+카피 | $0.0033 |
| Replicate backdrop ×3 | $0.0090 |
| Replicate enhance ×3 | $0.0015 |
| Replicate icons (전자 1) | $0.0030 |
| Pexels | $0 |
| **합계** | **$0.0496** |

상품별: 뷰티 $0.0161 / 전자 $0.0183 / 리빙 $0.0152.

---

## 섹션 이미지 반복 수정 (2026-08-17)

**증상:** 카피는 섹션마다 다른데 상품 사진이 같은 컷으로 반복됨.

**원인 (렌더러 버그 아님)**
- `DetailSectionRenderer`는 `section.imageIndex` / `imageIndexes`를 그대로 `imageUrls[i]`에 연결함. 폴백만 `imageUrls[0]`.
- TEST_MODE 누끼(대표 1장)는 **배열에서 원본을 지우지 않음**. 2장 올린 화장품/패션/리빙은 `imageUrls.length === 2`였고, 2번째 URL은 원본 jpg로 남아 있음.
- 실제 원인: DeepSeek가 `image_text`(ingredient/texture 등)에 **같은 인덱스**를 넣고, 프롬프트가 "장수가 적으면 재사용해도 된다"고 허용함. 화장품 이전 세션은 hero·ingredient·texture가 전부 `1`.
- 전자기기는 테스트 세트가 로고 없는 이어버드 **1장뿐**이라 매핑할 원본이 없음 (`imageUrls.length === 1`).

**수정**
- 히어로 인덱스는 유지 (의도적 대표 컷).
- `image_text` / 갤러리 / 컬러 옵션은 원본이 2장 이상이면 서버에서 순환 배정 (`lib/assign-section-images.ts`).
- DeepSeek 프롬프트: POINT 슬롯은 서로 다른 인덱스, 갤러리는 중복 없이, 히어로 컷은 갤러리 한 장만 허용.
- TEST_MODE 누끼 스킵은 유지 + 로그 (`원본 n 유지`). 배경/화질 축소는 그대로.

**검증 (같은 화장품 2장 세트, TEST_MODE 1회)**
- 로그: `hero:1 ingredient_highlight:0 texture_feel:1 gallery:[1,0] (imageCount=2)`
- 스크린샷: `review/attempt-화장품-뷰티-distinct-images.png`, `review/iteration/화장품-뷰티-image-fix/cycle-01.png`
- POINT 01 = 펌프/미러 컷(0, enhanced), POINT 02 = 크림 자(1, 원본). 갤러리는 두 장 모두.
- 비용: claude 캐시 히트 $0 + backdrop $0.0030 + enhance $0.0005 + deepSeek $0.0024 + brief $0.0002 → **total $0.0061**

원본이 1장이면 반복은 구조상 남음. 전자 액세서리는 두 번째 무브랜드 스톡을 넣어야 갈라짐.

---

## 카테고리별 생성 + 레이아웃 루프 (2026-08-17)

TEST_MODE=true, BASE_URL 3001. 카테고리당 파이프라인 **1회**, 이후 `session.json` 재로드로 레이아웃만 반복.

| 카테고리 | 상품 | 사이클 | 최종 평균 | 조기 종료 |
|----------|------|--------|-----------|-----------|
| 화장품-뷰티 | 무향 크림 모이스처라이저 ₩32,900 | 5 | **4.60** | C5에서 >4.5 |
| 패션-소품 | 미니멀 골드 네크리스 ₩59,000 | 6 | **4.52** | C5 4.48 → C6 |
| 리빙-소품 | 핸드메이드 소이 캔들 ₩24,900 | 5 | **4.58** | C5에서 >4.5 |
| 전자기기-액세서리 | 무선 이어버드 ₩59,000 | 6 | **4.54** | C5 4.48 → C6 |

스크린샷: `review/iteration/<카테고리>/cycle-NN.png`  
채점: `review/quality-log.md`  
이미지: Pexels only, `review/photo-sources-category-loop.json`

**카테고리별 메모**
- 화장품: 공유 렌더러 기준선이 이미 높음. 히어로 호흡·USP 간격·CTA 폭만 다듬음. 갤러리 2번 컷은 펌프 보틀(다른 소품).
- 패션: 히어로가 선글라스 카페 컷. flux-schnell NSFW로 배경 실패 → 원본 스톡 유지. C6에서 USP 2열이 점수 올림.
- 리빙: 2열 USP + 넉넉한 여백이 카테고리 톤에 맞음.
- 전자: 사진 1장(로고 없는 이어버드)만 써서 POINT가 반복. C6 USP 2열로 긴 캡션 해소. 브랜드 헤드폰/마우스는 폐기.

**이번 작업 비용 (생성 4회, 레이아웃 사이클 $0)**

라인 아이템 합계 **$0.0651** (패션 product total은 backdrop 실패를 $0으로 집계해 $0.0101 — 실제 Replicate $0.0030 + brief $0.0002는 청구됨).

| 서비스 | 항목 | USD |
|--------|------|-----|
| Anthropic Claude Haiku 4.5 | imageAnalysis 4회 | $0.0409 |
| DeepSeek | conceptBrief 4회 + 카피 4회 | $0.0047 |
| Replicate flux-schnell | backdrop ×4 ($0.0030, 패션은 실패 후 원본 사용) | $0.0120 |
| Replicate | enhance/누끼 ×3 (패션 스킵) | $0.0015 |
| Replicate flux-schnell | concept icons ×2 (뷰티 0, 패션 0, 리빙·전자 각 1) | $0.0060 |
| Pexels | 스톡 다운로드 | $0 |
| 레이아웃 사이클 2–6 | 세션 재로드만 | $0 |
| **합계** | | **$0.0651** |

상품별 product total 로그: 뷰티 $0.0167 / 패션 $0.0101(과소) / 리빙 $0.0182 / 전자 $0.0169.

캐시: 카테고리마다 새 사진 → Claude 분석 미스. 같은 파일 재생성 시 `.cache/image-analysis/` 히트 예상.

---

## 전체 요약 (2026-08-16 무감독 런)

**완료**
- `/create/result`·`/dev/detail-preview` 수정 도구를 **직접 편집 / 원클릭 업로드 / AI 자동 생성 3탭**으로 고정 노출. 스크롤해도 보이도록 sticky.
- 직접 편집: 히어로·체크리스트·POINT·사용법·주의·스펙 표 인라인 수정, 저장 토스트, 실패 시 에러 토스트.
- 원클릭 업로드: JPG/PNG·8MB 가드, 미리보기 즉시 반영, 모바일에서도 보이는 "이미지 교체" 뱃지.
- AI 자동 생성: 빈 textarea면 fetch 없이 안내. Playwright에서 가드 확인.
- 랜딩: 스크롤 fade/slide, 파이프라인 카드 미세 플로트, 카드 호버. 새 색/장식 없음. `prefers-reduced-motion` 존중.
- 상세 히어로: 기존 사진에 ken-burns만. 다운로드를 가리지 않으려고 상세에는 opacity reveal 미적용.
- 레퍼런스 연습 6사이클 후 조기 종료 (quality-log.md). 이미지 재생성·QA API 없음.

**⚠️ 미해결 / 확인 필요**
- 최종 승인 후 1회 실호출은 완료. 다만 QA에서 `label_clip` critical 1건(이미지 1 라벨 상단 절단) 남음.
- `/create/result`는 sessionStorage가 있어야 해서 Playwright는 프리뷰만 클릭 검증.
- 스마트스토어 네이버 API 연동 없음. 업로드는 상세 이미지 교체.
- 후기/인증/네이비 솔리드 밴드는 슬롯·토큰 밖이라 재현하지 않음.
- 장식 그래픽은 1회 503으로 실패 후 배경-only 폴백되어 decor 비용 0으로 집계됨.

**다음에 확인할 3가지**
1. 실제 생성본 `/create/result`에서 3탭이 기대한 UX인지 (세션 필요).
2. 도매 텍스트를 채운 AI 재생성 1회만 과금 감수하고 볼지.
3. 랜딩 모션이 너무 조용한지 / 줄일지 (`prefers-reduced-motion` 포함).

---

## 시간순 기록

### 레이아웃 반복 루프 (2026-08-17)

- 이미지 재생성 없음. `/dev/detail-preview` + 화장품 테스트 사진 복사만.
- 6사이클 후 평균 **4.62**로 조기 종료 (목표 4.6 초과).
- 스크린샷: `review/iteration/cycle-01.png` ~ `cycle-06.png`
- 상세: `review/quality-log.md`

**비용 (반복 루프 6사이클)**
- 실제 API 호출: **없음**. Claude / DeepSeek / Replicate **$0**.
- `.cache/image-analysis/` 조회도 없음 (`/api/generate` 미호출).
- 캐시 없었으면(사이클마다 TEST_MODE 파이프라인 재실행): 6 × $0.0196 = **$0.1176**.
  - 그중 Claude Haiku 분석 6 × $0.0107 = $0.0642가 캐시로 막을 수 있던 금액.
- 실제 vs 직전 TEST_MODE 첫 실행 $0.0196: **100% 절감** ($0.0196 → $0).
- 사이클당 평균 비용: $0 / 6 = **$0**.

---

- 브랜치 `merge-pagelab-work` (main 손대지 않음). working tree 깨끗.
- 이전 런의 버튼은 있었으나 탭이 아니고, 이미지 교체가 hover-only라 모바일에서 안 보임 → 탭 + 상시 뱃지로 가기로 함.
- 상세 opacity 스크롤 애니메이션은 `html-to-image` 다운로드를 가릴 수 있어 **랜딩만** 적용.

### 1순위 — 결과 수정 탭

- `DetailActionBar`를 3탭 패널로 재구성. 결과/프리뷰 공통.
- 편집 탭 진입 시 편집 모드 ON. 스펙 표도 인라인 수정.
- 업로드 탭: 교체할 사진 번호 선택 + 8MB/형식 메시지.
- AI 탭: 빈 입력이면 API 호출 없음 (가드 유지).
- Playwright `scripts/test-action-bar.ts`: saveToast / emptyGuard / typeError / sizeError / hadInput 전부 true.

### 2순위 — 역동성

- `RevealOnScroll` + `globals.css` ken-burns/float. 브랜드 토큰 색만 사용.
- 프로세스/기능/요금 카드 `hover:-translate-y-1`. CTA `active:scale-[0.98]`.

### 3순위 — 레퍼런스 연습

- Cycle 2–4: POINT/히어로 라벨 mono, 사용법 간격, 갤러리 제목–사진 밀착, CTA 자간.
- Cycle 5–6: 무변경. 후기·솔리드 밴드는 §9 금이라 중단.
- 평균 4.45. 풀 옵션 재생성 스킵.

### TEST_MODE Haiku 비용 절감 런 (2026-08-17)

- 변경: imageAnalysis를 TEST_MODE에서 `claude-haiku-4-5` + 대표 2장, 원본 파일명+크기 캐시(`.cache/image-analysis/`, gitignore), 아이콘 1장
- 실행: `capture-detail-page.ts test-mode-haiku` / BASE_URL 3001
- 스크린샷: `review/attempt-화장품-뷰티-test-mode-haiku.png`
- 캐시: 이번 런은 미스(첫 적재). 같은 테스트 사진 재실행 시 Claude $0 예상

**성공 런 `[cost]`**
- conceptBrief: $0.0002
- backdrop (flux-schnell ×1): $0.0030
- enhance / 누끼 ×1: $0.0005
- decor: $0
- icons: 1/1, $0.0030
- deepSeek: $0.0023
- claude imageAnalysis (Haiku, 2장): $0.0107
- **total: $0.0196**

**절감**
- 직전 TEST_MODE $0.0471 → $0.0196 (**58.4%**)
- 풀 파이프라인 $0.1446 → $0.0196 (**86.4%**)
- Claude만: $0.0381 → $0.0107 (**71.9%**)

로그: `[image-analysis] TEST_MODE — claude-haiku-4-5-20251001로 대표 이미지 2장만 분석`, `[concept-icons] TEST_MODE — 아이콘 1장만 생성`

---

### TEST_MODE 실호출 (2026-08-17)

- `.env.local`: `TEST_MODE=true` 확인 (기존 설정 유지)
- dev server: PID 30636 종료 후 `npm run dev -p 3001` 재시작
- 실행: `BASE_URL=http://localhost:3001 npx tsx scripts/capture-detail-page.ts test-mode 화장품-뷰티 "TEST MODE 수분크림" 29900`
- 스크린샷: `review/attempt-화장품-뷰티-test-mode.png` — **TEST MODE 배지** 상단 노출 확인
- 소요: 성공 런 약 2분 24초 (Playwright)

**1차 시도 실패 (generate 단계)**
- DeepSeek가 `reasoning_content`에 JSON을 넣으면서 제어문자/따옴표 오류 → `JSON.parse` 실패 (500)
- 이미 소비된 비용: conceptBrief $0.0002 + backdrop $0.0030 + enhance $0.00047 + claude imageAnalysis $0.0381 + deepSeek $0.0008 ≈ **$0.0424** (결과물 없음)
- 조치: `parseDeepSeekCopyJson()` 헬퍼 추가 후 **2차 시도 성공**

**2차 시도 (성공) — 서버 `[cost]` 로그**
- conceptBrief: $0.0002
- backdrop (flux-schnell ×1): $0.0030
- enhance / 누끼 ×1 (clarity-upscaler 생략): $0.0005
- decor: $0 (TEST_MODE 스킵)
- icons: 2장 요청, 1장 성공 (1장 Replicate 503), $0.0030
- deepSeek 카피: $0.0024 (QA 재시도 없음)
- claude: $0.0381 (Sonnet imageAnalysis 1회만; QA·Haiku 비전 전부 스킵)
- **total: $0.0471**

**TEST_MODE 스킵 확인 로그**
- `[shadow] TEST_MODE — 그림자 분석(Haiku) 스킵`
- `[safeCrop] TEST_MODE — 텍스트 영역 감지(Haiku) 스킵`
- `[cost] sharpenCutout: TEST_MODE — clarity-upscaler 생략`
- `[decor] TEST_MODE — 장식 그래픽 생성 생략`
- `[qa] QA 스킵됨 (TEST_MODE)`
- `[concept-icons] TEST_MODE — 아이콘 2장만 생성`

**풀 파이프라인($0.1446) 대비**
- 절감: **$0.0975 (약 67.4%)**
- 참고: 이전 $0.1446에는 Claude 비용이 미포함이었음. 이번 TEST_MODE total $0.0471에는 Claude $0.0381 포함.

**미해결**
- concept-icons 1/2 Replicate 503 (폴백 빈 슬롯, 파이프라인은 완료)

---

- 실행: `scripts/capture-detail-page.ts`로 `/create` 자동 제출 (BASE_URL 3001, wholesale 텍스트 포함)
- 결과: `review/attempt-화장품-뷰티-final-approved-2.png` 저장 로그 확인
- 비용 로그:
  - `generateConceptBrief: $0.0001`
  - `generateBackdrop (flux-fill-dev x3): $0.0750`
  - `enhanceProductImage x3: $0.01647`씩 (총 enhance 약 $0.0494)
  - `generateConceptIcons (6/6): $0.0180`
  - `deepSeek total: $0.0021` (재생성 1회 포함)
  - `total: $0.1446`
- QA: `label_clip#img1` critical 1건으로 남음(라벨 상단 절단). 카피 길이 관련 경고 몇 건.
- 안정화 수정: DeepSeek가 `content` 대신 `reasoning_content`에 JSON을 줄 때도 파싱하도록 `/api/generate` 보완.

---

### 캐시 무효화(FORCE_REGENERATE) 구현 + 실비용 검증 (2026-08-18)

**배경:** 조명/합성/배경 다양화 지시를 내렸는데 결과 이미지가 이전과 동일해 보였던 문제. 캐시 재사용(비용 $0)으로 실제로는 재생성이 안 됐을 가능성 의심 → 캐시 확인 후 강제 재생성 지시.

**구현**
- `lib/force-regenerate.ts` 신규: `isForceRegenerate()` — `.env.local`의 `FORCE_REGENERATE=true` 여부로 디스크 캐시 무시 여부 결정.
- `lib/section-backdrop-cache.ts` 신규: TEST_MODE 섹션 배경(성분/텍스처) 디스크 캐시 read/write.
- 배선 확인:
  - `app/api/generate/route.ts` — `cached && !isForceRegenerate()`일 때만 이미지 분석 캐시 사용, `FORCE_REGENERATE=true`면 Claude 재분석.
  - `app/api/section-backdrops/route.ts` — `isTestMode() && !isForceRegenerate()`일 때만 `.cache/section-backdrops/` 사용, `FORCE_REGENERATE=true`면 flux-schnell 재생성 후 캐시 갱신.
  - `app/api/generate-backdrop/route.ts` — `logForceRegenerateStatus()`로 상태 로그만 출력.

**검증 실행 (TEST_MODE=false, 풀 파이프라인 실비용)**
- 실행 시각: 2026-08-18T01:50:49Z (`session-after.json` `createdAt`)
- 결과 저장: `review/before-after-fix/before-result.png`, `after-result.png`, `compare-side-by-side.png`, `session-after.json`
- **비교 결과:** before(파란 톤 단일 히어로, 페이지 길이 5933px)와 after(따뜻한 우드톤/창가 광원 히어로, 섹션 확장, 페이지 길이 8786px)가 배경·구도·카피 전부 다름 육안 확인. 캐시 재사용 아님.
- **비용 (`session-after.json.photoCostBreakdown`):** `testMode: false`, `photoProcessingCost ≈ $0.1337`
  - conceptBrief $0.00026 / backdrop $0.0750 / claude(imageAnalysis) $0.0583 / sectionBackdrops $0.006 / enhance $0.0494 / decor $0.003 / icons $0.018 / effects $0.006
  - QA: `qaSummary` = "PASS (5 warning)"

**미해결 / 다음에 확인할 것**
- 이번 검증은 `TEST_MODE=false`(실비용) 직접 실행으로 확인한 것 — `TEST_MODE=true` + `FORCE_REGENERATE=true` 조합(저비용 캐시 우회)은 아직 별도로 검증 안 됨. 평소 테스트 절감 흐름에서도 캐시 무효화가 제대로 도는지 저비용으로 한 번 더 확인 필요.
- GitHub 확인 결과 `merge-pagelab-work` 브랜치가 `main`보다 1커밋(`8c13874: finalize paid generation pass with robust DeepSeek parsing`) 앞서 있고 아직 main에 병합 안 됨. 이번 force-regenerate 관련 변경(`lib/force-regenerate.ts`, `lib/section-backdrop-cache.ts`, `app/api/generate/route.ts`, `app/api/section-backdrops/route.ts` 수정분 포함)은 로컬에만 있고 커밋/푸시 여부 미확인 — git status 확인 후 커밋 + 푸시 필요.
