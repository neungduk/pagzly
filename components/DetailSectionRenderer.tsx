import {
  CheckCircle2,
  Cpu,
  Leaf,
  PawPrint,
  Shirt,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { getCategoryTheme, type CategoryTheme } from "@/lib/category-theme";
import type { DetailSection } from "@/lib/types/generate";
import type { ConceptIconMap } from "@/lib/concept-icons";
import EditableText from "@/components/EditableText";
import DetailScrollReveal from "@/components/DetailScrollReveal";
import SectionImage from "@/components/SectionImage";
import {
  SLOT_IMAGE_RATIO,
  getCtaBandBackground,
  getCategoryRhythm,
  getDecorationColor,
  getHeroGradient,
  getSectionBackground,
  getSectionPattern,
  hexToRgba,
  type SectionColorPattern,
} from "@/lib/design-tokens";

export type SectionEditApi = {
  enabled: boolean;
  onChange: (index: number, section: DetailSection) => void;
  onReplaceImage?: (imageIndex: number) => void;
};

type DetailSectionRendererProps = {
  sections: DetailSection[];
  imageUrls: string[];
  category: string;
  theme?: CategoryTheme;
  conceptIcons?: ConceptIconMap;
  edit?: SectionEditApi;
};

const THEME_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Leaf,
  Cpu,
  Shirt,
  PawPrint,
  CheckCircle2,
};

const TEXT_COL_CLASS = "mx-auto max-w-xl text-center";
const HEADLINE_CLAMP = "line-clamp-2";
const BODY_CLAMP = "line-clamp-3";

const BANNER_OVERLAY_CLASS =
  "absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center sm:px-10";

const TYPO = {
  heroCategory:
    "mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80",
  heroTitle:
    "font-heading text-[2.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl",
  bannerTitle:
    "font-heading text-[1.65rem] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-[1.85rem]",
  heroSub: "mt-4 max-w-xl text-base font-normal leading-relaxed text-white/88 sm:text-lg",
  bannerSub:
    "mt-3 max-w-md text-sm font-normal leading-relaxed text-white/88 sm:text-base",
  compactTitle:
    "font-heading text-base font-bold leading-snug tracking-[-0.02em] text-ink sm:text-lg",
  compactBody: "mt-1 text-sm leading-relaxed text-ink/72",
  sectionTitle:
    "font-heading text-[1.75rem] font-bold leading-[1.2] tracking-[-0.02em] text-ink sm:text-4xl",
  sectionLabel: "font-mono text-[10px] font-semibold uppercase tracking-[0.32em]",
  body: "text-[0.9375rem] font-normal leading-[1.85] text-ink/68 sm:text-base",
  checklistItem: "mt-2.5 text-[11px] font-medium leading-snug text-ink/85 sm:text-sm",
  stepItem: "mt-2.5 max-w-[7.5rem] text-[11px] font-normal leading-relaxed text-ink/80 sm:max-w-sm sm:text-sm",
} as const;

function resolveImage(imageUrls: string[], index: number) {
  return imageUrls[index] ?? imageUrls[0] ?? "";
}

function resolveImageRatioClass(section: { type: string; slot?: string }) {
  return (
    (section.slot && SLOT_IMAGE_RATIO[section.slot]) ??
    SLOT_IMAGE_RATIO[section.type] ??
    "aspect-square"
  );
}

function ThemeIcon({ theme }: { theme: CategoryTheme }) {
  const Icon = THEME_ICONS[theme.icon] ?? CheckCircle2;
  return (
    <Icon
      className="shrink-0"
      size={22}
      style={{ color: theme.accent }}
      aria-hidden="true"
    />
  );
}

function ConceptBadgeIcon({
  src,
  theme,
  fallbackIndex,
}: {
  src?: string;
  theme: CategoryTheme;
  fallbackIndex?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/80"
        style={{ boxShadow: `0 0 0 1px ${theme.accent}33` }}
        aria-hidden="true"
      />
    );
  }
  if (fallbackIndex != null) {
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-paper"
        style={{ backgroundColor: theme.accent }}
        aria-hidden="true"
      >
        {fallbackIndex + 1}
      </span>
    );
  }
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: hexToRgba(theme.accent, 0.12) }}
      aria-hidden="true"
    >
      <ThemeIcon theme={theme} />
    </span>
  );
}

// spec_table 값이 근거 없음을 나타내는 안내 문구인지 판단 — 완성된 페이지에는
// 이런 문구가 그대로 노출되지 않도록 렌더링 단계에서 걸러낸다.
const PLACEHOLDER_VALUE_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "판매자 정책을 확인",
  "확인 필요",
];

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_VALUE_PATTERNS.some((pattern) => trimmed.includes(pattern));
}

function parseMetricPercent(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function MetricBar({
  percent,
  theme,
  large = false,
}: {
  percent: number;
  theme: CategoryTheme;
  large?: boolean;
}) {
  return (
    <div
      className={`${large ? "mt-3 h-3" : "mt-1.5 h-1.5"} w-full overflow-hidden rounded-full`}
      style={{ backgroundColor: hexToRgba(theme.accent, 0.16) }}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${percent}%`,
          backgroundColor: theme.accent,
        }}
      />
    </div>
  );
}

function sectionBackgroundStyle(theme: CategoryTheme, pattern: SectionColorPattern) {
  return { backgroundColor: getSectionBackground(theme, pattern) };
}

/** 텍스트 블록 섹션의 B 패턴만 상단 액센트 바로 구획을 읽히게 한다. 사진 위에는 쓰지 않음. */
function textSectionStyle(theme: CategoryTheme, pattern: SectionColorPattern) {
  return {
    backgroundColor: getSectionBackground(theme, pattern),
    ...(pattern === "B"
      ? { boxShadow: `inset 0 4px 0 ${hexToRgba(theme.accent, 0.28)}` }
      : {}),
  };
}

function SectionAccentHairline({ theme }: { theme: CategoryTheme }) {
  return (
    <div
      className="mx-auto mb-6 h-px w-12"
      style={{ backgroundColor: hexToRgba(theme.accent, 0.45) }}
      aria-hidden="true"
    />
  );
}

function ImageReplaceHit({
  enabled,
  onReplace,
}: {
  enabled?: boolean;
  onReplace?: () => void;
}) {
  if (!enabled || !onReplace) return null;
  return (
    <button
      type="button"
      onClick={onReplace}
      className="absolute right-3 top-3 z-30 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-paper shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.98]"
    >
      이미지 교체
    </button>
  );
}

function renderSection(
  section: DetailSection,
  imageUrls: string[],
  index: number,
  category: string,
  theme: CategoryTheme,
  pattern: SectionColorPattern,
  conceptIcons?: ConceptIconMap,
  pointIndex?: number,
  edit?: SectionEditApi,
  followPattern?: SectionColorPattern,
) {
  const heroFallback = imageUrls[0] ?? "";
  switch (section.type) {
    case "hero": {
      const src = resolveImage(imageUrls, section.imageIndex);
      return (
        <div key={`hero-wrap-${index}`} className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full blur-3xl sm:h-72 sm:w-72"
            style={{ backgroundColor: getDecorationColor(theme), zIndex: 0 }}
          />
          <section
            className={`relative z-10 w-full overflow-hidden ${SLOT_IMAGE_RATIO.hero} ${getCategoryRhythm(category).heroMinClass}`}
          >
            <SectionImage
              src={src}
              alt={section.headline}
              fallbackSrc={heroFallback}
              className="pagzly-hero-photo absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: getHeroGradient(theme) }}
            />
            <ImageReplaceHit
              enabled={edit?.enabled}
              onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
            />
            <div className={getCategoryRhythm(category).heroOverlayClass}>
              <p className={TYPO.heroCategory}>{category}</p>
              <EditableText
                as="h2"
                enabled={edit?.enabled}
                value={section.headline}
                onChange={(headline) =>
                  edit?.onChange(index, { ...section, headline })
                }
                className={`${HEADLINE_CLAMP} ${TYPO.heroTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
              />
              {(section.subheadline || edit?.enabled) ? (
                <EditableText
                  as="p"
                  enabled={edit?.enabled}
                  value={section.subheadline ?? ""}
                  onChange={(subheadline) =>
                    edit?.onChange(index, { ...section, subheadline })
                  }
                  className={`${HEADLINE_CLAMP} ${TYPO.heroSub}`}
                />
              ) : null}
            </div>
          </section>
        </div>
      );
    }

    case "checklist": {
      const compactFollow = section.compactFollow === true;
      const checklistPattern = compactFollow && followPattern ? followPattern : pattern;
      return (
        <section
          key={`checklist-${index}`}
          className={
            compactFollow
              ? "px-6 pb-10 pt-2 sm:px-10 sm:pb-14"
              : getCategoryRhythm(category).generousPadClass
          }
          style={textSectionStyle(theme, checklistPattern)}
        >
          <div className={TEXT_COL_CLASS}>
            {!compactFollow ? <SectionAccentHairline theme={theme} /> : null}
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
            />
          </div>
          <ul
            className={`${compactFollow ? "mt-8" : "mt-12"} grid ${
              compactFollow ? "gap-x-3 gap-y-6" : getCategoryRhythm(category).checklistGapClass
            } ${
              section.items.length === 3
                ? "grid-cols-3"
                : getCategoryRhythm(category).checklistGridFour
            }`}
          >
            {section.items.map((item, itemIndex) => (
              <li
                key={`${itemIndex}-${item.slice(0, 12)}`}
                className="flex flex-col items-center text-center"
              >
                <ConceptBadgeIcon
                  src={conceptIcons?.checklist?.[itemIndex]}
                  theme={theme}
                />
                <EditableText
                  as="span"
                  enabled={edit?.enabled}
                  value={item}
                  onChange={(next) => {
                    const items = [...section.items];
                    items[itemIndex] = next;
                    edit?.onChange(index, { ...section, items });
                  }}
                  className={TYPO.checklistItem}
                />
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "image_text": {
      const src = resolveImage(imageUrls, section.imageIndex);
      const isCompact = section.layout === "compact";

      if (isCompact) {
        const imageFirst = section.imagePosition !== "right";
        return (
          <section
            key={`image_text-${index}`}
            className="px-6 py-5 sm:px-10 sm:py-6"
            style={textSectionStyle(theme, pattern)}
          >
            <div
              className={`mx-auto flex max-w-xl items-center gap-4 ${
                imageFirst ? "flex-row" : "flex-row-reverse"
              }`}
            >
              <div className="relative shrink-0">
                <SectionImage
                  src={src}
                  alt={section.heading}
                  className="h-24 w-24 rounded-xl object-cover sm:h-[7.5rem] sm:w-[7.5rem]"
                />
                <ImageReplaceHit
                  enabled={edit?.enabled}
                  onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
                />
              </div>
              <div className={`min-w-0 flex-1 ${imageFirst ? "text-left" : "text-right"}`}>
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={TYPO.compactTitle}
                />
                <EditableText
                  as="p"
                  multiline
                  enabled={edit?.enabled}
                  value={section.body}
                  onChange={(body) => edit?.onChange(index, { ...section, body })}
                  className={TYPO.compactBody}
                />
              </div>
            </div>
          </section>
        );
      }

      const ratioClass = resolveImageRatioClass(section);
      const pointLabel =
        pointIndex != null
          ? `POINT ${String(pointIndex + 1).padStart(2, "0")}`
          : null;

      return (
        <section
          key={`image_text-${index}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <div className="relative">
            <SectionImage
              src={src}
              alt={section.heading}
              className={`${ratioClass} w-full object-cover`}
            />
            <ImageReplaceHit
              enabled={edit?.enabled}
              onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
            />
          </div>
          <div className={`${getCategoryRhythm(category).pointTextPadClass} ${TEXT_COL_CLASS}`}>
            {section.slot === "ingredient_highlight" ? (
              <div
                className="mx-auto mb-6 h-1.5 w-16"
                style={{ backgroundColor: theme.accent }}
                aria-hidden="true"
              />
            ) : null}
            {pointLabel && (
              <p className={`mb-4 ${TYPO.sectionLabel}`} style={{ color: theme.accent }}>
                {pointLabel}
              </p>
            )}
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
            />
            <EditableText
              as="p"
              multiline
              enabled={edit?.enabled}
              value={section.body}
              onChange={(body) => edit?.onChange(index, { ...section, body })}
              className={`mt-4 ${BODY_CLAMP} ${TYPO.body}`}
            />
          </div>
        </section>
      );
    }

    case "spec_table": {
      // AI가 근거 없는 값에 채워 넣는 안내 문구는 표에 그대로 노출하면 미완성처럼
      // 보이므로, 편집 모드가 아닐 때는 해당 행을 숨긴다 (편집 모드에서는 어떤 값이
      // 비어있는지 판매자가 알아야 하므로 그대로 보여준다).
      const visibleRows = edit?.enabled ? section.rows : section.rows.filter((row) => !isPlaceholderValue(row.value));
      if (visibleRows.length === 0) return null;
      return (
        <section
          key={`spec_table-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <p
            className={`mb-4 ${TEXT_COL_CLASS} ${TYPO.sectionLabel}`}
            style={{ color: theme.deepAccent }}
          >
            INFO
          </p>
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} font-heading text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl`}
          />
          <div className="mx-auto mt-10 max-w-xl">
            <table className="w-full text-sm">
              <tbody>
                {visibleRows.map((row) => {
                  const rowIndex = section.rows.indexOf(row);
                  return (
                  <tr
                    key={`${row.label}-${rowIndex}`}
                    className="border-b last:border-b-0"
                    style={{
                      borderColor: hexToRgba(theme.accent, 0.22),
                    }}
                  >
                    <td className={`w-[38%] py-3.5 pr-4 ${TYPO.sectionLabel} text-ink/45`}>
                      <EditableText
                        as="span"
                        enabled={edit?.enabled}
                        value={row.label}
                        onChange={(label) => {
                          const rows = section.rows.map((item, i) =>
                            i === rowIndex ? { ...item, label } : item,
                          );
                          edit?.onChange(index, { ...section, rows });
                        }}
                      />
                    </td>
                    <td className="py-3.5 font-medium tracking-tight text-ink">
                      <EditableText
                        as="span"
                        enabled={edit?.enabled}
                        value={row.value}
                        onChange={(value) => {
                          const rows = section.rows.map((item, i) =>
                            i === rowIndex ? { ...item, value } : item,
                          );
                          edit?.onChange(index, { ...section, rows });
                        }}
                      />
                      {(() => {
                        const percent = parseMetricPercent(row.value);
                        return percent != null ? (
                          <MetricBar percent={percent} theme={theme} />
                        ) : null;
                      })()}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    case "comparison_table":
      return (
        <section
          key={`comparison_table-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <p
            className={`mb-4 ${TEXT_COL_CLASS} ${TYPO.sectionLabel}`}
            style={{ color: theme.deepAccent }}
          >
            COMPARE
          </p>
          <h3 className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}>
            {section.heading}
          </h3>
          <div className="mx-auto mt-10 max-w-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: hexToRgba(theme.accent, 0.08) }}>
                  <th className="px-4 py-3 text-left font-medium text-ink/55" />
                  <th className="px-4 py-3 text-left font-medium text-ink/55">
                    {section.columns[0]}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold"
                    style={{ color: theme.deepAccent }}
                  >
                    {section.columns[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr
                    key={`${row.label}-${rowIndex}`}
                    style={{
                      backgroundColor:
                        rowIndex % 2 === 0
                          ? theme.baseNeutral
                          : hexToRgba(theme.accent, 0.08),
                    }}
                  >
                    <td className="px-4 py-3.5 font-medium text-ink/55">{row.label}</td>
                    <td className="px-4 py-3.5 text-ink">{row.values[0]}</td>
                    <td className="px-4 py-3.5 font-semibold text-ink">{row.values[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "color_variation": {
      const ratioClass = resolveImageRatioClass(section);
      return (
        <section
          key={`color_variation-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <SectionAccentHairline theme={theme} />
          <h3 className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}>
            {section.heading}
          </h3>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {section.options.map((option) => {
              const src = resolveImage(imageUrls, option.imageIndex);
              return (
                <div key={option.label} className="space-y-2 text-center">
                  <SectionImage
                    src={src}
                    alt={option.label}
                    className={`${ratioClass} w-full object-cover`}
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-ink/80">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{
                        backgroundColor: option.colorHex,
                        boxShadow: `0 0 0 1px ${theme.accent}33`,
                      }}
                      aria-hidden="true"
                    />
                    {option.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "stat_infographic": {
      const indexedMetrics = section.metrics.map((metric, metricIndex) => ({ metric, metricIndex }));
      const numberMetrics = indexedMetrics.filter(({ metric }) => metric.style === "number");
      const barMetrics = indexedMetrics.filter(({ metric }) => metric.style !== "number");
      const numberGridCols =
        numberMetrics.length <= 1
          ? "max-w-xs grid-cols-1"
          : numberMetrics.length === 2
            ? "max-w-md grid-cols-2"
            : "max-w-2xl grid-cols-2 sm:grid-cols-3";

      return (
        <section
          key={`stat_infographic-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          {numberMetrics.length > 0 && (
            <div
              className={`mx-auto mt-10 grid gap-px overflow-hidden rounded-2xl ${numberGridCols}`}
              style={{ backgroundColor: hexToRgba(theme.accent, 0.18) }}
            >
              {numberMetrics.map(({ metric, metricIndex }) => (
                <div
                  key={`${metric.label}-${metricIndex}`}
                  className="flex flex-col items-center gap-1.5 px-4 py-7 text-center"
                  style={{ backgroundColor: theme.baseNeutral }}
                >
                  <div style={{ color: theme.deepAccent }}>
                    <EditableText
                      as="span"
                      enabled={edit?.enabled}
                      value={metric.value}
                      onChange={(value) => {
                        const metrics = section.metrics.map((item, i) =>
                          i === metricIndex ? { ...item, value } : item,
                        );
                        edit?.onChange(index, { ...section, metrics });
                      }}
                      className="font-heading text-3xl font-bold tracking-tight sm:text-4xl"
                    />
                  </div>
                  <EditableText
                    as="span"
                    enabled={edit?.enabled}
                    value={metric.label}
                    onChange={(label) => {
                      const metrics = section.metrics.map((item, i) =>
                        i === metricIndex ? { ...item, label } : item,
                      );
                      edit?.onChange(index, { ...section, metrics });
                    }}
                    className="text-xs font-medium text-ink/60 sm:text-sm"
                  />
                </div>
              ))}
            </div>
          )}
          {barMetrics.length > 0 && (
            <div className="mx-auto mt-10 max-w-xl space-y-7">
              {barMetrics.map(({ metric, metricIndex }) => {
                const percent = Math.min(100, Math.max(0, metric.percent ?? 0));
                return (
                  <div key={`${metric.label}-${metricIndex}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <EditableText
                        as="span"
                        enabled={edit?.enabled}
                        value={metric.label}
                        onChange={(label) => {
                          const metrics = section.metrics.map((item, i) =>
                            i === metricIndex ? { ...item, label } : item,
                          );
                          edit?.onChange(index, { ...section, metrics });
                        }}
                        className="text-sm font-medium text-ink/65 sm:text-base"
                      />
                      <EditableText
                        as="span"
                        enabled={edit?.enabled}
                        value={metric.value}
                        onChange={(value) => {
                          const metrics = section.metrics.map((item, i) =>
                            i === metricIndex ? { ...item, value } : item,
                          );
                          edit?.onChange(index, { ...section, metrics });
                        }}
                        className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl"
                      />
                    </div>
                    <MetricBar percent={percent} theme={theme} large />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    case "illustration_banner":
      return (
        <section
          key={`illustration_banner-${index}`}
          className="relative aspect-video w-full overflow-hidden"
        >
          {section.illustrationUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={section.illustrationUrl}
              alt={section.heading ?? "컨셉 일러스트"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: hexToRgba(theme.accent, 0.12) }}
              aria-hidden="true"
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: getHeroGradient(theme) }}
          />
          <div className={BANNER_OVERLAY_CLASS}>
            {(section.heading || edit?.enabled) && (
              <EditableText
                as="h2"
                enabled={edit?.enabled}
                value={section.heading ?? ""}
                onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                className={`${TYPO.bannerTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
              />
            )}
            {(section.body || edit?.enabled) && (
              <EditableText
                as="p"
                multiline
                enabled={edit?.enabled}
                value={section.body ?? ""}
                onChange={(body) => edit?.onChange(index, { ...section, body })}
                className={TYPO.bannerSub}
              />
            )}
          </div>
        </section>
      );

    case "usage_steps":
      return (
        <section
          key={`usage_steps-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <ol
            className={`mx-auto mt-12 max-w-xl ${
              section.steps.length === 3
                ? "grid grid-cols-3 gap-x-3 gap-y-6"
                : "space-y-8"
            }`}
          >
            {section.steps.map((step, stepIndex) => (
              <li
                key={stepIndex}
                className="flex flex-col items-center text-center"
              >
                <p
                  className={`mb-3 ${TYPO.sectionLabel}`}
                  style={{ color: theme.accent }}
                >
                  STEP {String(stepIndex + 1).padStart(2, "0")}
                </p>
                <ConceptBadgeIcon
                  src={conceptIcons?.usageSteps?.[stepIndex]}
                  theme={theme}
                  fallbackIndex={stepIndex}
                />
                <EditableText
                  as="span"
                  enabled={edit?.enabled}
                  value={step}
                  onChange={(next) => {
                    const steps = [...section.steps];
                    steps[stepIndex] = next;
                    edit?.onChange(index, { ...section, steps });
                  }}
                  className={TYPO.stepItem}
                />
              </li>
            ))}
          </ol>
        </section>
      );

    case "gallery": {
      const ratioClass = resolveImageRatioClass(section);
      const pairCompare =
        category === "화장품/뷰티" && section.imageIndexes.length >= 2;
      return (
        <section
          key={`gallery-${index}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <div className={getCategoryRhythm(category).galleryTitlePadClass}>
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
            />
          </div>
          <div
            className={
              pairCompare
                ? "grid grid-cols-2 gap-px"
                : section.imageIndexes.length <= 2
                  ? `grid grid-cols-1 ${getCategoryRhythm(category).galleryGapClass}`
                  : `grid grid-cols-2 ${getCategoryRhythm(category).galleryGapClass} sm:grid-cols-3`
            }
            style={{ backgroundColor: hexToRgba(theme.accent, 0.18) }}
          >
            {section.imageIndexes.map((imageIndex, pairIndex) => {
              const src = resolveImage(imageUrls, imageIndex);
              const pairLabel =
                pairCompare && pairIndex === 0
                  ? "BEFORE"
                  : pairCompare && pairIndex === 1
                    ? "AFTER"
                    : null;
              return (
                <div key={`${imageIndex}-${src}-${pairIndex}`} className="relative">
                  <SectionImage
                    src={src}
                    alt={`${section.heading} ${imageIndex + 1}`}
                    className={`${ratioClass} w-full object-cover`}
                  />
                  {pairLabel ? (
                    <span
                      className={`absolute left-3 top-3 ${TYPO.sectionLabel} text-white`}
                    >
                      {pairLabel}
                    </span>
                  ) : null}
                  <ImageReplaceHit
                    enabled={edit?.enabled}
                    onReplace={() => edit?.onReplaceImage?.(imageIndex)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "caution":
      return (
        <section
          key={`caution-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <div className={TEXT_COL_CLASS}>
            <p
              className={`mb-4 ${TYPO.sectionLabel}`}
              style={{ color: theme.deepAccent }}
            >
              NOTICE
            </p>
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} font-heading text-lg font-bold tracking-[-0.02em] text-ink sm:text-xl`}
            />
            <EditableText
              as="p"
              multiline
              enabled={edit?.enabled}
              value={section.body}
              onChange={(body) => edit?.onChange(index, { ...section, body })}
              className={`mt-5 ${BODY_CLAMP} ${TYPO.body}`}
            />
          </div>
        </section>
      );

    case "brand_story":
      return (
        <section
          key={`brand_story-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <div className={TEXT_COL_CLASS}>
            <p
              className={`mb-4 ${TYPO.sectionLabel}`}
              style={{ color: theme.deepAccent }}
            >
              STORY
            </p>
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} font-heading text-lg font-bold tracking-[-0.02em] text-ink sm:text-xl`}
            />
            <EditableText
              as="p"
              multiline
              enabled={edit?.enabled}
              value={section.body}
              onChange={(body) => edit?.onChange(index, { ...section, body })}
              className={`mt-5 ${BODY_CLAMP} ${TYPO.body}`}
            />
          </div>
        </section>
      );

    case "faq":
      return (
        <section
          key={`faq-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <div className="mx-auto mt-10 max-w-xl space-y-8 text-left">
            {section.items.map((item, itemIndex) => (
              <div key={`${itemIndex}-${item.question.slice(0, 12)}`}>
                <p className={`${TYPO.sectionLabel} mb-2`} style={{ color: theme.accent }}>
                  Q.
                </p>
                <EditableText
                  as="p"
                  enabled={edit?.enabled}
                  value={item.question}
                  onChange={(question) => {
                    const items = section.items.map((entry, i) =>
                      i === itemIndex ? { ...entry, question } : entry,
                    );
                    edit?.onChange(index, { ...section, items });
                  }}
                  className="font-heading text-base font-bold leading-snug tracking-[-0.02em] text-ink"
                />
                <p
                  className={`${TYPO.sectionLabel} mb-2 mt-4`}
                  style={{ color: theme.deepAccent }}
                >
                  A.
                </p>
                <EditableText
                  as="p"
                  multiline
                  enabled={edit?.enabled}
                  value={item.answer}
                  onChange={(answer) => {
                    const items = section.items.map((entry, i) =>
                      i === itemIndex ? { ...entry, answer } : entry,
                    );
                    edit?.onChange(index, { ...section, items });
                  }}
                  className={TYPO.body}
                />
              </div>
            ))}
          </div>
        </section>
      );

    case "target_persona":
      return (
        <section
          key={`target_persona-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <div className={TEXT_COL_CLASS}>
            <SectionAccentHairline theme={theme} />
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
            />
          </div>
          <ul className="mx-auto mt-8 flex max-w-xl flex-col items-stretch gap-2.5">
            {section.personas.map((persona, personaIndex) => (
              <li
                key={`${personaIndex}-${persona.slice(0, 12)}`}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: hexToRgba(theme.baseNeutral, 0.85),
                  color: theme.deepAccent,
                  boxShadow: `inset 0 0 0 1px ${hexToRgba(theme.accent, 0.2)}`,
                }}
              >
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: theme.accent }}
                  aria-hidden="true"
                />
                <EditableText
                  as="span"
                  enabled={edit?.enabled}
                  value={persona}
                  onChange={(next) => {
                    const personas = [...section.personas];
                    personas[personaIndex] = next;
                    edit?.onChange(index, { ...section, personas });
                  }}
                  className="min-w-0 flex-1 text-left"
                />
              </li>
            ))}
          </ul>
        </section>
      );

    case "cta_price":
      return (
        <section
          key={`cta_price-${index}`}
          className={getCategoryRhythm(category).ctaPadClass}
          style={{ backgroundColor: getCtaBandBackground(theme) }}
        >
          <div className={`${TEXT_COL_CLASS} space-y-5`}>
            <p className={TYPO.sectionLabel} style={{ color: theme.deepAccent }}>
              PRICE
            </p>
            <p
              className="font-heading text-[2.75rem] font-bold sm:text-5xl"
              style={{ color: theme.accent, letterSpacing: "-0.04em" }}
            >
              ₩{section.price.toLocaleString()}
            </p>
            {section.targetCustomer && (
              <span
                className="inline-block rounded-full px-4 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.14),
                  color: theme.deepAccent,
                }}
              >
                {section.targetCustomer}
              </span>
            )}
            {section.badges && section.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {section.badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: hexToRgba(theme.baseNeutral, 0.85),
                      color: theme.deepAccent,
                      boxShadow: `inset 0 0 0 1px ${hexToRgba(theme.accent, 0.2)}`,
                    }}
                  >
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: theme.accent }}
                      aria-hidden="true"
                    />
                    {badge}
                  </span>
                ))}
              </div>
            )}
            <div className="pt-4">
              <span
                className={getCategoryRhythm(category).ctaButtonClass}
                style={{ backgroundColor: theme.deepAccent }}
                role="presentation"
              >
                지금 구매하기
              </span>
              <p className="mt-3 text-xs leading-relaxed text-ink/50">
                배송·교환·환불은 판매자 정책을 확인해 주세요.
              </p>
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}

export default function DetailSectionRenderer({
  sections,
  imageUrls,
  category,
  theme: themeOverride,
  conceptIcons,
  edit,
}: DetailSectionRendererProps) {
  const theme = themeOverride ?? getCategoryTheme(category);
  let imageTextCount = 0;

  return (
    <div className="overflow-hidden">
      {sections.map((section, index) => {
        const isFullPoint =
          section.type === "image_text" &&
          section.layout !== "compact" &&
          section.slot !== "quick_points";
        const pointIndex = isFullPoint ? imageTextCount++ : undefined;
        const bodyIndex = sections.slice(0, index).filter((s) => s.type !== "hero").length;
        const pattern = section.type === "hero" ? "A" : getSectionPattern(bodyIndex);
        const prevBodyIndex = sections.slice(0, index).filter((s) => s.type !== "hero").length - 1;
        const followPattern =
          section.type === "checklist" &&
          section.compactFollow === true &&
          index > 0 &&
          sections[index - 1].type !== "hero"
            ? getSectionPattern(Math.max(0, prevBodyIndex))
            : undefined;
        const content = renderSection(
          section,
          imageUrls,
          index,
          category,
          theme,
          pattern,
          conceptIcons,
          pointIndex,
          edit,
          followPattern,
        );
        return (
          <DetailScrollReveal
            key={`${section.type}-${section.slot}-${index}`}
            index={index}
            variant={section.type === "hero" ? "hero" : "section"}
          >
            {content}
          </DetailScrollReveal>
        );
      })}
    </div>
  );
}
