import type { CategoryTheme } from "@/lib/category-theme";
import { hexToRgba } from "@/lib/design-tokens";
import type { QuickFact } from "@/lib/quick-fact-strip";

type SpecBentoGridProps = {
  facts: QuickFact[];
  theme: CategoryTheme;
};

/** 165차 — 벤토 그리드 스펙 하이라이트 (QuickFactStrip의 카드형 대체). lib/spec-bento-grid.ts 참고. */
export default function SpecBentoGrid({ facts, theme }: SpecBentoGridProps) {
  if (facts.length < 2) return null;
  const cells = facts.slice(0, 4);

  return (
    <div
      className="mx-auto grid max-w-[480px] grid-cols-2 gap-2.5 px-5 pb-0.5 pt-4 sm:px-6"
      role="list"
      aria-label="핵심 스펙 요약"
    >
      {cells.map((f, i) => {
        const isHero = i === 0;
        return (
          <div
            key={`${f.label}-${i}`}
            role="listitem"
            className="flex min-h-[84px] flex-col justify-end rounded-2xl p-4"
            style={
              isHero
                ? { backgroundColor: theme.deepAccent }
                : {
                    backgroundColor: hexToRgba(theme.baseNeutral, 0.4),
                    border: `1px solid ${hexToRgba(theme.accent, 0.18)}`,
                  }
            }
          >
            <p
              className={`mb-1.5 text-[10px] tracking-wide ${isHero ? "text-paper" : ""}`}
              style={isHero ? { opacity: 0.72 } : { color: theme.deepAccent, opacity: 0.62 }}
            >
              {f.label}
            </p>
            <p
              className={`text-[15px] font-bold leading-snug ${isHero ? "text-paper text-[19px] font-extrabold" : ""}`}
              style={isHero ? undefined : { color: theme.deepAccent }}
            >
              {f.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
