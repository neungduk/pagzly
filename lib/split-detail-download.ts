import JSZip from "jszip";

/** 스마트스토어 세로 한 장 권장 상한(여유) — 플랫폼 5000px보다 낮게 잘라 업로드 안정성 확보 */
export const DEFAULT_SLICE_HEIGHT_PX = 4200;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = dataUrl;
  });
}

/** 긴 상세 PNG를 세로 슬라이스로 분할 (후커블·마켓 다장 업로드 대응) */
export async function slicePngDataUrl(
  dataUrl: string,
  sliceHeight = DEFAULT_SLICE_HEIGHT_PX,
): Promise<string[]> {
  const img = await loadImage(dataUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (height <= sliceHeight) return [dataUrl];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas를 사용할 수 없습니다.");

  canvas.width = width;
  const slices: string[] = [];
  let y = 0;
  let part = 1;

  while (y < height) {
    const h = Math.min(sliceHeight, height - y);
    canvas.height = h;
    ctx.clearRect(0, 0, width, h);
    ctx.drawImage(img, 0, y, width, h, 0, 0, width, h);
    slices.push(canvas.toDataURL("image/png"));
    y += h;
    part += 1;
    void part;
  }

  return slices;
}

export async function downloadPngSlicesZip(opts: {
  dataUrl: string;
  baseName: string;
  platformLabel: string;
  sliceHeight?: number;
}): Promise<number> {
  const slices = await slicePngDataUrl(opts.dataUrl, opts.sliceHeight);
  const zip = new JSZip();

  slices.forEach((slice, i) => {
    const base64 = slice.replace(/^data:image\/png;base64,/, "");
    const index = String(i + 1).padStart(2, "0");
    zip.file(`${opts.baseName}-${opts.platformLabel}-${index}.png`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${opts.baseName}-${opts.platformLabel}-분할.zip`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  return slices.length;
}
