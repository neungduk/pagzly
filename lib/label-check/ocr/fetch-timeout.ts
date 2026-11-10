/**
 * 509 — 공급자 fetch 호출당 AbortController 시간 제한.
 * 시간 초과 시 키·응답 원문 없이 OCR_TIMEOUT 만 던진다.
 * fetchImpl이 signal을 무시해도 타이머로 반드시 종료한다.
 */
import { OCR_FETCH_TIMEOUT_MS_509 } from "@/lib/label-check/ocr/constants";

export function isOcrTimeoutError509(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.message === "OCR_TIMEOUT" || (e as Error & { code?: string }).code === "OCR_TIMEOUT")
  );
}

function timeoutError509(): Error {
  const err = new Error("OCR_TIMEOUT");
  (err as Error & { code: string }).code = "OCR_TIMEOUT";
  return err;
}

export function wrapFetchWithTimeout509(
  fetchImpl: typeof fetch,
  timeoutMs: number = OCR_FETCH_TIMEOUT_MS_509,
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const ctrl = new AbortController();
    const upstream = init?.signal;
    if (upstream) {
      if (upstream.aborted) ctrl.abort();
      else upstream.addEventListener("abort", () => ctrl.abort(), { once: true });
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctrl.abort();
        reject(timeoutError509());
      }, timeoutMs);
    });

    try {
      const res = await Promise.race([
        fetchImpl(input, { ...init, signal: ctrl.signal }),
        timeoutPromise,
      ]);
      return res;
    } catch (e) {
      if (isOcrTimeoutError509(e)) throw e;
      if (
        (e instanceof Error && e.name === "AbortError") ||
        (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError")
      ) {
        throw timeoutError509();
      }
      throw e;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
}
