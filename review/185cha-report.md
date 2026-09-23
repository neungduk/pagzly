# 185차 — 크롤링 이력 장기 백로그 일괄 (링 다이어그램 · 마스터 문서 · 패치 UX)

생성: 2026-09-15  
가드레일: 생성 API **0회** (`/api/generate` · Replicate · Claude · DeepSeek 카피 미호출).

---

## 트랙 A — 성분/균주 원형 곡선 텍스트

### 구현
- `lib/ingredient-ring-diagram.ts` — `prepareIngredientRingLabels`(3~8 게이트 + 노이즈 필터) → `buildIngredientRingDiagramSvg`(`<textPath>` + 개수별 fontSize)
- `components/IngredientRingDiagram.tsx`
- 배선: `DetailSectionRenderer.tsx`, `lib/export-detail-html.ts` (`ingredient_highlight` 직후)
- 카테고리: `화장품/뷰티` | `반려동물`만 (`isIngredientRingCategory`)
- 색: `deepAccent` 스트로크 + ink 라벨 (3색 토큰, 팔레트 추가 없음)
- 하단 호 reverse 버그 수정: 짧은 호만 반시계로 그려 전 구간 라벨 표시

### 게이팅
| 조건 | 동작 |
|------|------|
| 카테고리 ≠ beauty/pet | 미렌더 |
| 파싱 라벨 &lt;3 또는 &gt;8 | `prepare…` → null → 미렌더 |
| 181 beauty 세션 | Water·Niacinamide… 5라벨 → **렌더** |
| 181 pet 세션 | 닭고기·연어·고구마·완두콩 4라벨 → **렌더** |
| fashion 등 | 카테고리 게이트로 생략 |

### 스크린샷
- `review/qa-screenshots/185cha-ingredient-ring-3.png`
- `review/qa-screenshots/185cha-ingredient-ring-5.png`
- `review/qa-screenshots/185cha-ingredient-ring-8.png`
- 게이트 JSON: `review/185cha-export/ring-gate.json`

---

## 트랙 B — 백로그 마스터

파일: `claude/pagzly-backlog-master-2026-09-15.md`

| 상태 | 대략 항목 수 |
|------|-------------|
| 완료됨 | 28 |
| 의도적 보류 | 14 |
| 미해결·API불필요 | 6 |
| API필요·허가대기 | 11 |

185에서 링 다이어그램·패치 UX를 완료로 이동. 다음 라운드는 이 문서 §3/§4만 보면 됨.

---

## 트랙 C — SectionPatchChat UX (API 호출 불변)

### 흐름 (조사)
사용자 지시 → `handlePatchSection` → `POST /api/patch-section` → (기존) 즉시 `persist`.

### 이미 있었음 (조치 없음)
- 섹션별 `patchHistories` 채팅 메시지
- 구성 탭 **up/down** 재배치 (`DetailStructureSidebar`) — DnD 아님
- Phase 2/3: 표시·숨김, 요소 path, 레퍼런스 이미지 (95/96)

### 이번 구현
1. **적용 전 미리보기** — API 응답을 `pendingPatch`에 두고 적용/버리기
2. **Undo** — `patchUndoStack`으로 마지막 적용 섹션 복원
3. **세션 패치 히스토리** — 적용 목록 + 되돌리기 버튼 (`data-testid=patch-history-panel`)
4. 데스크톱 `SectionPatchChat` + 모바일 `DetailActionBar` 동일 props

`/api/patch-section` 요청 본문·호출 횟수 로직 **변경 없음** (응답 처리만 지연 적용).

---

## 공통 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | **0** |
| 이미지/카피 생성 API | **0** |
| `/api/generate` | **0** |
| 링 샷 스크립트 | `npx tsx scripts/185cha-ingredient-ring-shots.ts` |

## 산출물
- 코드: ring lib/컴포넌트, renderer/export 배선, SectionPatchChat + result page 상태
- 문서: `claude/pagzly-backlog-master-2026-09-15.md`
- 샷: `review/qa-screenshots/185cha-ingredient-ring-*.png`, `185cha-patch-ux.png`
- 본 리포트
