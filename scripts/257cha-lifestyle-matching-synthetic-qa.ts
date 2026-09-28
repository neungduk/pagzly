/**
 * 257차 — 211차 매칭 3축(화이트밸런스·선명도·그레인) 합성 QA 하네스. 완전 오프라인.
 *
 * pasteCutoutOnScene()을 plateRisk 게이트 없이 직접 호출해 현재 매칭 코드(211 WB/선명도/그레인,
 * 218 상수, 234 실루엣 그림자, 235 페더)의 결과를 본다. 비교용으로 같은 컷아웃·같은 좌표에
 * sharp().composite()만 쓴 raw 붙이기 버전도 만든다.
 *
 * 실행: npx tsx scripts/257cha-lifestyle-matching-synthetic-qa.ts
 * 산출: review/257cha-lifestyle-matching-qa/
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "review", "257cha-lifestyle-matching-qa");

type KeyMode = "dark-bg" | "light-bg";

type Pair = {
  id: string;
  productPath: string;
  scenePath: string;
  keyMode: KeyMode;
  lumLow: number;
  lumHigh: number;
  placement: HeldObjectPlacement;
};

const PAIRS: Pair[] = [
  {
    id: "electronics-A",
    productPath: path.join(ROOT, "scripts", "test-assets", "전자제품", "02-pexels-33936400.jpeg"),
    scenePath: path.join(ROOT, "scripts", "test-assets", "전자기기-액세서리", "01-pexels-35599938.jpeg"),
    keyMode: "dark-bg",
    lumLow: 18,
    lumHigh: 40,
    placement: { xPct: 28, yPct: 42, wPct: 26, hPct: 22, rotationDeg: -8, confidence: "high" },
  },
];

/**
 * QA 전용 합성 컷아웃 — rembg 품질을 재현하지 않음, 매칭 로직 격리 테스트용.
 * dark-bg: lum < lumLow → alpha 0, lum >= lumHigh → 원래 알파 유지, 사이는 선형 보간.
 * light-bg: 같은 규칙을 (255 - lum)에 적용.
 * 투명 여백은 alpha >= 128 픽셀의 bbox(+2% 패딩)로 잘라낸다 — 안 자르면 683x1024 캔버스 대부분이
 * 투명이라 placement 박스 안에서 상품이 아주 작게 들어감.
 */
async function makeSyntheticCutout(
  input: Buffer,
  opts: { keyMode: KeyMode; lumLow: number; lumHigh: number },
): Promise<{ png: Buffer; stats: Record<string, number> }> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let transparent = 0;
  let opaque = 0;
  let soft = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const lumRaw = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const lum = opts.keyMode === "dark-bg" ? lumRaw : 255 - lumRaw;
      const origAlpha = data[i + 3];
      let alpha: number;
      if (lum < opts.lumLow) {
        alpha = 0;
        transparent++;
      } else if (lum >= opts.lumHigh) {
        alpha = origAlpha;
        opaque++;
      } else {
        alpha = Math.round((origAlpha * (lum - opts.lumLow)) / (opts.lumHigh - opts.lumLow));
        soft++;
      }
      data[i + 3] = alpha;
      if (alpha >= 128) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("synthetic cutout: 불투명 픽셀 없음");
  const padX = Math.round(width * 0.02);
  const padY = Math.round(height * 0.02);
  const left = Math.max(0, minX - padX);
  const top = Math.max(0, minY - padY);
  const cropW = Math.min(width, maxX + padX + 1) - left;
  const cropH = Math.min(height, maxY + padY + 1) - top;
  const png = await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();
  const total = width * height;
  return {
    png,
    stats: {
      srcWidth: width,
      srcHeight: height,
      transparentRatio: +(transparent / total).toFixed(4),
      softRatio: +(soft / total).toFixed(4),
      opaqueRatio: +(opaque / total).toFixed(4),
      cropLeft: left,
      cropTop: top,
      cropWidth: cropW,
      cropHeight: cropH,
    },
  };
}

/** pasteCutoutOnScene과 같은 기하(rotate → inside resize → 박스 중앙 → 클램프)만 재현, 매칭·페더·그림자 없음. */
async function rawPaste(sceneBuffer: Buffer, cutoutBuffer: Buffer, placement: HeldObjectPlacement) {
  const meta = await sharp(sceneBuffer).metadata();
  const sceneW = meta.width ?? 1;
  const sceneH = meta.height ?? 1;
  const targetW = Math.max(8, Math.round(sceneW * (placement.wPct / 100)));
  const targetH = Math.max(8, Math.round(sceneH * (placement.hPct / 100)));
  const left = Math.round(sceneW * (placement.xPct / 100));
  const top = Math.round(sceneH * (placement.yPct / 100));
  const rotated = await sharp(cutoutBuffer)
    .rotate(placement.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const prepared = await sharp(rotated)
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const cm = await sharp(prepared).metadata();
  const cutW = cm.width ?? targetW;
  const cutH = cm.height ?? targetH;
  let pasteLeft = left + Math.round((targetW - cutW) / 2);
  let pasteTop = top + Math.round((targetH - cutH) / 2);
  pasteLeft = Math.max(0, Math.min(pasteLeft, Math.max(0, sceneW - cutW)));
  pasteTop = Math.max(0, Math.min(pasteTop, Math.max(0, sceneH - cutH)));
  const png = await sharp(sceneBuffer)
    .composite([{ input: prepared, left: pasteLeft, top: pasteTop }])
    .png()
    .toBuffer();
  return { png, box: { left: pasteLeft, top: pasteTop, width: cutW, height: cutH }, sceneW, sceneH };
}

async function regionStats(buf: Buffer, box: { left: number; top: number; width: number; height: number }) {
  // stats()는 파이프라인 연산(extract)을 무시하고 입력 전체를 재므로 먼저 버퍼로 잘라낸다.
  const cropped = await sharp(buf).extract(box).removeAlpha().png().toBuffer();
  const s = await sharp(cropped).stats();
  return s.channels.slice(0, 3).map((c, i) => ({
    ch: "RGB"[i],
    mean: +c.mean.toFixed(2),
    stdev: +c.stdev.toFixed(2),
  }));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results: Record<string, unknown>[] = [];

  for (const pair of PAIRS) {
    const productBuf = fs.readFileSync(pair.productPath);
    const sceneBuffer = await sharp(fs.readFileSync(pair.scenePath)).png().toBuffer();

    const { png: syntheticCutout, stats: cutStats } = await makeSyntheticCutout(productBuf, pair);
    fs.writeFileSync(path.join(OUT_DIR, `${pair.id}-synthetic-cutout.png`), syntheticCutout);

    const matched = await pasteCutoutOnScene({ sceneBuffer, cutoutBuffer: syntheticCutout, placement: pair.placement });
    fs.writeFileSync(path.join(OUT_DIR, `${pair.id}-matched.png`), matched);

    const raw = await rawPaste(sceneBuffer, syntheticCutout, pair.placement);
    fs.writeFileSync(path.join(OUT_DIR, `${pair.id}-raw-baseline.png`), raw.png);

    const { sceneW, sceneH, box } = raw;
    const zoomPad = Math.round(Math.max(box.width, box.height) * 0.35);
    const zoomBox = {
      left: Math.max(0, box.left - zoomPad),
      top: Math.max(0, box.top - zoomPad),
      width: 0,
      height: 0,
    };
    zoomBox.width = Math.min(sceneW, box.left + box.width + zoomPad) - zoomBox.left;
    zoomBox.height = Math.min(sceneH, box.top + box.height + zoomPad) - zoomBox.top;

    const zoom = async (b: Buffer) =>
      sharp(b).extract(zoomBox).resize({ width: zoomBox.width * 2, kernel: "nearest" }).png().toBuffer();
    const rawZoom = await zoom(raw.png);
    const matchedZoom = await zoom(matched);
    fs.writeFileSync(path.join(OUT_DIR, `${pair.id}-raw-baseline-zoom2x.png`), rawZoom);
    fs.writeFileSync(path.join(OUT_DIR, `${pair.id}-matched-zoom2x.png`), matchedZoom);

    const gap = 16;
    const sideBySide = await sharp({
      create: { width: sceneW * 2 + gap, height: sceneH, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite([
        { input: raw.png, left: 0, top: 0 },
        { input: matched, left: sceneW + gap, top: 0 },
      ])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, `${pair.id}-side-by-side-raw-left-matched-right.png`), sideBySide);

    const entry = {
      id: pair.id,
      productPath: path.relative(ROOT, pair.productPath),
      scenePath: path.relative(ROOT, pair.scenePath),
      keyMode: pair.keyMode,
      lumLow: pair.lumLow,
      lumHigh: pair.lumHigh,
      placement: pair.placement,
      scene: { width: sceneW, height: sceneH },
      cutout: cutStats,
      rawPasteBoxPx: box,
      productBoxStats: {
        raw: await regionStats(raw.png, box),
        matched: await regionStats(matched, box),
        sceneOnly: await regionStats(sceneBuffer, box),
      },
    };
    results.push(entry);
    console.log(JSON.stringify(entry, null, 2));
  }

  fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2));
  console.log(`\n[257cha] done → ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
