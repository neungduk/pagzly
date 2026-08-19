# 반복 학습용 테스트 이미지

크롤링 없음. **Pexels API**만 사용.  
라이선스: [Pexels License](https://www.pexels.com/license/) — 무료, **상업적 이용 허용**, 출처 표기 의무 없음(기록은 남김).

## API 키 발급 (이미 있으면 재발급 불필요)

이 저장소 `.env.local`에 `PEXELS_API_KEY`가 있으면 그대로 사용한다.

1. Pexels: https://www.pexels.com/api/ 에서 가입 후 API 키 발급 → `.env.local`에 `PEXELS_API_KEY=...`
2. Unsplash(대안): https://unsplash.com/developers 에서 Access Key 발급 → `UNSPLASH_ACCESS_KEY=...`  
   이번 런은 Pexels만 사용. Unsplash 키는 넣지 않음.

다운로드 스크립트: `scripts/download-test-images.ts`  
캡처는 `loop-01`~`loop-03` 파일을 우선 업로드한다.

## 사용 목록 (로고/워터마크 육안 확인)

| 카테고리 | 파일 | Pexels ID | 촬영 | 확인 |
|----------|------|-----------|------|------|
| 화장품-뷰티 | loop-01-pexels-18350885 | 18350885 | Carlos Diaz | 무라벨 크림 자. 로고 없음 ✓ |
| 화장품-뷰티 | loop-02-pexels-8101529 | 8101529 | Polina | 드로퍼/자. 로고 없음 ✓ |
| 화장품-뷰티 | loop-03-pexels-7233317 | 7233317 | Artem Podrez | 크림 텍스처 매크로. 로고 없음 ✓ |
| 전자기기-액세서리 | loop-01-pexels-35599938 | 35599938 | Ivett M | 이어버드 케이스. 로고 없음 ✓ |
| 전자기기-액세서리 | loop-02-pexels-1279107 | 1279107 | Caio | 패브릭 스피커. 로고 없음 ✓ |
| 전자기기-액세서리 | loop-03-pexels-1643753 | 1643753 | Diana | 무지개 케이블. 로고 없음 ✓ |
| 리빙-소품 | loop-01-pexels-35082703 | 35082703 | giang pham | 세라믹 화병. 로고 없음 ✓ |
| 리빙-소품 | loop-02-pexels-6634662 | 6634662 | Vlada Karpovich | 소이캔들. 제네릭 HAND MADE만, 상업 로고 아님 ✓ |
| 리빙-소품 | loop-03-pexels-35970499 | 35970499 | James Collington | 머그 라이프스타일. 로고 없음 ✓ |

## 화장품 확장 5종류 (2026-08-17)

폴더: `scripts/test-assets/화장품-확장/<종류>/`  
라이선스: Pexels License (상업 이용 허용). 브랜드 카피·모델컷 레퍼런스는 베끼지 않음.

| 종류 | 파일 | Pexels ID | 촬영 | 확인 |
|------|------|-----------|------|------|
| 세럼 | type-01-pexels-8054400 | 8054400 | Ksenia Chernaya | 앰버 드로퍼, 빈 라벨 ✓ |
| 세럼 | type-02-pexels-7006153 | 7006153 | Vie Studio | 앰버 보틀+스포이드, 빈 라벨 ✓ |
| 크림 | type-01-pexels-18350885 | 18350885 | Carlos Diaz | 기존 무라벨 자 재사용 ✓ |
| 크림 | type-02-pexels-8101529 | 8101529 | Polina | 기존 드로퍼/자 재사용 ✓ |
| 크림 | type-03-pexels-7233317 | 7233317 | Artem Podrez | 기존 텍스처 재사용 ✓ |
| 미스트 | type-01-pexels-6167872 | 6167872 | Vie Studio | 스프레이 펌프 3병, 빈 라벨 ✓ |
| 미스트 | type-02-pexels-14482303 | 14482303 | Friné Uribia | 핑크 스프레이, 무라벨 ✓ |
| 클렌저 | type-01-pexels-7630328 | 7630328 | Eva Bronzini | 거품 매크로. 로고 없음 ✓ |
| 클렌저 | type-02-pexels-8217403 | 8217403 | MART PRODUCTION | 앰버 펌프, 빈 라벨 ✓ |
| 마스크팩 | type-01-pexels-8947551 | 8947551 | kaboompics | 코발트 자, 빈 실버 라벨 ✓ |
| 마스크팩 | type-02-pexels-8063829 | 8063829 | ROMAN ODINTSOV | 클레이 텍스처 매크로 ✓ |

폐기: 미스트 37187621 (얼룩제거제 문구), 마스크팩 6925512 (인물+시트마스크).

JSON: `review/test-images.json`, `review/test-images-beauty-expansion.json`

폐기: AUKEY 박스(10104890), SONY/PS VR(5208869), 로고 가방·JBL·Acer 컷.

JSON: `review/test-images.json`
