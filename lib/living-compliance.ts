import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

export const LIVING_CATEGORY = "생활용품";

export const LIVING_AI_PROMPT = `생활용품 광고 문구 작성 시 표시광고법 기준을 준수해야 합니다.
완전 무독성·완벽 항균·평생 보장 등 검증 불가능한 절대적 표현은 절대 사용하지 마세요.
대신 '안전 기준을 준수한 소재', '항균 처리', '품질 보증 지원' 등 사실 기반 표현을 사용하세요.

금지 표현 예시: 완전 무독성, 환경호르몬 전혀 없음, 100% 항균, 완벽 항균, 평생 보장,
반영구`;

type ReplacementRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

/** 순서 중요: "반영구"가 더 짧은 유사 표현보다 먼저, 긴 구문을 우선 */
const REPLACEMENT_RULES: ReplacementRule[] = [
  {
    pattern: /환경호르몬\s*전혀\s*없음/g,
    replacement: "환경호르몬 안전 기준 준수",
    label: "환경호르몬 전혀 없음",
  },
  {
    pattern: /완전\s*무독성/g,
    replacement: "안전 기준을 준수한 소재",
    label: "완전 무독성",
  },
  { pattern: /100%\s*항균|완벽\s*항균/g, replacement: "항균 처리", label: "100%/완벽 항균" },
  { pattern: /평생\s*보장/g, replacement: "품질 보증 지원", label: "평생 보장" },
  { pattern: /반영구적?/g, replacement: "장기간", label: "반영구" },
];

export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export function isLivingCategory(category: string) {
  return category === LIVING_CATEGORY;
}

export function sanitizeText(text: string): {
  text: string;
  replacements: ComplianceReplacement[];
} {
  if (typeof text !== "string") {
    return { text: text == null ? "" : String(text), replacements: [] };
  }
  let result = text;
  const replacementCounts = new Map<string, ComplianceReplacement>();

  for (const rule of REPLACEMENT_RULES) {
    const matches = result.match(rule.pattern);
    if (!matches?.length) continue;

    result = result.replace(rule.pattern, rule.replacement);

    const existing = replacementCounts.get(rule.label);
    if (existing) {
      existing.count += matches.length;
    } else {
      replacementCounts.set(rule.label, {
        original: rule.label,
        replacement: rule.replacement,
        count: matches.length,
      });
    }
  }

  return {
    text: result,
    replacements: Array.from(replacementCounts.values()),
  };
}

function sanitizeSection(
  section: DetailSection,
  collect: (replacements: ComplianceReplacement[]) => void,
): DetailSection {
  const clean = (value: string) => {
    const { text, replacements } = sanitizeText(value);
    collect(replacements);
    return text;
  };

  switch (section.type) {
    case "hero":
      return {
        ...section,
        headline: clean(section.headline),
        subheadline: section.subheadline ? clean(section.subheadline) : section.subheadline,
      };
    case "checklist":
      return {
        ...section,
        heading: clean(section.heading),
        items: section.items.map(clean),
      };
    case "image_text":
      return {
        ...section,
        heading: clean(section.heading),
        body: clean(section.body),
        callout: section.callout ? clean(section.callout) : section.callout,
      };
    case "step_card":
      return {
        ...section,
        heading: clean(section.heading),
        steps: section.steps.map((step) => ({
          ...step,
          title: clean(step.title),
          body: clean(step.body),
        })),
      };
    case "highlight_box":
      return {
        ...section,
        heading: clean(section.heading),
        cards: (section.cards ?? []).map((card) => ({
          ...card,
          title: clean(card.title),
          body: clean(card.body),
        })),
      };
    case "stat_infographic":
      return {
        ...section,
        heading: clean(section.heading),
        metrics: section.metrics.map((metric) => ({
          ...metric,
          label: clean(metric.label),
          value: clean(metric.value),
        })),
      };
    case "spec_table":
      return {
        ...section,
        heading: clean(section.heading),
        rows: section.rows.map((row) => ({
          label: clean(row.label),
          value: clean(row.value),
        })),
      };
    case "usage_steps":
      return {
        ...section,
        heading: clean(section.heading),
        steps: section.steps.map(clean),
      };
    case "gallery":
      return { ...section, heading: clean(section.heading) };
    case "caution":
      return {
        ...section,
        heading: clean(section.heading),
        body: clean(section.body),
      };
    case "cta_price":
      return {
        ...section,
        badges: section.badges?.map(clean),
      };
    case "comparison_table":
      return {
        ...section,
        heading: clean(section.heading),
        rows: section.rows.map((row) => ({
          label: clean(row.label),
          values: [clean(row.values[0]), clean(row.values[1])] as [string, string],
        })),
      };
    case "color_variation":
      return {
        ...section,
        heading: clean(section.heading),
        options: section.options.map((option) => ({ ...option, label: clean(option.label) })),
      };
    case "faq":
      return {
        ...section,
        heading: clean(section.heading),
        items: section.items.map((item) => ({
          question: clean(item.question),
          answer: clean(item.answer),
        })),
      };
    case "target_persona":
      return {
        ...section,
        heading: clean(section.heading),
        personas: section.personas.map(clean),
      };
    case "brand_story":
      return {
        ...section,
        heading: clean(section.heading),
        body: clean(section.body),
      };
    default:
      return section;
  }
}

export function reviewLivingCopy(copy: GeneratedCopy): {
  copy: GeneratedCopy;
  mfdsReviewed: boolean;
  replacements: ComplianceReplacement[];
} {
  const allReplacements: ComplianceReplacement[] = [];
  const collect = (replacements: ComplianceReplacement[]) => {
    allReplacements.push(...replacements);
  };

  const headlines = copy.headlines.map((headline) => {
    const { text, replacements } = sanitizeText(headline);
    collect(replacements);
    return text;
  });

  const { text: description, replacements: descReplacements } = sanitizeText(
    copy.description,
  );
  collect(descReplacements);

  const features = copy.features.map((feature) => {
    const { text, replacements } = sanitizeText(feature);
    collect(replacements);
    return text;
  });

  const { text: howToUse, replacements: howReplacements } = sanitizeText(
    copy.howToUse,
  );
  collect(howReplacements);

  const { text: caution, replacements: cautionReplacements } = sanitizeText(
    copy.caution,
  );
  collect(cautionReplacements);

  const sections = copy.sections.map((section) => sanitizeSection(section, collect));

  const mergedReplacements = mergeReplacements(allReplacements);

  return {
    copy: {
      sections,
      headlines,
      description,
      features,
      howToUse,
      caution,
    },
    mfdsReviewed: true,
    replacements: mergedReplacements,
  };
}

function mergeReplacements(
  replacements: ComplianceReplacement[],
): ComplianceReplacement[] {
  const map = new Map<string, ComplianceReplacement>();

  for (const item of replacements) {
    const key = `${item.original}→${item.replacement}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += item.count;
    } else {
      map.set(key, { ...item });
    }
  }

  return Array.from(map.values());
}
