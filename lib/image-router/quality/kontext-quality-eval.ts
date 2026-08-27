import fs from "fs";
import path from "path";
import sharp from "sharp";

export type KontextQualityCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

export type KontextQualityReport = {
  originalPath: string;
  resultPath: string;
  comparisonPath: string;
  inputDimensions: { width: number; height: number };
  outputDimensions: { width: number; height: number };
  centerRegionSimilarity: number;
  edgeRegionSimilarity: number;
  checks: KontextQualityCheck[];
  overallPass: boolean;
};

async function loadImageBuffer(source: string): Promise<Buffer> {
  if (source.startsWith("data:")) {
    const base64 = source.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    return Buffer.from(base64, "base64");
  }
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch ${source}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (fs.existsSync(source)) {
    return fs.readFileSync(source);
  }
  throw new Error(`Cannot load image: ${source.slice(0, 80)}`);
}

/** 0~1 — 1에 가까울수록 유사 */
async function regionSimilarity(a: Buffer, b: Buffer): Promise<number> {
  const size = 256;
  const [left, right] = await Promise.all([
    sharp(a).resize(size, size, { fit: "cover" }).removeAlpha().raw().toBuffer(),
    sharp(b).resize(size, size, { fit: "cover" }).removeAlpha().raw().toBuffer(),
  ]);
  if (left.length !== right.length || left.length === 0) return 0;

  let sumSqDiff = 0;
  for (let i = 0; i < left.length; i += 1) {
    const d = left[i]! - right[i]!;
    sumSqDiff += d * d;
  }
  const rmse = Math.sqrt(sumSqDiff / left.length);
  return Math.max(0, 1 - rmse / 255);
}

async function extractRegion(buffer: Buffer, region: "center" | "edge"): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;

  if (region === "center") {
    const cw = Math.round(w * 0.5);
    const ch = Math.round(h * 0.5);
    const left = Math.round((w - cw) / 2);
    const top = Math.round((h - ch) / 2);
    return sharp(buffer).extract({ left, top, width: cw, height: ch }).png().toBuffer();
  }

  const corner = Math.max(32, Math.floor(Math.min(w, h) / 4));
  const corners = [
    { left: 0, top: 0 },
    { left: Math.max(0, w - corner), top: 0 },
    { left: 0, top: Math.max(0, h - corner) },
    { left: Math.max(0, w - corner), top: Math.max(0, h - corner) },
  ];
  const crops = await Promise.all(
    corners.map((c) =>
      sharp(buffer)
        .extract({ left: c.left, top: c.top, width: corner, height: corner })
        .png()
        .toBuffer(),
    ),
  );
  const stripH = corner;
  const stripW = corner * 2 + 4;
  return sharp({
    create: { width: stripW, height: stripH, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: crops[0]!, left: 0, top: 0 },
      { input: crops[1]!, left: corner + 4, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function saveSideBySide(
  original: Buffer,
  result: Buffer,
  outPath: string,
): Promise<void> {
  const height = 512;
  const [left, right] = await Promise.all([
    sharp(original).resize({ height, fit: "inside" }).png().toBuffer(),
    sharp(result).resize({ height, fit: "inside" }).png().toBuffer(),
  ]);
  const leftMeta = await sharp(left).metadata();
  const rightMeta = await sharp(right).metadata();
  const totalWidth = (leftMeta.width ?? 0) + (rightMeta.width ?? 0) + 8;
  const maxH = Math.max(leftMeta.height ?? height, rightMeta.height ?? height);

  await sharp({
    create: {
      width: totalWidth,
      height: maxH,
      channels: 3,
      background: { r: 245, g: 245, b: 245 },
    },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: (leftMeta.width ?? 0) + 8, top: 0 },
    ])
    .png()
    .toFile(outPath);
}

export async function evaluateKontextProductPreservation(params: {
  originalSource: string;
  resultSource: string;
  outputDir: string;
  /** 배경 교체: center(상품) 유사도 ≥ threshold, edge는 변경 허용 */
  minCenterSimilarity?: number;
}): Promise<KontextQualityReport> {
  const minCenter = params.minCenterSimilarity ?? 0.72;

  fs.mkdirSync(params.outputDir, { recursive: true });

  const originalBuf = await loadImageBuffer(params.originalSource);
  const resultBuf = await loadImageBuffer(params.resultSource);

  const originalPath = path.join(params.outputDir, "01-original.png");
  const resultPath = path.join(params.outputDir, "02-kontext-result.png");
  const comparisonPath = path.join(params.outputDir, "03-comparison.png");

  await sharp(originalBuf).png().toFile(originalPath);
  await sharp(resultBuf).png().toFile(resultPath);
  await saveSideBySide(originalBuf, resultBuf, comparisonPath);

  const [inMeta, outMeta] = await Promise.all([
    sharp(originalBuf).metadata(),
    sharp(resultBuf).metadata(),
  ]);

  const inputDimensions = { width: inMeta.width ?? 0, height: inMeta.height ?? 0 };
  const outputDimensions = { width: outMeta.width ?? 0, height: outMeta.height ?? 0 };

  const [origCenter, resCenter, origEdge, resEdge] = await Promise.all([
    extractRegion(originalBuf, "center"),
    extractRegion(resultBuf, "center"),
    extractRegion(originalBuf, "edge"),
    extractRegion(resultBuf, "edge"),
  ]);

  const centerRegionSimilarity = await regionSimilarity(origCenter, resCenter);
  const edgeRegionSimilarity = await regionSimilarity(origEdge, resEdge);

  const aspectIn = inputDimensions.width / Math.max(inputDimensions.height, 1);
  const aspectOut = outputDimensions.width / Math.max(outputDimensions.height, 1);
  const aspectDelta = Math.abs(aspectIn - aspectOut);

  const checks: KontextQualityCheck[] = [
    {
      name: "output_generated",
      passed: outputDimensions.width > 0 && outputDimensions.height > 0,
      detail: `${outputDimensions.width}x${outputDimensions.height}`,
    },
    {
      name: "aspect_ratio_preserved",
      passed: aspectDelta < 0.05,
      detail: `input AR ${aspectIn.toFixed(3)} → output ${aspectOut.toFixed(3)}`,
    },
    {
      name: "product_center_preserved",
      passed: centerRegionSimilarity >= minCenter,
      detail: `center similarity ${(centerRegionSimilarity * 100).toFixed(1)}% (min ${(minCenter * 100).toFixed(0)}%)`,
    },
    {
      name: "background_changed",
      passed: edgeRegionSimilarity < centerRegionSimilarity - 0.05 || edgeRegionSimilarity < 0.85,
      detail: `edge ${(edgeRegionSimilarity * 100).toFixed(1)}% vs center ${(centerRegionSimilarity * 100).toFixed(1)}%`,
    },
  ];

  const overallPass = checks.every((c) => c.passed);

  return {
    originalPath,
    resultPath,
    comparisonPath,
    inputDimensions,
    outputDimensions,
    centerRegionSimilarity,
    edgeRegionSimilarity,
    checks,
    overallPass,
  };
}
