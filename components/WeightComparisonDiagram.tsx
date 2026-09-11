import type { CategoryTheme } from "@/lib/category-theme";
import { getCategoryTheme } from "@/lib/category-theme";
import {
  formatWeightLabel,
  selectNearbyReferencePoints,
} from "@/lib/weight-comparison-diagram";

type WeightComparisonDiagramProps = {
  g: number;
  valueLabel: string;
  theme: CategoryTheme;
  /** 있으면 hue-shift 없는 카테고리 기본 accentText로 스트로크 (크림 배경 대비) */
  category?: string;
};

export default function WeightComparisonDiagram({
  g,
  valueLabel,
  theme,
  category,
}: WeightComparisonDiagramProps) {
  const refs = selectNearbyReferencePoints(g);
  if (refs.length === 0) return null;

  // 158차 소음/160차 방수 다이어그램과 동일 관례: 본문 위 가독성 위해
  // 카테고리 기본 accentText 우선.
  const stroke = category ? getCategoryTheme(category).accentText : theme.accentText;

  const allG = [...refs.map((r) => r.g), g];
  const min = Math.min(...allG);
  const max = Math.max(...allG);
  const pad = Math.max((max - min) * 0.22, Math.max(min * 0.08, 3));
  const scaleMin = Math.max(0, min - pad);
  const scaleMax = max + pad;

  const width = 340;
  const trackX1 = 30;
  const trackX2 = width - 30;
  const trackY = 96;
  const span = Math.max(scaleMax - scaleMin, 1);
  const toX = (value: number) => trackX1 + ((value - scaleMin) / span) * (trackX2 - trackX1);

  const prodX = toX(g);
  const safeLabel = valueLabel.length > 16 ? `${valueLabel.slice(0, 15)}…` : valueLabel;

  return (
    <div className="mx-auto mt-8 max-w-[340px] text-center">
      <p className="mb-3 text-[11px] tracking-wide" style={{ color: stroke, opacity: 0.85 }}>
        무게 비교
      </p>
      <svg
        viewBox={`0 0 ${width} 130`}
        width={width}
        height={130}
        role="img"
        aria-label="무게 비교 다이어그램"
        className="mx-auto"
      >
        <line
          x1={trackX1}
          y1={trackY}
          x2={trackX2}
          y2={trackY}
          stroke={stroke}
          strokeWidth={1.2}
          opacity={0.32}
        />
        {refs.map((r) => {
          const x = toX(r.g);
          return (
            <g key={r.label}>
              <line
                x1={x}
                y1={trackY - 6}
                x2={x}
                y2={trackY + 6}
                stroke={stroke}
                strokeWidth={1.2}
                opacity={0.5}
              />
              <text x={x} y={trackY - 14} textAnchor="middle" fontSize={9} fill={stroke} opacity={0.72}>
                {formatWeightLabel(r.g)}
              </text>
              <text x={x} y={trackY + 24} textAnchor="middle" fontSize={9} fill={stroke} opacity={0.72}>
                {r.label}
              </text>
            </g>
          );
        })}
        <circle cx={prodX} cy={trackY} r={5} fill={stroke} />
        <text x={prodX} y={trackY - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill={stroke}>
          {formatWeightLabel(g)}
        </text>
        <text x={prodX} y={trackY + 24} textAnchor="middle" fontSize={10} fontWeight={700} fill={stroke}>
          {safeLabel}
        </text>
      </svg>
    </div>
  );
}
