import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

export const FOOD_CATEGORY = "식품/건강기능식품";

export const FOOD_AI_PROMPT = `식품 표시·광고 문구 작성 시 식품 등의 표시·광고에 관한 법률(식품표시광고법) 기준을
준수해야 합니다. 질병 예방·치료 효능을 암시하거나 의약품으로 오인할 수 있는 표현,
객관적 근거 없는 최상급/과장 표현은 절대 사용하지 마세요.
대신 '~에 도움을 줄 수 있음', '풍부하게 함유' 등 사실 기반 표현을 사용하세요.

금지 표현 예시: 치료, 완치, 예방, 효능, 의약품, 다이어트 효과, 100% 효과,
당뇨 개선, 암 예방, 즉각적인 효과, 부작용 없음, 최고의 효능, 만병통치`;

type ReplacementRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

const REPLACEMENT_RULES: ReplacementRule[] = [
  { pattern: /당뇨 개선/g, replacement: "건강한 혈당 관리 습관에 도움", label: "당뇨 개선" },
  { pattern: /암 예방/g, replacement: "건강한 생활습관에 도움", label: "암 예방" },
  { pattern: /다이어트 효과/g, replacement: "체중 관리에 도움", label: "다이어트 효과" },
  { pattern: /즉각적인 효과/g, replacement: "꾸준한 섭취에 도움", label: "즉각적인 효과" },
  { pattern: /부작용 없음/g, replacement: "안심하고 섭취", label: "부작용 없음" },
  { pattern: /최고의 효능/g, replacement: "우수한 품질", label: "최고의 효능" },
  { pattern: /만병통치/g, replacement: "건강한 습관", label: "만병통치" },
  { pattern: /100% 효과/g, replacement: "품질 관리된 제품", label: "100% 효과" },
  { pattern: /의약품(?!\s*수준)/g, replacement: "건강식품", label: "의약품" },
  { pattern: /완치/g, replacement: "개선 습관", label: "완치" },
  { pattern: /예방(?!접종)/g, replacement: "관리에 도움", label: "예방" },
  { pattern: /효능/g, replacement: "도움", label: "효능" },
  { pattern: /치료/g, replacement: "케어", label: "치료" },
];

export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export function isFoodCategory(category: string) {
  return category === FOOD_CATEGORY;
}

export function sanitizeText(text: string): {
  text: string;
  replacements: ComplianceReplacement[];
} {
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

export function reviewFoodCopy(copy: GeneratedCopy): {
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
