import type { CategoryTheme } from "@/lib/category-theme";
import { hexToRgba } from "@/lib/design-tokens";
import { ANCHOR_TABS, type SectionAnchor } from "@/lib/section-anchor-nav";

type SectionAnchorNavProps = {
  anchors: SectionAnchor[];
  theme: CategoryTheme;
  /** 히어로·요약 띠 바로 아래에 놓일 때 위 카드와 붙지 않게 간격 */
  afterHero?: boolean;
  /** 410차 — 팩 앵커 모양: pills(기본) / tabs(밑줄 탭, 알약 대신 글자 + 가는 선 구분) */
  variant?: "pills" | "tabs";
};

export default function SectionAnchorNav({ anchors, theme, afterHero, variant = "pills" }: SectionAnchorNavProps) {
  if (anchors.length === 0) return null;
  if (variant === "tabs") {
    const T = ANCHOR_TABS;
    return (
      <nav
        aria-label="섹션 이동"
        className={`${afterHero ? "mt-4 " : ""}sticky top-0 z-30 flex overflow-x-auto border-b px-4 [-webkit-overflow-scrolling:touch] sm:px-6`}
        style={{ borderColor: T.line, backgroundColor: hexToRgba(theme.baseNeutral, 0.95) }}
      >
        {anchors.map((anchor, i) => (
          <a
            key={anchor.id}
            href={`#${anchor.id}`}
            className="shrink-0 font-semibold transition-opacity hover:opacity-80"
            style={{
              padding: `${T.padYPx}px ${T.padXPx}px`,
              fontSize: T.sizePx,
              color: theme.deepAccent,
              borderRight: i < anchors.length - 1 ? `1px solid ${T.line}` : undefined,
            }}
          >
            {anchor.label}
          </a>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="섹션 이동"
      className={`${afterHero ? "mt-4 " : ""}sticky top-0 z-30 flex gap-1.5 overflow-x-auto border-b px-4 py-2.5 backdrop-blur-md [-webkit-overflow-scrolling:touch] sm:px-6`}
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
