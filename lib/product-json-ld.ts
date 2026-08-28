import type { DetailSection } from "@/lib/types/generate";

export type ProductJsonLdInput = {
  productName: string;
  brandName?: string | null;
  price: number;
  description?: string;
  imageUrls?: string[];
  category?: string;
  sections?: DetailSection[];
};

/** FAQ 섹션 → FAQPage 스키마 (네이버·AI 검색용 구조화 데이터) */
function buildFaqJsonLd(sections: DetailSection[]): object | null {
  const faq = sections.find((s) => s.type === "faq");
  if (!faq || faq.type !== "faq" || faq.items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** Product + Offer JSON-LD — 쿠팡·자사몰·LLM 인용 공통 신호 */
export function buildProductJsonLd(input: ProductJsonLdInput): object[] {
  const schemas: object[] = [];
  const images = (input.imageUrls ?? []).filter(Boolean).slice(0, 8);

  schemas.push({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.productName,
    description: input.description?.trim() || undefined,
    image: images.length > 0 ? images : undefined,
    brand: input.brandName
      ? { "@type": "Brand", name: input.brandName }
      : undefined,
    category: input.category || undefined,
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: "KRW",
      availability: "https://schema.org/InStock",
      url: "#",
    },
  });

  const faq = buildFaqJsonLd(input.sections ?? []);
  if (faq) schemas.push(faq);

  return schemas;
}

export function serializeJsonLdScripts(schemas: object[]): string {
  return schemas
    .map(
      (schema) =>
        `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n");
}
