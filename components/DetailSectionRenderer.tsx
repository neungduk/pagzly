import { Fragment, useEffect, useRef, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  Cpu,
  Leaf,
  PawPrint,
  Shirt,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { getCategoryTheme, type CategoryTheme } from "@/lib/category-theme";
import type {
  ComparisonChartSection,
  DetailSection,
  ImageTextSection,
} from "@/lib/types/generate";
import type { ConceptIconMap } from "@/lib/concept-icons";
import { comparisonChecklistPresent } from "@/lib/comparison-chart-guard";
import { resolveCompactImageShape } from "@/lib/compact-image-shape";
import { buildSectionImageAlt } from "@/lib/detail-image-alt";
import { extractTrustChips } from "@/lib/extract-trust-chips";
import {
  formatSectionIndex,
  getSectionKicker,
  resolveSplitColumnRatio,
  resolveSplitImageLeft,
  shouldInsertBreather,
  shouldUseEditorialBleed,
} from "@/lib/detail-visual-rhythm";
import {
  formatPointBadge,
  getCategoryTitleKeyword,
  isCertificationHighlight,
  parseMegaKeywordHeading,
} from "@/lib/detail-visual-enhancements";
import {
  isFashionCategory,
  matchSizeDiagramRows,
} from "@/lib/fashion-size-diagram";
import { matchSizeComparisonRows } from "@/lib/size-comparison-diagram";
import { matchNoiseComparisonRow } from "@/lib/noise-comparison-diagram";
import { matchWeightComparisonRow } from "@/lib/weight-comparison-diagram";
import { matchPowerComparisonRow } from "@/lib/power-consumption-diagram";
import { matchWaterproofIpRow } from "@/lib/waterproof-ip-diagram";
import {
  buildVolumeComparisonEntries,
  matchProductVolumeMl,
} from "@/lib/volume-comparison-diagram";
import {
  INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE,
  isCosmeticsCategory,
} from "@/lib/cosmetics-compliance";
import { isFoodCategory } from "@/lib/food-compliance";
import { prepareFoodRatioSlices } from "@/lib/food-ratio-diagram";
import { preparePackageContentsItems } from "@/lib/package-contents-diagram";
import {
  heroWordmarkClassName,
  heroWordmarkWrapClassName,
  resolveHeroBrandMark,
} from "@/lib/hero-brand-mark";
import { extractQuickFacts, type QuickFact } from "@/lib/quick-fact-strip";
import {
  buildSectionAnchorIdMap,
  buildSectionAnchors,
} from "@/lib/section-anchor-nav";
import { parseCertificationTokens } from "@/lib/enrich-product-sections";
import EditableText from "@/components/EditableText";
import ColorVariationInteractive from "@/components/ColorVariationInteractive";
import DetailScrollReveal from "@/components/DetailScrollReveal";
import FashionSizeDiagram from "@/components/FashionSizeDiagram";
import SizeComparisonDiagram from "@/components/SizeComparisonDiagram";
import NoiseComparisonDiagram from "@/components/NoiseComparisonDiagram";
import WaterproofIpDiagram from "@/components/WaterproofIpDiagram";
import WeightComparisonDiagram from "@/components/WeightComparisonDiagram";
import PowerConsumptionDiagram from "@/components/PowerConsumptionDiagram";
import { headlineDisplayStyle } from "@/lib/detail-typography";
import VolumeComparisonDiagram from "@/components/VolumeComparisonDiagram";
import UsageOrderFlowDiagram from "@/components/UsageOrderFlowDiagram";
import FoodRatioDiagram from "@/components/FoodRatioDiagram";
import PackageContentsDiagram from "@/components/PackageContentsDiagram";
import AnnotatedImageOverlay from "@/components/AnnotatedImageOverlay";
import SpecBentoGrid from "@/components/SpecBentoGrid";
import SectionAnchorNav from "@/components/SectionAnchorNav";
import SectionImage from "@/components/SectionImage";
import { SellerImageMetaContext } from "@/components/SellerImageMetaContext";
import CanvasSectionRenderer from "@/components/CanvasSectionRenderer";
import {
  BRAND,
  SLOT_IMAGE_RATIO,
  HERO_TRANSITION_OVERLAP_CLASS,
  CTA_TRANSITION_OVERLAP_CLASS,
  INFO_BADGE,
  INFO_TABLE,
  SECTION_BG_PATTERN_C_ALPHA,
  getCtaBandBackground,
  getCategoryRhythm,
  getComposedSectionBackgroundStyle,
  getDecorationColor,
  getHeroGradient,
  getSectionInsetShadow,
  getSectionPattern,
  getTextPanelSurface,
  hexToRgba,
  extendTheme,
  getSectionTheme,
  type SectionColorPattern,
} from "@/lib/design-tokens";

export type SectionEditApi = {
  enabled: boolean;
  onChange: (index: number, section: DetailSection) => void;
  onReplaceImage?: (imageIndex: number) => void;
  /** 미리보기에서 섹션 AI 수정 탭으로 바로 진입 */
  onRequestAiPatch?: (sectionIndex: number) => void;
  /** 96차 — 편집 모드에서 필드 클릭 시 elementPath 전달 */
  onElementSelect?: (sectionIndex: number, elementPath: string) => void;
};

function elementSelectProps(
  edit: SectionEditApi | undefined,
  sectionIndex: number,
  elementPath: string,
): { elementPath?: string; onElementSelect?: (path: string) => void } {
  if (!edit?.enabled || !edit.onElementSelect) return {};
  return {
    elementPath,
    onElementSelect: (path) => edit.onElementSelect?.(sectionIndex, path),
  };
}

type DetailSectionRendererProps = {
  sections: DetailSection[];
  imageUrls: string[];
  /** 106차 — AI 연출 배지용 출처 (판매자 미리보기 전용) */
  imageOrigins?: import("@/lib/image-origins").ProductImageOrigin[];
  /** true면 ai-lifestyle 컷에 배지 표시 (캡처/내보내기 시 false) */
  sellerAiBadges?: boolean;
  category: string;
  productName?: string;
  theme?: CategoryTheme;
  conceptIcons?: ConceptIconMap;
  edit?: SectionEditApi;
  /** 결과 페이지 미리보기 — 히어로+초반 섹션만 노출 후 더보기 */
  previewCollapse?: {
    expanded: boolean;
    collapsedAfterIndex: number;
    hasMore: boolean;
    onExpand: () => void;
  };
  brandName?: string | null;
  /** 109차 — 판매자 업로드 브랜드 로고 (없으면 워드마크 폴백) */
  logoUrl?: string | null;
  /** 113차 — 식품 비율·전자 구성품 파싱용 */
  ingredients?: string | null;
  keyFeatures?: string | null;
  certifications?: string | null;
};

const THEME_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Leaf,
  Cpu,
  Shirt,
  PawPrint,
  CheckCircle2,
};

const TEXT_COL_CLASS = "mx-auto max-w-xl text-center";
const TEXT_COL_LEFT_CLASS = "max-w-xl text-left";
const HEADLINE_CLAMP = "line-clamp-2";
const BODY_CLAMP = "line-clamp-3";

const BANNER_OVERLAY_CLASS =
  "absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center sm:px-10";

const TYPO = {
  heroCategory:
    "mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80",
  heroTitle:
    "pagzly-display-headline font-heading text-[2.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl",
  bannerTitle:
    "font-heading text-[1.65rem] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-[1.85rem]",
  heroSub: "mt-4 max-w-xl text-base font-normal leading-relaxed text-white/90 sm:text-lg",
  bannerSub:
    "mt-3 max-w-md text-sm font-normal leading-relaxed text-white/88 sm:text-base",
  compactTitle:
    "font-heading text-base font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-lg",
  compactBody: "mt-1.5 text-sm font-normal leading-relaxed text-ink/75",
  sectionTitle:
    "pagzly-display-headline pagzly-ink-headline font-heading text-[2rem] font-bold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[2.75rem]",
  keywordDisplay:
    "font-heading text-[clamp(2.25rem,11vw,4.25rem)] font-black uppercase leading-[0.92] tracking-[-0.06em]",
  sectionSubtitle:
    "pagzly-ink-headline font-heading text-xl font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-2xl",
  pointBadgePill:
    "inline-block rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em]",
  sectionLabel: "font-mono text-[10px] font-semibold uppercase tracking-[0.32em]",
  pointLabel: "font-mono text-[10px] font-bold uppercase tracking-[0.34em]",
  body: "text-[0.9375rem] font-normal leading-[1.9] text-ink/72 sm:text-base sm:leading-[1.85]",
  checklistItem: "mt-2.5 text-xs font-medium leading-snug text-ink/82 sm:text-sm",
  stepItem: "mt-2.5 max-w-[7.5rem] text-[11px] font-normal leading-relaxed text-ink/78 sm:max-w-sm sm:text-sm",
} as const;

function resolveImage(imageUrls: string[], index: number | undefined) {
  if (imageUrls.length === 0) return "";
  if (
    typeof index === "number" &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < imageUrls.length
  ) {
    return imageUrls[index];
  }
  // 잘못된 index를 image[0]으로 몰아넣으면 전 섹션이 같은 사진처럼 보임
  return "";
}

function resolveImageRatioClass(section: { type: string; slot?: string }) {
  return (
    (section.slot && SLOT_IMAGE_RATIO[section.slot]) ??
    SLOT_IMAGE_RATIO[section.type] ??
    "aspect-square"
  );
}

function ThemeIcon({
  theme,
  inverted,
  size = 22,
}: {
  theme: CategoryTheme;
  inverted?: boolean;
  size?: number;
}) {
  const Icon = THEME_ICONS[theme.icon] ?? CheckCircle2;
  return (
    <Icon
      className="shrink-0"
      size={size}
      style={{ color: inverted ? BRAND.paper : theme.accent }}
      aria-hidden="true"
    />
  );
}

// 147차 — 기존 sm/md(36px/48px)는 카드 안에서 존재감이 거의 없다는 실사용 피드백
// (checklist 배지가 "점"처럼 보임) 반영. sm 44px/md 64px로 확대.
const CONCEPT_BADGE_SIZE_CLASS = { sm: "h-11 w-11", md: "h-16 w-16" } as const;

function ConceptBadgeIcon({
  src,
  theme,
  fallbackIndex,
  size = "md",
  inverted,
}: {
  src?: string;
  theme: CategoryTheme;
  fallbackIndex?: number;
  size?: "sm" | "md";
  inverted?: boolean;
}) {
  const sizeClass = CONCEPT_BADGE_SIZE_CLASS[size];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white/80`}
        style={{ boxShadow: `0 0 0 1px ${theme.accent}33` }}
        aria-hidden="true"
      />
    );
  }
  if (fallbackIndex != null) {
    return (
      <span
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full ${size === "md" ? "text-lg" : "text-sm"} font-semibold text-paper`}
        style={{ backgroundColor: theme.accent }}
        aria-hidden="true"
      >
        {fallbackIndex + 1}
      </span>
    );
  }
  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full`}
      style={{
        backgroundColor: inverted
          ? hexToRgba(BRAND.paper, 0.18)
          : hexToRgba(theme.accent, 0.12),
      }}
      aria-hidden="true"
    >
      <ThemeIcon theme={theme} inverted={inverted} size={size === "md" ? 30 : 20} />
    </span>
  );
}

// spec_table 값이 근거 없음을 나타내는 안내 문구인지 판단 — 완성된 페이지에는
// 이런 문구가 그대로 노출되지 않도록 렌더링 단계에서 걸러낸다.
const PLACEHOLDER_VALUE_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "판매자 정책을 확인",
  "확인 필요",
];

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_VALUE_PATTERNS.some((pattern) => trimmed.includes(pattern));
}

/** comparison_table 셀이 O/X·지원/미지원 류면 체크/엑스 마크로 표시 */
function classifyBoolishCell(value: string): "yes" | "no" | null {
  const t = value.trim().toLowerCase();
  if (!t) return null;
  if (
    /^(o|ㅇ|예|있음|지원|가능|포함|✓|✔|yes|true|y)$/i.test(t) ||
    t === "○" ||
    t === "●"
  ) {
    return "yes";
  }
  if (
    /^(x|ㄴ|아니오|없음|미지원|불가|미포함|✗|✘|no|false|n)$/i.test(t) ||
    t === "×" ||
    t === "✕"
  ) {
    return "no";
  }
  return null;
}

function ComparisonValueCell({
  value,
  emphasized,
  theme,
}: {
  value: string;
  emphasized?: boolean;
  theme: CategoryTheme;
}) {
  const kind = classifyBoolishCell(value);
  if (kind === "yes") {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: hexToRgba(theme.accent, emphasized ? 0.2 : 0.12) }}
        aria-label={value}
      >
        <Check size={16} strokeWidth={2.5} style={{ color: theme.deepAccent }} aria-hidden />
      </span>
    );
  }
  if (kind === "no") {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/5"
        aria-label={value}
      >
        <X size={15} strokeWidth={2.25} className="text-ink/35" aria-hidden />
      </span>
    );
  }
  return (
    <span className={emphasized ? "font-semibold text-ink" : "text-ink"}>{value}</span>
  );
}

function checklistGridClass(itemCount: number, category: string): string {
  if (itemCount === 3) return "grid-cols-3";
  if (itemCount === 5) return "grid-cols-2 sm:grid-cols-5";
  if (itemCount === 2) return "grid-cols-2 max-w-md mx-auto";
  if (itemCount === 4) return getCategoryRhythm(category).checklistGridFour;
  return "grid-cols-2 sm:grid-cols-3";
}

function parseMetricPercent(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function MetricBar({
  percent,
  theme,
  large = false,
  emphasis = false,
}: {
  percent: number;
  theme: CategoryTheme;
  large?: boolean;
  emphasis?: boolean;
}) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.style.width = `${percent}%`;
      return;
    }
    el.style.width = "0%";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => {
          el.style.transition = "width 1.1s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.width = `${percent}%`;
        });
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [percent]);

  return (
    <div
      className={`${large ? (emphasis ? "mt-3 h-4" : "mt-3 h-3") : "mt-1.5 h-1.5"} w-full overflow-hidden rounded-full`}
      style={{
        backgroundColor: hexToRgba(emphasis ? theme.deepAccent : theme.accent, emphasis ? 0.14 : 0.16),
      }}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full"
        ref={fillRef}
        data-fill-bar
        data-fill-percent={percent}
        style={{
          width: `${percent}%`,
          backgroundColor: emphasis ? theme.deepAccent : theme.accent,
          boxShadow: emphasis ? `0 2px 8px ${hexToRgba(theme.deepAccent, 0.35)}` : undefined,
        }}
      />
    </div>
  );
}

/** 원형 게이지 — stat_infographic style:"ring" 전용. 기존 accent/deepAccent만 사용. */
function RadialGauge({
  percent,
  theme,
  size = 96,
  strokeWidth = 9,
}: {
  percent: number;
  theme: CategoryTheme;
  size?: number;
  strokeWidth?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.style.strokeDashoffset = String(offset);
      return;
    }
    el.style.strokeDashoffset = String(circumference);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => {
          el.style.transition = "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)";
          el.style.strokeDashoffset = String(offset);
        });
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [circumference, offset]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
      data-radial-gauge
      data-fill-percent={clamped}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={hexToRgba(theme.accent, 0.16)}
        strokeWidth={strokeWidth}
      />
      <circle
        ref={circleRef}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={theme.deepAccent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

/** comparison_chart 한 지표(metric)의 "우리 vs 비교대상" 2단 바. */
function ComparisonMetricRow({
  label,
  ourLabel,
  baselineLabel,
  ourValue,
  baselineValue,
  unit,
  theme,
}: {
  label: string;
  ourLabel: string;
  baselineLabel: string;
  ourValue: number;
  baselineValue: number;
  unit: string;
  theme: CategoryTheme;
}) {
  const max = Math.max(ourValue, baselineValue, 1);
  const ourPercent = Math.min(100, (ourValue / max) * 100);
  const basePercent = Math.min(100, (baselineValue / max) * 100);
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink/70">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span
            className="w-20 shrink-0 truncate text-xs font-semibold"
            style={{ color: theme.deepAccent }}
          >
            {ourLabel}
          </span>
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: hexToRgba(theme.accent, 0.12) }}
          >
            <MetricBarFill percent={ourPercent} color={theme.accent} />
          </div>
          <span className="w-14 shrink-0 text-right text-xs font-semibold text-ink">
            {ourValue}
            {unit}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 truncate text-xs text-ink/45">{baselineLabel}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/8">
            <MetricBarFill percent={basePercent} color="rgba(27,27,24,0.25)" />
          </div>
          <span className="w-14 shrink-0 text-right text-xs text-ink/45">
            {baselineValue}
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 161차 — ORIJEN형 유무 비교. 체크=accent, 엑스=baseNeutral 톤 (빨강/초록 금지). */
function ComparisonChecklistRow({
  label,
  ourLabel,
  baselineLabel,
  ourValue,
  baselineValue,
  theme,
}: {
  label: string;
  ourLabel: string;
  baselineLabel: string;
  ourValue: number;
  baselineValue: number;
  theme: CategoryTheme;
}) {
  const ourYes = comparisonChecklistPresent(ourValue);
  const baseYes = comparisonChecklistPresent(baselineValue);
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 border-b border-ink/8 py-3 last:border-b-0">
      <p className="text-sm font-medium text-ink/75">{label}</p>
      <span className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-semibold tracking-wide" style={{ color: theme.deepAccent }}>
          {ourLabel}
        </span>
        {ourYes ? (
          <Check className="h-5 w-5" style={{ color: theme.accent }} strokeWidth={2.5} aria-label="있음" />
        ) : (
          <X className="h-5 w-5" style={{ color: theme.baseNeutral }} strokeWidth={2.5} aria-label="없음" />
        )}
      </span>
      <span className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-ink/40">{baselineLabel}</span>
        {baseYes ? (
          <Check className="h-5 w-5 text-ink/35" strokeWidth={2.5} aria-label="있음" />
        ) : (
          <X className="h-5 w-5" style={{ color: theme.baseNeutral }} strokeWidth={2.5} aria-label="없음" />
        )}
      </span>
    </div>
  );
}

/** 공통 fill 애니메이션 — MetricBar / comparison 공용. PNG 캡처 전 freeze가 최종 width로 고정. */
function MetricBarFill({ percent, color }: { percent: number; color: string }) {
  const fillRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.style.width = `${percent}%`;
      return;
    }
    el.style.width = "0%";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => {
          el.style.transition = "width 1.1s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.width = `${percent}%`;
        });
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [percent]);
  return (
    <div
      ref={fillRef}
      data-fill-bar
      data-fill-percent={percent}
      className="h-full rounded-full"
      style={{ width: `${percent}%`, backgroundColor: color }}
    />
  );
}

function sectionBackgroundStyle(
  theme: CategoryTheme,
  pattern: SectionColorPattern,
  category: string,
) {
  return getComposedSectionBackgroundStyle(theme, pattern, category);
}

/** 텍스트 블록 섹션 — 은은한 그라데이션 + 상·하단 액센트 라인 */
function textSectionStyle(theme: CategoryTheme, pattern: SectionColorPattern, category: string) {
  const inset = getSectionInsetShadow(theme, pattern, category);
  return {
    ...getComposedSectionBackgroundStyle(theme, pattern, category),
    ...(inset ? { boxShadow: inset } : {}),
  };
}

/** 본문 카피용 카드 — 단색 배경 대신 레이어·액센트 포인트 */
function TextSectionPanel({
  theme,
  children,
  className = "",
  overlap = false,
  align = "center",
  flat = false,
}: {
  theme: CategoryTheme;
  children: ReactNode;
  className?: string;
  overlap?: boolean;
  align?: "center" | "left";
  flat?: boolean;
}) {
  const textAlign = align === "left" ? "text-left" : "text-center";
  if (flat) {
    return <div className={`relative ${textAlign} ${className}`}>{children}</div>;
  }
  const surface = getTextPanelSurface(theme);
  return (
    <div className={`relative ${overlap ? "-mt-8 sm:-mt-10" : ""} ${className}`}>
      <div
        aria-hidden="true"
        className={`absolute top-5 z-10 h-14 w-1 rounded-full ${align === "left" ? "left-0" : "-left-0.5"}`}
        style={{ backgroundColor: theme.accent }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-6 h-28 w-28 rounded-full opacity-50 ${align === "left" ? "-right-4" : "-right-6"}`}
        style={{ backgroundColor: hexToRgba(theme.accent, 0.1) }}
      />
      <div
        className="relative overflow-hidden rounded-2xl border px-6 py-8 sm:px-8 sm:py-10"
        style={{
          borderColor: surface.borderColor,
          background: surface.background,
          boxShadow: surface.boxShadow,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${hexToRgba(theme.accent, 0.35)}, transparent)`,
          }}
        />
        <div className={`relative ${textAlign}`}>{children}</div>
      </div>
    </div>
  );
}

function SectionBackdropAccent({ theme }: { theme: CategoryTheme }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: hexToRgba(theme.accent, 0.08) }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 bottom-8 h-32 w-32 rounded-full blur-2xl"
        style={{ backgroundColor: hexToRgba(theme.deepAccent, 0.06) }}
      />
    </>
  );
}

function SectionBreather({ theme }: { theme: CategoryTheme }) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-5" aria-hidden="true">
      <span
        className="h-px w-12"
        style={{
          background: `linear-gradient(90deg, transparent, ${hexToRgba(theme.accent, 0.45)})`,
        }}
      />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
      <span
        className="h-px w-12"
        style={{
          background: `linear-gradient(90deg, ${hexToRgba(theme.accent, 0.45)}, transparent)`,
        }}
      />
    </div>
  );
}

function SectionHeader({
  theme,
  title,
  kicker,
  indexLabel,
  pointBadge,
  megaKeyword,
  align = "center",
  inverted,
  edit,
  onTitleChange,
}: {
  theme: CategoryTheme;
  title: string;
  kicker?: string | null;
  indexLabel?: string | null;
  pointBadge?: string | null;
  megaKeyword?: string | null;
  align?: "center" | "left";
  inverted?: boolean;
  edit?: SectionEditApi;
  onTitleChange?: (title: string) => void;
}) {
  const wrapClass = align === "left" ? TEXT_COL_LEFT_CLASS : TEXT_COL_CLASS;
  const rowClass = align === "left" ? "justify-start" : "justify-center";
  const accentColor = inverted ? BRAND.paper : theme.accent;

  return (
    <header className={`mb-8 ${wrapClass}`}>
      {kicker || indexLabel || pointBadge ? (
        <div className={`mb-3 flex flex-wrap items-center gap-3 ${rowClass}`}>
          {pointBadge ? (
            <span
              className={TYPO.pointBadgePill}
              style={{
                borderColor: hexToRgba(accentColor, inverted ? 0.35 : 0.4),
                color: inverted ? hexToRgba(BRAND.paper, 0.88) : theme.deepAccent,
              }}
            >
              {pointBadge}
            </span>
          ) : indexLabel ? (
            <span
              className="font-mono text-xs font-bold tracking-[0.28em]"
              style={{ color: accentColor }}
            >
              {indexLabel}
            </span>
          ) : null}
          {(pointBadge || indexLabel) && kicker ? (
            <span
              className="h-3 w-px"
              style={{ backgroundColor: hexToRgba(accentColor, 0.35) }}
              aria-hidden="true"
            />
          ) : null}
          {kicker ? (
            <p
              className={TYPO.sectionLabel}
              style={{ color: inverted ? hexToRgba(BRAND.paper, 0.75) : theme.deepAccent }}
            >
              {kicker}
            </p>
          ) : null}
        </div>
      ) : null}
      {megaKeyword ? (
        <p
          className={`${TYPO.keywordDisplay} ${HEADLINE_CLAMP}`}
          style={{ color: inverted ? BRAND.paper : theme.deepAccent }}
        >
          {megaKeyword}
        </p>
      ) : null}
      <EditableText
        as="h3"
        enabled={edit?.enabled}
        value={title}
        onChange={onTitleChange ?? (() => {})}
        className={`pagzly-ink-headline ${HEADLINE_CLAMP} ${megaKeyword ? TYPO.sectionSubtitle : TYPO.sectionTitle}`}
        style={inverted ? { color: BRAND.paper } : undefined}
      />
    </header>
  );
}

/**
 * 숫자·후기 카드에 쓰는 레이어드 depth — 회전된 accent 색면을 뒤에 살짝 어긋나게
 * 깔아 입체감을 준다 (design-brief 제안 B). 진짜 그림자 대신 색면 트릭이라 성능
 * 비용이 없고, 카드 내용/편집 로직은 그대로 children으로 전달한다.
 */
function LayeredPanel({
  theme,
  rotate = -2,
  className = "",
  children,
}: {
  theme: CategoryTheme;
  rotate?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute rounded-xl"
        style={{
          top: 6,
          right: -5,
          bottom: -8,
          left: 9,
          backgroundColor: hexToRgba(theme.accent, 0.16),
          transform: `rotate(${rotate}deg)`,
        }}
      />
      <div
        className={`relative rounded-xl ${className}`}
        style={{ backgroundColor: theme.baseNeutral }}
      >
        {children}
      </div>
    </div>
  );
}

function SectionAccentHairline({ theme }: { theme: CategoryTheme }) {
  return (
    <div
      className="mx-auto mb-6 h-px w-12"
      style={{ backgroundColor: hexToRgba(theme.accent, 0.45) }}
      aria-hidden="true"
    />
  );
}

function PreviewCollapseBar({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="relative border-t border-line bg-paper px-6 py-8 sm:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-paper to-transparent"
      />
      <button
        type="button"
        data-testid="detail-preview-expand"
        onClick={onExpand}
        className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl border border-line bg-paper px-6 py-3.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-line/20"
      >
        상세정보 더보기
        <span aria-hidden="true" className="text-registration-red">
          ↓
        </span>
      </button>
    </div>
  );
}

/** Kurly/페이지메이커형 히어로 직후 인증·배지 스트립 */
function TrustStrip({
  chips,
  theme,
  certTokens = [],
}: {
  chips: string[];
  theme: CategoryTheme;
  certTokens?: string[];
}) {
  if (chips.length === 0) return null;
  return (
    <div
      className="border-b border-t px-6 py-4 sm:px-10"
      style={{
        borderColor: hexToRgba(theme.accent, 0.22),
        backgroundColor: hexToRgba(theme.baseNeutral, 0.65),
      }}
    >
      <p
        className={`mb-3 text-center ${TYPO.sectionLabel}`}
        style={{ color: theme.deepAccent }}
      >
        혜택 · 신뢰
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {chips.map((chip) => {
          const certHighlight = certTokens.some(
            (token) =>
              token.length >= 2 &&
              (chip.includes(token) ||
                token.includes(chip) ||
                chip.toLowerCase().includes(token.toLowerCase())),
          );
          return (
            <span
              key={chip}
              className="rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide"
              style={{
                backgroundColor: certHighlight
                  ? hexToRgba(theme.accent, 0.22)
                  : hexToRgba(theme.accent, 0.12),
                color: certHighlight ? theme.accent : theme.deepAccent,
                boxShadow: certHighlight
                  ? `inset 0 -2px 0 0 ${theme.accent}`
                  : `inset 0 0 0 1px ${hexToRgba(theme.accent, 0.28)}`,
              }}
            >
              {chip}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ImageReplaceHit({
  enabled,
  onReplace,
}: {
  enabled?: boolean;
  onReplace?: () => void;
}) {
  if (!enabled || !onReplace) return null;
  return (
    <button
      type="button"
      onClick={onReplace}
      className="absolute right-3 top-3 z-30 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-paper shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.98]"
    >
      이미지 교체
    </button>
  );
}

function countCompactImageTextSections(sections: DetailSection[]): number {
  return sections.filter((s) => s.type === "image_text" && s.layout === "compact").length;
}

/** circle-pair 유효성 — findCircleComparisonComboIndices / renderSection 공용 */
function isCirclePairSection(section: DetailSection): boolean {
  return (
    section.type === "image_text" &&
    section.layout === "circle-pair" &&
    Array.isArray(section.circlePair) &&
    section.circlePair.length === 2 &&
    section.circlePair.every((item) => item.imageUrl?.trim() && item.label?.trim())
  );
}

/** circle-solo 유효성 — findCircleComparisonComboIndices / renderSection 공용 */
function isCircleSoloSection(section: DetailSection): boolean {
  return (
    section.type === "image_text" &&
    section.layout === "circle-solo" &&
    Boolean(section.circleSolo?.imageUrl?.trim() && section.circleSolo?.label?.trim())
  );
}

function isIngredientCircleSection(section: DetailSection): boolean {
  return isCirclePairSection(section) || isCircleSoloSection(section);
}

function isComparisonChartWithMetrics(section: DetailSection): boolean {
  return (
    section.type === "comparison_chart" &&
    Array.isArray(section.metrics) &&
    section.metrics.length > 0
  );
}

/**
 * sections 배열은 건드리지 않고, 인접한 circle↔comparison_chart 쌍만 감지.
 * key: circle 섹션 index, value: 바로 옆 comparison_chart index.
 * 한 인덱스는 최대 하나의 쌍에만 속함(좌→우 스캔, 사용 인덱스 제외).
 */
function findCircleComparisonComboIndices(sections: DetailSection[]): Map<number, number> {
  const map = new Map<number, number>();
  const used = new Set<number>();
  for (let i = 0; i < sections.length - 1; i += 1) {
    if (used.has(i) || used.has(i + 1)) continue;
    const a = sections[i]!;
    const b = sections[i + 1]!;
    if (isIngredientCircleSection(a) && isComparisonChartWithMetrics(b)) {
      map.set(i, i + 1);
      used.add(i);
      used.add(i + 1);
    } else if (isComparisonChartWithMetrics(a) && isIngredientCircleSection(b)) {
      map.set(i + 1, i);
      used.add(i);
      used.add(i + 1);
    }
  }
  return map;
}

const CIRCLE_COMBO_IMG_CLASS =
  "h-20 w-20 rounded-full object-cover shadow-[0_12px_32px_-12px_rgba(27,27,24,0.28)] ring-1 ring-ink/10 sm:h-24 sm:w-24";
const CIRCLE_SOLO_IMG_CLASS =
  "h-[7.5rem] w-[7.5rem] rounded-full object-cover shadow-[0_12px_32px_-12px_rgba(27,27,24,0.28)] ring-1 ring-ink/10 sm:h-[9.375rem] sm:w-[9.375rem]";
const CIRCLE_PAIR_IMG_CLASS =
  "h-24 w-24 rounded-full object-cover shadow-[0_12px_32px_-12px_rgba(27,27,24,0.28)] ring-1 ring-ink/10 sm:h-[7.5rem] sm:w-[7.5rem]";

function renderIngredientCircleVisual(params: {
  section: ImageTextSection;
  productName: string;
  theme: CategoryTheme;
  /** 병합 카드 안에서는 한 단계 작은 원 */
  compact?: boolean;
}): ReactNode {
  const { section, productName, theme, compact = false } = params;
  if (isCircleSoloSection(section) && section.circleSolo) {
    const solo = section.circleSolo;
    return (
      <div className="mx-auto flex max-w-md items-center justify-center">
        <div className="flex min-w-0 flex-col items-center gap-3">
          <div className="relative shrink-0">
            <SectionImage
              src={solo.imageUrl}
              alt={buildSectionImageAlt(productName, solo.label, section.slot)}
              className={compact ? CIRCLE_COMBO_IMG_CLASS : CIRCLE_SOLO_IMG_CLASS}
            />
          </div>
          <p className={`text-center ${TYPO.compactTitle}`} style={{ color: theme.deepAccent }}>
            {solo.label}
          </p>
        </div>
      </div>
    );
  }
  if (isCirclePairSection(section) && section.circlePair) {
    const [left, right] = section.circlePair;
    return (
      <div className="mx-auto flex max-w-md items-start justify-center gap-8 sm:gap-12">
        {[left, right].map((item, pairIndex) => (
          <div
            key={`${item.label}-${pairIndex}`}
            className="flex min-w-0 flex-1 flex-col items-center gap-3"
          >
            <div className="relative shrink-0">
              <SectionImage
                src={item.imageUrl}
                alt={buildSectionImageAlt(productName, item.label, section.slot)}
                className={compact ? CIRCLE_COMBO_IMG_CLASS : CIRCLE_PAIR_IMG_CLASS}
              />
            </div>
            <p className={`text-center ${TYPO.compactTitle}`} style={{ color: theme.deepAccent }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function renderComparisonChartBody(params: {
  section: ComparisonChartSection;
  theme: CategoryTheme;
}): ReactNode {
  const { section, theme } = params;
  const evidence =
    Array.isArray(section.evidenceQuotes) && section.evidenceQuotes.length > 0
      ? section.evidenceQuotes.filter((e) => e.quotes?.some((q) => Boolean(q?.trim())))
      : [];
  return (
    <>
      <p
        className={`mb-4 ${TEXT_COL_CLASS} ${TYPO.sectionLabel}`}
        style={{ color: theme.deepAccent }}
      >
        COMPARE
      </p>
      <h3 className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}>
        {section.heading}
      </h3>
      <div className="mx-auto mt-10 max-w-md space-y-8">
        {section.presentationStyle === "checklist"
          ? section.metrics.map((metric, metricIndex) => (
              <ComparisonChecklistRow
                key={`${metric.label}-${metricIndex}`}
                label={metric.label}
                ourLabel={section.ourLabel}
                baselineLabel={section.baselineLabel}
                ourValue={metric.ourValue}
                baselineValue={metric.baselineValue}
                theme={theme}
              />
            ))
          : section.metrics.map((metric, metricIndex) => (
              <ComparisonMetricRow
                key={`${metric.label}-${metricIndex}`}
                label={metric.label}
                ourLabel={section.ourLabel}
                baselineLabel={section.baselineLabel}
                ourValue={metric.ourValue}
                baselineValue={metric.baselineValue}
                unit={section.unit ?? "%"}
                theme={theme}
              />
            ))}
      </div>
      {(section.basisNote || section.basis === "self_assessed") && (
        <p
          className={`mx-auto mt-6 max-w-md text-center text-xs ${
            section.basis === "self_assessed"
              ? "rounded-md bg-ink/5 px-3 py-2 font-medium text-ink/55"
              : "text-ink/40"
          }`}
        >
          {section.basisNote ||
            (section.basis === "self_assessed"
              ? "자체 평가 기준 (개인차가 있을 수 있어요)"
              : "")}
        </p>
      )}
      {evidence.length > 0 ? (
        <details
          className="mx-auto mt-8 max-w-md rounded-xl border border-line bg-paper/80 px-4 py-3"
          data-testid="comparison-evidence"
        >
          <summary className="cursor-pointer text-center text-xs font-semibold text-ink/60">
            근거 보기
          </summary>
          <div className="mt-4 space-y-5 border-t border-line/60 pt-4">
            {evidence.map((item, i) => (
              <div key={`${item.label}-${i}`}>
                <p className="mb-2 text-center text-[11px] font-medium tracking-wide text-ink/45">
                  {item.label}
                </p>
                <ul className="space-y-2.5">
                  {item.quotes.filter(Boolean).map((quote, qi) => (
                    <li
                      key={qi}
                      className="rounded-xl border border-ink/10 bg-paper px-4 py-3 text-center text-[12px] leading-relaxed text-ink/55 sm:text-[13px]"
                    >
                      <span className="mr-1 font-heading text-lg leading-none text-ink/25" aria-hidden>
                        &ldquo;
                      </span>
                      {quote}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}

/** 인접 circle + comparison_chart를 하나의 <section>으로 병합 렌더 */
function renderCircleComparisonCombo(params: {
  circleSection: ImageTextSection;
  chartSection: ComparisonChartSection;
  index: number;
  category: string;
  theme: CategoryTheme;
  pattern: SectionColorPattern;
  productName: string;
}): ReactNode {
  const { circleSection, chartSection, index, category, theme, pattern, productName } = params;
  return (
    <section
      key={`circle-comparison-combo-${index}`}
      className={getCategoryRhythm(category).generousPadClass}
      style={textSectionStyle(theme, pattern, category)}
      data-testid="circle-comparison-combo"
    >
      <div className="mb-10">
        {renderIngredientCircleVisual({
          section: circleSection,
          productName,
          theme,
          compact: true,
        })}
      </div>
      {renderComparisonChartBody({ section: chartSection, theme })}
    </section>
  );
}

function renderSection(
  section: DetailSection,
  imageUrls: string[],
  index: number,
  category: string,
  theme: CategoryTheme,
  pattern: SectionColorPattern,
  conceptIcons?: ConceptIconMap,
  pointIndex?: number,
  edit?: SectionEditApi,
  followPattern?: SectionColorPattern,
  productName?: string,
  bodyIndex?: number,
  brandName?: string | null,
  certTokens: string[] = [],
  quickFacts: QuickFact[] = [],
  compactImageTextIndex?: number,
  totalCompactImageTextCount?: number,
  logoUrl?: string | null,
  ingredients?: string | null,
  keyFeatures?: string | null,
) {
  const heroFallback = imageUrls[0] ?? "";
  switch (section.type) {
    case "hero": {
      const src = resolveImage(imageUrls, section.imageIndex);
      const imgAlt = buildSectionImageAlt(productName ?? category, section.headline, "hero");
      const brandMark = resolveHeroBrandMark({
        logoUrl,
        brandName,
        productName,
      });
      return (
        <div key={`hero-wrap-${index}`} className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full blur-3xl sm:h-72 sm:w-72"
            style={{ backgroundColor: getDecorationColor(theme), zIndex: 0 }}
          />
          <section
            className={`relative z-10 w-full overflow-hidden ${SLOT_IMAGE_RATIO.hero} ${getCategoryRhythm(category).heroMinClass}`}
          >
            <SectionImage
              src={src}
              alt={imgAlt}
              fallbackSrc={heroFallback}
              className="pagzly-hero-photo absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: getHeroGradient(theme) }}
            />
            <div className="pagzly-ink-scan" aria-hidden="true" />
            <ImageReplaceHit
              enabled={edit?.enabled}
              onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
            />
            {section.badge ? (
              <span
                className="absolute left-0 top-5 z-20 pl-4 pr-5 py-2 text-xs font-bold tracking-wide text-paper shadow-md sm:top-7"
                style={{
                  backgroundColor: theme.deepAccent,
                  clipPath: "polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%)",
                }}
              >
                {section.badge}
              </span>
            ) : null}
            {brandMark.kind === "logo" && logoUrl ? (
              <div
                className="absolute left-1/2 top-5 z-30 flex max-w-[28%] -translate-x-1/2 items-center justify-center px-3 py-2 sm:top-7"
                data-hero-brand-mark="logo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={brandMark.displayName ? `${brandMark.displayName} 로고` : "브랜드 로고"}
                  className="block h-auto max-h-16 w-auto max-w-full object-contain"
                />
              </div>
            ) : null}
            {brandMark.kind === "wordmark" ? (
              <div
                className={heroWordmarkWrapClassName()}
                data-hero-brand-mark="wordmark"
                data-wordmark-scrim="local"
              >
                <p
                  className={`${heroWordmarkClassName(brandMark.script)} text-center`}
                  data-wordmark-script={brandMark.script}
                >
                  {brandMark.displayName}
                </p>
              </div>
            ) : null}
            <div className={getCategoryRhythm(category).heroOverlayClass}>
              <p className={TYPO.heroCategory}>{category}</p>
              <EditableText
                as="h2"
                enabled={edit?.enabled}
                value={section.headline}
                onChange={(headline) =>
                  edit?.onChange(index, { ...section, headline })
                }
                className={`pagzly-ink-headline ${HEADLINE_CLAMP} ${TYPO.heroTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
                style={headlineDisplayStyle(category)}
                {...elementSelectProps(edit, index, "headline")}
              />
              {(section.subheadline || edit?.enabled) ? (
                <EditableText
                  as="p"
                  enabled={edit?.enabled}
                  value={section.subheadline ?? ""}
                  onChange={(subheadline) =>
                    edit?.onChange(index, { ...section, subheadline })
                  }
                  className={`${HEADLINE_CLAMP} ${TYPO.heroSub}`}
                  {...elementSelectProps(edit, index, "subheadline")}
                />
              ) : null}
            </div>
          </section>
        </div>
      );
    }

    case "checklist": {
      const items = Array.isArray(section.items)
        ? section.items.filter((item) => String(item).trim())
        : [];
      if (items.length === 0) {
        console.warn("[DetailSectionRenderer] checklist items empty — section skipped", {
          index,
          heading: section.heading,
        });
        return null;
      }
      const compactFollow = section.compactFollow === true;
      const boldBlock = section.boldBlock === true && !compactFollow;
      const checklistPattern: SectionColorPattern = boldBlock
        ? "C"
        : compactFollow && followPattern
          ? followPattern
          : pattern;
      const headingParts = parseMegaKeywordHeading(section.heading);
      return (
        <section
          key={`checklist-${index}`}
          className={`relative overflow-hidden ${
            compactFollow
              ? "px-6 pb-10 pt-2 sm:px-10 sm:pb-14"
              : getCategoryRhythm(category).generousPadClass
          }`}
          style={textSectionStyle(theme, checklistPattern, category)}
        >
          {!compactFollow ? <SectionBackdropAccent theme={theme} /> : null}
          <div className="relative">
            {!compactFollow ? (
              <SectionHeader
                theme={theme}
                title={headingParts.remainder || section.heading}
                kicker={getSectionKicker(section)}
                pointBadge={bodyIndex != null ? formatPointBadge(bodyIndex + 1) : null}
                megaKeyword={headingParts.keyword}
                inverted={boldBlock}
                edit={edit}
                onTitleChange={(heading) => edit?.onChange(index, { ...section, heading })}
              />
            ) : (
              <div className={TEXT_COL_CLASS}>
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
                  style={boldBlock ? { color: BRAND.paper } : undefined}
                />
              </div>
            )}
          </div>
          <ul
            className={`relative ${compactFollow ? "mt-8" : "mt-10"} grid ${
              compactFollow ? "gap-x-3 gap-y-6" : getCategoryRhythm(category).checklistGapClass
            } ${checklistGridClass(items.length, category)}`}
          >
            {items.map((item, itemIndex) => (
              <li
                key={`${itemIndex}-${item.slice(0, 12)}`}
                className="flex flex-col items-center rounded-2xl border px-4 py-5 text-center transition-transform duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: boldBlock
                    ? hexToRgba(BRAND.paper, 0.22)
                    : hexToRgba(theme.accent, 0.24),
                  backgroundColor: boldBlock
                    ? hexToRgba(BRAND.paper, 0.08)
                    : hexToRgba(theme.accent, 0.06),
                  boxShadow: boldBlock
                    ? undefined
                    : `0 10px 28px -14px ${hexToRgba(theme.deepAccent, 0.14)}`,
                }}
              >
                <ConceptBadgeIcon
                  src={conceptIcons?.checklist?.[itemIndex]}
                  theme={theme}
                  fallbackIndex={itemIndex}
                  size={INFO_BADGE.defaultSize}
                  inverted={boldBlock}
                />
                <EditableText
                  as="span"
                  enabled={edit?.enabled}
                  value={item}
                  onChange={(next) => {
                    const items = [...section.items];
                    items[itemIndex] = next;
                    edit?.onChange(index, { ...section, items });
                  }}
                  className={TYPO.checklistItem}
                  style={boldBlock ? { color: BRAND.paper } : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "image_text": {
      const src = resolveImage(imageUrls, section.imageIndex);
      if (section.layout === "text_only") {
        return (
          <section
            key={`image_text-${index}`}
            className="px-6 py-10 sm:px-10 sm:py-12"
            style={textSectionStyle(theme, pattern, category)}
          >
            <div className="mx-auto max-w-xl">
              <h2 className={TYPO.sectionTitle} style={{ color: theme.deepAccent }}>
                {section.heading}
              </h2>
              <p className={`mt-4 whitespace-pre-line ${TYPO.body}`} style={{ color: BRAND.ink }}>
                {section.body}
              </p>
            </div>
          </section>
        );
      }
      const isCompact = section.layout === "compact";
      const isAnnotated =
        section.layout === "annotated" &&
        Array.isArray(section.annotations) &&
        section.annotations.length > 0;
      const isCirclePair = isCirclePairSection(section);
      const isCircleSolo = isCircleSoloSection(section);
      const isCallout = section.layout === "callout" || section.slot === "feature_callout";

      if (isCircleSolo || isCirclePair) {
        return (
          <section
            key={`image_text-${index}`}
            className="px-6 py-8 sm:px-10 sm:py-10"
            style={textSectionStyle(theme, pattern, category)}
          >
            {renderIngredientCircleVisual({
              section,
              productName: productName ?? "",
              theme,
            })}
          </section>
        );
      }

      if (isCompact) {
        const imageFirst = section.imagePosition !== "right";
        const shape =
          compactImageTextIndex != null && totalCompactImageTextCount != null
            ? resolveCompactImageShape(section, compactImageTextIndex, totalCompactImageTextCount)
            : resolveCompactImageShape(section, 0, 1);
        const thumbRadius = shape === "circle" ? "rounded-full" : "rounded-xl";
        return (
          <section
            key={`image_text-${index}`}
            className="px-6 py-5 sm:px-10 sm:py-6"
            style={textSectionStyle(theme, pattern, category)}
          >
            <div
              className={`mx-auto flex max-w-xl items-center gap-4 ${
                imageFirst ? "flex-row" : "flex-row-reverse"
              }`}
            >
              <div className="relative shrink-0">
                <SectionImage
                  src={src}
                  alt={buildSectionImageAlt(productName ?? "", section.heading, section.slot)}
                  className={`h-24 w-24 object-cover sm:h-[7.5rem] sm:w-[7.5rem] ${thumbRadius}`}
                />
                <ImageReplaceHit
                  enabled={edit?.enabled}
                  onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
                />
              </div>
              <div className={`min-w-0 flex-1 ${imageFirst ? "text-left" : "text-right"}`}>
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={TYPO.compactTitle}
                />
                <EditableText
                  as="p"
                  multiline
                  enabled={edit?.enabled}
                  value={section.body}
                  onChange={(body) => edit?.onChange(index, { ...section, body })}
                  className={TYPO.compactBody}
                />
              </div>
            </div>
          </section>
        );
      }

      if (isAnnotated) {
        const ratioClass = resolveImageRatioClass(section);
        const imageLeft = resolveSplitImageLeft(section, pointIndex);
        return (
          <section
            key={`image_text-${index}`}
            className={`relative overflow-hidden ${getCategoryRhythm(category).generousPadClass}`}
            style={textSectionStyle(theme, pattern, category)}
          >
            <SectionBackdropAccent theme={theme} />
            <div className="relative mx-auto grid max-w-5xl items-center gap-8 px-6 sm:grid-cols-2 sm:gap-10 sm:px-10">
              <div className={imageLeft ? "order-1" : "order-1 sm:order-2"}>
                <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_56px_-16px_rgba(27,27,24,0.22)]">
                  <SectionImage
                    src={src}
                    alt={buildSectionImageAlt(productName ?? "", section.heading, section.slot)}
                    className={`${ratioClass} w-full object-cover`}
                  />
                  <AnnotatedImageOverlay annotations={section.annotations!} theme={theme} />
                  <ImageReplaceHit
                    enabled={edit?.enabled}
                    onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
                  />
                </div>
              </div>
              <div className={`${imageLeft ? "order-2" : "order-2 sm:order-1"} min-w-0`}>
                <TextSectionPanel theme={theme}>
                  <p className={`mb-4 ${TYPO.sectionLabel}`} style={{ color: theme.deepAccent }}>
                    FEATURE
                  </p>
                  <EditableText
                    as="h3"
                    enabled={edit?.enabled}
                    value={section.heading}
                    onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                    className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
                  />
                  <EditableText
                    as="p"
                    multiline
                    enabled={edit?.enabled}
                    value={section.body}
                    onChange={(body) => edit?.onChange(index, { ...section, body })}
                    className={`mt-4 ${BODY_CLAMP} ${TYPO.body}`}
                  />
                </TextSectionPanel>
                {section.slot === "package_contents" ? (
                  (() => {
                    const items = preparePackageContentsItems(section.body, keyFeatures);
                    return items ? (
                      <PackageContentsDiagram items={items} theme={theme} />
                    ) : null;
                  })()
                ) : null}
                {isFoodCategory(category) && section.slot === "sourcing_story" ? (
                  (() => {
                    const slices = prepareFoodRatioSlices(ingredients, keyFeatures);
                    return slices ? (
                      <FoodRatioDiagram slices={slices} theme={theme} />
                    ) : null;
                  })()
                ) : null}
              </div>
            </div>
          </section>
        );
      }

      if (isCallout) {
        const ratioClass = resolveImageRatioClass(section);
        const bubbleText = section.callout ?? section.heading;
        return (
          <section
            key={`image_text-${index}`}
            className="pb-12 sm:pb-16"
            style={textSectionStyle(theme, pattern, category)}
          >
            <div className="relative px-4 pt-4 sm:px-6 sm:pt-6">
              <div className="overflow-hidden rounded-2xl shadow-[0_16px_48px_-12px_rgba(27,27,24,0.18)]">
                <SectionImage
                  src={src}
                  alt={buildSectionImageAlt(productName ?? "", section.heading, section.slot)}
                  className={`${ratioClass} w-full object-cover`}
                />
                <ImageReplaceHit
                  enabled={edit?.enabled}
                  onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
                />
                {bubbleText ? (
                  <div
                    className="absolute bottom-6 left-1/2 z-10 max-w-[85%] -translate-x-1/2 sm:bottom-8"
                    aria-hidden={!edit?.enabled}
                  >
                    <div
                      className="relative rounded-2xl px-5 py-3 text-center text-sm font-semibold leading-snug text-paper shadow-lg sm:text-base"
                      style={{ backgroundColor: theme.deepAccent }}
                    >
                      <EditableText
                        as="span"
                        enabled={edit?.enabled}
                        value={bubbleText}
                        onChange={(callout) =>
                          edit?.onChange(index, { ...section, callout, layout: "callout" })
                        }
                      />
                      <span
                        className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45"
                        style={{ backgroundColor: theme.deepAccent }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={`${getCategoryRhythm(category).pointTextPadClass} px-6 sm:px-10`}>
              <TextSectionPanel theme={theme} overlap>
                <p className={`mb-4 ${TYPO.sectionLabel}`} style={{ color: theme.deepAccent }}>
                  HIGHLIGHT
                </p>
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
                />
                <EditableText
                  as="p"
                  multiline
                  enabled={edit?.enabled}
                  value={section.body}
                  onChange={(body) => edit?.onChange(index, { ...section, body })}
                  className={`mt-4 ${BODY_CLAMP} ${TYPO.body}`}
                />
              </TextSectionPanel>
            </div>
          </section>
        );
      }

      const ratioClass = resolveImageRatioClass(section);

      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        return (
          <section
            key={`image_text-${index}`}
            className="relative overflow-hidden"
            style={textSectionStyle(theme, pattern, category)}
          >
            <div className="relative w-full">
              <SectionImage
                src={src}
                alt={buildSectionImageAlt(productName ?? "", section.heading, section.slot)}
                className={`${ratioClass} w-full object-cover`}
              />
              <ImageReplaceHit
                enabled={edit?.enabled}
                onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
                style={{
                  background: `linear-gradient(0deg, ${hexToRgba(theme.deepAccent, 0.55)} 0%, transparent 100%)`,
                }}
                aria-hidden="true"
              />
            </div>
            <div className={`${getCategoryRhythm(category).pointTextPadClass} mx-auto max-w-xl px-6 text-center sm:px-10`}>
              {kicker ? (
                <p className={`mb-3 ${TYPO.sectionLabel}`} style={{ color: theme.deepAccent }}>
                  {kicker}
                </p>
              ) : null}
              <EditableText
                as="h3"
                enabled={edit?.enabled}
                value={section.heading}
                onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
              />
              <EditableText
                as="p"
                multiline
                enabled={edit?.enabled}
                value={section.body}
                onChange={(body) => edit?.onChange(index, { ...section, body })}
                className={`mt-4 line-clamp-4 ${TYPO.body}`}
              />
            </div>
          </section>
        );
      }

      const pointLabel =
        pointIndex != null
          ? `POINT ${String(pointIndex + 1).padStart(2, "0")}`
          : null;
      const imageLeft = resolveSplitImageLeft(section, pointIndex);
      const kicker = getSectionKicker(section);
      const columnRatio = resolveSplitColumnRatio(pointIndex, imageLeft);

      return (
        <section
          key={`image_text-${index}`}
          className={`relative overflow-hidden ${getCategoryRhythm(category).generousPadClass}`}
          style={textSectionStyle(theme, pattern, category)}
        >
          <SectionBackdropAccent theme={theme} />
          <div className={`relative mx-auto grid max-w-5xl items-center gap-8 px-6 ${columnRatio} sm:gap-10 sm:px-10`}>
            <div className={imageLeft ? "order-1" : "order-1 sm:order-2"}>
              <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_56px_-16px_rgba(27,27,24,0.22)]">
                <SectionImage
                  src={src}
                  alt={buildSectionImageAlt(productName ?? "", section.heading, section.slot)}
                  className={`${ratioClass} w-full object-cover`}
                />
                <ImageReplaceHit
                  enabled={edit?.enabled}
                  onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
                />
                {pointLabel ? (
                  <span
                    className="absolute left-4 top-4 rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-[0.28em] text-paper"
                    style={{ backgroundColor: hexToRgba(theme.deepAccent, 0.9) }}
                  >
                    {pointLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div
              className={`${imageLeft ? "order-2" : "order-2 sm:order-1"} flex flex-col justify-center`}
            >
              <TextSectionPanel theme={theme} align="left" flat>
                {kicker ? (
                  <p className={`mb-3 ${TYPO.sectionLabel}`} style={{ color: theme.deepAccent }}>
                    {kicker}
                  </p>
                ) : null}
                {section.slot === "ingredient_highlight" ? (
                  <div
                    className="mb-5 h-1.5 w-14"
                    style={{ backgroundColor: theme.accent }}
                    aria-hidden="true"
                  />
                ) : null}
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
                />
                <EditableText
                  as="p"
                  multiline
                  enabled={edit?.enabled}
                  value={section.body}
                  onChange={(body) => edit?.onChange(index, { ...section, body })}
                  className={`mt-4 line-clamp-5 ${TYPO.body}`}
                />
                {section.slot === "ingredient_highlight" && isCosmeticsCategory(category) ? (
                  <p className="mt-3 text-[11px] leading-relaxed opacity-55">
                    {INGREDIENT_HIGHLIGHT_COMPLIANCE_NOTE}
                  </p>
                ) : null}
              </TextSectionPanel>
            </div>
          </div>
          {section.slot === "package_contents" ? (
            (() => {
              const items = preparePackageContentsItems(section.body, keyFeatures);
              return items ? (
                <PackageContentsDiagram items={items} theme={theme} />
              ) : null;
            })()
          ) : null}
          {isFoodCategory(category) && section.slot === "sourcing_story" ? (
            (() => {
              const slices = prepareFoodRatioSlices(ingredients, keyFeatures);
              return slices ? (
                <FoodRatioDiagram slices={slices} theme={theme} />
              ) : null;
            })()
          ) : null}
        </section>
      );
    }

    case "spec_table": {
      const visibleRows = section.rows.filter((row) => row.label.trim());
      if (visibleRows.length === 0) return null;
      const isShipping = section.slot === "shipping_info";
      const isSizeTable = section.slot === "size_table";
      const sizeDiagramMatches =
        isSizeTable && isFashionCategory(category)
          ? matchSizeDiagramRows(visibleRows)
          : [];
      const sizeComparisonDims =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchSizeComparisonRows(visibleRows)
          : [];
      const volumeEntries =
        section.slot === "spec_table" && isCosmeticsCategory(category)
          ? buildVolumeComparisonEntries(matchProductVolumeMl(visibleRows))
          : null;
      const showVolumeDiagram = Boolean(volumeEntries && volumeEntries.length >= 2);
      // 화장품: 용량 다이어그램 우선. 용량 없고 cm만 있으면 기존 캔 비교.
      const showSizeComparison =
        sizeComparisonDims.length > 0 && !showVolumeDiagram;
      // 158차 — 소음(dB) 스펙 행은 크기/용량과 별개 물성이라 함께 나와도 됨(카테고리 무관).
      const noiseMatch =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchNoiseComparisonRow(visibleRows)
          : null;
      // 160차 — IP/IPX 방수 등급도 공개 기준표 패턴으로 동일하게 처리.
      const waterproofMatch =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchWaterproofIpRow(visibleRows)
          : null;
      // 162차 — 무게(g/kg)도 같은 패턴으로 확장. 전자/식품/반려동물/생활용품 스펙에
      // 가장 흔하지만 이 패턴이 없었음(신용카드·사과 등 체감 기준으로 비교).
      const weightMatch =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchWeightComparisonRow(visibleRows)
          : null;
      // 163차 — 소비전력(W)도 같은 패턴으로 확장. 전자/가전 스펙 표에 흔한 값인데도
      // 비교 시각화가 없었음(크롤링 근거: 다나와 DPG 등에서 "일반 가전 대비 전력"
      // 비교가 이미 널리 쓰이는 소비자 콘텐츠 포맷임을 확인).
      const powerMatch =
        section.slot === "spec_table" && !isFashionCategory(category)
          ? matchPowerComparisonRow(visibleRows)
          : null;
      const specThumbUrls = (
        section.imageIndexes?.length
          ? section.imageIndexes
              .map((idx) => resolveImage(imageUrls, idx))
              .filter((url): url is string => Boolean(url))
          : [resolveImage(imageUrls, 0) || heroFallback].filter(Boolean)
      ) as string[];
      const isMainSpecTable = section.slot === "spec_table";
      const specSectionStyle = isMainSpecTable
        ? {
            ...textSectionStyle(theme, pattern, category),
            backgroundColor: hexToRgba(theme.baseNeutral, 0.06),
          }
        : textSectionStyle(theme, pattern, category);
      return (
        <section
          key={`spec_table-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={specSectionStyle}
        >
          <p
            className={`mb-4 ${TEXT_COL_CLASS} ${TYPO.sectionLabel}`}
            style={{ color: theme.deepAccent }}
          >
            INFO
          </p>
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          {specThumbUrls.length > 0 ? (
            <div
              className={`mx-auto mt-8 flex items-center justify-center gap-3 sm:gap-4 ${TEXT_COL_CLASS} ${
                specThumbUrls.length > 1 ? "max-w-md" : ""
              }`}
            >
              {specThumbUrls.map((thumbUrl, thumbIndex) => (
                <SectionImage
                  key={`spec-thumb-${thumbIndex}`}
                  src={thumbUrl}
                  alt={buildSectionImageAlt(
                    productName ?? "",
                    specThumbUrls.length > 1
                      ? `${section.heading} ${thumbIndex + 1}`
                      : section.heading,
                    section.slot,
                  )}
                  className={
                    specThumbUrls.length > 1
                      ? "h-20 w-20 rounded-xl object-cover shadow-[0_10px_28px_-10px_rgba(27,27,24,0.24)] ring-1 ring-ink/10 sm:h-24 sm:w-24"
                      : "mx-auto h-28 w-28 rounded-2xl object-cover shadow-[0_12px_32px_-12px_rgba(27,27,24,0.28)] ring-1 ring-ink/10 sm:h-32 sm:w-32"
                  }
                />
              ))}
            </div>
          ) : null}
          {sizeDiagramMatches.length > 0 ? (
            <FashionSizeDiagram matches={sizeDiagramMatches} theme={theme} />
          ) : null}
          {showVolumeDiagram && volumeEntries ? (
            <VolumeComparisonDiagram entries={volumeEntries} theme={theme} />
          ) : null}
          {showSizeComparison ? (
            <SizeComparisonDiagram
              dimensions={sizeComparisonDims}
              theme={theme}
              category={category}
            />
          ) : null}
          {isFoodCategory(category) ? (
            (() => {
              const slices = prepareFoodRatioSlices(ingredients, keyFeatures);
              return slices ? (
                <FoodRatioDiagram slices={slices} theme={theme} />
              ) : null;
            })()
          ) : null}
          {noiseMatch ? (
            <NoiseComparisonDiagram
              db={noiseMatch.db}
              valueLabel={noiseMatch.value}
              theme={theme}
              category={category}
            />
          ) : null}
          {waterproofMatch ? (
            <WaterproofIpDiagram
              level={waterproofMatch.level}
              valueLabel={waterproofMatch.value}
              theme={theme}
              category={category}
            />
          ) : null}
          {weightMatch ? (
            <WeightComparisonDiagram
              g={weightMatch.g}
              valueLabel={weightMatch.value}
              theme={theme}
              category={category}
            />
          ) : null}
          {powerMatch ? (
            <PowerConsumptionDiagram
              w={powerMatch.w}
              valueLabel={powerMatch.value}
              theme={theme}
              category={category}
            />
          ) : null}
          <div
            className={`mx-auto max-w-xl overflow-hidden rounded-lg ${isShipping ? "border-2" : ""} ${
              sizeDiagramMatches.length > 0 ||
              showSizeComparison ||
              showVolumeDiagram ||
              noiseMatch ||
              waterproofMatch ||
              weightMatch ||
              powerMatch
                ? "mt-6"
                : "mt-10"
            }`}
            style={
              isShipping
                ? {
                    borderColor: hexToRgba(theme.accent, 0.35),
                    backgroundColor: hexToRgba(theme.baseNeutral, 0.5),
                  }
                : undefined
            }
          >
            <table className="w-full text-sm">
              <tbody>
                {visibleRows.map((row, visibleIndex) => {
                  const rowIndex = section.rows.indexOf(row);
                  const striped = visibleIndex % 2 === 1;
                  return (
                  <tr
                    key={`${row.label}-${rowIndex}`}
                    className="border-b last:border-b-0"
                    style={{
                      borderColor: hexToRgba(theme.accent, INFO_TABLE.rowBorderAlpha),
                      backgroundColor: striped
                        ? hexToRgba(theme.accent, INFO_TABLE.stripeAlpha)
                        : undefined,
                    }}
                  >
                    <td className={`w-[38%] py-3.5 pr-4 ${TYPO.sectionLabel} text-ink/45`}>
                      <div className="flex items-center gap-2.5">
                        <ConceptBadgeIcon
                          src={conceptIcons?.specTable?.[rowIndex]}
                          theme={theme}
                          fallbackIndex={rowIndex}
                          size={INFO_BADGE.compactSize}
                        />
                        <EditableText
                          as="span"
                          enabled={edit?.enabled}
                          value={row.label}
                          onChange={(label) => {
                            const rows = section.rows.map((item, i) =>
                              i === rowIndex ? { ...item, label } : item,
                            );
                            edit?.onChange(index, { ...section, rows });
                          }}
                        />
                      </div>
                    </td>
                    <td
                      className={`py-3.5 tracking-tight ${
                        isPlaceholderValue(row.value)
                          ? "font-normal text-ink/45"
                          : "font-medium text-ink"
                      }`}
                    >
                      {isCertificationHighlight(row.label, row.value, certTokens) ? (
                        <span
                          className="inline-block rounded-md px-2 py-0.5"
                          style={{
                            color: theme.accent,
                            backgroundColor: hexToRgba(theme.accent, 0.14),
                            boxShadow: `inset 0 -2px 0 0 ${hexToRgba(theme.accent, 0.55)}`,
                          }}
                        >
                          <EditableText
                            as="span"
                            enabled={edit?.enabled}
                            value={row.value}
                            onChange={(value) => {
                              const rows = section.rows.map((item, i) =>
                                i === rowIndex ? { ...item, value } : item,
                              );
                              edit?.onChange(index, { ...section, rows });
                            }}
                          />
                        </span>
                      ) : (
                        <EditableText
                          as="span"
                          enabled={edit?.enabled}
                          value={row.value}
                          onChange={(value) => {
                            const rows = section.rows.map((item, i) =>
                              i === rowIndex ? { ...item, value } : item,
                            );
                            edit?.onChange(index, { ...section, rows });
                          }}
                        />
                      )}
                      {(() => {
                        const percent = parseMetricPercent(row.value);
                        return percent != null ? (
                          <MetricBar percent={percent} theme={theme} />
                        ) : null;
                      })()}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    case "comparison_table":
      return (
        <section
          key={`comparison_table-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <p
            className={`mb-4 ${TEXT_COL_CLASS} ${TYPO.sectionLabel}`}
            style={{ color: theme.deepAccent }}
          >
            COMPARE
          </p>
          <h3 className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}>
            {section.heading}
          </h3>
          <div className="mx-auto mt-10 max-w-xl overflow-x-auto overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: hexToRgba(theme.accent, INFO_TABLE.headerBgAlpha) }}>
                  <th className="px-4 py-3 text-left font-medium text-ink/55" />
                  <th className="px-4 py-3 text-left font-medium text-ink/55">
                    {section.columns[0]}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold"
                    style={{
                      color: theme.deepAccent,
                      backgroundColor: hexToRgba(theme.accent, INFO_TABLE.oursHighlightAlpha),
                    }}
                  >
                    {section.columns[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr
                    key={`${row.label}-${rowIndex}`}
                    className="border-b last:border-b-0"
                    style={{
                      borderColor: hexToRgba(theme.accent, INFO_TABLE.rowBorderAlpha),
                      backgroundColor:
                        rowIndex % 2 === 0
                          ? theme.baseNeutral
                          : hexToRgba(theme.accent, INFO_TABLE.stripeAlpha),
                    }}
                  >
                    <td className="px-4 py-3.5 font-medium text-ink/55">{row.label}</td>
                    <td className="px-4 py-3.5">
                      <ComparisonValueCell value={row.values[0]} theme={theme} />
                    </td>
                    <td
                      className="px-4 py-3.5"
                      style={{
                        backgroundColor: hexToRgba(theme.accent, INFO_TABLE.oursHighlightAlpha),
                      }}
                    >
                      <ComparisonValueCell
                        value={row.values[1]}
                        emphasized
                        theme={theme}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "comparison_chart":
      return (
        <section
          key={`comparison_chart-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          {renderComparisonChartBody({ section, theme })}
        </section>
      );

    case "tradeoff_card": {
      const recommendFor = (Array.isArray(section.recommendFor) ? section.recommendFor : [])
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4);
      const considerIf = (Array.isArray(section.considerIf) ? section.considerIf : [])
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4);
      if (recommendFor.length === 0 && considerIf.length === 0) return null;
      return (
        <section
          key={`tradeoff_card-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
          data-testid="tradeoff-card"
        >
          <p
            className={`mb-4 ${TEXT_COL_CLASS} ${TYPO.sectionLabel}`}
            style={{ color: theme.deepAccent }}
          >
            FIT CHECK
          </p>
          <h3 className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}>
            {section.heading}
          </h3>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{ backgroundColor: hexToRgba(theme.accent, 0.1) }}
            >
              <p className="mb-4 text-xs font-semibold tracking-wide" style={{ color: theme.deepAccent }}>
                이런 분께 추천
              </p>
              <ul className="space-y-3">
                {recommendFor.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.accent }} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{ backgroundColor: hexToRgba(theme.baseNeutral, 0.35) }}
            >
              <p className="mb-4 text-xs font-semibold tracking-wide text-ink/55">
                이런 점은 참고하세요
              </p>
              <ul className="space-y-3">
                {considerIf.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/70">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: theme.baseNeutral }}
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      );
    }

    case "highlight_box": {
      const cards = (Array.isArray(section.cards) ? section.cards : [])
        .filter((card) => (card.title ?? "").trim() || (card.body ?? "").trim())
        .slice(0, 4);
      if (cards.length === 0) {
        console.warn("[DetailSectionRenderer] highlight_box cards empty — section skipped", {
          index,
          heading: section.heading,
        });
        return null;
      }
      const isTrustEvidence = section.slot === "seller_trust_evidence";
      const centerIdx = Math.floor((cards.length - 1) / 2);
      const boldBlock = section.boldBlock === true;
      const boxPattern: SectionColorPattern = boldBlock ? "C" : pattern;
      const headingParts = parseMegaKeywordHeading(section.heading);
      const gridCols = isTrustEvidence
        ? "max-w-3xl grid-cols-1"
        : cards.length <= 2
          ? "max-w-xl grid-cols-1 sm:grid-cols-2"
          : cards.length === 3
            ? "max-w-4xl grid-cols-1 sm:grid-cols-3"
            : "max-w-5xl grid-cols-2 sm:grid-cols-4";
      return (
        <section
          key={`highlight_box-${index}`}
          className={`relative overflow-hidden ${getCategoryRhythm(category).generousPadClass}`}
          style={textSectionStyle(theme, boxPattern, category)}
        >
          {!boldBlock ? <SectionBackdropAccent theme={theme} /> : null}
          {!boldBlock ? <SectionAccentHairline theme={theme} /> : null}
          {!isTrustEvidence || section.heading ? (
            <div className="relative">
              <SectionHeader
                theme={theme}
                title={headingParts.remainder || section.heading}
                kicker={getSectionKicker(section)}
                pointBadge={bodyIndex != null ? formatPointBadge(bodyIndex + 1) : null}
                megaKeyword={headingParts.keyword}
                inverted={boldBlock}
                edit={edit}
                onTitleChange={(heading) => edit?.onChange(index, { ...section, heading })}
              />
            </div>
          ) : null}
          <div className={`relative mx-auto ${isTrustEvidence ? "mt-0" : "mt-10"} grid gap-4 ${gridCols}`}>
            {cards.map((card, cardIndex) => {
              const emphasized = cardIndex === centerIdx;
              const cardKeyword = parseMegaKeywordHeading(card.title);
              return (
                <div
                  key={cardIndex}
                  data-preview-pulse={emphasized ? "true" : undefined}
                  className={`flex flex-col gap-2 rounded-2xl px-6 py-8 text-center ${
                    emphasized && !isTrustEvidence
                      ? "pagzly-pulse-card pagzly-ink-shimmer sm:-translate-y-2"
                      : ""
                  } ${isTrustEvidence ? "py-10 sm:py-14" : ""}`}
                  style={{
                    backgroundColor: emphasized
                      ? hexToRgba(theme.deepAccent, boldBlock ? 1 : SECTION_BG_PATTERN_C_ALPHA)
                      : boldBlock
                        ? hexToRgba(BRAND.paper, 0.12)
                        : hexToRgba(theme.accent, 0.08),
                    border: emphasized
                      ? "none"
                      : boldBlock
                        ? `1px solid ${hexToRgba(BRAND.paper, 0.22)}`
                        : `1px solid ${hexToRgba(theme.accent, 0.18)}`,
                    boxShadow: emphasized
                      ? "0 16px 40px -16px rgba(27,27,24,0.5)"
                      : undefined,
                  }}
                >
                  {!isTrustEvidence ? (
                    <div className="mx-auto">
                      <ConceptBadgeIcon
                        src={conceptIcons?.highlightBox?.[cardIndex]}
                        theme={theme}
                        fallbackIndex={cardIndex}
                        size={INFO_BADGE.defaultSize}
                        inverted={emphasized || boldBlock}
                      />
                    </div>
                  ) : null}
                  {!isTrustEvidence ? (
                    <span
                      className={`mx-auto ${TYPO.pointBadgePill}`}
                      style={{
                        borderColor: emphasized
                          ? hexToRgba(BRAND.paper, 0.35)
                          : boldBlock
                            ? hexToRgba(BRAND.paper, 0.28)
                            : hexToRgba(theme.accent, 0.35),
                        color: emphasized
                          ? hexToRgba(BRAND.paper, 0.82)
                          : boldBlock
                            ? hexToRgba(BRAND.paper, 0.65)
                            : theme.deepAccent,
                      }}
                      aria-hidden="true"
                    >
                      {formatPointBadge(cardIndex + 1)}
                    </span>
                  ) : null}
                  {cardKeyword.keyword && !isTrustEvidence ? (
                    <p
                      className={`${TYPO.keywordDisplay} text-[clamp(1.75rem,8vw,2.75rem)]`}
                      style={
                        emphasized
                          ? { color: BRAND.paper }
                          : boldBlock
                            ? { color: BRAND.paper }
                            : { color: theme.deepAccent }
                      }
                    >
                      {cardKeyword.keyword}
                    </p>
                  ) : null}
                  <EditableText
                    as="p"
                    enabled={edit?.enabled}
                    value={cardKeyword.keyword ? cardKeyword.remainder || card.title : card.title}
                    onChange={(title) => {
                      const nextCards = [...section.cards];
                      nextCards[cardIndex] = { ...nextCards[cardIndex], title };
                      edit?.onChange(index, { ...section, cards: nextCards });
                    }}
                    className={
                      isTrustEvidence
                        ? "font-heading text-2xl font-bold tracking-[-0.03em] sm:text-4xl"
                        : cardKeyword.keyword
                          ? "font-heading text-base font-semibold tracking-[-0.02em]"
                          : "font-heading text-lg font-bold tracking-[-0.02em]"
                    }
                    style={emphasized ? { color: BRAND.paper } : boldBlock ? { color: BRAND.paper } : undefined}
                    {...elementSelectProps(edit, index, `cards[${cardIndex}].title`)}
                  />
                  {card.body ? (
                    <EditableText
                      as="p"
                      multiline
                      enabled={edit?.enabled}
                      value={card.body}
                      onChange={(body) => {
                        const nextCards = [...section.cards];
                        nextCards[cardIndex] = { ...nextCards[cardIndex], body };
                        edit?.onChange(index, { ...section, cards: nextCards });
                      }}
                      className="text-sm leading-relaxed"
                      style={
                        emphasized
                          ? { color: hexToRgba(BRAND.paper, 0.9) }
                          : boldBlock
                            ? { color: hexToRgba(BRAND.paper, 0.82) }
                            : { color: hexToRgba(BRAND.ink, 0.68) }
                      }
                      {...elementSelectProps(edit, index, `cards[${cardIndex}].body`)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "color_variation": {
      const ratioClass = resolveImageRatioClass(section);
      return (
        <ColorVariationInteractive
          section={section}
          index={index}
          imageUrls={imageUrls}
          theme={theme}
          ratioClass={ratioClass}
          padClass={getCategoryRhythm(category).generousPadClass}
          textSectionStyle={textSectionStyle(theme, pattern, category)}
          accentHairline={<SectionAccentHairline theme={theme} />}
          titleClassName={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
        />
      );
    }

    case "stat_infographic": {
      if (!Array.isArray(section.metrics) || section.metrics.length === 0) {
        console.warn("[DetailSectionRenderer] stat_infographic metrics empty — section skipped", {
          index,
          heading: section.heading,
        });
        return null;
      }
      const indexedMetrics = section.metrics.map((metric, metricIndex) => ({ metric, metricIndex }));
      const numberMetrics = indexedMetrics.filter(({ metric }) => metric.style === "number");
      const ringMetrics = indexedMetrics.filter(({ metric }) => metric.style === "ring");
      const barMetrics = indexedMetrics.filter(
        ({ metric }) => metric.style !== "number" && metric.style !== "ring",
      );
      const hasSelfAssessed = section.metrics.some((m) => m.basis === "self_assessed");
      // 151차 — 실제 쇼핑몰(다이슨 등) 조사에서 확인된 "수치 주장에 각주로 근거를
      // 병기" 패턴. sourceNote가 있는 measured metric에만 순서대로 각주 번호를 매기고
      // 섹션 하단에 목록으로 모은다. sourceNote 자체는 AI가 입력 근거 있을 때만 채움
      // (route.ts 프롬프트 규율) — 렌더러는 표시만 담당.
      const footnotes: { number: number; text: string }[] = [];
      const footnoteNumberByMetricIndex = new Map<number, number>();
      // 158차 — 동일 출처(sourceNote 텍스트가 완전히 같음, 예: 같은 임상시험의 지표
      // 4개)는 실사 디자이너 사례(반려견 유산균 임상 결과 인포그래픽)처럼 각주 번호를
      // 하나만 부여하고 공유한다. 이전엔 metric마다 무조건 새 번호를 매겨 동일 출처
      // 설명이 하단에 중복 나열됐음.
      const footnoteNumberByText = new Map<string, number>();
      section.metrics.forEach((metric, metricIndex) => {
        const note = metric.sourceNote?.trim();
        if (metric.basis === "measured" && note) {
          let number = footnoteNumberByText.get(note);
          if (number == null) {
            number = footnotes.length + 1;
            footnotes.push({ number, text: note });
            footnoteNumberByText.set(note, number);
          }
          footnoteNumberByMetricIndex.set(metricIndex, number);
        }
      });
      const renderFootnoteMark = (metricIndex: number) => {
        const number = footnoteNumberByMetricIndex.get(metricIndex);
        if (!number) return null;
        return (
          <sup className="ml-0.5 text-[0.6em] font-semibold" style={{ color: theme.accent }}>
            {number}
          </sup>
        );
      };
      const numberGridCols =
        numberMetrics.length <= 1
          ? "max-w-xs grid-cols-1"
          : numberMetrics.length === 2
            ? "max-w-md grid-cols-2"
            : "max-w-2xl grid-cols-2 sm:grid-cols-3";
      const ringGridCols =
        ringMetrics.length <= 1
          ? "max-w-xs grid-cols-1"
          : ringMetrics.length === 2
            ? "max-w-md grid-cols-2"
            : "max-w-2xl grid-cols-2 sm:grid-cols-3";

      return (
        <section
          key={`stat_infographic-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          {numberMetrics.length > 0 && (
            <div className={`mx-auto mt-10 grid gap-x-5 gap-y-6 ${numberGridCols}`}>
              {numberMetrics.map(({ metric, metricIndex }) => (
                <LayeredPanel
                  key={`${metric.label}-${metricIndex}`}
                  theme={theme}
                  rotate={metricIndex % 2 === 0 ? -2 : 2}
                  className="flex flex-col items-center gap-2 px-4 py-8 text-center"
                >
                  <ConceptBadgeIcon
                    src={conceptIcons?.statInfographic?.[metricIndex]}
                    theme={theme}
                    fallbackIndex={metricIndex}
                    size={INFO_BADGE.compactSize}
                  />
                  {/* 154차 — 실사 디자이너 벤치마크(다이슨/애플류) 대비 수치 카드의 숫자가
                      본문 제목(text-4xl)보다도 작아 "히어로 넘버"로서 시각적 임팩트가
                      부족하다는 점을 발견. 라벨 대비 숫자의 스케일 대비를 크게 벌려
                      숫자 자체가 그래픽 역할을 하도록(에디토리얼 스탯 카드 관례) 키움. */}
                  <div style={{ color: theme.deepAccent }}>
                    <EditableText
                      as="span"
                      enabled={edit?.enabled}
                      value={metric.value}
                      onChange={(value) => {
                        const metrics = section.metrics.map((item, i) =>
                          i === metricIndex ? { ...item, value } : item,
                        );
                        edit?.onChange(index, { ...section, metrics });
                      }}
                      className="font-heading text-5xl font-black leading-none tracking-tighter tabular-nums sm:text-6xl"
                    />
                    {renderFootnoteMark(metricIndex)}
                  </div>
                  <EditableText
                    as="span"
                    enabled={edit?.enabled}
                    value={metric.label}
                    onChange={(label) => {
                      const metrics = section.metrics.map((item, i) =>
                        i === metricIndex ? { ...item, label } : item,
                      );
                      edit?.onChange(index, { ...section, metrics });
                    }}
                    className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55 sm:text-xs"
                  />
                </LayeredPanel>
              ))}
            </div>
          )}
          {ringMetrics.length > 0 && (
            <div className={`mx-auto mt-10 grid gap-x-5 gap-y-8 ${ringGridCols}`}>
              {ringMetrics.map(({ metric, metricIndex }) => {
                const percent = Math.min(100, Math.max(0, metric.percent ?? 0));
                return (
                  <div
                    key={`${metric.label}-${metricIndex}`}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    {/* 154차 — 96px 고정 링 안에 text-xl 숫자는 "히어로 넘버"로 읽히기엔
                        작았음. 링을 살짝 키우고(96→112) 숫자도 함께 키워 게이지 자체가
                        숫자를 위한 무대가 되도록 조정. */}
                    <div className="relative flex items-center justify-center">
                      <RadialGauge percent={percent} theme={theme} size={112} strokeWidth={10} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          className="font-heading text-2xl font-black leading-none tracking-tighter tabular-nums sm:text-3xl"
                          style={{ color: theme.deepAccent }}
                        >
                          {metric.value}
                        </span>
                        {renderFootnoteMark(metricIndex)}
                      </div>
                    </div>
                    <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55 sm:text-xs">
                      {metric.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {barMetrics.length > 0 && (
            <div className="mx-auto mt-10 max-w-xl space-y-7">
              {barMetrics.map(({ metric, metricIndex }) => {
                const percent = Math.min(100, Math.max(0, metric.percent ?? 0));
                return (
                  <div key={`${metric.label}-${metricIndex}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <ConceptBadgeIcon
                          src={conceptIcons?.statInfographic?.[metricIndex]}
                          theme={theme}
                          fallbackIndex={metricIndex}
                          size={INFO_BADGE.compactSize}
                        />
                        <EditableText
                          as="span"
                          enabled={edit?.enabled}
                          value={metric.label}
                          onChange={(label) => {
                            const metrics = section.metrics.map((item, i) =>
                              i === metricIndex ? { ...item, label } : item,
                            );
                            edit?.onChange(index, { ...section, metrics });
                          }}
                          className="text-sm font-medium text-ink/65 sm:text-base"
                        />
                      </div>
                      <EditableText
                        as="span"
                        enabled={edit?.enabled}
                        value={metric.value}
                        onChange={(value) => {
                          const metrics = section.metrics.map((item, i) =>
                            i === metricIndex ? { ...item, value } : item,
                          );
                          edit?.onChange(index, { ...section, metrics });
                        }}
                        className="font-heading text-3xl font-black leading-none tracking-tighter tabular-nums text-ink sm:text-4xl"
                      />
                      {renderFootnoteMark(metricIndex)}
                    </div>
                    <MetricBar percent={percent} theme={theme} large emphasis={section.barAccent === "emphasis"} />
                  </div>
                );
              })}
            </div>
          )}
          {hasSelfAssessed && (
            <p className="mx-auto mt-6 max-w-xl text-center text-xs text-ink/40">
              자체 평가 기준 (개인차가 있을 수 있어요)
            </p>
          )}
          {footnotes.length > 0 && (
            <div className="mx-auto mt-4 max-w-xl space-y-0.5">
              {footnotes.map((fn) => (
                <p key={fn.number} className="text-center text-[11px] leading-relaxed text-ink/40">
                  {fn.number}. {fn.text}
                </p>
              ))}
            </div>
          )}
        </section>
      );
    }

    case "illustration_banner": {
      const bgSrc = resolveImage(imageUrls, 0) || heroFallback;
      return (
        <section
          key={`illustration_banner-${index}`}
          className="relative aspect-video w-full overflow-hidden"
        >
          {section.illustrationUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={section.illustrationUrl}
              alt={section.heading ?? "컨셉 일러스트"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : bgSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bgSrc}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-16 top-8 h-52 w-52 rounded-full blur-3xl"
                style={{ backgroundColor: hexToRgba(theme.accent, 0.28) }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full blur-3xl"
                style={{ backgroundColor: hexToRgba(theme.deepAccent, 0.22) }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `repeating-linear-gradient(135deg, ${hexToRgba(theme.accent, 0.08)} 0px, ${hexToRgba(theme.accent, 0.08)} 1px, transparent 1px, transparent 14px)`,
                }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(theme.deepAccent, 0.35)} 0%, ${hexToRgba(theme.accent, 0.2)} 55%, ${hexToRgba(theme.baseNeutral, 0.15)} 100%)`,
              }}
              aria-hidden="true"
            />
          )}
          {/* 상·하단을 더 짙게 — 모델이 가끔 넣는 가짜 UI/깨진 글자를 가린다 */}
          <div
            className="absolute inset-0"
            style={{
              background: [
                getHeroGradient(theme),
                `linear-gradient(180deg, ${hexToRgba(theme.deepAccent, 0.55)} 0%, transparent 28%, transparent 55%, ${hexToRgba(theme.deepAccent, 0.75)} 100%)`,
              ].join(", "),
            }}
            aria-hidden="true"
          />
          <div className={BANNER_OVERLAY_CLASS}>
            {(section.heading || edit?.enabled) && (
              <EditableText
                as="h2"
                enabled={edit?.enabled}
                value={section.heading ?? ""}
                onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                className={`${TYPO.bannerTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
              />
            )}
            {(section.body || edit?.enabled) && (
              <EditableText
                as="p"
                multiline
                enabled={edit?.enabled}
                value={section.body ?? ""}
                onChange={(body) => edit?.onChange(index, { ...section, body })}
                className={TYPO.bannerSub}
              />
            )}
          </div>
        </section>
      );
    }

    case "custom_gif":
      return (
        <section
          key={`custom_gif-${index}`}
          className="relative aspect-video w-full overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.gifUrl}
            alt={section.heading ?? "판매자 제공 GIF"}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {(section.heading || edit?.enabled) && (
            <>
              <div
                className="absolute inset-0"
                style={{ background: getHeroGradient(theme) }}
                aria-hidden="true"
              />
              <div className={BANNER_OVERLAY_CLASS}>
                <EditableText
                  as="h2"
                  enabled={edit?.enabled}
                  value={section.heading ?? ""}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={`${TYPO.bannerTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
                />
              </div>
            </>
          )}
        </section>
      );

    case "usage_steps":
      return (
        <section
          key={`usage_steps-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <ol className="relative mx-auto mt-14 max-w-3xl flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-4">
            {/* 연결선: 모바일은 세로(뱃지 중심 x=24px), sm 이상은 가로(뱃지 중심 y=24px) */}
            <div
              aria-hidden="true"
              className="absolute left-6 top-0 bottom-0 w-px sm:left-0 sm:right-0 sm:top-6 sm:bottom-auto sm:h-px sm:w-auto"
              style={{ backgroundColor: hexToRgba(theme.accent, 0.25) }}
            />
            {section.steps.map((step, stepIndex) => (
              <li
                key={stepIndex}
                className="relative flex items-start gap-4 sm:flex-1 sm:flex-col sm:items-center sm:gap-3 sm:text-center"
              >
                <div className="relative z-10 shrink-0">
                  <ConceptBadgeIcon
                    src={conceptIcons?.usageSteps?.[stepIndex]}
                    theme={theme}
                    fallbackIndex={stepIndex}
                    size={INFO_BADGE.defaultSize}
                  />
                </div>
                <div className="min-w-0 flex-1 pt-1 sm:flex-none sm:pt-0">
                  <p
                    className={`mb-1.5 ${TYPO.sectionLabel}`}
                    style={{ color: theme.accent }}
                  >
                    STEP {String(stepIndex + 1).padStart(2, "0")}
                  </p>
                  <EditableText
                    as="span"
                    enabled={edit?.enabled}
                    value={step}
                    onChange={(next) => {
                      const steps = [...section.steps];
                      steps[stepIndex] = next;
                      edit?.onChange(index, { ...section, steps });
                    }}
                    className={TYPO.stepItem}
                  />
                </div>
              </li>
            ))}
          </ol>
          {isCosmeticsCategory(category) ? (
            <UsageOrderFlowDiagram steps={section.steps} theme={theme} />
          ) : null}
        </section>
      );

    case "step_card": {
      const steps = Array.isArray(section.steps) ? section.steps : [];
      if (steps.length === 0) {
        console.warn("[DetailSectionRenderer] step_card steps empty — section skipped", {
          index,
          heading: section.heading,
        });
        return null;
      }
      const ratioClass = resolveImageRatioClass(section);
      return (
        <section
          key={`step_card-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <p className={`mb-4 ${TEXT_COL_CLASS} ${TYPO.sectionLabel}`} style={{ color: theme.deepAccent }}>
            HOW TO USE
          </p>
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, stepIndex) => {
              const src = resolveImage(imageUrls, step.imageIndex);
              return (
                <div key={stepIndex} className="flex flex-col">
                  <div className={`relative overflow-hidden rounded-xl ${ratioClass}`}>
                    <SectionImage
                      src={src}
                      alt={buildSectionImageAlt(productName ?? "", step.title, section.slot)}
                      className="h-full w-full object-cover"
                    />
                    <span
                      className="absolute left-3 top-3 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-paper shadow-sm"
                      style={{ backgroundColor: theme.deepAccent }}
                    >
                      STEP {String(stepIndex + 1).padStart(2, "0")}
                    </span>
                    <ImageReplaceHit
                      enabled={edit?.enabled}
                      onReplace={() => edit?.onReplaceImage?.(step.imageIndex)}
                    />
                  </div>
                  <EditableText
                    as="p"
                    enabled={edit?.enabled}
                    value={step.title}
                    onChange={(title) => {
                      const nextSteps = [...section.steps];
                      nextSteps[stepIndex] = { ...nextSteps[stepIndex], title };
                      edit?.onChange(index, { ...section, steps: nextSteps });
                    }}
                    className="mt-3 font-heading text-base font-bold tracking-[-0.02em] text-ink"
                  />
                  <EditableText
                    as="p"
                    multiline
                    enabled={edit?.enabled}
                    value={step.body}
                    onChange={(body) => {
                      const nextSteps = [...section.steps];
                      nextSteps[stepIndex] = { ...nextSteps[stepIndex], body };
                      edit?.onChange(index, { ...section, steps: nextSteps });
                    }}
                    className="mt-1 text-[11px] leading-relaxed text-ink/80 sm:text-sm"
                  />
                </div>
              );
            })}
          </div>
          {isCosmeticsCategory(category) ? (
            <UsageOrderFlowDiagram
              steps={steps.map((s) => s.title).filter(Boolean)}
              theme={theme}
            />
          ) : null}
        </section>
      );
    }

    case "gallery": {
      if (!Array.isArray(section.imageIndexes) || section.imageIndexes.length === 0) {
        console.warn("[DetailSectionRenderer] gallery imageIndexes empty — section skipped", {
          index,
          heading: section.heading,
        });
        return null;
      }
      const ratioClass = resolveImageRatioClass(section);
      const pairCompare =
        category === "화장품/뷰티" && section.imageIndexes.length >= 2;
      return (
        <section
          key={`gallery-${index}`}
          style={sectionBackgroundStyle(theme, pattern, category)}
        >
          <div className={getCategoryRhythm(category).galleryTitlePadClass}>
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
            />
          </div>
          <div
            className={
              pairCompare
                ? "grid grid-cols-2 gap-px"
                : section.imageIndexes.length <= 2
                  ? `grid grid-cols-1 ${getCategoryRhythm(category).galleryGapClass}`
                  : `grid grid-cols-2 ${getCategoryRhythm(category).galleryGapClass} sm:grid-cols-3`
            }
            style={{ backgroundColor: hexToRgba(theme.accent, 0.18) }}
          >
            {section.imageIndexes.map((imageIndex, pairIndex) => {
              const src = resolveImage(imageUrls, imageIndex);
              const pairLabel =
                pairCompare && pairIndex === 0
                  ? "BEFORE"
                  : pairCompare && pairIndex === 1
                    ? "AFTER"
                    : null;
              return (
                <div key={`${imageIndex}-${src}-${pairIndex}`} className="relative">
                  <SectionImage
                    src={src}
                    alt={buildSectionImageAlt(productName ?? "", `${section.heading} ${imageIndex + 1}`, section.slot)}
                    className={`${ratioClass} w-full object-cover`}
                  />
                  {pairLabel ? (
                    <span
                      className={`absolute left-3 top-3 ${TYPO.sectionLabel} text-white`}
                    >
                      {pairLabel}
                    </span>
                  ) : null}
                  <ImageReplaceHit
                    enabled={edit?.enabled}
                    onReplace={() => edit?.onReplaceImage?.(imageIndex)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "caution":
      return (
        <section
          key={`caution-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <div className={TEXT_COL_CLASS}>
            <TextSectionPanel theme={theme}>
              <p
                className={`mb-4 ${TYPO.sectionLabel}`}
                style={{ color: theme.deepAccent }}
              >
                NOTICE
              </p>
              <EditableText
                as="h3"
                enabled={edit?.enabled}
                value={section.heading}
                onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                className={`${HEADLINE_CLAMP} font-heading text-lg font-bold tracking-[-0.02em] text-ink sm:text-xl`}
              />
              <EditableText
                as="p"
                multiline
                enabled={edit?.enabled}
                value={section.body}
                onChange={(body) => edit?.onChange(index, { ...section, body })}
                className={`mt-5 ${BODY_CLAMP} ${TYPO.body}`}
              />
            </TextSectionPanel>
          </div>
        </section>
      );

    case "review_highlight": {
      const praiseItems = section.praises
        .map((text, i) => ({
          text,
          matchCount: section.praiseMatchCounts?.[i] ?? 0,
          originalIndex: i,
        }))
        .filter((p) => Boolean(p.text));
      if (praiseItems.length === 0) return null;
      const concernItems = (section.concerns ?? [])
        .map((text, i) => ({
          text,
          matchCount: section.complaintMatchCounts?.[i] ?? 0,
          originalIndex: i,
        }))
        .filter((c) => Boolean(c.text));
      const gridCols =
        praiseItems.length === 1
          ? "max-w-md grid-cols-1"
          : praiseItems.length === 2
            ? "max-w-2xl grid-cols-1 sm:grid-cols-2"
            : "max-w-4xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      return (
        <section
          key={`review_highlight-${index}`}
          data-testid="review-highlight"
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          {typeof section.sourceReviewCount === "number" &&
          section.sourceReviewCount > 0 ? (
            <p
              data-testid="review-highlight-count"
              className="mx-auto mt-2 max-w-xl text-center text-[11px] text-ink/40 sm:text-xs"
            >
              실제 리뷰 {section.sourceReviewCount}건 분석
            </p>
          ) : null}
          <p className="mx-auto mt-2 max-w-xl text-center text-xs text-ink/40">
            실제 구매자 리뷰에서 자주 나온 내용을 요약했습니다
          </p>
          <div className={`mx-auto mt-10 grid gap-x-5 gap-y-6 ${gridCols}`}>
            {praiseItems.map((item, praiseIndex) => (
              <LayeredPanel
                key={praiseIndex}
                theme={theme}
                rotate={praiseIndex % 2 === 0 ? -2 : 2}
                className="flex flex-col gap-3 px-6 py-7"
              >
                <span
                  className="font-heading text-3xl leading-none"
                  style={{ color: theme.accent }}
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                <EditableText
                  as="p"
                  multiline
                  enabled={edit?.enabled}
                  value={item.text}
                  onChange={(next) => {
                    const nextPraises = [...section.praises];
                    nextPraises[item.originalIndex] = next;
                    edit?.onChange(index, { ...section, praises: nextPraises });
                  }}
                  className={`${TYPO.body} text-ink/80`}
                />
                {item.matchCount > 0 ? (
                  <p
                    data-testid="review-match-badge"
                    className="text-[11px] text-ink/40 sm:text-xs"
                  >
                    {item.matchCount}건 언급
                  </p>
                ) : null}
              </LayeredPanel>
            ))}
          </div>
          {concernItems.length > 0 ? (
            <div
              data-testid="review-highlight-concerns"
              className="mx-auto mt-12 max-w-xl border-t border-ink/10 pt-8"
            >
              <p className="text-center text-[11px] font-medium tracking-wide text-ink/45 sm:text-xs">
                실제 후기에 나온 아쉬운 점
              </p>
              <ul className="mt-4 space-y-2.5">
                {concernItems.map((item, concernIndex) => (
                  <li key={concernIndex}>
                    <EditableText
                      as="p"
                      multiline
                      enabled={edit?.enabled}
                      value={item.text}
                      onChange={(next) => {
                        const nextConcerns = [...(section.concerns ?? [])];
                        nextConcerns[item.originalIndex] = next;
                        edit?.onChange(index, { ...section, concerns: nextConcerns });
                      }}
                      className="text-center text-[12px] leading-relaxed text-ink/50 sm:text-[13px]"
                    />
                    {item.matchCount > 0 ? (
                      <p
                        data-testid="review-match-badge"
                        className="mt-1 text-center text-[11px] text-ink/40 sm:text-xs"
                      >
                        {item.matchCount}건 언급
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      );
    }

    case "ai_disclosure":
      return (
        <section
          key={`ai_disclosure-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <div className={TEXT_COL_CLASS}>
            <p
              className={`mb-4 ${TYPO.sectionLabel}`}
              style={{ color: theme.deepAccent }}
            >
              AI DISCLOSURE
            </p>
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} font-heading text-lg font-bold tracking-[-0.02em] text-ink sm:text-xl`}
            />
            <EditableText
              as="p"
              multiline
              enabled={edit?.enabled}
              value={section.body}
              onChange={(body) => edit?.onChange(index, { ...section, body })}
              className={`mt-5 ${BODY_CLAMP} ${TYPO.body} text-ink/70`}
            />
          </div>
        </section>
      );

    case "canvas":
      return (
        <CanvasSectionRenderer
          key={`canvas-${index}`}
          section={section}
          imageUrls={imageUrls}
          productName={productName}
          theme={theme}
          productContext={{
            category,
            productName: productName ?? "",
            imageUrls,
          }}
          edit={
            edit?.enabled
              ? {
                  enabled: true,
                  onChange: (next) => edit.onChange(index, next),
                }
              : undefined
          }
        />
      );

    case "brand_story": {
      const hasBrandCard = Boolean(brandName?.trim());
      const categoryKeyword = getCategoryTitleKeyword(category);
      const storyImages = (section.imageIndexes ?? [])
        .map((i) => resolveImage(imageUrls, i))
        .filter(Boolean);
      const storyBodyClass = `mt-5 whitespace-pre-line ${TYPO.body}`;
      const storyText = (
        <>
          <p className={`mb-4 ${TYPO.sectionLabel}`} style={{ color: theme.deepAccent }}>
            STORY
          </p>
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} font-heading text-lg font-bold tracking-[-0.02em] text-ink sm:text-xl`}
          />
          <EditableText
            as="p"
            multiline
            enabled={edit?.enabled}
            value={section.body}
            onChange={(body) => edit?.onChange(index, { ...section, body })}
            className={storyBodyClass}
          />
        </>
      );
      const storyGallery =
        storyImages.length > 0 ? (
          <div
            className={`mt-8 grid gap-3 ${
              storyImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {storyImages.map((src, i) => (
              <div
                key={`brand-story-img-${i}`}
                className="relative overflow-hidden rounded-xl"
              >
                <SectionImage
                  src={src}
                  alt={buildSectionImageAlt(
                    productName ?? "",
                    section.heading,
                    section.slot,
                  )}
                  className="aspect-[4/5] w-full object-cover"
                  imageIndex={section.imageIndexes?.[i]}
                />
              </div>
            ))}
          </div>
        ) : null;

      if (hasBrandCard) {
        return (
          <section key={`brand_story-${index}`} className="relative overflow-hidden">
            <div
              className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-10 sm:py-20"
              style={{ backgroundColor: theme.deepAccent }}
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-paper/75">
                {brandName}
              </p>
              <p className={`mt-4 ${TYPO.keywordDisplay} text-paper`}>{categoryKeyword}</p>
            </div>
            <div
              className={getCategoryRhythm(category).trustPadClass}
              style={textSectionStyle(theme, pattern, category)}
            >
              <div className={TEXT_COL_CLASS}>
                <TextSectionPanel theme={theme} overlap>
                  {storyText}
                  {storyGallery}
                </TextSectionPanel>
              </div>
            </div>
          </section>
        );
      }
      return (
        <section
          key={`brand_story-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <div className={TEXT_COL_CLASS}>
            <TextSectionPanel theme={theme}>
              {storyText}
              {storyGallery}
            </TextSectionPanel>
          </div>
        </section>
      );
    }

    case "faq":
      if (!Array.isArray(section.items) || section.items.length === 0) {
        console.warn("[DetailSectionRenderer] faq items empty — section skipped", {
          index,
          heading: section.heading,
        });
        return null;
      }
      return (
        <section
          key={`faq-${index}`}
          className={getCategoryRhythm(category).trustPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <div className="mx-auto mt-10 max-w-xl space-y-4 text-left">
            {section.items.map((item, itemIndex) => (
              <div
                key={`${itemIndex}-${item.question.slice(0, 12)}`}
                className="rounded-xl border px-5 py-4"
                style={{
                  borderColor: hexToRgba(theme.accent, 0.22),
                  backgroundColor: hexToRgba(theme.baseNeutral, 0.45),
                }}
              >
                <p className={`${TYPO.sectionLabel} mb-2`} style={{ color: theme.accent }}>
                  Q.
                </p>
                <EditableText
                  as="p"
                  enabled={edit?.enabled}
                  value={item.question}
                  onChange={(question) => {
                    const items = section.items.map((entry, i) =>
                      i === itemIndex ? { ...entry, question } : entry,
                    );
                    edit?.onChange(index, { ...section, items });
                  }}
                  className="font-heading text-base font-bold leading-snug tracking-[-0.02em] text-ink"
                />
                <p
                  className={`${TYPO.sectionLabel} mb-2 mt-4`}
                  style={{ color: theme.deepAccent }}
                >
                  A.
                </p>
                <EditableText
                  as="p"
                  multiline
                  enabled={edit?.enabled}
                  value={item.answer}
                  onChange={(answer) => {
                    const items = section.items.map((entry, i) =>
                      i === itemIndex ? { ...entry, answer } : entry,
                    );
                    edit?.onChange(index, { ...section, items });
                  }}
                  className={TYPO.body}
                />
              </div>
            ))}
          </div>
        </section>
      );

    case "target_persona":
      return (
        <section
          key={`target_persona-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern, category)}
        >
          <div className={TEXT_COL_CLASS}>
            <SectionAccentHairline theme={theme} />
            <EditableText
              as="h3"
              enabled={edit?.enabled}
              value={section.heading}
              onChange={(heading) => edit?.onChange(index, { ...section, heading })}
              className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
            />
          </div>
          <ul className="mx-auto mt-8 flex max-w-xl flex-col items-stretch gap-2.5">
            {section.personas.map((persona, personaIndex) => (
              <li
                key={`${personaIndex}-${persona.slice(0, 12)}`}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: hexToRgba(theme.baseNeutral, 0.85),
                  color: theme.deepAccent,
                  boxShadow: `inset 0 0 0 1px ${hexToRgba(theme.accent, 0.2)}`,
                }}
              >
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: theme.accent }}
                  aria-hidden="true"
                />
                <EditableText
                  as="span"
                  enabled={edit?.enabled}
                  value={persona}
                  onChange={(next) => {
                    const personas = [...section.personas];
                    personas[personaIndex] = next;
                    edit?.onChange(index, { ...section, personas });
                  }}
                  className="min-w-0 flex-1 text-left"
                />
              </li>
            ))}
          </ul>
        </section>
      );

    case "cta_price":
      return (
        <section
          key={`cta_price-${index}`}
          className={`pagzly-ink-cta pagzly-ink-shimmer sticky bottom-0 z-20 shadow-[0_-8px_24px_-8px_rgba(27,27,24,0.2)] ${CTA_TRANSITION_OVERLAP_CLASS} ${getCategoryRhythm(category).ctaPadClass}`}
          style={{
            backgroundColor: getCtaBandBackground(theme),
            clipPath: getCategoryRhythm(category).ctaTransitionClip,
          }}
        >
          <div className={`${TEXT_COL_CLASS} relative z-10 space-y-5`}>
            <p className={TYPO.sectionLabel} style={{ color: theme.deepAccent }}>
              PRICE
            </p>
            <p
              className="pagzly-ink-headline font-heading text-[2.75rem] font-bold sm:text-5xl"
              style={{ color: theme.accent, letterSpacing: "-0.04em" }}
            >
              ₩{section.price.toLocaleString()}
            </p>
            {section.targetCustomer && (
              <span
                className="inline-block rounded-full px-4 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.14),
                  color: theme.deepAccent,
                }}
              >
                {section.targetCustomer}
              </span>
            )}
            {section.badges && section.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {section.badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wide"
                    style={{
                      backgroundColor: theme.deepAccent,
                      color: BRAND.paper,
                      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)",
                      paddingRight: "1.25rem",
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
            <div className="pt-4">
              <span
                className={`${getCategoryRhythm(category).ctaButtonClass} relative z-10 shadow-[0_12px_28px_-10px_rgba(27,27,24,0.55)]`}
                style={{ backgroundColor: "#1B1B18", color: "#FAF8F3" }}
                role="presentation"
              >
                지금 구매하기
              </span>
              <p className="mt-3 text-xs leading-relaxed text-ink/50">
                배송·교환·환불은 판매자 정책을 확인해 주세요.
              </p>
            </div>
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
  imageOrigins,
  sellerAiBadges = false,
  category,
  productName,
  theme: themeOverride,
  conceptIcons,
  edit,
  previewCollapse,
  brandName,
  logoUrl,
  ingredients,
  keyFeatures,
  certifications,
}: DetailSectionRendererProps) {
  const baseTheme = themeOverride ?? getCategoryTheme(category);
  const extendedTheme = extendTheme(baseTheme);
  const trustChips = extractTrustChips(sections);
  const certTokens = parseCertificationTokens(certifications);
  const quickFacts = extractQuickFacts(sections);
  const sectionAnchors = buildSectionAnchors(sections);
  const anchorIdMap = buildSectionAnchorIdMap(sections);
  let imageTextCount = 0;
  let lastRenderedSection: DetailSection | undefined;
  let lastRenderedWasHero = false;
  const totalCompactImageTextCount = countCompactImageTextSections(sections);
  const circleChartCombos = findCircleComparisonComboIndices(sections);
  const comboLeadToPair = new Map<
    number,
    { circleIdx: number; chartIdx: number }
  >();
  const comboTrailIndices = new Set<number>();
  for (const [circleIdx, chartIdx] of circleChartCombos) {
    const lead = Math.min(circleIdx, chartIdx);
    const trail = Math.max(circleIdx, chartIdx);
    comboLeadToPair.set(lead, { circleIdx, chartIdx });
    comboTrailIndices.add(trail);
  }

  return (
    <SellerImageMetaContext.Provider
      value={{
        urls: imageUrls,
        origins: imageOrigins ?? [],
        showBadges: sellerAiBadges === true,
      }}
    >
    <div className="overflow-hidden scroll-smooth">
      {sectionAnchors.length > 0 ? (
        <SectionAnchorNav anchors={sectionAnchors} theme={baseTheme} />
      ) : null}
      {sections.map((section, index) => {
        if (
          previewCollapse &&
          !previewCollapse.expanded &&
          index > previewCollapse.collapsedAfterIndex
        ) {
          return null;
        }

        const isFullPoint =
          section.type === "image_text" &&
          section.layout !== "compact" &&
          section.layout !== "callout" &&
          section.slot !== "quick_points" &&
          section.slot !== "feature_callout";
        const pointIndex = isFullPoint ? imageTextCount++ : undefined;
        const compactImageTextIndex =
          section.type === "image_text" && section.layout === "compact"
            ? sections
                .slice(0, index)
                .filter((s) => s.type === "image_text" && s.layout === "compact").length
            : undefined;
        const bodyIndex = sections.slice(0, index).filter((s) => s.type !== "hero").length;
        const pattern = section.type === "hero" ? "A" : getSectionPattern(bodyIndex, section.type);
        const prevBodyIndex = sections.slice(0, index).filter((s) => s.type !== "hero").length - 1;
        const followPattern =
          section.type === "checklist" &&
          section.compactFollow === true &&
          index > 0 &&
          sections[index - 1].type !== "hero"
            ? getSectionPattern(Math.max(0, prevBodyIndex), sections[index - 1]!.type)
            : undefined;
        const sectionTheme = getSectionTheme(extendedTheme, section.type, bodyIndex);

        let content: ReactNode;
        const comboPair = comboLeadToPair.get(index);
        if (comboPair) {
          const circleSection = sections[comboPair.circleIdx] as ImageTextSection;
          const chartSection = sections[comboPair.chartIdx] as ComparisonChartSection;
          const chartBodyIndex = sections
            .slice(0, comboPair.chartIdx)
            .filter((s) => s.type !== "hero").length;
          const chartPattern = getSectionPattern(chartBodyIndex, "comparison_chart");
          const chartTheme = getSectionTheme(
            extendedTheme,
            "comparison_chart",
            chartBodyIndex,
          );
          content = renderCircleComparisonCombo({
            circleSection,
            chartSection,
            index,
            category,
            theme: chartTheme,
            pattern: chartPattern,
            productName: productName ?? category,
          });
        } else if (comboTrailIndices.has(index)) {
          content = null;
        } else {
          content = renderSection(
            section,
            imageUrls,
            index,
            category,
            sectionTheme,
            pattern,
            conceptIcons,
            pointIndex,
            edit,
            followPattern,
            productName ?? category,
            bodyIndex,
            brandName,
            certTokens,
            quickFacts,
            compactImageTextIndex,
            totalCompactImageTextCount,
            logoUrl,
            ingredients,
            keyFeatures,
          );
        }
        if (!content) {
          return null;
        }
        const isHeroFollow = lastRenderedWasHero;
        const breather =
          shouldInsertBreather(lastRenderedSection, section) && section.type !== "hero" ? (
            <SectionBreather key={`breather-${index}`} theme={sectionTheme} />
          ) : null;
        lastRenderedSection = section;
        lastRenderedWasHero = section.type === "hero";
        // hero 바로 다음 섹션 1곳에만: 미세한 대각선 클립(제안 A) + 강한 진입 모션(제안 C).
        // 나머지 섹션은 전부 기존 직사각형·절제된 페이드를 그대로 유지한다.
        const wrappedContent =
          isHeroFollow && content ? (
            <div
              className={`relative z-10 ${HERO_TRANSITION_OVERLAP_CLASS}`}
              style={{ clipPath: getCategoryRhythm(category).heroTransitionClip }}
            >
              {trustChips.length > 0 ? (
                <TrustStrip
                  chips={trustChips}
                  theme={getSectionTheme(extendedTheme, "checklist", 0)}
                  certTokens={certTokens}
                />
              ) : null}
              {/* 165차 — "Bento 그리드 2.0" 스펙 하이라이트. 히어로 바로 아래 위치에
                  카드형으로 핵심 스펙을 강조(기존 QuickFactStrip 평문 나열을 대체). */}
              {quickFacts.length > 0 ? (
                <SpecBentoGrid facts={quickFacts} theme={getSectionTheme(extendedTheme, "checklist", 0)} />
              ) : null}
              {content}
            </div>
          ) : (
            content
          );
        const variant =
          isHeroFollow
            ? "hero-follow"
            : section.type === "hero"
              ? "hero"
              : index % 2 === 0
                ? "section"
                : "section-alt";
        const anchorId = anchorIdMap.get(index);
        return (
          <Fragment key={`section-wrap-${index}`}>
            {breather}
            <DetailScrollReveal
              index={index}
              variant={variant}
            >
            <div
              id={anchorId}
              data-section-index={index}
              data-section-slot={section.slot}
              className={anchorId ? "relative scroll-mt-14" : "relative scroll-mt-14"}
            >
              {wrappedContent}
              {edit?.enabled && edit.onRequestAiPatch ? (
                <button
                  type="button"
                  data-testid={`section-ai-patch-${index}`}
                  onClick={() => edit.onRequestAiPatch?.(index)}
                  className="absolute right-3 top-3 z-40 rounded-full border border-line bg-paper/95 px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  AI로 고치기
                </button>
              ) : null}
            </div>
          </DetailScrollReveal>
            {previewCollapse &&
            !previewCollapse.expanded &&
            previewCollapse.hasMore &&
            index === previewCollapse.collapsedAfterIndex ? (
              <PreviewCollapseBar onExpand={previewCollapse.onExpand} />
            ) : null}
          </Fragment>
        );
      })}
    </div>
    </SellerImageMetaContext.Provider>
  );
}
