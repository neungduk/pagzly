import { NextResponse } from "next/server";
import { PROXY_IMAGE_RULES, SlidingWindowLimiter, clientIpOf } from "@/lib/rate-limit";
import { PROXY_MAX_BYTES, PROXY_TIMEOUT_MS, isAllowedImageType, isAllowedProxyUrl, readCapped } from "@/lib/proxy-image-policy";

// 426차 W6: 무인증 프록시라 IP 단위 인메모리 제한(서버리스 1차 완충)과 호스트·타입·크기·시간 제한을 둔다. 정책은 lib/proxy-image-policy.ts
const limiter = new SlidingWindowLimiter(PROXY_IMAGE_RULES);

/**
 * 브라우저 CORS로 html-to-image가 이미지를 못 그릴 때 쓰는 same-origin 프록시.
 * GET /api/proxy-image?url=https%3A%2F%2F...
 */
export async function GET(request: Request) {
  const limited = limiter.check(clientIpOf(request.headers));
  if (!limited.allowed) {
    return NextResponse.json({ error: "too many requests" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !isAllowedProxyUrl(url)) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "image/*" },
      cache: "force-cache",
      redirect: "error", // 허용 호스트 밖으로의 리다이렉트를 따라가지 않는다
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type");
    if (!isAllowedImageType(contentType)) {
      return NextResponse.json({ error: "not an image" }, { status: 502 });
    }
    const declared = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > PROXY_MAX_BYTES) {
      return NextResponse.json({ error: "too large" }, { status: 413 });
    }
    const bytes = await readCapped(upstream.body, PROXY_MAX_BYTES);
    if (!bytes) return NextResponse.json({ error: "too large" }, { status: 413 });
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType as string,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[proxy-image]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
