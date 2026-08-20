/**
 * 기획안 PDF/DOCX 텍스트 추출 (구조화 없음).
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import mammoth from "mammoth";

export type PlanningDocResult = {
  text: string;
  cost: number;
};

let pdfWorkerReady = false;

async function ensurePdfWorker(): Promise<void> {
  if (pdfWorkerReady) return;
  const { PDFParse } = await import("pdf-parse");
  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
  );
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  pdfWorkerReady = true;
}

function samplePlanningText(text: string, maxChars = 8000): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}...(중략)`;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  await ensurePdfWorker();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return typeof result.text === "string" ? result.text : "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

/** PDF/DOCX에서 순수 텍스트만 추출 */
export async function extractPlanningDocText(
  fileBuffer: Buffer,
  fileType: "pdf" | "docx",
): Promise<PlanningDocResult> {
  try {
    const raw =
      fileType === "pdf"
        ? await extractPdfText(fileBuffer)
        : await extractDocxText(fileBuffer);
    const text = samplePlanningText(raw);
    console.log(`[planning-doc] ${fileType} 추출 ${text.length}자`);
    return { text, cost: 0 };
  } catch (error) {
    console.warn("[planning-doc] 텍스트 추출 실패", error);
    return { text: "", cost: 0 };
  }
}

export function formatPlanningDocBlock(text: string): string {
  if (!text.trim()) return "";
  return `## 참고 기획안 (톤·강조 포인트만 참고 — 섹션 구성은 무시하고 기존 템플릿 순서를 따를 것)
${text.trim()}
위 기획안의 섹션 순서·레이아웃은 무시하고, 카피 톤과 강조 포인트만 참고하세요.`;
}
