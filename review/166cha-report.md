# 166차 — 인포그래픽·이미지·배치 3트랙 (사용량 최소화)

생성: 2026-09-14  
원칙: 트랙당 1항목, 기존 데이터 우선, 신규 생성 최소화. `assignDistinctSectionImages` / `backdropAlreadyComposited` 미수정.

## 요약

| 트랙 | 진단 | 조치 | 신규 생성 |
|------|------|------|-----------|
| A comparison_chart 갭 | **(a) 입력·프롬프트 비대칭** (로직 버그 아님) | 식품/전자 슬롯 note + length guide + route 프롬프트 명확화 | **0회** |
| B BRIA/스튜디오 한도 | 후보 다양성 필요 / 스튜디오는 이미 8 | **BRIA 2→4 결정·적용**, 스튜디오 **8 유지** | **0회** (144 보드 재사용) |
| C 갤러리·색면 리듬 | 갤러리=(a) 장수/구도, 색면=**스타일취향** | 업로드·희소 사진 안내 문구만 | **0회** |

`npx tsc --noEmit` → **EXIT 0**

---

## 트랙 A — comparison_chart 카테고리 활성화

### 확인한 파일
- `lib/section-templates.ts` (슬롯·`buildSectionLengthGuide`)
- `app/api/generate/route.ts` (comparison_chart 지시, review-axis 삽입)
- `lib/comparison-chart-guard.ts` — **미수정** (가드 정상)
- 기존 세션: `review/139cha-session-*.json` (`scripts/166cha-analyze-sessions.ts`)

### products 테이블
- MCP 연결 프로젝트가 Pagzly 앱 DB(`sblnth…`)가 아님 → SQL 집계 **불가**. 로컬 세션으로 대체.

### 기존 데이터 결과

| 케이스 | chart | 비고 |
|--------|-------|------|
| cosmetics-review | **있음** | ingredients 있음, reviewInsights 없음 → AI 채움 |
| cosmetics-noreview | 없음 | **동일 ingredients**인데 생략 → 확률적 미채움 |
| electronics (`testMode:false`) | 없음 | ANC 42dB·배터리·IPX5 등 **풍부 입력인데도 미채움** |
| food / fashion / living | 없음 | keyFeatures가 뷰티 문구로 오염 → **입력 기근(a)** |
| fashion/pet/home 슬롯 | 161차에 이미 추가됨 | 160차 “정책 갭”은 해소 |

### 진단
- **sanitize/가드 버그 아님 (b 아님).**
- **(a)** 카테고리별 프롬프트 비대칭: 뷰티만 “ingredients 있으면 생략 금지”, 식품·전자 length guide에 chart 규율 부재, 전자는 `comparison_table`만 강조.
- electronics 풍부 입력+미채움 → 신규 재생성 없이 **프롬프트 명확화로 충분** 판단 (usage 절약).

### 수정 (diff 요약)
- FOOD/ELECTRONICS `comparison_chart` slot `note` — “근거 있으면 적극 채움”
- `buildSectionLengthGuide` 식품·전자 절에 chart 한 줄씩
- `route.ts` 생성 프롬프트: 식품/전자/패션/펫/생활도 근거 있으면 생략 금지

### 생성 횟수 / 비용
- **0회 / $0**

---

## 트랙 B — BRIA 후보 / 스튜디오 한도

### 확인한 파일
- `lib/photo-enhance.ts` `getBriaBackdropCandidateCount` (프리미엄 상한 4, env 없을 때 기본 4)
- `lib/lifestyle-shot-planner.ts` `computeStudioCompositeLimit` (프리미엄·≥8장 → **이미 8**)
- `lib/premium-mode.ts`
- `.env.local` (변경 전 `BRIA_BACKDROP_CANDIDATES=2`, `PREMIUM_QUALITY_MODE=true`)
- `review/qa-screenshots/144cha-backdrop-candidates-2v4.png`
- `review/qa-screenshots/144cha-studio-composite-4v8.png`
- `claude/pagzly-pricing-cost-model-2026.md` §1·§8

### 신규 생성
- **0회.** 144차 나란히 보드가 동일 화장품(화장품) n=2 vs n=4·스튜디오 4 vs 8을 이미 시각화.
- 162~165 보정(화이트밸런스·선명도·디프린지)은 **선택된 컷의 합성 품질**만 개선 — **후보 선택지 폭과는 직교.**

### 결정

| 레버 | 결정 | 사유 |
|------|------|------|
| `BRIA_BACKDROP_CANDIDATES` | **2 → 4** | n=4가 쿨그레이/웜베이지/브라이트화이트 등 톤 선택폭이 실질적. 픽커 UI는 이미 다수 후보 대응 |
| `computeStudioCompositeLimit` | **8 유지** (추가 변경 없음) | 프리미엄 ON 시 ≥8장에서 이미 8. 144 보드상 idx4–7 COMP 밀도 이득 확인됨 |

### 원가 영향 (₩, $1=₩1,377)
- 배경: $0.08(2회) → **$0.16(4회)** = **+$0.08 ≈ +₩110/건**
- 스튜디오: 프리미엄 경로 이미 8 → **추가 원가 0**
- 설계 기준 원가 ₩250/건 대비: 배경 앵커 정정($0.08) 후에도 여유분 안에서 +₩ 흡수 가능. 요금표 즉시 변경 불필요 (`pagzly-pricing-cost-model-2026.md` §8과 동일 판단).

### 적용
- `.env.local`: `BRIA_BACKDROP_CANDIDATES=4`
- `premium-mode.ts` 주석: 166차 결정 반영

---

## 트랙 C — 갤러리·색면 리듬

### 확인한 파일 / 산출물
- `lib/design-tokens.ts` (`SECTION_PATTERN_CYCLE` A→B→D→E, `THEME_VARIANT_CYCLE`)
- 기존 캡처: `139cha-cosmetics-review-2.png`, `139cha-electronics-2.png` (신규 생성 0)

### 육안
- **갤러리:** 동일 제품 정면 각도 재사용 구간 있음 → **(a) 사진 장수·구도 다양성 부족** (배정 알고리즘 문제 아님).
- **색면:** 연속 3+ 섹션이 밝은 greige로 보이는 구간 있음. 순환 카운터 버그 아님(A/B/D/E는 정상 순환). A/B/D/E가 모두 `baseNeutral` 중심 연한 그라데이션이라 **대비가 약함** → **스타일 취향 / 패턴 대비 부족 (후보)**. 명확 버그 아니므로 순환 로직 미수정.

### 수정
- `CreateProductForm` 업로드 안내: 전면·측면·디테일·사용 장면 구도 권장
- `create/result` sparse 경고: 구도 다른 사진 추가 안내 강화
- `assignDistinctSectionImages` **미수정**

### 생성 횟수 / 비용
- **0회 / $0**

---

## 167차 후보
1. 프롬프트 강화 후 electronics 풍부입력 **1회** 라이브로 chart 채움률 재확인
2. 색면 A/B/D/E 대비(채도/명도)를 키우는 디자인 실험 — 취향 후보
3. BRIA=4 라이브 1건으로 픽커 UX·원가 로그 재앵커
4. food/fashion 세션 픽스처 keyFeatures 오염 정리 (회귀 QA 정확도)
