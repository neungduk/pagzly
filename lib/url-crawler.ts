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
