/**
 * 450차 4 — 일러스트 배너 결정 자료. 현재 export 배너 마크업을 기준으로 후보 3안을 사진 6종에 적용해 비교한다(기본값은 바꾸지 않는다 — 문자열 변환만):
 *   ① 현재  : 전면 스크림 + 제목 카드(코드 그대로)
 *   ② 카드만 : 전면 스크림을 걷어 카드 영역 면만 남김(주변 사진 노출)
 *   ③ 분리   : 사진 위에는 글자·덮개 없음, 제목 카드를 사진 아래 별도 띠로
 * 지표: 글자 대비(최악 백분위, photo-legibility measure) · 노출(가림 면적비·휘도 보존율, photo-exposure). 시트 `sheet.jpg`, 폰 확인용 `summary.png`, 표 `summary.md`.
 *   npx tsx scripts/banner-options.ts [--out=review/450-verify/banner-options] [--fixture=fx-food-snack]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Page } from "playwright";
import { generate } from "./gen-photo-stress";
import { EXTRA_ROOTS, launch, openHtml } from "./eye-lib";
import { PHOTO_DIR, measure, swapPhotos } from "./photo-legibility";
import { exposureOf } from "./photo-exposure";
import { htmlFor } from "./stress-variants";

export const PHOTOS = ["portrait-45", "face-oval", "sky-ground", "very-dark", "noise-shelf", "pastel-low"] as const;
export const OPTIONS = [
  { id: "A", label: "① 현재(전면 스크림+카드)" },
  { id: "B", label: "② 카드 영역만 면" },
  { id: "C", label: "③ 사진+아래 카드 분리" },
] as const;

const BANNER_RE = /<section[^>]*class="pagzly-illustration-banner"[\s\S]*?<\/section>/;

/** 배너 마크업만 변환(현재 export 문자열 기준) */
export function bannerVariant(sectionHtml: string, opt: "A" | "B" | "C"): string {
  if (opt === "A") return sectionHtml;
  const scrim = /<div style="position:absolute;inset:0;background:[^"]*"><\/div>/;
  if (opt === "B") return sectionHtml.replace(scrim, "");
  const img = sectionHtml.match(/<img [^>]*\/>/)?.[0] ?? "";
  const h2 = sectionHtml.match(/<h2[\s\S]*?<\/h2>/)?.[0] ?? "";
  const p = sectionHtml.match(/<p style="margin:12px 0 0[\s\S]*?<\/p>/)?.[0] ?? "";
  const open = sectionHtml.match(/<section[^>]*>/)![0];
  const photo = img.replace('style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"', 'style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover"');
  return `${open}${photo}<div style="background:rgba(27,27,24,.96);color:#FAF8F3;padding:24px;text-align:center"><div style="max-width:520px;margin:0 auto">${h2}${p}</div></div></section>`;
}

type Row = { photo: string; opt: string; worstRatio: number; worstText: string; cover: number; keep: number };

async function bannerBox(page: Page): Promise<{ y: number; h: number } | null> {
  return page.evaluate(() => { const b = document.querySelector(".pagzly-illustration-banner"); if (!b) return null; const r = b.getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; });
}

export async function run(outDir: string, fixture: string): Promise<Row[]> {
  await generate(PHOTO_DIR);
  EXTRA_ROOTS["/stress/"] = PHOTO_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  const base = htmlFor(fixture);
  const sec = base.match(BANNER_RE)?.[0];
  if (!sec) throw new Error(`${fixture}에 일러스트 배너가 없음`);
  const browser = await launch();
  const rows: Row[] = [];
  const shots = new Map<string, Buffer>();
  for (const o of OPTIONS) {
    const first = base.indexOf("<section"), last = base.lastIndexOf("</section>") + "</section>".length;
    const html = base.slice(0, first) + bannerVariant(sec, o.id) + base.slice(last);
    for (const ph of PHOTOS) {
      const swapped = swapPhotos(html, ph);
      const ex = await openHtml(browser, swapped, 390);
      const box = await bannerBox(ex.page);
      if (box) shots.set(`${o.id}/${ph}`, await ex.page.screenshot({ fullPage: true, clip: { x: 0, y: box.y, width: 390, height: box.h } }));
      await ex.close();
      const bannerTexts = await measure(browser, swapped, fixture, ph);
      const ex2 = await exposureOf(browser, html, fixture);
      const b = ex2.filter((r) => r.layout === "banner");
      const area = b.reduce((s, r) => s + r.area, 0) || 1;
      // 배너 글자만 고르기 위해 배너 높이 안의 글자 프로브만 쓰는 대신, 최악 값을 전체 섹션 글자 중 배너 제목·본문으로 한정
      const worst = bannerTexts.filter((f) => Boolean(box)).sort((a, c) => a.ratio - c.ratio)[0];
      rows.push({ photo: ph, opt: o.id, worstRatio: worst?.ratio ?? NaN, worstText: worst?.text ?? "", cover: b.reduce((s, r) => s + r.cover * r.area, 0) / area, keep: b.reduce((s, r) => s + r.keep * r.area, 0) / area });
    }
  }
  await browser.close();
  // 시트: 행 = 사진 6, 열 = 안 3
  const TW = 390, G = 10;
  const hs = [...shots.values()].map((b) => b.length);
  void hs;
  const dims = new Map<string, number>();
  for (const [k, b] of shots) dims.set(k, (await sharp(b).metadata()).height!);
  const rowH = (ph: string) => Math.max(...OPTIONS.map((o) => dims.get(`${o.id}/${ph}`) ?? 0));
  const W = TW * 3 + G * 4;
  let y = G;
  const comps: sharp.OverlayOptions[] = [];
  for (const ph of PHOTOS) {
    OPTIONS.forEach((o, ci) => { const b = shots.get(`${o.id}/${ph}`); if (b) comps.push({ input: b, left: G + ci * (TW + G), top: y }); });
    y += rowH(ph) + G;
  }
  const sheet = sharp({ create: { width: W, height: y, channels: 3, background: "#e9e9e6" } }).composite(comps);
  await sheet.clone().jpeg({ quality: 84 }).toFile(path.join(outDir, "sheet.jpg"));
  await sheet.clone().resize({ width: 1170 }).png().toFile(path.join(outDir, "summary.png"));
  const fmt = (n: number) => (Number.isNaN(n) ? "—(사진 위 글자 없음)" : n.toFixed(2));
  const avg = (o: string, f: (r: Row) => number) => rows.filter((r) => r.opt === o).reduce((s, r) => s + f(r), 0) / PHOTOS.length;
  const md = [
    "# 배너 후보 3안 비교 (450차, 결정 자료 — 기본값은 ①로 그대로)",
    "",
    `픽스처 \`${fixture}\`의 일러스트 배너를 390폭으로. 시트 \`sheet.jpg\`(행 = 사진 6종, 열 = ①②③), 폰용 한 장 \`summary.png\`.`,
    "대비 = 배너 안 글자의 최악 백분위 대비(4.5 이상이 기준), 가림 = 배너 사진 영역 중 덮개 알파 ≥0.5 비율, 보존 = 사진 밝기가 남는 비율(1 = 덮개 없음).",
    "",
    "| 안 | 최악 대비(6종 평균) | 가림(평균) | 보존(평균) |",
    "|---|---|---|---|",
    ...OPTIONS.map((o) => `| ${o.label} | ${fmt(avg(o.id, (r) => r.worstRatio))} | ${avg(o.id, (r) => r.cover).toFixed(2)} | ${avg(o.id, (r) => r.keep).toFixed(2)} |`),
    "",
    "## 사진별",
    "| 사진 | 안 | 최악 대비 | 가림 | 보존 |",
    "|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.photo} | ${r.opt} | ${fmt(r.worstRatio)} | ${r.cover.toFixed(2)} | ${r.keep.toFixed(2)} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "summary.md"), md);
  return rows;
}

if (/banner-options\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void run(arg("out", "review/450-verify/banner-options"), arg("fixture", "fx-food-snack")).then((r) => console.log(r.map((x) => `${x.photo} ${x.opt} ${x.worstRatio} ${x.cover.toFixed(2)} ${x.keep.toFixed(2)}`).join("\n")));
}
