/**
 * 258차 — 라이프스타일 실루엣 그림자(multiply)가 어두운 씬에서 얼마나 보이는지 정량 진단. 완전 오프라인.
 * 프로덕션 코드는 건드리지 않고, pasteCutoutOnScene()의 단계를 같은 lib 함수로 재조립해
 * "그림자 합성 유무"만 다른 두 장을 만든 뒤 그림자 영역 픽셀을 비교한다.
 * 재조립이 정확한지는 with-shadow 결과가 실제 pasteCutoutOnScene() 출력과 바이트 동일한지로 확인.
 *
 * 실행: npx tsx scripts/258cha-shadow-visibility-diagnose.ts [출력폴더명]
 * 산출: review/<출력폴더명> (기본 258cha-shadow-diagnosis)
 * 259차 — 출력 폴더 인자 + 그림자 알파 잘림 지표(maxAlphaStep, shadowAlphaMass) 추가.
 * 260차 — composeLikeProd/lstar export (260cha-rim-highlight-qa-prototype.ts가 재사용).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import {
  buildSilhouetteShadowBuffer,
  featherCutout,
  matchCutoutGrain,
  matchCutoutSharpness,
  matchCutoutWhiteBalance,
  sampleBackdropAmbientColor,
  tintedShadowColor,
} from "../lib/photo-composite";
import { DEFAULT_SHADOW } from "../lib/vision-utils";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";
import { PAIRS, makeSyntheticCutout } from "./257cha-lifestyle-matching-synthetic-qa";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "review", process.argv[2] || "258cha-shadow-diagnosis");

/** pasteCutoutOnScene()과 같은 순서·인자. withShadow만 분기. */
export async function composeLikeProd(sceneBuffer: Buffer, cutoutBuffer: Buffer, placement: HeldObjectPlacement) {
  const sceneMeta = await sharp(sceneBuffer).metadata();
  const sceneW = sceneMeta.width ?? 1;
  const sceneH = sceneMeta.height ?? 1;
  const targetW = Math.max(8, Math.round(sceneW * (placement.wPct / 100)));
  const targetH = Math.max(8, Math.round(sceneH * (placement.hPct / 100)));
  const left = Math.round(sceneW * (placement.xPct / 100));
  const top = Math.round(sceneH * (placement.yPct / 100));
  const rotated = await sharp(cutoutBuffer)
    .rotate(placement.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  let prepared: Buffer = await sharp(rotated).resize(targetW, targetH, { fit: "inside", withoutEnlargement: false }).png().toBuffer();
  let cm = await sharp(prepared).metadata();
  let cutW = cm.width ?? targetW;
  let cutH = cm.height ?? targetH;
  if (cutW > sceneW || cutH > sceneH) {
    prepared = await sharp(prepared).resize(sceneW, sceneH, { fit: "inside", withoutEnlargement: false }).png().toBuffer();
    cm = await sharp(prepared).metadata();
    cutW = cm.width ?? Math.min(targetW, sceneW);
    cutH = cm.height ?? Math.min(targetH, sceneH);
  }
  prepared = await featherCutout(prepared, Math.max(sceneW, sceneH));
  prepared = await matchCutoutWhiteBalance(prepared, sceneBuffer);
  prepared = await matchCutoutSharpness(prepared, sceneBuffer);
  prepared = await matchCutoutGrain(prepared, sceneBuffer);
  cm = await sharp(prepared).metadata();
  cutW = cm.width ?? cutW;
  cutH = cm.height ?? cutH;
  let pasteLeft = left + Math.round((targetW - cutW) / 2);
  let pasteTop = top + Math.round((targetH - cutH) / 2);
  pasteLeft = Math.max(0, Math.min(pasteLeft, Math.max(0, sceneW - cutW)));
  pasteTop = Math.max(0, Math.min(pasteTop, Math.max(0, sceneH - cutH)));
  const tint = tintedShadowColor(await sampleBackdropAmbientColor(sceneBuffer));
  const box = { left: pasteLeft, top: pasteTop, width: cutW, height: cutH };
  const shadowBuf = await buildSilhouetteShadowBuffer(prepared, sceneW, sceneH, box, { ...DEFAULT_SHADOW }, tint);
  const withShadowBase = await sharp(sceneBuffer).composite([{ input: shadowBuf, left: 0, top: 0, blend: "multiply" }]).png().toBuffer();
  const withShadow = await sharp(withShadowBase).composite([{ input: prepared, left: pasteLeft, top: pasteTop }]).png().toBuffer();
  const noShadow = await sharp(sceneBuffer).composite([{ input: prepared, left: pasteLeft, top: pasteTop }]).png().toBuffer();
  return { withShadow, noShadow, shadowBuf, prepared, box, sceneW, sceneH, tint };
}

/** sRGB 8bit → CIE L* (D65, 휘도 기준). */
export function lstar(r: number, g: number, b: number) {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : (24389 / 27) * Y;
}

async function measure(c: Awaited<ReturnType<typeof composeLikeProd>>) {
  const { sceneW: W, sceneH: H, box } = c;
  const a = await sharp(c.noShadow).removeAlpha().raw().toBuffer();
  const b = await sharp(c.withShadow).removeAlpha().raw().toBuffer();
  const sh = await sharp(c.shadowBuf).ensureAlpha().extractChannel(3).raw().toBuffer();
  const cutA = await sharp(c.prepared).ensureAlpha().extractChannel(3).raw().toBuffer();
  let n = 0;
  let sumLumBefore = 0;
  let sumAbs = 0;
  let sumRel = 0;
  let sumDL = 0;
  let maxDL = 0;
  let over1 = 0;
  let over2 = 0;
  let sumShadowAlpha = 0;
  // 잘림 지표: 블러된 그림자는 이웃 픽셀 간 알파 차이가 작아야 함. 사각형으로 잘리면 경계에서 큰 계단.
  let maxAlphaStep = 0;
  let shadowAlphaMass = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = sh[y * W + x]!;
      shadowAlphaMass += v / 255;
      if (x + 1 < W) maxAlphaStep = Math.max(maxAlphaStep, Math.abs(v - sh[y * W + x + 1]!));
      if (y + 1 < H) maxAlphaStep = Math.max(maxAlphaStep, Math.abs(v - sh[(y + 1) * W + x]!));
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (sh[i]! < 3) continue; // 그림자 알파 ~1% 미만은 영역에서 제외
      const cx = x - box.left;
      const cy = y - box.top;
      if (cx >= 0 && cy >= 0 && cx < box.width && cy < box.height && cutA[cy * box.width + cx]! >= 8) continue; // 컷아웃이 덮는 곳 제외
      const p = i * 3;
      const lb = 0.299 * a[p]! + 0.587 * a[p + 1]! + 0.114 * a[p + 2]!;
      const la = 0.299 * b[p]! + 0.587 * b[p + 1]! + 0.114 * b[p + 2]!;
      const dL = lstar(a[p]!, a[p + 1]!, a[p + 2]!) - lstar(b[p]!, b[p + 1]!, b[p + 2]!);
      n += 1;
      sumLumBefore += lb;
      sumAbs += lb - la;
      sumRel += lb > 0 ? (lb - la) / lb : 0;
      sumDL += dL;
      if (dL > maxDL) maxDL = dL;
      if (dL >= 1) over1 += 1;
      if (dL >= 2) over2 += 1;
      sumShadowAlpha += sh[i]! / 255;
    }
  }
  return {
    maxAlphaStep,
    shadowAlphaMass: Math.round(shadowAlphaMass),
    shadowPixels: n,
    meanShadowAlpha: +(sumShadowAlpha / n).toFixed(3),
    meanSceneLum: +(sumLumBefore / n).toFixed(1),
    meanAbsDelta: +(sumAbs / n).toFixed(2),
    meanRelDeltaPct: +((sumRel / n) * 100).toFixed(1),
    meanDeltaLstar: +(sumDL / n).toFixed(2),
    maxDeltaLstar: +maxDL.toFixed(2),
    pctPixelsDeltaLstarGE1: +((over1 / n) * 100).toFixed(1),
    pctPixelsDeltaLstarGE2: +((over2 / n) * 100).toFixed(1),
  };
}

async function uniformScene(level: number, w: number, h: number) {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: level, g: level, b: level } } }).png().toBuffer();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pair = PAIRS[0]!;
  const { png: cutout } = await makeSyntheticCutout(fs.readFileSync(pair.productPath), pair);
  const scene257 = await sharp(fs.readFileSync(pair.scenePath)).png().toBuffer();
  const asset = (...p: string[]) => path.join(ROOT, "scripts", "test-assets", ...p);

  const cases: { id: string; scene: Buffer; placement: HeldObjectPlacement }[] = [
    { id: "257-scene-A-placement (palm/case)", scene: scene257, placement: pair.placement },
    { id: "257-scene-top-black-area", scene: scene257, placement: { ...pair.placement, xPct: 30, yPct: 6 } },
  ];
  for (const level of [8, 16, 32, 64, 96, 128, 192, 240]) {
    cases.push({ id: `uniform-gray-${level}`, scene: await uniformScene(level, 975, 1300), placement: pair.placement });
  }
  const realScenes: [string, string[]][] = [
    ["real L=40 _168cha-living/hand-31203656", ["_168cha-living", "hand-31203656.jpeg"]],
    ["real L=97 식품/01-pexels-16513595", ["식품", "01-pexels-16513595.jpeg"]],
    ["real L=167 생활용품/01-pexels-6762494", ["생활용품", "01-pexels-6762494.jpeg"]],
    ["real L=214 생활용품/02-pexels-6801218", ["생활용품", "02-pexels-6801218.jpeg"]],
  ];
  for (const [id, p] of realScenes) {
    cases.push({ id, scene: await sharp(fs.readFileSync(asset(...p))).png().toBuffer(), placement: { xPct: 36, yPct: 50, wPct: 26, hPct: 22, rotationDeg: -8, confidence: "high" } });
  }

  const results: Record<string, unknown>[] = [];
  for (const c of cases) {
    const composed = await composeLikeProd(c.scene, cutout, c.placement);
    const prod = await pasteCutoutOnScene({ sceneBuffer: c.scene, cutoutBuffer: cutout, placement: c.placement });
    const prodIdentical = Buffer.compare(prod, composed.withShadow) === 0;
    const m = await measure(composed);
    const row = { case: c.id, prodIdentical, shadowTint: composed.tint, ...m };
    results.push(row);
    console.log(JSON.stringify(row));

    if (c.id.startsWith("257-scene") || c.id.startsWith("real") || c.id === "uniform-gray-128") {
      const slug = c.id.replace(/[^a-zA-Z0-9-]+/g, "_").replace(/_+$/, "");
      fs.writeFileSync(path.join(OUT_DIR, `${slug}-with-shadow.png`), composed.withShadow);
      fs.writeFileSync(path.join(OUT_DIR, `${slug}-no-shadow.png`), composed.noShadow);
      const a = await sharp(composed.noShadow).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const b = await sharp(composed.withShadow).removeAlpha().raw().toBuffer();
      const diff = Buffer.alloc(a.info.width * a.info.height);
      for (let i = 0; i < diff.length; i++) {
        const p = i * 3;
        const d = (a.data[p]! + a.data[p + 1]! + a.data[p + 2]! - b[p]! - b[p + 1]! - b[p + 2]!) / 3;
        diff[i] = Math.max(0, Math.min(255, Math.round(d * 8)));
      }
      await sharp(diff, { raw: { width: a.info.width, height: a.info.height, channels: 1 } })
        .png()
        .toFile(path.join(OUT_DIR, `${slug}-diff-x8.png`));
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2));
  console.log(`[258cha] shadow diagnosis done → ${path.relative(ROOT, OUT_DIR)}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
