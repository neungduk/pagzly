/**
 * 508/518 — 브라우저에서 PDF/이미지를 JPEG 타일로 준비(Vision 전송용).
 * 원본은 서버에 저장하지 않음.
 * 518: 폭 기준 축소 + PDF 세로 구간 렌더(16MP 캔버스 금지).
 */
import {
  OCR_IMAGE_MAX_BYTES_508,
  OCR_JPEG_QUALITY_508,
  OCR_LONG_EDGE_MAX_508,
  OCR_MAX_PAGES_508,
  OCR_MAX_TILES_PER_JOB_508,
  OCR_REQUEST_BODY_MAX_508,
  OCR_TILE_HEIGHT_508,
  OCR_TILE_MAX_BYTES_508,
  OCR_TILE_OVERLAP_508,
  OCR_TARGET_WIDTH_518,
  OCR_WIDTH_CAP_518,
  OCR_WIDTH_FALLBACKS_518,
  OCR_CANVAS_MAX_PIXELS_518,
  ERR_OCR_HEIC_508,
  ERR_OCR_TOO_MANY_TILES_508,
} from "@/lib/label-check/ocr/constants";
import {
  chooseTargetWidth518,
  computeVerticalTiles508,
  fitLongEdge508,
  fitWidth518,
  pdfRenderScale518,
} from "@/lib/label-check/ocr/slice-image";

const PDFJS_BASE = "/label-check-pdfjs";

export type OcrTilePayload508 = {
  base64: string;
  offsetY: number;
};

export type OcrPrepareMeta518 = {
  renderScale: number;
  targetWidth: number;
  tiles: number;
  truncated: boolean;
  sourceWidth: number;
  sourceHeight: number;
};

export type OcrPrepareResult508 =
  | { ok: true; tiles: OcrTilePayload508[]; meta?: OcrPrepareMeta518 }
  | { ok: false; error: string };

type PdfjsPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    transform?: number[];
  }) => { promise: Promise<void> };
};

type PdfjsDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfjsPage>;
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

function assertCanvasPixels(w: number, h: number): void {
  if (w * h > OCR_CANVAS_MAX_PIXELS_518) {
    throw new Error("canvas_too_large");
  }
}

/** 가로로 긴 이미지는 긴 변 상한, 세로는 폭 기준 */
export function fitBitmapSize518(
  width: number,
  height: number,
  targetWidth: number,
): { width: number; height: number; scale: number } {
  if (width > height) {
    const byLong = fitLongEdge508(width, height, OCR_LONG_EDGE_MAX_508);
    const byW = fitWidth518(byLong.width, byLong.height, Math.min(targetWidth, OCR_WIDTH_CAP_518));
    return byW;
  }
  return fitWidth518(width, height, Math.min(targetWidth, OCR_WIDTH_CAP_518));
}

async function bitmapToTiles(
  source: CanvasImageSource,
  width: number,
  height: number,
  baseOffsetY: number,
  tileHeightPx = OCR_TILE_HEIGHT_508,
  targetWidth = OCR_TARGET_WIDTH_518,
): Promise<{ tiles: OcrTilePayload508[]; truncated: boolean; fittedW: number; fittedH: number }> {
  const choice = chooseTargetWidth518(
    width,
    height,
    width > height
      ? [Math.min(targetWidth, OCR_WIDTH_CAP_518)]
      : OCR_WIDTH_FALLBACKS_518,
    tileHeightPx,
    OCR_TILE_OVERLAP_508,
    OCR_MAX_TILES_PER_JOB_508,
  );
  const fitted = fitBitmapSize518(width, height, choice.targetWidth);
  assertCanvasPixels(fitted.width, Math.min(fitted.height, tileHeightPx + OCR_TILE_OVERLAP_508));

  const { tiles, truncated } = computeVerticalTiles508(fitted.width, fitted.height, {
    tileHeight: tileHeightPx,
  });

  // 전체 축소 캔버스가 16MP를 넘으면 타일별로 원본에서 직접 크롭·스케일
  const fullPixels = fitted.width * fitted.height;
  const out: OcrTilePayload508[] = [];

  if (fullPixels <= OCR_CANVAS_MAX_PIXELS_518) {
    const scaleCanvas = document.createElement("canvas");
    scaleCanvas.width = fitted.width;
    scaleCanvas.height = fitted.height;
    const sctx = scaleCanvas.getContext("2d");
    if (!sctx) throw new Error("canvas");
    sctx.drawImage(source, 0, 0, fitted.width, fitted.height);
    for (const t of tiles) {
      assertCanvasPixels(t.width, t.height);
      const c = document.createElement("canvas");
      c.width = t.width;
      c.height = t.height;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(scaleCanvas, t.x, t.y, t.width, t.height, 0, 0, t.width, t.height);
      const base64 = await shrinkJpegUnder(c, OCR_TILE_MAX_BYTES_508);
      out.push({ base64, offsetY: baseOffsetY + t.y });
    }
  } else {
    const sx = width / fitted.width;
    const sy = height / fitted.height;
    for (const t of tiles) {
      assertCanvasPixels(t.width, t.height);
      const c = document.createElement("canvas");
      c.width = t.width;
      c.height = t.height;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(
        source,
        t.x * sx,
        t.y * sy,
        t.width * sx,
        t.height * sy,
        0,
        0,
        t.width,
        t.height,
      );
      const base64 = await shrinkJpegUnder(c, OCR_TILE_MAX_BYTES_508);
      out.push({ base64, offsetY: baseOffsetY + t.y });
    }
  }

  return { tiles: out, truncated, fittedW: fitted.width, fittedH: fitted.height };
}

/**
 * PDF 페이지를 세로 구간별로 렌더(한 번에 전체 캔버스 금지).
 * scale = clamp(targetW/pageWidthPt, 1.5, 5)
 */
async function renderPdfPageStrips518(
  page: PdfjsPage,
  targetWidth: number,
  tileHeightPx: number,
  baseOffsetY: number,
  maxTilesLeft: number,
): Promise<{ tiles: OcrTilePayload508[]; truncated: boolean; renderScale: number; pageCssH: number }> {
  const baseVp = page.getViewport({ scale: 1 });
  const scale = pdfRenderScale518(baseVp.width, targetWidth);
  const viewport = page.getViewport({ scale });
  const pageW = Math.floor(viewport.width);
  const pageH = Math.floor(viewport.height);
  const stripH = tileHeightPx + OCR_TILE_OVERLAP_508;
  const step = Math.max(1, tileHeightPx - OCR_TILE_OVERLAP_508);

  const out: OcrTilePayload508[] = [];
  let y = 0;
  let truncated = false;
  while (y < pageH) {
    if (out.length >= maxTilesLeft) {
      truncated = true;
      break;
    }
    const h = Math.min(stripH, pageH - y);
    assertCanvasPixels(pageW, h);
    const canvas = document.createElement("canvas");
    canvas.width = pageW;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    // 전체 viewport를 그리되 canvas 원점을 -y로 올려 구간만 담음
    await page
      .render({
        canvasContext: ctx,
        viewport,
        transform: [1, 0, 0, 1, 0, -y],
      })
      .promise;
    const base64 = await shrinkJpegUnder(canvas, OCR_TILE_MAX_BYTES_508);
    out.push({ base64, offsetY: baseOffsetY + y });
    if (y + h >= pageH) break;
    y += step;
  }
  return { tiles: out, truncated, renderScale: scale, pageCssH: pageH };
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
  opts?: { tileHeightPx?: number },
): Promise<OcrPrepareResult508> {
  const tileH = opts?.tileHeightPx ?? OCR_TILE_HEIGHT_508;
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
        const { tiles, truncated, fittedW, fittedH } = await bitmapToTiles(
          img,
          img.naturalWidth,
          img.naturalHeight,
          0,
          tileH,
        );
        const limited = tiles.slice(0, OCR_MAX_TILES_PER_JOB_508);
        const wasTrunc = truncated || tiles.length > OCR_MAX_TILES_PER_JOB_508;
        return {
          ok: true,
          tiles: limited,
          meta: {
            renderScale: fittedW / Math.max(1, img.naturalWidth),
            targetWidth: fittedW,
            tiles: limited.length,
            truncated: wasTrunc,
            sourceWidth: img.naturalWidth,
            sourceHeight: img.naturalHeight,
          },
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    // PDF — 구간 렌더
    const pdfjs = await loadPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    if (doc.numPages > OCR_MAX_PAGES_508) {
      await doc.destroy?.();
      return { ok: false, error: "PDF는 최대 10쪽까지 읽을 수 있어요." };
    }
    const all: OcrTilePayload508[] = [];
    let pageOffset = 0;
    let lastScale = 1.5;
    let lastTarget = OCR_TARGET_WIDTH_518;
    let anyTrunc = false;
    let srcW = 0;
    let srcH = 0;

    for (let p = 1; p <= doc.numPages; p++) {
      onProgress?.(p, doc.numPages);
      const page = await doc.getPage(p);
      const baseVp = page.getViewport({ scale: 1 });
      srcW = baseVp.width;
      srcH += baseVp.height;

      let chosenW = OCR_TARGET_WIDTH_518;
      for (const tw of OCR_WIDTH_FALLBACKS_518) {
        const scale = pdfRenderScale518(baseVp.width, tw);
        const cssW = Math.floor(baseVp.width * scale);
        const cssH = Math.floor(baseVp.height * scale);
        const est = chooseTargetWidth518(
          cssW,
          cssH,
          [cssW],
          tileH,
          OCR_TILE_OVERLAP_508,
          OCR_MAX_TILES_PER_JOB_508 - all.length,
        );
        chosenW = tw;
        if (!est.truncated) break;
      }

      const left = OCR_MAX_TILES_PER_JOB_508 - all.length;
      if (left <= 0) {
        anyTrunc = true;
        break;
      }
      const strip = await renderPdfPageStrips518(page, chosenW, tileH, pageOffset, left);
      all.push(...strip.tiles);
      lastScale = strip.renderScale;
      lastTarget = Math.floor(baseVp.width * strip.renderScale);
      pageOffset += strip.pageCssH + 40;
      if (strip.truncated) {
        anyTrunc = true;
        break;
      }
    }
    await doc.destroy?.();
    return {
      ok: true,
      tiles: all,
      meta: {
        renderScale: lastScale,
        targetWidth: lastTarget,
        tiles: all.length,
        truncated: anyTrunc,
        sourceWidth: srcW,
        sourceHeight: srcH,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "prepare_failed";
    if (msg === ERR_OCR_TOO_MANY_TILES_508) return { ok: false, error: msg };
    return { ok: false, error: "사진을 준비하지 못했어요. 다른 파일로 시도해 주세요." };
  }
}

/**
 * 4MB 본문 한도 + 509 공급자별 조각 상한(CLOVA 6 / Google 8)에 맞게 타일 배치.
 */
export function batchOcrTiles508(
  tiles: OcrTilePayload508[],
  opts?: { maxTilesPerRequest?: number },
): OcrTilePayload508[][] {
  const maxTiles = opts?.maxTilesPerRequest ?? 8;
  const batches: OcrTilePayload508[][] = [];
  let cur: OcrTilePayload508[] = [];
  let size = 2; // JSON overhead
  for (const t of tiles) {
    const add = t.base64.length + 32;
    const overBytes = cur.length && size + add > OCR_REQUEST_BODY_MAX_508;
    const overCount = cur.length >= maxTiles;
    if (overBytes || overCount) {
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
