import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

export const PET_CATEGORY = "반려동물";

export const PET_AI_PROMPT = `반려동물 용품/사료 광고 문구 작성 시 표시광고법과 사료관리법
기준을 준수해야 합니다. 질병 예방·치료 효과를 확정적으로 주장하거나 수의학적 근거 없이
의약품 수준의 효능을 암시하는 표현은 절대 사용하지 마세요.
대신 '건강한 습관 형성에 도움', '영양 균형 설계' 등 사실 기반 표현을 사용하세요.

금지 표현 예시: 질병 예방, 질병 치료, 치료 효과, 완치, 수의사 추천, 수의사 승인,
부작용 없음, 100% 안전, 평생 건강 보장, 모든 질환에 효과, 약효, 의약품 수준`;

type ReplacementRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

/** 순서 중요: 긴·구체적 표현을 짧은 부분문자열보다 먼저 */
const REPLACEMENT_RULES: ReplacementRule[] = [
  { pattern: /모든\s*질환에\s*효과/g, replacement: "다양한 상황에 도움", label: "모든 질환에 효과" },
  { pattern: /평생\s*건강\s*보장/g, replacement: "건강 관리 지원", label: "평생 건강 보장" },
  { pattern: /의약품\s*수준/g, replacement: "전문적인 관리 수준", label: "의약품 수준" },
  { pattern: /수의사\s*추천|수의사\s*승인/g, replacement: "반려인들의 선택", label: "수의사 추천/승인" },
  { pattern: /부작용\s*없음/g, replacement: "안전 기준 준수", label: "부작용 없음" },
  { pattern: /100%\s*안전/g, replacement: "높은 안전성", label: "100% 안전" },
  { pattern: /질병\s*예방/g, replacement: "건강 관리에 도움", label: "질병 예방" },
  { pattern: /질병\s*치료|치료\s*효과/g, replacement: "컨디션 관리 지원", label: "질병 치료/치료 효과" },
  { pattern: /완치/g, replacement: "컨디션 개선", label: "완치" },
  { pattern: /약효/g, replacement: "기능성", label: "약효" },
];

export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export function isPetCategory(category: string) {
  return category === PET_CATEGORY;
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

export function reviewPetCopy(copy: GeneratedCopy): {
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
