# 188차 — 색상 대비(WCAG) 감사 (코드 전용, API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 단일
트랙만 정확히 끝내세요.

## 배경 — 코드로 직접 확인한 실제 격차

`lib/design-tokens.ts`를 읽어 확인했습니다: 이 파일엔 이미 WCAG 대비 계산 인프라가
있습니다(531~567행) — `relativeLuminanceToken()`, `contrastRatioToken()`(W3C 상대
휘도 공식 그대로 구현), 그리고 `ensureReadableNeutralHue()`가 `contrastRatioToken(BRAND.ink,
candidate) >= 4.5`(WCAG AA 기준)를 만족할 때까지 명도를 올리는 안전장치. **그런데 이
안전장치는 딱 한 곳에만 적용돼 있습니다** — 149차 hue-shift 파생 시 `baseNeutral` 배경
위 `BRAND.ink` 텍스트 조합뿐입니다(585행).

같은 파일에 그 외에도 텍스트가 색이 있는 배경 위에 직접 얹히는 조합이 더 있는데, 이들은
대비 검증을 거치지 않습니다:

- **하드 콘트라스트 블록(패턴 C, 148차)** — 121~126행: `inkDeep = mixHex(theme.deepAccent,
  BRAND.ink, 0.6)`, `inkAccent = mixHex(theme.accent, BRAND.ink, 0.42)`를 배경으로 쓰고
  그 위에 `BRAND.paper`(흰색 계열) 텍스트를 얹습니다(19차에서 확정된 반전 규칙). `theme.accent`/
  `theme.deepAccent`는 상품 사진에서 추출되거나 카테고리 폴백 + hue-shift로 매 생성마다
  달라지는 값이라, 원본이 이미 아주 밝은 파스텔(예: 연분홍 스킨케어 사진)이면 42%만 잉크를
  섞어도 대비가 부족할 가능성이 있습니다 — 지금은 이 조합에 대한 대비 검증이 전혀 없습니다.
- **CTA 버튼/배지 등 accent 배경 + paper 텍스트 조합**(`DetailSectionRenderer.tsx`/
  `export-detail-html.ts`에서 `theme.accent`/`theme.deepAccent`를 배경으로 흰 텍스트를
  얹는 자리들 — 정확한 위치는 Cursor가 grep으로 특정) — 마찬가지로 검증 없음.

## 작업 — 감사만 먼저, 수정은 실제로 미달인 조합만

**1단계(필수): 감사 스크립트로 실측**

`scripts/188cha-contrast-audit.ts` 신규 작성. `contrastRatioToken()`을 그대로 import해서
재사용하세요(새 대비 계산 로직 발명 금지 — 이미 있는 걸 또 만들지 않기, 158/159차 원칙).

1. 6개 카테고리 × 4개 변형(base/warm/cool/bold, `hueShiftTheme` 경로)에서 실제
   `CategoryTheme` 값을 뽑아내세요(폴백 팔레트 기준 — 사진 추출은 런타임 의존이라 생략
   가능, 폴백만으로도 스펙트럼 커버 충분).
2. 위에서 지목한 조합들(하드 콘트라스트 블록의 `inkDeep`/`inkAccent` 배경 + `BRAND.paper`
   텍스트, CTA/배지의 accent 배경 + paper 텍스트 — grep으로 실제 렌더러 코드에서 accent
   계열을 배경으로 흰 텍스트를 얹는 자리를 전부 찾아 목록화)마다 `contrastRatioToken()`으로
   대비값을 계산하세요.
3. **본문 텍스트는 4.5:1, 큰 텍스트(24px 이상 또는 굵은 18px 이상)·UI 컴포넌트(버튼 등)는
   3:1**(WCAG AA 기준, `ensureReadableNeutralHue`가 쓰는 것과 동일 체계)로 판정하세요.
4. 24개 조합(6카테고리×4변형) × 대상 조합 수 전부를 표로 출력하고, 미달 건수를 보고하세요.
   **미달이 0건이면 그것도 정직한 결과입니다** — 억지로 문제를 만들지 마세요(148/159차 원칙).

**2단계(미달 건이 있을 때만): 최소 수정**

미달로 확인된 조합만, `ensureReadableNeutralHue()`와 같은 패턴(배경 쪽 명도를 필요한
만큼만 조금씩 올리거나, `mixHex`의 ink 비율을 살짝 올림)으로 대비 기준을 넘길 때까지만
조정하세요. **3색 토큰 시스템(accentColor/baseNeutral/deepAccent)에 새 색상을 추가하지
않고, 기존 값의 명도/혼합비만 조정**하세요 — 색상환(hue) 자체는 건드리지 마세요(사용자가
이미 여러 라운드에 걸쳐 확정한 팔레트 정체성 유지).

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. 감사 스크립트 실행 결과(표 전체 — 몇 건 중 몇 건 미달인지 숫자로).
3. 수정이 있었다면: 수정 전/후 대비값 비교(숫자만, before→after), 그리고 export HTML
   sha256으로 "의도한 조합 외 변화 없음" 확인(179~184차와 동일 방식).
4. 스크린샷/카테고리별 QA 불필요 — 이번은 수치 감사이지 시각 변경 라운드가 아닙니다
   (미달이 없으면 코드 변경 자체가 없을 수도 있음).

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- 새 대비 계산 로직 발명 금지 — `contrastRatioToken()` 재사용.
- 색상환(hue)·3색 토큰 체계 변경 없음, 미달 조합의 명도/혼합비만 조정.
- `comparison-chart-guard.ts`, `assign-section-images.ts` 미수정.
- 174~187차가 끝낸 아이콘/elevation/radius/font/hero/display-budget/patch/그레인 매칭
  재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약 + 감사 표(숫자) + (수정이 있었다면) diff. 미달 0건이면 "감사 결과 전부 통과,
코드 변경 없음"으로 짧게 끝내도 됩니다.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/188cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다.
