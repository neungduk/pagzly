# 171차 — tradeoff_card 전 카테고리 + 입력 넛지

생성: 2026-09-14

## 요약

| 트랙 | 결과 |
|------|------|
| A tradeoff_card 5카테고리 확장 | **완료** — 6/6 슬롯·가이드, 픽스처 ok-filled / omit 확인 |
| B 입력 넛지 UI | **완료** — 폼 + 결과(15섹션 미만) 인라인 안내 |
| 유료 API | **0** |
| `npx tsc --noEmit` | **EXIT 0** |

---

## 트랙 A — tradeoff_card 카테고리 확장

### 변경 파일
- `lib/section-templates.ts` — BEAUTY/FASHION/FOOD/ELECTRONICS/PET에 `tradeoff_card`(required:false) + `buildSectionLengthGuide` 각 절 1줄
- `app/api/generate/route.ts` — 스키마·프롬프트에서 「생활/리빙 전용」 제거 → 전 카테고리 + 카테고리별 근거 힌트
- `scripts/169cha-rebuild-139-sessions.ts` / `139cha-regression-qa.ts` — 추천/확인 후 구매 근거 반영
- `scripts/167cha-analyze-sessions.ts` — tradeoff를 living 전용 판정에서 전 카테고리로
- `scripts/171cha-verify-tradeoff.ts` — 슬롯·가이드·네이티브 채움/생략 검증
- 픽스처: `review/139cha-session-{fashion,food,living,electronics,cosmetics,pet,fashion-omit}.json`

### 렌더러 재확인
- `DetailSectionRenderer.tsx` / `export-detail-html.ts`의 `tradeoff_card` 분기: **카테고리 하드코딩 없음** → 수정 없음

### 검증
```text
npx tsx scripts/171cha-verify-tradeoff.ts  → 6카테고리 slot+guide OK, fill/omit OK
npx tsx scripts/167cha-analyze-sessions.ts
```

| id | verdictTradeoff |
|----|-----------------|
| fashion / food / living / electronics / cosmetics / pet | **ok-filled** |
| fashion-omit (근거 없음) | **ok-omit-no-input** |
| cosmetics-noreview (구 세션, 근거 없음) | **ok-omit-no-input** |

---

## 트랙 B — 정직한 입력 넛지

### 변경 파일
- `components/CreateProductForm.tsx`
  - 성분 필드 위: 148차 실사 수치(약 **10개 → 27개 섹션**) 인용 안내
  - 리뷰 파일: 후기 입력 시 설득 섹션이 풍부해질 수 있다는 짧은 안내
- `app/create/result/page.tsx` — 섹션 수 **&lt; 15**일 때 동일 취지 인라인 박스(팝업 아님, 필드 필수화 없음)

### 하지 않은 것
- 성분/인증/리뷰 **필수화 없음**
- anti-hallucination 게이팅 **미변경**
- 새 수치 날조 없음(148차 측정값만)

---

## 비용

- 유료 API 호출: **0**
- `comparison-chart-guard.ts` / `assign-section-images.ts`: **미수정**
