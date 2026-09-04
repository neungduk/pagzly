import type { CategoryTheme } from "@/lib/category-theme";
import { renderCanvasSectionHtml } from "@/lib/canvas-section-export-html";
import { buildSectionImageAlt } from "@/lib/detail-image-alt";
import { buildSeoTextBlockHtml } from "@/lib/detail-seo-text";
import {
  formatSectionIndex,
  getSectionKicker,
  resolveSplitImageLeft,
  shouldUseEditorialBleed,
  shouldUseSplitLayout,
} from "@/lib/detail-visual-rhythm";
import {
  formatPointBadge,
  getCategoryTitleKeyword,
  isCertificationHighlight,
  parseMegaKeywordHeading,
} from "@/lib/detail-visual-enhancements";
import {
  buildFashionSizeDiagramSvg,
  isFashionCategory,
  matchSizeDiagramRows,
} from "@/lib/fashion-size-diagram";
import {
  buildSizeComparisonDiagramSvg,
  matchSizeComparisonRows,
} from "@/lib/size-comparison-diagram";
import {
  buildVolumeComparisonDiagramSvg,
  buildVolumeComparisonEntries,
  matchProductVolumeMl,
} from "@/lib/volume-comparison-diagram";
import { buildUsageOrderFlowSvg } from "@/lib/usage-order-diagram";
import { buildFoodRatioDiagramSvg, prepareFoodRatioSlices } from "@/lib/food-ratio-diagram";
import {
  buildPackageContentsDiagramSvg,
  preparePackageContentsItems,
} from "@/lib/package-contents-diagram";
import { isCosmeticsCategory } from "@/lib/cosmetics-compliance";
import { isFoodCategory } from "@/lib/food-compliance";
import { buildHeroBrandMarkHtml } from "@/lib/hero-brand-mark";
import { buildQuickFactStripHtml, extractQuickFacts } from "@/lib/quick-fact-strip";
import {
  buildAnchorNavHtml,
  buildSectionAnchorIdMap,
  buildSectionAnchors,
} from "@/lib/section-anchor-nav";
import { parseCertificationTokens } from "@/lib/enrich-product-sections";
import { extractTrustChips } from "@/lib/extract-trust-chips";
import {
  extendTheme,
  getCategoryPatternBackground,
  getTextPanelSurface,
  hexToRgba,
  resolveSectionSurface,
  type ExtendedTheme,
} from "@/lib/design-tokens";
import { buildProductJsonLd, serializeJsonLdScripts } from "@/lib/product-json-ld";
import {
  buildDetailExportFontCss,
  DETAIL_FONT_STACK,
  DETAIL_GOOGLE_FONTS_URL,
  displayHeadlineInlineCss,
} from "@/lib/detail-typography";
import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

function textPanelWrap(theme: CategoryTheme, inner: string): string {
  const s = getTextPanelSurface(theme);
  return `<div style="position:relative;margin-top:-28px;max-width:640px;margin-left:auto;margin-right:auto">
    <div style="position:absolute;left:0;top:20px;width:4px;height:56px;border-radius:999px;background:${theme.accent}"></div>
    <div style="border:1px solid ${s.borderColor};border-radius:16px;padding:32px 28px;background:${s.background};box-shadow:${s.boxShadow}">
      ${inner}
    </div>
  </div>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trustStripHtml(chips: string[], theme: CategoryTheme, certTokens: string[] = []): string {
  if (chips.length === 0) return "";
  const accent = theme.accent;
  return `<div style="padding:16px 20px;border-top:1px solid ${accent}38;border-bottom:1px solid ${accent}38;background:${theme.baseNeutral}a6;text-align:center">
    <p style="font-size:11px;letter-spacing:.2em;color:${theme.deepAccent};margin:0 0 12px">혜택 · 신뢰</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">
      ${chips
        .map((c) => {
          const certHighlight = certTokens.some(
            (token) =>
              token.length >= 2 &&
              (c.includes(token) ||
                token.includes(c) ||
                c.toLowerCase().includes(token.toLowerCase())),
          );
          return `<span style="font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;background:${certHighlight ? accent + "38" : accent + "1f"};color:${certHighlight ? accent : theme.deepAccent};${certHighlight ? `box-shadow:inset 0 -2px 0 0 ${accent}` : ""}">${esc(c)}</span>`;
        })
        .join("")}
    </div></div>`;
}

function sectionBgStyle(sectionBg: string, category: string): string {
  const hasPattern = Boolean(getCategoryPatternBackground(category));
  if (!hasPattern) return `background:${sectionBg}`;
  return `background:${sectionBg};background-repeat:repeat,no-repeat;background-size:auto,100% 100%`;
}

/** 잘못된 index를 [0]으로 몰아넣으면 HTML export에서도 동일컷 반복처럼 보임 */
function resolveExportImage(imageUrls: string[], index: number | undefined): string {
  if (
    typeof index === "number" &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < imageUrls.length
  ) {
    return imageUrls[index] ?? "";
  }
  return "";
}

/** 섹션 디스플레이 헤드라인 (표·라벨 제외) */
function dh2(category: string, escapedText: string, extraStyle: string): string {
  return `<h2 class="pagzly-display-headline" style="${displayHeadlineInlineCss(category)};${extraStyle}">${escapedText}</h2>`;
}

function sectionHtml(
  section: DetailSection,
  imageUrls: string[],
  baseTheme: CategoryTheme,
  productName: string,
  category: string,
  pointIndex?: number,
  bodyIndex?: number,
  extended?: ExtendedTheme,
  brandName?: string | null,
  certTokens: string[] = [],
  anchorId?: string,
  quickFacts: { label: string; value: string }[] = [],
  logoUrl?: string | null,
  ingredients?: string | null,
  keyFeatures?: string | null,
): string {
  const sectionIdAttr = anchorId ? ` id="${anchorId}"` : "";
  const pad = "padding:48px 20px;";
  const bi = bodyIndex ?? 0;
  const skipSurface = new Set(["hero", "cta_price", "illustration_banner", "ai_disclosure"]);
  const surface =
    extended && !skipSurface.has(section.type)
      ? resolveSectionSurface(extended, section.type, bi, category)
      : null;
  const theme = surface?.theme ?? baseTheme;
  const sectionBg = surface?.background ?? baseTheme.baseNeutral;
  const bgCss = sectionBgStyle(sectionBg, category);
  const sectionInset = surface?.insetShadow ? `box-shadow:${surface.insetShadow};` : "";
  const accent = theme.accent;
  const deep = theme.deepAccent;

  switch (section.type) {
    case "hero": {
      const src = resolveExportImage(imageUrls, section.imageIndex);
      const alt = buildSectionImageAlt(productName, section.headline, "hero");
      const brandMarkHtml = buildHeroBrandMarkHtml({
        logoUrl,
        brandName,
        productName,
      });
      return `<section${sectionIdAttr} class="hero"${sectionIdAttr} style="${pad}position:relative;min-height:70vh;background:${baseTheme.baseNeutral}">
        ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;height:70vh;object-fit:cover"/>` : ""}
        ${section.badge ? `<span style="position:absolute;left:0;top:20px;background:${deep};color:#FAF8F3;padding:8px 16px;font-size:12px;font-weight:700">${esc(section.badge)}</span>` : ""}
        ${brandMarkHtml}
        <div style="position:absolute;inset:0;background:linear-gradient(0deg,${deep}cc,transparent);display:flex;align-items:flex-end;padding:40px 20px">
          <div><h1 class="pagzly-display-headline" style="color:#FAF8F3;font-size:2rem;margin:0;${displayHeadlineInlineCss(category)}">${esc(section.headline)}</h1>
          ${section.subheadline ? `<p style="color:#FAF8F3cc;margin:8px 0 0;font-family:${DETAIL_FONT_STACK.sans}">${esc(section.subheadline)}</p>` : ""}</div>
        </div></section>`;
    }
    case "checklist": {
      const fg = section.boldBlock ? "#FAF8F3" : "#1B1B18";
      const kicker = getSectionKicker(section);
      const headingParts = parseMegaKeywordHeading(section.heading);
      const pointBadge = bodyIndex != null ? formatPointBadge(bodyIndex + 1) : "";
      const bg = section.boldBlock ? deep : sectionBg;
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${sectionBgStyle(bg, category)};color:${fg}">
        <div style="text-align:center;max-width:640px;margin:0 auto 32px">
          ${pointBadge ? `<span style="display:inline-block;font-family:${DETAIL_FONT_STACK.label};font-size:10px;font-weight:700;letter-spacing:.22em;border:1px solid ${section.boldBlock ? "rgba(250,248,243,.35)" : accent + "66"};border-radius:999px;padding:4px 12px;color:${section.boldBlock ? "#FAF8F3" : deep}">${pointBadge}</span>` : ""}
          ${kicker ? `<span style="font-size:11px;letter-spacing:.36em;opacity:.75;margin-left:12px">${kicker}</span>` : ""}
          ${headingParts.keyword ? `<p style="font-size:clamp(2rem,10vw,3.5rem);font-weight:900;line-height:.92;letter-spacing:-.06em;margin:16px 0 0;text-transform:uppercase;color:${section.boldBlock ? "#FAF8F3" : deep}">${esc(headingParts.keyword)}</p>` : ""}
          ${dh2(category, esc(headingParts.remainder || section.heading), `font-size:${headingParts.keyword ? "1.35rem" : "1.75rem"};margin:16px 0 0;font-weight:${headingParts.keyword ? "600" : "700"}`)}
        </div>
        <ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;list-style:none;padding:0;margin:0">
          ${section.items
            .map(
              (item) =>
                `<li style="text-align:center;font-size:14px;padding:20px 16px;border-radius:16px;border:1px solid ${section.boldBlock ? "rgba(250,248,243,.22)" : accent + "3d"};background:${section.boldBlock ? "rgba(250,248,243,.08)" : accent + "0f"}">${esc(item)}</li>`,
            )
            .join("")}
        </ul></section>`;
    }
    case "highlight_box": {
      const cards = section.cards.slice(0, 4);
      if (cards.length === 0) return "";
      const center = Math.floor((cards.length - 1) / 2);
      const bg = section.boldBlock ? deep : sectionBg;
      const fg = section.boldBlock ? "#FAF8F3" : "#1B1B18";
      const headingParts = parseMegaKeywordHeading(section.heading);
      const pointBadge = bodyIndex != null ? formatPointBadge(bodyIndex + 1) : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${sectionBgStyle(bg, category)};color:${fg}">
        ${pointBadge ? `<p style="text-align:center;margin:0 0 8px"><span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.22em;border:1px solid ${accent}66;border-radius:999px;padding:4px 12px">${pointBadge}</span></p>` : ""}
        ${headingParts.keyword ? `<p style="text-align:center;font-size:clamp(2rem,10vw,3.5rem);font-weight:900;line-height:.92;letter-spacing:-.06em;margin:0;text-transform:uppercase;color:${section.boldBlock ? "#FAF8F3" : deep}">${esc(headingParts.keyword)}</p>` : ""}
        <h2 style="text-align:center;font-size:${headingParts.keyword ? "1.25rem" : "1.5rem"};margin:12px 0 0">${esc(headingParts.remainder || section.heading)}</h2>
        <div style="display:grid;grid-template-columns:repeat(${Math.min(3, cards.length)},1fr);gap:12px;margin-top:32px">
          ${cards
            .map((card, i) => {
              const em = i === center;
              const cardKeyword = parseMegaKeywordHeading(card.title);
              return `<div class="${em ? "pulse-card" : ""}" style="border-radius:16px;padding:28px 20px;text-align:center;background:${em ? (section.boldBlock ? "#FAF8F3" : deep) : accent + "14"};color:${em ? (section.boldBlock ? deep : "#FAF8F3") : fg}">
                <div style="font-size:10px;letter-spacing:.22em;opacity:.7;border:1px solid ${accent}55;border-radius:999px;display:inline-block;padding:4px 10px">${formatPointBadge(i + 1)}</div>
                ${cardKeyword.keyword ? `<p style="font-size:clamp(1.5rem,8vw,2.25rem);font-weight:900;line-height:.92;letter-spacing:-.05em;margin:12px 0 0;text-transform:uppercase">${esc(cardKeyword.keyword)}</p>` : ""}
                <h3 style="margin:8px 0;font-size:${cardKeyword.keyword ? "14px" : "inherit"};font-weight:${cardKeyword.keyword ? "600" : "700"}">${esc(cardKeyword.keyword ? cardKeyword.remainder || card.title : card.title)}</h3>
                <p style="margin:0;font-size:14px;opacity:.9">${esc(card.body)}</p>
              </div>`;
            })
            .join("")}
        </div></section>`;
    }
    case "step_card": {
      const flowHtml = isCosmeticsCategory(category)
        ? buildUsageOrderFlowSvg(
            section.steps.map((s) => s.title).filter(Boolean),
            deep,
            "#1B1B18",
          )
        : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        <p style="text-align:center;font-size:11px;letter-spacing:.2em;color:${deep}">HOW TO USE</p>
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:32px">
          ${section.steps
            .map((step, i) => {
              const src = imageUrls[step.imageIndex] ?? "";
              const alt = buildSectionImageAlt(productName, step.title, section.slot);
              return `<div><div style="position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#eee">
                ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;height:100%;object-fit:cover"/>` : ""}
                <span style="position:absolute;left:10px;top:10px;background:${deep};color:#FAF8F3;font-size:10px;padding:4px 10px;border-radius:999px;font-weight:700">STEP ${String(i + 1).padStart(2, "0")}</span>
              </div><h3 style="margin:12px 0 4px">${esc(step.title)}</h3><p style="margin:0;font-size:13px;opacity:.8">${esc(step.body)}</p></div>`;
            })
            .join("")}
        </div>${flowHtml}</section>`;
    }
    case "stat_infographic":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <div style="max-width:480px;margin:32px auto 0;display:flex;flex-direction:column;gap:20px">
          ${section.metrics
            .map((m) => {
              const pct = Math.min(100, Math.max(0, m.percent ?? 0));
              if (m.style === "number") {
                return `<div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:${deep}">${esc(m.value)}</div><div style="font-size:13px;opacity:.65">${esc(m.label)}</div></div>`;
              }
              const barColor = section.barAccent === "emphasis" ? deep : accent;
              return `<div><div style="display:flex;justify-content:space-between;font-size:14px"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>
                <div style="height:${section.barAccent === "emphasis" ? 14 : 10}px;background:${barColor}29;border-radius:999px;margin-top:8px;overflow:hidden">
                  <div class="fill-bar" style="height:100%;width:${pct}%;background:${barColor};border-radius:999px"></div>
                </div></div>`;
            })
            .join("")}
        </div></section>`;
    case "comparison_chart":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        <p style="text-align:center;color:${deep};font-size:11px;letter-spacing:.2em">COMPARE</p>
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <div style="max-width:420px;margin:32px auto 0;display:flex;flex-direction:column;gap:24px">
          ${section.metrics
            .map((m) => {
              const max = Math.max(m.ourValue, m.baselineValue, 1);
              const ourP = (m.ourValue / max) * 100;
              const baseP = (m.baselineValue / max) * 100;
              const unit = section.unit ?? "%";
              return `<div><p style="font-size:14px;margin:0 0 8px">${esc(m.label)}</p>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:72px;font-size:11px;color:${deep}">${esc(section.ourLabel)}</span>
                  <div style="flex:1;height:10px;background:${accent}1f;border-radius:999px"><div class="fill-bar" style="height:100%;width:${ourP}%;background:${accent}"></div></div>
                  <span style="width:48px;text-align:right;font-size:11px">${m.ourValue}${esc(unit)}</span></div>
                <div style="display:flex;align-items:center;gap:8px"><span style="width:72px;font-size:11px;opacity:.45">${esc(section.baselineLabel)}</span>
                  <div style="flex:1;height:10px;background:#000014;border-radius:999px"><div class="fill-bar" style="height:100%;width:${baseP}%;background:#000040"></div></div>
                  <span style="width:48px;text-align:right;font-size:11px;opacity:.45">${m.baselineValue}${esc(unit)}</span></div>
              </div>`;
            })
            .join("")}
        </div>
        ${section.basisNote ? `<p style="text-align:center;font-size:11px;opacity:.4;margin-top:20px">${esc(section.basisNote)}</p>` : ""}
      </section>`;
    case "image_text": {
      const src = imageUrls[section.imageIndex] ?? "";
      const alt = buildSectionImageAlt(productName, section.heading, section.slot);
      const isCallout = section.layout === "callout" || section.slot === "feature_callout";
      const isCirclePair =
        section.layout === "circle-pair" &&
        Array.isArray(section.circlePair) &&
        section.circlePair.length === 2;
      const isCircleSolo =
        section.layout === "circle-solo" &&
        section.circleSolo?.imageUrl?.trim() &&
        section.circleSolo?.label?.trim();
      if (isCircleSolo) {
        const solo = section.circleSolo!;
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}"><div style="text-align:center;max-width:280px;margin:0 auto"><img src="${esc(solo.imageUrl)}" alt="${esc(solo.label)}" style="width:120px;height:120px;border-radius:9999px;object-fit:cover;margin:0 auto;display:block;box-shadow:0 12px 32px -12px rgba(27,27,24,0.28)"/><p style="margin-top:12px;font-size:14px;font-weight:600;color:${deep}">${esc(solo.label)}</p></div></section>`;
      }
      if (isCirclePair) {
        const pairHtml = section.circlePair!
          .map(
            (item) =>
              `<div style="flex:1;min-width:0;text-align:center"><img src="${esc(item.imageUrl)}" alt="${esc(item.label)}" style="width:96px;height:96px;border-radius:9999px;object-fit:cover;margin:0 auto;display:block;box-shadow:0 12px 32px -12px rgba(27,27,24,0.28)"/><p style="margin-top:12px;font-size:13px;font-weight:600;color:${deep}">${esc(item.label)}</p></div>`,
          )
          .join("");
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}"><div style="display:flex;justify-content:center;gap:32px;max-width:360px;margin:0 auto">${pairHtml}</div></section>`;
      }
      if (isCallout && section.callout) {
        return `<section${sectionIdAttr} class="pagzly-callout" style="${pad}${sectionInset}${bgCss}">
          <div style="position:relative;margin-bottom:20px">
            ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px"/>` : ""}
            <p style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:${deep};color:#FAF8F3;padding:10px 18px;border-radius:16px;font-size:14px;font-weight:600;text-align:center;max-width:85%">${esc(section.callout)}</p>
          </div>
          <h2 style="font-size:1.35rem">${esc(section.heading)}</h2>
          <p style="line-height:1.65;font-size:15px;opacity:.85">${esc(section.body)}</p>
        </section>`;
      }
      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        return `<section${sectionIdAttr} class="pagzly-editorial" style="padding:0;background:${sectionBg}">
          ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;aspect-ratio:4/5;object-fit:cover;display:block"/>` : ""}
          <div style="padding:40px 24px 48px;text-align:center;max-width:640px;margin:0 auto">
            ${kicker ? `<p style="font-size:11px;letter-spacing:.36em;color:${deep};margin:0 0 12px">${kicker}</p>` : ""}
            ${dh2(category, esc(section.heading), "font-size:2rem;margin:0;line-height:1.2")}
            <p style="line-height:1.85;font-size:16px;opacity:.85;margin-top:16px">${esc(section.body)}</p>
          </div>
        </section>`;
      }
      if (shouldUseSplitLayout(section)) {
        const imageLeft = resolveSplitImageLeft(section, pointIndex);
        const pointLabel =
          pointIndex != null ? `POINT ${String(pointIndex + 1).padStart(2, "0")}` : "";
        const kicker = getSectionKicker(section) ?? "FEATURE";
        const pkgItems =
          section.slot === "package_contents"
            ? preparePackageContentsItems(section.body, keyFeatures)
            : null;
        const pkgHtml = pkgItems
          ? buildPackageContentsDiagramSvg(pkgItems, deep, "#1B1B18")
          : "";
        const foodSlices =
          isFoodCategory(category) && section.slot === "sourcing_story"
            ? prepareFoodRatioSlices(ingredients, keyFeatures)
            : null;
        const foodHtml = foodSlices
          ? buildFoodRatioDiagramSvg(foodSlices, deep, "#1B1B18")
          : "";
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
          <div style="display:flex;flex-wrap:wrap;gap:32px;max-width:960px;margin:0 auto;align-items:center">
            <div style="flex:1 1 280px;order:${imageLeft ? 1 : 2};position:relative">
              ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px;box-shadow:0 20px 56px ${hexToRgba(theme.deepAccent, 0.14)}"/>` : ""}
              ${pointLabel ? `<span style="position:absolute;left:16px;top:16px;background:${hexToRgba(deep, 0.9)};color:#FAF8F3;font-size:10px;font-weight:700;letter-spacing:.28em;padding:6px 12px;border-radius:999px">${pointLabel}</span>` : ""}
            </div>
            <div style="flex:1 1 280px;order:${imageLeft ? 2 : 1}">
              <p style="font-size:11px;letter-spacing:.36em;color:${deep};margin:0 0 12px">${kicker}</p>
              ${dh2(category, esc(section.heading), "font-size:1.75rem;margin:0")}
              <p style="line-height:1.75;font-size:15px;opacity:.85;margin-top:16px">${esc(section.body)}</p>
            </div>
          </div>
          ${pkgHtml}${foodHtml}
        </section>`;
      }
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${src ? `<div style="padding:0 12px"><img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px;box-shadow:0 16px 48px ${hexToRgba(theme.deepAccent, 0.12)}"/></div>` : ""}
        ${textPanelWrap(
          theme,
          `${dh2(category, esc(section.heading), "font-size:1.35rem;margin:0")}
        <p style="line-height:1.65;font-size:15px;opacity:.85;margin-top:16px">${esc(section.body)}</p>`,
        )}
      </section>`;
    }
    case "spec_table": {
      const isShipping = section.slot === "shipping_info";
      const isSizeTable = section.slot === "size_table";
      const sizeMatches =
        isSizeTable && isFashionCategory(category)
          ? matchSizeDiagramRows(section.rows)
          : [];
      const comparisonDims =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchSizeComparisonRows(section.rows)
          : [];
      const volumeEntries =
        section.slot === "spec_table" && isCosmeticsCategory(category)
          ? buildVolumeComparisonEntries(matchProductVolumeMl(section.rows))
          : null;
      const volumeHtml =
        volumeEntries && volumeEntries.length >= 2
          ? buildVolumeComparisonDiagramSvg(volumeEntries, deep, deep)
          : "";
      const foodSlices =
        section.slot === "spec_table" && isFoodCategory(category)
          ? prepareFoodRatioSlices(ingredients, keyFeatures)
          : null;
      const foodHtml = foodSlices
        ? buildFoodRatioDiagramSvg(foodSlices, deep, "#1B1B18")
        : "";
      const diagramHtml =
        sizeMatches.length > 0
          ? buildFashionSizeDiagramSvg(sizeMatches, deep, deep)
          : volumeHtml
            ? volumeHtml
            : foodHtml
              ? foodHtml
              : comparisonDims.length > 0
                ? buildSizeComparisonDiagramSvg(
                    comparisonDims,
                    baseTheme.accentText,
                    baseTheme.accentText,
                  )
                : "";
      const specThumbUrls = (
        section.imageIndexes?.length
          ? section.imageIndexes
              .map((idx) => resolveExportImage(imageUrls, idx))
              .filter((url) => url.trim())
          : []
      );
      const thumbSize = specThumbUrls.length > 1 ? 80 : 112;
      const thumbRadius = specThumbUrls.length > 1 ? 12 : 16;
      const thumbHtml =
        specThumbUrls.length > 0
          ? `<div style="display:flex;justify-content:center;gap:${specThumbUrls.length > 1 ? 12 : 0}px;margin:32px auto 0;max-width:${specThumbUrls.length > 1 ? 320 : 140}px">${specThumbUrls
              .map(
                (url, ti) =>
                  `<img src="${esc(url)}" alt="${esc(buildSectionImageAlt(productName, specThumbUrls.length > 1 ? `${section.heading} ${ti + 1}` : section.heading, section.slot))}" style="width:${thumbSize}px;height:${thumbSize}px;object-fit:cover;border-radius:${thumbRadius}px;box-shadow:0 12px 32px -12px rgba(27,27,24,0.28);border:1px solid rgba(27,27,24,0.1)"/>`,
              )
              .join("")}</div>`
          : "";
      const specTableBg =
        section.slot === "spec_table"
          ? `background:${hexToRgba(theme.baseNeutral, 0.06)};`
          : "";
      const rowsHtml = section.rows
        .map((row, ri) => {
          const certHighlight = isCertificationHighlight(row.label, row.value, certTokens);
          const valueHtml = certHighlight
            ? `<span style="display:inline-block;padding:2px 8px;border-radius:6px;color:${accent};background:${accent}24;box-shadow:inset 0 -2px 0 0 ${accent}8c">${esc(row.value)}</span>`
            : esc(row.value);
          return `<tr style="border-bottom:1px solid ${accent}33;background:${ri % 2 === 1 ? accent + "0d" : "transparent"}"><th style="text-align:left;padding:12px 16px;width:38%;opacity:.65;font-weight:500">${esc(row.label)}</th><td style="padding:12px 16px;font-weight:500">${valueHtml}</td></tr>`;
        })
        .join("");
      const tableHtml = `<table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rowsHtml}</tbody></table>`;
      const tableMargin = diagramHtml ? "16px" : "24px";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${specTableBg}${bgCss}" class="${isShipping ? "pagzly-shipping" : ""}">
        <p style="text-align:center;font-size:11px;letter-spacing:.2em;color:${deep}">INFO</p>
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        ${thumbHtml}
        ${diagramHtml}
        ${
          isShipping
            ? `<div class="pagzly-shipping-table" style="max-width:560px;margin:${tableMargin} auto 0;border:2px solid ${accent}59;border-radius:12px;overflow:hidden;background:${sectionBg}80">${tableHtml}</div>`
            : `<div style="max-width:560px;margin:${tableMargin} auto 0">${tableHtml}</div>`
        }
      </section>`;
    }
    case "gallery": {
      const cols = section.imageIndexes.length <= 2 ? 1 : section.imageIndexes.length <= 4 ? 2 : 3;
      return `<section${sectionIdAttr} class="pagzly-gallery" style="${pad}${sectionInset}${bgCss}">
        <h2 style="text-align:center;font-size:1.5rem;margin-bottom:24px">${esc(section.heading)}</h2>
        <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;background:${accent}2e">
          ${section.imageIndexes
            .map((idx) => {
              const src = imageUrls[idx] ?? "";
              const alt = buildSectionImageAlt(productName, `${section.heading} ${idx + 1}`, section.slot);
              return src
                ? `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block"/>`
                : "";
            })
            .join("")}
        </div>
      </section>`;
    }
    case "brand_story": {
      const hasBrandCard = Boolean(brandName?.trim());
      const categoryKeyword = getCategoryTitleKeyword(category);
      const storyImgs = (section.imageIndexes ?? [])
        .map((idx) => {
          const src = imageUrls[idx] ?? "";
          if (!src) return "";
          const alt = buildSectionImageAlt(productName, section.heading, section.slot);
          return `<img src="${esc(src)}" alt="${esc(alt)}" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:12px;display:block"/>`;
        })
        .filter(Boolean);
      const galleryHtml =
        storyImgs.length > 0
          ? `<div style="margin-top:28px;display:grid;grid-template-columns:repeat(${Math.min(storyImgs.length, 2)},1fr);gap:12px">${storyImgs.join("")}</div>`
          : "";
      const storyInner = `<p style="font-size:11px;letter-spacing:.2em;color:${theme.deepAccent};margin:0 0 12px">STORY</p>
          ${dh2(category, esc(section.heading), "font-size:1.35rem;margin:0")}
          <p style="line-height:1.75;font-size:15px;opacity:.85;margin-top:16px;white-space:pre-line">${esc(section.body)}</p>${galleryHtml}`;
      if (hasBrandCard) {
        const quickFactHtml = buildQuickFactStripHtml(quickFacts, theme);
        return `<section${sectionIdAttr} class="pagzly-brand-story">
        <div style="padding:64px 20px;text-align:center;background:${deep};color:#FAF8F3">
          <p style="font-family:${DETAIL_FONT_STACK.label};font-size:11px;letter-spacing:.32em;opacity:.75;margin:0">${esc(brandName!)}</p>
          <p style="font-size:clamp(2.25rem,11vw,4rem);font-weight:900;line-height:.92;letter-spacing:-.06em;text-transform:uppercase;margin:16px 0 0">${esc(categoryKeyword)}</p>
        </div>
        ${quickFactHtml}
        <div style="${pad}${sectionInset}${bgCss}">
        ${textPanelWrap(theme, storyInner)}
        </div></section>`;
      }
      return `<section${sectionIdAttr} class="pagzly-brand-story" style="${pad}${sectionInset}${bgCss}">
        ${textPanelWrap(theme, storyInner)}
      </section>`;
    }
    case "target_persona":
      return `<section${sectionIdAttr} class="pagzly-persona" style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <ul style="max-width:480px;margin:24px auto 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px">
          ${section.personas.map((p) => `<li style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:${sectionBg};box-shadow:inset 0 0 0 1px ${accent}33;font-size:14px;font-weight:500;color:${deep}">✓ ${esc(p)}</li>`).join("")}
        </ul>
      </section>`;
    case "usage_steps": {
      const flowHtml = isCosmeticsCategory(category)
        ? buildUsageOrderFlowSvg(section.steps, deep, "#1B1B18")
        : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <ol style="max-width:640px;margin:32px auto 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px">
          ${section.steps.map((s, i) => `<li><span style="color:${accent};font-size:11px;font-weight:700">STEP ${String(i + 1).padStart(2, "0")}</span><div style="font-size:15px;margin-top:4px">${esc(s)}</div></li>`).join("")}
        </ol>${flowHtml}</section>`;
    }
    case "custom_gif":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss};text-align:center">
        ${section.heading ? `<h2>${esc(section.heading)}</h2>` : ""}
        <img src="${esc(section.gifUrl)}" alt="${esc(buildSectionImageAlt(productName, section.heading ?? "GIF", section.slot))}" style="max-width:100%;border-radius:12px"/>
      </section>`;
    case "cta_price":
      return `<section${sectionIdAttr} class="pagzly-cta" style="${pad}background:${deep};color:#FAF8F3;text-align:center">
        <p style="font-size:11px;letter-spacing:.2em;opacity:.8">PRICE</p>
        <p style="font-size:2.25rem;font-weight:700;margin:8px 0 0">₩${section.price.toLocaleString("ko-KR")}</p>
        ${section.targetCustomer ? `<p style="opacity:.85;margin-top:8px">${esc(section.targetCustomer)}</p>` : ""}
        ${section.badges?.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:16px">${section.badges.map((b) => `<span style="background:#FAF8F3;color:${deep};padding:6px 12px;font-size:12px;font-weight:600">${esc(b)}</span>`).join("")}</div>` : ""}
        <p style="margin-top:20px;font-size:13px;opacity:.7">배송·교환·환불은 판매자 정책을 확인해 주세요.</p>
      </section>`;
    case "faq":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <div style="max-width:640px;margin:24px auto 0;display:flex;flex-direction:column;gap:16px">
          ${section.items
            .map(
              (item) =>
                `<div class="pagzly-faq-card" style="border:1px solid ${accent}38;border-radius:12px;padding:16px 20px;background:${sectionBg}73">
            <p style="font-size:11px;letter-spacing:.15em;color:${accent};margin:0 0 6px">Q.</p>
            <p style="font-weight:700;font-size:15px;margin:0">${esc(item.question)}</p>
            <p style="font-size:11px;letter-spacing:.15em;color:${deep};margin:16px 0 6px">A.</p>
            <p style="font-size:14px;line-height:1.6;opacity:.85;margin:0">${esc(item.answer)}</p>
          </div>`,
            )
            .join("")}
        </div></section>`;
    case "caution":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${textPanelWrap(
          theme,
          `<p style="font-size:11px;letter-spacing:.2em;color:${deep};margin:0 0 12px">NOTICE</p>
        <h2 style="font-size:1.25rem;margin:0">${esc(section.heading)}</h2>
        <p style="font-size:14px;line-height:1.65;opacity:.8;margin-top:12px">${esc(section.body)}</p>`,
        )}
      </section>`;
    case "comparison_table":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        <p style="text-align:center;font-size:11px;letter-spacing:.2em;color:${deep}">COMPARE</p>
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <table style="width:100%;max-width:560px;margin:24px auto 0;border-collapse:collapse;font-size:14px">
          <thead><tr style="background:${accent}1a">
            <th style="padding:12px;text-align:left"></th>
            <th style="padding:12px;text-align:left">${esc(section.columns[0])}</th>
            <th style="padding:12px;text-align:left;color:${deep};font-weight:700;background:${accent}24">${esc(section.columns[1])}</th>
          </tr></thead>
          <tbody>
            ${section.rows
              .map(
                (row, ri) =>
                  `<tr style="border-bottom:1px solid ${accent}33;background:${ri % 2 ? accent + "0d" : "transparent"}">
                    <td style="padding:12px;font-weight:500;opacity:.65">${esc(row.label)}</td>
                    <td style="padding:12px">${esc(row.values[0])}</td>
                    <td style="padding:12px;font-weight:600;background:${accent}14">${esc(row.values[1])}</td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </section>`;
    case "color_variation": {
      const cvId = `pagzly-cv-${section.slot.replace(/\W/g, "")}`;
      const inputs = section.options
        .map(
          (opt, i) =>
            `<input type="radio" name="${cvId}" id="${cvId}-${i}"${i === 0 ? " checked" : ""} style="position:absolute;opacity:0;width:1px;height:1px;overflow:hidden"/>`,
        )
        .join("");
      const swatches = section.options
        .map(
          (opt, i) =>
            `<label for="${cvId}-${i}" style="display:inline-flex;align-items:center;gap:8px;margin:4px;padding:6px 12px;border:1px solid ${accent}44;border-radius:999px;font-size:14px;cursor:pointer">
              <span style="width:16px;height:16px;border-radius:999px;background:${esc(opt.colorHex)};box-shadow:0 0 0 1px ${accent}44"></span>
              ${esc(opt.label)}
            </label>`,
        )
        .join("");
      const images = section.options
        .map((opt, i) => {
          const optSrc = imageUrls[opt.imageIndex] ?? "";
          return optSrc
            ? `<img class="${cvId}-img" data-cv="${i}" src="${esc(optSrc)}" alt="${esc(opt.label)}" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:12px"/>`
            : "";
        })
        .join("");
      const selectors = section.options
        .flatMap((_, active) => {
          const show = section.options
            .map(
              (__, i) =>
                `#${cvId}-${active}:checked ~ .${cvId}-stage .${cvId}-img[data-cv="${i}"]{display:${i === active ? "block" : "none"}!important}`,
            )
            .join("");
          return show;
        })
        .join("");
      return `<section${sectionIdAttr} class="pagzly-color-variation" style="${pad}${sectionInset}${bgCss}">
        <style>
          .${cvId}-swatches label:hover{border-color:${deep}!important}
          .${cvId}-img{display:none}
          ${selectors}
        </style>
        ${inputs}
        ${dh2(category, esc(section.heading), "text-align:center;font-size:1.5rem")}
        <div class="${cvId}-swatches" style="text-align:center;margin:32px auto 0">${swatches}</div>
        <div class="${cvId}-stage" style="margin:24px auto 0;max-width:360px">${images}</div>
      </section>`;
    }
    case "illustration_banner": {
      const illSrc = section.illustrationUrl || imageUrls[0] || "";
      return `<section${sectionIdAttr} class="pagzly-illustration-banner" style="position:relative;aspect-ratio:16/9;overflow:hidden;background:${deep}">
        ${illSrc ? `<img src="${esc(illSrc)}" alt="${esc(section.heading ?? "컨셉 배너")}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>` : ""}
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,${deep}99,transparent 35%,transparent 55%,${deep}cc)"></div>
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:32px 24px;text-align:center;color:#FAF8F3">
          ${section.heading ? `<h2 style="font-size:1.75rem;margin:0">${esc(section.heading)}</h2>` : ""}
          ${section.body ? `<p style="margin:12px 0 0;font-size:15px;opacity:.9;max-width:480px">${esc(section.body)}</p>` : ""}
        </div>
      </section>`;
    }
    case "review_highlight": {
      const praises = section.praises.filter(Boolean);
      if (praises.length === 0) return "";
      return `<section${sectionIdAttr} class="pagzly-review-highlight" style="${pad}${sectionInset}${bgCss}">
        <h2 style="text-align:center;font-size:1.5rem;margin:0">${esc(section.heading)}</h2>
        <p style="text-align:center;font-size:12px;opacity:.45;margin:8px 0 0">실제 구매자 리뷰에서 자주 나온 내용을 요약했습니다</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:680px;margin:32px auto 0">
          ${praises
            .map(
              (praise) =>
                `<div style="border-radius:16px;padding:24px;border:1px solid ${accent}33;background:${accent}0d">
                  <span style="font-size:2rem;color:${accent};line-height:1">&ldquo;</span>
                  <p style="margin:12px 0 0;font-size:14px;line-height:1.6;opacity:.85">${esc(praise)}</p>
                </div>`,
            )
            .join("")}
        </div>
      </section>`;
    }
    case "ai_disclosure":
      return `<section${sectionIdAttr} style="padding:20px;background:#f5f3ee;font-size:12px;line-height:1.5;opacity:.75;text-align:center">
        <strong>${esc(section.heading)}</strong> — ${esc(section.body)}
      </section>`;
    case "canvas":
      return renderCanvasSectionHtml(section, imageUrls, esc, anchorId);
    default: {
      const fallback = section as DetailSection;
      const heading =
        "heading" in fallback && typeof fallback.heading === "string" ? fallback.heading : "";
      const body = "body" in fallback && typeof fallback.body === "string" ? fallback.body : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${heading ? `<h2 style="text-align:center;font-size:1.5rem">${esc(heading)}</h2>` : ""}
        ${body ? `<p style="max-width:640px;margin:16px auto 0;line-height:1.6;font-size:15px;opacity:.8">${esc(body)}</p>` : ""}
      </section>`;
    }
  }
}

/** 자사몰·마켓 업로드용 HTML (750px 모바일 표준, JSON-LD, 텍스트 요약 포함). */
export function buildDetailPageHtml(opts: {
  productName: string;
  brandName?: string | null;
  logoUrl?: string | null;
  ingredients?: string | null;
  keyFeatures?: string | null;
  price?: number;
  category: string;
  sections: DetailSection[];
  imageUrls: string[];
  theme: CategoryTheme;
  hiddenIndexes?: number[];
  description?: string;
  features?: string[];
  howToUse?: string;
  caution?: string;
  certifications?: string | null;
}): string {
  const hidden = new Set(opts.hiddenIndexes ?? []);
  const visibleSections = opts.sections.filter((_, i) => !hidden.has(i));
  const trustChips = extractTrustChips(visibleSections);
  const extended = extendTheme(opts.theme);

  const certTokens = parseCertificationTokens(opts.certifications);
  const quickFacts = extractQuickFacts(visibleSections);
  const sectionAnchors = buildSectionAnchors(visibleSections);
  const anchorIdMap = buildSectionAnchorIdMap(visibleSections);
  const anchorNavHtml = buildAnchorNavHtml(sectionAnchors, opts.theme);

  const bodyParts: string[] = [];
  let imageTextCount = 0;
  for (let i = 0; i < visibleSections.length; i += 1) {
    const section = visibleSections[i]!;
    const isFullPoint = shouldUseSplitLayout(section);
    const pointIndex = isFullPoint ? imageTextCount++ : undefined;
    const bodyIndex = visibleSections.slice(0, i).filter((s) => s.type !== "hero").length;
    const html = sectionHtml(
      section,
      opts.imageUrls,
      opts.theme,
      opts.productName,
      opts.category,
      pointIndex,
      bodyIndex,
      extended,
      opts.brandName,
      certTokens,
      anchorIdMap.get(i),
      quickFacts,
      opts.logoUrl,
      opts.ingredients,
      opts.keyFeatures,
    );
    if (html) bodyParts.push(html);
    if (section.type === "hero" && trustChips.length > 0) {
      const next = visibleSections[i + 1];
      if (next) bodyParts.push(trustStripHtml(trustChips, opts.theme, certTokens));
    }
  }
  const body = bodyParts.join("\n");

  const copy: Pick<GeneratedCopy, "description" | "features" | "howToUse" | "caution" | "headlines"> = {
    description: opts.description ?? "",
    features: opts.features ?? [],
    howToUse: opts.howToUse ?? "",
    caution: opts.caution ?? "",
    headlines: [],
  };

  const seoBlock = buildSeoTextBlockHtml({
    productName: opts.productName,
    brandName: opts.brandName,
    category: opts.category,
    copy,
    sections: visibleSections,
    certifications: opts.certifications,
  });

  const jsonLd =
    opts.price != null && opts.price > 0
      ? serializeJsonLdScripts(
          buildProductJsonLd({
            productName: opts.productName,
            brandName: opts.brandName,
            price: opts.price,
            description: opts.description,
            imageUrls: opts.imageUrls,
            category: opts.category,
            sections: visibleSections,
          }),
        )
      : "";

  const metaDesc = (opts.description ?? opts.productName).trim().slice(0, 160);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="description" content="${esc(metaDesc)}"/>
<title>${esc(opts.productName)} — 상세페이지</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${DETAIL_GOOGLE_FONTS_URL}"/>
${jsonLd}
<style>
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  ${buildDetailExportFontCss(opts.category)}
  .pagzly-wrap{max-width:750px;margin:0 auto;background:#FAF8F3}
  .pagzly-anchor-nav a{scroll-margin-top:52px}
  .pagzly-seo-text{padding:20px;font-size:14px;line-height:1.65;border-bottom:1px solid #DAD5C9}
  .pagzly-seo-text h2{font-size:1rem;margin:16px 0 8px}
  .pagzly-seo-text ul{padding-left:1.2rem;margin:0}
  @keyframes fillBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  .fill-bar{transform-origin:left center;animation:fillBar .9s ease-out both}
  @keyframes pulseCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  .pulse-card{animation:pulseCard 2.4s ease-in-out infinite}
  @media (max-width:750px){
    .pagzly-cta{position:sticky;bottom:0;z-index:20;box-shadow:0 -8px 24px rgba(27,27,24,.15)}
  }
  @media (prefers-reduced-motion:reduce){.fill-bar,.pulse-card{animation:none!important}}
</style>
</head>
<body>
<div class="pagzly-wrap">
<header style="padding:14px 20px;border-bottom:1px solid #DAD5C9;font-size:12px;opacity:.65">${esc(opts.category)} · ${esc(opts.productName)}</header>
${anchorNavHtml}
${seoBlock}
${body}
<footer style="padding:28px 20px;text-align:center;font-size:11px;opacity:.45">Pagzly HTML export · 마켓·자사몰용 (통이미지와 별도 텍스트·스키마 포함)</footer>
</div>
</body>
</html>`;
}
