/**
 * 275차 — 상품 가시성 게이트 회귀 검증 (로컬 이미지 + 픽셀 연산만, 유료 API 0).
 *   npx tsx scripts/275cha-product-visibility-gate-verify.ts
 *
 * 실패 쪽: 274차 실제 composite.png + 같은 placement로 로컬 재구성한 paste(= refine 전 단계).
 *   274차 Replicate 컷아웃은 저장되지 않아 product.jpeg의 초록 배경을 크로마키로 빼서 대신 쓴다.
 * 정상 쪽(오탐 참고): 257차 합성 컷아웃(단색 전자제품, 육안상 보이는 합성)을 씬 3장에 paste.
 *   실사 pixel-paste 성공 사례가 아직 없어 대용일 뿐 — 실사 오탐 검증은 다음 실사진에서 필요.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  PRODUCT_VISIBILITY_RGB_THRESHOLD,
  computeOpaqueMeanColor,
  computeRegionMeanColor,
  evaluateProductVisibility,
  pasteCutoutOnSceneDetailed,
  rgbDistance,
  type CropRectPx,
} from "../lib/lifestyle-product-composite";
import type { HeldObjectPlacement } from "../lib/detect-held-object-placement";
import { PAIRS, makeSyntheticCutout } from "./257cha-lifestyle-matching-synthetic-qa";

const ROOT = path.join(__dirname, "..");
const LIVE = path.join(ROOT, "review", "274cha-live");
const OUT = path.join(ROOT, "review", "275cha-gate-regression");
const SCENES = path.join(__dirname, "test-assets", "전자기기-액세서리");

/** 274차 run-log attempt=2 (reliable=true) 값 */
const PLACEMENT_274: HeldObjectPlacement = { xPct: 38, yPct: 35, wPct: 28, hPct: 32, rotationDeg: 12, confidence: "high" };
/** 274차 run-log `[grasp-refine] success crop=(287,371,439x585)` */
const CROP_274: CropRectPx = { left: 287, top: 371, width: 439, height: 585 };

type Expect = "pass" | "reject";
type Case = {
  id: string;
  buf: Buffer;
  stage: "paste" | "refine";
  expect: Expect;
  reference: Buffer;
  paste: { rect: CropRectPx; cutoutPrepared: Buffer };
  briefRegion: CropRectPx;
};

async function chromaKeyCutout(file: string): Promise<Buffer> {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map((p) => [data[p * 3]!, data[p * 3 + 1]!, data[p * 3 + 2]!]);
  const bg = [0, 1, 2].map((c) => corners.reduce((s, px) => s + px[c]!, 0) / corners.length);
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p += 1) {
    const r = data[p * 3]!;
    const g = data[p * 3 + 1]!;
    const b = data[p * 3 + 2]!;
    const d = Math.sqrt((r - bg[0]!) ** 2 + (g - bg[1]!) ** 2 + (b - bg[2]!) ** 2);
    out[p * 4] = r;
    out[p * 4 + 1] = g;
    out[p * 4 + 2] = b;
    out[p * 4 + 3] = Math.max(0, Math.min(255, Math.round(((d - 60) / 60) * 255)));
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).trim().png().toBuffer();
}

function placementRect(sceneW: number, sceneH: number, p: HeldObjectPlacement): CropRectPx {
  return {
    left: Math.round((sceneW * p.xPct) / 100),
    top: Math.round((sceneH * p.yPct) / 100),
    width: Math.round((sceneW * p.wPct) / 100),
    height: Math.round((sceneH * p.hPct) / 100),
  };
}

/** refine이 상품 영역 일부(아래쪽 fraction)를 원본 장면으로 덮은 상황 시뮬레이션 */
async function coverWithScene(buf: Buffer, scene: Buffer, rect: CropRectPx, fraction: number): Promise<Buffer> {
  const h = Math.max(1, Math.round(rect.height * fraction));
  const r = { left: rect.left, top: rect.top + rect.height - h, width: rect.width, height: h };
  const patch = await sharp(scene).extract(r).png().toBuffer();
  return sharp(buf).composite([{ input: patch, left: r.left, top: r.top }]).png().toBuffer();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const cases: Case[] = [];

  // --- 실패 쪽: 274차 ---
  const scene274 = await sharp(fs.readFileSync(path.join(LIVE, "lifestyle.jpeg"))).png().toBuffer();
  const failed = fs.readFileSync(path.join(LIVE, "composite.png"));
  const m274 = await sharp(scene274).metadata();
  const fm = await sharp(failed).metadata();
  if (fm.width !== m274.width || fm.height !== m274.height) throw new Error("274 composite/scene size mismatch");
  const earphones = await chromaKeyCutout(path.join(LIVE, "product.jpeg"));
  fs.writeFileSync(path.join(OUT, "cutout-chromakey.png"), earphones);
  const paste274 = await pasteCutoutOnSceneDetailed({ sceneBuffer: scene274, cutoutBuffer: earphones, placement: PLACEMENT_274 });
  fs.writeFileSync(path.join(OUT, "274-reconstructed-paste.png"), paste274.buffer);
  const base274 = { reference: earphones, paste: paste274 };
  cases.push(
    { id: "N1 274 재구성 paste (refine 전)", buf: paste274.buffer, stage: "paste", expect: "reject", ...base274, briefRegion: placementRect(m274.width!, m274.height!, PLACEMENT_274) },
    { id: "N2 274 실제 composite.png (refine 후)", buf: failed, stage: "refine", expect: "reject", ...base274, briefRegion: CROP_274 },
    { id: "N3 274 시뮬: 상품 영역 전체 원본 복원", buf: await coverWithScene(paste274.buffer, scene274, paste274.rect, 1), stage: "refine", expect: "reject", ...base274, briefRegion: CROP_274 },
  );

  // --- 정상 쪽(대용): 257차 합성 컷아웃 × 씬 3장 ---
  const pair = PAIRS[0]!;
  const solid = (await makeSyntheticCutout(fs.readFileSync(pair.productPath), pair)).png;
  fs.writeFileSync(path.join(OUT, "cutout-257-solid.png"), solid);
  const scenes = ["01-pexels-35599938.jpeg", "loop-02-pexels-1279107.jpeg", "loop-03-pexels-1643753.jpeg"];
  for (const [i, name] of scenes.entries()) {
    const scene = await sharp(fs.readFileSync(path.join(SCENES, name))).png().toBuffer();
    const sm = await sharp(scene).metadata();
    const paste = await pasteCutoutOnSceneDetailed({ sceneBuffer: scene, cutoutBuffer: solid, placement: pair.placement });
    fs.writeFileSync(path.join(OUT, `P${i + 1}-paste.png`), paste.buffer);
    const base = { reference: solid, paste, briefRegion: placementRect(sm.width!, sm.height!, pair.placement) };
    cases.push(
      { id: `P${i + 1} 단색 전자제품 paste — ${name}`, buf: paste.buffer, stage: "paste", expect: "pass", ...base },
      { id: `P${i + 1}o 위 + 하단 35% 가림(정상 grasp 가정)`, buf: await coverWithScene(paste.buffer, scene, paste.rect, 0.35), stage: "refine", expect: "pass", ...base },
    );
  }

  const rows: Record<string, unknown>[] = [];
  for (const c of cases) {
    const gate = await evaluateProductVisibility({
      finalBuffer: c.buf,
      pasteRect: c.paste.rect,
      cutoutReference: c.reference,
      cutoutPrepared: c.paste.cutoutPrepared,
      stage: c.stage,
    });
    const refColor = await computeOpaqueMeanColor(c.reference);
    const briefColor = await computeRegionMeanColor(c.buf, c.briefRegion);
    const verdict: Expect = gate.pass ? "pass" : "reject";
    rows.push({
      case: c.id,
      expect: c.expect,
      verdict,
      ok: verdict === c.expect,
      rgbDelta: gate.rgbDelta == null ? null : +gate.rgbDelta.toFixed(1),
      briefUnmaskedDelta: refColor && briefColor ? +rgbDistance(refColor, briefColor).toFixed(1) : null,
    });
  }

  const deltas = (e: Expect) => rows.filter((r) => r.expect === e).map((r) => r.rgbDelta as number);
  const summary = {
    generatedAt: new Date().toISOString(),
    paidApiCalls: 0,
    threshold: PRODUCT_VISIBILITY_RGB_THRESHOLD,
    rejectSideMin: Math.min(...deltas("reject")),
    passSideMax: Math.max(...deltas("pass")),
    rows,
    allOk: rows.every((r) => r.ok),
  };
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.table(rows);
  console.log(`threshold=${summary.threshold} rejectSideMin=${summary.rejectSideMin} passSideMax=${summary.passSideMax}`);
  console.log(summary.allOk ? "ALL PASS" : "FAIL");
  if (!summary.allOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
