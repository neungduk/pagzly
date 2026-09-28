/**
 * 260차 — 어두운 씬용 "광원 쪽 림 하이라이트" QA 프로토타입. 완전 오프라인, 프로덕션 미반영.
 *
 * 258차 진단 스크립트의 composeLikeProd()(pasteCutoutOnScene() 단계 재조립, 바이트 동일 검증됨)로
 * (a) 그림자만(현재 프로덕션, 259차 수정 포함) 결과를 만들고, 그 위에 하이라이트 단계만 얹은 (b)를 만든다.
 * 하이라이트는 이 파일 안에만 존재한다 — lib/에 추가하지 않는다.
 *
 * 실행: npx tsx scripts/260cha-rim-highlight-qa-prototype.ts
 * 산출: review/260cha-rim-highlight-qa/
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { pasteCutoutOnScene } from "../lib/lifestyle-product-composite";
import { sampleBackdropAmbientColor } from "../lib/photo-composite";
import { DEFAULT_SHADOW, type ShadowAnalysis } from "../lib/vision-utils";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";
import { PAIRS, makeSyntheticCutout } from "./257cha-lifestyle-matching-synthetic-qa";
import { composeLikeProd, lstar } from "./258cha-shadow-visibility-diagnose";

const ROOT = path.resolve(__dirname, "..");
/** RIM_VARIANT=max → 브리프 범위 상한(밴드 4px, +60, opacity 0.25)으로 별도 폴더에 산출. 기본은 중앙값. */
const VARIANT_MAX = process.env.RIM_VARIANT === "max";
const OUT_DIR = path.join(ROOT, "review", VARIANT_MAX ? "260cha-rim-highlight-qa-max" : "260cha-rim-highlight-qa");

/** 프로토타입 상수 — 보고서에 그대로 기록. */
const RIM = {
  bandPx: VARIANT_MAX ? 4 : 3, // 알파 경계에서 안쪽으로 이 반경 안에 투명 픽셀이 있으면 밴드
  solidAlpha: 128, // 이 이상을 "상품 내부"로 봄
  normalBlurSigma: 2, // 경계 법선(알파 기울기) 계산용 블러
  facingFullCos: 0.5, // 법선·광원 방향 cos이 이 이상이면 가중치 1, 0 이하면 0 (사이는 선형)
  lift: VARIANT_MAX ? 60 : 50, // 주변색 각 채널 +lift (255 클램프)
  opacity: VARIANT_MAX ? 0.25 : 0.2,
  blend: "screen (JS 교과서식, screenComposite)" as const,
  gateLum: 60, // placement 주변 씬 평균 밝기가 이 미만일 때만 적용
  gateExpand: 0.5, // placement 박스를 가로·세로 각각 박스 크기의 50%씩 사방 확장한 영역으로 게이트 측정
};

/**
 * lib/photo-composite.ts의 shadowOffsets()(비공개)와 같은 분기. 하이라이트는 그 반대 방향(광원 쪽).
 * 반환: 광원 쪽을 가리키는 단위 벡터.
 */
function lightDirection(shadow: ShadowAnalysis, w: number, h: number): { x: number; y: number } {
  let ox: number;
  let oy: number;
  switch (shadow.lightFrom) {
    case "upper-right":
    case "right":
      ox = -w * 0.06;
      oy = h * 0.04;
      break;
    case "top":
      ox = 0;
      oy = h * 0.055;
      break;
    case "left":
      ox = w * 0.06;
      oy = h * 0.04;
      break;
    case "upper-left":
    default:
      ox = w * 0.055;
      oy = h * 0.045;
  }
  const len = Math.hypot(ox, oy) || 1;
  return { x: -ox / len, y: -oy / len };
}

async function sceneLumInBox(scene: Buffer, box: { left: number; top: number; width: number; height: number }) {
  const { data, info } = await sharp(scene).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const ex = Math.round(box.width * RIM.gateExpand);
  const ey = Math.round(box.height * RIM.gateExpand);
  const x0 = Math.max(0, box.left - ex);
  const y0 = Math.max(0, box.top - ey);
  const x1 = Math.min(W, box.left + box.width + ex);
  const y1 = Math.min(H, box.top + box.height + ey);
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * W + x) * 3;
      sum += 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!;
      n++;
    }
  }
  return { mean: sum / n, region: { left: x0, top: y0, width: x1 - x0, height: y1 - y0 } };
}

/** 컷아웃 크기의 하이라이트 레이어(RGBA). 알파 = 밴드 × 방향 가중치 × opacity × 컷아웃 알파. */
async function buildRimLayer(cutout: Buffer, color: { r: number; g: number; b: number }, light: { x: number; y: number }) {
  const { data: a, info } = await sharp(cutout).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  // blur() 뒤 raw는 1채널 입력이어도 3채널로 나오므로 채널 0만 뽑는다.
  const blurred = await sharp(a, { raw: { width: w, height: h, channels: 1 } })
    .blur(RIM.normalBlurSigma)
    .extractChannel(0)
    .raw()
    .toBuffer();
  if (blurred.length !== w * h) throw new Error(`blurred alpha size ${blurred.length} != ${w * h}`);
  const r = RIM.bandPx;
  const out = Buffer.alloc(w * h * 4);
  let bandPixels = 0;
  let litPixels = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      out[o] = color.r;
      out[o + 1] = color.g;
      out[o + 2] = color.b;
      if (a[i]! < RIM.solidAlpha) continue;
      let edge = false;
      for (let dy = -r; dy <= r && !edge; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || a[yy * w + xx]! < RIM.solidAlpha) {
            edge = true;
            break;
          }
        }
      }
      if (!edge) continue;
      bandPixels++;
      // 바깥쪽 법선 = 알파 감소 방향 = -∇α
      const gx = (blurred[y * w + Math.min(w - 1, x + 1)]! - blurred[y * w + Math.max(0, x - 1)]!) / 2;
      const gy = (blurred[Math.min(h - 1, y + 1) * w + x]! - blurred[Math.max(0, y - 1) * w + x]!) / 2;
      const glen = Math.hypot(gx, gy);
      if (glen < 1e-3) continue;
      const cos = (-gx / glen) * light.x + (-gy / glen) * light.y;
      const weight = Math.max(0, Math.min(1, cos / RIM.facingFullCos));
      if (weight <= 0) continue;
      litPixels++;
      out[o + 3] = Math.round(255 * weight * RIM.opacity * (a[i]! / 255));
    }
  }
  const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return { png, bandPixels, litPixels };
}

/**
 * 교과서 screen: out = b + α·s·(1 − b/255). sharp(libvips) composite의 blend:"screen"은 부분 알파에서
 * 이 값보다 훨씬 약하게(대략 α² 수준) 나오고 "lighten"은 거의 무변화라 JS로 직접 합성한다.
 */
async function screenComposite(base: Buffer, layerPng: Buffer, left: number, top: number) {
  const { data: b, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
  const { data: l, info: li } = await sharp(layerPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(b);
  const c = info.channels;
  for (let y = Math.max(0, top); y < Math.min(info.height, top + li.height); y++) {
    for (let x = Math.max(0, left); x < Math.min(info.width, left + li.width); x++) {
      const li4 = ((y - top) * li.width + (x - left)) * 4;
      const alpha = l[li4 + 3]! / 255;
      if (alpha === 0) continue;
      const bi = (y * info.width + x) * c;
      for (let k = 0; k < 3; k++) {
        const bv = b[bi + k]!;
        out[bi + k] = Math.round(bv + alpha * l[li4 + k]! * (1 - bv / 255));
      }
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: c } }).png().toBuffer();
}

async function measureRimDelta(a: Buffer, b: Buffer, W: number) {
  const ra = await sharp(a).removeAlpha().raw().toBuffer();
  const rb = await sharp(b).removeAlpha().raw().toBuffer();
  let n = 0;
  let sum = 0;
  let max = 0;
  let ge1 = 0;
  let ge2 = 0;
  for (let i = 0; i < ra.length; i += 3) {
    if (ra[i] === rb[i] && ra[i + 1] === rb[i + 1] && ra[i + 2] === rb[i + 2]) continue;
    const d = lstar(rb[i]!, rb[i + 1]!, rb[i + 2]!) - lstar(ra[i]!, ra[i + 1]!, ra[i + 2]!);
    n++;
    sum += d;
    if (d > max) max = d;
    if (d >= 1) ge1++;
    if (d >= 2) ge2++;
  }
  void W;
  return {
    changedPixels: n,
    meanDeltaLstar: n ? +(sum / n).toFixed(2) : 0,
    maxDeltaLstar: +max.toFixed(2),
    pctGE1: n ? +((ge1 / n) * 100).toFixed(1) : 0,
    pctGE2: n ? +((ge2 / n) * 100).toFixed(1) : 0,
  };
}

async function labelBar(text: string, width: number) {
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return sharp(
    Buffer.from(
      `<svg width="${width}" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#222"/><text x="8" y="19" font-family="Arial" font-size="16" fill="#fff">${safe}</text></svg>`,
    ),
  )
    .png()
    .toBuffer();
}

async function sideBySide(left: Buffer, right: Buffer, leftLabel: string, rightLabel: string) {
  const m = await sharp(left).metadata();
  const w = m.width!;
  const h = m.height!;
  const gap = 12;
  return sharp({ create: { width: w * 2 + gap, height: h + 28, channels: 3, background: "#ffffff" } })
    .composite([
      { input: await labelBar(leftLabel, w), left: 0, top: 0 },
      { input: await labelBar(rightLabel, w), left: w + gap, top: 0 },
      { input: left, left: 0, top: 28 },
      { input: right, left: w + gap, top: 28 },
    ])
    .png()
    .toBuffer();
}

type Case = { id: string; scenePath: string; placement: HeldObjectPlacement };

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pair = PAIRS[0]!;
  const { png: cutout } = await makeSyntheticCutout(fs.readFileSync(pair.productPath), pair);
  const asset = (...p: string[]) => path.join(ROOT, "scripts", "test-assets", ...p);
  const mid: HeldObjectPlacement = { xPct: 36, yPct: 50, wPct: 26, hPct: 22, rotationDeg: -8, confidence: "high" };

  const cases: Case[] = [
    { id: "1-dark-257scene-palm", scenePath: pair.scenePath, placement: pair.placement },
    { id: "2-dark-257scene-top-black", scenePath: pair.scenePath, placement: { ...pair.placement, xPct: 30, yPct: 6 } },
    { id: "3-dark-hand-31203656", scenePath: asset("_168cha-living", "hand-31203656.jpeg"), placement: mid },
    { id: "4-mid-food-16513595", scenePath: asset("식품", "01-pexels-16513595.jpeg"), placement: mid },
    { id: "5-bright-living-6801218", scenePath: asset("생활용품", "02-pexels-6801218.jpeg"), placement: mid },
  ];

  const results: Record<string, unknown>[] = [];
  for (const c of cases) {
    const scene = await sharp(fs.readFileSync(c.scenePath)).png().toBuffer();
    const composed = await composeLikeProd(scene, cutout, c.placement);
    const prod = await pasteCutoutOnScene({ sceneBuffer: scene, cutoutBuffer: cutout, placement: c.placement });
    const shadowOnlyIsProd = Buffer.compare(prod, composed.withShadow) === 0;

    const gate = await sceneLumInBox(scene, composed.box);
    const ambient = await sampleBackdropAmbientColor(scene);
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const rimColor = { r: clamp(ambient.r + RIM.lift), g: clamp(ambient.g + RIM.lift), b: clamp(ambient.b + RIM.lift) };
    const light = lightDirection(DEFAULT_SHADOW, composed.box.width, composed.box.height);

    const shadowOnly = composed.withShadow;
    let withRim = shadowOnly;
    let rimStats: { bandPixels: number; litPixels: number } = { bandPixels: 0, litPixels: 0 };
    let sharpScreenDelta: Awaited<ReturnType<typeof measureRimDelta>> | null = null;
    const applied = gate.mean < RIM.gateLum;
    if (applied) {
      const rim = await buildRimLayer(composed.prepared, rimColor, light);
      rimStats = { bandPixels: rim.bandPixels, litPixels: rim.litPixels };
      withRim = await screenComposite(shadowOnly, rim.png, composed.box.left, composed.box.top);
      const sharpScreen = await sharp(shadowOnly)
        .composite([{ input: rim.png, left: composed.box.left, top: composed.box.top, blend: "screen" }])
        .png()
        .toBuffer();
      sharpScreenDelta = await measureRimDelta(shadowOnly, sharpScreen, composed.sceneW);
      fs.writeFileSync(
        path.join(OUT_DIR, `${c.id}-rim-mask.png`),
        await sharp(rim.png).extractChannel(3).linear(1 / RIM.opacity, 0).png().toBuffer(),
      );
    }
    const identicalToShadowOnly = Buffer.compare(withRim, shadowOnly) === 0;
    const delta = await measureRimDelta(shadowOnly, withRim, composed.sceneW);

    fs.writeFileSync(path.join(OUT_DIR, `${c.id}-a-shadow-only.png`), shadowOnly);
    fs.writeFileSync(path.join(OUT_DIR, `${c.id}-b-shadow-plus-rim.png`), withRim);
    const gateNote = `gate L=${gate.mean.toFixed(1)} ${applied ? "< 60 → rim ON" : ">= 60 → rim OFF"}`;
    fs.writeFileSync(
      path.join(OUT_DIR, `${c.id}-c-side-by-side.png`),
      await sideBySide(shadowOnly, withRim, "(a) shadow only = current prod", `(b) + rim highlight | ${gateNote}`),
    );

    const box = composed.box;
    const pad = Math.round(Math.max(box.width, box.height) * 0.25);
    const zx = Math.max(0, box.left - pad);
    const zy = Math.max(0, box.top - pad);
    const zoomBox = {
      left: zx,
      top: zy,
      width: Math.min(composed.sceneW, box.left + box.width + pad) - zx,
      height: Math.min(composed.sceneH, box.top + box.height + pad) - zy,
    };
    const zoom = (b: Buffer) =>
      sharp(b).extract(zoomBox).resize({ width: zoomBox.width * 3, kernel: "nearest" }).png().toBuffer();
    fs.writeFileSync(
      path.join(OUT_DIR, `${c.id}-d-zoom3x-side-by-side.png`),
      await sideBySide(await zoom(shadowOnly), await zoom(withRim), "(a) zoom x3", "(b) zoom x3"),
    );

    const row = {
      case: c.id,
      scene: path.relative(ROOT, c.scenePath).replace(/\\/g, "/"),
      placement: c.placement,
      pasteBoxPx: box,
      gateRegionPx: gate.region,
      gateMeanLum: +gate.mean.toFixed(1),
      rimApplied: applied,
      ambient,
      rimColor,
      lightDir: { x: +light.x.toFixed(3), y: +light.y.toFixed(3) },
      ...rimStats,
      shadowOnlyIsProdBytes: shadowOnlyIsProd,
      withRimIdenticalToShadowOnly: identicalToShadowOnly,
      rimDelta: delta,
      sharpScreenRimDelta: sharpScreenDelta,
    };
    results.push(row);
    console.log(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify({ constants: RIM, results }, null, 2));
  console.log(`[260cha] done → ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
