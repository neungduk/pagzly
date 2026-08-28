import type { DetailSection } from "@/lib/types/generate";
import { DETAIL_FONT_STACK, DETAIL_GOOGLE_FONTS_URL } from "@/lib/detail-typography";

export type BlogBlockKind =
  | "intro"
  | "heading"
  | "paragraph"
  | "image"
  | "bullet_list"
  | "faq"
  | "quote"
  | "cta"
  | "notice";

export type BlogBlock = {
  id: string;
  kind: BlogBlockKind;
  heading?: string;
  body: string;
  imageUrl?: string;
  imageCaption?: string;
  listItems?: string[];
  faqQuestion?: string;
};

export type BlogPostDraft = {
  title: string;
  excerpt: string;
  tags: string[];
  blocks: BlogBlock[];
};

export type BlogBlockOverride = {
  heading?: string;
  body?: string;
  imageUrl?: string;
  imageIndex?: number;
  imageCaption?: string;
  hidden?: boolean;
  faqQuestion?: string;
  listItems?: string[];
};

export type BlogPostGlobalOverride = {
  title?: string;
  excerpt?: string;
  tags?: string[];
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveImage(imageUrls: string[], index: number | undefined): string {
  if (typeof index === "number" && imageUrls[index]) return imageUrls[index];
  return imageUrls[0] ?? "";
}

function uniqueTags(...parts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (!part?.trim()) continue;
    for (const token of part.split(/[,\s·|/]+/).map((t) => t.trim()).filter(Boolean)) {
      if (token.length < 2 || seen.has(token)) continue;
      seen.add(token);
      out.push(token);
    }
  }
  return out.slice(0, 8);
}

function pushBlock(blocks: BlogBlock[], block: BlogBlock) {
  if (!block.body.trim() && !block.heading?.trim() && !block.imageUrl && !block.listItems?.length) {
    return;
  }
  blocks.push(block);
}

function sectionToBlocks(
  section: DetailSection,
  imageUrls: string[],
  blockIdPrefix: string,
): BlogBlock[] {
  const blocks: BlogBlock[] = [];

  switch (section.type) {
    case "hero":
      if (section.subheadline?.trim()) {
        pushBlock(blocks, {
          id: `${blockIdPrefix}-intro`,
          kind: "intro",
          body: section.subheadline.trim(),
        });
      }
      if (imageUrls.length > 0) {
        pushBlock(blocks, {
          id: `${blockIdPrefix}-hero-img`,
          kind: "image",
          body: "",
          imageUrl: resolveImage(imageUrls, section.imageIndex),
          imageCaption: section.headline,
        });
      }
      break;

    case "checklist":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      pushBlock(blocks, {
        id: `${blockIdPrefix}-list`,
        kind: "bullet_list",
        body: "",
        listItems: section.items.filter(Boolean),
      });
      break;

    case "image_text": {
      if (section.layout === "compact") break;
      const img = resolveImage(imageUrls, section.imageIndex);
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      if (section.body?.trim()) {
        pushBlock(blocks, {
          id: `${blockIdPrefix}-p`,
          kind: "paragraph",
          body: section.body.trim(),
        });
      }
      if (img) {
        pushBlock(blocks, {
          id: `${blockIdPrefix}-img`,
          kind: "image",
          body: "",
          imageUrl: img,
          imageCaption: section.heading,
        });
      }
      break;
    }

    case "highlight_box":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      for (const [i, card] of section.cards.slice(0, 4).entries()) {
        pushBlock(blocks, {
          id: `${blockIdPrefix}-card-${i}`,
          kind: "paragraph",
          heading: card.title,
          body: card.body,
        });
      }
      break;

    case "brand_story":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-quote`,
        kind: "quote",
        heading: section.heading,
        body: section.body?.trim() ?? "",
      });
      break;

    case "step_card":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      pushBlock(blocks, {
        id: `${blockIdPrefix}-steps`,
        kind: "bullet_list",
        body: "",
        listItems: section.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.body}`),
      });
      for (const [i, step] of section.steps.slice(0, 3).entries()) {
        const url = resolveImage(imageUrls, step.imageIndex);
        if (!url) continue;
        pushBlock(blocks, {
          id: `${blockIdPrefix}-step-img-${i}`,
          kind: "image",
          body: "",
          imageUrl: url,
          imageCaption: step.title,
        });
      }
      break;

    case "gallery":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      for (const [i, idx] of section.imageIndexes.slice(0, 6).entries()) {
        const url = resolveImage(imageUrls, idx);
        if (!url) continue;
        pushBlock(blocks, {
          id: `${blockIdPrefix}-gal-${i}`,
          kind: "image",
          body: "",
          imageUrl: url,
          imageCaption: `${section.heading} ${i + 1}`,
        });
      }
      break;

    case "faq":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      for (const [i, item] of section.items.slice(0, 6).entries()) {
        pushBlock(blocks, {
          id: `${blockIdPrefix}-faq-${i}`,
          kind: "faq",
          faqQuestion: item.question,
          body: item.answer,
        });
      }
      break;

    case "usage_steps":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      pushBlock(blocks, {
        id: `${blockIdPrefix}-usage`,
        kind: "bullet_list",
        body: "",
        listItems: section.steps.map((s, i) => `${i + 1}. ${s}`),
      });
      break;

    case "target_persona":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-h`,
        kind: "heading",
        heading: section.heading,
        body: "",
      });
      pushBlock(blocks, {
        id: `${blockIdPrefix}-persona`,
        kind: "bullet_list",
        body: "",
        listItems: section.personas,
      });
      break;

    case "caution":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-notice`,
        kind: "notice",
        heading: section.heading,
        body: section.body?.trim() ?? "",
      });
      break;

    case "cta_price":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-cta`,
        kind: "cta",
        heading: `₩${section.price.toLocaleString("ko-KR")}`,
        body:
          section.targetCustomer?.trim() ||
          "관심 있으시다면 구매 링크에서 자세한 정보를 확인해 보세요.",
      });
      break;

    case "ai_disclosure":
      pushBlock(blocks, {
        id: `${blockIdPrefix}-ai`,
        kind: "notice",
        heading: section.heading,
        body: section.body?.trim() ?? "",
      });
      break;

    default:
      if ("heading" in section && typeof section.heading === "string" && section.heading.trim()) {
        const body =
          "body" in section && typeof section.body === "string" ? section.body.trim() : "";
        pushBlock(blocks, {
          id: `${blockIdPrefix}-generic`,
          kind: body ? "paragraph" : "heading",
          heading: section.heading,
          body,
        });
      }
      break;
  }

  return blocks;
}

/** 상세페이지 섹션·카피로 블로그 초안을 만든다 (규칙 기반, API 비용 없음). */
export function buildBlogPostDraft(opts: {
  productName: string;
  brandName?: string | null;
  category: string;
  sections: DetailSection[];
  imageUrls: string[];
  description?: string;
  features?: string[];
  howToUse?: string;
  caution?: string;
  price?: number;
}): BlogPostDraft {
  const hero = opts.sections.find((s) => s.type === "hero");
  const title =
    hero && hero.type === "hero" && hero.headline.trim()
      ? hero.headline.trim()
      : opts.productName;

  const excerpt =
    opts.description?.trim() ||
    (hero && hero.type === "hero" ? hero.subheadline?.trim() : "") ||
    `${opts.productName} 사용 후기와 특징을 정리했습니다.`;

  const tags = uniqueTags(opts.category, opts.brandName, opts.productName);

  const blocks: BlogBlock[] = [];

  if (opts.description?.trim()) {
    pushBlock(blocks, {
      id: "meta-intro",
      kind: "intro",
      body: opts.description.trim(),
    });
  }

  if (opts.features && opts.features.length > 0) {
    pushBlock(blocks, {
      id: "meta-features-h",
      kind: "heading",
      heading: "이 제품의 핵심 포인트",
      body: "",
    });
    pushBlock(blocks, {
      id: "meta-features",
      kind: "bullet_list",
      body: "",
      listItems: opts.features.filter(Boolean),
    });
  }

  let sectionIdx = 0;
  for (const section of opts.sections) {
    if (section.type === "hero") continue;
    const sectionBlocks = sectionToBlocks(section, opts.imageUrls, `s${sectionIdx}`);
    blocks.push(...sectionBlocks);
    sectionIdx += 1;
  }

  if (opts.howToUse?.trim()) {
    pushBlock(blocks, {
      id: "meta-howto-h",
      kind: "heading",
      heading: "사용 방법",
      body: "",
    });
    pushBlock(blocks, {
      id: "meta-howto",
      kind: "paragraph",
      body: opts.howToUse.trim(),
    });
  }

  if (opts.caution?.trim()) {
    pushBlock(blocks, {
      id: "meta-caution",
      kind: "notice",
      heading: "확인해 주세요",
      body: opts.caution.trim(),
    });
  }

  if (opts.price != null && opts.price > 0 && !blocks.some((b) => b.kind === "cta")) {
    pushBlock(blocks, {
      id: "meta-cta",
      kind: "cta",
      heading: `₩${opts.price.toLocaleString("ko-KR")}`,
      body: "구매 전 상세 스펙과 배송·교환 정책을 꼭 확인해 주세요.",
    });
  }

  return { title, excerpt: excerpt.slice(0, 160), tags, blocks };
}

export function mergeBlogPost(
  base: BlogPostDraft,
  blockOverrides: Record<string, BlogBlockOverride>,
  globalOverrides: BlogPostGlobalOverride,
  imageUrls: string[],
): BlogPostDraft {
  const blocks = base.blocks
    .map((block) => {
      const o = blockOverrides[block.id];
      if (!o) return block;
      if (o.hidden) return null;
      const imageUrl =
        o.imageUrl ??
        (typeof o.imageIndex === "number" ? imageUrls[o.imageIndex] : undefined) ??
        block.imageUrl;
      return {
        ...block,
        heading: o.heading ?? block.heading,
        body: o.body ?? block.body,
        imageUrl,
        imageCaption: o.imageCaption ?? block.imageCaption,
        faqQuestion: o.faqQuestion ?? block.faqQuestion,
        listItems: o.listItems ?? block.listItems,
      };
    })
    .filter((b): b is BlogBlock => b !== null);

  return {
    title: globalOverrides.title ?? base.title,
    excerpt: globalOverrides.excerpt ?? base.excerpt,
    tags: globalOverrides.tags ?? base.tags,
    blocks,
  };
}

export function exportBlogMarkdown(draft: BlogPostDraft): string {
  const lines: string[] = [`# ${draft.title}`, "", `> ${draft.excerpt}`, ""];
  if (draft.tags.length > 0) {
    lines.push(`태그: ${draft.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}`, "");
  }

  for (const block of draft.blocks) {
    switch (block.kind) {
      case "intro":
        lines.push(block.body, "");
        break;
      case "heading":
        lines.push(`## ${block.heading ?? block.body}`, "");
        break;
      case "paragraph":
        if (block.heading) lines.push(`### ${block.heading}`, "");
        lines.push(block.body, "");
        break;
      case "image":
        if (block.imageUrl) {
          lines.push(`![${block.imageCaption ?? draft.title}](${block.imageUrl})`, "");
          if (block.imageCaption) lines.push(`*${block.imageCaption}*`, "");
        }
        lines.push("");
        break;
      case "bullet_list":
        for (const item of block.listItems ?? []) lines.push(`- ${item}`);
        lines.push("");
        break;
      case "faq":
        lines.push(`**Q. ${block.faqQuestion ?? ""}**`, "", block.body, "");
        break;
      case "quote":
        lines.push(`> **${block.heading ?? ""}**`, `> ${block.body.replace(/\n/g, "\n> ")}`, "");
        break;
      case "cta":
        lines.push(`---`, `**${block.heading ?? "구매 정보"}**`, "", block.body, "");
        break;
      case "notice":
        lines.push(`> ⚠ ${block.heading ? `${block.heading}: ` : ""}${block.body}`, "");
        break;
      default:
        break;
    }
  }

  lines.push("---", "", "*이 글은 Pagzly로 생성된 상품 소개 초안입니다. 게시 전 사실 관계를 확인해 주세요.*");
  return lines.join("\n").trim() + "\n";
}

export function exportBlogTistoryHtml(draft: BlogPostDraft): string {
  const parts: string[] = [];

  parts.push(`<h1 data-ke-size="size26">${escHtml(draft.title)}</h1>`);
  parts.push(
    `<p data-ke-size="size16" style="color:#666;line-height:1.7">${escHtml(draft.excerpt)}</p>`,
  );
  if (draft.tags.length > 0) {
    parts.push(
      `<p data-ke-size="size14" style="color:#888">${draft.tags.map((t) => `#${escHtml(t)}`).join(" ")}</p>`,
    );
  }

  for (const block of draft.blocks) {
    switch (block.kind) {
      case "intro":
        parts.push(
          `<p data-ke-size="size16" style="line-height:1.85;margin:20px 0">${escHtml(block.body)}</p>`,
        );
        break;
      case "heading":
        parts.push(
          `<h2 data-ke-size="size22" style="margin:32px 0 12px">${escHtml(block.heading ?? "")}</h2>`,
        );
        break;
      case "paragraph":
        if (block.heading) {
          parts.push(
            `<h3 data-ke-size="size18" style="margin:24px 0 8px">${escHtml(block.heading)}</h3>`,
          );
        }
        parts.push(
          `<p data-ke-size="size16" style="line-height:1.85;margin:12px 0">${escHtml(block.body)}</p>`,
        );
        break;
      case "image":
        if (block.imageUrl) {
          parts.push(
            `<p data-ke-size="size16" style="text-align:center;margin:24px 0">
              <img src="${escHtml(block.imageUrl)}" alt="${escHtml(block.imageCaption ?? draft.title)}" style="max-width:100%;height:auto;border-radius:8px"/>
            </p>`,
          );
          if (block.imageCaption) {
            parts.push(
              `<p data-ke-size="size14" style="text-align:center;color:#888;margin:4px 0 20px">${escHtml(block.imageCaption)}</p>`,
            );
          }
        }
        break;
      case "bullet_list":
        parts.push(
          `<ul data-ke-size="size16" style="line-height:1.8;margin:12px 0;padding-left:1.2em">
            ${(block.listItems ?? []).map((item) => `<li>${escHtml(item)}</li>`).join("")}
          </ul>`,
        );
        break;
      case "faq":
        parts.push(
          `<p data-ke-size="size16" style="margin:20px 0 6px"><strong style="color:#2f4858">Q.</strong> ${escHtml(block.faqQuestion ?? "")}</p>
           <p data-ke-size="size16" style="line-height:1.8;margin:0 0 16px 12px"><strong>A.</strong> ${escHtml(block.body)}</p>`,
        );
        break;
      case "quote":
        parts.push(
          `<blockquote data-ke-size="size16" style="border-left:4px solid #2f4858;padding:12px 16px;margin:24px 0;background:#f5f3ee;line-height:1.8">
            ${block.heading ? `<strong>${escHtml(block.heading)}</strong><br/>` : ""}
            ${escHtml(block.body)}
          </blockquote>`,
        );
        break;
      case "cta":
        parts.push(
          `<div data-ke-size="size16" style="margin:32px 0;padding:20px;border:2px solid #1b1b18;border-radius:12px;text-align:center">
            <p style="font-size:1.5rem;font-weight:700;margin:0 0 8px">${escHtml(block.heading ?? "")}</p>
            <p style="margin:0;line-height:1.7">${escHtml(block.body)}</p>
          </div>`,
        );
        break;
      case "notice":
        parts.push(
          `<p data-ke-size="size14" style="margin:20px 0;padding:12px 14px;background:#fff8e6;border-radius:8px;line-height:1.7;color:#5c4a12">
            ${block.heading ? `<strong>${escHtml(block.heading)}</strong> ` : ""}${escHtml(block.body)}
          </p>`,
        );
        break;
      default:
        break;
    }
  }

  parts.push(
    `<p data-ke-size="size12" style="margin-top:32px;color:#aaa;text-align:center">이 글은 Pagzly로 생성된 상품 소개 초안입니다.</p>`,
  );

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escHtml(draft.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${DETAIL_GOOGLE_FONTS_URL}"/>
<style>
  body{max-width:720px;margin:0 auto;padding:24px 20px 48px;font-family:${DETAIL_FONT_STACK.sans};color:#1b1b18;line-height:1.6}
  h1,h2,h3{font-family:${DETAIL_FONT_STACK.heading}}
</style>
</head>
<body>
${parts.join("\n")}
<p style="margin-top:24px;padding:12px;background:#f0eeea;border-radius:8px;font-size:13px;color:#666">
  <strong>티스토리 붙여넣기:</strong> 티스토리 글쓰기 → HTML 모드에서 본문만 복사해 붙여넣으세요.
  외부 이미지 URL은 차단될 수 있으니, 이미지는 티스토리에 직접 업로드하는 것을 권장합니다.
</p>
</body>
</html>`;
}

export function exportBlogPlainText(draft: BlogPostDraft): string {
  const lines: string[] = [draft.title, "=".repeat(Math.min(draft.title.length, 40)), "", draft.excerpt, ""];
  if (draft.tags.length > 0) lines.push(`태그: ${draft.tags.join(", ")}`, "");

  for (const block of draft.blocks) {
    switch (block.kind) {
      case "intro":
      case "paragraph":
        if (block.heading) lines.push(`[${block.heading}]`);
        lines.push(block.body, "");
        break;
      case "heading":
        lines.push(`## ${block.heading ?? ""}`, "");
        break;
      case "image":
        lines.push(`[이미지: ${block.imageCaption ?? block.imageUrl ?? "사진"}]`, "");
        break;
      case "bullet_list":
        for (const item of block.listItems ?? []) lines.push(`· ${item}`);
        lines.push("");
        break;
      case "faq":
        lines.push(`Q. ${block.faqQuestion ?? ""}`, `A. ${block.body}`, "");
        break;
      case "quote":
        lines.push(`"${block.body}"`, block.heading ? `— ${block.heading}` : "", "");
        break;
      case "cta":
        lines.push(`[${block.heading ?? "구매"}]`, block.body, "");
        break;
      case "notice":
        lines.push(`※ ${block.heading ? `${block.heading}: ` : ""}${block.body}`, "");
        break;
      default:
        break;
    }
  }

  return lines.join("\n").trim() + "\n";
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
