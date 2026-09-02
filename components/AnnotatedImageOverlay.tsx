import type { CategoryTheme } from "@/lib/category-theme";

export type ImageAnnotation = {
  label: string;
  xPct: number;
  yPct: number;
};

type AnnotatedImageOverlayProps = {
  annotations: ImageAnnotation[];
  theme: CategoryTheme;
};

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function leaderEnd(xPct: number, yPct: number): { x: number; y: number; side: "left" | "right" } {
  const toLeft = xPct;
  const toRight = 100 - xPct;
  if (toLeft >= toRight) {
    return { x: clampPct(xPct - Math.min(18, toLeft * 0.35)), y: yPct, side: "left" };
  }
  return { x: clampPct(xPct + Math.min(18, toRight * 0.35)), y: yPct, side: "right" };
}

export default function AnnotatedImageOverlay({ annotations, theme }: AnnotatedImageOverlayProps) {
  if (annotations.length === 0) return null;

  const stroke = theme.deepAccent;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="제품 부품 주석"
      >
        {annotations.map((ann, i) => {
          const end = leaderEnd(ann.xPct, ann.yPct);
          return (
            <g key={`${ann.label}-${i}`}>
              <circle cx={ann.xPct} cy={ann.yPct} r={1.1} fill={stroke} opacity={0.9} />
              <circle
                cx={ann.xPct}
                cy={ann.yPct}
                r={2.2}
                fill="none"
                stroke={stroke}
                strokeWidth={0.35}
                opacity={0.55}
              />
              <line
                x1={ann.xPct}
                y1={ann.yPct}
                x2={end.x}
                y2={end.y}
                stroke={stroke}
                strokeWidth={0.35}
                opacity={0.75}
              />
            </g>
          );
        })}
      </svg>
      {annotations.map((ann, i) => {
        const end = leaderEnd(ann.xPct, ann.yPct);
        const labelX = end.side === "left" ? end.x - 1 : end.x + 1;
        return (
          <span
            key={`label-${ann.label}-${i}`}
            className="absolute max-w-[38%] -translate-y-1/2 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-tight tracking-wide text-paper shadow-sm sm:px-3 sm:py-1.5 sm:text-[11px]"
            style={{
              left: `${labelX}%`,
              top: `${end.y}%`,
              transform: end.side === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)",
              backgroundColor: stroke,
            }}
          >
            {ann.label}
          </span>
        );
      })}
    </div>
  );
}
