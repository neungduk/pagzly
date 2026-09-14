# 168차 — 픽스처 오염 제거 + living 실사 1건

생성: 2026-09-14

## 요약

| 트랙 | 결과 |
|------|------|
| A 픽스처 오염 | **원인 제거 완료** — `BEAUTY_SESSION` 클론 시 keyFeatures 미치환 |
| B living 실사 1건 | **성공** — tradeoff/stat/chart 채움, canvas-overflow **미재현** |
| tsc | **EXIT 0** |

---

## 트랙 A — 오염 원인

### 원인
`scripts/139cha-regression-qa.ts`의 `buildFashionSession` / `buildFoodSession` / `buildLivingSession`이  
`cloneSession(BEAUTY_SESSION)` 후 **category·productName만** 바꾸고  
top-level `keyFeatures` / `ingredients` / `certifications` / `targetCustomer`를 그대로 둠.

### 수정
1. 스크립트: `applyCategoryProductFields()`로 카테고리별 상품 텍스트 강제 치환
2. 기존 JSON: `scripts/168cha-patch-139-fixtures.ts`로 fashion/food/living 패치
3. 분석기: `scripts/167cha-analyze-sessions.ts` — 클론 섹션 vs 오염 입력 구분

### 재분석 표 (`npx tsx scripts/167cha-analyze-sessions.ts`)

| id | beauty오염 | 수치입력 | stat | chart | tradeoff | 판정 |
|----|------------|----------|------|-------|----------|------|
| cosmetics-review | — | 약함 | × | ✅ | — | chart 채움 (뷰티 정상) |
| cosmetics-noreview | — | 약함 | × | × | — | 입력 약 → omit 가능 |
| **food** | **cleared** | ✅ | ×* | ×* | — | *섹션은 뷰티 클론(렌더 QA용) — 활성화율 측정 대상 아님 |
| **fashion** | **cleared** | ✅ | ×* | ×* | — | 동일 |
| **living** | **cleared** | ✅ +추천문구 | ×* | ×* | ×* | 동일 — 실측은 Track B |
| electronics | — | ✅ | ✅ | × | — | stat 정상; chart는 구버전 생성물(166 프롬프트 이전) |

**결론:** 오염(**a** 입력 기근의 가짜 신호) 제거. food/fashion/living 139 픽스처의 섹션 트리는 여전히 뷰티 클론이라 optional 슬롯 채움률은 **라이브 생성으로만** 판정 — Track B가 그 역할.

로직 버그(**b**) 추가 수정 없음 (note는 166/167에서 이미 강화됨).

---

## 트랙 B — living 실사 1건

### 입력
- 카테고리: 생활용품
- 상품: 플레인 세라믹 머그 350 / PLAIN HOME / ₩24,000
- 사진: 제품 8장 + 손 라이프스타일 1장 (Pexels)
- `productHeightCm`: **9.5**
- keyFeatures: 내열·용량·무게 + **이런 분께 추천 / 확인 후 구매** 문구

### 결과
| 항목 | 결과 |
|------|------|
| tradeoff_card | **채움** recommendFor 3 / considerIf 3 (입력과 정합) |
| stat_infographic | **채움** |
| comparison_chart | **채움** |
| canvas-overflow | **미검출** (`lifestyleFail=false`, session에 overflow 문자열 없음) |
| lifestyle-composite API | `productHeightCm=9.5`로 POST 확인 (브라우저 로그) |
| 비용 | generation **~$0.693** (photo ~$0.251 포함) |

### 산출물
- `review/168cha-live-living/session.json`
- `review/168cha-live-living/analysis.json`
- `03-tradeoff-region.png` / `04-lifestyle-region.png` / `02-result-full.png`
- 스크립트: `scripts/168cha-live-living.ts`

### 결론
167차 클램프 수정은 실사에서 **예외 재현 없음**. tradeoff_card는 추천/유의 입력이 있으면 **정상 채움**.

---

## 169차 후보
1. electronics chart 구세션 재생성 1회로 166 프롬프트 효과 확인
2. lifestyle `composited` 결과를 session에 명시 저장해 QA가 성공/폴백을 바로 집계
3. 139 클론 픽스처를 카테고리 네이티브 섹션 트리로 교체(장기)
