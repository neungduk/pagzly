/**
 * 508 — 네이버 CLOVA OCR General (KR).
 * enableTableDetection 미전송. 호출당 이미지 1개. fetch 주입 가능.
 */
import type { OcrLine508, OcrProvider508, OcrTileResult508, OcrWord508 } from "@/lib/label-check/ocr/provider";
import { OCR_PARALLEL_508 } from "@/lib/label-check/ocr/constants";
import { wrapFetchWithTimeout509 } from "@/lib/label-check/ocr/fetch-timeout";

export type ClovaFetch508 = typeof fetch;

function boxHeight(vertices?: Array<{ x?: number; y?: number }>): number {
  if (!vertices?.length) return 0;
  const ys = vertices.map((v) => v.y ?? 0);
  return Math.max(...ys) - Math.min(...ys);
}

function boxY(vertices?: Array<{ x?: number; y?: number }>): number {
  if (!vertices?.length) return 0;
  return Math.min(...vertices.map((v) => v.y ?? 0));
}

export function parseClovaResponse508(json: unknown, tileIndex: number): OcrTileResult508 {
  const root = json as {
    images?: Array<{
      inferResult?: string;
      fields?: Array<{
        inferText?: string;
        inferConfidence?: number;
        boundingPoly?: { vertices?: Array<{ x?: number; y?: number }> };
      }>;
    }>;
  };
  const img = root.images?.[0];
  if (!img || img.inferResult !== "SUCCESS") {
    return { tileIndex, lines: [], fullText: "", avgConfidence: 0 };
  }
  const lines: OcrLine508[] = [];
  for (const field of img.fields || []) {
    const text = (field.inferText || "").trim();
    if (!text) continue;
    const conf = typeof field.inferConfidence === "number" ? field.inferConfidence : 0;
    const words: OcrWord508[] = [
      {
        text,
        confidence: conf,
        boxHeightPx: boxHeight(field.boundingPoly?.vertices),
        y: boxY(field.boundingPoly?.vertices),
      },
    ];
    lines.push({
      text,
      confidence: conf,
      words,
      y: boxY(field.boundingPoly?.vertices),
    });
  }
  const fullText = lines.map((l) => l.text).join("\n");
  const avg = lines.length ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length : 0;
  return { tileIndex, lines, fullText, avgConfidence: avg };
}

export function createClovaProvider508(opts: {
  invokeUrl: string;
  secret: string;
  fetchImpl?: ClovaFetch508;
  parallel?: number;
}): OcrProvider508 {
  const fetchImpl = wrapFetchWithTimeout509(opts.fetchImpl || fetch);
  const parallel = opts.parallel ?? OCR_PARALLEL_508;

  return {
    name: "clova-general",
    async annotateDocumentText({ imagesBase64 }) {
      const results: OcrTileResult508[] = new Array(imagesBase64.length);
      let cursor = 0;
      async function worker() {
        while (cursor < imagesBase64.length) {
          const i = cursor++;
          const b64 = imagesBase64[i]!;
          const body = {
            version: "V2",
            requestId: crypto.randomUUID(),
            timestamp: Date.now(),
            lang: "ko",
            images: [{ format: "jpg", name: `tile-${i}`, data: b64 }],
          };
          // 509: 호출당 8s. 시간 초과 조각은 이미 consume한 수를 되돌리지 않음(보수적).
          const res = await fetchImpl(opts.invokeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-OCR-SECRET": opts.secret,
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            // 진단용: HTTP 상태와 CLOVA 오류 코드(숫자 4자리)만 남긴다. 본문 원문·키는 남기지 않는다.
            let codeSuffix = "";
            try {
              const j = (await res.json()) as { code?: unknown };
              const c = typeof j?.code === "string" || typeof j?.code === "number" ? String(j.code) : "";
              if (/^\d{1,5}$/.test(c)) codeSuffix = `_${c}`;
            } catch {
              /* 본문이 JSON이 아니면 무시 */
            }
            const err = new Error(`CLOVA_HTTP_${res.status}${codeSuffix}`);
            (err as Error & { status?: number }).status = res.status;
            throw err;
          }
          const json = (await res.json()) as unknown;
          results[i] = parseClovaResponse508(json, i);
        }
      }
      const workers = Array.from({ length: Math.min(parallel, imagesBase64.length || 1) }, () =>
        worker(),
      );
      await Promise.all(workers);
      return results as OcrTileResult508[];
    },
  };
}

export function isClovaConfigured508(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean((env.CLOVA_OCR_INVOKE_URL || "").trim() && (env.CLOVA_OCR_SECRET || "").trim());
}
