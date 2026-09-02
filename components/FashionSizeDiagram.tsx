import type { CategoryTheme } from "@/lib/category-theme";
import {
  ARROW_GEOM,
  type SizeDiagramMatch,
} from "@/lib/fashion-size-diagram";

type FashionSizeDiagramProps = {
  matches: SizeDiagramMatch[];
  theme: CategoryTheme;
};

function CapLine({
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const cap = 5;
  return (
    <g stroke={color} strokeWidth={1.5}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 + px * cap} y1={y1 + py * cap} x2={x1 - px * cap} y2={y1 - py * cap} />
      <line x1={x2 + px * cap} y1={y2 + py * cap} x2={x2 - px * cap} y2={y2 - py * cap} />
    </g>
  );
}

export default function FashionSizeDiagram({ matches, theme }: FashionSizeDiagramProps) {
  if (matches.length === 0) return null;
  const stroke = theme.deepAccent;

  return (
    <div className="mx-auto mt-8 max-w-[280px] text-center">
      <svg
        viewBox="0 0 220 300"
        width={220}
        height={300}
        role="img"
        aria-label="사이즈 실측 다이어그램"
        className="mx-auto"
      >
        <path
          d="M72 64 L52 84 L36 78 L54 118 L54 258 L166 258 L166 118 L184 78 L168 62 L142 76 L110 68 L78 76 Z"
          fill="none"
          stroke={stroke}
          strokeWidth={1.6}
          opacity={0.55}
        />
        <path
          d="M52 84 L36 78 L28 72 L38 58 L54 64 Z"
          fill="none"
          stroke={stroke}
          strokeWidth={1.2}
          opacity={0.4}
        />
        <path
          d="M168 62 L184 78 L192 72 L182 58 L166 64 Z"
          fill="none"
          stroke={stroke}
          strokeWidth={1.2}
          opacity={0.4}
        />
        {matches.map((m) => {
          const g = ARROW_GEOM[m.key];
          return (
            <g key={m.key}>
              <CapLine x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} color={stroke} />
              <text
                x={g.lx}
                y={g.ly}
                textAnchor="middle"
                fontSize={9}
                fill={stroke}
                className="font-sans"
              >
                {m.label}
              </text>
              <text
                x={g.lx}
                y={g.ly + 11}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill={stroke}
                className="font-sans"
              >
                {m.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
