import type { CategoryTheme } from "@/lib/category-theme";
import { hexToRgba } from "@/lib/design-tokens";
import type { SectionAnchor } from "@/lib/section-anchor-nav";

type SectionAnchorNavProps = {
  anchors: SectionAnchor[];
  theme: CategoryTheme;
};

export default function SectionAnchorNav({ anchors, theme }: SectionAnchorNavProps) {
  if (anchors.length === 0) return null;

  return (
    <nav
      aria-label="섹션 이동"
      className="sticky top-0 z-30 flex gap-1.5 overflow-x-auto border-b px-4 py-2.5 backdrop-blur-md [-webkit-overflow-scrolling:touch] sm:px-6"
      style={{
        borderColor: hexToRgba(theme.accent, 0.2),
        backgroundColor: hexToRgba(theme.baseNeutral, 0.95),
      }}
    >
      {anchors.map((anchor) => (
        <a
          key={anchor.id}
          href={`#${anchor.id}`}
          className="shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            color: theme.deepAccent,
            backgroundColor: hexToRgba(theme.accent, 0.1),
          }}
        >
          {anchor.label}
        </a>
      ))}
    </nav>
  );
}
