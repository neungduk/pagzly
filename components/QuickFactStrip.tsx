import type { CategoryTheme } from "@/lib/category-theme";
import { hexToRgba } from "@/lib/design-tokens";
import type { QuickFact } from "@/lib/quick-fact-strip";

type QuickFactStripProps = {
  facts: QuickFact[];
  theme: CategoryTheme;
};

export default function QuickFactStrip({ facts, theme }: QuickFactStripProps) {
  if (facts.length === 0) return null;

  return (
    <div
      className="border-y px-4 py-3 text-center text-xs leading-relaxed sm:px-6"
      style={{
        borderColor: hexToRgba(theme.accent, 0.22),
        backgroundColor: hexToRgba(theme.baseNeutral, 0.65),
        color: theme.deepAccent,
      }}
    >
      <p className="font-medium tracking-tight">
        {facts.map((fact, i) => (
          <span key={`${fact.label}-${i}`}>
            {i > 0 ? (
              <span className="mx-2 opacity-35" aria-hidden="true">
                ·
              </span>
            ) : null}
            <span className="opacity-70">{fact.label}</span>
            <span className="opacity-35"> : </span>
            <span>{fact.value}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
