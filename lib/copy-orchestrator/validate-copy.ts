import {
  COPY_SECTION_TYPES,
  PAGE_STRUCTURE_MAX_SECTIONS,
  PAGE_STRUCTURE_MIN_SECTIONS,
  type CopyFaqItem,
  type CopyProductInput,
  type CopySection,
  type CopySectionType,
  type DetailPageCopy,
  type PageStructurePlan,
} from "@/lib/copy-orchestrator/types";

export class CopyValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Copy validation failed: ${issues.join("; ")}`);
    this.name = "CopyValidationError";
    this.issues = issues;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function normalizeSectionType(raw: string): CopySectionType | null {
  const t = raw.trim().toUpperCase();
  if ((COPY_SECTION_TYPES as readonly string[]).includes(t)) return t as CopySectionType;
  const aliases: Record<string, CopySectionType> = {
    PROBLEM_STATEMENT: "PROBLEM",
    SOLUTION_STATEMENT: "SOLUTION",
    SOCIAL: "SOCIAL_PROOF",
    SOCIALPROOF: "SOCIAL_PROOF",
    CALL_TO_ACTION: "CTA",
  };
  return aliases[t] ?? null;
}

/** Escape raw control chars inside JSON strings (common Claude failure mode). */
function escapeControlCharsInStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i]!;
    if (inString) {
      if (escaped) {
        out += c;
        escaped = false;
        continue;
      }
      if (c === "\\") {
        out += c;
        escaped = true;
        continue;
      }
      if (c === '"') {
        out += c;
        inString = false;
        continue;
      }
      if (c === "\n") {
        out += "\\n";
        continue;
      }
      if (c === "\r") {
        out += "\\r";
        continue;
      }
      if (c === "\t") {
        out += "\\t";
        continue;
      }
      out += c;
      continue;
    }
    if (c === '"') inString = true;
    out += c;
  }
  return out;
}

export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fence ? fence[1]!.trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) candidate = candidate.slice(start, end + 1);

  // trailing commas, missing commas between objects/arrays, smart quotes
  let cleaned = candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/}\s*{/g, "},{")
    .replace(/]\s*\[/g, "],[")
    .replace(/"\s*\n\s*"/g, '","');

  cleaned = escapeControlCharsInStrings(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch (first) {
    // second pass: strip JS-style comments if any slipped in
    const noComments = cleaned
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    try {
      return JSON.parse(noComments);
    } catch {
      throw first;
    }
  }
}

export function validatePageStructurePlan(raw: unknown): PageStructurePlan {
  const issues: string[] = [];
  if (!isObject(raw)) throw new CopyValidationError(["root must be object"]);

  const productAnalysis = asString(raw.productAnalysis);
  const targetCustomerAnalysis = asString(raw.targetCustomerAnalysis);
  const copyTone = asString(raw.copyTone) ?? "담백하고 구체적인 이커머스 톤";
  if (!productAnalysis) issues.push("productAnalysis required");
  if (!targetCustomerAnalysis) issues.push("targetCustomerAnalysis required");

  const uspsRaw = raw.usps;
  const usps = Array.isArray(uspsRaw)
    ? uspsRaw.map((u) => asString(u)).filter((u): u is string => Boolean(u))
    : [];
  if (usps.length === 0) issues.push("usps must be non-empty array");

  const structureRaw = raw.pageStructure;
  if (!Array.isArray(structureRaw)) {
    issues.push("pageStructure must be array");
    throw new CopyValidationError(issues);
  }
  if (
    structureRaw.length < PAGE_STRUCTURE_MIN_SECTIONS ||
    structureRaw.length > PAGE_STRUCTURE_MAX_SECTIONS
  ) {
    issues.push(
      `pageStructure length ${structureRaw.length} not in ${PAGE_STRUCTURE_MIN_SECTIONS}–${PAGE_STRUCTURE_MAX_SECTIONS}`,
    );
  }

  const pageStructure = structureRaw.map((entry, i) => {
    if (!isObject(entry)) {
      issues.push(`pageStructure[${i}] must be object`);
      return null;
    }
    const type = normalizeSectionType(asString(entry.type) ?? "");
    if (!type) {
      issues.push(
        `pageStructure[${i}].type invalid "${String(entry.type)}" — allowed: ${COPY_SECTION_TYPES.join(", ")}`,
      );
    }
    const purpose = asString(entry.purpose);
    const copyDirection = asString(entry.copyDirection);
    if (!purpose) issues.push(`pageStructure[${i}].purpose required`);
    if (!copyDirection) issues.push(`pageStructure[${i}].copyDirection required`);
    const order =
      typeof entry.order === "number" && Number.isFinite(entry.order)
        ? Math.round(entry.order)
        : i + 1;
    if (!type || !purpose || !copyDirection) return null;
    return { order, type, purpose, copyDirection };
  });

  if (issues.length > 0) throw new CopyValidationError(issues);

  return {
    productAnalysis: productAnalysis!,
    targetCustomerAnalysis: targetCustomerAnalysis!,
    usps,
    copyTone,
    pageStructure: pageStructure
      .filter((s): s is NonNullable<typeof s> => s != null)
      .sort((a, b) => a.order - b.order)
      .map((s, i) => ({ ...s, order: i + 1 })),
  };
}

export function validateDetailPageCopy(raw: unknown): DetailPageCopy {
  const issues: string[] = [];
  if (!isObject(raw)) throw new CopyValidationError(["root must be object"]);

  const mainHeadline =
    asString(raw.mainHeadline) ?? asString(raw.headline);
  const subHeadline = asString(raw.subHeadline) ?? "";
  const problemStatement = asString(raw.problemStatement) ?? "";
  const solutionStatement = asString(raw.solutionStatement) ?? "";
  const benefit = asString(raw.benefit) ?? "";
  const feature = asString(raw.feature) ?? "";
  const featureDescription = asString(raw.featureDescription) ?? "";
  const socialProofPlaceholder =
    asString(raw.socialProofPlaceholder) ?? "[고객 후기 영역 — 실제 후기 연동 예정]";
  const cta = asString(raw.cta) ?? asString(raw.CTA) ?? "";

  if (!mainHeadline) issues.push("mainHeadline required");
  if (!problemStatement) issues.push("problemStatement required");
  if (!solutionStatement) issues.push("solutionStatement required");
  if (!benefit) issues.push("benefit required");
  if (!feature) issues.push("feature required");
  if (!featureDescription) issues.push("featureDescription required");
  if (!cta) issues.push("cta required");

  const faqRaw = raw.faq;
  const faq: CopyFaqItem[] = [];
  if (!Array.isArray(faqRaw) || faqRaw.length === 0) {
    issues.push("faq must be non-empty array");
  } else {
    for (let i = 0; i < faqRaw.length; i += 1) {
      const item = faqRaw[i];
      if (!isObject(item)) {
        issues.push(`faq[${i}] must be object`);
        continue;
      }
      const question = asString(item.question);
      const answer = asString(item.answer);
      if (!question || !answer) {
        issues.push(`faq[${i}] needs question and answer`);
        continue;
      }
      faq.push({ question, answer });
    }
  }

  const sectionsRaw = raw.sections;
  const sections: CopySection[] = [];
  if (!Array.isArray(sectionsRaw) || sectionsRaw.length === 0) {
    issues.push("sections must be non-empty array");
  } else {
    for (let i = 0; i < sectionsRaw.length; i += 1) {
      const item = sectionsRaw[i];
      if (!isObject(item)) {
        issues.push(`sections[${i}] must be object`);
        continue;
      }
      const type = normalizeSectionType(asString(item.type) ?? "");
      if (!type) {
        issues.push(
          `sections[${i}].type invalid "${String(item.type)}" — allowed: ${COPY_SECTION_TYPES.join(", ")}`,
        );
        continue;
      }
      const title = asString(item.title) ?? "";
      const body = asString(item.body) ?? "";
      if (!title && !body) {
        issues.push(`sections[${i}] needs title or body`);
        continue;
      }
      sections.push({ type, title, body });
    }
  }

  if (issues.length > 0) throw new CopyValidationError(issues);

  return {
    mainHeadline: mainHeadline!,
    subHeadline,
    problemStatement,
    solutionStatement,
    benefit,
    feature,
    featureDescription,
    socialProofPlaceholder,
    faq,
    cta: cta!,
    sections,
    headline: mainHeadline!,
  };
}

/** 입력에 없는 효능·수치·인증·후기·판매량 등 환각 탐지 */
export function detectCopyHallucinations(
  copy: DetailPageCopy,
  product: CopyProductInput,
): string[] {
  const corpus = [
    product.productName,
    product.category,
    product.brandName,
    product.description,
    product.keyFeatures,
    product.ingredients,
    product.certifications,
    product.targetCustomer,
    product.price != null ? String(product.price) : "",
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const allText = [
    copy.mainHeadline,
    copy.subHeadline,
    copy.problemStatement,
    copy.solutionStatement,
    copy.benefit,
    copy.feature,
    copy.featureDescription,
    copy.socialProofPlaceholder,
    copy.cta,
    ...copy.faq.map((f) => `${f.question} ${f.answer}`),
    ...copy.sections.map((s) => `${s.title} ${s.body}`),
  ].join("\n");

  const issues: string[] = [];

  const bannedMedical =
    /치료|완치|의학적으로|임상\s*실험|피부과\s*처방|의사\s*추천|의약품|암\s*예방|당뇨\s*개선/g;
  const medicalHits = allText.match(bannedMedical);
  if (medicalHits?.length) {
    issues.push(`medical/claim language: ${[...new Set(medicalHits)].join(", ")}`);
  }

  const hype = /100%\s*효과|기적|완벽\s*해결|부작용\s*없음|최고(?:의)?\s*(?:효능|품질|상품)/g;
  const hypeHits = allText.match(hype);
  if (hypeHits?.length) {
    issues.push(`hype language: ${[...new Set(hypeHits)].join(", ")}`);
  }

  // 판매량 / 후기 수치 날조
  const salesLike = /(\d[\d,]*)\s*(?:만\s*)?(?:개\s*)?(?:판매|구매|리뷰|후기|별점)/g;
  let m: RegExpExecArray | null;
  while ((m = salesLike.exec(allText)) !== null) {
    const snippet = m[0];
    if (!corpus.includes(m[1]!.replace(/,/g, "")) && !/연동|플레이스홀더|영역|추후/.test(snippet)) {
      issues.push(`possible invented social metric: "${snippet}"`);
    }
  }

  // % 수치 — 입력에 없는 %는 의심
  const pct = /(\d+(?:\.\d+)?)\s*%/g;
  while ((m = pct.exec(allText)) !== null) {
    const num = m[1]!;
    if (!corpus.includes(num) && !corpus.includes(`${num}%`)) {
      issues.push(`percentage not in product input: ${num}%`);
    }
  }

  // 인증 키워드 — 입력 certifications에 없을 때
  const certWords = ["식약처", "FDA", "ISO", "GMP", "유기농", "할랄", "비건인증"];
  for (const w of certWords) {
    if (allText.includes(w) && !corpus.includes(w.toLowerCase()) && !(product.certifications ?? "").includes(w)) {
      issues.push(`certification not in input: ${w}`);
    }
  }

  // socialProof는 placeholder여야 함 — 구체적 가짜 후기 문장 제한
  if (
    /"(?:정말|완전|최고).{0,20}(?:좋아요|만족|추천)/.test(copy.socialProofPlaceholder) ||
    /고객\s*[가-힣]*\s*님/.test(copy.socialProofPlaceholder)
  ) {
    if (!/플레이스홀더|연동|영역|추후|\[/.test(copy.socialProofPlaceholder)) {
      issues.push("socialProofPlaceholder looks like fabricated review, not a placeholder");
    }
  }

  return issues;
}

export const DETAIL_PAGE_COPY_JSON_SCHEMA = {
  type: "object",
  required: [
    "mainHeadline",
    "subHeadline",
    "problemStatement",
    "solutionStatement",
    "benefit",
    "feature",
    "featureDescription",
    "socialProofPlaceholder",
    "faq",
    "cta",
    "sections",
  ],
  additionalProperties: false,
  properties: {
    mainHeadline: { type: "string" },
    subHeadline: { type: "string" },
    problemStatement: { type: "string" },
    solutionStatement: { type: "string" },
    benefit: { type: "string" },
    feature: { type: "string" },
    featureDescription: { type: "string" },
    socialProofPlaceholder: { type: "string" },
    faq: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
      },
    },
    cta: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["type", "title", "body"],
        properties: {
          type: { type: "string", enum: [...COPY_SECTION_TYPES] },
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
  },
} as const;
