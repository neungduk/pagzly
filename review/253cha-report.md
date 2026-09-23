# 253차 보고 — 글/사진 배치 이상 증거 수집 (조사만, 코드 미수정)

**결론(먼저):** 247/248차 화장품 레거시 상품을 **현재 코드로 재렌더**해 보면, 사용자가 말한 “글·사진 배치가 정말 이상하다” 수준의 **명확한 회귀(251차 배정 붕괴·레거시 배너 깨짐·클램프 소실)는 재현되지 않았다.**  
코드는 고치지 않았다. 신규 생성도 하지 않았다.

생성: 2026-09-23 · **API generate: 0**

---

## 조사 범위

| 소스 | 내용 |
|------|------|
| `review/247cha-recovered/session.json` | 251차 이전 생성물 (productId `6c3c7d7e-…`) |
| 현재 `buildDetailPageHtml` | 같은 sections/imageUrls로 재export |
| `showcase.html` | 247차 당시 export 비교 |
| `localhost:3000/create/result?id=…` | **타임아웃** (홈·API도 응답 없음 — 서버 행으로 추정). 라이브 미리보기는 이번 라운드에서 확보 실패 → export HTML로 대체 |

캡처는 252차 `screenshotFullPageSafe` 사용 (`fullPage:true` sticky 사각지대 회피).

---

## 스크린샷 목록 (`review/253cha-layout-check/`)

| 파일 | 설명 |
|------|------|
| `01-legacy-export-full.png` | 현재 코드로 레거시 세션 재export 풀페이지 |
| `02-banner.png` | illustration_banner (레거시 AI 일러스트 URL 유지 + 249 스크림) |
| `03-section-with-img-0.png` … `5.png` | 상위 이미지 섹션 샘플 (히어로·퀵포인트 등) |
| `04-original-showcase-full.png` | 247차 원본 showcase 풀페이지 |
| `05-original-showcase-banner.png` | 원본 배너 (스크림 없음 — 249 이전 export) |
| `strip-hero.png` / `strip-mid.png` / `strip-lower.png` / `strip-tail.png` | 풀페이지 구간 크롭 |
| `legacy-session-current-export.html` | 재export HTML |
| `findings.json` | 자동 판정 로그 |

---

## 섹션별 판정표 (화장품 레거시 1건)

| 섹션 | 상태 | 구체 내용 |
|------|------|-----------|
| hero `idx=0` | 정상 | 제품 병·물방울 컷 + 헤드라인 매칭 |
| image_text quick_points (4/6/7) | 정상 | 서로 다른 인덱스, 드롭퍼/제형 컷과 카피 대체로 일치 |
| image_text feature_callout / ingredient_highlight / texture_feel | 정상 | 인덱스 중복 없음 (`dups among image_text []`) |
| image_text packaging / customer_scenario | 정상 | 별도 인덱스 |
| image_text how_it_works / size_options | 정보 | `layout: text_only` (사진 없음 — 의도적) |
| illustration_banner | 정상(하위호환) | `illustrationUrl` 있음, `imageIndex` 없음 → **AI 일러스트 URL 그대로** 렌더 (실사진으로 잘못 치환되지 않음) |
| 249 스크림/`line-clamp-2` | 정상 | export·실측 `webkitLineClamp=2`, 다크 패널 존재 |
| 배너 body 줄바꿈 | 주의(경미) | 마지막 어절만 2번째 줄로 떨어지는 orphan 줄바꿈 — **251 이전 카피 길이 이슈**, 배정 버그 아님 |
| hero↔image_text↔banner 인덱스 충돌 | 정상 | 배너는 URL 경로라 사진 풀과 비경쟁; image_text끼리 중복 없음 |
| cta_price | (데이터) 정상 | 세션에 price/배지 존재. 이번 샷은 sticky 안전 캡처로 꼬리까지 확보 |
| shipping_info 표 | 주의(레거시 데이터) | 풀페이지 꼬리에 **6행 중복** 그대로 보임 — 249차 `mergeSpecRows` 수정은 **신규 generate 시**만 적용. 이미 저장된 rows는 enrich를 다시 안 탐. **251과 무관** |

---

## 251차와의 연관 (원인 후보만 — 수정 안 함)

1. **result/미리보기 로드 경로에는 `assignDistinctSectionImages` 호출이 없다** (`app/create/result` grep 0). 저장된 인덱스가 다시 열 때 흔들리지 않는 구조.
2. **시뮬레이션만** 돌리면(`assignDistinctSectionImages` 재실행) image_text 인덱스 **5건 drift** + banner에 `imageIndex`가 새로 붙을 수 있음. 다만 `illustrationUrl`은 유지되어 렌더는 여전히 레거시 일러스트 우선. → “재생성/재배정 API를 다시 탄 경우”에만 사진 배치가 바뀔 후보.
3. 이번 레거시 재렌더만으로는 **251차가 레이아웃을 깨뜨린 증거 없음.**
4. 사용자 증상이 **신규 생성(실사진 배너 + uniqueAmongImageText 공유) 전용**이라면, 이 레거시 자산만으로는 재현 불가 → **신규 생성 1건(또는 카테고리별 N건) 허가 여부 사용자 확인 필요.** 임의 실행하지 않음.

---

## null 결과 요약

- “글/사진이 정말 이상하다” → **이 화장품 레거시 1건의 현재 렌더에서는 치명적 이상 미재현.**
- 남은 가능성: (a) 다른 카테고리/다른 상품, (b) 251 이후 **새로 생성**된 페이지만의 증상, (c) 라이브 편집 UI만의 이슈(서버 타임아웃으로 미확인), (d) 주관적/일시적 표시.

---

## API / 다음 액션

**generate: 0**

신규 생성이 필요해 보이면 Claude가 사용자에게 **정확한 건수·카테고리**를 확인한 뒤 허가를 받아 진행할 것. 이번 라운드에서 코드 수정·재생성 없음.
