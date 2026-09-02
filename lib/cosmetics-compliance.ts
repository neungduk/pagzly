import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

export const COSMETICS_CATEGORY = "화장품/뷰티";

export const COSMETICS_AI_PROMPT = `화장품 광고 문구 작성 시 식약처 화장품법 광고 기준을 준수해야 합니다.
효능·효과를 의학적으로 확정하는 표현, 치료·완치 관련 표현은 절대 사용하지 마세요.
대신 '케어', '개선에 도움', '진정' 등의 표현을 사용하세요.

금지 표현 예시: 치료, 완치, 제거, 회복, 재생, 의학적으로 증명, 임상 실험,
주름 제거, 미백 효과, 피부과 처방, 의사 추천, 아토피 치료, 여드름 치료`;

type ReplacementRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

const REPLACEMENT_RULES: ReplacementRule[] = [
  { pattern: /아토피 치료/g, replacement: "아토피 케어", label: "아토피 치료" },
  { pattern: /여드름 치료/g, replacement: "여드름 케어", label: "여드름 치료" },
  { pattern: /주름 제거/g, replacement: "주름 개선에 도움", label: "주름 제거" },
  { pattern: /미백 효과/g, replacement: "피부 톤 개선에 도움", label: "미백 효과" },
  {
    pattern: /의학적으로 증명/g,
    replacement: "성분 기반 케어",
    label: "의학적으로 증명",
  },
  { pattern: /피부과 처방/g, replacement: "전문 케어", label: "피부과 처방" },
  { pattern: /의사 추천/g, replacement: "전문가 추천", label: "의사 추천" },
  { pattern: /임상 실험/g, replacement: "성분 연구", label: "임상 실험" },
  { pattern: /완치/g, replacement: "진정", label: "완치" },
  { pattern: /재생/g, replacement: "회복에 도움", label: "재생" },
  { pattern: /제거/g, replacement: "개선에 도움", label: "제거" },
  { pattern: /치료/g, replacement: "케어", label: "치료" },
  { pattern: /회복(?!에 도움)/g, replacement: "회복에 도움", label: "회복" },
];

export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export function isCosmeticsCategory(category: string) {
  return category === COSMETICS_CATEGORY;
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
        cards: section.cards.map((card) => ({
          ...card,
          title: clean(card.title),
          body: clean(card.body),
        })),
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

export function reviewCosmeticsCopy(copy: GeneratedCopy): {
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
