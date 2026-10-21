/**
 * 428차 2-4 — 히어로 직후 한 줄 "가격·혜택 스트립"(디자인 V2, 뷰티·패션). 423차: 첫 화면에 가격·혜택이 없었다(레퍼런스는 첫 화면에 둠).
 * 문구는 모두 입력에서 온다 — 상품명은 입력 그대로(한 줄 말줄임), 가격은 구매 카드(cta_price)의 값, 혜택 칩은 구매 카드 배지 중 배송·적립·무료·쿠폰·증정 류 최대 2개.
 * 가격이 없으면 스트립 자체를 만들지 않는다. 숫자 게이트(424차)를 통과하지 못하는 칩은 뺀다. 높이 56px(≤64px).
 * 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 같은 마크업(data-pz-strip…)과 같은 CSS(lib/design-v2 stripCss)를 쓴다.
 */
import { checkText, type ClaimFacts } from "@/lib/numeric-claim-gate";

export type PriceStrip = { name: string; price: string; chips: string[] };

/** 혜택 칩으로 인정하는 말 */
const BENEFIT_RE = /배송|적립|무료|쿠폰|증정|사은|포인트|할인/;
const MAX_CHIPS = 2;
const MAX_CHIP_LEN = 14;
/** 스트립 높이(px) — 회귀가 ≤64를 확인한다 */
export const PRICE_STRIP_HEIGHT_PX = 56;

type SectionLike = { type: string; price?: unknown; badges?: unknown };

export function buildPriceStrip(sections: ReadonlyArray<SectionLike>, productName: string | undefined | null, facts?: ClaimFacts): PriceStrip | null {
  const cta = sections.find((s) => s.type === "cta_price");
  const price = typeof cta?.price === "number" && Number.isFinite(cta.price) ? cta.price : 0;
  if (!cta || price <= 0) return null;
  const rawBadges = Array.isArray(cta.badges) ? (cta.badges as unknown[]).filter((b): b is string => typeof b === "string") : [];
  const chips = rawBadges
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && b.length <= MAX_CHIP_LEN && BENEFIT_RE.test(b))
    .filter((b) => !facts || !checkText(b, facts).bad)
    .slice(0, MAX_CHIPS);
  return { name: (productName ?? "").trim(), price: `₩${price.toLocaleString("ko-KR")}`, chips };
}

/** 스트립 CSS(라이브·export 공용). scope = `[data-pz-v2]` 또는 `.pagzly-wrap` */
export function stripCss(scope: string, ink: string, accent: string): string {
  const S = `${scope} [data-pz-strip]`;
  return (
    `${S}{display:flex;align-items:center;gap:10px;height:${PRICE_STRIP_HEIGHT_PX}px;box-sizing:border-box;padding:0 20px;background:#FFFFFF;border-bottom:1px solid rgba(27,27,24,0.08);overflow:hidden;white-space:nowrap}` +
    `${S} [data-pz-strip-price]{flex:none;font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${ink}}` +
    `${S} [data-pz-strip-name]{flex:1 1 0%;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:13px;font-weight:500;color:rgba(27,27,24,0.72)}` +
    `${S} [data-pz-strip-chip]{flex:none;padding:5px 10px;border-radius:999px;background:rgba(27,27,24,0.06);font-size:11px;font-weight:700;color:${accent}}`
  );
}

/** export(문자열) 마크업 — 라이브 JSX와 같은 구조·속성 */
export function priceStripHtml(strip: PriceStrip, esc: (s: string) => string): string {
  return (
    `<div data-pz-strip>` +
    `<span data-pz-strip-price>${esc(strip.price)}</span>` +
    (strip.name ? `<span data-pz-strip-name>${esc(strip.name)}</span>` : "") +
    strip.chips.map((c) => `<span data-pz-strip-chip>${esc(c)}</span>`).join("") +
    `</div>`
  );
}
