import { isAllowedProxyUrl, readCapped } from "@/lib/proxy-image-policy";

export type FetchFileOptions = {
  /** 본문 크기 상한(바이트). 넘으면 예외 */
  maxBytes?: number;
  /** 응답 대기 상한(ms) */
  timeoutMs?: number;
  /** true면 자기 Supabase·replicate.delivery 호스트만 허용(클라이언트가 보낸 URL용, 내부 주소 요청 방지) */
  allowlistedHostOnly?: boolean;
};

/** Supabase Storage public URL 등에서 파일 버퍼를 가져온다. 옵션을 주면 호스트·크기·시간 상한을 건다(426차). */
export async function fetchFileBuffer(url: string, opts: FetchFileOptions = {}): Promise<Buffer> {
  if (opts.allowlistedHostOnly && !isAllowedProxyUrl(url)) {
    throw new Error("허용되지 않은 파일 주소입니다.");
  }
  const response = await fetch(url, opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs), redirect: "error" } : undefined);
  if (!response.ok) {
    throw new Error(`파일을 불러올 수 없습니다: ${response.status}`);
  }
  if (opts.maxBytes) {
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > opts.maxBytes) throw new Error("파일이 너무 큽니다.");
    const bytes = await readCapped(response.body, opts.maxBytes);
    if (!bytes) throw new Error("파일이 너무 큽니다.");
    return Buffer.from(bytes);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** 리뷰·기획안 파싱 입력 상한: xlsx·txt 5MB, pdf·docx 10MB, 내려받기 15초 */
export const AUX_DOC_LIMITS = { reviewMaxBytes: 5 * 1024 * 1024, planningMaxBytes: 10 * 1024 * 1024, timeoutMs: 15_000 } as const;
