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
import {
  SECTION_GAP_CLASS,
  SECTION_PADDING_CLASS,
  SLOT_IMAGE_RATIO,
  getDecorationColor,
  getHeroGradient,
  getSectionBackground,
  getSectionPattern,
  type SectionColorPattern,
} from "@/lib/design-tokens";

type DetailSectionRendererProps = {
  sections: DetailSection[];
  imageUrls: string[];
  category: string;
  theme?: CategoryTheme;
};

const THEME_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Leaf,
  Cpu,
  Shirt,
  PawPrint,
  CheckCircle2,
};

function resolveImage(imageUrls: string[], index: number) {
  return imageUrls[index] ?? imageUrls[0] ?? "";
}

// 슬롯별 고정 이미지 비율 (lib/design-tokens.ts). 지정 안 된 슬롯은 섹션
// 타입 기준으로 폴백하고, 그마저 없으면 정사각형으로 고정한다.
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
      className="mt-0.5 shrink-0"
      size={20}
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

// 섹션 배경은 패턴 A(baseNeutral 단색) / 패턴 B(accentColor 옅은 단색) 2가지만
// 허용. 홀수 번째(0-based 짝수 index) = A, 짝수 번째 = B로 교차시킨다.
function sectionBackgroundStyle(theme: CategoryTheme, pattern: SectionColorPattern) {
  return { backgroundColor: getSectionBackground(theme, pattern) };
}

function renderSection(
  section: DetailSection,
  imageUrls: string[],
  index: number,
  category: string,
  theme: CategoryTheme,
  pattern: SectionColorPattern,
) {
  switch (section.type) {
    case "hero": {
      const src = resolveImage(imageUrls, section.imageIndex);
      return (
        <div key={`hero-wrap-${index}`} className="relative">
          {/* 장식 요소: hero에서만, accentColor 8~12% 투명도, 블러 처리해
              카드 뒤쪽에서만 살짝 비치도록 배치 (상품 사진 위로 겹치지 않음). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full blur-3xl sm:h-72 sm:w-72"
            style={{ backgroundColor: getDecorationColor(theme), zIndex: 0 }}
          />
          <section
            className="relative z-10 min-h-[380px] overflow-hidden rounded-2xl sm:min-h-[480px]"
          >
            <SectionImage
              src={src}
              alt={section.headline}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* hero만 예외적으로 accentColor 그라데이션(진→연) 허용 */}
            <div
              className="absolute inset-0"
              style={{ background: getHeroGradient(theme) }}
            />
            <div className={`relative flex h-full min-h-[380px] flex-col justify-end ${SECTION_PADDING_CLASS} sm:min-h-[480px]`}>
              <span
                className="absolute left-6 top-6 rounded-full px-3 py-1 text-xs font-semibold sm:left-10 sm:top-10"
                style={{
                  backgroundColor: theme.baseNeutral,
                  color: theme.deepAccent,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                }}
              >
                {category}
              </span>
              <h2 className="line-clamp-2 font-serif text-4xl leading-tight text-white sm:text-5xl">
                {section.headline}
              </h2>
              {section.subheadline && (
                <p className="mt-2 line-clamp-2 text-base text-white/90">{section.subheadline}</p>
              )}
            </div>
          </section>
        </div>
      );
    }

    case "checklist":
      return (
        <section
          key={`checklist-${index}`}
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3
            className="font-serif text-xl"
            style={{ color: theme.deepAccent }}
          >
            {section.heading}
          </h3>
          <ul className="mt-5 space-y-3">
            {section.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                <ThemeIcon theme={theme} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "image_text": {
      const src = resolveImage(imageUrls, section.imageIndex);
      const ratioClass = resolveImageRatioClass(section);
      const imageEl = (
        <SectionImage
          src={src}
          alt={section.heading}
          className={`${ratioClass} w-full rounded-xl object-cover`}
        />
      );
      const textEl = (
        <div>
          <h3 className="line-clamp-2 font-serif text-2xl text-gray-900">{section.heading}</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600">{section.body}</p>
        </div>
      );

      return (
        <section
          key={`image_text-${index}`}
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <div className="grid items-center gap-6 sm:grid-cols-2">
            {section.imagePosition === "left" ? (
              <>
                {imageEl}
                {textEl}
              </>
            ) : (
              <>
                {textEl}
                {imageEl}
              </>
            )}
          </div>
        </section>
      );
    }

    case "spec_table":
      return (
        <section
          key={`spec_table-${index}`}
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className="font-serif text-2xl text-gray-900">{section.heading}</h3>
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr
                    key={`${row.label}-${rowIndex}`}
                    className={rowIndex % 2 === 0 ? "bg-white/60" : "bg-white"}
                  >
                    <td className="w-1/3 px-4 py-3 font-medium text-gray-500">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{row.value}</td>
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
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className="font-serif text-2xl text-gray-900">{section.heading}</h3>
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/60">
                  <th className="px-4 py-3 text-left font-medium text-gray-500" />
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    {section.columns[0]}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: theme.deepAccent }}>
                    {section.columns[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr
                    key={`${row.label}-${rowIndex}`}
                    className={rowIndex % 2 === 0 ? "bg-white/60" : "bg-white"}
                  >
                    <td className="px-4 py-3 font-medium text-gray-500">{row.label}</td>
                    <td className="px-4 py-3 text-gray-800">{row.values[0]}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.values[1]}</td>
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
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className="font-serif text-2xl text-gray-900">{section.heading}</h3>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {section.options.map((option) => {
              const src = resolveImage(imageUrls, option.imageIndex);
              return (
                <div key={option.label} className="space-y-2">
                  <SectionImage
                    src={src}
                    alt={option.label}
                    className={`${ratioClass} w-full rounded-lg object-cover`}
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-gray-200"
                      style={{ backgroundColor: option.colorHex }}
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
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className="font-serif text-2xl text-gray-900">{section.heading}</h3>
          <ol className="mt-5 space-y-4">
            {section.steps.map((step, stepIndex) => (
              <li key={step} className="flex items-start gap-3 text-sm text-gray-700">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  {stepIndex + 1}
                </span>
                <span className="pt-0.5">{step}</span>
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
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className="font-serif text-2xl text-gray-900">{section.heading}</h3>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {section.imageIndexes.map((imageIndex) => {
              const src = resolveImage(imageUrls, imageIndex);
              return (
                <SectionImage
                  key={`${imageIndex}-${src}`}
                  src={src}
                  alt={`${section.heading} ${imageIndex + 1}`}
                  className={`${ratioClass} w-full rounded-lg object-cover`}
                />
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
          className={`rounded-2xl border border-gray-100 ${SECTION_PADDING_CLASS}`}
          style={sectionBackgroundStyle(theme, pattern)}
        >
          <h3 className="font-serif text-xl" style={{ color: theme.deepAccent }}>
            {section.heading}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">{section.body}</p>
        </section>
      );

    case "cta_price":
      return (
        <section
          key={`cta_price-${index}`}
          className={`rounded-2xl border-2 ${SECTION_PADDING_CLASS}`}
          style={{ ...sectionBackgroundStyle(theme, pattern), borderColor: `${theme.accent}33` }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className="text-2xl"
                style={{ color: theme.accent }}
              >
                ₩<span className="font-serif">{section.price.toLocaleString()}</span>
              </p>
              {section.targetCustomer && (
                <span
                  className="mt-2 inline-block rounded-full px-3 py-1 text-xs"
                  style={{
                    backgroundColor: theme.baseNeutral,
                    color: theme.deepAccent,
                  }}
                >
                  {section.targetCustomer}
                </span>
              )}
            </div>
            {section.badges && section.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {section.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{
                      backgroundColor: theme.baseNeutral,
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
}: DetailSectionRendererProps) {
  const theme = themeOverride ?? getCategoryTheme(category);

  return (
    <div className={SECTION_GAP_CLASS}>
      {sections.map((section, index) => {
        if (section.type === "hero") {
          return renderSection(section, imageUrls, index, category, theme, "A");
        }
        // hero를 제외한 본문 섹션 중 몇 번째인지로 패턴 A/B를 교차시킨다.
        const bodyIndex = sections.slice(0, index).filter((s) => s.type !== "hero").length;
        const pattern = getSectionPattern(bodyIndex);
        return renderSection(section, imageUrls, index, category, theme, pattern);
      })}
    </div>
  );
}
