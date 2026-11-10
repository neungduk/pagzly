/**
 * 508 — 브라우저에서 PDF/이미지를 JPEG 타일로 준비(Vision 전송용).
 * 원본은 서버에 저장하지 않음.
 */
import {
  OCR_IMAGE_MAX_BYTES_508,
  OCR_JPEG_QUALITY_508,
  OCR_LONG_EDGE_MAX_508,
  OCR_MAX_PAGES_508,
  OCR_MAX_TILES_PER_JOB_508,
  OCR_REQUEST_BODY_MAX_508,
  OCR_TILE_MAX_BYTES_508,
  ERR_OCR_HEIC_508,
  ERR_OCR_TOO_MANY_TILES_508,
} from "@/lib/label-check/ocr/constants";
import { computeVerticalTiles508, fitLongEdge508 } from "@/lib/label-check/ocr/slice-image";

const PDFJS_BASE = "/label-check-pdfjs";

export type OcrTilePayload508 = {
  base64: string;
  offsetY: number;
};

export type OcrPrepareResult508 =
  | { ok: true; tiles: OcrTilePayload508[] }
  | { ok: false; error: string };

type PdfjsDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (o: { scale: number }) => { width: number; height: number };
    render: (o: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }) => { promise: Promise<void> };
  }>;
  destroy?: () => Promise<void>;
};

async function loadPdfjs(): Promise<{
  getDocument: (o: { data: Uint8Array }) => { promise: Promise<PdfjsDoc> };
  GlobalWorkerOptions: { workerSrc: string };
}> {
  const w = window as Window & {
    pdfjsLib?: {
      getDocument: (o: { data: Uint8Array }) => { promise: Promise<PdfjsDoc> };
      GlobalWorkerOptions: { workerSrc: string };
    };
  };
  if (!w.pdfjsLib?.getDocument) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${PDFJS_BASE}/pdf.min.js`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("pdfjs"));
      document.head.appendChild(s);
    });
  }
  const pdfjs = w.pdfjsLib;
  if (!pdfjs) throw new Error("pdfjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
  return pdfjs;
}

function canvasToJpegBase64(canvas: HTMLCanvasElement, quality: number): string {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

async function shrinkJpegUnder(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<string> {
  let q = OCR_JPEG_QUALITY_508;
  let b64 = canvasToJpegBase64(canvas, q);
  while (b64.length * 0.75 > maxBytes && q > 0.5) {
    q -= 0.1;
    b64 = canvasToJpegBase64(canvas, q);
  }
  return b64;
}

async function bitmapToTiles(
  source: CanvasImageSource,
  width: number,
  height: number,
  baseOffsetY: number,
): Promise<OcrTilePayload508[]> {
  const fitted = fitLongEdge508(width, height, OCR_LONG_EDGE_MAX_508);
  const scaleCanvas = document.createElement("canvas");
  scaleCanvas.width = fitted.width;
  scaleCanvas.height = fitted.height;
  const sctx = scaleCanvas.getContext("2d");
  if (!sctx) throw new Error("canvas");
  sctx.drawImage(source, 0, 0, fitted.width, fitted.height);

  const { tiles, truncated } = computeVerticalTiles508(fitted.width, fitted.height);
  if (truncated) throw new Error(ERR_OCR_TOO_MANY_TILES_508);

  const out: OcrTilePayload508[] = [];
  for (const t of tiles) {
    const c = document.createElement("canvas");
    c.width = t.width;
    c.height = t.height;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(scaleCanvas, t.x, t.y, t.width, t.height, 0, 0, t.width, t.height);
    const base64 = await shrinkJpegUnder(c, OCR_TILE_MAX_BYTES_508);
    out.push({ base64, offsetY: baseOffsetY + t.y });
  }
  return out;
}

export function isOcrImageFile508(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = file.name.toLowerCase();
  if (t.includes("heic") || n.endsWith(".heic") || n.endsWith(".heif")) return false;
  return (
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/png" ||
    t === "image/webp" ||
    /\.(jpe?g|png|webp)$/i.test(n)
  );
}

export function isHeicFile508(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = file.name.toLowerCase();
  return t.includes("heic") || n.endsWith(".heic") || n.endsWith(".heif");
}

export async function prepareOcrTilesFromFile508(
  file: File,
  onProgress?: (n: number, N: number) => void,
): Promise<OcrPrepareResult508> {
  try {
    if (isHeicFile508(file)) return { ok: false, error: ERR_OCR_HEIC_508 };

    if (isOcrImageFile508(file)) {
      if (file.size > OCR_IMAGE_MAX_BYTES_508) {
        return { ok: false, error: "이미지 파일이 너무 큽니다(장당 10MB 이하)." };
      }
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("image"));
          el.src = url;
        });
        onProgress?.(1, 1);
        const tiles = await bitmapToTiles(img, img.naturalWidth, img.naturalHeight, 0);
        if (tiles.length > OCR_MAX_TILES_PER_JOB_508) {
          return { ok: false, error: ERR_OCR_TOO_MANY_TILES_508 };
        }
        return { ok: true, tiles };
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    // PDF
    const pdfjs = await loadPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    if (doc.numPages > OCR_MAX_PAGES_508) {
      await doc.destroy?.();
      return { ok: false, error: "PDF는 최대 10쪽까지 읽을 수 있어요." };
    }
    const all: OcrTilePayload508[] = [];
    let pageOffset = 0;
    for (let p = 1; p <= doc.numPages; p++) {
      onProgress?.(p, doc.numPages);
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const tiles = await bitmapToTiles(canvas, canvas.width, canvas.height, pageOffset);
      all.push(...tiles);
      pageOffset += canvas.height + 40;
      if (all.length > OCR_MAX_TILES_PER_JOB_508) {
        await doc.destroy?.();
        return { ok: false, error: ERR_OCR_TOO_MANY_TILES_508 };
      }
    }
    await doc.destroy?.();
    return { ok: true, tiles: all };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "prepare_failed";
    if (msg === ERR_OCR_TOO_MANY_TILES_508) return { ok: false, error: msg };
    return { ok: false, error: "사진을 준비하지 못했어요. 다른 파일로 시도해 주세요." };
  }
}

/** 4MB 본문 한도에 맞게 타일 배치 */
export function batchOcrTiles508(tiles: OcrTilePayload508[]): OcrTilePayload508[][] {
  const batches: OcrTilePayload508[][] = [];
  let cur: OcrTilePayload508[] = [];
  let size = 2; // JSON overhead
  for (const t of tiles) {
    const add = t.base64.length + 32;
    if (cur.length && size + add > OCR_REQUEST_BODY_MAX_508) {
      batches.push(cur);
      cur = [];
      size = 2;
    }
    cur.push(t);
    size += add;
  }
  if (cur.length) batches.push(cur);
  return batches;
}
