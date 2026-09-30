import JSZip from "jszip";
import { downloadBlob } from "@/lib/capture-detail-png";

/** 스마트스토어 세로 한 장 권장 상한(여유) — 플랫폼 5000px보다 낮게 잘라 업로드 안정성 확보 */
export const DEFAULT_SLICE_HEIGHT_PX = 4200;

/** 여러 장의 PNG를 `{base}-{플랫폼}-01.png…` 이름으로 ZIP 하나에 담아 내려받는다. */
export async function downloadPngPartsZip(opts: {
  parts: Blob[];
  baseName: string;
  platformLabel: string;
  zipName: string;
}): Promise<number> {
  const zip = new JSZip();
  opts.parts.forEach((part, i) => {
    const index = String(i + 1).padStart(2, "0");
    zip.file(`${opts.baseName}-${opts.platformLabel}-${index}.png`, part);
  });
  const blob = await zip.generateAsync({ type: "blob" });
  await downloadBlob(blob, opts.zipName);
  return opts.parts.length;
}
