# 189차 — 텍스트 색상 대비 확장 감사 (코드 전용, API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 단일
트랙만 정확히 끝내세요.

## 배경 — 188차가 남긴 실제 격차 (코드로 직접 확인)

188차는 `ensureReadableOnPaper()`를 만들어 **"accent/deepAccent가 배경(bg)이고 그 위에
BRAND.paper 텍스트가 얹히는"** 방향만 감사·수정했습니다(패턴 C의 `inkDeep`/`inkAccent`,
그리고 `solidAccentOnPaper()`/`solidDeepOnPaper()` 두 헬퍼).

그런데 `contrastRatioToken(fg, bg)`는 fg/bg를 구분하지 않고 두 색의 명도만 비교하는
대칭 함수입니다(`design-tokens.ts` 546~552행 — `Math.max`/`Math.min`으로 lighter/darker만
가림). 즉 **"accent/deepAccent가 텍스트 색이고 흰/거의-흰 배경 위에 얹히는" 반대 방향도
수학적으로 완전히 동일한 대비 제약**을 받는데, 이쪽은 188차 감사 대상에 없었습니다.

제가 `components/DetailSectionRenderer.tsx`와 `lib/export-detail-html.ts`를 grep해
확인했습니다: `color: theme.deepAccent` / `color: theme.accent` 형태로, **배경색 지정 없이
페이지의 흰/거의-흰 배경(BRAND.paper 또는 아주 옅은 accent 틴트) 위에 직접 텍스트 색으로
쓰이는 자리가 30곳 이상**입니다 — 섹션 타이틀(`TYPO.sectionTitle`/`sectionLabel`), STORY/
"혜택·신뢰" 캡션, 체크 아이콘, 각주 sup 등 실제로 읽혀야 하는 본문급 텍스트입니다
(예: `DetailSectionRenderer.tsx:1552,1668,1770,1824,1893,2022,2330` 등, `export-detail-html.ts:121,706`).

188차 감사표의 실측값(예: 식품/cool 계열 `deepAccent`+paper 조합 `2.48`, 식품/base
`accent`+paper `2.01`)은 **같은 hex가 텍스트 색으로 쓰일 때도 그대로 적용되는 값**입니다 —
즉 저 30곳 중 일부는 지금 실제로 WCAG AA 본문 기준(4.5:1) 미달 상태일 가능성이 코드
구조상 확인됩니다(아직 실측 감사는 안 했으므로 "가능성"이며, 이번 라운드의 1단계가 바로
그 실측입니다).

## 작업 — 감사만 먼저, 수정은 실제 미달 조합만 (188차와 동일 원칙)

**1단계(필수): 기존 감사 스크립트 확장**

`scripts/188cha-contrast-audit.ts`를 열어 재사용/확장하세요(새 스크립트를 처음부터
새로 만들지 말고 기존 것에 이어붙이는 걸 권장 — 158/159차 원칙). `ensureReadableOnPaper`/
`contrastRatioToken`은 그대로 import해서 재사용하고, **새 대비 계산 로직은 발명하지
마세요**.

1. `components/DetailSectionRenderer.tsx`와 `lib/export-detail-html.ts`에서
   `color: theme.deepAccent` / `color: theme.accent` (또는 export 쪽 템플릿 리터럴의
   `color:${theme.deepAccent}` 등 동일 패턴)로 **배경 지정 없이 텍스트 색으로만** 쓰이는
   자리를 전부 grep으로 찾아 목록화하세요. `backgroundColor`/`boxShadow`/`border*`/
   `stroke`/`fill` 등 배경·장식 용도는 제외 — 순수 텍스트 색 용도만 대상입니다.
2. 각 자리가 실제로 얹히는 로컬 배경이 BRAND.paper(흰색)이거나 그에 아주 가까운 옅은
   틴트(예: `hexToRgba(theme.accent, 0.1~0.22)` 같은 배지/필 배경, 거의 흰색에 가까운
   저알파)인 경우만 대상에 포함하세요. 이미 어두운 배경(패턴 C의 inkDeep/inkAccent,
   deepAccent 고알파 오버레이 등) 위에 밝은 텍스트가 얹히는 자리는 **188차가 이미 반전
   규칙(19차)으로 처리한 별개 조합**이니 건드리지 마세요 — 헷갈리면 그 자리는 제외하고
   목록에서 "판단 보류"로만 남기세요.
3. 6개 카테고리 × 4개 변형(base/warm/cool/bold)에서 각 자리의 `theme.accent`/
   `theme.deepAccent` 값에 대해 `contrastRatioToken(BRAND.paper, 해당값)`을 계산하세요
   (188차와 동일하게 폴백 팔레트 기준으로 충분, 사진 추출 값까지 갈 필요 없음).
4. 본문 텍스트 기준 **4.5:1**, 큰 텍스트(24px 이상 또는 굵은 18px 이상)·sup/각주 등 보조
   텍스트는 **3:1**로 판정하세요(188차와 동일 WCAG AA 체계 — `TYPO.sectionTitle`처럼 큰
   제목류는 3:1, 본문/라벨/캡션은 4.5:1로 나눠서 보세요. 애매하면 4.5:1 기준 적용).
5. 전체 표(자리 수 × 카테고리×변형 조합, 몇 건 중 몇 건 미달)를 출력하세요. **미달이
   0건이면 그것도 정직한 결과입니다** — 억지로 문제를 만들지 마세요(148/159/188차 원칙).

**2단계(미달 건이 있을 때만): 최소 수정**

미달로 확인된 자리만, 해당 위치의 `theme.deepAccent`/`theme.accent` 참조를
`ensureReadableOnPaper(theme.deepAccent, 4.5)` (또는 큰 텍스트 자리는 `minRatio=3`)로
감싸세요. **`ensureReadableOnPaper()`는 이미 188차가 만든 그대로 재사용** — 새 함수를
또 만들지 마세요. hue/채도는 그대로 유지되고 명도만 낮아지므로 색상 정체성은 유지됩니다.
매 렌더마다 재계산하는 비용이 걱정되면 컴포넌트 함수 상단에서 한 번만 계산해 변수로
재사용하는 정도만 정리해도 충분합니다(성능 리팩터까지 필요 없음).

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. 감사 표 전체(몇 건 중 몇 건 미달인지 숫자로) — 188차 보고 형식과 동일하게.
3. 수정이 있었다면: 수정 전/후 대비값 비교(숫자만, before→after), export HTML sha256으로
   "의도한 자리 외 변화 없음" 확인(179~184/188차와 동일 방식).
4. 스크린샷/카테고리별 QA 불필요 — 수치 감사 라운드입니다.

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- 새 대비 계산 로직 발명 금지 — `contrastRatioToken()`/`ensureReadableOnPaper()` 그대로
  재사용.
- 색상환(hue)·3색 토큰 체계 변경 없음, 미달 자리의 명도만 조정(기존 `ensureReadableOnPaper`
  동작 그대로).
- 188차가 이미 처리한 "배경+paper 텍스트" 방향(패턴 C, `solidAccentOnPaper`/
  `solidDeepOnPaper`) 재작업 없음 — 이번은 반대 방향(텍스트 색으로 쓰이는 자리)만.
- 어두운 배경 위 밝은 텍스트 조합(반전 규칙 적용 자리)은 건드리지 않음 — 애매하면 제외.
- `comparison-chart-guard.ts`, `assign-section-images.ts` 미수정.
- 174~188차가 끝낸 아이콘/elevation/radius/font/hero/display-budget/patch/그레인/대비
  로직 재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약 + 감사 표(숫자) + (수정이 있었다면) diff. 미달 0건이면 "감사 결과 전부 통과,
코드 변경 없음"으로 짧게 끝내도 됩니다.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/189cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다.
