// 경쟁사/도매 원본 상품 URL에서 텍스트(제목 + 주요 문구)만 뽑아 AI 프롬프트에
// 넣기 위한 경량 크롤러. 이미지나 원본 HTML은 어디에도 저장하지 않고, 이
// 요청을 처리하는 동안 메모리에서만 쓰고 버린다 — DB/파일 저장 없음.
//
// cheerio 등 별도 파서를 추가하지 않고 정규식 기반으로 최소한만 뽑는다.
// 목적이 "정확한 파싱"이 아니라 "AI가 참고할 만한 요약 텍스트 확보"이므로
// 완벽한 HTML 파서가 필요하지 않다.

const FETCH_TIMEOUT_MS = 8000;
const MAX_EXCERPT_LENGTH = 1500;
const MAX_TITLE_LENGTH = 200;

export type UrlSummaryResult =
  | { ok: true; url: string; title: string; excerpt: string }
  | { ok: false; url: string; reason: string };

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&#x27;/gi, "'");
}

function extractMetaContent(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match ? decodeHtmlEntities(match[1].trim()) : "";
}

function parseHtmlText(html: string): { title: string; excerpt: string } {
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle = extractMetaContent(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
  );
  const title = (ogTitle || decodeHtmlEntities((titleTagMatch?.[1] ?? "").trim())).slice(
    0,
    MAX_TITLE_LENGTH,
  );

  const description =
    extractMetaContent(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    ) ||
    extractMetaContent(
      html,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    );

  const bodyText = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  const excerpt = [description, bodyText]
    .filter(Boolean)
    .join(" — ")
    .slice(0, MAX_EXCERPT_LENGTH);

  return { title, excerpt };
}

// URL 하나를 fetch해서 제목/주요 문구만 추출한다. 봇 차단(403/429), 타임아웃,
// 이미지/PDF 등 비-HTML 응답, 네트워크 오류를 모두 실패로 취급하고 이유를
// 담아 반환한다 — 호출부가 "자동 분석 실패"를 사용자에게 명확히 안내할 수
// 있도록 예외를 던지지 않고 결과 타입으로 구분한다.
export async function extractUrlSummary(url: string): Promise<UrlSummaryResult> {
  try {
    new URL(url);
  } catch {
    return { ok: false, url, reason: "URL 형식이 올바르지 않습니다." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // 일부 사이트는 기본 fetch User-Agent(봇으로 인식)를 차단하므로,
        // 일반 브라우저에 가까운 헤더를 보낸다. 그래도 막히면 실패로 처리한다.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8,zh-CN;q=0.7",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return { ok: false, url, reason: `사이트에서 접근을 거부했습니다 (HTTP ${response.status}).` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return {
        ok: false,
        url,
        reason: `분석 가능한 페이지가 아닙니다 (content-type: ${contentType || "알 수 없음"}).`,
      };
    }

    const html = await response.text();
    const { title, excerpt } = parseHtmlText(html);

    if (!title && !excerpt) {
      return { ok: false, url, reason: "페이지에서 텍스트를 추출하지 못했습니다." };
    }

    return { ok: true, url, title, excerpt };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "응답 시간 초과로 접근하지 못했습니다."
        : error instanceof Error
          ? error.message
          : String(error);
    return { ok: false, url, reason };
  } finally {
    clearTimeout(timer);
  }
}

export type CompetitorDifferentiation = {
  competitorFocus: string[];
  differentiationHints: string[];
};

const DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

function normalizeDifferentiation(raw: unknown): CompetitorDifferentiation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const competitorFocus = Array.isArray(o.competitorFocus)
    ? o.competitorFocus.map(String).filter(Boolean).slice(0, 3)
    : [];
  const differentiationHints = Array.isArray(o.differentiationHints)
    ? o.differentiationHints.map(String).filter(Boolean).slice(0, 3)
    : [];
  if (competitorFocus.length === 0 && differentiationHints.length === 0) return null;
  return { competitorFocus, differentiationHints };
}

function parseKeyFeaturesList(raw: string[]): string[] {
  return raw.flatMap((line) =>
    line
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * 경쟁사 URL 요약(extractUrlSummary 결과)을 구조화된 차별화 포인트로 변환.
 * 실패 시 null (throw 금지).
 */
export async function extractCompetitorDifferentiation(
  productName: string,
  productKeyFeatures: string[],
  competitorSummary: { title: string; excerpt: string },
): Promise<CompetitorDifferentiation | null> {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn("[url-crawler] DEEPSEEK_API_KEY 없음 — competitor differentiation 생략");
    return null;
  }

  const features = parseKeyFeaturesList(productKeyFeatures);
  const prompt = `다음은 경쟁사 상품 페이지 요약과 우리 상품 정보입니다.
**입력에 실제로 있는 내용만** 바탕으로 구조적 차이를 요약하세요.
- 경쟁사 브랜드명·카피 문구를 그대로 인용하지 마세요.
- 입력에 없는 수치·인증·가격 비교·효능을 지어내지 마세요.
- 확실하지 않으면 해당 항목은 빈 배열로 두세요.

## 우리 상품
- 이름: ${productName}
- 특징: ${features.length > 0 ? features.join(", ") : "(미입력)"}

## 경쟁사 페이지 요약
- title: ${competitorSummary.title}
- excerpt: ${competitorSummary.excerpt}

JSON만 반환:
{
  "competitorFocus": ["경쟁사가 강조하는 포인트 2~3개, 각 1문장"],
  "differentiationHints": ["우리 상품이 다르게 강조할 수 있는 지점 2~3개, 각 1문장"]
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
      console.warn("[url-crawler] competitor differentiation DeepSeek 오류:", rawBody.slice(0, 200));
      return null;
    }

    const data = JSON.parse(rawBody) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = normalizeDifferentiation(JSON.parse(content));
    if (parsed) {
      console.log(
        `[url-crawler] competitor differentiation focus=${parsed.competitorFocus.length} hints=${parsed.differentiationHints.length}`,
      );
    }
    return parsed;
  } catch (error) {
    console.warn("[url-crawler] competitor differentiation 실패", error);
    return null;
  }
}
