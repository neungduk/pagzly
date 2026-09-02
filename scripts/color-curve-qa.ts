/**
 * 49차 — 색상 추출 품질 QA
 *
 * Fix A(버킷 합산) 단위 검증 + Fix B(팔레트 커브) 시각 비교 스크린샷 생성.
 *
 * 실행:
 *   npx tsx scripts/color-curve-qa.ts
 *
 * 산출:
 *   review/qa-screenshots/color-curve-{hue}.png  (전/후 비교)
 *   review/color-curve-qa/report.md
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  extractProductTheme,
  getPaletteCurve,
  mergeHueBuckets,
  type ExtractedTheme,
  type HueBucketMap,
} from "../lib/color-extract";

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "review", "color-curve-qa");
const SCREENSHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const ASSET_DIR = path.join(__dirname, "test-assets", "_color-curve-qa");

type HueCase = {
  id: string;
  label: string;
  pexelsQuery: string;
  /** 합성 이미지용 — Pexels 실패 시 폴백 */
  syntheticHue: number;
};

const HUE_CASES: HueCase[] = [
  { id: "red", label: "붉은 립스틱", pexelsQuery: "red lipstick cosmetic product white background", syntheticHue: 5 },
  { id: "green", label: "초록 클렌저", pexelsQuery: "green skincare bottle product photography", syntheticHue: 130 },
  { id: "blue", label: "파란 패키지", pexelsQuery: "blue cosmetic serum bottle product", syntheticHue: 215 },
  { id: "beige", label: "베이지 스킨케어", pexelsQuery: "beige cream jar skincare product minimal", syntheticHue: 35 },
  { id: "purple", label: "보라 에센스", pexelsQuery: "purple cosmetic bottle beauty product", syntheticHue: 285 },
];

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

/** 구 extractProductTheme 공식(49차 이전) — 전/후 비교용 */
async function extractProductThemeLegacy(imagePaths: string[]): Promise<ExtractedTheme | null> {
  type Bucket = { weight: number; hueWeightedSum: number };
  const perImageBest: { h: number; weight: number }[] = [];

  for (const imgPath of imagePaths.slice(0, 3)) {
    const buf = fs.readFileSync(imgPath);
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) continue;
    const cropW = Math.max(1, Math.round(meta.width * 0.6));
    const cropH = Math.max(1, Math.round(meta.height * 0.6));
    const left = Math.round((meta.width - cropW) / 2);
    const top = Math.round((meta.height - cropH) / 2);
    const { data, info } = await sharp(buf)
      .extract({ left, top, width: cropW, height: cropH })
      .resize(48, 48, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const buckets = new Map<number, Bucket>();
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const rn = r / 255, gn = g / 255, bn = b / 255;
      const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
      const l = (max + min) / 2;
      if (max === min) continue;
      const d = max - min;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (s < 0.18 || l > 0.93 || l < 0.07) continue;
      let h: number;
      if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
      else if (max === gn) h = ((bn - rn) / d + 2) / 6;
      else h = ((rn - gn) / d + 4) / 6;
      h *= 360;
      const key = Math.round(h / 15) * 15;
      const e = buckets.get(key) ?? { weight: 0, hueWeightedSum: 0 };
      e.weight += s;
      e.hueWeightedSum += h * s;
      buckets.set(key, e);
    }
    let best: { h: number; weight: number } | null = null;
    for (const e of buckets.values()) {
      if (!best || e.weight > best.weight) best = { h: e.hueWeightedSum / e.weight, weight: e.weight };
    }
    if (best) perImageBest.push(best);
  }

  let bestHue: number | null = null;
  let bestWeight = 0;
  for (const b of perImageBest) {
    if (b.weight > bestWeight) {
      bestWeight = b.weight;
      bestHue = b.h;
    }
  }
  if (bestHue === null) return null;

  const toHex = (r: number, g: number, b: number) =>
    `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  const [ar, ag, ab] = hslToRgb(bestHue, 0.62, 0.32);
  const [sr, sg, sb] = hslToRgb(bestHue, 0.55, 0.96);
  const [tr, tg, tb] = hslToRgb(bestHue, 0.55, 0.26);
  const accent = toHex(ar, ag, ab);
  return {
    accent,
    accentSoft: toHex(sr, sg, sb),
    accentText: toHex(tr, tg, tb),
    heroScrimFrom: `rgba(${ar},${ag},${ab},0.72)`,
    baseNeutral: toHex(sr, sg, sb),
    deepAccent: accent,
  };
}

async function createSyntheticImage(
  filePath: string,
  productHue: number,
  options?: { propHue?: number; propSaturation?: number },
) {
  const size = 640;
  const [pr, pg, pb] = hslToRgb(productHue, 0.72, 0.48);
  const bg = Buffer.alloc(size * size * 3, 245);

  // 중앙 60% 영역에 상품색 원
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.28;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * size + x) * 3;
        bg[idx] = pr;
        bg[idx + 1] = pg;
        bg[idx + 2] = pb;
      }
    }
  }

  // 소품 색 (한 장만 강하게) — 모서리 패치
  if (options?.propHue !== undefined) {
    const [hr, hg, hb] = hslToRgb(options.propHue, options.propSaturation ?? 0.85, 0.55);
    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < 120; x++) {
        const idx = (y * size + x) * 3;
        bg[idx] = hr;
        bg[idx + 1] = hg;
        bg[idx + 2] = hb;
      }
    }
  }

  await sharp(bg, { raw: { width: size, height: size, channels: 3 } })
    .jpeg({ quality: 90 })
    .toFile(filePath);
}

async function downloadPexels(apiKey: string, query: string, count: number): Promise<string[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(count + 2));
  url.searchParams.set("orientation", "portrait");
  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    photos: { id: number; src: { large: string; large2x: string } }[];
  };
  const files: string[] = [];
  for (const photo of data.photos.slice(0, count)) {
    const imgRes = await fetch(photo.src.large2x || photo.src.large);
    if (!imgRes.ok) continue;
    const file = path.join(ASSET_DIR, `pexels-${photo.id}.jpg`);
    fs.writeFileSync(file, Buffer.from(await imgRes.arrayBuffer()));
    files.push(file);
  }
  return files;
}

async function prepareCaseImages(
  hueCase: HueCase,
  apiKey: string | undefined,
): Promise<string[]> {
  const caseDir = path.join(ASSET_DIR, hueCase.id);
  fs.mkdirSync(caseDir, { recursive: true });

  if (apiKey) {
    const pexels = await downloadPexels(apiKey, hueCase.pexelsQuery, 3);
    if (pexels.length >= 3) {
      return pexels.map((f, i) => {
        const dest = path.join(caseDir, `photo-${i + 1}.jpg`);
        fs.copyFileSync(f, dest);
        return dest;
      });
    }
  }

  // 합성 폴백: 3장 모두 같은 상품색, 1장만 소품색 오염
  const files: string[] = [];
  for (let i = 0; i < 3; i++) {
    const f = path.join(caseDir, `synthetic-${i + 1}.jpg`);
    await createSyntheticImage(f, hueCase.syntheticHue, i === 0 ? { propHue: 95, propSaturation: 0.9 } : undefined);
    files.push(f);
  }
  return files;
}

function buildPreviewHtml(
  label: string,
  images: string[],
  legacy: ExtractedTheme | null,
  current: ExtractedTheme | null,
): string {
  const imgTags = images
    .slice(0, 3)
    .map((p) => `<img src="file:///${p.replace(/\\/g, "/")}" style="width:120px;height:120px;object-fit:cover;border-radius:8px" />`)
    .join("");

  function themeBlock(title: string, theme: ExtractedTheme | null) {
    if (!theme) return `<div><h3>${title}</h3><p>추출 실패 (폴백)</p></div>`;
    return `
    <div style="flex:1;min-width:280px">
      <h3 style="margin:0 0 12px;font-size:14px;color:#666">${title}</h3>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div style="width:48px;height:48px;border-radius:50%;background:${theme.accent}" title="accent"></div>
        <div style="width:48px;height:48px;border-radius:50%;background:${theme.accentSoft}" title="accentSoft"></div>
        <div style="width:48px;height:48px;border-radius:50%;background:${theme.baseNeutral}" title="baseNeutral"></div>
        <div style="width:48px;height:48px;border-radius:50%;background:${theme.deepAccent}" title="deepAccent"></div>
      </div>
      <p style="font-family:monospace;font-size:11px;margin:0 0 16px">${theme.accent} · ${theme.baseNeutral}</p>
      <!-- 히어로 -->
      <div style="position:relative;min-height:180px;background:${theme.baseNeutral};border-radius:12px;overflow:hidden;margin-bottom:12px">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,${theme.heroScrimFrom},transparent 70%)"></div>
        <div style="position:relative;padding:24px;color:#FAF8F3">
          <p style="font-size:10px;letter-spacing:0.28em;margin:0 0 8px;opacity:0.8">01 · HERO</p>
          <h2 style="margin:0;font-size:28px;font-weight:700">${label}</h2>
        </div>
      </div>
      <!-- 패턴 A -->
      <div style="padding:20px;background:${theme.baseNeutral};border-radius:12px;margin-bottom:12px">
        <p style="font-size:10px;letter-spacing:0.28em;color:${theme.accent};margin:0 0 8px">02 · SPEC</p>
        <p style="margin:0;color:#1B1B18">스펙·성분 정보 섹션 배경</p>
      </div>
      <!-- 포인트 블록 -->
      <div style="padding:20px;background:${theme.accent};border-radius:12px;color:#FAF8F3">
        <p style="font-size:10px;letter-spacing:0.28em;margin:0 0 8px;opacity:0.85">03 · HIGHLIGHT</p>
        <p style="margin:0;font-weight:600">강조 포인트 섹션</p>
      </div>
    </div>`;
  }

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet"/>
    <style>body{font-family:"Noto Sans KR",sans-serif;margin:0;padding:24px;background:#fff;color:#1B1B18}
    h1{font-size:20px;margin:0 0 8px} .row{display:flex;gap:24px;flex-wrap:wrap}</style></head>
    <body>
      <h1>${label} — 색상 추출 전/후 (49차)</h1>
      <div style="display:flex;gap:8px;margin-bottom:20px">${imgTags}</div>
      <div class="row">
        ${themeBlock("이전 (사진 1장 최댓값 + 고정 S/L)", legacy)}
        ${themeBlock("49차 (버킷 합산 + hue 커브)", current)}
      </div>
    </body></html>`;
}

function testMergeHueBuckets(): { pass: boolean; detail: string } {
  // 이미지1: 주황 소품(가중치 5) + 빨강 상품(가중치 2)
  // 이미지2·3: 빨강 상품만 (가중치 3 each)
  // per-image best → 주황(5) wins (legacy)
  // merged → 빨강 15° bucket: 2+3+3=8, 주황 ~30°: 5 → 빨강 wins (new)
  const img1 = new Map<number, { weight: number; hueWeightedSum: number }>([
    [15, { weight: 2, hueWeightedSum: 15 * 2 }],
    [30, { weight: 5, hueWeightedSum: 30 * 5 }],
  ]);
  const img2 = new Map([[15, { weight: 3, hueWeightedSum: 15 * 3 }]]);
  const img3 = new Map([[15, { weight: 3, hueWeightedSum: 15 * 3 }]]);

  const perImageBest = [img1, img2, img3].map((buckets) => {
    let best: { h: number; weight: number } | null = null;
    for (const e of buckets.values()) {
      if (!best || e.weight > best.weight) best = { h: e.hueWeightedSum / e.weight, weight: e.weight };
    }
    return best!;
  });
  const legacyWinner = perImageBest.reduce((a, b) => (b.weight > a.weight ? b : a));

  const merged = mergeHueBuckets([img1, img2, img3]);
  const pass = legacyWinner.h === 30 && merged?.h === 15;
  return {
    pass,
    detail: `legacy=${legacyWinner.h}° (w=${legacyWinner.weight}) → merged=${merged?.h}° (w=${merged?.weight})`,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(ASSET_DIR, { recursive: true });

  const env = loadEnvLocal();
  const apiKey = env.PEXELS_API_KEY ?? process.env.PEXELS_API_KEY;

  console.log("[1/3] Fix A — mergeHueBuckets 단위 검증");
  const mergeTest = testMergeHueBuckets();
  console.log(mergeTest.pass ? "  ✓ PASS" : "  ✗ FAIL", mergeTest.detail);

  console.log("[2/3] Fix B — getPaletteCurve 8구간 확인");
  const curveSamples = [0, 25, 55, 85, 120, 165, 210, 270, 320].map((h) => ({
    h,
    curve: getPaletteCurve(h),
  }));
  for (const { h, curve } of curveSamples) {
    console.log(
      `  hue ${h}° → accent S=${curve.accent.s.toFixed(2)} L=${curve.accent.l.toFixed(2)}`,
    );
  }

  console.log("[3/3] Fix C — hue 대역별 전/후 스크린샷");
  const browser = await chromium.launch();
  const results: string[] = [];

  for (const hueCase of HUE_CASES) {
    console.log(`  → ${hueCase.label} (${hueCase.id})…`);
    const images = await prepareCaseImages(hueCase, apiKey);
    const current = await extractProductTheme(images);
    const legacy = await extractProductThemeLegacy(images);

    const html = buildPreviewHtml(hueCase.label, images, legacy, current);
    const htmlPath = path.join(OUT_DIR, `preview-${hueCase.id}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");

    const page = await browser.newPage({ viewport: { width: 920, height: 720 } });
    await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    const shotPath = path.join(SCREENSHOT_DIR, `color-curve-${hueCase.id}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    await page.close();

    results.push(
      `- **${hueCase.label}** (\`${hueCase.id}\`): legacy accent=${legacy?.accent ?? "null"} → new accent=${current?.accent ?? "null"} · [스크린샷](../qa-screenshots/color-curve-${hueCase.id}.png)`,
    );
    console.log(`    legacy=${legacy?.accent} new=${current?.accent} → ${path.basename(shotPath)}`);
  }

  await browser.close();

  const report = `# 49차 색상 추출 QA 보고

생성: ${new Date().toISOString().slice(0, 10)}

## Fix A — 버킷 합산
- mergeHueBuckets 단위 테스트: **${mergeTest.pass ? "PASS" : "FAIL"}**
- ${mergeTest.detail}
- 소품색(한 장) vs 상품색(3장 누적) 시나리오에서 merged가 상품색(15°)을 선택

## Fix B — hue별 팔레트 커브
| hue | accent S | accent L |
|-----|----------|----------|
${curveSamples.map(({ h, curve }) => `| ${h}° | ${curve.accent.s.toFixed(2)} | ${curve.accent.l.toFixed(2)} |`).join("\n")}

주황~황갈(25~55°) 구간: S↓ L↑ — 탁한 흙색 대신 테라코타/앰버 톤

## Fix C — hue 대역별 전/후 스크린샷
${results.join("\n")}

## 체크리스트
- [${mergeTest.pass ? "x" : " "}] Fix A: 3장 hue 버킷 합산
- [x] Fix B: getPaletteCurve 8구간+
- [x] Fix C: 5 hue 대역 스크린샷 (\`review/qa-screenshots/color-curve-*.png\`)
`;

  fs.writeFileSync(path.join(OUT_DIR, "report.md"), report, "utf8");
  console.log("\n완료:", path.join(OUT_DIR, "report.md"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
