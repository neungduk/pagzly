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
import {
  SLOT_IMAGE_RATIO,
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

// 토큰 스케일: 가로는 SECTION_PADDING(24/40), 세로는 SECTION_GAP(48/80).
// 레퍼런스는 카드 갭이 아니라 맞붙은 풀폭 블록 안의 호흡이므로 space-y 대신
// 내부 py로 같은 숫자를 쓴다.
const BLOCK_PAD_CLASS = "px-6 py-12 sm:px-10 sm:py-20";
const TEXT_COL_CLASS = "mx-auto max-w-xl text-center";
const POINT_PAD_CLASS = "px-6 pt-6 pb-10 sm:px-10 sm:pt-8 sm:pb-14";
const HEADLINE_CLAMP = "line-clamp-2";
const BODY_CLAMP = "line-clamp-3";

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

function SectionImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
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
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/80"
        style={{ boxShadow: `0 0 0 1px ${theme.accent}33` }}
        aria-hidden="true"
      />
    );
  }
  if (fallbackIndex != null) {
    return (
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-paper"
        style={{ backgroundColor: theme.accent }}
        aria-hidden="true"
      >
        {fallbackIndex + 1}
      </span>
    );
  }
  return (
    <span
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: hexToRgba(theme.accent, 0.12) }}
      aria-hidden="true"
    >
      <ThemeIcon theme={theme} />
    </span>
  );
}

function sectionBackgroundStyle(theme: CategoryTheme, pattern: SectionColorPattern) {
  return { backgroundColor: getSectionBackground(theme, pattern) };
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
) {
  switch (section.type) {
    case "hero": {
      const src = resolveImage(imageUrls, section.imageIndex);
      return (
        <div key={`hero-wrap-${index}`} className="relative">
          {/* 장식 요소: hero에서만, accentColor 8~12% 투명도, 상품 이미지 뒤쪽. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full blur-3xl sm:h-72 sm:w-72"
            style={{ backgroundColor: getDecorationColor(theme), zIndex: 0 }}
          />
          <section
            className={`relative z-10 w-full overflow-hidden ${SLOT_IMAGE_RATIO.hero} min-h-[85svh] sm:min-h-[760px]`}
          >
            <SectionImage
              src={src}
              alt={section.headline}
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
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-12 text-center sm:px-10 sm:pb-16">
              <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                {category}
              </p>
              <EditableText
                as="h2"
                enabled={edit?.enabled}
                value={section.headline}
                onChange={(headline) =>
                  edit?.onChange(index, { ...section, headline })
                }
                className={`${HEADLINE_CLAMP} font-heading text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl`}
              />
              {(section.subheadline || edit?.enabled) ? (
                <EditableText
                  as="p"
                  enabled={edit?.enabled}
                  value={section.subheadline ?? ""}
                  onChange={(subheadline) =>
                    edit?.onChange(index, { ...section, subheadline })
                  }
                  className={`mt-3 max-w-xl ${HEADLINE_CLAMP} text-base text-white/90 sm:text-lg`}
                />
              ) : null}
            </div>
          </section>
        </div>
      );
    }

    case "checklist":
      return (
        <section
          key={`checklist-${index}`}
          className={BLOCK_PAD_CLASS}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <div className={TEXT_COL_CLASS}>
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} font-heading text-2xl font-bold sm:text-3xl`}
            />
          </div>
          <ul
            className={`mt-10 grid gap-x-4 gap-y-8 ${
              section.items.length === 3
                ? "grid-cols-3"
                : section.items.length >= 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-2"
            }`}
          >
            {section.items.map((item, itemIndex) => (
              <li
                key={`${itemIndex}-${item.slice(0, 12)}`}
                className="flex flex-col items-center text-center text-sm leading-snug text-ink/80"
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
                  className="mt-3"
                />
              </li>
            ))}
          </ul>
        </section>
      );

    case "image_text": {
      const src = resolveImage(imageUrls, section.imageIndex);
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
          <div className={`${POINT_PAD_CLASS} ${TEXT_COL_CLASS}`}>
            {pointLabel && (
              <p
                className="mb-3 font-mono text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: theme.accent }}
              >
                {pointLabel}
              </p>
            )}
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl`}
            />
            <EditableText
              as="p"
              multiline
              enabled={edit?.enabled}
              value={section.body}
              onChange={(body) => edit?.onChange(index, { ...section, body })}
              className={`mt-4 ${BODY_CLAMP} text-sm leading-7 text-ink/65 sm:text-base`}
            />
          </div>
        </section>
      );
    }

    case "spec_table":
      return (
        <section
          key={`spec_table-${index}`}
          className={BLOCK_PAD_CLASS}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl`}
          />
          <div className="mt-8 overflow-hidden">
            <table className="w-full text-sm">
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
                    <td className="w-1/3 px-4 py-3.5 font-medium text-ink/55">
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
                    <td className="px-4 py-3.5 text-ink">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "comparison_table":
      return (
        <section
          key={`comparison_table-${index}`}
          className={BLOCK_PAD_CLASS}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
            {section.heading}
          </h3>
          <div className="mx-auto mt-8 max-w-xl overflow-x-auto">
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
          className={BLOCK_PAD_CLASS}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>
            {section.heading}
          </h3>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
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

    case "usage_steps":
      return (
        <section
          key={`usage_steps-${index}`}
          className={BLOCK_PAD_CLASS}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl`}
          />
          <ol className="mx-auto mt-10 max-w-xl space-y-6">
            {section.steps.map((step, stepIndex) => (
              <li
                key={stepIndex}
                className="flex flex-col items-center text-center text-sm leading-relaxed text-ink/80"
              >
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
                  className="mt-3 max-w-sm"
                />
              </li>
            ))}
          </ol>
        </section>
      );

    case "gallery": {
      const ratioClass = resolveImageRatioClass(section);
      return (
        <section
          key={`gallery-${index}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <div className="px-6 pb-0 pt-8 text-center sm:px-10 sm:pt-12">
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl`}
            />
          </div>
          <div
            className={
              section.imageIndexes.length <= 2
                ? "grid grid-cols-1 gap-px"
                : "grid grid-cols-2 gap-px sm:grid-cols-3"
            }
            style={{ backgroundColor: hexToRgba(theme.accent, 0.18) }}
          >
            {section.imageIndexes.map((imageIndex) => {
              const src = resolveImage(imageUrls, imageIndex);
              return (
                <div key={`${imageIndex}-${src}`} className="relative">
                  <SectionImage
                    src={src}
                    alt={`${section.heading} ${imageIndex + 1}`}
                    className={`${ratioClass} w-full object-cover`}
                  />
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
          className={BLOCK_PAD_CLASS}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <div className={TEXT_COL_CLASS}>
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} font-heading text-xl font-bold sm:text-2xl`}
            />
            <EditableText
              as="p"
              multiline
              enabled={edit?.enabled}
              value={section.body}
              onChange={(body) => edit?.onChange(index, { ...section, body })}
              className={`mt-4 ${BODY_CLAMP} text-sm leading-relaxed text-ink/65`}
            />
          </div>
        </section>
      );

    case "cta_price":
      return (
        <section
          key={`cta_price-${index}`}
          className={BLOCK_PAD_CLASS}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <div className={`${TEXT_COL_CLASS} space-y-4`}>
            <p
              className="font-heading text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ color: theme.accent, letterSpacing: "-0.03em" }}
            >
              ₩{section.price.toLocaleString()}
            </p>
            {section.targetCustomer && (
              <span
                className="inline-block rounded-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.12),
                  color: theme.deepAccent,
                }}
              >
                {section.targetCustomer}
              </span>
            )}
            {section.badges && section.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {section.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.12),
                      color: theme.deepAccent,
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
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
        const pointIndex =
          section.type === "image_text" ? imageTextCount++ : undefined;
        if (section.type === "hero") {
          return renderSection(
            section,
            imageUrls,
            index,
            category,
            theme,
            "A",
            conceptIcons,
            undefined,
            edit,
          );
        }
        const bodyIndex = sections.slice(0, index).filter((s) => s.type !== "hero").length;
        const pattern = getSectionPattern(bodyIndex);
        return renderSection(
          section,
          imageUrls,
          index,
          category,
          theme,
          pattern,
          conceptIcons,
          pointIndex,
          edit,
        );
      })}
    </div>
  );
}
