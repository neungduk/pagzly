# 227차 — "Before/After 효과 비교" 입력 기능 신설 (A안: 화장품/뷰티·반려동물·식품/건강기능식품 제외)

생성: 2026-09-18 · 유료 API 0건 필수 · 이 라운드는 신규 입력 기능(코드 다건) — 정확히 아래 스펙대로만

## 0. 배경 (읽고 시작할 것)

- 226차: 쿠팡 반려동물 사료 크롤링에서 "Before/After 실사진 비교" 패턴 발견(`226cha-coupang-pet-crawl-findings.md`).
- 227차 설계 검토(`227cha-before-after-input-design-review.md`): 이 기능의 핵심 리스크는 UI가 아니라
  **법적 리스크** — Pagzly가 이미 컴플라이언스 모듈(`lib/cosmetics-compliance.ts`/`lib/pet-compliance.ts`/
  `lib/food-compliance.ts`)을 둔 3개 카테고리(화장품/뷰티·반려동물·식품/건강기능식품)가 바로 "효과·효능을
  확정적으로 주장"하는 게 법적으로 민감한 카테고리이고, Before/After 사진은 텍스트 regex로 순화할 수
  없는 효능 주장이라 이 3개 카테고리에서는 **서버가 섹션 자체를 만들지 않는다**(사용자가 A안 채택).
- **절대 원칙**: 이 섹션은 `review_highlight`와 동일하게 **AI가 생성하지 않는다** — 사진도 캡션도 전부
  판매자가 직접 업로드/입력한 값 그대로만 쓴다. DeepSeek 프롬프트에 이 섹션을 만들라고 지시하지 않는다.

## 1. 신규 파일 — `lib/before-after-eligibility.ts`

```ts
/**
 * 227차 — Before/After 효과 비교 사진은 효능·효과 표시가 법적으로 민감한
 * 3개 카테고리(화장품/뷰티, 반려동물, 식품/건강기능식품 — 이미 컴플라이언스
 * 모듈이 있는 카테고리와 정확히 동일)에서는 제공하지 않는다. 사진 비교는
 * 텍스트처럼 regex로 순화할 수 없는 효능 주장이라 클라이언트 UI뿐 아니라
 * 서버(insertBeforeAfterSection)에서도 최종 차단한다.
 */
const BEFORE_AFTER_EXCLUDED_CATEGORIES = new Set([
  "화장품/뷰티",
  "반려동물",
  "식품/건강기능식품",
]);

export function isBeforeAfterEligibleCategory(category: string): boolean {
  return !BEFORE_AFTER_EXCLUDED_CATEGORIES.has(category);
}

/** AI 미생성 고정 문구 — INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE(160차)와 동일 원칙 */
export const BEFORE_AFTER_COMPLIANCE_NOTE =
  "*개인차가 있을 수 있으며, 사용 경험은 실제 구매자가 제공한 사진입니다.";
```

## 2. `lib/types/generate.ts` — 타입 추가

### 2-1. `ProductInput`에 필드 추가 (기존 `sellerTrustEvidence?` 필드 바로 아래에)

```ts
  /**
   * 227차 — 효과 비교 Before/After 사진 쌍(판매자 실사진만, AI 미생성).
   * 화장품/뷰티·반려동물·식품/건강기능식품에서는 서버가 무시한다
   * (입력해도 섹션이 생성되지 않음 — lib/before-after-eligibility.ts 참고).
   */
  beforeAfterPairs?: { beforeUrl: string; afterUrl: string; caption?: string | null }[] | null;
```

### 2-2. 신규 섹션 타입 — `ReviewHighlightSection` 정의 바로 아래에 추가

```ts
/**
 * 227차 — 판매자가 업로드한 실제 Before/After 비교 사진.
 * review_highlight와 동일 원칙: AI는 이 섹션을 생성하지 않으며, 서버가 조립
 * 단계에서 실입력값을 그대로 주입한다. caption도 사용자가 직접 입력한 값만
 * 사용 — AI가 효과를 서술하는 문구를 새로 짓지 않는다.
 */
export type BeforeAfterSection = {
  type: "before_after";
  slot: string;
  heading: string;
  pairs: { beforeUrl: string; afterUrl: string; caption?: string | null }[];
};
```

### 2-3. `DetailSection` union에 추가

`| ReviewHighlightSection` 줄 바로 아래(또는 옆)에 `| BeforeAfterSection` 추가.

### 2-4. AI 스키마 설명 블록에 "생성 금지" 주석 추가 (일관성 목적)

`review_highlight:` 항목(약 550행, `"{ type: "review_highlight", ... } — AI는 이 섹션을 생성하지 않음..."`)
바로 아래 줄에 동일 형식으로 추가:

```ts
  before_after: `{ type: "before_after", slot: "before_after", heading, pairs: {beforeUrl,afterUrl,caption?}[] } — AI는 이 섹션을 생성하지 않음. 판매자가 효과 비교 사진을 업로드했고 카테고리가 허용 대상일 때만 서버가 조립 단계에서 자동 삽입`,
```

## 3. `lib/section-inserts.ts` — 서버 조립 함수 추가

파일 상단 import에 추가:

```ts
import { isBeforeAfterEligibleCategory } from "@/lib/before-after-eligibility";
import type { BeforeAfterSection } from "@/lib/types/generate";
```

(기존 `import type { DetailSection, HighlightBoxSection, ReviewHighlightSection, CanvasSection, ComparisonChartSection } from "@/lib/types/generate";` 줄에 `BeforeAfterSection`을 함께 추가해도 됨 — 아래는 별도 줄로 표기.)

파일 끝(`insertEmptyCanvasSection` 뒤)에 함수 추가:

```ts
/**
 * 227차 — 판매자가 업로드한 Before/After 비교 사진 쌍을 서버가 그대로 조립.
 * AI 미생성. 효능·효과 표시가 민감한 3개 카테고리(화장품/뷰티·반려동물·
 * 식품/건강기능식품)는 pairs가 있어도 섹션을 만들지 않는다 — 클라이언트
 * UI가 이미 그 카테고리에서 입력 자체를 숨기지만, 서버가 최종 방어선.
 * 삽입 위치: review_highlight 바로 뒤(있으면 — 실제 후기와 나란히 노출),
 * 없으면 ai_disclosure/cta_price 직전(review_highlight/axis-comparison과 동일 관례).
 */
export function insertBeforeAfterSection(
  sections: DetailSection[],
  pairs: { beforeUrl: string; afterUrl: string; caption?: string | null }[] | null | undefined,
  category: string,
): DetailSection[] {
  if (!pairs || pairs.length === 0) return sections;
  if (!isBeforeAfterEligibleCategory(category)) return sections;

  const validPairs = pairs
    .filter((p) => p.beforeUrl?.trim() && p.afterUrl?.trim())
    .slice(0, 4);
  if (validPairs.length === 0) return sections;

  if (sections.some((s) => s.type === "before_after" || s.slot === "before_after")) {
    return sections;
  }

  const section: BeforeAfterSection = {
    type: "before_after",
    slot: "before_after",
    heading: "실제 사용 전후",
    pairs: validPairs,
  };

  const without = sections.filter(
    (s) => s.slot !== "before_after" && s.type !== "before_after",
  );
  const reviewHighlightIdx = without.findIndex(
    (s) => s.type === "review_highlight" || s.slot === "review_highlight",
  );
  const anchorIdx = without.findIndex(
    (s) => s.type === "ai_disclosure" || s.slot === "cta_price" || s.type === "cta_price",
  );
  const insertAt =
    reviewHighlightIdx >= 0
      ? reviewHighlightIdx + 1
      : anchorIdx >= 0
        ? anchorIdx
        : without.length;

  return [...without.slice(0, insertAt), section, ...without.slice(insertAt)];
}
```

## 4. `app/api/generate/route.ts` — 배선

### 4-1. import 추가

`import { insertReviewHighlightSection, insertReviewAxisComparisonSection, insertSellerTrustEvidence } from "@/lib/section-inserts";`
줄을 다음으로 교체(같은 파일에서 새 함수도 함께 가져오기):

```ts
import { insertReviewHighlightSection, insertReviewAxisComparisonSection, insertSellerTrustEvidence, insertBeforeAfterSection } from "@/lib/section-inserts";
```

### 4-2. 삽입 호출 — `insertReviewAxisComparisonSection` 블록(약 1724~1741행) 바로 뒤, `applyHeroBadge` 호출 바로 앞에 추가

```ts
    const beforeAfterLen = savedCopy.sections.length;
    savedCopy.sections = insertBeforeAfterSection(
      savedCopy.sections,
      body.beforeAfterPairs,
      body.category,
    );
    if (savedCopy.sections.length > beforeAfterLen) {
      console.log(
        `[before-after] 효과 비교 사진 삽입 (pairs=${body.beforeAfterPairs?.length ?? 0}, AI 미생성)`,
      );
    }
```

`body`는 이미 `(await request.json()) as ProductInput`(1314행)이라 `beforeAfterPairs`는 타입 추가만으로
자동으로 전달됨 — 이 파일에 별도 요청 검증 스키마(zod 등)는 없음(확인 완료), 다른 곳 수정 불필요.

**주의**: `draft` 모드 경로(1521행 근처, cosmetics/pet copy review가 있는 블록)에는 이 삽입을 넣지
않는다 — `insertReviewHighlightSection`/`insertReviewAxisComparisonSection`과 동일하게 **final 조립
단계 1곳에만** 배선한다(중복 삽입 방지 가드가 있지만, 구조적으로 한 곳에만 두는 게 기존 관례).

## 5. `components/CreateProductForm.tsx` — 업로드 UI

### 5-1. import 추가

```ts
import { isBeforeAfterEligibleCategory } from "@/lib/before-after-eligibility";
```

### 5-2. state 추가 (기존 `sellerTrustEvidence` state 근처)

```ts
type BeforeAfterInput = { before: File | null; after: File | null; caption: string };
const [beforeAfterInputs, setBeforeAfterInputs] = useState<BeforeAfterInput[]>([]);
```

### 5-3. 제출 시 업로드 — `uploadAuxFile` 재사용 (기존 `logoImage`/`referenceImage` 업로드 블록,
약 539~556행 바로 뒤에 추가)

```ts
      let beforeAfterPairs: { beforeUrl: string; afterUrl: string; caption: string | null }[] | null =
        null;
      if (isBeforeAfterEligibleCategory(category)) {
        const validInputs = beforeAfterInputs.filter((p) => p.before && p.after);
        if (validInputs.length > 0) {
          beforeAfterPairs = await Promise.all(
            validInputs.map(async (p) => ({
              beforeUrl: await uploadAuxFile(p.before as File, "before-after-before"),
              afterUrl: await uploadAuxFile(p.after as File, "before-after-after"),
              caption: p.caption.trim() || null,
            })),
          );
        }
      }
```

`payload` 객체(약 571~599행)에 `sellerTrustEvidence,` 줄 바로 아래 `beforeAfterPairs,` 추가.

### 5-4. UI 블록 — "추가 옵션"(`sellerTrustEvidence` 입력이 있는 `<section className={sectionClass}>`,
약 1461~1480행) 안, `sellerTrustEvidence` 입력 바로 뒤에 추가. **카테고리가 허용 대상일 때만 렌더링**:

```tsx
              {isBeforeAfterEligibleCategory(category) ? (
                <div>
                  <label className={labelClass}>효과 비교 사진 (선택)</label>
                  <p className="mt-1.5 text-xs text-ink/40">
                    실제 사용 전/후 사진이 있다면 쌍으로 올려주세요. AI가 사진이나 효과 설명을
                    새로 만들지 않으며, 업로드한 사진·캡션 그대로만 노출됩니다.
                  </p>
                  <div className="mt-3 space-y-3">
                    {beforeAfterInputs.map((pair, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-3">
                        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-line px-3 py-2 text-xs text-ink/60 hover:border-registration-red/40">
                          {pair.before ? pair.before.name.slice(0, 12) : "전(Before) 선택"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setBeforeAfterInputs((prev) =>
                                prev.map((p, idx) => (idx === i ? { ...p, before: file } : p)),
                              );
                            }}
                          />
                        </label>
                        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-line px-3 py-2 text-xs text-ink/60 hover:border-registration-red/40">
                          {pair.after ? pair.after.name.slice(0, 12) : "후(After) 선택"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setBeforeAfterInputs((prev) =>
                                prev.map((p, idx) => (idx === i ? { ...p, after: file } : p)),
                              );
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          value={pair.caption}
                          onChange={(e) =>
                            setBeforeAfterInputs((prev) =>
                              prev.map((p, idx) =>
                                idx === i ? { ...p, caption: e.target.value } : p,
                              ),
                            )
                          }
                          placeholder="캡션(선택, 예: 2주 사용 후)"
                          className={`${inputClass} flex-1 basis-40`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBeforeAfterInputs((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="text-xs text-ink/40 hover:text-registration-red"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                    {beforeAfterInputs.length < 4 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setBeforeAfterInputs((prev) => [
                            ...prev,
                            { before: null, after: null, caption: "" },
                          ])
                        }
                        className="text-xs font-medium text-registration-red hover:underline"
                      >
                        + 비교 사진 쌍 추가
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
```

카테고리를 화장품/뷰티·반려동물·식품/건강기능식품으로 바꾸면 이 블록이 사라지고, 이미 입력해 둔
`beforeAfterInputs`는 제출 시 5-3의 `isBeforeAfterEligibleCategory(category)` 체크로 무시됨(별도
초기화 로직 불필요, 상태만 남아있어도 전송 안 됨).

## 6. `components/DetailSectionRenderer.tsx` — 라이브 렌더링

`case "review_highlight": {` 블록 바로 뒤(그 블록의 닫는 `}` 다음)에 새 case 추가:

```tsx
    case "before_after": {
      if (!section.pairs || section.pairs.length === 0) return null;
      return (
        <section
          key={`before_after-${index}`}
          data-testid="before-after"
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
            {section.pairs.map((pair, i) => (
              <div key={i}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pair.beforeUrl}
                      alt={`${section.heading} Before ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover"
                    />
                    <span
                      className="absolute left-4 top-4 rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-[0.28em] text-paper"
                      style={{ backgroundColor: hexToRgba(solidDeepOnPaper(theme), 0.9) }}
                    >
                      BEFORE
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pair.afterUrl}
                      alt={`${section.heading} After ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover"
                    />
                    <span
                      className="absolute left-4 top-4 rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-[0.28em] text-paper"
                      style={{ backgroundColor: hexToRgba(theme.accent, 0.9) }}
                    >
                      AFTER
                    </span>
                  </div>
                </div>
                {pair.caption ? (
                  <p className="mt-2 text-center text-xs text-ink/60">{pair.caption}</p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-xl text-center text-[11px] text-ink/40">
            {BEFORE_AFTER_COMPLIANCE_NOTE}
          </p>
        </section>
      );
    }
```

파일 상단 import에 추가: `import { BEFORE_AFTER_COMPLIANCE_NOTE } from "@/lib/before-after-eligibility";`
(`hexToRgba`/`solidDeepOnPaper`/`getCategoryRhythm`/`textSectionStyle`/`TYPO`/`HEADLINE_CLAMP`/
`TEXT_COL_CLASS`/`SectionAccentHairline`/`EditableText`는 이미 이 파일에서 review_highlight가 쓰고
있으므로 추가 import 불필요.)

## 7. `lib/export-detail-html.ts` — export 정적 HTML

`case "review_highlight":`가 917행에 이미 있음(확인 완료) — 그 case 블록이 끝나는 지점 바로 뒤에
새 case를 추가(review_highlight와 나란히 두어 가독성 유지). switch문 안이면 다른 위치여도 동작은
동일함:

```ts
    case "before_after": {
      if (!section.pairs || section.pairs.length === 0) return "";
      const pairsHtml = section.pairs
        .map(
          (pair, i) => `<div style="margin-bottom:24px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div style="position:relative;overflow:hidden;border-radius:${RADIUS.lg}px">
                <img src="${esc(pair.beforeUrl)}" alt="${esc(section.heading)} Before ${i + 1}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:1;object-fit:cover;display:block"/>
                <span style="position:absolute;left:16px;top:16px;background:${hexToRgba(deepFill, 0.9)};color:#FAF8F3;font-size:${FONT_SIZE.label};font-weight:700;letter-spacing:.28em;padding:6px 12px;border-radius:${RADIUS.pill}px">BEFORE</span>
              </div>
              <div style="position:relative;overflow:hidden;border-radius:${RADIUS.lg}px">
                <img src="${esc(pair.afterUrl)}" alt="${esc(section.heading)} After ${i + 1}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:1;object-fit:cover;display:block"/>
                <span style="position:absolute;left:16px;top:16px;background:${hexToRgba(accent, 0.9)};color:#FAF8F3;font-size:${FONT_SIZE.label};font-weight:700;letter-spacing:.28em;padding:6px 12px;border-radius:${RADIUS.pill}px">AFTER</span>
              </div>
            </div>
            ${pair.caption ? `<p style="margin:8px 0 0;text-align:center;font-size:${FONT_SIZE.xs};color:rgba(27,27,24,.6)">${esc(pair.caption)}</p>` : ""}
          </div>`,
        )
        .join("");
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;font-size:${FONT_SIZE.section}`)}
        <div style="max-width:640px;margin:32px auto 0">${pairsHtml}</div>
        <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:${FONT_SIZE.caption};opacity:.4">${esc(BEFORE_AFTER_COMPLIANCE_NOTE)}</p>
      </section>`;
    }
```

파일 상단 import에 추가: `import { BEFORE_AFTER_COMPLIANCE_NOTE } from "@/lib/before-after-eligibility";`
(`RADIUS`/`FONT_SIZE`/`hexToRgba`/`esc`/`dh2`는 이미 이 파일에 있으므로 추가 import 불필요. `deepFill`/
`accent`는 `sectionHtml()` 함수 내부에서 이미 계산되는 지역 변수이므로 그대로 씀.)

## 8. 범위 밖 (건드리지 않음)

- DeepSeek 프롬프트(`buildPrompt` 등)에 before_after를 생성하라고 지시하지 않는다 — §2-4는 "생성
  금지" 설명 목적의 스키마 문서 추가일 뿐, 실제 생성 유도가 아니다.
- 3개 제외 카테고리(화장품/뷰티·반려동물·식품/건강기능식품)의 컴플라이언스 모듈(`*-compliance.ts`)은
  전혀 수정하지 않는다.
- 기존 `review_highlight`/`comparison_chart`/`sellerTrustEvidence` 삽입 로직은 건드리지 않는다.
- Export에 `review_highlight` case가 이미 없다면(위 §7 참고) 이번 라운드에서 새로 추가하지 않는다 —
  발견만 리포트에 남길 것.

## 9. 검증 요청

- `tsc --noEmit` 0.
- 유닛/시뮬레이션: (a) `insertBeforeAfterSection` — 3개 제외 카테고리는 pairs가 있어도 섹션 미생성,
  나머지 카테고리는 생성, `beforeUrl`/`afterUrl` 둘 다 없는 쌍은 필터링, 최대 4쌍 제한, 중복 삽입
  안 됨, review_highlight가 있을 때 그 바로 뒤에 삽입됨(없을 땐 cta_price 직전) — 6개 이상 케이스.
  (b) `isBeforeAfterEligibleCategory` — 6개 카테고리 전부 boolean 확인.
- 합성 payload로 `/api/generate` draft→final 경로 실행(유료 API 0건 — 기존 세션 재사용 또는 목업)해
  `beforeAfterPairs` 2쌍 입력 시 전자제품 카테고리에선 섹션 생성, 반려동물 카테고리에선 미생성을
  실측 확인.
- 스크린샷: 전자제품 카테고리로 합성 2쌍 입력 → 라이브 미리보기 + export HTML 둘 다 BEFORE/AFTER
  배지·캡션·컴플라이언스 각주가 보이는지 캡처.
- `CreateProductForm.tsx`: 카테고리를 화장품/뷰티로 바꿨을 때 업로드 블록이 사라지는지, 다시 전자제품
  으로 바꾸면 다시 나타나는지 화면 확인.

## 10. 완료 기준

- [ ] `lib/before-after-eligibility.ts` 신규
- [ ] `lib/types/generate.ts` 타입 3곳(ProductInput 필드, BeforeAfterSection, union) + 스키마 설명 추가
- [ ] `lib/section-inserts.ts`에 `insertBeforeAfterSection` 추가
- [ ] `app/api/generate/route.ts` 배선(import + 삽입 호출)
- [ ] `CreateProductForm.tsx` state + 업로드 + UI 블록(카테고리 게이팅 포함)
- [ ] `DetailSectionRenderer.tsx` 라이브 렌더링
- [ ] `lib/export-detail-html.ts` export 렌더링(단, review_highlight가 export에 없다면 발견만 보고)
- [ ] `tsc` 0 · 유료 API 0건
- [ ] 검증 스크립트 + 스크린샷
