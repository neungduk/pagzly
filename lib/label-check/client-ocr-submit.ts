/**
 * 508 — OCR API 호출(배치 순차) + 텍스트 점검(ocrFromPhoto).
 */
import { readLabelCheckApiFailure } from "@/lib/label-check/api-errors";
import {
  batchOcrTiles508,
  prepareOcrTilesFromFile508,
  type OcrTilePayload508,
} from "@/lib/label-check/client-ocr-prepare";
import {
  PROGRESS_OCR_PREP_508,
  PROGRESS_OCR_READ_508,
} from "@/lib/label-check/ocr/constants";
import type { ClientSubmitOptions, ClientSubmitOk, ClientSubmitFail } from "@/lib/label-check/client-submit";
import { submitLabelCheckTextClient } from "@/lib/label-check/client-submit";

export type OcrReviewPayload508 = {
  text: string;
  rawText: string;
  corrections: string[];
  avgConfidence: number;
  netContentConflict: boolean;
};

export async function fetchOcrAvailable508(): Promise<boolean> {
  try {
    const res = await fetch("/api/label-check/ocr");
    if (!res.ok) return false;
    const j = (await res.json()) as { available?: boolean };
    return Boolean(j.available);
  } catch {
    return false;
  }
}

export async function runOcrFromFile508(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<{ ok: true; review: OcrReviewPayload508 } | { ok: false; error: string }> {
  const prepared = await prepareOcrTilesFromFile508(file, (n, N) => {
    onProgress?.(PROGRESS_OCR_PREP_508(n, N));
  });
  if (!prepared.ok) return prepared;

  onProgress?.(PROGRESS_OCR_READ_508);
  const batches = batchOcrTiles508(prepared.tiles);
  const texts: string[] = [];
  const raws: string[] = [];
  const corrections: string[] = [];
  let confSum = 0;
  let confN = 0;
  let conflict = false;

  for (const batch of batches) {
    const body = JSON.stringify({
      imagesBase64: batch.map((t) => t.base64),
      tileOffsetY: batch.map((t) => t.offsetY),
    });
    const res = await fetch("/api/label-check/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      const fail = await readLabelCheckApiFailure(res);
      return { ok: false, error: fail.error };
    }
    const j = (await res.json()) as {
      text?: string;
      rawText?: string;
      corrections?: string[];
      avgConfidence?: number;
      netContentConflict?: boolean;
    };
    if (j.text) texts.push(j.text);
    if (j.rawText) raws.push(j.rawText);
    if (j.corrections?.length) corrections.push(...j.corrections);
    if (typeof j.avgConfidence === "number") {
      confSum += j.avgConfidence;
      confN += 1;
    }
    if (j.netContentConflict) conflict = true;
  }

  return {
    ok: true,
    review: {
      text: texts.join("\n"),
      rawText: raws.join("\n"),
      corrections: [...new Set(corrections)].slice(0, 20),
      avgConfidence: confN ? confSum / confN : 0,
      netContentConflict: conflict,
    },
  };
}

export async function submitOcrReviewedText508(
  text: string,
  opts: ClientSubmitOptions & { avgOcrConfidence?: number },
): Promise<ClientSubmitOk | ClientSubmitFail> {
  return submitLabelCheckTextClient(text, {
    ...opts,
    scope: "full",
    ocrFromPhoto: true,
    avgOcrConfidence: opts.avgOcrConfidence,
  });
}

export type { OcrTilePayload508 };
