import type { DetailSection } from "@/lib/types/generate";
import { extractBenefitKeywords } from "@/lib/marketplace-pdp-patterns";
import { parseCertificationTokens } from "@/lib/enrich-product-sections";
import { FLAT_SECTION_SURFACES } from "@/lib/design-tokens";

/** 히어로 직후 혜택·신뢰 스트립 — CTA 배지·배송·인증·스펙 행에서 추출 */
export function extractTrustChips(
  sections: DetailSection[],
  options?: { keyFeatures?: string | null },
): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || t.length > 32) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    if (/판매자 확인|판매자 정책|확인 필요/i.test(t)) return;
    seen.add(key);
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
