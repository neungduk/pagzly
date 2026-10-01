/**
 * 286차 — 라이프스타일 pixel-paste 합성 부자연스러움 진단. 완전 오프라인 (유료 API 0, /api 호출 0).
 *
 * pasteCutoutOnSceneDetailed()(프로덕션 그대로)를 로컬 컷아웃·씬 픽스처에 돌리고,
 * 같은 기하의 raw paste와 비교해 5축을 수치로 잰다:
 *   (a) 광원 방향 vs 그림자 방향, 접지(contact) 그림자
 *   (b) 색온도 (WB 타깃=씬 코너 vs 실제 주변 링, Lab a·b, R/B)
 *   (c) 경계 halo (밴드 premultiply 어두워짐, 바깥 1~4px 링 ΔL*, 원본 배경색 오염)
 *   (d) 스케일 (업스케일 배율, 높이 비율)
 *   (e) 해상도 (라플라시안 분산 / 고주파 잔차: 컷아웃 내부 vs 주변 씬, 그리고 matchCutoutSharpness 내부 지표)
 *
 * 실행: npx tsx scripts/_286cha-composite-diag.ts
 * 산출: review/286cha-composite-diag/
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { pasteCutoutOnSceneDetailed } from "../lib/lifestyle-product-composite";
import {
  buildSilhouetteShadowBuffer,
  defringeCutoutEdges,
  featherCutout,
  matchCutoutGrain,
  matchCutoutSharpness,
  matchCutoutWhiteBalance,
  purgeDarkPlateFringe,
  sampleBackdropAmbientColor,
  tintedShadowColor,
  trimCutoutToOpaqueBounds,
} from "../lib/photo-composite";
import { DEFAULT_SHADOW } from "../lib/vision-utils";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";
import { PAIRS, makeSyntheticCutout } from "./257cha-lifestyle-matching-synthetic-qa";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "review", process.env.DIAG_OUT || "286cha-composite-diag");
const asset = (...p: string[]) => path.join(ROOT, "scripts", "test-assets", ...p);
const rev = (...p: string[]) => path.join(ROOT, "review", ...p);

type CaseDef = {
  id: string;
  category: string;
  mode: "held" | "resting";
  cutout: { kind: "synthetic257" } | { kind: "file"; path: string };
  scene: string;
  /** held: 직접 placement / resting: 바닥 중심(baseX,baseY %), 높이 % */
  placement?: HeldObjectPlacement;
  base?: { x: number; y: number; hPct: number };
};

const CASES: CaseDef[] = [
  { id: "E1-held-dark-257", category: "electronics", mode: "held", cutout: { kind: "synthetic257" }, scene: PAIRS[0]!.scenePath, placement: PAIRS[0]!.placement },
  { id: "E2-rest-bright-floor", category: "electronics", mode: "resting", cutout: { kind: "file", path: rev("regression-precrop", "전자제품-cutout.png") }, scene: asset("생활용품", "02-pexels-6801218.jpeg"), base: { x: 76, y: 88, hPct: 26 } },
  { id: "L1-rest-bright-floor", category: "living", mode: "resting", cutout: { kind: "file", path: rev("debug-cutout", "v2-run", "1787037641009-cutout.png") }, scene: asset("생활용품", "02-pexels-6801218.jpeg"), base: { x: 78, y: 88, hPct: 14 } },
  { id: "L2-rest-bw-shelf", category: "living", mode: "resting", cutout: { kind: "file", path: rev("debug-cutout", "v2-run", "1787037641009-cutout.png") }, scene: asset("리빙-소품", "01-pexels-35082703.jpeg"), base: { x: 84, y: 66.5, hPct: 7 } },
  { id: "L3-rest-bright-sofa", category: "living", mode: "resting", cutout: { kind: "file", path: rev("debug-cutout", "v2-run", "1787037641009-cutout.png") }, scene: asset("생활용품", "01-pexels-6762494.jpeg"), base: { x: 50, y: 93, hPct: 10 } },
  { id: "L4-held-dark-hand", category: "living", mode: "held", cutout: { kind: "file", path: rev("debug-cutout", "v2-run", "1787037641009-cutout.png") }, scene: asset("_168cha-living", "hand-31203656.jpeg"), base: { x: 45, y: 62, hPct: 14 } },
  { id: "P1-rest-tiles", category: "pet", mode: "resting", cutout: { kind: "file", path: rev("debug-pet", "cutout-no-precrop.png") }, scene: asset("반려동물", "01-pexels-28948931.jpeg"), base: { x: 74, y: 88, hPct: 38 } },
  { id: "F1-rest-gym", category: "food", mode: "resting", cutout: { kind: "file", path: rev("regression-precrop", "식품-cutout.png") }, scene: asset("식품", "01-pexels-16513595.jpeg"), base: { x: 62, y: 57, hPct: 12 } },
];

// ---------- color helpers ----------
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
function lab(r: number, g: number, b: number) {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return { L: 116 * f(Y) - 16, a: 500 * (f(X) - f(Y)), b: 200 * (f(Y) - f(Z)) };
}
const Lstar = (r: number, g: number, b: number) => lab(r, g, b).L;
const r2 = (v: number, d = 2) => +v.toFixed(d);

type Img = { d: Buffer; w: number; h: number; c: number };
async function rawImg(buf: Buffer, alpha = false): Promise<Img> {
  const s = alpha ? sharp(buf).ensureAlpha() : sharp(buf).removeAlpha();
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height, c: info.channels };
}
function meanLab(img: Img, pred: (x: number, y: number) => boolean) {
  let L = 0, A = 0, B = 0, R = 0, G = 0, Bl = 0, n = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (!pred(x, y)) continue;
      const i = (y * img.w + x) * img.c;
      const l = lab(img.d[i]!, img.d[i + 1]!, img.d[i + 2]!);
      L += l.L; A += l.a; B += l.b; R += img.d[i]!; G += img.d[i + 1]!; Bl += img.d[i + 2]!; n++;
    }
  if (!n) return null;
  return { L: r2(L / n, 1), a: r2(A / n, 1), b: r2(B / n, 1), rgb: [r2(R / n, 0), r2(G / n, 0), r2(Bl / n, 0)], RB: r2(R / Math.max(Bl, 1), 3), n };
}

/** 알파≥thr 경계로부터의 체비셰프 거리 (안쪽 양수, 바깥 음수), 최대 maxD. */
function signedEdgeDistance(alpha: Uint8Array, w: number, h: number, thr: number, maxD: number) {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x]! >= thr;
  const dist = new Int8Array(w * h).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const me = inside(x, y);
      let found = 0;
      for (let d = 1; d <= maxD && !found; d++) {
        for (let k = -d; k <= d && !found; k++) {
          if (inside(x + k, y - d) !== me || inside(x + k, y + d) !== me || inside(x - d, y + k) !== me || inside(x + d, y + k) !== me) found = d;
        }
      }
      dist[y * w + x] = found ? (me ? found : -found) : me ? 127 : -127;
    }
  return dist;
}

function grayOf(img: Img) {
  const g = new Float32Array(img.w * img.h);
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * img.c;
    g[i] = 0.2126 * img.d[o]! + 0.7152 * img.d[o + 1]! + 0.0722 * img.d[o + 2]!;
  }
  return g;
}
function boxBlur3(g: Float32Array, w: number, h: number) {
  const o = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        s += g[yy * w + xx]!; n++;
      }
      o[y * w + x] = s / n;
    }
  return o;
}
/** 라플라시안 분산 + 고주파 잔차(|g − box3(g)|) — pred 픽셀만. */
function sharpnessStats(g: Float32Array, w: number, h: number, pred: (x: number, y: number) => boolean) {
  const bl = boxBlur3(g, w, h);
  let s = 0, s2 = 0, hf = 0, n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      if (!pred(x, y)) continue;
      const i = y * w + x;
      const lap = g[i - 1]! + g[i + 1]! + g[i - w]! + g[i + w]! - 4 * g[i]!;
      s += lap; s2 += lap * lap; hf += Math.abs(g[i]! - bl[i]!); n++;
    }
  if (n < 50) return null;
  const m = s / n;
  return { lapVar: r2(s2 / n - m * m, 1), hf: r2(hf / n, 3), n };
}

// ---------- 내부 지표 재현 (lib 비공개 함수와 동일 계산) ----------
async function libSharpnessDecision(cutoutFeathered: Buffer, scene: Buffer) {
  const bg = await sharp(scene).resize(256, 256, { fit: "cover" }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const edge = (g: ArrayLike<number>, w: number, h: number, ok: (i: number) => boolean) => {
    let s = 0, n = 0;
    for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x;
      if (!ok(i)) continue;
      const gx = g[i + 1]! - g[i - 1]!, gy = g[i + w]! - g[i - w]!;
      s += Math.sqrt(gx * gx + gy * gy); n++;
    }
    return n ? s / n : 0;
  };
  const backdrop = edge(bg.data, bg.info.width, bg.info.height, () => true);
  const c = await rawImg(cutoutFeathered, true);
  const gray = new Uint8Array(c.w * c.h), a = new Uint8Array(c.w * c.h);
  for (let i = 0; i < c.w * c.h; i++) {
    const o = i * 4;
    gray[i] = Math.round(0.2126 * c.d[o]! + 0.7152 * c.d[o + 1]! + 0.0722 * c.d[o + 2]!);
    a[i] = c.d[o + 3]!;
  }
  const w = c.w;
  const cut = edge(gray, c.w, c.h, (i) => a[i]! > 250 && a[i - 1]! > 250 && a[i + 1]! > 250 && a[i - w]! > 250 && a[i + w]! > 250);
  const ratio = cut > 0 ? backdrop / cut : 0;
  const branch = cut < 2 ? "skip(cut<2)" : ratio > 1.8 ? "sharpen" : ratio >= 0.55 ? "none" : "blur";
  return { backdropEdge256: r2(backdrop), cutoutEdgeNative: r2(cut), ratio: r2(ratio, 3), branch };
}
async function libGrainValue(scene: Buffer) {
  const base = sharp(scene).resize(256, 256, { fit: "cover" }).grayscale();
  const a = await base.clone().raw().toBuffer();
  const b = await base.clone().blur(1.2).raw().toBuffer();
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i]! - b[i]!);
  const v = s / a.length;
  return { backdropGrain: r2(v, 3), applied: v >= 2.2 };
}

/** 씬 광원 방향 추정: (1) 저해상 블러 휘도의 평균 그래디언트(밝은 쪽), (2) 상위 2% 휘도 무게중심. 각도: 0°=오른쪽, 90°=아래. */
async function estimateLight(scene: Buffer, region?: { left: number; top: number; width: number; height: number }) {
  let s = sharp(scene);
  if (region) s = s.extract(region);
  const { data, info } = await s.resize(96, 96, { fit: "fill" }).grayscale().blur(4).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let gx = 0, gy = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    gx += data[i + 1]! - data[i - 1]!;
    gy += data[i + w]! - data[i - w]!;
  }
  const sorted = Array.from(data).sort((p, q) => p - q);
  const thr = sorted[Math.floor(sorted.length * 0.98)]!;
  let cx = 0, cy = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[y * w + x]! >= thr) { cx += x; cy += y; n++; }
  const bx = cx / n - (w - 1) / 2, by = cy / n - (h - 1) / 2;
  const ang = (x: number, y: number) => r2((Math.atan2(y, x) * 180) / Math.PI, 0);
  const gl = Math.hypot(gx, gy) / ((w - 2) * (h - 2));
  return { gradientAngle: ang(gx, gy), gradientStrength: r2(gl, 3), brightCentroidAngle: ang(bx, by), brightCentroidOffset: r2(Math.hypot(bx, by) / (w / 2), 2) };
}
const angDiff = (a: number, b: number) => {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return r2(d, 0);
};

// ---------- 케이스 ----------
async function prepCutout(def: CaseDef) {
  if (def.cutout.kind === "synthetic257") {
    const { png } = await makeSyntheticCutout(fs.readFileSync(PAIRS[0]!.productPath), PAIRS[0]!);
    return png;
  }
  // removeProductBackground()와 같은 후처리 순서 (sharpenCutout=clarity는 유료라 제외; 투명 컷아웃은 프로덕션도 스킵)
  let b: Buffer = fs.readFileSync(def.cutout.path);
  b = await trimCutoutToOpaqueBounds(b);
  b = await purgeDarkPlateFringe(b);
  b = await defringeCutoutEdges(b);
  return b;
}

function placementFromBase(def: CaseDef, sceneW: number, sceneH: number, cutW: number, cutH: number): HeldObjectPlacement {
  if (def.placement) return def.placement;
  const { x, y, hPct } = def.base!;
  const hPx = (sceneH * hPct) / 100;
  const wPx = hPx * (cutW / cutH);
  const wPct = (wPx / sceneW) * 100;
  return { xPct: x - wPct / 2, yPct: y - hPct, wPct, hPct, rotationDeg: 0, confidence: "high" };
}

async function rawPaste(scene: Buffer, cutout: Buffer, rect: { left: number; top: number; width: number; height: number }) {
  const resized = await sharp(cutout).resize(rect.width, rect.height, { fit: "fill" }).png().toBuffer();
  return sharp(scene).composite([{ input: resized, left: rect.left, top: rect.top }]).png().toBuffer();
}

async function zoomCrop(buf: Buffer, box: { left: number; top: number; width: number; height: number }, W: number, H: number, k: number) {
  const left = Math.max(0, Math.min(W - 1, Math.round(box.left)));
  const top = Math.max(0, Math.min(H - 1, Math.round(box.top)));
  const width = Math.max(1, Math.min(W - left, Math.round(box.width)));
  const height = Math.max(1, Math.min(H - top, Math.round(box.height)));
  return sharp(buf).extract({ left, top, width, height }).resize(width * k, height * k, { kernel: "nearest" }).png().toBuffer();
}
async function sideBySide(a: Buffer, b: Buffer, gap = 8) {
  const ma = await sharp(a).metadata();
  const mb = await sharp(b).metadata();
  const W = (ma.width ?? 0) + (mb.width ?? 0) + gap;
  const H = Math.max(ma.height ?? 0, mb.height ?? 0);
  return sharp({ create: { width: W, height: H, channels: 3, background: { r: 255, g: 0, b: 255 } } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: (ma.width ?? 0) + gap, top: 0 }])
    .png()
    .toBuffer();
}

// ---------- 제안 프로토타입 (스크립트 전용, lib 미변경) ----------
async function alpha1ch(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  if (data.length !== info.width * info.height) throw new Error("alpha1ch size");
  return { a: data, w: info.width, h: info.height };
}
/** featherCutout과 같은 erode+blur, 단 RGB premultiply 없음 + 알파<250 픽셀 RGB를 가장 가까운 불투명 내부색으로 치환(최대 12px BFS). */
async function featherDecontam(input: Buffer, canvasSize: number) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = data[i * 4 + 3]!;
  const er = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 255;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.min(m, a[Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))]!);
    er[y * w + x] = m;
  }
  const out = Buffer.from(data);
  const seen = new Int32Array(w * h).fill(-1);
  let q: number[] = [];
  for (let i = 0; i < w * h; i++) if (a[i]! >= 250) { seen[i] = i; q.push(i); }
  for (let step = 0; step < 12 && q.length; step++) {
    const nq: number[] = [];
    for (const i of q) {
      const x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (seen[j]! >= 0) continue;
        seen[j] = seen[i]!;
        nq.push(j);
      }
    }
    q = nq;
  }
  for (let i = 0; i < w * h; i++) {
    if (a[i]! >= 250 || seen[i]! < 0) continue;
    const s = seen[i]! * 4;
    out[i * 4] = data[s]!; out[i * 4 + 1] = data[s + 1]!; out[i * 4 + 2] = data[s + 2]!;
  }
  for (let i = 0; i < w * h; i++) out[i * 4 + 3] = er[i]!;
  const span = Math.max(w, h);
  const sigma = Math.max(1.2, Math.min(4.8, 2.4 * (span / (canvasSize * 0.5))));
  const rgb = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).removeAlpha().png().toBuffer();
  const al = await sharp(Buffer.from(er), { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
  const joined = Buffer.alloc(w * h * 4);
  const rgbRaw = await sharp(rgb).raw().toBuffer();
  for (let i = 0; i < w * h; i++) { joined[i * 4] = rgbRaw[i * 3]!; joined[i * 4 + 1] = rgbRaw[i * 3 + 1]!; joined[i * 4 + 2] = rgbRaw[i * 3 + 2]!; joined[i * 4 + 3] = al[i]!; }
  return sharp(joined, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
/** buildSilhouetteShadowBuffer과 같은 opacity/σ/오프셋, 단 알파를 1채널로 정확히 읽음(+ 선택적 광원 벡터). */
async function silhouetteShadowFixed(cut: Buffer, W: number, H: number, rect: { left: number; top: number; width: number; height: number }, tint: { r: number; g: number; b: number }, offset: { ox: number; oy: number }) {
  const { a, w, h } = await alpha1ch(cut);
  const sigma = Math.max(6, Math.min(28, Math.min(w, h) * 0.055));
  const pad = Math.ceil(sigma * 3);
  const pw = w + 2 * pad, ph = h + 2 * pad;
  const opacity = Math.min(0.38, Math.max(0.14, DEFAULT_SHADOW.shadowIntensity + 0.08));
  const faded = Buffer.alloc(pw * ph);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) faded[(y + pad) * pw + x + pad] = Math.round(a[y * w + x]! * opacity);
  const blurredA = await sharp(faded, { raw: { width: pw, height: ph, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
  const canvas = Buffer.alloc(W * H * 4);
  const left = Math.round(rect.left + offset.ox) - pad, top = Math.round(rect.top + offset.oy + h * 0.02) - pad;
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const X = x + left, Y = y + top;
    if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
    const o = (Y * W + X) * 4;
    canvas[o] = tint.r; canvas[o + 1] = tint.g; canvas[o + 2] = tint.b; canvas[o + 3] = blurredA[y * pw + x]!;
  }
  return sharp(canvas, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}
/** 짧은 접지 그림자: 바닥선 아래 타원, 높이 0.06·h, opacity 0.45, blur 2px. */
async function contactShadow(cut: Buffer, W: number, H: number, rect: { left: number; top: number; width: number; height: number }, tint: { r: number; g: number; b: number }) {
  const { a, w, h } = await alpha1ch(cut);
  let bottom = -1;
  for (let y = h - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < w; x++) if (a[y * w + x]! >= 200) { bottom = y; break; }
  let minX = w, maxX = -1;
  for (let y = Math.max(0, bottom - Math.round(h * 0.04)); y <= bottom; y++) for (let x = 0; x < w; x++) if (a[y * w + x]! >= 200) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  const cx = rect.left + (minX + maxX) / 2, cy = rect.top + bottom + 1;
  const rx = Math.max(4, ((maxX - minX) / 2) * 1.05), ry = Math.max(2, h * 0.03);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgb(${tint.r},${tint.g},${tint.b})" fill-opacity="0.45" filter="url(#b)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function runCase(def: CaseDef) {
  const scene = await sharp(fs.readFileSync(def.scene)).png().toBuffer();
  const sm = await sharp(scene).metadata();
  const W = sm.width!, H = sm.height!;
  const cutoutIn = await prepCutout(def);
  const cm = await sharp(cutoutIn).metadata();
  const placement = placementFromBase(def, W, H, cm.width!, cm.height!);

  const prod = await pasteCutoutOnSceneDetailed({ sceneBuffer: scene, cutoutBuffer: cutoutIn, placement });
  const { rect, cutoutPrepared } = prod;
  const final = prod.buffer;

  // 같은 기하·같은 회전의 raw (페더/매칭/그림자/림 없음)
  const rotated = await sharp(cutoutIn).rotate(placement.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const raw = await rawPaste(scene, rotated, rect);
  const resizedPre = await sharp(rotated).resize(rect.width, rect.height, { fit: "fill" }).png().toBuffer();
  const feathered = await featherCutout(resizedPre, Math.max(W, H));

  // 그림자 버퍼 재구성 (프로덕션과 같은 인자)
  const tint = tintedShadowColor(await sampleBackdropAmbientColor(scene));
  const shadowBuf = await buildSilhouetteShadowBuffer(cutoutPrepared, W, H, rect, { ...DEFAULT_SHADOW }, tint);
  const sceneWithShadow = await sharp(scene).composite([{ input: shadowBuf, left: 0, top: 0, blend: "multiply" }]).png().toBuffer();

  const S = await rawImg(scene);
  const F = await rawImg(final);
  const R = await rawImg(raw);
  const SW = await rawImg(sceneWithShadow);
  const P = await rawImg(cutoutPrepared, true);
  const Pre = await rawImg(resizedPre, true);
  const shA = (await rawImg(shadowBuf, true));

  const aP = new Uint8Array(P.w * P.h);
  for (let i = 0; i < P.w * P.h; i++) aP[i] = P.d[i * 4 + 3]!;
  const aPre = new Uint8Array(Pre.w * Pre.h);
  for (let i = 0; i < Pre.w * Pre.h; i++) aPre[i] = Pre.d[i * 4 + 3]!;
  const inRect = (x: number, y: number) => x >= rect.left && y >= rect.top && x < rect.left + rect.width && y < rect.top + rect.height;
  const alphaAtScene = (arr: Uint8Array, x: number, y: number) => (inRect(x, y) ? arr[(y - rect.top) * rect.width + (x - rect.left)]! : 0);

  // ---- (c) halo ----
  const distP = signedEdgeDistance(aP, P.w, P.h, 128, 8);
  const distPre = signedEdgeDistance(aPre, Pre.w, Pre.h, 128, 8);
  const ringDelta = (img: Img, ref: Img, dist: Int8Array, lo: number, hi: number) => {
    let s = 0, n = 0, darker2 = 0;
    for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
      const d = dist[y * rect.width + x]!;
      if (d > -lo || d < -hi) continue;
      const i = ((y + rect.top) * W + x + rect.left) * 3;
      const dl = Lstar(img.d[i]!, img.d[i + 1]!, img.d[i + 2]!) - Lstar(ref.d[i]!, ref.d[i + 1]!, ref.d[i + 2]!);
      s += dl; n++; if (dl <= -2) darker2++;
    }
    return { meanDeltaL: r2(s / Math.max(n, 1)), pctDarkerBy2: r2((100 * darker2) / Math.max(n, 1), 1), n };
  };
  // 밴드(알파 0.05~0.95)의 전경 RGB 휘도 / 근처 불투명 내부 휘도
  const bandFgRatio = (img: Img, a: Uint8Array) => {
    const ratios: number[] = [];
    let lowAlphaLum = 0, lowAlphaN = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      const av = a[i]!;
      if (av >= 5 && av < 77) {
        const o = i * 4;
        lowAlphaLum += 0.2126 * img.d[o]! + 0.7152 * img.d[o + 1]! + 0.0722 * img.d[o + 2]!;
        lowAlphaN++;
      }
      if (av < 13 || av > 242) continue;
      let s = 0, n = 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
        const j = yy * img.w + xx;
        if (a[j]! < 250) continue;
        const o = j * 4;
        s += 0.2126 * img.d[o]! + 0.7152 * img.d[o + 1]! + 0.0722 * img.d[o + 2]!; n++;
      }
      if (n < 3 || s / n < 8) continue;
      const o = i * 4;
      ratios.push((0.2126 * img.d[o]! + 0.7152 * img.d[o + 1]! + 0.0722 * img.d[o + 2]!) / (s / n));
    }
    ratios.sort((p, q) => p - q);
    let band = 0;
    for (const v of a) if (v >= 13 && v <= 242) band++;
    return {
      medianFgLumRatio: ratios.length ? r2(ratios[Math.floor(ratios.length / 2)]!, 3) : null,
      bandPx: band,
      bandWidthPxApprox: r2(band / Math.max(1, perimeter(a, img.w, img.h)), 2),
      lowAlphaMeanLum: lowAlphaN ? r2(lowAlphaLum / lowAlphaN, 1) : null,
    };
  };
  function perimeter(a: Uint8Array, w: number, h: number) {
    let p = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (a[i]! < 128) continue;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || a[i - 1]! < 128 || a[i + 1]! < 128 || a[i - w]! < 128 || a[i + w]! < 128) p++;
    }
    return p;
  }
  // 원본 배경색 오염: 원본 컷아웃(리사이즈 전처리본)의 소프트 밴드 Lab vs 내부 Lab
  const contamination = (() => {
    const band = meanLab({ d: Pre.d, w: Pre.w, h: Pre.h, c: 4 }, (x, y) => { const v = aPre[y * Pre.w + x]!; return v >= 13 && v <= 242; });
    const interior = meanLab({ d: Pre.d, w: Pre.w, h: Pre.h, c: 4 }, (x, y) => distPre[y * Pre.w + x]! >= 3 && distPre[y * Pre.w + x]! <= 8);
    if (!band || !interior) return null;
    return { bandLab: [band.L, band.a, band.b], nearInteriorLab: [interior.L, interior.a, interior.b], dE: r2(Math.hypot(band.L - interior.L, band.a - interior.a, band.b - interior.b), 1) };
  })();
  const halo = {
    outerRing1to4_final_vs_sceneWithShadow: ringDelta(F, SW, distP, 1, 4),
    outerRing1to4_raw_vs_scene: ringDelta(R, S, distPre, 1, 4),
    innerRing0to2_final_vs_sceneWithShadow: (() => {
      let s = 0, n = 0;
      for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
        const d = distP[y * rect.width + x]!;
        if (d < 1 || d > 2) continue;
        const i = ((y + rect.top) * W + x + rect.left) * 3;
        s += Lstar(F.d[i]!, F.d[i + 1]!, F.d[i + 2]!); n++;
      }
      let s2 = 0, n2 = 0;
      for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
        const d = distP[y * rect.width + x]!;
        if (d < 5 || d > 8) continue;
        const i = ((y + rect.top) * W + x + rect.left) * 3;
        s2 += Lstar(F.d[i]!, F.d[i + 1]!, F.d[i + 2]!); n2++;
      }
      return { edgeL: r2(s / Math.max(n, 1), 1), interior5to8L: r2(s2 / Math.max(n2, 1), 1) };
    })(),
    innerRing0to2_raw: (() => {
      let s = 0, n = 0, s2 = 0, n2 = 0;
      for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
        const d = distPre[y * rect.width + x]!;
        const i = ((y + rect.top) * W + x + rect.left) * 3;
        if (d >= 1 && d <= 2) { s += Lstar(R.d[i]!, R.d[i + 1]!, R.d[i + 2]!); n++; }
        if (d >= 5 && d <= 8) { s2 += Lstar(R.d[i]!, R.d[i + 1]!, R.d[i + 2]!); n2++; }
      }
      return { edgeL: r2(s / Math.max(n, 1), 1), interior5to8L: r2(s2 / Math.max(n2, 1), 1) };
    })(),
    band_preFeather: bandFgRatio(Pre, aPre),
    band_afterFeatherOnly: bandFgRatio(await rawImg(feathered, true), (() => { const f = new Uint8Array(rect.width * rect.height); return f; })()),
    band_prepared: bandFgRatio(P, aP),
    originalBgContamination: contamination,
  };
  // band_afterFeatherOnly 재계산 (알파 배열 필요)
  {
    const Fe = await rawImg(feathered, true);
    const aFe = new Uint8Array(Fe.w * Fe.h);
    for (let i = 0; i < Fe.w * Fe.h; i++) aFe[i] = Fe.d[i * 4 + 3]!;
    halo.band_afterFeatherOnly = bandFgRatio(Fe, aFe);
  }

  // ---- (b) color temperature ----
  const ringPad = Math.round(Math.max(rect.width, rect.height) * 0.35);
  const ringPred = (x: number, y: number) =>
    x >= rect.left - ringPad && x < rect.left + rect.width + ringPad && y >= rect.top - ringPad && y < rect.top + rect.height + ringPad && alphaAtScene(aP, x, y) < 8 && !(inRect(x, y) && distP[(y - rect.top) * rect.width + (x - rect.left)]! > -6);
  const localRing = meanLab(S, ringPred);
  const bg256 = await sharp(scene).resize(256, 256, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const corner = (() => {
    const patch = 48; let r = 0, g = 0, b = 0, n = 0;
    for (const [ox, oy] of [[0, 0], [256 - patch, 0], [0, 256 - patch], [256 - patch, 256 - patch]] as const)
      for (let y = oy; y < oy + patch; y += 2) for (let x = ox; x < ox + patch; x += 2) { const i = (y * 256 + x) * 3; r += bg256.data[i]!; g += bg256.data[i + 1]!; b += bg256.data[i + 2]!; n++; }
    const l = lab(r / n, g / n, b / n);
    return { rgb: [r2(r / n, 0), r2(g / n, 0), r2(b / n, 0)], L: r2(l.L, 1), a: r2(l.a, 1), b: r2(l.b, 1), RB: r2(r / b, 3) };
  })();
  const prodOrig = meanLab({ d: Pre.d, w: Pre.w, h: Pre.h, c: 4 }, (x, y) => aPre[y * Pre.w + x]! >= 200);
  const prodFinal = meanLab(F, (x, y) => alphaAtScene(aP, x, y) >= 250);
  const color = {
    wbTarget_sceneCorners256: corner,
    localRing_scene: localRing,
    targetVsLocal_dE: localRing ? r2(Math.hypot(corner.L - localRing.L, corner.a - localRing.a, corner.b - localRing.b), 1) : null,
    targetVsLocal_dAB: localRing ? r2(Math.hypot(corner.a - localRing.a, corner.b - localRing.b), 1) : null,
    product_orig: prodOrig,
    product_final: prodFinal,
    productShift_dL_da_db: prodOrig && prodFinal ? [r2(prodFinal.L - prodOrig.L, 1), r2(prodFinal.a - prodOrig.a, 1), r2(prodFinal.b - prodOrig.b, 1)] : null,
    product_minus_local_L: prodFinal && localRing ? r2(prodFinal.L - localRing.L, 1) : null,
  };

  // ---- (a) light / shadow / contact ----
  const lightGlobal = await estimateLight(scene);
  const gx0 = Math.max(0, rect.left - rect.width), gy0 = Math.max(0, rect.top - rect.height);
  const lightLocal = await estimateLight(scene, { left: gx0, top: gy0, width: Math.min(W, rect.left + 2 * rect.width) - gx0, height: Math.min(H, rect.top + 2 * rect.height) - gy0 });
  // DEFAULT_SHADOW upper-left → shadowOffsets (w*0.055, h*0.045+h*0.02) → 광원은 그 반대
  const ox = rect.width * 0.055, oy = rect.height * 0.045 + rect.height * 0.02;
  const assumedLightAngle = r2((Math.atan2(-oy, -ox) * 180) / Math.PI, 0);
  // 그림자 알파 무게중심 vs 컷아웃 무게중심
  let sx = 0, sy = 0, sn = 0, cx = 0, cy = 0, cn = 0, shMax = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = shA.d[(y * W + x) * 4 + 3]!; if (v > shMax) shMax = v; sx += x * v; sy += y * v; sn += v; }
  for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) { const v = aP[y * rect.width + x]!; cx += (x + rect.left) * v; cy += (y + rect.top) * v; cn += v; }
  const shadowOffset = { dxPx: r2(sx / sn - cx / cn, 1), dyPx: r2(sy / sn - cy / cn, 1), dxFracW: r2((sx / sn - cx / cn) / rect.width, 3), dyFracH: r2((sy / sn - cy / cn) / rect.height, 3), peakShadowAlpha: r2(shMax / 255, 3) };

  // 접지: 불투명(≥200) 최하단 행 주변 컬럼에서 바로 아래 1~3px
  let bottom = -1;
  for (let y = rect.height - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < rect.width; x++) if (aP[y * rect.width + x]! >= 200) { bottom = y; break; }
  const baseCols: number[] = [];
  for (let x = 0; x < rect.width; x++) {
    let by = -1;
    for (let y = rect.height - 1; y >= 0; y--) if (aP[y * rect.width + x]! >= 200) { by = y; break; }
    if (by >= 0 && bottom - by <= 3) baseCols.push(x);
  }
  const contactRows = [1, 2, 3, 4, 5, 6].map((k) => rect.top + bottom + k).filter((y) => y < H);
  const sampleL = (img: Img, xs: number[], ys: number[]) => {
    let s = 0, n = 0;
    for (const y of ys) for (const x of xs) { if (x < 0 || x >= W) continue; const i = (y * W + x) * 3; s += Lstar(img.d[i]!, img.d[i + 1]!, img.d[i + 2]!); n++; }
    return n ? s / n : NaN;
  };
  const underXs = baseCols.map((x) => x + rect.left);
  const span = baseCols.length ? baseCols[baseCols.length - 1]! - baseCols[0]! + 1 : 0;
  const sideOff = Math.round(rect.width * 0.35);
  const sideXs = [...baseCols.map((x) => x + rect.left - span - sideOff), ...baseCols.map((x) => x + rect.left + span + sideOff)];
  const shadowAlphaUnder = (() => { let s = 0, n = 0; for (const y of contactRows.slice(0, 3)) for (const x of underXs) { s += shA.d[(y * W + x) * 4 + 3]!; n++; } return n ? r2(s / n / 255, 3) : null; })();
  const contact = {
    baseColumns: baseCols.length,
    underBase_final_L: r2(sampleL(F, underXs, contactRows.slice(0, 3)), 1),
    underBase_scene_L: r2(sampleL(S, underXs, contactRows.slice(0, 3)), 1),
    darkeningUnderBase_dL: r2(sampleL(S, underXs, contactRows.slice(0, 3)) - sampleL(F, underXs, contactRows.slice(0, 3)), 2),
    sideFloor_final_L: r2(sampleL(F, sideXs, contactRows.slice(0, 3)), 1),
    contactContrastVsSideFloor_dL: r2(sampleL(F, sideXs, contactRows.slice(0, 3)) - sampleL(F, underXs, contactRows.slice(0, 3)), 2),
    shadowAlphaUnderBase: shadowAlphaUnder,
  };

  // ---- (d) scale ----
  const srcOpaqueH = await (async () => { const a = await rawImg(rotated, true); let t = a.h, b = -1; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.d[(y * a.w + x) * 4 + 3]! >= 128) { if (y < t) t = y; if (y > b) b = y; } return b - t + 1; })();
  const pasteOpaqueH = (() => { let t = rect.height, b = -1; for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) if (aP[y * rect.width + x]! >= 128) { if (y < t) t = y; if (y > b) b = y; } return b - t + 1; })();
  const scale = { sceneWH: [W, H], rect, cutoutSrcOpaqueH: srcOpaqueH, pasteOpaqueH, resampleFactor: r2(pasteOpaqueH / srcOpaqueH, 3), heightFracOfScene: r2(pasteOpaqueH / H, 3), transparentMarginBelowBasePx: rect.height - 1 - bottom };

  // ---- (e) resolution ----
  const gF = grayOf(F);
  const gS = grayOf(S);
  const prodInterior = (x: number, y: number) => inRect(x, y) && distP[(y - rect.top) * rect.width + (x - rect.left)]! >= 4;
  const resolution = {
    product_final: sharpnessStats(gF, W, H, prodInterior),
    product_raw: sharpnessStats(grayOf(R), W, H, (x, y) => inRect(x, y) && distPre[(y - rect.top) * rect.width + (x - rect.left)]! >= 4),
    sceneRing: sharpnessStats(gS, W, H, ringPred),
    libSharpness: await libSharpnessDecision(feathered, scene),
    libGrain: await libGrainValue(scene),
  };
  const ratioHF = resolution.product_final && resolution.sceneRing ? r2(resolution.product_final.hf / Math.max(resolution.sceneRing.hf, 1e-3), 2) : null;
  const ratioLap = resolution.product_final && resolution.sceneRing ? r2(resolution.product_final.lapVar / Math.max(resolution.sceneRing.lapVar, 1e-3), 2) : null;

  // rim gate 재현
  const rimGate = (() => {
    const ex = Math.round(rect.width * 0.5), ey = Math.round(rect.height * 0.5);
    let s = 0, n = 0;
    for (let y = Math.max(0, rect.top - ey); y < Math.min(H, rect.top + rect.height + ey); y++) for (let x = Math.max(0, rect.left - ex); x < Math.min(W, rect.left + rect.width + ex); x++) { const i = (y * W + x) * 3; s += 0.299 * S.d[i]! + 0.587 * S.d[i + 1]! + 0.114 * S.d[i + 2]!; n++; }
    return { gateLum: r2(s / n, 1), rimOn: s / n < 60 };
  })();

  // ---- 제안 프로토타입 ----
  const fixedOffset = { ox: rect.width * 0.055, oy: rect.height * 0.045 };
  const shadowFixedProdCut = await silhouetteShadowFixed(cutoutPrepared, W, H, rect, tint, fixedOffset);
  const shadowCentroid = async (buf: Buffer) => {
    const s = await rawImg(buf, true);
    let x0 = 0, y0 = 0, n0 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = s.d[(y * W + x) * 4 + 3]!; x0 += x * v; y0 += y * v; n0 += v; }
    return { dxFracW: r2((x0 / n0 - cx / cn) / rect.width, 3), dyFracH: r2((y0 / n0 - cy / cn) / rect.height, 3) };
  };
  // 그림자 모양 정확도: (그림자 알파) 와 (오프셋만큼 옮긴 컷아웃 알파를 같은 σ로 블러한 것) 의 상관
  const silhouetteIoU = async (buf: Buffer) => {
    const s = await rawImg(buf, true);
    let inside = 0, total = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = s.d[(y * W + x) * 4 + 3]!;
      if (v < 8) continue;
      total += v;
      const ux = Math.round(x - fixedOffset.ox), uy = Math.round(y - fixedOffset.oy - rect.height * 0.02);
      if (inRect(ux, uy)) {
        // 컷아웃 실루엣 ± 블러 반경(σ) 안이면 inside
        const sig = Math.max(6, Math.min(28, Math.min(rect.width, rect.height) * 0.055));
        const d = distP[(uy - rect.top) * rect.width + (ux - rect.left)]!;
        if (d > 0 || -d <= Math.min(8, sig)) inside += v;
      }
    }
    return r2(inside / Math.max(total, 1), 3);
  };
  const featheredFix = await featherDecontam(resizedPre, Math.max(W, H));
  let propCut = await matchCutoutWhiteBalance(featheredFix, scene);
  propCut = await matchCutoutSharpness(propCut, scene);
  propCut = await matchCutoutGrain(propCut, scene);
  const propShadow = await silhouetteShadowFixed(propCut, W, H, rect, tint, fixedOffset);
  const propContact = await contactShadow(propCut, W, H, rect, tint);
  const propSceneShadow = await sharp(scene).composite([{ input: propShadow, blend: "multiply" }, ...(def.mode === "resting" ? [{ input: propContact, blend: "multiply" as const }] : [])]).png().toBuffer();
  const proposal = await sharp(propSceneShadow).composite([{ input: propCut, left: rect.left, top: rect.top }]).png().toBuffer();
  const PR = await rawImg(proposal);
  const PSS = await rawImg(propSceneShadow);
  const PC = await rawImg(propCut, true);
  const aPC = new Uint8Array(PC.w * PC.h);
  for (let i = 0; i < PC.w * PC.h; i++) aPC[i] = PC.d[i * 4 + 3]!;
  const distPC = signedEdgeDistance(aPC, PC.w, PC.h, 128, 8);
  const proposalMetrics = {
    shadowCentroid_prod: { dxFracW: shadowOffset.dxFracW, dyFracH: shadowOffset.dyFracH },
    shadowCentroid_fixedAlphaRead: await shadowCentroid(shadowFixedProdCut),
    expectedOffset: { dxFracW: 0.055, dyFracH: 0.065 },
    shadowMassWithinSilhouette_prod: await silhouetteIoU(shadowBuf),
    shadowMassWithinSilhouette_fixed: await silhouetteIoU(shadowFixedProdCut),
    outerRing1to4_proposal: ringDelta(PR, PSS, distPC, 1, 4),
    band_proposal: bandFgRatio(PC, aPC),
    contact_proposal: def.mode === "resting" ? {
      darkeningUnderBase_dL: r2(sampleL(S, underXs, contactRows.slice(0, 3)) - sampleL(PR, underXs, contactRows.slice(0, 3)), 2),
      contactContrastVsSideFloor_dL: r2(sampleL(PR, sideXs, contactRows.slice(0, 3)) - sampleL(PR, underXs, contactRows.slice(0, 3)), 2),
    } : "n/a (held)",
  };

  // ---- images ----
  const id = def.id;
  fs.writeFileSync(path.join(OUT, `${id}-proposal.png`), proposal);
  fs.writeFileSync(path.join(OUT, `${id}-final.png`), final);
  fs.writeFileSync(path.join(OUT, `${id}-raw.png`), raw);
  const ctxPad = Math.round(Math.max(rect.width, rect.height) * 0.6);
  const ctxBox = { left: rect.left - ctxPad, top: rect.top - ctxPad, width: rect.width + 2 * ctxPad, height: rect.height + 2 * ctxPad };
  const clampBox = (b: typeof ctxBox) => { const l = Math.max(0, b.left), t = Math.max(0, b.top); return { left: l, top: t, width: Math.min(W, b.left + b.width) - l, height: Math.min(H, b.top + b.height) - t }; };
  const cb = clampBox(ctxBox);
  fs.writeFileSync(path.join(OUT, `${id}-context-raw-vs-final.png`), await sideBySide(await zoomCrop(raw, cb, W, H, 1), await zoomCrop(final, cb, W, H, 1)));
  const contactW = Math.max(60, Math.round(rect.width * 0.7));
  const contactH = Math.max(40, Math.round(rect.height * 0.3));
  const contactBox = clampBox({ left: rect.left + Math.round(rect.width / 2 - contactW / 2), top: rect.top + bottom - Math.round(contactH * 0.55), width: contactW, height: contactH });
  const k = Math.max(2, Math.min(3, Math.floor(900 / contactBox.width)));
  fs.writeFileSync(path.join(OUT, `${id}-contact-zoom${k}x-raw-vs-final.png`), await sideBySide(await zoomCrop(raw, contactBox, W, H, k), await zoomCrop(final, contactBox, W, H, k)));
  // 왼쪽 경계: 중간 높이에서 가장 왼쪽 불투명 픽셀
  const midY = Math.round(rect.height * 0.45);
  let leftX = 0;
  for (let x = 0; x < rect.width; x++) if (aP[midY * rect.width + x]! >= 128) { leftX = x; break; }
  const eS = Math.max(36, Math.round(Math.min(rect.width, rect.height) * 0.18));
  const edgeBox = clampBox({ left: rect.left + leftX - Math.round(eS / 2), top: rect.top + midY - Math.round(eS / 2), width: eS, height: eS });
  fs.writeFileSync(path.join(OUT, `${id}-edge-zoom4x-raw-vs-final.png`), await sideBySide(await zoomCrop(raw, edgeBox, W, H, 4), await zoomCrop(final, edgeBox, W, H, 4)));
  fs.writeFileSync(path.join(OUT, `${id}-proposal-context-final-vs-proposal.png`), await sideBySide(await zoomCrop(final, cb, W, H, 1), await zoomCrop(proposal, cb, W, H, 1)));
  fs.writeFileSync(path.join(OUT, `${id}-proposal-contact-zoom${k}x-final-vs-proposal.png`), await sideBySide(await zoomCrop(final, contactBox, W, H, k), await zoomCrop(proposal, contactBox, W, H, k)));
  // 그림자 알파만 시각화 (prod 버그 vs 1채널 수정), ×3 게인
  const shadowVis = async (buf: Buffer) => sharp(await zoomCrop(buf, cb, W, H, 1)).extractChannel(3).linear(3, 0).png().toBuffer();
  fs.writeFileSync(path.join(OUT, `${id}-shadow-alpha-x3-prod-vs-fixed.png`), await sideBySide(await shadowVis(shadowBuf), await shadowVis(shadowFixedProdCut)));

  return {
    id, category: def.category, mode: def.mode,
    cutout: def.cutout.kind === "file" ? path.relative(ROOT, def.cutout.path) : "synthetic257",
    scene: path.relative(ROOT, def.scene), placement: { ...placement, xPct: r2(placement.xPct), yPct: r2(placement.yPct), wPct: r2(placement.wPct) },
    rimGate,
    a_light: { assumedLightAngle, lightGlobal, lightLocal, diffVsGlobalGradient: angDiff(assumedLightAngle, lightGlobal.gradientAngle), diffVsLocalGradient: angDiff(assumedLightAngle, lightLocal.gradientAngle), diffVsBrightCentroid: angDiff(assumedLightAngle, lightGlobal.brightCentroidAngle), shadowOffset, contact },
    b_color: color,
    c_halo: halo,
    d_scale: scale,
    e_resolution: { ...resolution, productOverSceneHF: ratioHF, productOverSceneLapVar: ratioLap },
    proposal: proposalMetrics,
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const def of CASES) {
    try {
      const r = await runCase(def);
      results.push(r);
      console.log(JSON.stringify(r));
    } catch (e) {
      console.error(`[286cha] ${def.id} failed`, e);
      results.push({ id: def.id, error: String(e) });
    }
  }
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(`[286cha] done → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
