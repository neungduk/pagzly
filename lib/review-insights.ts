/**
 * 리뷰 파일(xlsx/txt)에서 실제 후기 기반 praise/complaint 요약.
 */

import * as XLSX from "xlsx";

const DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const DEEPSEEK_COST_PER_MILLION = {
  inputCacheHit: 0.0028,
  inputCacheMiss: 0.14,
  output: 0.28,
} as const;

export type ReviewAxisComparison = {
  label: string;
  ourValue: number;
  quotes: string[];
};

export type ReviewInsights = {
  commonPraises: string[];
  commonComplaints: string[];
  /** 파싱된 리뷰 라인(또는 xlsx 유효 행) 수 — 의미적 비율이 아닌 순수 파싱 건수 */
  reviewLineCount: number;
  /** 192차 — 나이/체중 언급 라인 수(정규식, LLM 아님). 의미적 비율이 아닌 순수 파싱 건수 */
  petAgeWeightMentionCount: number;
  /** 203차 — 재구매 의사 언급 라인 수(정규식, LLM 아님). 의미적 비율이 아닌 순수 파싱 건수 */
  repurchaseMentionCount: number;
  /** 204차 — 사이즈/핏 언급 라인 수(정규식, LLM 아님). 의미적 비율이 아닌 순수 파싱 건수 */
  sizeFitMentionCount: number;
  /** 205차 — 장기 사용 언급 라인 수(정규식, LLM 아님). 의미적 비율이 아닌 순수 파싱 건수 */
  longTermUseMentionCount: number;
  /** 135차 — 각 praise가 원문 리뷰 몇 줄에서 매칭됐는지 (키워드 문자열 매칭, LLM 아님) */
  praiseMatchCounts: number[];
  /** 135차 — 각 complaint 동일 */
  complaintMatchCounts: number[];
  /** 137차 — 리뷰 축 매칭 비율(2개 미만이면 생략) */
  axisComparison?: ReviewAxisComparison[];
};

/** praise/complaint 문장에서 핵심 키워드(2자 이상 토큰) 최대 4개 추출.
 *  이 키워드는 원문 매칭용이지 새로 지어내는 게 아님 — 문장 자체를 쪼갤 뿐. */
export function extractCoreKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2),
    ),
  ).slice(0, 4);
}

export type HighlightSegment = { text: string; isKeyword: boolean };

/** praise/complaint 텍스트를 extractCoreKeywords 기준으로 조각냄.
 *  matchCount > 0 인 항목에서만 렌더러가 이 결과로 강조 표시를 만든다 —
 *  실제 리뷰 원문과 매칭된 적 있는 문장에서만 사용해야 anti-fabrication 원칙과 충돌하지 않음.
 *  키워드 자체는 extractCoreKeywords와 동일(문장을 쪼갠 것) — 새로 짓지 않음. */
export function splitTextByKeywords(text: string): HighlightSegment[] {
  const keywords = extractCoreKeywords(text);
  if (keywords.length === 0) return [{ text, isKeyword: false }];
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, isKeyword: sorted.includes(part) }));
}

/** 원문 리뷰 라인 중 text의 핵심 키워드를 하나라도 포함하는 라인 수.
 *  LLM 호출 없음 — 순수 문자열 포함 검사라 과대 집계가 구조적으로 불가능
 *  (키워드가 원문에 없으면 0). 과소 집계는 될 수 있음(동의어 미매칭) — 그건 안전한 쪽 오차. */
export function countLineMatches(lines: string[], text: string): number {
  return matchingLines(lines, text).length;
}

/** 192차 — 반려동물 리뷰 원문에서 나이/체중 언급 라인 수. LLM 호출 없음 —
 *  countLineMatches와 동일하게 순수 정규식 매칭. 숫자 패턴이 뚜렷한 나이·체중만
 *  다룬다(품종명은 자유 텍스트라 지어내기 위험 있어 제외 — anti-fabrication). */
const PET_AGE_WEIGHT_PATTERN =
  /\d+(\.\d+)?\s*(kg|킬로그램|킬로)|\d+\s*(개월|살|세)(?![0-9])/i;

export function countPetAgeWeightMentions(lines: string[]): number {
  return lines.filter((line) => PET_AGE_WEIGHT_PATTERN.test(line)).length;
}

/** 203차 — 식품 리뷰 원문에서 재구매 의사 언급 라인 수. LLM 호출 없음 —
 *  countPetAgeWeightMentions과 동일하게 순수 정규식 매칭. 문맥 의존적인 애매한
 *  표현("크다/작다"류)은 제외하고 명시적 재구매 어휘만 다룬다(anti-fabrication). */
const REPURCHASE_PATTERN =
  /재구매|재주문|또\s*(구매|구입|주문)|계속\s*(구매|구입)/;

export function countRepurchaseMentions(lines: string[]): number {
  return lines.filter((line) => REPURCHASE_PATTERN.test(line)).length;
}

/** 204차 — 패션 리뷰 원문에서 사이즈/핏 언급 라인 수. LLM 호출 없음 —
 *  countRepurchaseMentions과 동일하게 순수 정규식 매칭. "사이즈" 키워드가 반드시
 *  동반되는 명시적 표현만 다룬다 — 문맥 의존적인 "크다/작다" 단독 표현은 제외
 *  (예: "가격이 크게 부담되진 않아요"류 오탐 방지, anti-fabrication). */
const SIZE_FIT_PATTERN = /정사이즈|사이즈\s*(업|다운|크게|작게)/;

export function countSizeFitMentions(lines: string[]): number {
  return lines.filter((line) => SIZE_FIT_PATTERN.test(line)).length;
}

/** 205차 — 뷰티·전자·생활용품 리뷰 원문에서 장기 사용 언급 라인 수. LLM 호출 없음 —
 *  countSizeFitMentions과 동일하게 순수 정규식 매칭. 숫자+기간 단위+사용 동사가 모두
 *  붙어 있는 경우만 다룬다 — 한글 고유어 숫자("한 달째")는 의도적으로 제외(과소집계는
 *  안전한 쪽 오차, anti-fabrication). */
const LONG_TERM_USE_PATTERN =
  /\d+\s*(일|주|개월|년)\s*째?\s*(사용|써|쓰고|쓴|사용중|사용해)/;

export function countLongTermUseMentions(lines: string[]): number {
  return lines.filter((line) => LONG_TERM_USE_PATTERN.test(line)).length;
}

/** countLineMatches와 동일 규칙으로 매칭된 원문 라인 목록 */
export function matchingLines(lines: string[], text: string): string[] {
  const keywords = extractCoreKeywords(text);
  if (keywords.length === 0) return [];
  return lines.filter((line) => keywords.some((k) => line.includes(k)));
}

/**
 * 137차 — 축 라벨별 결정론적 매칭 비율.
 * matchCount < 2 인 축은 버림(지어낸 라벨 자동 필터). 살아남은 축이 2개 미만이면 [].
 */
export function buildAxisComparison(
  lines: string[],
  reviewAxes: string[],
  reviewLineCount = lines.length,
): ReviewAxisComparison[] {
  const axisScores = reviewAxes
    .map((label) => {
      const matched = matchingLines(lines, label);
      const matchCount = matched.length;
      const pct = reviewLineCount > 0 ? Math.round((matchCount / reviewLineCount) * 100) : 0;
      return {
        label,
        matchCount,
        ourValue: Math.min(95, Math.max(20, pct || 20)),
        quotes: matched.slice(0, 2),
      };
    })
    .filter((a) => a.matchCount >= 2);

  if (axisScores.length < 2) return [];
  return axisScores.map(({ label, ourValue, quotes }) => ({ label, ourValue, quotes }));
}

function calculateDeepSeekCost(usage: unknown): number {
  if (!usage || typeof usage !== "object") return 0;
  const u = usage as Record<string, number | undefined>;
  const cacheHitTokens = u.prompt_cache_hit_tokens ?? 0;
  const inputTokens = u.input_tokens ?? u.prompt_tokens ?? 0;
  const cacheMissTokens = u.prompt_cache_miss_tokens ?? Math.max(0, inputTokens - cacheHitTokens);
  const outputTokens = u.output_tokens ?? u.completion_tokens ?? 0;
  return (
    (cacheHitTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.inputCacheHit +
    (cacheMissTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.inputCacheMiss +
    (outputTokens / 1_000_000) * DEEPSEEK_COST_PER_MILLION.output
  );
}

/** xlsx 유효 행(셀 결합 후 길이≥4) 목록 */
export function extractLinesFromXlsx(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const chunks: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
    for (const row of rows) {
      const line = row.map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" ");
      if (line.length >= 4) chunks.push(line);
    }
  }
  return chunks;
}

/** txt 비어 있지 않은 라인 목록 */
export function extractLinesFromTxt(buffer: Buffer): string[] {
  return buffer
    .toString("utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4);
}

function extractTextFromXlsx(buffer: Buffer): string {
  return extractLinesFromXlsx(buffer).join("\n");
}

function extractTextFromTxt(buffer: Buffer): string {
  return buffer.toString("utf8").trim();
}

/** 파싱 건수 — DeepSeek 없이 결정론적으로 계산 */
export function countReviewLines(fileBuffer: Buffer, fileType: "xlsx" | "txt"): number {
  if (fileType === "xlsx") return extractLinesFromXlsx(fileBuffer).length;
  return extractLinesFromTxt(fileBuffer).length;
}

function sampleReviewText(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, maxChars * 0.6);
  const tail = text.slice(-maxChars * 0.35);
  return `${head}\n...(중략)...\n${tail}`;
}

function normalizeInsights(raw: unknown): {
  commonPraises: string[];
  commonComplaints: string[];
  reviewAxes: string[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const praises = Array.isArray(o.commonPraises)
    ? o.commonPraises.map(String).filter(Boolean).slice(0, 5)
    : [];
  const complaints = Array.isArray(o.commonComplaints)
    ? o.commonComplaints.map(String).filter(Boolean).slice(0, 5)
    : [];
  const reviewAxes = Array.isArray(o.reviewAxes)
    ? o.reviewAxes
        .map((v) => String(v).trim().slice(0, 6))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  if (praises.length === 0 && complaints.length === 0) return null;
  return { commonPraises: praises, commonComplaints: complaints, reviewAxes };
}

export type ExtractReviewInsightsOptions = {
  /** 기본 0 — 사실 추출이라 창의성 불필요 (172차). 레거시 비교용으로만 올리세요. */
  temperature?: number;
  /** 리뷰 라인≥minLinesForRetry인데 praises가 비면 1회 재시도 (기본 true) */
  retryEmptyPraises?: boolean;
  minLinesForRetry?: number;
};

async function callDeepSeekReviewJson(
  prompt: string,
  temperature: number,
): Promise<{
  parsed: {
    commonPraises: string[];
    commonComplaints: string[];
    reviewAxes: string[];
  } | null;
  cost: number;
  ok: boolean;
}> {
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature,
    }),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    console.warn("[review-insights] DeepSeek 오류:", rawBody.slice(0, 200));
    return { parsed: null, cost: 0, ok: false };
  }

  const data = JSON.parse(rawBody) as {
    choices?: { message?: { content?: string } }[];
    usage?: unknown;
  };
  const cost = calculateDeepSeekCost(data.usage);
  console.log(`[cost] extractReviewInsights: $${cost.toFixed(4)} (temp=${temperature})`);

  const content = data.choices?.[0]?.message?.content;
  if (!content) return { parsed: null, cost, ok: true };

  try {
    return { parsed: normalizeInsights(JSON.parse(content)), cost, ok: true };
  } catch {
    console.warn("[review-insights] JSON parse 실패");
    return { parsed: null, cost, ok: true };
  }
}

export async function extractReviewInsights(
  fileBuffer: Buffer,
  fileType: "xlsx" | "txt",
  options: ExtractReviewInsightsOptions = {},
): Promise<ReviewInsights & { cost: number; deepseekCalls?: number }> {
  const temperature = options.temperature ?? 0;
  const retryEmptyPraises = options.retryEmptyPraises ?? true;
  const minLinesForRetry = options.minLinesForRetry ?? 3;

  const lines =
    fileType === "xlsx" ? extractLinesFromXlsx(fileBuffer) : extractLinesFromTxt(fileBuffer);
  const reviewLineCount = lines.length;
  const petAgeWeightMentionCount = countPetAgeWeightMentions(lines);
  const repurchaseMentionCount = countRepurchaseMentions(lines);
  const sizeFitMentionCount = countSizeFitMentions(lines);
  const longTermUseMentionCount = countLongTermUseMentions(lines);
  const empty: ReviewInsights = {
    commonPraises: [],
    commonComplaints: [],
    reviewLineCount,
    petAgeWeightMentionCount,
    repurchaseMentionCount,
    sizeFitMentionCount,
    longTermUseMentionCount,
    praiseMatchCounts: [],
    complaintMatchCounts: [],
  };

  const rawText = lines.join("\n");
  if (!rawText.trim()) {
    console.warn("[review-insights] 리뷰 텍스트 없음");
    return {
      ...empty,
      reviewLineCount: 0,
      petAgeWeightMentionCount: 0,
      repurchaseMentionCount: 0,
      sizeFitMentionCount: 0,
      longTermUseMentionCount: 0,
      cost: 0,
      deepseekCalls: 0,
    };
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn("[review-insights] DEEPSEEK_API_KEY 없음 — 요약 생략");
    return { ...empty, cost: 0, deepseekCalls: 0 };
  }

  const sampled = sampleReviewText(rawText);
  const prompt = `아래는 실제 상품 리뷰/후기 텍스트입니다. **원문에 실제로 등장하는 내용만** 요약하세요.
근거 없는 장점·단점을 지어내지 마세요. 해당 표현이 없으면 빈 배열로 두세요.

리뷰 텍스트:
${sampled}

JSON만 반환:
{
  "commonPraises": ["자주 언급된 장점 2~5개, 각 1문장"],
  "commonComplaints": ["자주 언급된 아쉬운 점 0~5개, 각 1문장. 없으면 []"],
  "reviewAxes": ["리뷰에 실제로 반복 언급되는 속성 축 2~3개, 각 4자 이내(예: '흡수력','자극감','향','내구성'). 원문에 실제로 나타나는 주제만 뽑으세요. 숫자·퍼센트·순위는 쓰지 마세요 — 라벨 문자열만."]
}`;

  try {
    let deepseekCalls = 0;
    let totalCost = 0;

    const first = await callDeepSeekReviewJson(prompt, temperature);
    deepseekCalls += 1;
    totalCost += first.cost;
    let parsed = first.parsed;

    // 172차 — 리뷰는 있는데 praises만 빈 샘플링 실패를 1회 재시도로 완화(지어내기 아님)
    const shouldRetry =
      retryEmptyPraises &&
      reviewLineCount >= minLinesForRetry &&
      (!parsed || parsed.commonPraises.length === 0);
    if (shouldRetry) {
      console.log(
        `[review-insights] empty praises with reviewLineCount=${reviewLineCount} — retry once`,
      );
      const second = await callDeepSeekReviewJson(prompt, temperature);
      deepseekCalls += 1;
      totalCost += second.cost;
      if (second.parsed && second.parsed.commonPraises.length > 0) {
        parsed = second.parsed;
      } else if (!parsed && second.parsed) {
        parsed = second.parsed;
      }
    }

    if (!parsed) return { ...empty, cost: totalCost, deepseekCalls };

    const praiseMatchCounts = parsed.commonPraises.map((p) => countLineMatches(lines, p));
    const complaintMatchCounts = parsed.commonComplaints.map((c) =>
      countLineMatches(lines, c),
    );
    const axisComparison = buildAxisComparison(lines, parsed.reviewAxes, reviewLineCount);

    console.log(
      `[review-insights] praises=${parsed.commonPraises.length} complaints=${parsed.commonComplaints.length} reviewLineCount=${reviewLineCount} praiseMatches=[${praiseMatchCounts.join(",")}] complaintMatches=[${complaintMatchCounts.join(",")}] axes=${axisComparison.length}(${axisComparison.map((a) => a.label).join(",")}) calls=${deepseekCalls}`,
    );
    return {
      commonPraises: parsed.commonPraises,
      commonComplaints: parsed.commonComplaints,
      reviewLineCount,
      petAgeWeightMentionCount,
      repurchaseMentionCount,
      sizeFitMentionCount,
      longTermUseMentionCount,
      praiseMatchCounts,
      complaintMatchCounts,
      ...(axisComparison.length >= 2 ? { axisComparison } : {}),
      cost: totalCost,
      deepseekCalls,
    };
  } catch (error) {
    console.warn("[review-insights] 요약 실패", error);
    return { ...empty, cost: 0, deepseekCalls: 0 };
  }
}

export function formatReviewInsightsBlock(
  insights: Pick<ReviewInsights, "commonPraises" | "commonComplaints"> & {
    reviewLineCount?: number;
  },
): string {
  if (insights.commonPraises.length === 0 && insights.commonComplaints.length === 0) {
    return "";
  }
  const praiseLines =
    insights.commonPraises.length > 0
      ? insights.commonPraises.map((p) => `- ${p}`).join("\n")
      : "(없음)";
  const complaintLines =
    insights.commonComplaints.length > 0
      ? insights.commonComplaints.map((c) => `- ${c}`).join("\n")
      : "(없음)";
  const countLine =
    (insights.reviewLineCount ?? 0) > 0
      ? `\n(분석 리뷰 ${insights.reviewLineCount}건)`
      : "";
  return `## 실제 후기 요약 (표현 참고용 — 원문에 없는 장점 지어내기 금지)${countLine}
자주 언급된 장점:
${praiseLines}

자주 언급된 아쉬운 점:
${complaintLines}
카피 작성 시 위 후기 기반 표현을 **실제 후기 톤**으로 참고하되, 근거 없는 효능·수치를 추가하지 마세요.`;
}
