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

/** 116차 — AI 상투 클리셰 (mainHeadline / subHeadline / cta만). 사실 관계는 건드리지 않음 */
export const GENERIC_CLICHE_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "이제 고민은 그만", re: /이제\s*고민은\s*그만/ },
  { id: "당신을 위한 선택", re: /당신(?:을)?\s*위한\s*(?:완벽한\s*)?선택/ },
  { id: "완벽한 선택", re: /완벽한\s*선택/ },
  { id: "새로운 시작", re: /새로운\s*시작/ },
  { id: "여기 있습니다", re: /여기\s*있습니다/ },
  { id: "지금 바로 만나보세요", re: /지금\s*바로\s*만나보세요/ },
  { id: "당신의 피부를 위한", re: /당신의\s*피부(?:를)?\s*위한/ },
  { id: "더 이상 망설이지 마세요", re: /더\s*이상\s*망설이지\s*마세요/ },
  { id: "오늘부터 달라집니다", re: /오늘부터\s*달라집니다/ },
  { id: "경험해보세요", re: /경험해\s*보세요/ },
  { id: "만나보세요", re: /만나보세요/ },
];

/**
 * 163차 — 클리셰 탐지 범위를 헤드라인/CTA뿐 아니라 본문 필드까지 확장.
 * 164차 — feature/socialProofPlaceholder까지 전 텍스트 필드로 커버리지 완성
 * (socialProofPlaceholder는 실제로는 고정 플레이스홀더 문구지만, 한 곳도 빠짐없이
 * 검사한다는 원칙을 위해 포함 — 클리셰 패턴에 걸릴 일은 거의 없어 안전).
 */
function allCopyTextFields(copy: DetailPageCopy): Array<{ label: string; text: string }> {
  const fields: Array<{ label: string; text: string }> = [
    { label: "mainHeadline", text: copy.mainHeadline ?? "" },
    { label: "subHeadline", text: copy.subHeadline ?? "" },
    { label: "problemStatement", text: copy.problemStatement ?? "" },
    { label: "solutionStatement", text: copy.solutionStatement ?? "" },
    { label: "benefit", text: copy.benefit ?? "" },
    { label: "feature", text: copy.feature ?? "" },
    { label: "featureDescription", text: copy.featureDescription ?? "" },
    { label: "socialProofPlaceholder", text: copy.socialProofPlaceholder ?? "" },
    { label: "cta", text: copy.cta ?? "" },
  ];
  (copy.sections ?? []).forEach((s, i) => {
    fields.push({ label: `sections[${i}].body`, text: s.body ?? "" });
  });
  (copy.faq ?? []).forEach((f, i) => {
    fields.push({ label: `faq[${i}].answer`, text: f.answer ?? "" });
  });
  return fields;
}

export function detectGenericCliches(copy: DetailPageCopy): string[] {
  const hits: string[] = [];
  for (const { label, text } of allCopyTextFields(copy)) {
    for (const { id, re } of GENERIC_CLICHE_PATTERNS) {
      if (re.test(text)) {
        hits.push(`${label}: ${id}`);
      }
    }
  }
  return hits;
}

/**
 * 163차 — "AI가 쓴 티"가 나는 접속어/두루뭉술 형용사 남용 탐지.
 * 크롤링 근거: 한국어 AI 생성 텍스트의 대표적 특징으로 "또한/이처럼/이러한/따라서/
 * 한편/이를 통해" 같은 접속 부사의 규칙적 반복, "다양한/중요한/효과적인/기반으로"
 * 같은 두루뭉술한 형용사·표현이 꼽힘. 마케팅 클리셰("완벽한 선택" 등)와는 다른
 * 축의 문제라 별도 함수로 관리 — 한 번 쓰였다고 문제는 아니고, 반복되거나 여러
 * 섹션 서두에 습관적으로 등장할 때만 "티가 난다".
 */
const AI_TELL_CONNECTIVES = [
  "또한",
  "이처럼",
  "이러한",
  "이를 통해",
  "따라서",
  "한편",
  "이를",
  "마침내",
];

const AI_TELL_FILLER_WORDS = [
  "다양한",
  "중요한",
  "효과적인",
  "기반으로",
  "관련된",
];

function countOccurrences(text: string, needle: string): number {
  if (!text) return 0;
  return text.split(needle).length - 1;
}

export function detectAiTellOveruse(copy: DetailPageCopy): string[] {
  const fields = allCopyTextFields(copy);
  const hits: string[] = [];

  // 1. 전체 카피에서 접속어 총 등장 횟수 — 4회 이상이면 "규칙적 반복"으로 판단
  for (const word of AI_TELL_CONNECTIVES) {
    const total = fields.reduce((sum, f) => sum + countOccurrences(f.text, word), 0);
    if (total >= 4) {
      hits.push(`connective overuse: "${word}" x${total}`);
    }
  }

  // 2. 서로 다른 섹션 2개 이상이 같은 접속어로 문장을 시작 — 습관적 패턴
  const sectionBodies = (copy.sections ?? []).map((s) => s.body ?? "");
  for (const word of AI_TELL_CONNECTIVES) {
    const startCount = sectionBodies.filter((body) =>
      new RegExp(`^\\s*${word}`).test(body),
    ).length;
    if (startCount >= 2) {
      hits.push(`connective sentence-start pattern: "${word}" in ${startCount} sections`);
    }
  }

  // 3. 두루뭉술한 형용사 총 등장 — 6회 이상이면 구체성 부재 신호
  for (const word of AI_TELL_FILLER_WORDS) {
    const total = fields.reduce((sum, f) => sum + countOccurrences(f.text, word), 0);
    if (total >= 6) {
      hits.push(`filler word overuse: "${word}" x${total}`);
    }
  }

  return hits;
}

/**
 * 164차 — 문장 길이 균일성(리듬) 탐지. 접속어/필러 단어(163차)와는 다른 축의
 * "티" — 개별 단어가 아니라 문장 리듬의 문제.
 * 크롤링 근거: 국내 AI 라이팅 실전 팁에서 "AI가 쓴 글이 어색한 이유는 문장 길이가
 * 다 비슷해서다 — '문장 길이를 들쭉날쭉하게, 짧은 문장·긴 문장 섞어서 사람 호흡처럼
 * 써달라'는 한 줄 프롬프트만으로 사람이 쓴 것 같다는 인상을 준다"는 지적(threads.com
 * 국내 AI 라이팅 커뮤니티) — 문장 길이의 변동계수(CV=표준편차/평균)가 낮을수록
 * (문장들이 다 비슷한 길이일수록) 기계적으로 읽힌다는 원리를 그대로 반영.
 * 본문형 필드(문제/해결/베네핏/피처설명/섹션 본문/FAQ 답변)에서 실제로 마침표·
 * 물음표·느낌표로 끊어지는 "진짜 문장"만 모아 계산 — 헤드라인처럼 원래 짧은 필드를
 * 섞으면 "필드 타입 차이"와 "문장 리듬"이 뒤섞여 판단이 왜곡되므로 제외한다.
 */
const SENTENCE_MONOTONY_FIELD_PREFIXES = ["sections[", "faq["];
const SENTENCE_MONOTONY_FIELD_LABELS = new Set([
  "problemStatement",
  "solutionStatement",
  "benefit",
  "featureDescription",
]);

function splitRealSentences(text: string): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
}

export function detectSentenceLengthMonotony(copy: DetailPageCopy): string[] {
  const fields = allCopyTextFields(copy);
  const lengths: number[] = [];
  for (const { label, text } of fields) {
    const isBodyLike =
      SENTENCE_MONOTONY_FIELD_LABELS.has(label) ||
      SENTENCE_MONOTONY_FIELD_PREFIXES.some((p) => label.startsWith(p));
    if (!isBodyLike) continue;
    for (const sentence of splitRealSentences(text)) {
      lengths.push(sentence.length);
    }
  }

  // 표본이 너무 적으면(짧은 카피, 단문 위주) 판단을 보류 — 오탐 방지
  if (lengths.length < 6) return [];

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / lengths.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  if (cv < 0.18) {
    return [
      `sentence length monotony: n=${lengths.length}, mean=${mean.toFixed(1)}자, CV=${cv.toFixed(2)} (문장 길이를 더 들쭉날쭉하게)`,
    ];
  }
  return [];
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
