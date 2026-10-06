import type { CategoryTheme } from "@/lib/category-theme";
import { renderCanvasSectionHtml } from "@/lib/canvas-section-export-html";
import {
  CHECKLIST_HUB_LABEL_W,
  checklistHubLayout,
  isChecklistHubEligible,
} from "@/lib/checklist-hub";
import { buildSectionImageAlt } from "@/lib/detail-image-alt";
import { buildSeoTextBlockHtml } from "@/lib/detail-seo-text";
import {
  buildPointOrdinals,
  getSectionKicker,
  limitBoldBlocks,
  resolveSplitFlexRatio,
  restoreHashtagHeadingUnits,
  dropDuplicateRecommendColumn,
  resolveSplitImageLeft,
  shouldInsertBreather,
  shouldUseEditorialBleed,
  shouldUseSplitLayout,
} from "@/lib/detail-visual-rhythm";
import {
  formatPointBadge,
  getCategoryTitleKeyword,
  isCertificationHighlight,
  isConcentrationMetricLabel,
  isShortSectionHeading,
  parseMegaKeywordHeading,
  parseUniformCardKeywords,
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
  buildNoiseComparisonDiagramSvg,
  matchNoiseComparisonRow,
} from "@/lib/noise-comparison-diagram";
import {
  buildWaterproofIpDiagramSvg,
  matchWaterproofIpRow,
} from "@/lib/waterproof-ip-diagram";
import {
  buildWeightComparisonDiagramSvg,
  matchWeightComparisonRow,
} from "@/lib/weight-comparison-diagram";
import {
  buildPowerConsumptionDiagramSvg,
  matchPowerComparisonRow,
} from "@/lib/power-consumption-diagram";
import {
  comparisonChecklistPresent,
  SELF_ASSESSED_DISCLAIMER,
} from "@/lib/comparison-chart-guard";
import { classifyBoolishCell } from "@/lib/comparison-cell-classify";
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
import { buildAnnotatedImageOverlaySvg } from "@/lib/annotated-image-overlay-svg";
import { resolveCompactImageShape } from "@/lib/compact-image-shape";
import { displaySpecValue, ingredientVennHtml, isRedundantSoloVenn } from "@/lib/ingredient-venn";
import {
  BEFORE_AFTER_COMPLIANCE_NOTE,
  CERTIFICATE_EVIDENCE_COMPLIANCE_NOTE,
} from "@/lib/before-after-eligibility";
import { splitTextByKeywords } from "@/lib/review-insights";
import {
  buildIngredientRingDiagramSvg,
  isIngredientRingCategory,
  prepareIngredientRingLabels,
} from "@/lib/ingredient-ring-diagram";
import {
  INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE,
  isCosmeticsCategory,
} from "@/lib/cosmetics-compliance";
import { isFoodCategory } from "@/lib/food-compliance";
import { buildHeroBrandMarkHtml } from "@/lib/hero-brand-mark";
import { extractQuickFacts } from "@/lib/quick-fact-strip";
import { buildSpecBentoGridHtml } from "@/lib/spec-bento-grid";
import {
  buildAnchorNavHtml,
  buildSectionAnchorIdMap,
  buildSectionAnchors,
} from "@/lib/section-anchor-nav";
import { parseCertificationTokens } from "@/lib/enrich-product-sections";
import { extractTrustChips, splitChipCaption } from "@/lib/extract-trust-chips";
import {
  pickSummaryIcon,
  summaryChipWidth,
  summaryGridColumns,
  summaryIconSvg,
  SUMMARY_ICON_PX,
} from "@/lib/summary-line-icons";
import {
  extendTheme,
  getCategoryPatternBackground,
  getHeroGradient,
  getTextPanelSurface,
  hexToRgba,
  resolveSectionSurface,
  solidAccentOnPaper,
  solidDeepOnPaper,
  readableTextAccent,
  readableTextDeep,
  BRAND,
  FLAT_SECTION_SURFACES,
  ELEVATION,
  FONT_SIZE,
  INFO_TABLE,
  RADIUS,
  SECTION_BG_PATTERN_C_ALPHA,
  imageRatioCss,
  resolvePointImageRatio,
  resolveSlotImageRatio,
  titleScaleExportCss,
  titleSizeCss,
  twoToneHeadlineColors,
  FLAT_PAPER,
  flatAccentTint,
  ensureReadableOnPaper,
  getCategoryRhythm,
  type ExtendedTheme,
  type TitleScaleKey,
} from "@/lib/design-tokens";
import { applySectionDisplayBudget } from "@/lib/section-display-budget";
import { emphasisMarkerGradient, splitBodyEmphasis } from "@/lib/body-emphasis";
import {
  POINT_PILL,
  TWO_TONE_LEAD_EM,
  splitTwoToneHeadline,
} from "@/lib/designer-headline";
import { buildProductJsonLd, serializeJsonLdScripts } from "@/lib/product-json-ld";
import {
  buildDetailExportFontCss,
  joinNumericSuffix,
  DETAIL_FONT_STACK,
  DETAIL_GOOGLE_FONTS_URL,
  displayHeadlineInlineCss,
  longestTokenEm,
} from "@/lib/detail-typography";
import { splitStatValue, STAT_UNIT_EM } from "@/lib/stat-value";
import {
  groupPendingSpecRows,
  isEmptySizeOptions,
  isPlaceholderAnswer,
  isPlaceholderValue,
  PENDING_SPEC_ROW_LABEL,
} from "@/lib/spec-placeholder";
import {
  findCircleComparisonComboIndices,
  isCircleSoloSection,
} from "@/lib/circle-comparison-combo";
import type {
  ComparisonChartSection,
  DetailSection,
  GeneratedCopy,
  ImageTextSection,
} from "@/lib/types/generate";

/** 라이브 checklistGridClass와 같은 열 수 — 모바일 열은 인라인, 640px 이상은 --pz-cl-wide */
function checklistGridCss(items: string[], category: string): string {
  const n = items.filter((item) => String(item).trim()).length;
  let mobile = 2;
  let wide = 3;
  if (n === 3) {
    mobile = 3;
    wide = 3;
  } else if (n === 5) {
    wide = 5;
  } else if (n === 2) {
    wide = 2;
  } else if (n === 4) {
    const hasLongToken = items.some((item) => longestTokenEm(item) > 3.5);
    mobile = !hasLongToken && getCategoryRhythm(category).checklistGridFour.startsWith("grid-cols-4") ? 4 : 2;
    wide = 4;
  }
  const narrow = n === 2 ? ";max-width:448px;margin-left:auto;margin-right:auto" : "";
  return `display:grid;grid-template-columns:repeat(${mobile},1fr);--pz-cl-wide:repeat(${wide},1fr)${narrow}`;
}

function textPanelWrap(theme: CategoryTheme, inner: string): string {
  if (FLAT_SECTION_SURFACES) {
    return `<div style="max-width:640px;margin:0 auto">${inner}</div>`;
  }
  const s = getTextPanelSurface(theme);
  return `<div style="position:relative;margin-top:-28px;max-width:640px;margin-left:auto;margin-right:auto">
    <div style="position:absolute;left:0;top:20px;width:4px;height:56px;border-radius:${RADIUS.pill}px;background:${theme.accent}"></div>
    <div style="border:1px solid ${s.borderColor};border-radius:${RADIUS.lg}px;padding:32px 28px;background:${s.background};box-shadow:${s.boxShadow}">
      ${inner}
    </div>
  </div>`;
}

function esc(s: string): string {
  return joinNumericSuffix(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** hero-follow 래퍼 하단 대각선 클립 높이 */
const HERO_FOLLOW_CLIP_PX = FLAT_SECTION_SURFACES ? 0 : 44;

function trustStripHtml(
  chips: string[],
  theme: CategoryTheme,
  certTokens: string[] = [],
  isLastInClip = false,
): string {
  if (chips.length === 0) return "";
  const accent = theme.accent;
  const deepText = readableTextDeep(theme);
  const accentText = readableTextAccent(theme);
  const chipWidth = summaryChipWidth(chips.length);
  const padBottom = 24 + (isLastInClip ? HERO_FOLLOW_CLIP_PX : 0);
  return `<div style="padding:24px 24px ${padBottom}px;border-top:1px solid ${accent}38;border-bottom:1px solid ${accent}38;background:${FLAT_SECTION_SURFACES ? flatAccentTint(theme) : `${theme.baseNeutral}a6`};text-align:center">
    <p style="font-size:${FONT_SIZE.caption};letter-spacing:.2em;color:${deepText};margin:0 0 12px">한눈에 보기</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;column-gap:12px;row-gap:20px;max-width:560px;margin:0 auto">
      ${chips
        .map((c, i) => {
          const certHighlight = certTokens.some(
            (token) =>
              token.length >= 2 &&
              (c.includes(token) ||
                token.includes(c) ||
                c.toLowerCase().includes(token.toLowerCase())),
          );
          const icon = summaryIconSvg(pickSummaryIcon(c), certHighlight ? accent : deepText, SUMMARY_ICON_PX);
          const caption = splitChipCaption(c);
          const divider =
            FLAT_SECTION_SURFACES && i % summaryGridColumns(chips.length) !== 0
              ? `<span aria-hidden="true" style="position:absolute;left:-6px;top:4px;bottom:4px;width:1px;background:${hexToRgba(accent, 0.22)}"></span>`
              : "";
          return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;width:${chipWidth}">${divider}${icon}<span style="font-size:14px;font-weight:600;line-height:1.375;word-break:keep-all;color:${certHighlight ? accentText : theme.deepAccent}">${esc(caption.main)}${caption.sub ? `<span style="display:block;margin-top:2px;font-size:11px;font-weight:500;opacity:.6">${esc(caption.sub)}</span>` : ""}</span></div>`;
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
/** 플랫 톤 일반 섹션 제목 — 라이브 flatTitleColor와 같은 색 */
function flatTitleColorCss(theme: CategoryTheme): string {
  return FLAT_SECTION_SURFACES ? `;color:${twoToneHeadlineColors(theme).main}` : "";
}

function dh2(category: string, escapedText: string, extraStyle: string): string {
  const fit = extraStyle.includes("--pz-fs:") ? " pz-fit" : "";
  return `<h2 class="pagzly-display-headline${fit}" style="${displayHeadlineInlineCss(category)};${extraStyle}">${escapedText}</h2>`;
}

/** 라이브 TwoToneTitle과 같은 구조 — 작은 잉크 리드 + 큰 포인트색 핵심 문구 */
function twoToneDh2(
  category: string,
  theme: CategoryTheme,
  text: string,
  extraStyle: string,
  opts: { inverted?: boolean; plain?: boolean } = {},
): string {
  if (!FLAT_SECTION_SURFACES) return dh2(category, esc(text), extraStyle);
  const parts = opts.plain ? { lead: null, main: text } : splitTwoToneHeadline(text);
  const tones = twoToneHeadlineColors(theme, opts.inverted);
  const mainColor = opts.plain && !opts.inverted ? BRAND.ink : tones.main;
  const leadColor = tones.lead;
  const lead = parts.lead
    ? `<span style="display:block;font-size:${TWO_TONE_LEAD_EM}em;font-weight:500;letter-spacing:-0.02em;margin-bottom:.3em;color:${leadColor}">${esc(parts.lead)}</span>`
    : "";
  return dh2(category, `${lead}<span style="display:block;color:${mainColor}">${esc(parts.main)}</span>`, extraStyle);
}

/** 라이브 PointPill과 같은 채운 알약 */
function pointPillHtml(label: string, theme: CategoryTheme, inverted = false): string {
  return `<span style="display:inline-block;border-radius:${RADIUS.pill}px;font-family:${DETAIL_FONT_STACK.sans};font-size:${POINT_PILL.fontPx}px;font-weight:700;line-height:1;letter-spacing:${POINT_PILL.letterSpacingEm}em;padding:${POINT_PILL.padY}px ${POINT_PILL.padX}px;background:${inverted ? BRAND.paper : solidAccentOnPaper(theme)};color:${inverted ? solidDeepOnPaper(theme) : BRAND.paper}">${esc(label)}</span>`;
}

/** 라이브 SectionHeader 평면 분기와 같은 구조: POINT 알약 → (키워드) → 2톤 제목 */
function flatSectionHeaderHtml(
  category: string,
  theme: CategoryTheme,
  heading: string,
  pointBadge: string,
  inverted: boolean,
  marginBottomPx = 40,
  allowKeyword = true,
): string {
  const parts = allowKeyword && !isShortSectionHeading(heading)
    ? parseMegaKeywordHeading(heading)
    : { keyword: null, remainder: heading };
  const title = parts.remainder || heading;
  const pill = pointBadge
    ? `<div style="margin:0 0 20px">${pointPillHtml(pointBadge, theme, inverted)}</div>`
    : "";
  const keyword = parts.keyword
    ? `<p style="overflow-wrap:break-word;font-size:${FONT_SIZE.keywordClamp};font-weight:900;line-height:.92;letter-spacing:-.06em;margin:0;text-transform:uppercase;color:${inverted ? BRAND.paper : readableTextAccent(theme, 3)}">${esc(parts.keyword)}</p>`
    : "";
  const titleHtml = twoToneDh2(
    category,
    theme,
    title,
    `${titleFitCss(parts.keyword ? "subtitle" : "section", title, parts.keyword ? -0.02 : -0.03)};margin:0;font-weight:${parts.keyword ? "600" : "700"}`,
    { inverted, plain: Boolean(parts.keyword) },
  );
  return `<div style="text-align:center;max-width:576px;margin:0 auto ${marginBottomPx}px">${pill}${keyword}${titleHtml}</div>`;
}

/** 라이브 EmphasizedBody와 같은 규칙 — 핵심 구절 1개만 굵게 */
function emphasizedBodyHtml(body: string, emphasis: string | undefined, accentHex: string): string {
  const split = splitBodyEmphasis(body, emphasis);
  if (!split) return esc(body);
  return `${esc(split.before)}<strong style="font-weight:700;color:${BRAND.ink};background-image:${emphasisMarkerGradient(accentHex)};-webkit-box-decoration-break:clone;box-decoration-break:clone">${esc(split.strong)}</strong>${esc(split.after)}`;
}

/** 제목 위 영문 머리말 — 평면 톤에서는 생략 */
function kickerHtml(html: string): string {
  return FLAT_SECTION_SURFACES ? "" : html;
}

/** 라이브 STAT_LABEL_CLASS와 같은 수치 라벨 */
const STAT_LABEL_CSS = `font-size:${FONT_SIZE.sm};font-weight:500;line-height:1.375;letter-spacing:-0.01em;color:rgba(27,27,24,.6)`;

/** 라이브 StatValue와 같은 숫자/작은 단위 */
function statValueHtml(value: string): string {
  const split = splitStatValue(value);
  if (!split) return esc(value);
  return `${esc(split.num)}<span style="margin-left:.06em;font-size:${STAT_UNIT_EM}em;font-weight:700;letter-spacing:0">${esc(split.unit)}</span>`;
}

/** 라이브 TYPO 제목과 같은 TITLE_SCALE 크기 + 긴 어절 축소(.pz-fit) — rawText는 이스케이프 전 원문 */
function titleFitCss(key: TitleScaleKey, rawText: string | undefined, letterSpacingEm: number): string {
  const size = titleSizeCss(key);
  return `--pz-fs:${size};--pz-fit-em:${longestTokenEm(rawText ?? "", letterSpacingEm)};font-size:${size}`;
}

/** comparison_chart 본문 — 단독 섹션과 circle 콤보 섹션 공용 (라이브 renderComparisonChartBody) */
function comparisonChartBodyHtml(
  section: ComparisonChartSection,
  theme: CategoryTheme,
  category: string,
): string {
  const accent = theme.accent;
  const deepText = readableTextDeep(theme);
  const isChecklist = section.presentationStyle === "checklist";
  const metricsHtml = isChecklist
    ? section.metrics
        .map((m) => {
          const ourYes = comparisonChecklistPresent(m.ourValue);
          const baseYes = comparisonChecklistPresent(m.baselineValue);
          const mark = (yes: boolean, strong: boolean) =>
            yes
              ? `<span style="color:${strong ? accent : "rgba(27,27,24,0.35)"};font-size:${FONT_SIZE.checkMark};font-weight:700" aria-label="있음">✓</span>`
              : `<span style="color:${theme.baseNeutral};font-size:${FONT_SIZE.checkMark};font-weight:700" aria-label="없음">✗</span>`;
          return `<div style="display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(27,27,24,0.08)">
            <p style="margin:0;font-size:${FONT_SIZE.bodySm}">${esc(m.label)}</p>
            <div style="text-align:center;min-width:4.5rem;padding:8px 10px;border-radius:${RADIUS.md}px;background:${hexToRgba(accent, 0.16)}"><p style="margin:0 0 4px;font-size:${FONT_SIZE.label};font-weight:700;color:${deepText}">${esc(section.ourLabel)}</p>${mark(ourYes, true)}</div>
            <div style="text-align:center;min-width:4.5rem;padding:8px 10px;border-radius:${RADIUS.md}px;border:1px solid ${hexToRgba(theme.baseNeutral, 0.9)}"><p style="margin:0 0 4px;font-size:${FONT_SIZE.label};opacity:.4">${esc(section.baselineLabel)}</p>${mark(baseYes, false)}</div>
          </div>`;
        })
        .join("")
    : section.metrics
        .map((m) => {
          const unit = section.unit ?? "%";
          const absolutePercent =
            FLAT_SECTION_SURFACES && unit === "%" && Math.max(m.ourValue, m.baselineValue) <= 100;
          const max = absolutePercent ? 100 : Math.max(m.ourValue, m.baselineValue, 1);
          const ourP = Math.min(100, (m.ourValue / max) * 100);
          const baseP = Math.min(100, (m.baselineValue / max) * 100);
          if (FLAT_SECTION_SURFACES) {
            return `<div><div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px"><p style="margin:0;font-size:${FONT_SIZE.body};font-weight:600;line-height:1.375;color:rgba(27,27,24,.8)">${esc(m.label)}</p><span style="flex-shrink:0;white-space:nowrap;font-variant-numeric:tabular-nums"><span style="font-family:${DETAIL_FONT_STACK.heading};font-size:${FONT_SIZE.bodyLg};font-weight:900;line-height:1;color:${deepText}">${m.ourValue}<span style="margin-left:2px;font-size:${FONT_SIZE.caption};font-weight:700">${esc(unit)}</span></span><span style="margin-left:6px;font-size:${FONT_SIZE.sm};color:rgba(27,27,24,.45)">/ ${m.baselineValue}${esc(unit)}</span></span></div>
            <div style="margin-top:12px;height:8px;background:${hexToRgba(accent, 0.16)};border-radius:${RADIUS.pill}px;overflow:hidden"><div class="fill-bar" style="height:100%;width:${ourP}%;background:${accent};border-radius:${RADIUS.pill}px"></div></div>
            <div style="margin-top:6px;height:6px;background:${hexToRgba(BRAND.ink, 0.06)};border-radius:${RADIUS.pill}px;overflow:hidden"><div class="fill-bar" style="height:100%;width:${baseP}%;background:${hexToRgba(BRAND.ink, 0.28)};border-radius:${RADIUS.pill}px"></div></div></div>`;
          }
          return `<div><p style="font-size:${FONT_SIZE.body};font-weight:600;line-height:1.375;color:rgba(27,27,24,.8);margin:0 0 10px">${esc(m.label)}</p>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:10px 12px;border-radius:${RADIUS.md}px;background:${hexToRgba(accent, 0.14)}"><span style="width:72px;font-size:${FONT_SIZE.caption};font-weight:700;color:${deepText}">${esc(section.ourLabel)}</span>
              <div style="flex:1;height:14px;background:${hexToRgba(accent, 0.22)};border-radius:${RADIUS.pill}px"><div class="fill-bar" style="height:100%;width:${ourP}%;background:${accent};border-radius:${RADIUS.pill}px"></div></div>
              <span style="width:64px;text-align:right;font-family:${DETAIL_FONT_STACK.heading};font-size:${FONT_SIZE.bodyLg};font-weight:900;line-height:1;font-variant-numeric:tabular-nums;color:${deepText}">${m.ourValue}<span style="margin-left:2px;font-size:${FONT_SIZE.caption};font-weight:700">${esc(unit)}</span></span></div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:${RADIUS.md}px;border:1px solid ${hexToRgba(theme.baseNeutral, 0.9)}"><span style="width:72px;font-size:${FONT_SIZE.caption};color:rgba(27,27,24,.55)">${esc(section.baselineLabel)}</span>
              <div style="flex:1;height:8px;background:${hexToRgba(BRAND.ink, 0.08)};border-radius:${RADIUS.pill}px"><div class="fill-bar" style="height:100%;width:${baseP}%;background:${hexToRgba(BRAND.ink, 0.32)};border-radius:${RADIUS.pill}px"></div></div>
              <span style="width:64px;text-align:right;font-size:${FONT_SIZE.sm};font-variant-numeric:tabular-nums;color:rgba(27,27,24,.55)">${m.baselineValue}${esc(unit)}</span></div>
          </div>`;
        })
        .join("");
  const selfAssessed = section.basis === "self_assessed";
  const basisNote = section.basisNote || (selfAssessed ? SELF_ASSESSED_DISCLAIMER : "");
  const basisNoteHtml = basisNote
    ? `<p style="max-width:420px;margin:20px auto 0;text-align:center;font-size:${FONT_SIZE.caption};${
        selfAssessed
          ? `padding:8px 12px;border-radius:${RADIUS.md}px;background:rgba(27,27,24,0.05);font-weight:500;color:rgba(27,27,24,0.55)`
          : "opacity:.4"
      }">${esc(basisNote)}</p>`
    : "";
  return `
        ${kickerHtml(`<p style="text-align:center;color:${deepText};font-size:${FONT_SIZE.caption};letter-spacing:.2em">COMPARE</p>`)}
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        ${
          FLAT_SECTION_SURFACES && !isChecklist
            ? `<div style="max-width:420px;margin:32px auto 0;display:flex;align-items:center;justify-content:center;gap:20px;font-size:${FONT_SIZE.xs};color:rgba(27,27,24,.6)"><span style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="width:16px;height:8px;border-radius:${RADIUS.pill}px;background:${accent}"></span><span style="font-weight:600;color:${deepText}">${esc(section.ourLabel)}</span></span><span style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="width:16px;height:6px;border-radius:${RADIUS.pill}px;background:${hexToRgba(BRAND.ink, 0.28)}"></span>${esc(section.baselineLabel)}</span></div>`
            : ""
        }
        <div style="max-width:420px;margin:${FLAT_SECTION_SURFACES && !isChecklist ? 28 : 32}px auto 0;display:flex;flex-direction:column;gap:${isChecklist ? 0 : FLAT_SECTION_SURFACES ? 32 : 24}px">
          ${metricsHtml}
        </div>
        ${basisNoteHtml}
        ${
          Array.isArray(section.evidenceQuotes) &&
          section.evidenceQuotes.some((e) => e.quotes?.some((q) => Boolean(q?.trim())))
            ? `<details style="max-width:420px;margin:28px auto 0;border:1px solid rgba(27,27,24,0.12);border-radius:${RADIUS.md}px;padding:12px 16px;background:rgba(250,248,243,0.85)">
                <summary style="cursor:pointer;text-align:center;font-size:${FONT_SIZE.xs};font-weight:600;opacity:.6">근거 보기</summary>
                <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(27,27,24,0.1)">
                  ${section.evidenceQuotes
                    .filter((e) => e.quotes?.some((q) => Boolean(q?.trim())))
                    .map(
                      (e) =>
                        `<div style="margin-bottom:16px"><p style="text-align:center;font-size:${FONT_SIZE.caption};font-weight:500;opacity:.45;margin:0 0 8px">${esc(e.label)}</p>${e.quotes
                          .filter(Boolean)
                          .map(
                            (q) =>
                              `<p style="text-align:center;font-size:${FONT_SIZE.sm};line-height:1.6;opacity:.55;margin:0 0 8px;padding:12px;border:1px solid rgba(27,27,24,0.08);border-radius:${RADIUS.md}px">&ldquo; ${esc(q)}</p>`,
                          )
                          .join("")}</div>`,
                    )
                    .join("")}
                </div>
              </details>`
            : ""
        }
      `;
}

/** 라이브 renderCircleComparisonCombo — 인접 circle + comparison_chart를 한 <section>으로 */
function circleComparisonComboHtml(params: {
  circleSection: ImageTextSection;
  chartSection: ComparisonChartSection;
  theme: CategoryTheme;
  category: string;
  productName: string;
  sectionStyle: string;
  anchorId?: string;
}): string {
  const { circleSection, chartSection, theme, category, productName, sectionStyle, anchorId } =
    params;
  const deepText = readableTextDeep(theme);
  const items =
    isCircleSoloSection(circleSection) && circleSection.circleSolo
      ? [circleSection.circleSolo]
      : (circleSection.circlePair ?? []);
  const hideCircle =
    FLAT_SECTION_SURFACES &&
    isRedundantSoloVenn(
      items.map((item) => item.label),
      circleSection.heading,
      circleSection.body,
    );
  const circlesHtml = FLAT_SECTION_SURFACES
    ? ingredientVennHtml(
        items.map((item) => item.label),
        deepText,
        DETAIL_FONT_STACK.heading,
      )
    : items
    .map(
      (item) =>
        `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:12px"><img src="${esc(item.imageUrl)}" alt="${esc(buildSectionImageAlt(productName, item.label, circleSection.slot))}" loading="lazy" decoding="async" style="width:96px;height:96px;border-radius:${RADIUS.pill}px;object-fit:cover;display:block;box-shadow:${ELEVATION.imageThumb},0 0 0 1px rgba(27,27,24,0.1)"/><p style="margin:0;text-align:center;font-family:${DETAIL_FONT_STACK.heading};font-size:${FONT_SIZE.bodyLg};font-weight:600;line-height:1.35;letter-spacing:-0.02em;color:${deepText}">${esc(item.label)}</p></div>`,
    )
    .join("");
  return `<section${anchorId ? ` id="${anchorId}"` : ""} class="pagzly-circle-combo" style="${sectionStyle}">
        ${hideCircle ? "" : `<div style="margin-bottom:40px"><div style="display:flex;justify-content:center;align-items:flex-start;gap:32px;max-width:448px;margin:0 auto">${circlesHtml}</div></div>`}
        ${comparisonChartBodyHtml(chartSection, theme, category)}
      </section>`;
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
  compactImageTextIndex?: number,
  totalCompactImageTextCount?: number,
  pointOrdinal?: number,
): string {
  const sectionIdAttr = anchorId ? ` id="${anchorId}"` : "";
  const pad = "padding:48px 20px;";
  const bi = bodyIndex ?? 0;
  const skipSurface = new Set(
    FLAT_SECTION_SURFACES
      ? ["hero", "cta_price", "illustration_banner"]
      : ["hero", "cta_price", "illustration_banner", "ai_disclosure"],
  );
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
  // 188 — paper 텍스트가 올라가는 솔리드 fill만 대비 보정 (텍스트색·반투명 틴트는 원본 유지)
  const deepFill = solidDeepOnPaper(theme);
  const deepText = readableTextDeep(theme);
  const accentText = readableTextAccent(theme);

  switch (section.type) {
    case "hero": {
      const src = resolveExportImage(imageUrls, section.imageIndex);
      const alt = buildSectionImageAlt(productName, section.headline, "hero");
      const brandMarkHtml = buildHeroBrandMarkHtml({
        logoUrl,
        brandName,
        productName,
      });
      return `<section${sectionIdAttr} class="hero"${sectionIdAttr} style="${FLAT_SECTION_SURFACES ? "" : pad}position:relative;min-height:70vh;background:${baseTheme.baseNeutral}">
        ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" fetchPriority="high" style="width:100%;height:70vh;object-fit:cover"/>` : ""}
        ${section.badge && !FLAT_SECTION_SURFACES ? `<span style="position:absolute;left:0;top:20px;background:${deepFill};color:#FAF8F3;padding:8px 16px;font-size:${FONT_SIZE.xs};font-weight:700">${esc(section.badge)}</span>` : ""}
        ${brandMarkHtml}
        <div style="position:absolute;inset:0;background:${getHeroGradient(baseTheme)};display:flex;align-items:flex-end;padding:48px 20px 40px">
          <div style="width:100%;text-align:center">${section.badge && FLAT_SECTION_SURFACES ? `<span style="display:inline-block;margin-bottom:16px;padding:4px 14px;border:1px solid rgba(255,255,255,.55);border-radius:9999px;color:#FFFFFF;font-size:${FONT_SIZE.xs};font-weight:700;letter-spacing:.025em">${esc(section.badge)}</span>` : ""}<h1 class="pagzly-display-headline pz-fit" style="color:#FAF8F3;${titleFitCss("hero", section.headline, -0.035)};font-weight:800;letter-spacing:-0.035em;line-height:1.02;margin:0;text-shadow:0 2px 24px rgba(0,0,0,0.45);${displayHeadlineInlineCss(category)}">${esc(section.headline)}</h1>
          ${section.subheadline ? `<p style="color:rgba(250,248,243,0.95);margin:12px auto 0;max-width:36rem;font-family:${DETAIL_FONT_STACK.sans};text-shadow:0 1px 12px rgba(0,0,0,0.35)">${esc(section.subheadline)}</p>` : ""}</div>
        </div></section>`;
    }
    case "checklist": {
      const fg = section.boldBlock ? "#FAF8F3" : "#1B1B18";
      const kicker = getSectionKicker(section);
      const headingParts = parseMegaKeywordHeading(section.heading);
      const pointBadge = pointOrdinal != null ? formatPointBadge(pointOrdinal) : "";
      const bg = section.boldBlock ? deep : sectionBg;
      const checklistHead = FLAT_SECTION_SURFACES
        ? flatSectionHeaderHtml(category, theme, section.heading, pointBadge, Boolean(section.boldBlock))
        : `<div style="text-align:center;max-width:640px;margin:0 auto 32px">
          ${pointBadge ? `<span style="display:inline-block;font-family:${DETAIL_FONT_STACK.label};font-size:${FONT_SIZE.label};font-weight:700;letter-spacing:.22em;border:1px solid ${section.boldBlock ? "rgba(250,248,243,.35)" : accent + "66"};border-radius:${RADIUS.pill}px;padding:4px 12px;color:${section.boldBlock ? "#FAF8F3" : deep}">${pointBadge}</span>` : ""}
          ${kicker ? `<span style="font-size:${FONT_SIZE.caption};letter-spacing:.36em;opacity:.75;margin-left:12px">${kicker}</span>` : ""}
          ${headingParts.keyword ? `<p style="overflow-wrap:break-word;font-size:${FONT_SIZE.keywordClamp};font-weight:900;line-height:.92;letter-spacing:-.06em;margin:16px 0 0;text-transform:uppercase;color:${section.boldBlock ? "#FAF8F3" : deep}">${esc(headingParts.keyword)}</p>` : ""}
          ${dh2(category, esc(headingParts.remainder || section.heading), `${titleFitCss(headingParts.keyword ? "subtitle" : "section", headingParts.remainder || section.heading, headingParts.keyword ? -0.02 : -0.03)};margin:16px 0 0;font-weight:${headingParts.keyword ? "600" : "700"}`)}
        </div>`;
      const clCompact = section.compactFollow === true;
      const hubSrc = resolveExportImage(imageUrls, 0);
      const clItems = section.items.filter((item) => String(item).trim());
      if (
        hubSrc &&
        isChecklistHubEligible(clItems, {
          flat: FLAT_SECTION_SURFACES,
          compactFollow: clCompact,
          boldBlock: Boolean(section.boldBlock) && !clCompact,
          hasImage: true,
        })
      ) {
        const hub = checklistHubLayout(clItems.length);
        const lines = hub.nodes
          .slice(0, clItems.length)
          .map(
            (n) =>
              `<line x1="${n.x1}" y1="${n.y1}" x2="${n.x2}" y2="${n.y2}" stroke="${hexToRgba(accent, 0.45)}" stroke-width="1" vector-effect="non-scaling-stroke"/><circle cx="${n.x2}" cy="${n.y2}" r="1.2" fill="${deepText}"/>`,
          )
          .join("");
        const labels = clItems
          .map((item, i) => {
            const n = hub.nodes[i]!;
            return `<div style="position:absolute;left:${n.x}%;top:${n.y}%;width:${CHECKLIST_HUB_LABEL_W}%;transform:translate(-50%,-50%);text-align:center"><span aria-hidden="true" style="display:block;margin-bottom:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:700;letter-spacing:.2em;color:${accentText}">${String(i + 1).padStart(2, "0")}</span><span style="font-family:${DETAIL_FONT_STACK.heading};font-size:15px;font-weight:700;line-height:1.375;letter-spacing:-.02em;word-break:keep-all;color:${deepText}">${esc(item)}</span></div>`;
          })
          .join("");
        const alt = buildSectionImageAlt(productName, section.heading, section.slot);
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${sectionBgStyle(bg, category)};color:${fg}">
        ${checklistHead}
        <div style="position:relative;margin:32px auto 0;width:100%;max-width:420px;aspect-ratio:1/1">
          <svg viewBox="0 0 100 100" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="${hub.cx}" cy="${hub.cy}" r="${hub.r + 2.5}" fill="none" stroke="${hexToRgba(accent, 0.28)}" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>${lines}</svg>
          <div style="position:absolute;left:${hub.cx - hub.r}%;top:${hub.cy - hub.r}%;width:${hub.r * 2}%;height:${hub.r * 2}%;border-radius:9999px;overflow:hidden;box-shadow:0 0 0 1px ${hexToRgba(accent, 0.18)}"><img src="${esc(hubSrc)}" alt="${esc(alt)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
          ${labels}
        </div></section>`;
      }
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${sectionBgStyle(bg, category)};color:${fg}">
        ${checklistHead}
        <ul class="pagzly-cl-grid" style="${checklistGridCss(section.items, category)};gap:12px;list-style:none;padding:0;margin:0">
          ${section.items
            .map(
              (item) =>
                `<li style="text-align:center;font-size:${FONT_SIZE.bodySm};padding:20px 16px;border-radius:${RADIUS.lg}px;border:1px solid ${section.boldBlock ? "rgba(250,248,243,.22)" : FLAT_SECTION_SURFACES ? hexToRgba(accent, 0.16) : accent + "3d"};background:${section.boldBlock ? "rgba(250,248,243,.08)" : FLAT_SECTION_SURFACES ? FLAT_PAPER : accent + "0f"}${FLAT_SECTION_SURFACES ? ";font-weight:600;word-break:keep-all" : ""}">${FLAT_SECTION_SURFACES ? `<span aria-hidden="true" style="display:flex;justify-content:center;margin-bottom:10px">${summaryIconSvg("check", section.boldBlock ? BRAND.paper : deepText, 26)}</span>` : ""}${esc(item)}</li>`,
            )
            .join("")}
        </ul></section>`;
    }
    case "highlight_box": {
      const isTrustEvidence = section.slot === "seller_trust_evidence";
      const cards = isTrustEvidence
        ? section.cards.filter((card) => (card.title ?? "").trim() || (card.body ?? "").trim()).slice(0, 4)
        : section.cards.slice(0, 4);
      if (cards.length === 0) return "";
      const center = Math.floor((cards.length - 1) / 2);
      const bg = section.boldBlock ? deep : sectionBg;
      const fg = section.boldBlock ? "#FAF8F3" : "#1B1B18";
      const headingParts = parseMegaKeywordHeading(section.heading);
      const pointBadge = pointOrdinal != null ? formatPointBadge(pointOrdinal) : "";
      const kicker = getSectionKicker(section);
      const headerHtml = FLAT_SECTION_SURFACES
        ? flatSectionHeaderHtml(category, theme, section.heading, pointBadge, Boolean(section.boldBlock), 0)
        : `${pointBadge || kicker ? `<p style="text-align:center;margin:0 0 8px">${pointBadge ? `<span style="display:inline-block;font-size:${FONT_SIZE.label};font-weight:700;letter-spacing:.22em;border:1px solid ${accent}66;border-radius:${RADIUS.pill}px;padding:4px 12px">${pointBadge}</span>` : ""}${kicker ? `<span style="font-size:${FONT_SIZE.caption};letter-spacing:.36em;opacity:.75;margin-left:12px">${kicker}</span>` : ""}</p>` : ""}
        ${headingParts.keyword ? `<p style="text-align:center;overflow-wrap:break-word;font-size:${FONT_SIZE.keywordClamp};font-weight:900;line-height:.92;letter-spacing:-.06em;margin:0;text-transform:uppercase;color:${section.boldBlock ? "#FAF8F3" : deep}">${esc(headingParts.keyword)}</p>` : ""}
        ${dh2(category, esc(headingParts.remainder || section.heading), `text-align:center;${titleFitCss(headingParts.keyword ? "subtitle" : "section", headingParts.remainder || section.heading, headingParts.keyword ? -0.02 : -0.03)};margin:12px 0 0`)}`;
      if (isTrustEvidence) {
        // 라이브 isTrustEvidence 분기: 1열 인용구 카드, 아이콘·번호 pill·카드 키워드 없음,
        // 헤딩이 비면 헤더 블록 자체 생략. 키워드 <p>가 없으므로 카드 제목은 원문 그대로.
        const hasHeading = Boolean(section.heading?.trim());
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${sectionBgStyle(bg, category)};color:${fg}">
        ${hasHeading ? headerHtml : ""}
        <div style="display:grid;grid-template-columns:1fr;gap:16px;max-width:768px;margin:${hasHeading ? 32 : 0}px auto 0">
          ${cards
            .map((card, i) => {
              const em = i === center;
              const title = card.title;
              const cardBg = em
                ? section.boldBlock
                  ? deepFill
                  : hexToRgba(deepFill, SECTION_BG_PATTERN_C_ALPHA)
                : section.boldBlock
                  ? hexToRgba(BRAND.paper, 0.12)
                  : FLAT_SECTION_SURFACES
                    ? FLAT_PAPER
                    : hexToRgba(accent, 0.08);
              const cardBorder = em
                ? "none"
                : `1px solid ${section.boldBlock ? hexToRgba(BRAND.paper, 0.22) : hexToRgba(accent, FLAT_SECTION_SURFACES ? 0.16 : 0.18)}`;
              const titleColor = em || section.boldBlock ? BRAND.paper : fg;
              const bodyColor = em
                ? hexToRgba(BRAND.paper, 0.9)
                : section.boldBlock
                  ? hexToRgba(BRAND.paper, 0.82)
                  : hexToRgba(BRAND.ink, 0.68);
              return `<div style="display:flex;flex-direction:column;gap:8px;border-radius:${RADIUS.lg}px;padding:40px 24px;text-align:center;background:${cardBg};border:${cardBorder};${em && !FLAT_SECTION_SURFACES ? `box-shadow:${ELEVATION.highlightEmphasis};` : ""}">
                <p style="margin:0;font-family:${DETAIL_FONT_STACK.heading};font-size:${FONT_SIZE.section};line-height:1.35;font-weight:700;letter-spacing:-0.03em;color:${titleColor}">${esc(title)}</p>
                ${card.body ? `<p style="margin:0;font-size:${FONT_SIZE.bodySm};line-height:1.625;color:${bodyColor}">${esc(card.body)}</p>` : ""}
              </div>`;
            })
            .join("")}
        </div></section>`;
      }
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${sectionBgStyle(bg, category)};color:${fg}">
        ${headerHtml}
        <div class="pagzly-hl-grid" style="display:grid;grid-template-columns:repeat(${cards.length === 4 ? 2 : 1},1fr);--pz-hl-wide:repeat(${cards.length},1fr);gap:12px;margin-top:32px">
          ${cards
            .map((card, i) => {
              const em = i === center;
              const lightEm = FLAT_SECTION_SURFACES && Boolean(section.boldBlock) && em;
              const cardKeyword = FLAT_SECTION_SURFACES
                ? parseUniformCardKeywords(cards.map((c) => c.title ?? ""))[i]!
                : parseMegaKeywordHeading(card.title);
              const cardBg = lightEm
                ? FLAT_PAPER
                : em
                ? section.boldBlock
                  ? deepFill
                  : hexToRgba(deepFill, SECTION_BG_PATTERN_C_ALPHA)
                : section.boldBlock
                  ? hexToRgba(BRAND.paper, 0.12)
                  : FLAT_SECTION_SURFACES
                    ? FLAT_PAPER
                    : hexToRgba(accent, 0.08);
              const cardBorder = em
                ? "none"
                : `1px solid ${section.boldBlock ? hexToRgba(BRAND.paper, 0.22) : hexToRgba(accent, FLAT_SECTION_SURFACES ? 0.16 : 0.18)}`;
              const titleColor = lightEm ? BRAND.ink : em || section.boldBlock ? BRAND.paper : fg;
              const bodyColor = lightEm
                ? hexToRgba(BRAND.ink, 0.68)
                : em
                ? hexToRgba(BRAND.paper, 0.9)
                : section.boldBlock
                  ? hexToRgba(BRAND.paper, 0.82)
                  : hexToRgba(BRAND.ink, 0.68);
              const showTitle = !cardKeyword.keyword || Boolean(cardKeyword.remainder);
              return `<div class="${em ? "pulse-card" : ""}" style="border-radius:${RADIUS.lg}px;padding:28px 20px;text-align:center;background:${cardBg};border:${cardBorder};${em && !FLAT_SECTION_SURFACES ? `box-shadow:${ELEVATION.highlightEmphasis};` : ""}color:${titleColor}">
                ${FLAT_SECTION_SURFACES ? "" : `<div style="font-size:${FONT_SIZE.label};letter-spacing:.22em;opacity:.7;border:1px solid ${accent}55;border-radius:${RADIUS.pill}px;display:inline-block;padding:4px 10px">${formatPointBadge(i + 1)}</div>`}
                ${cardKeyword.keyword ? `<p style="overflow-wrap:break-word;font-size:${FONT_SIZE.keywordClampCard};font-weight:900;line-height:.92;letter-spacing:-.05em;margin:${FLAT_SECTION_SURFACES ? 0 : 12}px 0 ${showTitle ? 0 : 8}px;text-transform:uppercase;color:${(em || section.boldBlock) && !lightEm ? BRAND.paper : deepText}">${esc(cardKeyword.keyword)}</p>` : ""}
                ${showTitle ? `<h3 style="margin:8px 0;font-size:${cardKeyword.keyword ? FONT_SIZE.bodySm : "inherit"};font-weight:${cardKeyword.keyword ? "600" : "700"};color:${titleColor}">${esc(cardKeyword.keyword ? cardKeyword.remainder || card.title : card.title)}</h3>` : ""}
                <p style="margin:0;font-size:${FONT_SIZE.bodySm};color:${bodyColor}">${esc(card.body)}</p>
              </div>`;
            })
            .join("")}
        </div></section>`;
    }
    case "step_card": {
      const flowHtml = isCosmeticsCategory(category) && !FLAT_SECTION_SURFACES
        ? buildUsageOrderFlowSvg(
            section.steps.map((s) => s.title).filter(Boolean),
            deep,
            "#1B1B18",
          )
        : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${kickerHtml(`<p style="text-align:center;font-size:${FONT_SIZE.caption};letter-spacing:.2em;color:${deepText}">HOW TO USE</p>`)}
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        ${(() => {
          const rowMode = section.steps.length !== 2 && section.steps.length !== 4;
          const items = section.steps
            .map((step, i) => {
              const src = imageUrls[step.imageIndex] ?? "";
              const alt = buildSectionImageAlt(productName, step.title, section.slot);
              const badge = `STEP ${String(i + 1).padStart(2, "0")}`;
              return `<div${rowMode ? ` class="pagzly-step-row" style="display:grid;grid-template-columns:40% 1fr;gap:16px;align-items:center"` : ""}><div style="position:relative;aspect-ratio:1;border-radius:${RADIUS.md}px;overflow:hidden;background:#eee">
                ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"/>` : ""}
                <span style="position:absolute;left:${rowMode ? 8 : 10}px;top:${rowMode ? 8 : 10}px;background:${deepFill};color:#FAF8F3;font-size:${rowMode ? "10px" : FONT_SIZE.label};padding:${rowMode ? "4px 10px" : "4px 10px"};border-radius:${RADIUS.pill}px;font-weight:700;letter-spacing:${rowMode ? ".18em" : ".24em"}">${badge}</span>
              </div><div style="min-width:0"><h3 style="margin:${rowMode ? "0" : "12px"} 0 4px;font-size:16px;font-weight:700;letter-spacing:-0.02em">${esc(step.title)}</h3><p style="margin:0;font-size:${rowMode ? "13px" : FONT_SIZE.sm};line-height:1.625;opacity:.8;word-break:keep-all">${esc(step.body)}</p></div></div>`;
            })
            .join("");
          return rowMode
            ? `<div class="pagzly-step-rows" style="display:grid;grid-template-columns:1fr;gap:20px;margin-top:32px">${items}</div>`
            : `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:32px">${items}</div>`;
        })()}${flowHtml}</section>`;
    }
    case "stat_infographic": {
      // 151차 — 각주(sourceNote)가 있는 measured metric에 순서대로 번호를 매겨
      // 값 옆에 표시하고, 섹션 하단에 목록으로 모은다 (DetailSectionRenderer.tsx와 동일 원칙).
      const footnotes: { number: number; text: string }[] = [];
      // 158차 — 동일 출처(sourceNote 텍스트가 완전히 같음)는 각주 번호를 하나만 공유
      // (DetailSectionRenderer.tsx와 동일 원칙 — 실사 디자이너 사례 대비 발견된 중복 격차).
      const footnoteNumberByText = new Map<string, number>();
      const footnoteMarkFor = (m: (typeof section.metrics)[number]) => {
        const note = m.sourceNote?.trim();
        if (m.basis !== "measured" || !note) return "";
        let number = footnoteNumberByText.get(note);
        if (number == null) {
          number = footnotes.length + 1;
          footnotes.push({ number, text: note });
          footnoteNumberByText.set(note, number);
        }
        return `<sup style="margin-left:2px;font-size:${FONT_SIZE.label};font-weight:600;letter-spacing:0;color:${accentText}">${number}</sup>`;
      };
      // 각주 번호는 라이브처럼 원래 metric 순서로 먼저 매긴다(아래 렌더는 스타일별로 묶음)
      section.metrics.forEach((m) => footnoteMarkFor(m));
      const metricHtml = (m: (typeof section.metrics)[number]) => {
          const pct = Math.min(100, Math.max(0, m.percent ?? 0));
          if (m.style === "number") {
            // 154차 — 라이브 렌더러와 동일하게 숫자를 "히어로 넘버"로 키움(2rem→3rem,
            // 700→800, 라벨은 소문자 캡션에서 대문자 트래킹 라벨로).
            return `<div style="text-align:center;container-type:inline-size;padding:32px 16px;border-radius:${RADIUS.lg}px;${FLAT_SECTION_SURFACES ? `background:${FLAT_PAPER};border:1px solid ${hexToRgba(accent, 0.16)}` : `background:rgba(250,248,243,.78);box-shadow:${ELEVATION.imageThumb}`}"><div class="pz-fit" style="${titleFitCss("statNumber", m.value, -0.05)};font-weight:800;line-height:1;letter-spacing:-0.02em;color:${deepText}">${statValueHtml(m.value)}${footnoteMarkFor(m)}</div><div style="margin-top:6px;${STAT_LABEL_CSS}">${esc(m.label)}</div></div>`;
          }
          if (m.style === "ring") {
            // 241차 — 라이브 RadialGauge(size=112, strokeWidth=10)와 동일 기하로
            // SVG 원형 게이지를 정적 생성. stroke-dashoffset은 percent로 결정론적
            // 계산(애니메이션은 .fill-bar와 동일한 순수 CSS keyframe, JS 불필요).
            const size = 112;
            const strokeWidth = 10;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference * (1 - pct / 100);
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
                <div style="position:relative;width:${size}px;height:${size}px">
                  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)" aria-hidden="true">
                    <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${hexToRgba(accent, 0.16)}" stroke-width="${strokeWidth}"/>
                    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${deep}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="--ring-empty:${circumference};--ring-offset:${offset}"/>
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${titleSizeCss("statRing")};font-weight:800;letter-spacing:-0.01em;color:${deepText}">${statValueHtml(m.value)}${footnoteMarkFor(m)}</div>
                </div>
                <span style="${STAT_LABEL_CSS}">${esc(m.label)}</span>
              </div>`;
          }
          const barColor = section.barAccent === "emphasis" ? deep : accent;
          return `<div><div style="display:flex;justify-content:space-between;align-items:baseline;font-size:${FONT_SIZE.bodySm}"><span>${esc(m.label)}</span><strong style="font-size:${titleSizeCss("statBar")};font-weight:800;line-height:1;letter-spacing:-0.01em">${statValueHtml(m.value)}${footnoteMarkFor(m)}</strong></div>
                ${
                  FLAT_SECTION_SURFACES && isConcentrationMetricLabel(m.label)
                    ? `<div style="height:1px;background:${hexToRgba(accent, 0.2)};margin-top:12px"></div>`
                    : `<div style="height:${section.barAccent === "emphasis" ? 14 : 10}px;background:${barColor}29;border-radius:${RADIUS.pill}px;margin-top:8px;overflow:hidden">
                  <div class="fill-bar" style="height:100%;width:${pct}%;background:${barColor};border-radius:${RADIUS.pill}px"></div>
                </div>`
                }</div>`;
      };
      // 라이브와 같은 배치: 숫자 카드 그리드 → 링 그리드 → 막대 목록
      const numberMetrics = section.metrics.filter((m) => m.style === "number");
      const ringMetrics = section.metrics.filter((m) => m.style === "ring");
      const barMetrics = section.metrics.filter((m) => m.style !== "number" && m.style !== "ring");
      const statGrid = (items: typeof section.metrics, gap: string) => {
        if (items.length === 0) return "";
        const n = items.length;
        const cols = n <= 1 ? "max-width:320px;grid-template-columns:1fr" : n === 2 ? "max-width:448px;grid-template-columns:repeat(2,1fr)" : "max-width:672px;grid-template-columns:repeat(2,1fr)";
        return `<div${n >= 3 ? ` class="pagzly-stat-grid3"` : ""} style="display:grid;${cols};gap:${gap};margin:40px auto 0">${items.map(metricHtml).join("")}</div>`;
      };
      const statRule = `1px solid ${hexToRgba(accent, 0.2)}`;
      const stripMetrics =
        FLAT_SECTION_SURFACES &&
        numberMetrics.length >= 1 &&
        numberMetrics.length + ringMetrics.length <= 3
          ? section.metrics.filter((m) => m.style === "number" || m.style === "ring")
          : null;
      const numberStrip = stripMetrics
          ? `<div style="display:flex;align-items:stretch;max-width:${stripMetrics.length === 1 ? 320 : stripMetrics.length === 2 ? 448 : 672}px;margin:40px auto 0;border-top:${statRule};border-bottom:${statRule}">${stripMetrics
              .map(
                (m, i) =>
                  `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 8px;text-align:center${i > 0 ? `;border-left:${statRule}` : ""}"><div style="width:100%;container-type:inline-size"><div class="pz-fit" style="${titleFitCss("statNumber", m.value, -0.05)};font-weight:800;line-height:1;letter-spacing:-0.02em;color:${deepText}">${statValueHtml(m.value)}${footnoteMarkFor(m)}</div></div><div style="margin-top:2px;${STAT_LABEL_CSS}">${esc(m.label)}</div></div>`,
              )
              .join("")}</div>`
          : null;
      const metricsHtml = [
        numberStrip ?? statGrid(numberMetrics, "24px 20px"),
        stripMetrics ? "" : statGrid(ringMetrics, "32px 20px"),
        barMetrics.length > 0
          ? `<div style="max-width:576px;margin:40px auto 0;display:flex;flex-direction:column;gap:28px">${barMetrics.map(metricHtml).join("")}</div>`
          : "",
      ].join("");
      const footnotesHtml =
        footnotes.length > 0
          ? `<div style="max-width:480px;margin:16px auto 0">${footnotes
              .map(
                (fn) =>
                  `<p style="text-align:center;font-size:${FONT_SIZE.caption};line-height:1.6;opacity:.4;margin:0">${fn.number}. ${esc(fn.text)}</p>`,
              )
              .join("")}</div>`
          : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        ${metricsHtml}${footnotesHtml}</section>`;
    }
    case "comparison_chart":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">${comparisonChartBodyHtml(section, theme, category)}</section>`;
    case "tradeoff_card": {
      const recommendFor = (Array.isArray(section.recommendFor) ? section.recommendFor : [])
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4);
      const considerIf = (Array.isArray(section.considerIf) ? section.considerIf : [])
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4);
      if (recommendFor.length === 0 && considerIf.length === 0) return "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${kickerHtml(`<p style="text-align:center;color:${deepText};font-size:${FONT_SIZE.caption};letter-spacing:.2em">FIT CHECK</p>`)}
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <div style="max-width:${recommendFor.length > 0 && considerIf.length > 0 ? 720 : 576}px;margin:32px auto 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px">
          ${recommendFor.length > 0 ? `<div style="border-radius:${RADIUS.lg}px;padding:20px;${FLAT_SECTION_SURFACES ? `background:${FLAT_PAPER};border:1px solid ${hexToRgba(accent, 0.24)}` : `background:${accent}1a`}">
            <p style="margin:0 0 14px;font-size:${FONT_SIZE.sm};font-weight:600;letter-spacing:-0.01em;color:${deepText}">이런 분께 추천</p>
            ${recommendFor.map((item) => `<p style="display:flex;gap:8px;margin:0 0 12px;font-size:${FONT_SIZE.bodySm};line-height:1.6;color:rgba(27,27,24,.8)"><span aria-hidden="true" style="flex-shrink:0;width:16px;text-align:center;font-weight:700;color:${accentText}">✓</span><span>${esc(item)}</span></p>`).join("")}
          </div>` : ""}
          ${considerIf.length > 0 ? `<div style="border-radius:${RADIUS.lg}px;padding:20px;${FLAT_SECTION_SURFACES ? `background:${FLAT_PAPER};border:1px solid ${hexToRgba(BRAND.ink, 0.1)}` : `background:${theme.baseNeutral}59`}">
            <p style="margin:0 0 14px;font-size:${FONT_SIZE.sm};font-weight:600;letter-spacing:-0.01em;color:rgba(27,27,24,.6)">이런 점은 참고하세요</p>
            ${considerIf.map((item) => `<p style="display:flex;gap:8px;margin:0 0 12px;font-size:${FONT_SIZE.bodySm};line-height:1.6;color:rgba(27,27,24,.7)"><span aria-hidden="true" style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin-top:2px;border:1.5px solid rgba(27,27,24,.45);border-radius:50%;font-size:10px;font-weight:700;line-height:1;color:rgba(27,27,24,.55)">i</span><span>${esc(item)}</span></p>`).join("")}
          </div>` : ""}
        </div>
      </section>`;
    }
    case "image_text": {
      if (FLAT_SECTION_SURFACES && isEmptySizeOptions(section)) return "";
      // text_only는 배정 단계가 사진을 뺀 섹션 — imageIndex는 원본 값이 남아 있어 아래 분기로
      // 떨어지면 뺀 사진이 다시 붙는다.
      if (section.layout === "text_only") {
        return `<section${sectionIdAttr} style="padding:40px 24px;${sectionInset}${bgCss}">
          <div style="max-width:576px;margin:0 auto;text-align:${FLAT_SECTION_SURFACES ? "center" : "left"}">
            ${dh2(category, esc(section.heading), `${titleFitCss("section", section.heading, -0.03)};margin:0;line-height:1.2;color:${readableTextDeep(theme, 3)}`)}
            <p style="margin:16px 0 0;white-space:pre-line;font-size:${titleSizeCss("body")};line-height:1.9;color:${BRAND.ink}">${esc(section.body)}</p>
          </div>
        </section>`;
      }
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
      if (FLAT_SECTION_SURFACES && (isCircleSolo || isCirclePair)) {
        const labels = isCircleSolo
          ? [section.circleSolo!.label]
          : section.circlePair!.map((p) => p.label);
        if (isRedundantSoloVenn(labels, section.heading, section.body)) return "";
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">${ingredientVennHtml(labels, deepText, DETAIL_FONT_STACK.heading)}</section>`;
      }
      if (isCircleSolo) {
        const solo = section.circleSolo!;
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}"><div style="text-align:center;max-width:280px;margin:0 auto"><img src="${esc(solo.imageUrl)}" alt="${esc(solo.label)}" loading="lazy" decoding="async" class="pagzly-circle-solo-img" style="border-radius:${RADIUS.pill}px;object-fit:cover;margin:0 auto;display:block;box-shadow:${ELEVATION.imageThumb}"/><p style="margin-top:12px;font-size:${FONT_SIZE.bodySm};font-weight:600;color:${deepText}">${esc(solo.label)}</p></div></section>`;
      }
      if (isCirclePair) {
        const pairHtml = section.circlePair!
          .map(
            (item) =>
              `<div style="flex:1;min-width:0;text-align:center"><img src="${esc(item.imageUrl)}" alt="${esc(item.label)}" loading="lazy" decoding="async" class="pagzly-circle-pair-img" style="border-radius:${RADIUS.pill}px;object-fit:cover;margin:0 auto;display:block;box-shadow:${ELEVATION.imageThumb}"/><p style="margin-top:12px;font-size:${FONT_SIZE.sm};font-weight:600;color:${deepText}">${esc(item.label)}</p></div>`,
          )
          .join("");
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}"><div style="display:flex;justify-content:center;gap:32px;max-width:360px;margin:0 auto">${pairHtml}</div></section>`;
      }
      // 225차 — layout:"compact"(quick_points 슬롯 등)가 export에 아예 없어 기본(split)
      // 분기로 떨어져 라이브와 완전히 다른 레이아웃(전체폭 정사각 이미지)으로 나오던 문제.
      // 라이브(DetailSectionRenderer.tsx:1609~1660)와 동일하게 작은 썸네일 + 한 줄 텍스트로 복원.
      if (section.layout === "compact") {
        const imageFirst = FLAT_SECTION_SURFACES || section.imagePosition !== "right";
        const shape = FLAT_SECTION_SURFACES
          ? (section.imageShape ?? "square")
          : compactImageTextIndex != null && totalCompactImageTextCount != null
            ? resolveCompactImageShape(section, compactImageTextIndex, totalCompactImageTextCount)
            : resolveCompactImageShape(section, 0, 1);
        const thumbRadius = shape === "circle" ? RADIUS.pill : RADIUS.md;
        const compactDivider =
          FLAT_SECTION_SURFACES &&
          compactImageTextIndex != null &&
          totalCompactImageTextCount != null &&
          compactImageTextIndex < totalCompactImageTextCount - 1;
        const sectionStyle = FLAT_SECTION_SURFACES
          ? `padding:0 24px;${sectionInset}background:${FLAT_PAPER}`
          : `padding:20px 24px;${sectionInset}${bgCss}`;
        return `<section${sectionIdAttr} style="${sectionStyle}">
          <div style="max-width:576px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-direction:${imageFirst ? "row" : "row-reverse"}${FLAT_SECTION_SURFACES ? ";padding:20px 0" : ""}${compactDivider ? `;border-bottom:1px solid ${hexToRgba(BRAND.ink, 0.08)}` : ""}">
            <div style="flex-shrink:0">
              ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:120px;height:120px;object-fit:cover;border-radius:${thumbRadius}px"/>` : ""}
            </div>
            <div style="min-width:0;flex:1;text-align:${imageFirst ? "left" : "right"}">
              <h3 style="margin:0;font-family:${DETAIL_FONT_STACK.heading};font-size:${titleSizeCss("compact")};font-weight:600;line-height:1.35;letter-spacing:-0.02em;color:#1B1B18;overflow-wrap:anywhere">${esc(section.heading)}</h3>
              <p style="margin:6px 0 0;font-family:${DETAIL_FONT_STACK.sans};font-size:${FONT_SIZE.bodySm};font-weight:400;line-height:1.6;color:rgba(27,27,24,.75);overflow-wrap:anywhere">${esc(section.body)}</p>
            </div>
          </div>
        </section>`;
      }
      if (isCallout && section.callout && FLAT_SECTION_SURFACES) {
        return `<section${sectionIdAttr} class="pagzly-callout" style="padding:0 0 64px;${sectionInset}${bgCss}">
          <div style="position:relative">
            ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:${imageRatioCss(resolveSlotImageRatio(section))};object-fit:cover;display:block"/>` : ""}
            <p style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);background:${deepFill};color:#FAF8F3;padding:12px 20px;border-radius:${RADIUS.lg}px;font-size:${FONT_SIZE.body};font-weight:600;text-align:center;max-width:85%;margin:0">${esc(section.callout)}</p>
          </div>
          <div style="max-width:576px;margin:0 auto;padding:48px 40px 0;text-align:center">
            ${twoToneDh2(category, theme, section.heading, `${titleFitCss("section", section.heading, -0.03)};margin:0`)}
            <div style="margin:16px 0 0"><p style="margin:0;line-height:1.85;font-size:${titleSizeCss("body")};color:${hexToRgba(BRAND.ink, 0.82)};overflow-wrap:anywhere">${emphasizedBodyHtml(section.body, section.emphasis, accent)}</p></div>
          </div>
        </section>`;
      }
      if (isCallout && section.callout) {
        return `<section${sectionIdAttr} class="pagzly-callout" style="${pad}${sectionInset}${bgCss}">
          <div style="position:relative;margin-bottom:20px">
            ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:${imageRatioCss(resolveSlotImageRatio(section))};object-fit:cover;border-radius:${RADIUS.md}px"/>` : ""}
            <p style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:${deepFill};color:#FAF8F3;padding:10px 18px;border-radius:${RADIUS.lg}px;font-size:${FONT_SIZE.bodySm};font-weight:600;text-align:center;max-width:85%">${esc(section.callout)}</p>
          </div>
          ${dh2(category, esc(section.heading), `${titleFitCss("section", section.heading, -0.03)}`)}
          <p style="line-height:1.65;font-size:${titleSizeCss("body")};opacity:.85;overflow-wrap:anywhere">${esc(section.body)}</p>
        </section>`;
      }
      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        const ringLabels =
          section.slot === "material_feature" && isIngredientRingCategory(category)
            ? prepareIngredientRingLabels(ingredients)
            : null;
        const ringHtml = ringLabels
          ? buildIngredientRingDiagramSvg(ringLabels, deep, "#1B1B18")
          : "";
        return `<section${sectionIdAttr} class="pagzly-editorial" style="padding:0;background:${sectionBg}">
          <div style="position:relative">
            ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:${imageRatioCss(resolveSlotImageRatio(section))};object-fit:cover;display:block"/>` : ""}
            <div style="position:absolute;inset:0;background:linear-gradient(0deg,${hexToRgba(BRAND.ink, 0.82)} 0%,${hexToRgba(BRAND.ink, 0.4)} 24%,${hexToRgba(BRAND.ink, 0.08)} 42%,transparent 55%)"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:24px 24px 28px;text-align:center">
              ${kicker ? `<p style="font-size:${FONT_SIZE.caption};letter-spacing:.36em;color:rgba(250,248,243,.85);margin:0 0 10px">${kicker}</p>` : ""}
              ${dh2(category, esc(section.heading), `font-size:${titleSizeCss("banner")};margin:0;line-height:1.15;color:#FAF8F3;text-shadow:0 2px 20px rgba(0,0,0,.4);max-width:100%`)}
            </div>
          </div>
          <div style="padding:24px 24px 48px;text-align:center;max-width:640px;margin:0 auto">
            <p style="line-height:1.85;font-size:${titleSizeCss("body")};color:${hexToRgba(BRAND.ink, 0.82)}">${emphasizedBodyHtml(section.body, section.emphasis, accent)}</p>
            ${ringHtml}
          </div>
        </section>`;
      }
      if (shouldUseSplitLayout(section)) {
        const isAnnotatedSection =
          section.layout === "annotated" &&
          Array.isArray(section.annotations) &&
          section.annotations.length > 0;
        const imageLeft = resolveSplitImageLeft(section, pointIndex);
        // annotated 레이아웃은 라이브(DetailSectionRenderer.tsx의 isAnnotated 분기)가
        // 항상 고정 50/50(sm:grid-cols-2)을 쓰고 60/40 리듬을 적용하지 않음
        // (resolveSplitColumnRatio 주석 참고: "annotated/callout 등 다른 image_text
        // 레이아웃에는 적용하지 않고"). export도 동일하게 맞춘다.
        const columnRatio = isAnnotatedSection
          ? { image: 1, text: 1 }
          : resolveSplitFlexRatio(pointIndex);
        // 라이브의 isAnnotated 분기는 POINT 배지를 렌더링하지 않음(pointIndex는 계산되지만
        // 표시 안 함) — export도 annotated 섹션엔 POINT 배지를 숨긴다.
        const pointLabel =
          pointIndex != null && !isAnnotatedSection
            ? `POINT ${String(pointIndex + 1).padStart(2, "0")}`
            : "";
        const annotationOverlayHtml = isAnnotatedSection
          ? buildAnnotatedImageOverlaySvg(section.annotations!, deep)
          : "";
        const kicker = getSectionKicker(section) ?? "FEATURE";
        const slotRatio = resolveSlotImageRatio(section);
        const splitAspect = imageRatioCss(
          isAnnotatedSection ? slotRatio : resolvePointImageRatio(slotRatio, pointIndex),
        );
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
        const ringLabels =
          section.slot === "ingredient_highlight" && isIngredientRingCategory(category)
            ? prepareIngredientRingLabels(ingredients)
            : null;
        const ringHtml = ringLabels
          ? buildIngredientRingDiagramSvg(ringLabels, deep, "#1B1B18")
          : "";
        if (FLAT_SECTION_SURFACES) {
          const pill = pointOrdinal != null && !isAnnotatedSection ? formatPointBadge(pointOrdinal) : "";
          const compliance =
            section.slot === "ingredient_highlight" && isCosmeticsCategory(category)
              ? `<p style="margin-top:12px;font-size:${FONT_SIZE.caption};line-height:1.6;opacity:.55">${esc(INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE)}</p>`
              : "";
          return `<section${sectionIdAttr} class="pagzly-stacked" style="padding:80px 0;${sectionInset}${bgCss}">
          <div style="padding:0 40px">${flatSectionHeaderHtml(category, theme, section.heading, pill, false, 40, false)}</div>
          <div style="position:relative">
            ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:${splitAspect};object-fit:cover;display:block"/>` : ""}
            ${annotationOverlayHtml}
          </div>
          <div style="max-width:576px;margin:0 auto;padding:48px 40px 0;text-align:center">
            <p style="margin:0;line-height:1.85;font-size:${titleSizeCss("body")};color:${hexToRgba(BRAND.ink, 0.82)};overflow-wrap:anywhere">${emphasizedBodyHtml(section.body, section.emphasis, accent)}</p>
            ${compliance}
          </div>
          ${pkgHtml}${foodHtml}${ringHtml}
        </section>`;
        }
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
          <div style="display:flex;flex-wrap:wrap;gap:32px;max-width:960px;margin:0 auto;align-items:center">
            <div style="flex:${columnRatio.image} 1 280px;order:${imageLeft ? 1 : 2};position:relative">
              ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:${splitAspect};object-fit:cover;border-radius:${RADIUS.lg}px;box-shadow:${ELEVATION.imageLift(theme.deepAccent)}"/>` : ""}
              ${annotationOverlayHtml}
              ${pointLabel ? `<span style="position:absolute;left:16px;top:16px;background:${hexToRgba(deepFill, 0.9)};color:#FAF8F3;font-size:${FONT_SIZE.label};font-weight:700;letter-spacing:.28em;padding:6px 12px;border-radius:${RADIUS.pill}px">${pointLabel}</span>` : ""}
            </div>
            <div style="flex:${columnRatio.text} 1 280px;order:${imageLeft ? 2 : 1};container-type:inline-size">
              <p style="font-size:${FONT_SIZE.caption};letter-spacing:.36em;color:${deepText};margin:0 0 12px">${kicker}</p>
              ${
                section.slot === "ingredient_highlight"
                  ? `<div style="width:56px;height:6px;background:${accent};margin:0 0 16px;border-radius:${RADIUS.hairline}px"></div>`
                  : ""
              }
              ${dh2(category, esc(section.heading), `${titleFitCss("section", section.heading, -0.03)};margin:0`)}
              <p style="line-height:1.75;font-size:${titleSizeCss("body")};opacity:.85;margin-top:16px;overflow-wrap:anywhere">${esc(section.body)}</p>
              ${
                section.slot === "ingredient_highlight" && isCosmeticsCategory(category)
                  ? `<p style="margin-top:12px;font-size:${FONT_SIZE.caption};line-height:1.5;opacity:.55">${esc(INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE)}</p>`
                  : ""
              }
            </div>
          </div>
          ${pkgHtml}${foodHtml}${ringHtml}
        </section>`;
      }
      // 라이브에서 이 경로에 해당하는 섹션은 callout 분기(본문 3줄) 또는 split 분기(헤딩 5·본문 7줄)
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${src ? `<div style="padding:0 12px"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:${RADIUS.lg}px;box-shadow:${ELEVATION.imageSoft(theme.deepAccent)}"/></div>` : ""}
        ${textPanelWrap(
          theme,
          `${dh2(category, esc(section.heading), `${titleFitCss("section", section.heading, -0.03)};margin:0`)}
        <p style="line-height:1.65;font-size:${titleSizeCss("body")};opacity:.85;margin-top:16px;overflow-wrap:anywhere">${esc(section.body)}</p>`,
        )}
      </section>`;
    }
    case "spec_table": {
      // 232차 — live는 빈 라벨 행을 매처/테이블에 넘기기 전에 걸러내는데(visibleRows)
      // export에는 이 필터가 없었음. 빈 라벨 행은 별칭 매칭이 항상 참이 되는 구조라
      // (rowLooksLikeWeight의 alias.includes("")) 라이브에는 안 뜨고 export에만 뜨는
      // 유령 다이어그램 위험이 있었음. live와 동일하게 필터링.
      const visibleRows = section.rows.filter((row) => row.label.trim());
      if (visibleRows.length === 0) return "";
      const isShipping = section.slot === "shipping_info";
      const isSizeTable = section.slot === "size_table";
      const sizeMatches =
        isSizeTable && isFashionCategory(category)
          ? matchSizeDiagramRows(visibleRows)
          : [];
      const comparisonDims =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchSizeComparisonRows(visibleRows)
          : [];
      const volumeEntries =
        section.slot === "spec_table" && isCosmeticsCategory(category)
          ? buildVolumeComparisonEntries(matchProductVolumeMl(visibleRows))
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
      // 158차 — 소음(dB) 스펙 행은 크기/용량과 별개 물성이라 다른 다이어그램과 함께 나와도 됨.
      const noiseMatch =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchNoiseComparisonRow(visibleRows)
          : null;
      const noiseHtml = noiseMatch
        ? buildNoiseComparisonDiagramSvg(
            noiseMatch.db,
            noiseMatch.value,
            baseTheme.accentText,
            baseTheme.accentText,
          )
        : "";
      // 160차 — IP/IPX 방수 등급 공개 기준표.
      const waterproofMatch =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchWaterproofIpRow(visibleRows)
          : null;
      const waterproofHtml = waterproofMatch
        ? buildWaterproofIpDiagramSvg(
            waterproofMatch.level,
            waterproofMatch.value,
            baseTheme.accentText,
            baseTheme.accentText,
          )
        : "";
      // 162차 — 무게(g/kg) 공개 기준표. 소음/방수와 같은 패밀리, 카테고리 무관.
      // 232차 — FOOD는 스펙성 슬롯이 spec_table이 아니라 nutrition_table이라 이 게이트가
      // 한 번도 매칭되지 않았음(162차 주석이 명시한 대상에 식품 포함). FOOD 한정으로 추가.
      const weightMatch =
        (section.slot === "spec_table" ||
          (isFoodCategory(category) && section.slot === "nutrition_table")) &&
        !isFashionCategory(category)
          ? matchWeightComparisonRow(visibleRows)
          : null;
      const weightHtml = weightMatch
        ? buildWeightComparisonDiagramSvg(
            weightMatch.g,
            weightMatch.value,
            baseTheme.accentText,
            baseTheme.accentText,
          )
        : "";
      // 163차 — 소비전력(W) 공개 기준표. 소음/방수/무게와 같은 패밀리, 카테고리 무관.
      const powerMatch =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchPowerComparisonRow(visibleRows)
          : null;
      const powerHtml = powerMatch
        ? buildPowerConsumptionDiagramSvg(
            powerMatch.w,
            powerMatch.value,
            baseTheme.accentText,
            baseTheme.accentText,
          )
        : "";
      const diagramHtml =
        (sizeMatches.length > 0
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
                : "") +
        noiseHtml +
        waterproofHtml +
        weightHtml +
        powerHtml;
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
                  `<img src="${esc(url)}" alt="${esc(buildSectionImageAlt(productName, specThumbUrls.length > 1 ? `${section.heading} ${ti + 1}` : section.heading, section.slot))}" loading="lazy" decoding="async" style="width:${thumbSize}px;height:${thumbSize}px;object-fit:cover;border-radius:${thumbRadius}px;box-shadow:${ELEVATION.imageThumb};border:${ELEVATION.specThumbBorder}"/>`,
              )
              .join("")}</div>`
          : "";
      const specTableBg =
        section.slot === "spec_table" && !FLAT_SECTION_SURFACES
          ? `background:${hexToRgba(theme.baseNeutral, 0.06)};`
          : "";
      const { shown: tableRows, pendingLabels } =
        FLAT_SECTION_SURFACES && !isShipping
          ? groupPendingSpecRows(visibleRows)
          : { shown: visibleRows, pendingLabels: [] as string[] };
      const pendingRowHtml = pendingLabels.length
        ? `<tr style="border-top:1px solid ${hexToRgba(BRAND.ink, INFO_TABLE.specRuleInkAlpha)}"><th style="text-align:left;padding:12px 16px;width:38%;opacity:.55;font-weight:500;font-size:${FONT_SIZE.sm};letter-spacing:-0.01em">${PENDING_SPEC_ROW_LABEL}</th><td style="padding:12px 16px;font-size:13px;line-height:1.625;letter-spacing:-0.025em;color:rgba(27,27,24,.45)">${esc(pendingLabels.join(" · "))}</td></tr>`
        : "";
      const rowsHtml = tableRows
        .map((row, ri) => {
          const certHighlight = isCertificationHighlight(row.label, row.value, certTokens);
          const valueHtml = certHighlight
            ? `<span style="display:inline-block;padding:2px 8px;border-radius:${RADIUS.sm}px;color:${accentText};background:${accent}24;box-shadow:${ELEVATION.certUnderlineExportHex(accent + "8c")}">${esc(row.value)}</span>`
            : esc(displaySpecValue(row.label, row.value));
          const rowRule =
            ri === tableRows.length - 1
              ? "none"
              : `1px solid ${isShipping ? `${accent}33` : hexToRgba(BRAND.ink, INFO_TABLE.specRuleInkAlpha)}`;
          return `<tr style="border-bottom:${rowRule}"><th style="text-align:left;padding:12px 16px;width:38%;opacity:.55;font-weight:500;font-size:${FONT_SIZE.sm};letter-spacing:-0.01em">${esc(row.label)}</th><td style="padding:12px 16px;letter-spacing:-0.025em;${isPlaceholderValue(row.value) ? "font-weight:400;color:rgba(27,27,24,.45)" : "font-weight:500"}">${valueHtml}</td></tr>`;
        })
        .join("") + pendingRowHtml;
      const specEdge = `1px solid ${hexToRgba(BRAND.ink, INFO_TABLE.specEdgeInkAlpha)}`;
      const tableHtml = `<table style="width:100%;border-collapse:collapse;font-size:${FONT_SIZE.bodySm}${isShipping ? "" : `;border-top:${specEdge};border-bottom:${specEdge}`}"><tbody>${rowsHtml}</tbody></table>`;
      const tableMargin = diagramHtml ? "16px" : "24px";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${specTableBg}${bgCss}" class="${isShipping ? "pagzly-shipping" : ""}">
        ${kickerHtml(`<p style="text-align:center;font-size:${FONT_SIZE.caption};letter-spacing:.2em;color:${deepText}">INFO</p>`)}
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        ${thumbHtml}
        ${diagramHtml}
        ${
          isShipping
            ? FLAT_SECTION_SURFACES
              ? `<div class="pagzly-shipping-table" style="max-width:560px;margin:${tableMargin} auto 0;border:1px solid ${hexToRgba(accent, 0.2)};border-radius:12px;overflow:hidden;background:${FLAT_PAPER}">${tableHtml}</div>`
              : `<div class="pagzly-shipping-table" style="max-width:560px;margin:${tableMargin} auto 0;border:2px solid ${accent}59;border-radius:${RADIUS.md}px;overflow:hidden;background:${sectionBg}80">${tableHtml}</div>`
            : `<div style="max-width:560px;margin:${tableMargin} auto 0">${tableHtml}</div>`
        }
        ${
          sizeMatches.length > 0
            ? `<div style="max-width:560px;margin:16px auto 0"><p style="text-align:center;font-size:11px;line-height:1.6;opacity:.4;margin:0 0 2px">* 사이즈는 측정 방법에 따라 1~3cm 오차가 발생할 수 있습니다.</p><p style="text-align:center;font-size:11px;line-height:1.6;opacity:.4;margin:0">* 사람마다 체형이 다르기 때문에 착용감이 조금씩 다를 수 있습니다.</p></div>`
            : ""
        }
      </section>`;
    }
    case "gallery": {
      // 라이브와 같은 풀블리드 그리드: 뷰티 2장 이상 2열, 2장 이하 1열, 그 외 2열→넓은 칸 3열
      const pairCompare = category === "화장품/뷰티" && section.imageIndexes.length >= 2;
      const cols = pairCompare ? 2 : section.imageIndexes.length <= 2 ? 1 : 2;
      const oddLead =
        !pairCompare && section.imageIndexes.length >= 3 && section.imageIndexes.length % 2 === 1;
      const wideCols = !pairCompare && section.imageIndexes.length % 6 === 0;
      const galleryAspect = imageRatioCss(resolveSlotImageRatio(section));
      return `<section${sectionIdAttr} class="pagzly-gallery" style="padding:40px 0 0;${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)};margin:0 24px 32px${flatTitleColorCss(theme)}`)}
        <div${wideCols ? ` class="pagzly-gallery-grid3"` : ""} style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;background:${accent}2e">
          ${section.imageIndexes
            .map((idx, pos) => {
              const src = imageUrls[idx] ?? "";
              const alt = buildSectionImageAlt(productName, `${section.heading} ${idx + 1}`, section.slot);
              const lead = oddLead && pos === 0;
              return src
                ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:${lead ? "4/3" : galleryAspect};object-fit:cover;display:block${lead ? ";grid-column:1/-1" : ""}"/>`
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
          return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:${RADIUS.md}px;display:block"/>`;
        })
        .filter(Boolean);
      const galleryHtml =
        storyImgs.length > 0
          ? `<div style="margin-top:28px;display:grid;grid-template-columns:repeat(${Math.min(storyImgs.length, 2)},1fr);gap:12px">${storyImgs.join("")}</div>`
          : "";
      const storyInner = `${kickerHtml(`<p style="font-size:${FONT_SIZE.caption};letter-spacing:.2em;color:${deepText};margin:0 0 12px">STORY</p>`)}
          ${twoToneDh2(category, theme, section.heading, `${titleFitCss("section", section.heading, -0.03)};margin:0`)}
          <p style="line-height:1.75;font-size:${titleSizeCss("body")};opacity:.85;margin-top:16px;white-space:pre-line">${esc(section.body)}</p>${galleryHtml}`;
      if (hasBrandCard && FLAT_SECTION_SURFACES) {
        return `<section${sectionIdAttr} class="pagzly-brand-story">
        <div data-brand-signature style="padding:64px 40px;text-align:center;background:${flatAccentTint(theme)}">
          <p style="font-family:${DETAIL_FONT_STACK.label};font-size:${FONT_SIZE.caption};font-weight:600;letter-spacing:.32em;text-transform:uppercase;color:${deepText};margin:0">${esc(categoryKeyword)}</p>
          <p class="pz-fit" style="font-family:${DETAIL_FONT_STACK.heading};${titleFitCss("section", brandName!, -0.03)};font-weight:800;line-height:1.05;letter-spacing:-0.03em;color:${readableTextAccent(theme, 3)};margin:12px 0 0">${esc(brandName!)}</p>
          <span aria-hidden="true" style="display:block;width:40px;height:3px;border-radius:${RADIUS.pill}px;background:${solidAccentOnPaper(theme)};margin:20px auto 0"></span>
        </div>
        <div style="${pad}${sectionInset}background:${FLAT_PAPER};text-align:center">
        ${textPanelWrap(theme, storyInner)}
        </div></section>`;
      }
      if (hasBrandCard) {
        return `<section${sectionIdAttr} class="pagzly-brand-story">
        <div style="padding:64px 20px;text-align:center;background:${deepFill};color:#FAF8F3">
          <p style="font-family:${DETAIL_FONT_STACK.label};font-size:${FONT_SIZE.caption};letter-spacing:.32em;opacity:.75;margin:0">${esc(brandName!)}</p>
          <p style="font-size:${FONT_SIZE.categoryKeyword};font-weight:900;line-height:.92;letter-spacing:-.06em;text-transform:uppercase;margin:16px 0 0">${esc(categoryKeyword)}</p>
        </div>
        <div style="${pad}${sectionInset}${bgCss}">
        ${textPanelWrap(theme, storyInner)}
        </div></section>`;
      }
      return `<section${sectionIdAttr} class="pagzly-brand-story" style="${pad}${sectionInset}${bgCss}">
        ${textPanelWrap(theme, storyInner)}
      </section>`;
    }
    case "target_persona":
      if (FLAT_SECTION_SURFACES) {
        const check = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${BRAND.paper}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
        return `<section${sectionIdAttr} class="pagzly-persona" style="${pad}${sectionInset}${bgCss}">
        <div style="text-align:center;max-width:576px;margin:0 auto">${twoToneDh2(category, theme, section.heading, `${titleFitCss("section", section.heading, -0.03)};margin:0`)}</div>
        <ul style="max-width:576px;margin:32px auto 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px">
          ${section.personas.map((p) => `<li style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:${RADIUS.lg}px;border:1px solid ${hexToRgba(theme.accent, 0.16)};background:${FLAT_PAPER};font-size:16px;font-weight:500;line-height:1.375;color:${BRAND.ink}"><span style="display:flex;flex-shrink:0;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${solidAccentOnPaper(theme)}">${check}</span><span style="min-width:0;flex:1;text-align:left">${esc(p)}</span></li>`).join("")}
        </ul>
      </section>`;
      }
      return `<section${sectionIdAttr} class="pagzly-persona" style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <ul style="max-width:480px;margin:24px auto 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px">
          ${section.personas.map((p) => `<li style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:${RADIUS.pill}px;background:${sectionBg};box-shadow:${ELEVATION.personaRingExportHex(accent + "33")};font-size:${FONT_SIZE.bodySm};font-weight:500;color:${deepText}">✓ ${esc(p)}</li>`).join("")}
        </ul>
      </section>`;
    case "usage_steps": {
      const flowHtml = isCosmeticsCategory(category)
        ? buildUsageOrderFlowSvg(section.steps, deep, "#1B1B18")
        : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <ol style="max-width:640px;margin:32px auto 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px">
          ${section.steps.map((s, i) => `<li><span style="color:${accentText};font-size:${FONT_SIZE.caption};font-weight:700">STEP ${String(i + 1).padStart(2, "0")}</span><div style="font-size:${FONT_SIZE.body};margin-top:4px">${esc(s)}</div></li>`).join("")}
        </ol>${flowHtml}</section>`;
    }
    case "custom_gif":
      // 라이브와 같은 16:9 풀블리드 + 하단 스크림 + 배너 제목
      return `<section${sectionIdAttr} class="pagzly-custom-gif" style="position:relative;overflow:hidden;aspect-ratio:16/9;width:100%;padding:0">
        <img src="${esc(section.gifUrl)}" alt="${esc(buildSectionImageAlt(productName, section.heading ?? "GIF", section.slot))}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block"/>
        ${
          section.heading
            ? `<div style="position:absolute;inset:0;background:linear-gradient(0deg,${hexToRgba(BRAND.ink, 0.82)} 0%,${hexToRgba(BRAND.ink, 0.4)} 20%,${hexToRgba(BRAND.ink, 0.08)} 38%,transparent 50%)"></div>
        <div style="position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 24px;text-align:center">
          ${dh2(category, esc(section.heading), `font-size:${titleSizeCss("banner")};margin:0;line-height:1.15;color:#FAF8F3`)}
        </div>`
            : ""
        }
      </section>`;
    case "cta_price":
      if (FLAT_SECTION_SURFACES) {
        return `<section${sectionIdAttr} class="pagzly-cta" style="${pad}background:${flatAccentTint(theme)};border-top:1px solid ${hexToRgba(accent, 0.16)};color:${BRAND.ink};text-align:center">
        ${productName.trim() ? `<p style="margin:0 0 12px;font-family:${DETAIL_FONT_STACK.heading};font-size:15px;font-weight:700;line-height:1.375;letter-spacing:-0.025em;color:rgba(27,27,24,.8);word-break:keep-all">${esc(productName.trim())}</p>` : ""}
        <p style="font-family:${DETAIL_FONT_STACK.heading};font-size:${titleSizeCss("price")};font-weight:700;line-height:1;letter-spacing:-0.04em;margin:8px 0 0;color:${ensureReadableOnPaper(accent, 3)}">₩${section.price.toLocaleString("ko-KR")}</p>
        ${section.targetCustomer ? `<p style="display:inline-block;margin:16px 0 0;padding:6px 16px;border-radius:9999px;background:${hexToRgba(accent, 0.14)};color:${deepText};font-size:${FONT_SIZE.xs};font-weight:500">${esc(section.targetCustomer)}</p>` : ""}
        ${section.badges?.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:16px">${section.badges.map((b) => `<span style="background:${FLAT_PAPER};border:1px solid ${hexToRgba(accent, 0.3)};border-radius:9999px;color:${deepText};padding:8px 16px;font-size:${FONT_SIZE.xs};font-weight:600">${esc(b)}</span>`).join("")}</div>` : ""}
        <p style="margin-top:20px;font-size:${FONT_SIZE.xs};color:rgba(27,27,24,.5)">배송·교환·환불은 판매자 정책을 확인해 주세요.</p>
      </section>`;
      }
      return `<section${sectionIdAttr} class="pagzly-cta" style="${pad}background:${deepFill};color:#FAF8F3;text-align:center;clip-path:polygon(0 44px, 100% 0, 100% 100%, 0 100%);margin-top:-16px">
        ${kickerHtml(`<p style="font-size:${FONT_SIZE.caption};letter-spacing:.2em;opacity:.8">PRICE</p>`)}
        <p style="font-size:${titleSizeCss("price")};font-weight:700;line-height:1;margin:8px 0 0">₩${section.price.toLocaleString("ko-KR")}</p>
        ${section.targetCustomer ? `<p style="opacity:.85;margin-top:8px">${esc(section.targetCustomer)}</p>` : ""}
        ${section.badges?.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:16px">${section.badges.map((b) => `<span style="background:#FAF8F3;color:${deepText};padding:6px 12px;font-size:${FONT_SIZE.xs};font-weight:600">${esc(b)}</span>`).join("")}</div>` : ""}
        <p style="margin-top:20px;font-size:${FONT_SIZE.sm};opacity:.7">배송·교환·환불은 판매자 정책을 확인해 주세요.</p>
      </section>`;
    case "faq":
      if (FLAT_SECTION_SURFACES) {
        const line = hexToRgba(BRAND.ink, 0.12);
        const circle = "display:flex;flex-shrink:0;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;font-size:13px;font-weight:700;line-height:1";
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        <div style="text-align:center;max-width:576px;margin:0 auto">${twoToneDh2(category, theme, section.heading, `${titleFitCss("section", section.heading, -0.03)};margin:0`)}</div>
        <div data-faq-list style="max-width:576px;margin:40px auto 0;border-top:1px solid ${line};text-align:left">
          ${section.items
            .filter(
              (item) =>
                !isPlaceholderAnswer(item.answer) ||
                section.items.every((other) => isPlaceholderAnswer(other.answer)),
            )
            .map(
              (item) => `<div class="pagzly-faq-card" style="border-bottom:1px solid ${line};padding:24px 0">
            <div style="display:flex;align-items:flex-start;gap:12px"><span aria-hidden="true" style="${circle};background:${solidAccentOnPaper(theme)};color:${BRAND.paper}">Q</span><p style="min-width:0;flex:1;margin:0;padding-top:2px;font-family:${DETAIL_FONT_STACK.heading};font-size:17px;font-weight:700;line-height:1.375;letter-spacing:-0.02em;color:${BRAND.ink}">${esc(item.question)}</p></div>
            <div style="display:flex;align-items:flex-start;gap:12px;margin-top:12px"><span aria-hidden="true" style="${circle};border:1px solid ${hexToRgba(theme.accent, 0.4)};color:${deepText}">A</span><p style="min-width:0;flex:1;margin:0;font-size:${titleSizeCss("body")};line-height:1.85;color:rgba(27,27,24,.72)">${esc(item.answer)}</p></div>
          </div>`,
            )
            .join("")}
        </div></section>`;
      }
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <div style="max-width:640px;margin:24px auto 0;display:flex;flex-direction:column;gap:16px">
          ${section.items
            .map(
              (item) =>
                `<div class="pagzly-faq-card" style="border:1px solid ${accent}38;border-radius:${RADIUS.md}px;padding:16px 20px;background:${sectionBg}73">
            <p style="font-size:${FONT_SIZE.caption};letter-spacing:.15em;color:${accentText};margin:0 0 6px">Q.</p>
            <p style="font-weight:700;font-size:${FONT_SIZE.body};margin:0">${esc(item.question)}</p>
            <p style="font-size:${FONT_SIZE.caption};letter-spacing:.15em;color:${deepText};margin:16px 0 6px">A.</p>
            <p style="font-size:${FONT_SIZE.bodySm};line-height:1.6;opacity:.85;margin:0">${esc(item.answer)}</p>
          </div>`,
            )
            .join("")}
        </div></section>`;
    case "caution":
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${textPanelWrap(
          theme,
          `${kickerHtml(`<p style="font-size:${FONT_SIZE.caption};letter-spacing:.2em;color:${deepText};margin:0 0 12px">NOTICE</p>`)}
        ${dh2(category, esc(section.heading), `${titleFitCss("section", section.heading, -0.03)};margin:0`)}
        <p style="font-size:${titleSizeCss("body")};line-height:1.65;opacity:.8;margin-top:12px">${esc(section.body)}</p>`,
        )}
      </section>`;
    case "comparison_table": {
      // 242차 — 라이브 ComparisonValueCell과 동일 판정(공유 lib/comparison-cell-classify.ts)+
      // 동일 시각(28px 원형 배지, accent 틴트/회색, 체크·X)을 export에도 배선.
      const comparisonCellHtml = (value: string, emphasized: boolean) => {
        const kind = classifyBoolishCell(value);
        if (kind === "yes") {
          return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${hexToRgba(accent, emphasized ? 0.2 : 0.12)}" aria-label="${esc(value)}"><span aria-hidden="true" style="color:${deepText};font-size:14px;font-weight:700;line-height:1">&#10003;</span></span>`;
        }
        if (kind === "no") {
          return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:rgba(27,27,24,0.05)" aria-label="${esc(value)}"><span aria-hidden="true" style="color:rgba(27,27,24,0.35);font-size:13px;font-weight:600;line-height:1">&#10005;</span></span>`;
        }
        return esc(value);
      };
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${kickerHtml(`<p style="text-align:center;font-size:${FONT_SIZE.caption};letter-spacing:.2em;color:${deepText}">COMPARE</p>`)}
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <table style="width:100%;max-width:560px;margin:24px auto 0;border-collapse:collapse;font-size:${FONT_SIZE.bodySm}">
          <thead><tr style="background:${accent}1a">
            <th style="padding:12px;text-align:left"></th>
            <th style="padding:12px;text-align:left">${esc(section.columns[0])}</th>
            <th style="padding:12px;text-align:left;color:${deepText};font-weight:700;background:${accent}24">${esc(section.columns[1])}</th>
          </tr></thead>
          <tbody>
            ${section.rows
              .map(
                (row, ri) =>
                  `<tr style="border-bottom:1px solid ${accent}33;background:${ri % 2 ? accent + "0d" : "transparent"}">
                    <td style="padding:12px;font-weight:500;opacity:.65">${esc(row.label)}</td>
                    <td style="padding:12px">${comparisonCellHtml(row.values[0], false)}</td>
                    <td style="padding:12px;font-weight:600;background:${accent}14">${comparisonCellHtml(row.values[1], true)}</td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </section>`;
    }
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
            `<label for="${cvId}-${i}" style="display:inline-flex;align-items:center;gap:8px;margin:4px;padding:6px 12px;border:1px solid ${accent}44;border-radius:${RADIUS.pill}px;font-size:${FONT_SIZE.bodySm};cursor:pointer">
              <span style="width:16px;height:16px;border-radius:${RADIUS.pill}px;background:${esc(opt.colorHex)};box-shadow:${ELEVATION.swatchRing(accent + "44")}"></span>
              ${esc(opt.label)}
            </label>`,
        )
        .join("");
      const images = section.options
        .map((opt, i) => {
          const optSrc = imageUrls[opt.imageIndex] ?? "";
          return optSrc
            ? `<img class="${cvId}-img" data-cv="${i}" src="${esc(optSrc)}" alt="${esc(opt.label)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:${imageRatioCss(resolveSlotImageRatio(section))};object-fit:cover"/>`
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
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <div class="${cvId}-swatches" style="text-align:center;margin:48px auto 0">${swatches}</div>
        <div class="${cvId}-stage" style="margin:32px auto 0;max-width:384px">${images}</div>
      </section>`;
    }
    case "illustration_banner": {
      // 251차 — 레거시 illustrationUrl 우선, 없으면 imageIndex 실사진
      const illSrc =
        section.illustrationUrl ||
        imageUrls[section.imageIndex ?? 0] ||
        imageUrls[0] ||
        "";
      // 249차 — 텍스트 블록 전용 다크 패널 스크림. 문구가 길면 16:9보다 커지도록
      // aspect-ratio는 흐름 안 오버레이의 최소 높이로만 쓴다(라이브와 동일).
      return `<section${sectionIdAttr} class="pagzly-illustration-banner" style="position:relative;overflow:hidden;background:${deepFill}">
        ${illSrc ? `<img src="${esc(illSrc)}" alt="${esc(section.heading ?? "컨셉 배너")}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>` : ""}
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,${deep}99,transparent 35%,transparent 55%,${deep}cc)"></div>
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:16/9;box-sizing:border-box;padding:32px 24px;text-align:center;color:#FAF8F3">
          <div style="position:relative;max-width:520px;padding:20px 28px">
            <div aria-hidden="true" style="position:absolute;inset:-10%;border-radius:20px;pointer-events:none;background:rgba(27,27,24,.9);box-shadow:0 8px 40px rgba(27,27,24,.4)"></div>
            <div style="position:relative;z-index:1">
              ${section.heading ? dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionLg};margin:0`) : ""}
              ${section.body ? `<p style="margin:12px 0 0;font-size:${FONT_SIZE.body};opacity:.95;max-width:480px">${esc(section.body)}</p>` : ""}
            </div>
          </div>
        </div>
      </section>`;
    }
    case "review_highlight": {
      const praiseItems = section.praises
        .map((text, i) => ({
          text,
          matchCount: section.praiseMatchCounts?.[i] ?? 0,
        }))
        .filter((p) => Boolean(p.text));
      if (praiseItems.length === 0) return "";
      const concernItems = (section.concerns ?? [])
        .map((text, i) => ({
          text,
          matchCount: section.complaintMatchCounts?.[i] ?? 0,
        }))
        .filter((c) => Boolean(c.text));
      const countCaption =
        typeof section.sourceReviewCount === "number" && section.sourceReviewCount > 0
          ? `<p style="text-align:center;font-size:${FONT_SIZE.xs};opacity:.4;margin:8px 0 0">실제 리뷰 ${section.sourceReviewCount}건 분석</p>`
          : "";
      const petCaption =
        typeof section.petAgeWeightMentionCount === "number" &&
        section.petAgeWeightMentionCount > 0
          ? `<p style="text-align:center;font-size:${FONT_SIZE.xs};opacity:.4;margin:4px 0 0">반려동물 나이·체중 언급 리뷰 ${section.petAgeWeightMentionCount}건</p>`
          : "";
      const repurchaseCaption =
        typeof section.repurchaseMentionCount === "number" &&
        section.repurchaseMentionCount > 0
          ? `<p style="text-align:center;font-size:${FONT_SIZE.xs};opacity:.4;margin:4px 0 0">재구매 의사 언급 리뷰 ${section.repurchaseMentionCount}건</p>`
          : "";
      const sizeFitCaption =
        typeof section.sizeFitMentionCount === "number" &&
        section.sizeFitMentionCount > 0
          ? `<p style="text-align:center;font-size:${FONT_SIZE.xs};opacity:.4;margin:4px 0 0">사이즈·핏 언급 리뷰 ${section.sizeFitMentionCount}건</p>`
          : "";
      const longTermUseCaption =
        typeof section.longTermUseMentionCount === "number" &&
        section.longTermUseMentionCount > 0
          ? `<p style="text-align:center;font-size:${FONT_SIZE.xs};opacity:.4;margin:4px 0 0">장기 사용 후기 ${section.longTermUseMentionCount}건</p>`
          : "";
      const highlightTextHtml = (text: string, matchCount: number): string =>
        matchCount > 0
          ? splitTextByKeywords(text)
              .map((seg) =>
                seg.isKeyword
                  ? FLAT_SECTION_SURFACES
                    ? `<span style="font-weight:600;color:rgba(27,27,24,.75)">${esc(seg.text)}</span>`
                    : `<span style="background:${theme.accentSoft};border-radius:3px;padding:0 2px">${esc(seg.text)}</span>`
                  : esc(seg.text),
              )
              .join("")
          : esc(text);
      const concernsBlock =
        concernItems.length > 0
          ? `<div class="pagzly-review-concerns" style="max-width:560px;margin:40px auto 0;padding-top:28px;border-top:1px solid rgba(27,27,24,0.1)">
              <p style="text-align:center;font-size:${FONT_SIZE.xs};font-weight:500;letter-spacing:.02em;opacity:.45;margin:0">실제 후기에 나온 아쉬운 점</p>
              <ul style="list-style:none;padding:0;margin:16px 0 0">
                ${concernItems
                  .map(
                    (c) =>
                      `<li style="text-align:center;font-size:${FONT_SIZE.sm};line-height:1.6;opacity:.5;margin:0 0 10px">${highlightTextHtml(c.text, c.matchCount)}${
                        c.matchCount > 0
                          ? `<div style="font-size:${FONT_SIZE.caption};opacity:.4;margin-top:4px">${c.matchCount}건 언급</div>`
                          : ""
                      }</li>`,
                  )
                  .join("")}
              </ul>
            </div>`
          : "";
      if (FLAT_SECTION_SURFACES) {
        const praiseTextHtml = (text: string, matchCount: number): string =>
          matchCount > 0
            ? splitTextByKeywords(text)
                .map((seg) =>
                  seg.isKeyword
                    ? `<strong style="font-weight:700;color:${readableTextAccent(theme)}">${esc(seg.text)}</strong>`
                    : esc(seg.text),
                )
                .join("")
            : esc(text);
        const cards = praiseItems
          .map(
            (item) => `<li class="pagzly-review-card" style="display:flex;align-items:flex-start;gap:16px;border-radius:${RADIUS.lg}px;border:1px solid ${hexToRgba(theme.accent, 0.16)};background:${FLAT_PAPER};padding:20px;text-align:left">
              <span aria-hidden="true" style="flex-shrink:0;font-family:${DETAIL_FONT_STACK.heading};font-size:2.25rem;font-weight:700;line-height:.8;color:${solidAccentOnPaper(theme)}">&ldquo;</span>
              <div style="min-width:0;flex:1">
                <p style="margin:0;font-size:${titleSizeCss("body")};line-height:1.85;color:rgba(27,27,24,.8)">${praiseTextHtml(item.text, item.matchCount)}</p>
                ${item.matchCount > 0 ? `<span style="display:inline-block;margin-top:8px;border-radius:${RADIUS.pill}px;padding:4px 10px;font-size:12px;font-weight:600;line-height:1;background:${hexToRgba(theme.accent, 0.12)};color:${deepText}">${item.matchCount}건 언급</span>` : ""}
              </div>
            </li>`,
          )
          .join("");
        return `<section${sectionIdAttr} class="pagzly-review-highlight" style="${pad}${sectionInset}${bgCss}">
        <div style="text-align:center;max-width:576px;margin:0 auto">${twoToneDh2(category, theme, section.heading, `${titleFitCss("section", section.heading, -0.03)};margin:0`)}</div>
        ${countCaption}${petCaption}${repurchaseCaption}${sizeFitCaption}${longTermUseCaption}
        <p style="text-align:center;font-size:${FONT_SIZE.xs};opacity:.45;margin:8px 0 0">실제 구매자 리뷰에서 자주 나온 내용을 요약했습니다</p>
        <ul style="list-style:none;padding:0;max-width:576px;margin:40px auto 0;display:flex;flex-direction:column;gap:12px">${cards}</ul>
        ${concernsBlock}
      </section>`;
      }
      return `<section${sectionIdAttr} class="pagzly-review-highlight" style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)};margin:0`)}
        ${countCaption}${petCaption}${repurchaseCaption}${sizeFitCaption}${longTermUseCaption}
        <p style="text-align:center;font-size:${FONT_SIZE.xs};opacity:.45;margin:8px 0 0">실제 구매자 리뷰에서 자주 나온 내용을 요약했습니다</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:680px;margin:32px auto 0">
          ${praiseItems
            .map(
              (item) =>
                `<div style="border-radius:${RADIUS.lg}px;padding:24px;border:1px solid ${accent}33;background:${accent}0d">
                  <span style="font-size:${FONT_SIZE.sectionXl};color:${accentText};line-height:1">&ldquo;</span>
                  <p style="margin:12px 0 0;font-size:${FONT_SIZE.bodySm};line-height:1.6;opacity:.85">${highlightTextHtml(item.text, item.matchCount)}</p>
                  ${
                    item.matchCount > 0
                      ? `<p style="margin:10px 0 0;font-size:${FONT_SIZE.caption};opacity:.4">${item.matchCount}건 언급</p>`
                      : ""
                  }
                </div>`,
            )
            .join("")}
        </div>
        ${concernsBlock}
      </section>`;
    }
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
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <div style="max-width:640px;margin:32px auto 0">${pairsHtml}</div>
        <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:${FONT_SIZE.caption};opacity:.4">${esc(BEFORE_AFTER_COMPLIANCE_NOTE)}</p>
      </section>`;
    }
    case "certificate_evidence": {
      if (!section.certificates || section.certificates.length === 0) return "";
      // 서류 스캔본은 잘리면 글자가 사라지므로 object-fit:contain + 문서 비율 3:4 (라이브와 동일)
      const certsHtml = section.certificates
        .map(
          (cert, i) => `<div>
            <div style="overflow:hidden;border-radius:${RADIUS.lg}px;border:1px solid rgba(27,27,24,.12)">
              <img src="${esc(cert.imageUrl)}" alt="${esc(section.heading)} ${i + 1}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:3/4;object-fit:contain;background:#FAF8F3;display:block"/>
            </div>
            ${cert.caption ? `<p style="margin:8px 0 0;text-align:center;font-size:${FONT_SIZE.xs};color:rgba(27,27,24,.6)">${esc(cert.caption)}</p>` : ""}
          </div>`,
        )
        .join("");
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${dh2(category, esc(section.heading), `text-align:center;${titleFitCss("section", section.heading, -0.03)}${flatTitleColorCss(theme)}`)}
        <div style="max-width:640px;margin:32px auto 0;display:grid;grid-template-columns:1fr 1fr;gap:16px">${certsHtml}</div>
        <p style="max-width:480px;margin:24px auto 0;text-align:center;font-size:${FONT_SIZE.caption};opacity:.4">${esc(CERTIFICATE_EVIDENCE_COMPLIANCE_NOTE)}</p>
      </section>`;
    }
    case "ai_disclosure":
      // 라이브와 같은 레이블·헤딩·본문 섹션. 본문은 마켓 업로드용 최종 고지라 줄 자르기 없이 전체 노출.
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        <div style="max-width:36rem;margin:0 auto;text-align:center">
          ${kickerHtml(`<p style="font-size:${FONT_SIZE.caption};font-weight:600;letter-spacing:.36em;color:${deepText};margin:0 0 16px">AI DISCLOSURE</p>`)}
          ${dh2(category, esc(section.heading), `${titleFitCss("section", section.heading, -0.03)};margin:0`)}
          <p style="font-size:${titleSizeCss("body")};line-height:1.9;color:${hexToRgba(BRAND.ink, 0.7)};margin:20px 0 0">${esc(section.body)}</p>
        </div>
      </section>`;
    case "canvas":
      return renderCanvasSectionHtml(section, imageUrls, esc, anchorId);
    default: {
      const fallback = section as DetailSection;
      const heading =
        "heading" in fallback && typeof fallback.heading === "string" ? fallback.heading : "";
      const body = "body" in fallback && typeof fallback.body === "string" ? fallback.body : "";
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
        ${heading ? dh2(category, esc(heading), `text-align:center;${titleFitCss("section", heading, -0.03)}`) : ""}
        ${body ? `<p style="max-width:640px;margin:16px auto 0;line-height:1.6;font-size:${titleSizeCss("body")};opacity:.8">${esc(body)}</p>` : ""}
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
  // 183차 — 저관여(생활/펫) 표시 예산: 세션 데이터는 유지하고 export 노출만 축소
  const afterUserHidden = opts.sections.filter((_, i) => !hidden.has(i));
  const visibleSections = dropDuplicateRecommendColumn(
    restoreHashtagHeadingUnits(
      limitBoldBlocks(applySectionDisplayBudget(opts.category, afterUserHidden)),
    ),
  );
  const trustChips = extractTrustChips(visibleSections);
  const extended = extendTheme(opts.theme);

  const certTokens = parseCertificationTokens(opts.certifications);
  const quickFacts = extractQuickFacts(visibleSections);
  const sectionAnchors = buildSectionAnchors(visibleSections);
  const anchorIdMap = buildSectionAnchorIdMap(visibleSections);
  const anchorNavHtml = buildAnchorNavHtml(sectionAnchors, opts.theme);

  const bodyParts: string[] = [];
  let imageTextCount = 0;
  const pointOrdinals = buildPointOrdinals(visibleSections);
  let lastRenderedSection: DetailSection | undefined; // 231차 — shouldInsertBreather 추적용
  const totalCompactImageTextCount = visibleSections.filter(
    (s) => s.type === "image_text" && s.layout === "compact",
  ).length;
  // 라이브(DetailSectionRenderer 렌더 루프)와 동일: 쌍의 앞 인덱스에서 병합 렌더, 뒤 인덱스는
  // 브리더·lastRenderedSection 갱신 없이 건너뜀. POINT 카운트는 건너뛰는 섹션도 포함.
  const comboLeadToPair = new Map<number, { circleIdx: number; chartIdx: number }>();
  const comboTrailIndices = new Set<number>();
  for (const [circleIdx, chartIdx] of findCircleComparisonComboIndices(visibleSections)) {
    comboLeadToPair.set(Math.min(circleIdx, chartIdx), { circleIdx, chartIdx });
    comboTrailIndices.add(Math.max(circleIdx, chartIdx));
  }
  for (let i = 0; i < visibleSections.length; i += 1) {
    const section = visibleSections[i]!;
    const isFullPoint = shouldUseSplitLayout(section);
    const pointIndex = isFullPoint ? imageTextCount++ : undefined;
    const bodyIndex = visibleSections.slice(0, i).filter((s) => s.type !== "hero").length;
    // 225차 — 라이브(DetailSectionRenderer.tsx:3763~3768)와 동일한 계산. compact
    // 섹션의 정사각형/원형 교대(resolveCompactImageShape)에 필요.
    const compactImageTextIndex =
      section.type === "image_text" && section.layout === "compact"
        ? visibleSections
            .slice(0, i)
            .filter((s) => s.type === "image_text" && s.layout === "compact").length
        : undefined;
    if (comboTrailIndices.has(i)) continue;
    const comboPair = comboLeadToPair.get(i);
    let html: string;
    if (comboPair) {
      const chartBodyIndex = visibleSections
        .slice(0, comboPair.chartIdx)
        .filter((s) => s.type !== "hero").length;
      const surface = resolveSectionSurface(
        extended,
        "comparison_chart",
        chartBodyIndex,
        opts.category,
      );
      html = circleComparisonComboHtml({
        circleSection: visibleSections[comboPair.circleIdx] as ImageTextSection,
        chartSection: visibleSections[comboPair.chartIdx] as ComparisonChartSection,
        theme: surface.theme,
        category: opts.category,
        productName: opts.productName,
        sectionStyle: `padding:48px 20px;${surface.insetShadow ? `box-shadow:${surface.insetShadow};` : ""}${sectionBgStyle(surface.background, opts.category)}`,
        anchorId: anchorIdMap.get(i),
      });
    } else {
      html = sectionHtml(
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
        compactImageTextIndex,
        totalCompactImageTextCount,
        pointOrdinals[i],
      );
    }
    if (html) {
      // 231차 — 라이브(DetailSectionRenderer.tsx:3941~3944, SectionBreather)와 동일한 브리더.
      // export엔 이 로직이 아예 없어 마켓 최종 HTML에서 섹션 사이 시각적 호흡이 통째로 빠져
      // 있었음(180/224/225차와 같은 live/export drift 계열).
      if (shouldInsertBreather(lastRenderedSection, section) && section.type !== "hero") {
        bodyParts.push(
          `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:20px 24px" aria-hidden="true">` +
            `<span style="height:1px;width:48px;background:linear-gradient(90deg,transparent,${hexToRgba(opts.theme.accent, 0.45)})"></span>` +
            `<span style="height:6px;width:6px;border-radius:9999px;background:${opts.theme.accent}"></span>` +
            `<span style="height:1px;width:48px;background:linear-gradient(90deg,${hexToRgba(opts.theme.accent, 0.45)},transparent)"></span>` +
            `</div>`,
        );
      }
      bodyParts.push(html);
      lastRenderedSection = section;
    }
    if (section.type === "hero") {
      const next = visibleSections[i + 1];
      if (next) {
        const heroFollowParts: string[] = [];
        // 165차 — "Bento 그리드 2.0" 스펙 하이라이트. 히어로 바로 아래(라이브 렌더러와 동일 위치).
        const bentoHtml = quickFacts.length > 0 ? buildSpecBentoGridHtml(quickFacts, opts.theme) : "";
        if (trustChips.length > 0) {
          heroFollowParts.push(trustStripHtml(trustChips, opts.theme, certTokens, !bentoHtml));
        }
        if (bentoHtml) heroFollowParts.push(bentoHtml);
        // 236차 — 라이브 hero-follow 북엔드 대각선 클립(trust+bento). 다음 섹션 본문까지
        // 같은 wrapper에 넣는 완전 동일 구조는 루프 회귀 위험으로 이번엔 제외.
        if (heroFollowParts.length > 0) {
          bodyParts.push(
            `<div style="position:relative;z-index:1;${HERO_FOLLOW_CLIP_PX > 0 ? `clip-path:polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - ${HERO_FOLLOW_CLIP_PX}px));` : `background:${FLAT_PAPER};`}margin-top:-16px">${heroFollowParts.join("\n")}</div>`,
          );
        }
      }
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
  .pagzly-wrap{max-width:750px;margin:0 auto;background:#FAF8F3;container-type:inline-size}
  ${titleScaleExportCss()}
  @media (min-width:640px){.pagzly-gallery-grid3,.pagzly-stat-grid3{grid-template-columns:repeat(3,1fr)!important}.pagzly-hl-grid{grid-template-columns:var(--pz-hl-wide)!important}.pagzly-cl-grid{grid-template-columns:var(--pz-cl-wide)!important}.pagzly-step-rows{grid-template-columns:repeat(3,1fr)!important;gap:32px!important}.pagzly-step-row{display:block!important}.pagzly-step-row h3{margin-top:12px!important}.pagzly-step-row p{font-size:${FONT_SIZE.sm}!important}}
  .pagzly-wrap .pz-fit{font-size:max(min(var(--pz-fs),0.6875rem),min(var(--pz-fs),calc(100cqi / var(--pz-fit-em,0.01))))!important}
  .pagzly-anchor-nav a{scroll-margin-top:52px}
  .pagzly-seo-text{padding:32px 20px;font-size:${FONT_SIZE.bodySm};line-height:1.65;border-top:1px solid #DAD5C9;color:rgba(27,27,24,.62)}
  .pagzly-seo-text h1{font-size:${FONT_SIZE.seoH2};margin:0 0 8px;color:#1B1B18}
  .pagzly-seo-text h2{font-size:${FONT_SIZE.seoH2};margin:16px 0 8px}
  .pagzly-seo-text ul{padding-left:1.2rem;margin:0}
  @keyframes fillBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  .fill-bar{transform-origin:left center;animation:fillBar .9s ease-out both}
  @keyframes ringFill{from{stroke-dashoffset:var(--ring-empty)}to{stroke-dashoffset:var(--ring-offset)}}
  .ring-fill{animation:ringFill 1s cubic-bezier(.22,1,.36,1) both}
  @keyframes pulseCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  .pulse-card{animation:pulseCard 2.4s ease-in-out infinite}
  .pagzly-circle-solo-img{width:120px;height:120px}
  .pagzly-circle-pair-img{width:96px;height:96px}
  @media (min-width:640px){
    .pagzly-circle-solo-img{width:150px;height:150px}
    .pagzly-circle-pair-img{width:120px;height:120px}
  }
  @media (max-width:750px){
    .pagzly-cta{position:sticky;bottom:0;z-index:20;box-shadow:${ELEVATION.ctaSticky}}
  }
  @media (prefers-reduced-motion:reduce){.fill-bar,.pulse-card,.ring-fill{animation:none!important}}
</style>
</head>
<body>
<div class="pagzly-wrap">
<header style="padding:14px 20px;border-bottom:1px solid #DAD5C9;font-size:${FONT_SIZE.xs};opacity:.65">${esc(opts.category)} · ${esc(opts.productName)}</header>
${anchorNavHtml}
${body}
${seoBlock}
<footer style="padding:28px 20px;text-align:center;font-size:${FONT_SIZE.caption};opacity:.45">Pagzly HTML export · 마켓·자사몰용 (통이미지와 별도 텍스트·스키마 포함)</footer>
</div>
</body>
</html>`;
}
