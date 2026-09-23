import fs from "fs";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";

const session = JSON.parse(
  fs.readFileSync("review/181cha-live/electronics/session.json", "utf8"),
) as {
  productName?: string;
  category: string;
  imageUrls?: string[];
  generated: { sections: Array<Record<string, unknown>> };
};
const sections = session.generated.sections;
const compact = sections.filter(
  (s) => s.type === "image_text" && s.layout === "compact",
);
console.log(
  "compact",
  compact.map((s) => ({
    slot: s.slot,
    heading: String(s.heading ?? "").slice(0, 24),
    pos: s.imagePosition,
  })),
);
const html = buildDetailPageHtml({
  productName: session.productName ?? "t",
  category: session.category,
  sections: sections as never,
  imageUrls: session.imageUrls ?? [],
  theme: getCategoryTheme(session.category),
});
const compactBlocks = html.match(
  /max-width:576px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-direction:[^"]+"/g,
);
console.log("compact flex blocks", compactBlocks?.length ?? 0, compactBlocks);
const headings = compact.map((s) => String(s.heading));
for (const h of headings) {
  const i = html.indexOf(h);
  const snip = html.slice(Math.max(0, i - 80), i + h.length + 40);
  console.log("near", h.slice(0, 16), snip.includes("width:120px") ? "HAS_THUMB" : "NO_THUMB");
}
