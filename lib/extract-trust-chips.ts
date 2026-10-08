import type { DetailSection } from "@/lib/types/generate";
import { extractBenefitKeywords } from "@/lib/marketplace-pdp-patterns";
import { parseCertificationTokens } from "@/lib/enrich-product-sections";
import { FLAT_SECTION_SURFACES } from "@/lib/design-tokens";

/** "피부자극 테스트 완료(자체, n=32)" → 본문 "피부자극 테스트 완료" + 보조 "자체, n=32" */
export function splitChipCaption(chip: string): { main: string; sub: string | null } {
  const m = chip.trim().match(/^(.+?)\s*\(([^()]+)\)$/);
  if (!m || m[1]!.trim().length < 2) return { main: chip.trim(), sub: null };
  return { main: m[1]!.trim(), sub: m[2]!.trim() };
}

/** 히어로 직후 혜택·신뢰 스트립 — CTA 배지·배송·인증·스펙 행에서 추출 */
export function extractTrustChips(
  sections: DetailSection[],
  options?: { keyFeatures?: string | null },
): string[] {
  const chips: string[] = [];
  // 괄호 보조 문구만 다른 칩("…완료" / "…완료(자체, n=32)")은 같은 칩 — 보조 문구 있는 쪽을 남긴다
  const seen = new Map<string, number>();

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || t.length > 32) return;
    if (/판매자 확인|판매자 정책|확인 필요/i.test(t)) return;
    const { main, sub } = splitChipCaption(t);
    const key = main.toLowerCase().replace(/\s+/g, "");
    const at = seen.get(key);
    if (at != null) {
      if (sub && !splitChipCaption(chips[at]!).sub) chips[at] = t;
      return;
    }
    seen.set(key, chips.length);
    chips.push(t);
  };

  const cta = sections.find((s) => s.type === "cta_price");
  if (cta?.type === "cta_price" && cta.badges) {
    for (const b of cta.badges) add(b);
  }

  for (const section of sections) {
    if (section.type !== "spec_table") continue;
    for (const row of section.rows) {
      if (/인증|수상|kc|KC|허가|원산지|제조국/i.test(row.label) && row.value) {
        const originLabel = row.label.match(/원산지|제조국/)?.[0];
        // "대한민국"만 단독으로 두면 무엇의 국가인지 알 수 없다
        if (originLabel) {
          const v = row.value.trim();
          add(/원산지|제조|생산|made\s*in/i.test(v) ? v : `${originLabel} ${v}`);
          continue;
        }
        const parts = parseCertificationTokens(row.value);
        if (parts.length > 0) {
          for (const p of parts) add(p);
        } else {
          add(row.value);
        }
      }
    }
  }

  const hero = sections.find((s) => s.type === "hero");
  if (hero?.type === "hero" && hero.badge) add(hero.badge);

  const shippingRows: string[] = [];
  for (const section of sections) {
    if (section.type !== "spec_table" || section.slot !== "shipping_info") continue;
    for (const row of section.rows) {
      shippingRows.push(`${row.label} ${row.value}`);
    }
  }

  for (const benefit of extractBenefitKeywords([
    options?.keyFeatures,
    ...shippingRows,
  ])) {
    add(benefit);
  }

  // 칸 하나짜리 요약 그리드는 빈 띠처럼 보인다
  if (FLAT_SECTION_SURFACES && chips.length < 2) return [];
  return chips.slice(0, 6);
}
