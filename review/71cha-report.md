# 71차 — 결과 페이지 3분할 편집 레이아웃

생성: 2026-09-02

## 요약

`/create/result`를 후커블 스타일 **데스크톱 3분할**(좌 섹션 목록 / 중 캔버스 / 우 채팅·요약·도구)로 재배치했습니다. 기존 핸들러·API는 그대로 두고 레이아웃만 분리했습니다.

## 변경 사항

### 작업 A — 3분할 레이아웃
- `app/create/result/page.tsx`: `lg+`에서
  - **좌** `DetailStructureSidebar` — 순서/숨김, 클릭 시 `scrollToSection`
  - **중** `detailPreview` + 다운로드 컨트롤
  - **우** `GenerationPipelineSummaryCard` + 직접 편집 + `SectionPatchChat` + `DetailToolsAccordion`(업로드·AI·인스타·블로그)
- `lg` 미만: 기존 `DetailActionBar` 탭 UI 유지 (`data-testid="result-mobile-tools"`)

### 작업 B — 생성 단계 요약 카드
- `lib/generation-pipeline-summary.ts` — draft 파이프라인 4단계 요약 빌더
- `components/GenerationPipelineSummaryCard.tsx` — 우측(데스크톱)·모바일 상단 정적 카드
- `app/create/draft/page.tsx` — 최종 생성 성공 시 `pipelineSummary`를 `SESSION_KEY`에 저장
- `resolvePipelineSummary()` — DB 재로드 시 `imageAnalysis`·`theme`·`photoCostBreakdown` 등으로 동일 규칙 재구성

### 작업 C — 좌측 슬롯 라벨
- `DetailStructureSidebar`에서 `slotDisplayLabel` + `getSlotTemplate` note 표시

### 기타
- `DetailSectionRenderer` — `data-section-index` / `data-section-slot` (스크롤 이동용)
- `scripts/capture-71cha-result-layout.ts` — QA 캡처 스크립트

## 완료 체크리스트

| 항목 | 결과 |
|------|------|
| 데스크톱 3분할 스크린샷 | ✅ `review/qa-screenshots/71cha-result-desktop-split.png` (911,693 bytes) |
| 모바일 탭 방식 유지 스크린샷 | ✅ `review/qa-screenshots/71cha-result-mobile-tabs.png` (1,384,350 bytes) |
| 섹션 채팅/구조 탭 회귀 (Playwright) | ✅ structure → patch 탭 전환·`panel-patch` attached |
| 우측 요약 카드 실제 데이터 | ✅ `photoCostBreakdown`·`theme.baseNeutral`·섹션 수 기반 4단계 (fixture 세션 + `buildGenerationPipelineSummary`) |
| `npx tsc --noEmit` | ✅ 앱 코드 0건 (기존 `review/pixabay-cosmetics-test/crawl-pixabay.mts` 1건만) |

## 스크린샷 파일 확인 (`ls -la` 동등)

```
71cha-result-desktop-split.png   911693 bytes
71cha-result-mobile-tabs.png    1384350 bytes
```

## 검증 방법

```bash
npm run dev
npx tsx scripts/capture-71cha-result-layout.ts
```

- `scripts/auth-state.json` 필요 (로그인 세션)
- fixture: `review/beauty-showcase-one/session.json`

## 하지 않은 것 (스펙 준수)

- `GeneratingOverlay` / draft 로직 변경 없음
- `/api/generate`, `/api/patch-section` 변경 없음
- 다중 페이지 개념 없음
- 섹션 썸네일 미구현 (다음 라운드)
