# 82차 — 81차 후속: 폴백 브랜드 창작 방지 + QA 픽스처 + 붙여넣기 중앙 정렬

생성: 2026-09-02

## 요약

81차 QA에서 드러난 3가지 문제를 수정했습니다. **무라벨 제품 폴백 시 가짜 브랜드명 생성 문제는 해결**되었고, **붙여넣기 중앙 정렬**도 적용되었습니다. 라벨 텍스트 일치 검증용 QA 픽스처는 Supabase 실제 상품으로 교체했으나, Vision 텍스트 감지가 원본에서 라벨 영역을 잡지 못해 **문자 단위 일치 판정은 여전히 불완전**합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/lifestyle-product-composite.ts` | `buildFallbackPrompt()` 브랜드 창작 방지 문구, `productName` 제거, `pasteCutoutOnScene()` 중앙 정렬, `qaForceFallback` (QA 전용) |
| `scripts/82cha-lifestyle-composite-qa.ts` | 라벨 있는 Supabase 상품 2종 + 무라벨 폴백 케이스, skipped JSON 기록 (신규) |
| `scripts/81cha-lifestyle-pixel-paste-qa.ts` | 404 beverage 케이스 제거, skipped JSON 기록 |

## 문제별 결과

### 1. 폴백 브랜드 창작 방지 — **개선 확인**

- `buildFallbackPrompt()`에 “참조에 없는 텍스트/로고/브랜드명을 invent하지 말 것” 명시
- `productName`을 프롬프트에서 제거 — “이 이름의 제품을 상상해서 그려라” 신호 차단
- **무라벨 폴백 재테스트** (`82cha-unlabeled-fallback-flatlay`, `qaForceFallback: true`):
  - 81차: 원본 무지 용기 → **「글로우 카밍 수분 크림」 가짜 브랜드 생성**
  - 82차: **무지 흰색 펌프 병 유지, 텍스트/로고 없음** ✅
  - 스크린샷: `82cha-unlabeled-fallback-flatlay-label-compare.png`, `full-compare.png`

### 2. QA 픽스처 — **부분 개선**

| 케이스 | 상품 | method | Vision 텍스트 감지 |
|--------|------|--------|-------------------|
| `82cha-labeled-serum-hands` | 세럼 병 (Supabase) | pixel-paste | ❌ 미감지 |
| `82cha-labeled-jar-hands` | 크림 튜브 (Supabase) | pixel-paste | ❌ 미감지 |
| `82cha-unlabeled-fallback-flatlay` | moisture 텍스처 | fallback | ❌ (당연) |

- Pixabay URL 403 → Pagzly 테스트 계정 Supabase URL로 교체
- pixel-paste 경로에서 **실제 컷아웃 픽셀은 보존됨** (앰버 세럼 병·블루 튜브 형태 그대로)
- 다만 `detectTextRegions`가 원본 hero 컷에서 라벨 bbox를 못 잡아 **「텍스트/로고 일치」 육안 판정용 크롭이 부정확** — 라벨이 있는 정면 패키지 샷 fixture 추가가 다음 라운드 과제

### 3. 붙여넣기 중앙 정렬 — **적용 + 육안 개선**

```ts
const pasteLeft = left + Math.round((targetW - cutW) / 2);
const pasteTop = top + Math.round((targetH - cutH) / 2);
```

- 그림자 placement도 `pasteLeft/pasteTop` 기준으로 동기화
- 전/후: `82cha-center-align-before-after.png` (81cha peach blob 좌상단 쏠림 → 82cha 세럼 병 손 중앙 쪽 배치)

## 남은 실패 모드 (솔직히)

1. **손 위에 여전히 떠 보임** — 회전/원근 미반영, Vision bbox 오차
2. **이중 컷아웃 아티팩트** — 세럼/튜브 케이스에서 작은 duplicate product가 손 옆에 추가로 보임 (컷아웃/배치 이슈)
3. **라벨 텍스트 QA 미완** — hero 샷은 라벨이 작거나 측면이라 Vision text detect + 크롭 비교가 실패
4. **폴백 경로** — 라벨 있는 제품에서 fallback을 타면 여전히 재해석 위험 (이번엔 무라벨만 검증)

## 검증

- `npx tsc --noEmit` — 통과
- QA: `$env:TEST_MODE="false"; npx tsx scripts/82cha-lifestyle-composite-qa.ts`
- **총 비용: ~$0.122** (3 합성 + 1 before/after)

## 스크린샷 체크리스트

- [x] 라벨 제품 pixel-paste: `82cha-labeled-serum-hands-label-compare.png`, `82cha-labeled-jar-hands-label-compare.png`
- [x] 무라벨 폴백 (가짜 브랜드 없음): `82cha-unlabeled-fallback-flatlay-label-compare.png`
- [x] 중앙 정렬 전/후: `82cha-center-align-before-after.png`

## 결론

**운영 리스크(무라벨 → 가짜 브랜드)** 는 82차 프롬프트 수정으로 실측 해소. **pixel-paste는 픽셀 보존 + 중앙 정렬**까지 개선됐지만, **라벨 텍스트 일치를 QA로 증명하기엔 fixture·크롭 방식이 아직 부족**하고, **합성 자연스러움(손 가림·원근)** 은 다음 라운드 과제입니다.
