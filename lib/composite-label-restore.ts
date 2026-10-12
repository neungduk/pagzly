import sharp from "sharp";

/**
 * 생성형 배경 교체(Kontext 등)는 상품까지 다시 그려 라벨 글자가 뭉개진다("Alpha Arbutin"→"Alpha Albata").
 * 원본 컷아웃을 생성 결과 속 상품 위치·크기에 맞춰 찾아 원본 픽셀로 되덮는다.
 * 정합 점수가 낮으면(구도가 크게 바뀐 경우) 손대지 않고 생성 결과를 그대로 쓴다.
 */

export type LabelRestoreResult = {
  buffer: Buffer;
  applied: boolean;
  score: number;
  box?: { left: number; top: number; width: number; height: number };
};

// 생성 모델이 라벨을 다시 그려 상관은 0.35~0.5대로 낮다 — 대신 다른 위치보다 확실히 높은지(뾰족함)로 오정합을 막는다
const MIN_SCORE = 0.35;
const MIN_PEAK_MARGIN = 0.08;
const COARSE_W = 128;
const FINE_W = 384;

// 회색조는 흰 용기 위 색 라벨의 차이를 잃는다 — RGB 3채널을 그대로 비교
type Gray = { data: Float32Array; w: number; h: number };
type Patch = { gray: Float32Array; mask: Uint8Array; w: number; h: number };

async function toGray(buf: Buffer, width: number): Promise<Gray> {
  const { data, info } = await sharp(buf).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Float32Array.from(data), w: info.width, h: info.height };
}

async function cutoutBounds(cutout: Buffer) {
  const { data, info } = await sharp(cutout).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3]! > 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function makePatch(product: Buffer, w: number, h: number): Promise<Patch> {
  const { data } = await sharp(product).resize(w, h, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const gray = new Float32Array(w * h * 3);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) gray[i * 3 + c] = data[i * 4 + c]!;
    mask[i] = data[i * 4 + 3]! > 230 ? 1 : 0;
  }
  return { gray, mask, w, h };
}

/** 마스크 안쪽 정규화 상호상관(RGB 합산) — 조명이 바뀌어도 형태·라벨 배치가 같으면 높다 */
function ncc(g: Gray, p: Patch, ox: number, oy: number): number {
  let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let y = 0; y < p.h; y++) {
    const gr = ((oy + y) * g.w + ox) * 3;
    const pr = y * p.w;
    for (let x = 0; x < p.w; x++) {
      if (!p.mask[pr + x]) continue;
      for (let c = 0; c < 3; c++) {
        const a = g.data[gr + x * 3 + c]!;
        const b = p.gray[(pr + x) * 3 + c]!;
        n++; sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b;
      }
    }
  }
  if (n < 120) return -1;
  const cov = sab - (sa * sb) / n;
  const va = saa - (sa * sa) / n;
  const vb = sbb - (sb * sb) / n;
  return va > 1e-6 && vb > 1e-6 ? cov / Math.sqrt(va * vb) : -1;
}

async function search(
  g: Gray,
  product: Buffer,
  aspect: number,
  widths: number[],
  pos?: { x: number; y: number; r: number },
) {
  let best = { score: -1, x: 0, y: 0, w: 0, h: 0 };
  for (const pw of widths) {
    const w = Math.round(pw);
    const h = Math.round(pw * aspect);
    if (w < 8 || h < 8 || w > g.w || h > g.h) continue;
    const p = await makePatch(product, w, h);
    const x0 = pos ? Math.max(0, pos.x - pos.r) : 0;
    const x1 = pos ? Math.min(g.w - w, pos.x + pos.r) : g.w - w;
    const y0 = pos ? Math.max(0, pos.y - pos.r) : 0;
    const y1 = pos ? Math.min(g.h - h, pos.y + pos.r) : g.h - h;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const s = ncc(g, p, x, y);
        if (s > best.score) best = { score: s, x, y, w, h };
      }
    }
  }
  return best;
}

/** 최고점 크기로, 최고점에서 패치 1/3 이상 떨어진 위치 중 최대 상관 */
async function secondPeak(g: Gray, product: Buffer, best: { x: number; y: number; w: number; h: number }) {
  const p = await makePatch(product, best.w, best.h);
  let s2 = -1;
  for (let y = 0; y + best.h <= g.h; y++)
    for (let x = 0; x + best.w <= g.w; x++) {
      if (Math.abs(x - best.x) <= best.w / 3 && Math.abs(y - best.y) <= best.h / 3) continue;
      const s = ncc(g, p, x, y);
      if (s > s2) s2 = s;
    }
  return s2;
}

function channelStats(data: Buffer, alpha: Buffer | null, channels: number, maskFrom: Buffer, w: number, h: number) {
  const sum = [0, 0, 0], sq = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    if (maskFrom[i * 4 + 3]! < 230) continue;
    n++;
    for (let c = 0; c < 3; c++) {
      const v = data[i * channels + c]!;
      sum[c] += v;
      sq[c] += v * v;
    }
  }
  void alpha;
  return [0, 1, 2].map((c) => {
    const m = n ? sum[c]! / n : 0;
    return { mean: m, std: n ? Math.sqrt(Math.max(1, sq[c]! / n - m * m)) : 1 };
  });
}

/**
 * 컷아웃을 연결 성분(용기 하나하나)으로 나눈다 — 생성 모델은 여러 용기의 간격을 조금씩 바꿔
 * 그리므로 통째로 한 번에 맞추면 점수가 떨어진다. 전체 면적 8% 미만 조각은 버린다.
 */
async function splitComponents(cutout: Buffer): Promise<Buffer[]> {
  const { data, info } = await sharp(cutout).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const step = Math.max(1, Math.round(Math.max(w, h) / 256));
  const gw = Math.ceil(w / step), gh = Math.ceil(h / step);
  const grid = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++)
      grid[gy * gw + gx] = data[((Math.min(h - 1, gy * step)) * w + Math.min(w - 1, gx * step)) * 4 + 3]! > 128 ? 1 : 0;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  const labelGrid = (src: Uint8Array) => {
    const label = new Int32Array(gw * gh).fill(-1);
    const comps: { area: number; id: number }[] = [];
    for (let i = 0; i < gw * gh; i++) {
      if (!src[i] || label[i]! >= 0) continue;
      const c = { area: 0, id: comps.length };
      const stack = [i];
      label[i] = c.id;
      while (stack.length) {
        const j = stack.pop()!;
        const x = j % gw, y = (j / gw) | 0;
        c.area++;
        for (const [dx, dy] of N4) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const k = ny * gw + nx;
          if (src[k] && label[k]! < 0) { label[k] = c.id; stack.push(k); }
        }
      }
      comps.push(c);
    }
    return { label, comps };
  };
  const total = grid.reduce((s, v) => s + v, 0);
  const significant = <T extends { area: number }>(cs: T[], base: number) => cs.filter((c) => c.area >= base * 0.08);

  // 맞닿은 용기는 마스크를 깎아(침식) 갈라질 때까지 본다 — 최대 8단계
  let work = grid;
  let { label, comps } = labelGrid(work);
  for (let iter = 0; iter < 8 && significant(comps, total).length < 2; iter++) {
    const next = new Uint8Array(gw * gh);
    for (let y = 1; y < gh - 1; y++)
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        next[i] = work[i] && work[i - 1] && work[i + 1] && work[i - gw] && work[i + gw] ? 1 : 0;
      }
    work = next;
    ({ label, comps } = labelGrid(work));
  }
  const keepIds = new Set(significant(comps, comps.reduce((s, c) => s + c.area, 0)).map((c) => c.id));
  if (keepIds.size <= 1) return [cutout];
  // 깎인 씨앗에서 원래 마스크 범위로 다시 번져 각 픽셀을 가장 가까운 용기에 배정
  const queue: number[] = [];
  for (let i = 0; i < gw * gh; i++) {
    if (label[i]! >= 0 && !keepIds.has(label[i]!)) label[i] = -1;
    if (label[i]! >= 0) queue.push(i);
  }
  for (let q = 0; q < queue.length; q++) {
    const j = queue[q]!;
    const x = j % gw, y = (j / gw) | 0;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const k = ny * gw + nx;
      if (grid[k] && label[k]! < 0) { label[k] = label[j]!; queue.push(k); }
    }
  }
  const keep = [...keepIds].map((id) => ({ id }));
  // 성분 지도는 저해상도라 그대로 쓰면 계단 테두리가 생긴다 — 성분 칸을 한 칸 넓힌 뒤
  // 부드럽게 키운 가중치를 원래 알파에 곱한다(바깥 윤곽은 원래 알파, 용기 사이 경계만 완만하게)
  const out: Buffer[] = [];
  for (const c of keep) {
    const cell = new Uint8Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) {
      if (label[i] === c.id) {
        cell[i] = 255;
        continue;
      }
      if (label[i]! >= 0) continue;
      const x = i % gw, y = (i / gw) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && label[ny * gw + nx] === c.id) cell[i] = 255;
      }
    }
    const weight = await sharp(Buffer.from(cell), { raw: { width: gw, height: gh, channels: 1 } })
      .resize(w, h, { kernel: "cubic", fit: "fill" })
      .blur(Math.max(0.6, step * 0.6))
      .extractChannel(0)
      .raw()
      .toBuffer();
    const buf = Buffer.from(data);
    for (let i = 0; i < w * h; i++) buf[i * 4 + 3] = Math.round((buf[i * 4 + 3]! * weight[i]!) / 255);
    out.push(await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer());
  }
  return out;
}

/** 컷아웃의 각 용기를 따로 정합해 되덮는다. 하나라도 적용되면 applied */
export async function restoreProductPixels(params: {
  generated: Buffer;
  cutout: Buffer;
  colorMatch?: number;
}): Promise<LabelRestoreResult & { parts: { applied: boolean; score: number }[] }> {
  const parts = await splitComponents(params.cutout);
  let buffer = params.generated;
  const results: { applied: boolean; score: number }[] = [];
  let firstBox: LabelRestoreResult["box"];
  for (const part of parts) {
    const r = await restoreSingleProduct({ generated: buffer, cutout: part, colorMatch: params.colorMatch });
    results.push({ applied: r.applied, score: r.score });
    if (r.applied) {
      buffer = r.buffer;
      firstBox ??= r.box;
    }
  }
  return {
    buffer,
    applied: results.some((r) => r.applied),
    score: Math.max(...results.map((r) => r.score)),
    box: firstBox,
    parts: results,
  };
}

async function restoreSingleProduct(params: {
  generated: Buffer;
  cutout: Buffer;
  /** 생성 결과의 조명 쪽으로 원본 색을 옮기는 비율 (0=원본 그대로, 1=완전 이전) */
  colorMatch?: number;
}): Promise<LabelRestoreResult> {
  const { generated, cutout } = params;
  const k = params.colorMatch ?? 0.5;
  const genMeta = await sharp(generated).metadata();
  const W = genMeta.width ?? 0;
  const H = genMeta.height ?? 0;
  const bounds = await cutoutBounds(cutout);
  if (!bounds || !W || !H) return { buffer: generated, applied: false, score: -1 };
  const product = await sharp(cutout).extract(bounds).png().toBuffer();
  const aspect = bounds.height / bounds.width;

  const coarse = await toGray(generated, COARSE_W);
  const widths: number[] = [];
  // 아주 작은 패치는 픽셀 수가 적어 우연히 상관이 높게 나온다 — 상품이 화면 30% 이상인 히어로 컷만 대상
  for (let f = 0.3; f <= 0.98; f *= 1.03) widths.push(f * coarse.w);
  const c = await search(coarse, product, aspect, widths);
  if (process.env.LABEL_RESTORE_DEBUG) console.log("[label-restore] coarse", JSON.stringify(c), coarse.w, coarse.h);
  if (c.score < 0.3) return { buffer: generated, applied: false, score: c.score };

  const fine = await toGray(generated, FINE_W);
  const ratio = fine.w / coarse.w;
  const fineWidths: number[] = [];
  for (let s = 0.94; s <= 1.0601; s += 0.015) fineWidths.push(c.w * ratio * s);
  const f = await search(fine, product, aspect, fineWidths, { x: Math.round(c.x * ratio), y: Math.round(c.y * ratio), r: Math.ceil(ratio * 2) });
  const second = await secondPeak(coarse, product, c);
  if (process.env.LABEL_RESTORE_DEBUG) console.log("[label-restore] fine", f.score.toFixed(3), "coarse", c.score.toFixed(3), "second", second.toFixed(3));
  if (f.score < MIN_SCORE || c.score - second < MIN_PEAK_MARGIN) {
    return { buffer: generated, applied: false, score: f.score };
  }

  const scale = W / fine.w;
  const box = {
    left: Math.round(f.x * scale),
    top: Math.round(f.y * scale),
    width: Math.round(f.w * scale),
    height: Math.round(f.h * scale),
  };
  box.width = Math.min(box.width, W - box.left);
  box.height = Math.min(box.height, H - box.top);

  const placed = await sharp(product).resize(box.width, box.height, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  const under = await sharp(generated).extract(box).removeAlpha().raw().toBuffer();
  const so = channelStats(placed, null, 4, placed, box.width, box.height);
  const sg = channelStats(under, null, 3, placed, box.width, box.height);
  const out = Buffer.from(placed);
  for (let i = 0; i < box.width * box.height; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const o = so[ch]!, g = sg[ch]!;
      const std = o.std * (1 - k) + g.std * k;
      const mean = o.mean * (1 - k) + g.mean * k;
      const v = ((placed[i * 4 + ch]! - o.mean) / o.std) * std + mean;
      out[i * 4 + ch] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  // 경계 1px 정도를 부드럽게 — 생성 결과의 가장자리 그림자·반사와 자연스럽게 섞인다
  const alpha = await sharp(out, { raw: { width: box.width, height: box.height, channels: 4 } })
    .extractChannel(3)
    .blur(1.2)
    .raw()
    .toBuffer();
  for (let i = 0; i < box.width * box.height; i++) out[i * 4 + 3] = alpha[i]!;
  const layer = await sharp(out, { raw: { width: box.width, height: box.height, channels: 4 } }).png().toBuffer();
  const buffer = await sharp(generated).composite([{ input: layer, left: box.left, top: box.top }]).png().toBuffer();
  return { buffer, applied: true, score: f.score, box };
}
