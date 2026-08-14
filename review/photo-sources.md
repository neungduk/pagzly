# Photo Sources — Gallery Showcase

갤러리 섹션(`ShowcaseSection.tsx`) 예시 상세페이지 생성에 사용한
스톡 사진 출처입니다. **Pexels** 라이선스(무료, 상업적 이용 가능, 출처 표기
불필요)만 사용했습니다.

생성 일: 2026-08-14

---

## 생성에 실제 사용된 사진 (카테고리당 3장)

`capture-detail-page.ts`가 각 폴더에서 **앞 3장**을 업로드했습니다.

### 화장품/뷰티 — 히알루론 수분 크림 (₩32,900)

| 파일 | Pexels ID | Photographer | URL |
|------|-----------|--------------|-----|
| `01-pexels-16008945.jpeg` | 16008945 | by Natallia | https://www.pexels.com/photo/creams-in-bottles-with-pumps-standing-on-a-mirror-and-on-yellow-background-16008945/ |
| `02-pexels-10897819.jpeg` | 10897819 | Mathilde Langevin | https://www.pexels.com/photo/cream-tube-on-white-background-10897819/ |
| `03-pexels-6800936.jpeg` | 6800936 | Artem Podrez | https://www.pexels.com/photo/a-cosmetic-product-over-a-box-6800936/ |

결과 스크린샷: `review/attempt-화장품-뷰티-1.png` → `public/showcase/cosmetics-*.png`

### 의류/패션 — 린넨 오버핏 셔츠 (₩45,900)

| 파일 | Pexels ID | Photographer | URL |
|------|-----------|--------------|-----|
| `01-pexels-8408556.jpeg` | 8408556 | Sarah Dorweiler | https://www.pexels.com/photo/clothes-and-a-boot-on-white-surface-8408556/ |
| `02-pexels-1107604.jpeg` | 1107604 | Lisa Fotios | https://www.pexels.com/photo/women-s-white-spaghetti-strap-top-and-brown-pumps-1107604/ |
| `03-pexels-35625406.jpeg` | 35625406 | Joint X | https://www.pexels.com/photo/black-t-shirts-on-rack-in-studio-setting-35625406/ |

결과 스크린샷: `review/attempt-의류-패션-1.png` → `public/showcase/fashion-*.png`

### 식품/건강기능식품 — 단백질 쉐이크 바닐라 (₩24,900)

| 파일 | Pexels ID | Photographer | URL |
|------|-----------|--------------|-----|
| `01-pexels-27939228.jpeg` | 27939228 | Allen Boguslavsky | https://www.pexels.com/photo/27939228/ |
| `02-pexels-18925020.jpeg` | 18925020 | Sulav Jung Hamal | https://www.pexels.com/photo/18925020/ |
| `03-pexels-16513595.jpeg` | 16513595 | Anete Lusina | https://www.pexels.com/photo/16513595/ |

결과 스크린샷: `review/attempt-식품-1.png` → `public/showcase/food-*.png`

### 전자제품 — 노이즈캔슬링 무선 이어폰 (₩129,000)

| 파일 | Pexels ID | Photographer | URL |
|------|-----------|--------------|-----|
| `01-pexels-10104890.jpeg` | 10104890 | I'm Zion | https://www.pexels.com/photo/10104890/ |
| `02-pexels-33936400.jpeg` | 33936400 | mohammad mohebbi | https://www.pexels.com/photo/33936400/ |
| `03-pexels-14541068.jpeg` | 14541068 | Alan Quirván | https://www.pexels.com/photo/14541068/ |

결과 스크린샷: `review/attempt-전자제품-2.png` → `public/showcase/electronics-*.png`

### 생활용품 — USB 캠핑 랜턴 (₩27,900)

| 파일 | Pexels ID | Photographer | URL |
|------|-----------|--------------|-----|
| `01-pexels-4202326.jpeg` | 4202326 | kaboompics.com | https://www.pexels.com/photo/4202326/ |
| `02-pexels-7796691.jpeg` | 7796691 | Alesia Kozik | https://www.pexels.com/photo/7796691/ |
| `03-pexels-12663430.jpeg` | 12663430 | Amar Preciado | https://www.pexels.com/photo/12663430/ |

결과 스크린샷: `review/attempt-생활용품-1.png` → `public/showcase/lifestyle-*.png`

> 생활용품 1차 캡처는 5장 업로드(타임아웃 전 배치)로 실행되었을 수 있습니다.
> 2차 이후 캡처는 3장 제한으로 통일했습니다.

---

## 다운로드 전체 목록 (29장)

전체 manifest: `review/photo-sources.json`  
다운로드 스크립트: `scripts/download-pexels-assets.ts`

| 카테고리 폴더 | 장수 | 검색 쿼리 |
|---------------|------|-----------|
| `scripts/test-assets/화장품-뷰티/` | 6 | skincare cream product, cosmetic serum bottle, beauty product flat lay |
| `scripts/test-assets/의류-패션/` | 6 | clothing flat lay, shirt product photo, fashion apparel isolated |
| `scripts/test-assets/식품/` | 5 | packaged food product, protein shake bottle, snack food packaging |
| `scripts/test-assets/전자제품/` | 6 | wireless earbuds product, electronics gadget white background, smart speaker product |
| `scripts/test-assets/생활용품/` | 6 | home decor product, candle product photo, kitchen utensil product |

---

## CHECKLIST 판정 (2026-08-14)

| 카테고리 | 스크린샷 | 판정 | 비고 |
|----------|----------|------|------|
| 화장품/뷰티 | attempt-화장품-뷰티-1 | **PASS** | 노란 제품 톤 반영, 8+ 섹션, ₩32,900 |
| 의류/패션 | attempt-의류-패션-1 | **PASS** | 베이지/브라운 톤, 8+ 섹션, ₩45,900 |
| 식품 | attempt-식품-1 | **PASS** | 과장 표현 없음, 8+ 섹션, ₩24,900 |
| 전자제품 | attempt-전자제품-2 | **PASS** | 블루 톤 반영, 8+ 섹션, ₩129,000 |
| 생활용품 | attempt-생활용품-1 | **PASS** | 웜톤 배경, 8+ 섹션, ₩27,900 |

---

## Pexels API

- 발급: https://www.pexels.com/api/
- 환경변수: `.env.local` → `PEXELS_API_KEY`
- 라이선스: https://www.pexels.com/license/
