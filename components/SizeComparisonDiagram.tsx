import type { CategoryTheme } from "@/lib/category-theme";
import { getCategoryTheme } from "@/lib/category-theme";
import {
  REFERENCE_CAN,
  type SizeComparisonDimension,
} from "@/lib/size-comparison-diagram";

type SizeComparisonDiagramProps = {
  dimensions: SizeComparisonDimension[];
  theme: CategoryTheme;
  /** 있으면 hue-shift 없는 카테고리 기본 accentText로 스트로크 (크림 배경 대비) */
  category?: string;
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
  const cap = 4;
  return (
    <g stroke={color} strokeWidth={1.4}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 + px * cap} y1={y1 + py * cap} x2={x1 - px * cap} y2={y1 - py * cap} />
      <line x1={x2 + px * cap} y1={y2 + py * cap} x2={x2 - px * cap} y2={y2 - py * cap} />
    </g>
  );
}

export default function SizeComparisonDiagram({
  dimensions,
  theme,
  category,
}: SizeComparisonDiagramProps) {
  if (dimensions.length === 0) return null;

  // 119차 — 본문 위 가독성: 카테고리 기본 accentText(식품 #92400E). 섹션 hue-shift deepAccent 골드보다 크림에서 강함
  const stroke = category ? getCategoryTheme(category).accentText : theme.accentText;
  const heightDim =
    dimensions.find((d) => d.kind === "height") ??
    dimensions.find((d) => d.kind === "width") ??
    dimensions[0]!;
  const widthDim =
    dimensions.find((d) => d.kind === "width" && d !== heightDim) ??
    dimensions.find((d) => d.kind === "diameter");

  const scale = 9;
  const canH = REFERENCE_CAN.heightCm * scale;
  const canW = REFERENCE_CAN.diameterCm * scale;
  const prodH = Math.min(heightDim.cm * scale, canH * 1.35);
  const prodW = Math.min(
    (widthDim?.kind === "diameter" ? widthDim.cm : (widthDim?.cm ?? heightDim.cm * 0.55)) * scale,
    canW * 2.2,
  );

  const canX = 52;
  const canY = 40;
  const prodX = 200;
  const prodY = 40 + (canH - prodH) / 2;

  return (
    <div className="mx-auto mt-8 max-w-[340px] text-center">
      <p className="mb-2 text-[11px] tracking-wide" style={{ color: stroke, opacity: 0.85 }}>
        크기 비교 (기준: {REFERENCE_CAN.label})
      </p>
      <svg
        viewBox="0 0 340 200"
        width={340}
        height={200}
        role="img"
        aria-label="크기 비교 다이어그램"
        className="mx-auto"
      >
        <text x={canX + canW / 2} y={24} textAnchor="middle" fontSize={10} fill={stroke} opacity={0.9}>
          {REFERENCE_CAN.label}
        </text>
        <rect
          x={canX}
          y={canY}
          width={canW}
          height={canH}
          rx={canW / 2}
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          opacity={0.88}
        />
        <text x={prodX + prodW / 2} y={24} textAnchor="middle" fontSize={10} fill={stroke} opacity={0.9}>
          제품
        </text>
        <rect
          x={prodX}
          y={prodY}
          width={prodW}
          height={prodH}
          rx={6}
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          opacity={1}
        />
        <CapLine x1={canX - 14} y1={canY} x2={canX - 14} y2={canY + canH} color={stroke} />
        <text
          x={canX - 20}
          y={canY + canH / 2}
          textAnchor="end"
          fontSize={9}
          fill={stroke}
          transform={`rotate(-90 ${canX - 20} ${canY + canH / 2})`}
        >
          {REFERENCE_CAN.heightCm}cm
        </text>
        <CapLine
          x1={canX}
          y1={canY + canH + 12}
          x2={canX + canW}
          y2={canY + canH + 12}
          color={stroke}
        />
        <text x={canX + canW / 2} y={canY + canH + 26} textAnchor="middle" fontSize={9} fill={stroke}>
          {REFERENCE_CAN.diameterCm}cm
        </text>
        <CapLine
          x1={prodX + prodW + 12}
          y1={prodY}
          x2={prodX + prodW + 12}
          y2={prodY + prodH}
          color={stroke}
        />
        <text x={prodX + prodW + 22} y={prodY + prodH / 2} fontSize={9} fill={stroke}>
          {heightDim.value}
        </text>
        {widthDim && widthDim !== heightDim ? (
          <>
            <CapLine
              x1={prodX}
              y1={prodY + prodH + 12}
              x2={prodX + prodW}
              y2={prodY + prodH + 12}
              color={stroke}
            />
            <text x={prodX + prodW / 2} y={prodY + prodH + 26} textAnchor="middle" fontSize={9} fill={stroke}>
              {widthDim.value}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}
