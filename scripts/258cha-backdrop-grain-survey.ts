/**
 * 258차 — matchCutoutGrain() skipThreshold(2.2) 재보정용 1회성 조사. 완전 오프라인(이미지 로드 + 계산만).
 *
 * scripts/test-assets/ 아래 모든 사진(내용 해시로 중복 제거) + 합성 대조군에 대해
 *   - backdropGrain: matchCutoutGrain()과 동일한 계산 (256x256 cover → grayscale → |원본 - blur(1.2)| 평균)
 *   - prodSkip: 실제 matchCutoutGrain()을 작은 불투명 컷아웃으로 호출해 원본 그대로 돌아왔는지 (계산 일치 교차검증)
 *   - meanLum / darkFraction(lum<40): 씬 밝기 맥락
 *   - nativeFlatNoise: 긴 변 1024 해상도에서 16px 블록별 잔차 stdev의 25퍼센타일 (평탄부 센서 노이즈 근사, 참고용)
 * 을 계산하고, 육안 판정용 컨택트 시트(썸네일 + 평탄부 1:1 크롭)를 backdropGrain 오름차순으로 만든다.
 *
 * 실행: npx tsx scripts/258cha-backdrop-grain-survey.ts
 * 산출: review/258cha-grain-survey/
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { matchCutoutGrain } from "../lib/photo-composite";

const ROOT = path.resolve(__dirname, "..");
const ASSET_DIR = path.join(ROOT, "scripts", "test-assets");
const OUT_DIR = path.join(ROOT, "review", "258cha-grain-survey");
const PROD_SKIP_THRESHOLD = 2.2;

type Row = {
  idx: number;
  label: string;
  source: "photo" | "synthetic";
  backdropGrain: number;
  prodSkip: boolean;
  meanLum: number;
  darkFraction: number;
  nativeFlatNoise: number;
  duplicates: number;
};

function listImages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listImages(p));
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) out.push(p);
  }
  return out;
}

async function measureBackdropGrain(buf: Buffer): Promise<{ grain: number; meanLum: number; darkFraction: number }> {
  const bgResized = sharp(buf).resize(256, 256, { fit: "cover" }).grayscale();
  const bgSharp = await bgResized.clone().raw().toBuffer({ resolveWithObject: true });
  const bgBlur = await bgResized.clone().blur(1.2).raw().toBuffer({ resolveWithObject: true });
  const n = bgSharp.info.width * bgSharp.info.height;
  let sum = 0;
  let lumSum = 0;
  let dark = 0;
  for (let i = 0; i < n; i += 1) {
    sum += Math.abs(bgSharp.data[i]! - bgBlur.data[i]!);
    lumSum += bgSharp.data[i]!;
    if (bgSharp.data[i]! < 40) dark += 1;
  }
  return { grain: sum / n, meanLum: lumSum / n, darkFraction: dark / n };
}

/** 평탄부 1:1 크롭 좌표도 같이 반환 (컨택트 시트용). */
async function measureNativeFlatNoise(buf: Buffer) {
  const base = sharp(buf).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).grayscale();
  const g = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const b = await base.clone().blur(1.2).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = g.info;
  const B = 16;
  const blocks: { sd: number; x: number; y: number }[] = [];
  for (let by = 0; by + B <= height; by += B) {
    for (let bx = 0; bx + B <= width; bx += B) {
      let s = 0;
      let s2 = 0;
      for (let y = by; y < by + B; y++) {
        for (let x = bx; x < bx + B; x++) {
          const r = g.data[y * width + x]! - b.data[y * width + x]!;
          s += r;
          s2 += r * r;
        }
      }
      const m = s / (B * B);
      blocks.push({ sd: Math.sqrt(Math.max(0, s2 / (B * B) - m * m)), x: bx, y: by });
    }
  }
  blocks.sort((p, q) => p.sd - q.sd);
  const p25 = blocks[Math.floor(blocks.length * 0.25)]!;
  return { nativeFlatNoise: p25.sd, flatX: p25.x, flatY: p25.y, workW: width, workH: height };
}

async function syntheticControls(): Promise<{ label: string; buf: Buffer }[]> {
  const S = 1024;
  const svg = (body: string) => sharp(Buffer.from(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`)).png().toBuffer();
  const gradient = await svg(
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8e4dc"/><stop offset="1" stop-color="#c4bbb0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>`,
  );
  const radial = await svg(
    `<defs><radialGradient id="r"><stop offset="0" stop-color="#f4f1ec"/><stop offset="1" stop-color="#b9b2a8"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#r)"/>`,
  );
  const darkGradient = await svg(
    `<defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1c20"/><stop offset="1" stop-color="#3a3a40"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#d)"/>`,
  );
  const rough187 = await svg(
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 1 0"/></filter><rect width="100%" height="100%" fill="#9a8a70"/><rect width="100%" height="100%" filter="url(#n)"/>`,
  );
  const gradientJpeg = await sharp(gradient).jpeg({ quality: 75 }).toBuffer();
  return [
    { label: "SYN smooth-linear-gradient", buf: gradient },
    { label: "SYN smooth-linear-gradient jpeg-q75", buf: gradientJpeg },
    { label: "SYN smooth-radial-vignette", buf: radial },
    { label: "SYN smooth-dark-gradient", buf: darkGradient },
    { label: "SYN flat-studio-white", buf: await svg(`<rect width="100%" height="100%" fill="#f5f5f5"/>`) },
    { label: "SYN rough-feTurbulence-187", buf: rough187 },
  ];
}

async function prodSkips(backdrop: Buffer, cutout: Buffer): Promise<boolean> {
  const out = await matchCutoutGrain(cutout, backdrop);
  return Buffer.compare(out, cutout) === 0;
}

async function tile(buf: Buffer, row: Row, flat: { flatX: number; flatY: number; workW: number; workH: number }) {
  const T = 180;
  const thumb = await sharp(buf).resize(T, T, { fit: "cover" }).png().toBuffer();
  const work = await sharp(buf).resize(flat.workW, flat.workH, { fit: "fill" }).png().toBuffer();
  const cx = Math.max(0, Math.min(flat.workW - T, flat.flatX + 8 - T / 2));
  const cy = Math.max(0, Math.min(flat.workH - T, flat.flatY + 8 - T / 2));
  const cropW = Math.min(T, flat.workW);
  const cropH = Math.min(T, flat.workH);
  const crop = await sharp(work).extract({ left: cx, top: cy, width: cropW, height: cropH }).resize(T, T, { fit: "fill", kernel: "nearest" }).png().toBuffer();
  const label = `#${row.idx} g=${row.backdropGrain.toFixed(2)} ${row.prodSkip ? "SKIP" : "APPLY"} L=${row.meanLum.toFixed(0)}`;
  const text = Buffer.from(
    `<svg width="${T * 2}" height="22" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${row.prodSkip ? "#7a1f1f" : "#1f5a2a"}"/><text x="6" y="16" font-family="Arial" font-size="14" fill="#fff">${label}</text></svg>`,
  );
  return sharp({ create: { width: T * 2, height: T + 22, channels: 3, background: "#ffffff" } })
    .composite([
      { input: text, left: 0, top: 0 },
      { input: thumb, left: 0, top: 22 },
      { input: crop, left: T, top: 22 },
    ])
    .png()
    .toBuffer();
}

/**
 * 육안 판정용 — 원본 해상도 1:1 크롭. 노이즈가 적은 블록을 고르면 "그레인 없음" 쪽으로 편향되므로
 * 노이즈가 아니라 톤이 완만한(σ=4 블러 기울기가 작은) 블록 중 클리핑되지 않은(평균 25~230) 곳을 고른다.
 */
async function nativeToneCrop(buf: Buffer, size: number): Promise<Buffer> {
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  const W = meta.width ?? size;
  const H = meta.height ?? size;
  const g = await sharp(buf).rotate().grayscale().blur(4).raw().toBuffer({ resolveWithObject: true });
  const w = g.info.width;
  const h = g.info.height;
  let best = { score: Infinity, x: Math.max(0, (w - size) >> 1), y: Math.max(0, (h - size) >> 1) };
  const step = Math.max(16, size >> 2);
  for (let y = 0; y + size <= h; y += step) {
    for (let x = 0; x + size <= w; x += step) {
      let sum = 0;
      let grad = 0;
      let n = 0;
      for (let yy = y; yy < y + size - 4; yy += 4) {
        for (let xx = x; xx < x + size - 4; xx += 4) {
          const v = g.data[yy * w + xx]!;
          sum += v;
          grad += Math.abs(v - g.data[yy * w + xx + 4]!) + Math.abs(v - g.data[(yy + 4) * w + xx]!);
          n += 1;
        }
      }
      const mean = sum / n;
      if (mean < 25 || mean > 230) continue;
      const score = grad / n;
      if (score < best.score) best = { score, x, y };
    }
  }
  return sharp(buf)
    .rotate()
    .extract({ left: best.x, top: best.y, width: Math.min(size, W), height: Math.min(size, H) })
    .png()
    .toBuffer();
}

async function bandSheets(items: { row: Row; buf: Buffer }[]) {
  const C = 256;
  const PER = 12;
  const COLS = 4;
  for (let s = 0; s * PER < items.length; s++) {
    const chunk = items.slice(s * PER, (s + 1) * PER);
    const tiles = await Promise.all(
      chunk.map(async ({ row, buf }) => {
        const crop = await nativeToneCrop(buf, C);
        const thumb = await sharp(buf).rotate().resize(96, 96, { fit: "cover" }).png().toBuffer();
        const label = `#${row.idx} g=${row.backdropGrain.toFixed(2)} ${row.prodSkip ? "SKIP" : "APPLY"}`;
        const text = Buffer.from(
          `<svg width="${C}" height="20" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${row.prodSkip ? "#7a1f1f" : "#1f5a2a"}"/><text x="4" y="15" font-family="Arial" font-size="13" fill="#fff">${label}</text></svg>`,
        );
        return sharp({ create: { width: C, height: C + 20, channels: 3, background: "#ffffff" } })
          .composite([
            { input: text, left: 0, top: 0 },
            { input: crop, left: 0, top: 20 },
            { input: thumb, left: C - 96, top: 20 + C - 96 },
          ])
          .png()
          .toBuffer();
      }),
    );
    const tw = C + 8;
    const th = C + 28;
    await sharp({ create: { width: tw * COLS, height: th * Math.ceil(tiles.length / COLS), channels: 3, background: "#ffffff" } })
      .composite(tiles.map((t, j) => ({ input: t, left: (j % COLS) * tw, top: Math.floor(j / COLS) * th })))
      .png()
      .toFile(path.join(OUT_DIR, `band-1_8-2_6-native-${String(s + 1).padStart(2, "0")}.png`));
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = listImages(ASSET_DIR);
  const byHash = new Map<string, { file: string; count: number }>();
  for (const f of files) {
    const h = crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
    const prev = byHash.get(h);
    if (prev) prev.count += 1;
    else byHash.set(h, { file: f, count: 1 });
  }

  const inputs: { label: string; source: Row["source"]; buf: Buffer; duplicates: number }[] = [];
  for (const { file, count } of byHash.values()) {
    inputs.push({
      label: path.relative(ASSET_DIR, file).replace(/\\/g, "/"),
      source: "photo",
      buf: fs.readFileSync(file),
      duplicates: count,
    });
  }
  for (const s of await syntheticControls()) inputs.push({ ...s, source: "synthetic", duplicates: 1 });

  const probeCutout = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 120, g: 110, b: 100, alpha: 1 } },
  })
    .png()
    .toBuffer();

  const measured: { row: Omit<Row, "idx">; buf: Buffer; flat: Awaited<ReturnType<typeof measureNativeFlatNoise>> }[] = [];
  for (const input of inputs) {
    const { grain, meanLum, darkFraction } = await measureBackdropGrain(input.buf);
    const flat = await measureNativeFlatNoise(input.buf);
    const prodSkip = await prodSkips(input.buf, probeCutout);
    measured.push({
      row: {
        label: input.label,
        source: input.source,
        backdropGrain: +grain.toFixed(4),
        prodSkip,
        meanLum: +meanLum.toFixed(1),
        darkFraction: +darkFraction.toFixed(3),
        nativeFlatNoise: +flat.nativeFlatNoise.toFixed(3),
        duplicates: input.duplicates,
      },
      buf: input.buf,
      flat,
    });
  }

  measured.sort((a, b) => a.row.backdropGrain - b.row.backdropGrain);
  const rows: Row[] = measured.map((m, i) => ({ idx: i + 1, ...m.row }));

  const mismatches = rows.filter((r) => r.prodSkip !== r.backdropGrain < PROD_SKIP_THRESHOLD);

  const PER_SHEET = 30;
  const COLS = 5;
  for (let s = 0; s * PER_SHEET < measured.length; s++) {
    const chunk = measured.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
    const tiles = await Promise.all(chunk.map((m, j) => tile(m.buf, rows[s * PER_SHEET + j]!, m.flat)));
    const tw = 360;
    const th = 202;
    const rowsN = Math.ceil(tiles.length / COLS);
    await sharp({ create: { width: tw * COLS, height: th * rowsN, channels: 3, background: "#ffffff" } })
      .composite(tiles.map((t, j) => ({ input: t, left: (j % COLS) * tw, top: Math.floor(j / COLS) * th })))
      .png()
      .toFile(path.join(OUT_DIR, `contact-sheet-${String(s + 1).padStart(2, "0")}.png`));
  }

  await bandSheets(
    measured
      .map((m, i) => ({ row: rows[i]!, buf: m.buf }))
      .filter(({ row }) => row.source === "photo" && row.backdropGrain >= 1.8 && row.backdropGrain <= 2.6),
  );

  fs.writeFileSync(path.join(OUT_DIR, "survey.json"), JSON.stringify({ threshold: PROD_SKIP_THRESHOLD, mismatches, rows }, null, 2));
  const csv = ["idx,source,backdropGrain,prodSkip,meanLum,darkFraction,nativeFlatNoise,duplicates,label"]
    .concat(rows.map((r) => [r.idx, r.source, r.backdropGrain, r.prodSkip, r.meanLum, r.darkFraction, r.nativeFlatNoise, r.duplicates, `"${r.label}"`].join(",")))
    .join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "survey.csv"), "\uFEFF" + csv);

  const photos = rows.filter((r) => r.source === "photo");
  const skipped = photos.filter((r) => r.prodSkip).length;
  console.log(`[258cha] files=${files.length} unique photos=${photos.length} synthetic=${rows.length - photos.length}`);
  console.log(`[258cha] photos skipped at 2.2: ${skipped}/${photos.length}`);
  console.log(`[258cha] measure↔prod skip mismatches: ${mismatches.length}`);
  for (const r of rows) {
    console.log(
      `${String(r.idx).padStart(3)} ${r.backdropGrain.toFixed(3).padStart(7)} ${r.prodSkip ? "SKIP " : "APPLY"} L=${r.meanLum.toFixed(0).padStart(3)} dark=${r.darkFraction.toFixed(2)} flat=${r.nativeFlatNoise.toFixed(2)} ${r.label}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
