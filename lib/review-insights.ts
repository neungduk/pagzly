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

/** 원문 리뷰 라인 중 text의 핵심 키워드를 하나라도 포함하는 라인 수.
 *  LLM 호출 없음 — 순수 문자열 포함 검사라 과대 집계가 구조적으로 불가능
 *  (키워드가 원문에 없으면 0). 과소 집계는 될 수 있음(동의어 미매칭) — 그건 안전한 쪽 오차. */
export function countLineMatches(lines: string[], text: string): number {
  return matchingLines(lines, text).length;
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

export async function extractReviewInsights(
  fileBuffer: Buffer,
  fileType: "xlsx" | "txt",
): Promise<ReviewInsights & { cost: number }> {
  const lines =
    fileType === "xlsx" ? extractLinesFromXlsx(fileBuffer) : extractLinesFromTxt(fileBuffer);
  const reviewLineCount = lines.length;
  const empty: ReviewInsights = {
    commonPraises: [],
    commonComplaints: [],
    reviewLineCount,
    praiseMatchCounts: [],
    complaintMatchCounts: [],
  };

  const rawText = lines.join("\n");
  if (!rawText.trim()) {
    console.warn("[review-insights] 리뷰 텍스트 없음");
    return { ...empty, reviewLineCount: 0, cost: 0 };
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn("[review-insights] DEEPSEEK_API_KEY 없음 — 요약 생략");
    return { ...empty, cost: 0 };
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
        temperature: 0.2,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      console.warn("[review-insights] DeepSeek 오류:", rawBody.slice(0, 200));
      return { ...empty, cost: 0 };
    }

    const data = JSON.parse(rawBody) as {
      choices?: { message?: { content?: string } }[];
      usage?: unknown;
    };
    const cost = calculateDeepSeekCost(data.usage);
    console.log(`[cost] extractReviewInsights: $${cost.toFixed(4)}`);

    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ...empty, cost };

    const parsed = normalizeInsights(JSON.parse(content));
    if (!parsed) return { ...empty, cost };

    const praiseMatchCounts = parsed.commonPraises.map((p) => countLineMatches(lines, p));
    const complaintMatchCounts = parsed.commonComplaints.map((c) =>
      countLineMatches(lines, c),
    );
    const axisComparison = buildAxisComparison(lines, parsed.reviewAxes, reviewLineCount);

    console.log(
      `[review-insights] praises=${parsed.commonPraises.length} complaints=${parsed.commonComplaints.length} reviewLineCount=${reviewLineCount} praiseMatches=[${praiseMatchCounts.join(",")}] complaintMatches=[${complaintMatchCounts.join(",")}] axes=${axisComparison.length}(${axisComparison.map((a) => a.label).join(",")})`,
    );
    return {
      commonPraises: parsed.commonPraises,
      commonComplaints: parsed.commonComplaints,
      reviewLineCount,
      praiseMatchCounts,
      complaintMatchCounts,
      ...(axisComparison.length >= 2 ? { axisComparison } : {}),
      cost,
    };
  } catch (error) {
    console.warn("[review-insights] 요약 실패", error);
    return { ...empty, cost: 0 };
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
