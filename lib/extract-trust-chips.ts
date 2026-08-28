import type { DetailSection } from "@/lib/types/generate";
import { parseCertificationTokens } from "@/lib/enrich-product-sections";

/** 히어로 직후 신뢰 스트립 — CTA 배지·인증·스펙 행에서 추출 (Page Maker/Kurly 스타일) */
export function extractTrustChips(sections: DetailSection[]): string[] {
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

  return chips.slice(0, 6);
}
