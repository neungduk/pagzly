import type { DetailSection, GeneratedCopy } from "@/lib/types/generate";

export const ELECTRONICS_CATEGORY = "전자제품";

export const ELECTRONICS_AI_PROMPT = `전자제품 광고 문구 작성 시 전자상거래법·표시광고법 기준을
준수해야 합니다. 방수·내구성·안전성을 검증 없이 확정적으로 과장하는 표현이나 근거 없는
"최초"류 최상급 표현은 절대 사용하지 마세요.
대신 '생활 방수', '우수한 내구성', '안전 기준 준수' 등 사실 기반 표현을 사용하세요.

금지 표현 예시: 완벽 방수, 100% 방수, 고장 없음, 고장 걱정 없음, 평생 보장, 반영구,
전자파 없음, 무전자파, 인체에 무해, 국내 유일, 세계 최초, 업계 최초, 절대 안전`;

type ReplacementRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

/** 순서 중요: "반영구"가 "영구"보다 먼저 — 부분문자열 중첩 깨짐 방지 */
const REPLACEMENT_RULES: ReplacementRule[] = [
  { pattern: /완벽\s*방수/g, replacement: "생활 방수", label: "완벽 방수" },
  { pattern: /100%\s*방수/g, replacement: "생활 방수", label: "100% 방수" },
  { pattern: /고장\s*걱정\s*없음/g, replacement: "안정적인 사용", label: "고장 걱정 없음" },
  { pattern: /고장\s*없음/g, replacement: "우수한 내구성", label: "고장 없음" },
  { pattern: /평생\s*보장/g, replacement: "품질 보증 지원", label: "평생 보장" },
  { pattern: /반영구적?/g, replacement: "장기간", label: "반영구" },
  { pattern: /전자파\s*없음|무\s*전자파/g, replacement: "전자파 안전 기준 준수", label: "전자파 없음" },
  { pattern: /인체에\s*무해/g, replacement: "안전 기준 준수", label: "인체에 무해" },
  { pattern: /국내\s*유일/g, replacement: "차별화된 강점", label: "국내 유일" },
  { pattern: /세계\s*최초/g, replacement: "혁신적인 기술력", label: "세계 최초" },
  { pattern: /업계\s*최초/g, replacement: "새로운 방식", label: "업계 최초" },
  { pattern: /절대\s*안전/g, replacement: "높은 안전성", label: "절대 안전" },
  { pattern: /영구적?/g, replacement: "장기간", label: "영구" },
];

export type ComplianceReplacement = {
  original: string;
  replacement: string;
  count: number;
};

export function isElectronicsCategory(category: string) {
  return category === ELECTRONICS_CATEGORY;
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

export function reviewElectronicsCopy(copy: GeneratedCopy): {
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
