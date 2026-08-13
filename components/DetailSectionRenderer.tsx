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

function renderSection(
  section: DetailSection,
  imageUrls: string[],
  index: number,
  category: string,
  theme: CategoryTheme,
) {
  switch (section.type) {
    case "hero": {
      const src = resolveImage(imageUrls, section.imageIndex);
      return (
        <section
          key={`hero-${index}`}
          className="relative min-h-[380px] overflow-hidden rounded-2xl sm:min-h-[480px]"
        >
          <SectionImage
            src={src}
            alt={section.headline}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(0deg, ${theme.heroScrimFrom} 0%, rgba(0,0,0,0.05) 60%, transparent 100%)`,
            }}
          />
          <div className="relative flex h-full min-h-[380px] flex-col justify-end p-6 sm:min-h-[480px] sm:p-10">
            <span
              className="absolute left-6 top-6 rounded-full px-3 py-1 text-xs font-semibold sm:left-10 sm:top-10"
              style={{
                backgroundColor: theme.accentSoft,
                color: theme.accentText,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}
            >
              {category}
            </span>
            <h2 className="font-serif text-4xl leading-tight text-white sm:text-5xl">
              {section.headline}
            </h2>
            {section.subheadline && (
              <p className="mt-2 text-base text-white/90">{section.subheadline}</p>
            )}
          </div>
        </section>
      );
    }

    case "checklist":
      return (
        <section
          key={`checklist-${index}`}
          className="rounded-2xl border border-gray-100 p-8 sm:p-10"
          style={{ backgroundColor: theme.accentSoft }}
        >
          <h3
            className="font-serif text-xl"
            style={{ color: theme.accentText }}
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
      const imageEl = (
        <SectionImage
          src={src}
          alt={section.heading}
          className="aspect-[4/3] w-full rounded-xl object-cover"
        />
      );
      const textEl = (
        <div>
          <h3 className="font-serif text-2xl text-gray-900">{section.heading}</h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{section.body}</p>
        </div>
      );

      return (
        <section
          key={`image_text-${index}`}
          className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-10"
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
          className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-10"
        >
          <h3 className="font-serif text-2xl text-gray-900">{section.heading}</h3>
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr
                    key={`${row.label}-${rowIndex}`}
                    className={rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}
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

    case "usage_steps":
      return (
        <section
          key={`usage_steps-${index}`}
          className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-10"
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

    case "gallery":
      return (
        <section
          key={`gallery-${index}`}
          className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-10"
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
                  className="aspect-square w-full rounded-lg object-cover"
                />
              );
            })}
          </div>
        </section>
      );

    case "caution":
      return (
        <section
          key={`caution-${index}`}
          className="rounded-2xl border border-amber-100 bg-amber-50 p-8 sm:p-10"
        >
          <h3 className="font-serif text-xl text-amber-800">{section.heading}</h3>
          <p className="mt-2 text-sm leading-relaxed text-amber-700">{section.body}</p>
        </section>
      );

    case "cta_price":
      return (
        <section
          key={`cta_price-${index}`}
          className="rounded-2xl border-2 bg-white p-8 sm:p-10"
          style={{ borderColor: `${theme.accent}33` }}
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
                    backgroundColor: theme.accentSoft,
                    color: theme.accentText,
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
                      backgroundColor: theme.accentSoft,
                      color: theme.accentText,
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
    <div className="space-y-8 sm:space-y-10">
      {sections.map((section, index) =>
        renderSection(section, imageUrls, index, category, theme),
      )}
    </div>
  );
}
