/**
 * 451차 3 — BANNER_STYLE 3값 측정. 실제 렌더러(export)를 값마다 돌려 배너 한 구간만 남긴 페이지를 합성 사진 17종으로 열어
 * 글자 대비(최악 백분위, photo-legibility measure)와 사진 노출(가림·보존, photo-exposure)을 잰다. 기본값은 바꾸지 않는다(setBannerStyleForTests는 측정 중에만).
 *   npx tsx scripts/banner-style-measure.ts [--out=review/451-verify/banner-style.md] [--photos=all|fast]
 */
import fs from "node:fs";
import path from "node:path";
import { BANNER_STYLE, setBannerStyleForTests, type BannerStyle } from "../lib/design-tokens-v4";
import { EXTRA_ROOTS, launch } from "./eye-lib";
import { STRESS_PHOTOS, generate } from "./gen-photo-stress";
import { PHOTO_DIR, measure, swapPhotos } from "./photo-legibility";
import { exposureOf } from "./photo-exposure";
import { htmlFor } from "./stress-variants";

export const STYLES: BannerStyle[] = ["full-scrim", "card-only", "split"];
export type StyleRow = { style: BannerStyle; photo: string; worst: number | null; cover: number; keep: number };

/** 배너 한 구간만 남긴 페이지 */
export function bannerOnly(html: string): string {
  const first = html.indexOf("<section"), last = html.lastIndexOf("</section>") + "</section>".length;
  const re = /<section[^>]*class="pagzly-illustration-banner"[\s\S]*?<\/section>/;
  const sec = html.match(re)?.[0];
  if (!sec) throw new Error("일러스트 배너가 없는 픽스처");
  return html.slice(0, first) + sec + html.slice(last);
}

export async function run(photos: string[], fixture = "fx-food-snack"): Promise<StyleRow[]> {
  await generate(PHOTO_DIR);
  EXTRA_ROOTS["/stress/"] = PHOTO_DIR;
  const browser = await launch();
  const rows: StyleRow[] = [];
  try {
    for (const style of STYLES) {
      setBannerStyleForTests(style);
      const page = bannerOnly(htmlFor(fixture));
      for (const ph of photos) {
        const m = await measure(browser, swapPhotos(page, ph), fixture, ph);
        const ex = (await exposureOf(browser, page, fixture)).filter((r) => r.layout === "banner");
        const area = ex.reduce((s, r) => s + r.area, 0) || 1;
        rows.push({ style, photo: ph, worst: m.length ? Math.min(...m.map((f) => f.ratio / f.need * 4.5)) : null, cover: ex.reduce((s, r) => s + r.cover * r.area, 0) / area, keep: ex.reduce((s, r) => s + r.keep * r.area, 0) / area });
      }
    }
  } finally {
    setBannerStyleForTests(BANNER_STYLE);
    await browser.close();
  }
  return rows;
}

if (/banner-style-measure\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const photos = arg("photos", "all") === "fast" ? ["portrait-45", "sky-ground", "very-dark", "noise-shelf", "cutout-white"] : STRESS_PHOTOS.map((p) => p.id);
  void run(photos).then((rows) => {
    const avg = (s: BannerStyle, f: (r: StyleRow) => number) => { const xs = rows.filter((r) => r.style === s); return xs.reduce((a, r) => a + f(r), 0) / xs.length; };
    const minW = (s: BannerStyle) => { const xs = rows.filter((r) => r.style === s && r.worst !== null).map((r) => r.worst!); return xs.length ? Math.min(...xs) : NaN; };
    const md = [
      "# 배너 BANNER_STYLE 3값 측정 (451차)",
      "",
      `기본값(현재): \`${BANNER_STYLE}\`(변경 없음). 사진 ${photos.length}종 × 3값, 픽스처 fx-food-snack의 일러스트 배너 한 구간, 390폭. 대비 = 배너 글자 최악 백분위 대비(큰 글자는 4.5 기준으로 환산), 가림·보존 = 449차 노출 지표(배너 사진 영역).`,
      "",
      "| 값 | 최악 대비(전 사진 중 최저) | 가림(평균) | 보존(평균) |",
      "|---|---|---|---|",
      ...STYLES.map((s) => `| ${s} | ${Number.isNaN(minW(s)) ? "— (사진 위 글자 없음)" : minW(s).toFixed(2)} | ${avg(s, (r) => r.cover).toFixed(2)} | ${avg(s, (r) => r.keep).toFixed(2)} |`),
      "",
      "## 사진별",
      "| 값 | 사진 | 최악 대비 | 가림 | 보존 |",
      "|---|---|---|---|---|",
      ...rows.map((r) => `| ${r.style} | ${r.photo} | ${r.worst === null ? "—" : r.worst.toFixed(2)} | ${r.cover.toFixed(2)} | ${r.keep.toFixed(2)} |`),
      "",
    ].join("\n");
    const out = arg("out", "review/451-verify/banner-style.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md);
    console.log(md.split("\n").slice(0, 10).join("\n"));
    const bad = rows.filter((r) => r.worst !== null && r.worst < 4.5);
    if (bad.length) { console.log(`대비 4.5 미달 ${bad.length}건: ${bad.slice(0, 4).map((r) => `${r.style}/${r.photo} ${r.worst!.toFixed(2)}`).join(", ")}`); process.exit(1); }
  });
}
