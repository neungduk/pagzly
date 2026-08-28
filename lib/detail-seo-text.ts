import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 섹션에서 검색·AI가 읽을 수 있는 본문 텍스트 추출 */
export function collectSectionPlainText(section: DetailSection): string[] {
  const lines: string[] = [];
  switch (section.type) {
    case "hero":
      lines.push(section.headline);
      if (section.subheadline) lines.push(section.subheadline);
      break;
    case "checklist":
      lines.push(section.heading, ...section.items);
      break;
    case "image_text":
      lines.push(section.heading, section.body);
      if (section.callout) lines.push(section.callout);
      break;
    case "highlight_box":
      lines.push(section.heading);
      section.cards.forEach((c) => lines.push(c.title, c.body));
      break;
    case "step_card":
      lines.push(section.heading);
      section.steps.forEach((s) => lines.push(s.title, s.body));
      break;
    case "stat_infographic":
      lines.push(section.heading);
      section.metrics.forEach((m) => lines.push(`${m.label}: ${m.value}`));
      break;
    case "spec_table":
      lines.push(section.heading);
      section.rows.forEach((r) => lines.push(`${r.label}: ${r.value}`));
      break;
    case "faq":
      lines.push(section.heading);
      section.items.forEach((i) => lines.push(`Q: ${i.question}`, `A: ${i.answer}`));
      break;
    case "caution":
    case "brand_story":
    case "ai_disclosure":
      lines.push(section.heading, section.body);
      break;
    case "usage_steps":
      lines.push(section.heading, ...section.steps);
      break;
    case "cta_price":
      lines.push(`가격: ₩${section.price.toLocaleString("ko-KR")}`);
      if (section.targetCustomer) lines.push(section.targetCustomer);
      if (section.badges) lines.push(...section.badges);
      break;
    case "comparison_chart":
      lines.push(section.heading);
      section.metrics.forEach((m) =>
        lines.push(`${m.label}: ${section.ourLabel} ${m.ourValue}, ${section.baselineLabel} ${m.baselineValue}`),
      );
      break;
    case "comparison_table":
      lines.push(section.heading);
      section.rows.forEach((r) => lines.push(`${r.label}: ${r.values.join(" / ")}`));
      break;
    case "target_persona":
      lines.push(section.heading, ...section.personas);
      break;
    case "review_highlight":
      lines.push(section.heading, ...section.praises);
      break;
    default:
      if ("heading" in section && typeof section.heading === "string") {
        lines.push(section.heading);
      }
      if ("body" in section && typeof section.body === "string") {
        lines.push(section.body);
      }
  }
  return lines.filter((l) => l.trim().length > 0);
}

/**
 * 통이미지 상세의 약점(텍스트 부재)을 보완 — HTML export·미리보기에 숨김 텍스트 블록 생성.
 * 시각 레이아웃은 이미지 섹션, 본문은 검색·AI가 파싱 가능.
 */
export function buildSeoTextBlockHtml(opts: {
  productName: string;
  brandName?: string | null;
  category: string;
  copy?: Pick<
    GeneratedCopy,
    "description" | "features" | "howToUse" | "caution" | "headlines"
  >;
  sections: DetailSection[];
  certifications?: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`<h1>${esc(opts.productName)}</h1>`);
  if (opts.brandName) parts.push(`<p><strong>브랜드</strong> ${esc(opts.brandName)}</p>`);
  parts.push(`<p><strong>카테고리</strong> ${esc(opts.category)}</p>`);

  if (opts.copy?.description?.trim()) {
    parts.push(`<section><h2>상품 설명</h2><p>${esc(opts.copy.description.trim())}</p></section>`);
  }
  if (opts.copy?.features?.length) {
    parts.push(
      `<section><h2>주요 특징</h2><ul>${opts.copy.features
        .map((f) => `<li>${esc(f)}</li>`)
        .join("")}</ul></section>`,
    );
  }
  if (opts.copy?.howToUse?.trim()) {
    parts.push(`<section><h2>사용 방법</h2><p>${esc(opts.copy.howToUse.trim())}</p></section>`);
  }
  if (opts.copy?.caution?.trim()) {
    parts.push(`<section><h2>주의사항</h2><p>${esc(opts.copy.caution.trim())}</p></section>`);
  }
  if (opts.certifications?.trim()) {
    parts.push(
      `<section><h2>인증·수상</h2><p>${esc(opts.certifications.trim())}</p></section>`,
    );
  }

  const sectionTexts = opts.sections.flatMap(collectSectionPlainText);
  if (sectionTexts.length > 0) {
    parts.push(
      `<section><h2>상세 정보</h2><ul>${sectionTexts
        .slice(0, 80)
        .map((t) => `<li>${esc(t)}</li>`)
        .join("")}</ul></section>`,
    );
  }

  return `<article class="pagzly-seo-text" aria-label="상품 정보 텍스트 요약">${parts.join("")}</article>`;
}
