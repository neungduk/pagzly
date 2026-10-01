import type { CSSProperties } from "react";
import type { CategoryTheme } from "@/lib/category-theme";
import {
  BRAND,
  FLAT_PAPER,
  FLAT_SECTION_SURFACES,
  hexToRgba,
  RADIUS,
  readableTextAccent,
} from "@/lib/design-tokens";
import { longestTokenEm } from "@/lib/detail-typography";
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
      className="mx-auto grid max-w-[480px] grid-cols-2 gap-2.5 px-5 pb-0.5 pt-4 @min-[640px]/pz:px-6"
      role="list"
      aria-label="핵심 스펙 요약"
    >
      {cells.map((f, i) => {
        if (FLAT_SECTION_SURFACES) {
          const lead = i === 0;
          return (
            <div
              key={`${f.label}-${i}`}
              role="listitem"
              className="@container flex min-h-[84px] flex-col justify-end p-4"
              style={{
                backgroundColor: FLAT_PAPER,
                border: `1px solid ${hexToRgba(theme.accent, 0.16)}`,
                borderRadius: RADIUS.lg,
              }}
            >
              <p className="mb-1.5 text-[10px] tracking-wide" style={{ color: hexToRgba(BRAND.ink, 0.55) }}>
                {f.label}
              </p>
              <p
                className={`pz-fit leading-snug font-bold ${lead ? "[--pz-fs:17px]" : "[--pz-fs:15px]"}`}
                style={{
                  color: lead ? readableTextAccent(theme, 3) : theme.deepAccent,
                  "--pz-fit-em": longestTokenEm(f.value),
                } as CSSProperties}
              >
                {f.value}
              </p>
            </div>
          );
        }
        const isHero = i === 0;
        return (
          <div
            key={`${f.label}-${i}`}
            role="listitem"
            className="@container flex min-h-[84px] flex-col justify-end p-4"
            style={
              isHero
                ? { backgroundColor: theme.deepAccent, borderRadius: RADIUS.lg }
                : {
                    backgroundColor: hexToRgba(theme.baseNeutral, 0.4),
                    border: `1px solid ${hexToRgba(theme.accent, 0.18)}`,
                    borderRadius: RADIUS.lg,
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
              className={`pz-fit leading-snug ${isHero ? "text-paper [--pz-fs:19px] font-extrabold" : "[--pz-fs:15px] font-bold"}`}
              style={{
                ...(isHero ? {} : { color: theme.deepAccent }),
                "--pz-fit-em": longestTokenEm(f.value),
              } as CSSProperties}
            >
              {f.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
