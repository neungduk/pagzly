/**
 * 508 — Google Cloud Vision REST (DOCUMENT_TEXT_DETECTION).
 * 키·응답 원문은 로그하지 않음. fetch는 주입 가능(회귀용).
 */
import type { OcrLine508, OcrProvider508, OcrTileResult508, OcrWord508 } from "@/lib/label-check/ocr/provider";
import { OCR_PARALLEL_508 } from "@/lib/label-check/ocr/constants";
import { wrapFetchWithTimeout509 } from "@/lib/label-check/ocr/fetch-timeout";

export type VisionFetch508 = typeof fetch;

type VisionVertex = { x?: number; y?: number };
type VisionBox = { vertices?: VisionVertex[] };

function boxHeight(box?: VisionBox): number {
  const vs = box?.vertices || [];
  if (vs.length < 2) return 0;
  const ys = vs.map((v) => v.y ?? 0);
  return Math.max(...ys) - Math.min(...ys);
}

function boxY(box?: VisionBox): number {
  const vs = box?.vertices || [];
  if (!vs.length) return 0;
  return Math.min(...vs.map((v) => v.y ?? 0));
}

function parseAnnotateResponse(json: unknown, tileIndex: number): OcrTileResult508 {
  const root = json as {
    responses?: Array<{
      fullTextAnnotation?: {
        text?: string;
        pages?: Array<{
          blocks?: Array<{
            paragraphs?: Array<{
              words?: Array<{
                confidence?: number;
                boundingBox?: VisionBox;
                symbols?: Array<{
                  text?: string;
                  confidence?: number;
                  property?: { detectedBreak?: { type?: string } };
                }>;
              }>;
              confidence?: number;
              boundingBox?: VisionBox;
            }>;
          }>;
        }>;
      };
      textAnnotations?: Array<{ description?: string; boundingPoly?: VisionBox }>;
      error?: { message?: string };
    }>;
  };
  const resp = root.responses?.[0];
  if (!resp || resp.error) {
    return { tileIndex, lines: [], fullText: "", avgConfidence: 0 };
  }
  const full = resp.fullTextAnnotation;
  const lines: OcrLine508[] = [];
  const pages = full?.pages || [];
  for (const page of pages) {
    for (const block of page.blocks || []) {
      for (const para of block.paragraphs || []) {
        const words: OcrWord508[] = [];
        let confSum = 0;
        let confN = 0;
        let text = "";
        for (const w of para.words || []) {
          // 단어 사이 공백/줄바꿈은 마지막 글자의 detectedBreak 로 복원한다(없으면 붙어 읽힘).
          const syms = w.symbols || [];
          const t = syms.map((s) => s.text || "").join("");
          const brk = syms[syms.length - 1]?.property?.detectedBreak?.type;
          const sep = brk === "LINE_BREAK" ? "\n" : brk === "SPACE" || brk === "SURE_SPACE" || brk === "EOL_SURE_SPACE" ? " " : "";
          const c = typeof w.confidence === "number" ? w.confidence : 0;
          words.push({
            text: t,
            confidence: c,
            boxHeightPx: boxHeight(w.boundingBox),
            y: boxY(w.boundingBox),
          });
          text += t + sep;
          confSum += c;
          confN += 1;
        }
        const lineConf =
          typeof para.confidence === "number"
            ? para.confidence
            : confN
              ? confSum / confN
              : 0;
        if (text.trim()) {
          lines.push({
            text: text.trim(),
            confidence: lineConf,
            words,
            y: boxY(para.boundingBox),
          });
        }
      }
    }
  }
  // fallback: textAnnotations[0] = full text
  let fullText = (full?.text || "").trim();
  if (!fullText && resp.textAnnotations?.[0]?.description) {
    fullText = resp.textAnnotations[0].description.trim();
    if (!lines.length) {
      lines.push({
        text: fullText,
        confidence: 0.5,
        words: [],
        y: 0,
      });
    }
  }
  const avg =
    lines.length > 0
      ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length
      : 0;
  return { tileIndex, lines, fullText, avgConfidence: avg };
}

export function createVisionProvider508(opts: {
  apiKey: string;
  fetchImpl?: VisionFetch508;
  parallel?: number;
}): OcrProvider508 {
  const fetchImpl = wrapFetchWithTimeout509(opts.fetchImpl || fetch);
  const parallel = opts.parallel ?? OCR_PARALLEL_508;
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(opts.apiKey)}`;

  return {
    name: "google-vision-document-text",
    async annotateDocumentText({ imagesBase64, languageHints }) {
      const results: OcrTileResult508[] = new Array(imagesBase64.length);
      let cursor = 0;
      async function worker() {
        while (cursor < imagesBase64.length) {
          const i = cursor++;
          const b64 = imagesBase64[i]!;
          const body = {
            requests: [
              {
                image: { content: b64 },
                features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
                imageContext: {
                  languageHints: languageHints || ["ko", "en"],
                },
              },
            ],
          };
          // 509: 호출당 8s. 시간 초과 조각은 이미 consume한 수를 되돌리지 않음(보수적).
          const res = await fetchImpl(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const err = new Error(`VISION_HTTP_${res.status}`);
            (err as Error & { status?: number }).status = res.status;
            throw err;
          }
          const json = (await res.json()) as unknown;
          results[i] = parseAnnotateResponse(json, i);
        }
      }
      const workers = Array.from({ length: Math.min(parallel, imagesBase64.length) }, () =>
        worker(),
      );
      await Promise.all(workers);
      return results as OcrTileResult508[];
    },
  };
}

/** 회귀·핸들러용: 응답 파서 export */
export { parseAnnotateResponse as parseVisionAnnotateResponse508 };
