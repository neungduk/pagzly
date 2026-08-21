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

export type ReviewInsights = {
  commonPraises: string[];
  commonComplaints: string[];
};

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

function extractTextFromXlsx(buffer: Buffer): string {
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
  return chunks.join("\n");
}

function extractTextFromTxt(buffer: Buffer): string {
  return buffer.toString("utf8").trim();
}

function sampleReviewText(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, maxChars * 0.6);
  const tail = text.slice(-maxChars * 0.35);
  return `${head}\n...(중략)...\n${tail}`;
}

function normalizeInsights(raw: unknown): ReviewInsights | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const praises = Array.isArray(o.commonPraises)
    ? o.commonPraises.map(String).filter(Boolean).slice(0, 5)
    : [];
  const complaints = Array.isArray(o.commonComplaints)
    ? o.commonComplaints.map(String).filter(Boolean).slice(0, 5)
    : [];
  if (praises.length === 0 && complaints.length === 0) return null;
  return { commonPraises: praises, commonComplaints: complaints };
}

export async function extractReviewInsights(
  fileBuffer: Buffer,
  fileType: "xlsx" | "txt",
): Promise<ReviewInsights & { cost: number }> {
  const empty: ReviewInsights = { commonPraises: [], commonComplaints: [] };

  const rawText =
    fileType === "xlsx" ? extractTextFromXlsx(fileBuffer) : extractTextFromTxt(fileBuffer);
  if (!rawText.trim()) {
    console.warn("[review-insights] 리뷰 텍스트 없음");
    return { ...empty, cost: 0 };
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
  "commonComplaints": ["자주 언급된 아쉬운 점 0~5개, 각 1문장. 없으면 []"]
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

    console.log(
      `[review-insights] praises=${parsed.commonPraises.length} complaints=${parsed.commonComplaints.length}`,
    );
    return { ...parsed, cost };
  } catch (error) {
    console.warn("[review-insights] 요약 실패", error);
    return { ...empty, cost: 0 };
  }
}

export function formatReviewInsightsBlock(insights: ReviewInsights): string {
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
  return `## 실제 후기 요약 (표현 참고용 — 원문에 없는 장점 지어내기 금지)
자주 언급된 장점:
${praiseLines}

자주 언급된 아쉬운 점:
${complaintLines}
카피 작성 시 위 후기 기반 표현을 **실제 후기 톤**으로 참고하되, 근거 없는 효능·수치를 추가하지 마세요.`;
}
