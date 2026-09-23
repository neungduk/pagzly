# 181차 — 174~180 반영 후 4축 재벤치마크 + comparison_chart 갭 정리

생성: 2026-09-15  
방법론: 160차 4축 (레이아웃 / 타이포·여백 / 이미지 합성 / 정보 위계) · 격차 = **버그 | 취향 | 입력 부족** 만

## 요약

| 트랙 | 결과 |
|------|------|
| A 6카테고리 실생성 | **완료** — chart 6/6, 판매자급 텍스트 입력 |
| A Behance 레퍼런스 | 카테고리 겹침 1~2건 캡처 (일부 포트폴리오 intro만 잡힘 → 한계 명시) |
| A 4축 격차 | 아이콘/elevation/radius 버그층은 174~180으로 해소. 남은 갭은 **취향·입력** 위주 |
| A 이번 라운드 버그 픽스 | **제품 코드 변경 없음**. 자동화만 `이대로 최종 생성` 클릭 보강 |
| B comparison_chart | **이미 6/6** (161차 이후 유지) — 추가 스키마 불필요 |
| `npx tsc --noEmit` | **0** |

---

## 트랙 B — comparison_chart 커버리지

### 코드 확인 (가정 금지 · grep)

`scripts/181cha-comparison-coverage.ts` + `lib/section-templates.ts`:

| 폼 카테고리 | 템플릿 | slot |
|-------------|--------|------|
| 화장품/뷰티 | 화장품/뷰티 | ✅ |
| 의류/패션 | 패션/의류 | ✅ |
| 식품/건강기능식품 | 식품 | ✅ |
| 전자제품 | 전자/가전 | ✅ |
| 생활용품 | 생활/리빙 | ✅ |
| 반려동물 | 반려동물 | ✅ |

length guide에도 `comparison_chart` 언급 6/6.

### 판단

| 카테고리 | 결정 | 근거 |
|----------|------|------|
| 전 6종 | **유지 (이미 추가됨)** | 160차 당시 패션/생활/펫 슬롯 부재는 **161차에서 해소** (`review/161cha-report.md`). 181 시점 재확인 결과 갭 없음 |
| 패션 size diagram vs chart | 병존 타당 | size_table / fashion-size-diagram은 치수, chart는 혼용률·신축·수축 등 **스펙 비교** — 역할 분리 |
| 억지 확장 | **해당 없음** | 슬롯 추가 코드 diff 없음 |

실라이브에서도 6/6 `hasComparisonChart=true`, `baselineLabel=일반 제품` (경쟁사 실명 없음).

---

## 트랙 A — 실생성 입력·산출

스크립트: `scripts/181cha-live-generate.ts` (160cha 패턴 재사용 · need:7 · 성분/인증/후기 CSV)

| key | 상품 | sections | chart | style | gen $ | photo $ | `/api/generate` hits |
|-----|------|----------|-------|-------|-------|---------|----------------------|
| beauty | AURA LAB 나이아신아마이드 5% 세럼 | 28 | ✅ | bar×3 | 1.172 | 0.205 | 3 |
| fashion | 에센셜 오버사이즈 코튼 티셔츠 | 29 | ✅ | bar×2 | 0.856 | 0.186 | 3 |
| food | VITAL LAB 프로바이오틱스 30억 | 28 | ✅ | checklist×2 | 1.223 | 0.143 | 2 |
| electronics | AURA PURE Mini 공기청정기 | 27 | ✅ | bar×3 | 1.293 | 0.187 | 2 |
| living | 솔리드 스틸 모듈 선반 5단 | 28 | ✅ | bar×2 | 1.112 | 0.184 | 2 |
| pet | PAW PLAIN 그레인프리 독 사료 2kg | 28 | ✅ | bar×2 | 0.927 | 0.180 | 2 |

스크린샷 (입력값 포함):

- 입력: `review/qa-screenshots/181cha-{cat}-input.png`
- 프리뷰: `review/qa-screenshots/181cha-{cat}-preview.png`
- 풀페이지: `review/qa-screenshots/181cha-{cat}-full.png`
- 세션/요약: `review/181cha-live/{cat}/`

Behance:

- `181cha-behance-beauty.png` / `beauty-app.png` — 스킨케어·코스메틱 UI
- `181cha-behance-fashion.png` — Jil Sander PDP
- `181cha-behance-electronics.png` — Shark 공기청정기 리스팅
- `181cha-behance-food.png` — Wellness+ 건기식 (딥스크롤 시도, intro 비중 큼)
- `181cha-behance-living.png` / `living-furniture.png` — 리빙·가구
- `181cha-behance-pet.png` — Pawcare 펫 스토어
- 메타: `review/181cha-behance/refs.json`

---

## 4축 비교표 (버그 / 취향 / 입력)

비교 규율: 카테고리가 겹치는 디자이너 사례 vs Pagzly long-form 상세. Behance는 서구 스토어프론트·앱 비중이 커서 **포맷 차이 ≠ 버그**.

| 축 | Pagzly (174~180 후) | Behance/프리미엄 레퍼 | 격차 분류 | 비고 |
|----|---------------------|----------------------|-----------|------|
| 레이아웃 | 컬러블록 리듬·섹션 27~29 · 토큰 radius/elevation 일관 | 여백 큰 소수 섹션·히어로 1컷 중심 | **취향** | 국몰 long-form vs 브랜드 스토어 PDP |
| 레이아웃 밀도 | 증거 섹션(stat/chart/tradeoff) 연속 배치 | 정보 덩어리를 더 크게 비움 | **취향** | 판매 정보량 우선 정책 |
| 타이포·여백 | 헤드라인/본문 위계 명확, 섹션 패딩 토큰화 | 세리프·초대여백 에디토리얼 | **취향** | 서체 페르소나 차이 |
| 이미지 합성 | sharp 컷아웃+AI 배경, 아이콘 실루엣 tint 통일 | 실사·렌더 중심 | **취향** | 174~180 아이콘 언어는 버그층에서 제외 |
| 이미지 입력 일치 | fashion Pexels에 이질 프린트 티 혼입 → QA critical | — | **입력 부족** | 스크립트 쿼리/필터 개선 후보 |
| 정보 위계 | hero→증거(chart)→스펙→FAQ→CTA 흐름 안정 | accordion/소수 블록 | **취향** | chart baseline 화이트리스트 준수 |
| 비교 차트 존재 | 6/6 생성 | 리스팅에 스펙 비교 흔함 | (해소) | 161 이후 갭 없음 |
| 히어로 배경 실패 | food에서 Replicate **402**/sensitive → 원본 계속 UX | — | **입력/인프라** | 제품 버그 아님. 자동화는 continue CTA 클릭 |

### 이번 라운드에서 고친 버그

| 항목 | 분류 | 조치 |
|------|------|------|
| (제품 UI) | — | **없음** — 4축상 아이콘/elevation/radius 이후 잔여 버그 단정 불가 |
| 라이브 자동화 | 스크립트 | backdrop 실패 시 `이대로 최종 생성` 대기·클릭 (`181cha-live-generate.ts`) |

### 취향 후보 (코드 변경 없음 · 158/159 원칙)

1. 섹션 수 상한/큐레이션 (27~29 → 디자이너급 소수 블록)
2. 히어로 여백·에디토리얼 타이포 페르소나
3. 컬러블록 대비 강도 (국몰 설득형 vs 미니멀 브랜드)

### 입력 부족 · 넛지 후보

1. 패션: “동일 상품 컷만 업로드” / 이질 프린트 컷 경고
2. 식품·뷰티: 화이트백 히어로 1장 필수 넛지 (Pexels 혼용 시 역할 붕괴)
3. 배경 생성 실패 시 크레딧/민감도 안내 문구 강화 (UX 카피만)

---

## 파이프라인 관측 (버그 아님 · 기록)

- food 1차 실패: DeepSeek copy JSON parse (`Expected ',' or ']'`) → `/api/generate` 500. 재시도로 성공.
- food backdrop: `HTTP 402 Payment Required` + sensitive flag 혼재 → photoPending → 원본 계속.
- fashion draft QA critical: 입력 이미지 상품 불일치 (입력).

---

## API 호출·비용

| 항목 | 값 |
|------|-----|
| 성공 6건 `/api/generate` hits 합 | **14** (draft+final; beauty/fashion은 재시도 포함 3) |
| 성공 6건 generationCost 합 | **$6.58** |
| 성공 6건 photoProcessingCost 합 | **$1.08** |
| 성공 6건 소계 | **≈ $7.67** |
| 실패·재시도 오버헤드 | food JSON 500 1회 + backdrop 402 다수 (대략 +$0.2~0.4 추정, 서버 로그 분산) |
| 실 이미지 생성 | flux-kontext / section-backdrop / enhance / recraft 아이콘 — 카테고리당 final 1회분 |
| Behance 캡처 | API 비용 **$0** |

롤업: `review/181cha-live/rollup-final.json`

## 검증

- `npx tsx scripts/181cha-comparison-coverage.ts` → 6/6 OK  
- `npx tsc --noEmit` → **exit 0**

## 산출물

- 스크립트: `scripts/181cha-live-generate.ts`, `181cha-comparison-coverage.ts`, `181cha-behance-*.ts`
- 스크린샷: `review/qa-screenshots/181cha-*`
- 세션: `review/181cha-live/`

## 다음 후보

1. 섹션 큐레이션(취향) A/B — 상한·우선순위만 실험
2. Pexels/업로드 상품 일치 가드 넛지
3. DeepSeek JSON 복구 강화 (생성 신뢰성 · 4축 외)
4. Replicate 크레딧/402 운영 알림
