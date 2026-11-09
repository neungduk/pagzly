/**
 * 499 — 브라우저에서 pdfjs(public 스크립트)로 텍스트·크기만 추출.
 * `/label-check` 계열에서만 동적 import. 번들에 pdfjs를 넣지 않음(canvas/node 회피).
 */
import type { ExtractedLabelPayload } from "@/lib/label-check/extracted-payload-shared";
import { MAX_PDF_PAGES_485 } from "@/lib/label-check/extracted-payload-shared";

const PDFJS_BASE = "/label-check-pdfjs";

type PdfjsModule = {
  getDocument: (opts: {
    data: Uint8Array;
    disableFontFace?: boolean;
    disableWorker?: boolean;
  }) => { promise: Promise<PdfjsDoc> };
  GlobalWorkerOptions: { workerSrc: string };
  disableWorker?: boolean;
};

type PdfjsDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
  }>;
  destroy?: () => Promise<void>;
};

type PdfjsWindow = Window & { pdfjsLib?: PdfjsModule };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-lc-pdfjs="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.lcPdfjs = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("pdfjs_script_failed"));
    document.head.appendChild(s);
  });
}

async function loadPdfjs(): Promise<PdfjsModule> {
  if (typeof window === "undefined") throw new Error("browser_only");
  const w = window as PdfjsWindow;
  if (w.pdfjsLib?.getDocument) {
    w.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
    return w.pdfjsLib;
  }
  await loadScript(`${PDFJS_BASE}/pdf.min.js`);
  const pdfjs = w.pdfjsLib;
  if (!pdfjs?.getDocument) throw new Error("pdfjs_missing");
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
  } catch {
    /* ignore */
  }
  return pdfjs;
}

/**
 * @returns payload 또는 throw (호출부가 폴백)
 */
export async function extractLabelPdfInBrowser(file: File): Promise<ExtractedLabelPayload> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());

  let doc: PdfjsDoc;
  try {
    doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  } catch {
    if (typeof pdfjs.disableWorker === "boolean") pdfjs.disableWorker = true;
    doc = await pdfjs
      .getDocument({ data, disableFontFace: true, disableWorker: true })
      .promise;
  }

  try {
    if (doc.numPages > MAX_PDF_PAGES_485) {
      throw new Error("TOO_MANY_PAGES");
    }
    const pages: ExtractedLabelPayload["pages"] = [];
    const emptyPages: number[] = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items: ExtractedLabelPayload["pages"][0]["items"] = [];
      let line = "";
      for (const it of content.items) {
        const str = typeof it.str === "string" ? it.str : "";
        if (!str) continue;
        const t = it.transform;
        const sizePt =
          t && t.length >= 4
            ? Math.max(Math.hypot(t[0], t[1]), Math.hypot(t[2], t[3]))
            : 0;
        items.push({
          text: str.normalize("NFC"),
          sizePt: sizePt > 0 ? Math.round(sizePt * 100) / 100 : 0,
        });
        line += str;
      }
      pages.push({ page: p, items });
      if (!line.trim()) emptyPages.push(p);
    }

    return {
      pageCount: doc.numPages,
      pages,
      emptyPages,
    };
  } finally {
    if (typeof doc.destroy === "function") await doc.destroy().catch(() => undefined);
  }
}
