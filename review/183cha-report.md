# 183차 — 후커블·마켓 격차: 레이아웃/타이포만 ($0 · API 0)

생성: 2026-09-15  
가드레일: Replicate/Claude/DeepSeek/`/api/generate` **호출 0회**. 181 세션·기존 카피·이미지만 재사용.

---

## 트랙 A — 격차 재확인 (가정 금지)

근거: `review/qa-screenshots/181cha-{cat}-full.png` 6장 + 코드 grep.  
`claude/hookable_category_examples_2026-09-09.md`는 워크스페이스에 **파일 없음** — 브리프·`design-tokens.ts` 150차 주석에 인용된 후커블 특징을 그대로 사용 (재크롤링 없음).

| # | 후커블/마켓 특징 | 181 Pagzly 스크린샷 근거 | 분류 |
|---|------------------|--------------------------|------|
| 1 | 이미지 풀블리드 + **대형 타이포 오버레이** | beauty/fashion/living/pet full: 히어로는 이미 이미지 위 오버레이. 다만 본문 대부분은 카드형 색면+서술 블록. 히어로 스크림·타이포 비중이 레퍼보다 약함 | 레이아웃으로 강화 가능 (B-1) |
| 2 | 매거진풍 **짧은 캡션** | 전 카테고리: 섹션 body가 2~4문장 서술형 (예: fashion brand_story·usage 블록) | **Track C** (카피 재생성 필요) |
| 3 | 저관여(생활/펫) **섹션 수 적음** | living/pet full ≈ 28섹션 장문. 181 리포트: living/pet **28**, beauty 28, fashion 29 | 표시 예산으로 축소 가능 (B-2) |
| 4 | 비교 그리드 **자사 vs 타사 대비 강함** | fashion mid: 바 두께·색이 비슷(잉크 vs 거의 잉크). living chart도 절제된 3색 | 3색 토큰만으로 채움/테두리 차등 (B-3) |

### A-2 히어로 구조 (코드)

| 경로 | 구조 |
|------|------|
| `DetailSectionRenderer.tsx` `case "hero"` | `SectionImage` absolute + `getHeroGradient` 스크림 + `heroOverlayClass` 하단 타이포 → **이미 텍스트-오버레이** |
| `export-detail-html.ts` `case "hero"` | 동일: img + absolute gradient + 하단 h1 |
| 히어로 아래 `HOME`/`FASHION`/`PET CARE` | `brand_story` 메가키워드 블록 (히어로 분리형이 아님) |

→ Track B는 “분리→오버레이 전환”이 아니라 **스크림·타이포 비중·export 동기화**로 좁힘.

### A-3 섹션 상한 로직 (grep)

| 존재? | 내용 |
|-------|------|
| **없음** (표시 상한) | 151차 `getCategoryRhythm` = 여백/리듬만. `getSlotTemplate` long이 LLM 채움 상한 역할. `applyShortTemplate`은 length=short일 때만 `shortTier:extra` 제외 |
| 왜 living/pet도 27~29? | 181은 long 템플릿 + 판매자급 입력으로 optional/extra가 거의 채워짐. **카테고리별 노출 개수 정책이 없었음** |

---

## 트랙 B — 실행 ($0)

### B-1 히어로 스크림·타이포

- `getHeroGradient`: 하단 0.92 / 중단 accent 0.55 / 72%에서 약화 → 가독성 강화
- live `TYPO.heroTitle`: `3rem` + extrabold + drop-shadow
- export: `FONT_SIZE.heroDisplay`(`3rem`) + 동일 gradient + text-shadow (이전 export는 `2rem`·약한 `${deep}cc` 스크림)

스크린샷: `183cha-before|after-{fashion,living}-hero.png`

### B-2 저관여 표시 예산 (데이터 삭제 아님)

신규 `lib/section-display-budget.ts` — **렌더/export 시에만** 숨김.  
anti-hallucination / `comparison-chart-guard` / `assign-section-images` **미수정**.

정책 (생활용품·반려동물만):

1. 장식·부가 슬롯 숨김: `illustration_banner`, `package_contents`, `target_persona`, `usage_scenario_extra`
2. 증거 계열 상한 **2**: `comparison_chart` > `stat_infographic` > `tradeoff_card` > `review_highlight`
3. extra 이미지 서술 슬롯 상한 **1**: `material_feature|material_detail|packaging_design|care_tip`

배선: `buildDetailPageHtml`, `app/create/result/page.tsx` (세션 JSON 유지).

| 카테고리 | raw | displayed | demoted slots (181 세션) |
|----------|-----|-----------|---------------------------|
| living | 28 | **20** | target_persona, illustration_banner, tradeoff_card, package_contents, material_detail, usage_scenario_extra, packaging_design, care_tip |
| pet | 28 | **20** | … + review_highlight (증거 3순위↓) |
| beauty/fashion/food/electronics | 변화 없음 | | |

export `<section>` 수: living/pet **30→22** (SEO 내부 section 포함; 본문 8개 축소와 일치).

스크린샷: `183cha-before|after-living-export-full.png`

### B-3 comparison_chart 대비 (3색만)

- live/export: **our** = accent 채움 패널 + 두꺼운 바 / **baseline** = baseNeutral 테두리만 + 얇은 바  
- checklist: our 열 accent tint 패널, baseline 열 테두리만  
- export baseline `#000014/#000040` 제거 → `baseNeutral` 토큰

스크린샷: `183cha-before|after-fashion-chart.png` (our 채움 vs baseline outline)

### 코드 diff (요지)

| 파일 | 변경 |
|------|------|
| `lib/section-display-budget.ts` | **신규** 표시 예산 |
| `lib/design-tokens.ts` | `getHeroGradient` 강화, `FONT_SIZE.heroDisplay` |
| `components/DetailSectionRenderer.tsx` | hero TYPO, ComparisonMetric/ChecklistRow 대비 |
| `lib/export-detail-html.ts` | hero/chart + `applySectionDisplayBudget` |
| `app/create/result/page.tsx` | 프리뷰에 동일 예산 |
| `scripts/183cha-*.ts` | before/after 검증 (API 0) |

before 기준선: `review/182cha-export/after-*.html` (= 183 레이아웃 변경 직전).

---

## 트랙 C — API 필요 (실행 금지 · 허가 대기)

| 항목 | 왜 API가 필요한지 |
|------|-------------------|
| 매거진풍 짧은 캡션 | 현 카피가 서술형. DeepSeek 톤/길이 재생성 없이는 문구만으로 후커블 캡션 불가 |
| 히어로/라이프 실사 비중 | AI 컷아웃 vs 마켓 실사 — 이미지 재생성(Replicate) 필요 |
| 생활/펫을 “대표+라이프 1~2컷” 수준까지 축소 | 표시 예산으로 8슬롯 줄임. 더 공격적 축소는 템플릿 required 재설계 또는 short length 기본화 + 카피 재생성 |
| Behance급 에디토리얼 여백·세리프 페르소나 | 전면 타이포 시스템 변경은 174~182 범위 밖; 카피 리듬과 결합 필요 |

**사용자 허가 전까지 생성 API 실행 금지.**

---

## 공통 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | **0** |
| 이미지/카피 생성 API 호출 | **0** |
| 메타 | `review/183cha-export/before-meta.json`, `after-meta.json`, `diff.json` |
| 리포트 | `review/183cha-report.md` |
