import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

export const FASHION_CATEGORY = "의류/패션";

export const FASHION_AI_PROMPT = `의류/패션 광고 문구 작성 시 표시광고법 기준을 준수해야 합니다.
영구·완전·절대·완벽 등 검증 불가능한 절대적 표현이나 근거 없는 평생 보증 약속은
절대 사용하지 마세요.
대신 '우수한 형태 유지력', '색상 지속력', '수축 방지 가공' 등 사실 기반 표현을 사용하세요.

금지 표현 예시: 영구 변형 없음, 완전 탈색 방지, 평생 보증, 평생 무료 수선,
절대 줄어들지 않음, 완벽한 핏`;

type ReplacementRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

/** 순서 중요: "평생 무료 수선"이 "평생 보증"보다 먼저 */
const REPLACEMENT_RULES: ReplacementRule[] = [
  { pattern: /평생\s*무료\s*수선/g, replacement: "애프터서비스 지원", label: "평생 무료 수선" },
  { pattern: /영구\s*변형\s*없음/g, replacement: "우수한 형태 유지력", label: "영구 변형 없음" },
  { pattern: /완전\s*탈색\s*방지/g, replacement: "우수한 색상 지속력", label: "완전 탈색 방지" },
  { pattern: /절대\s*줄어들지\s*않음/g, replacement: "수축 방지 가공", label: "절대 줄어들지 않음" },
  { pattern: /평생\s*보증/g, replacement: "품질 보증 지원", label: "평생 보증" },
  { pattern: /완벽한?\s*핏/g, replacement: "편안한 핏", label: "완벽한 핏" },
];

export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export function isFashionCategory(category: string) {
  return category === FASHION_CATEGORY;
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

export function reviewFashionCopy(copy: GeneratedCopy): {
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
