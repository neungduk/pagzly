/**
 * 450차 2 — 히어로 A 글 블록 압축 전/후 시트. 사진 6종 × 입력 길이 3종(짧음·보통·김)을 390폭으로 그려
 * 전(접기 규칙을 걷어낸 마크업)·후(현재)를 나란히 놓고, 글 블록 높이/히어로 높이(%)와 접힘 단계를 표로 남긴다.
 *   npx tsx scripts/hero-compress-sheet.ts [--out=review/450-verify/hero-compress]
 * 무료·서버 불필요(export HTML을 eye-lib의 Playwright route로 연다).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { corpus, exportArgsOf } from "./design-corpus";
import { EXTRA_ROOTS, launch, openHtml } from "./eye-lib";
import { generate } from "./gen-photo-stress";
import { PHOTO_DIR, swapPhotos } from "./photo-legibility";

export const SHEET_PHOTOS = ["portrait-45", "face-oval", "sky-ground", "very-dark", "noise-shelf", "pastel-low"] as const;
export const LENGTHS = ["short", "normal", "long"] as const;
type Len = (typeof LENGTHS)[number];

const FOLD_CSS = "max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;";
/** 후 → 전: 접기 규칙만 걷어낸다(접힌 요소의 원래 margin은 뒤에 이어지는 인라인 값이 복원) */
export const unfold = (html: string): string =>
  html.split(FOLD_CSS).join("").replace(/ data-hero-fold/g, "").replace(/display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:[12];overflow:hidden;(?=font-family|[^"]*font-size:20px)/g, "");

/** 사람 사진 히어로 A 경로 + 입력 길이 변형(문구는 합성 픽스처 안에서만 바꾼다) */
export function sessionHtml(len: Len): string {
  const file = corpus({ only: ["fx-tech-keyboard"] })[0]![1];
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  s.visionImageRoles = [{ index: 0, role: "hero", confidence: 0.9, reason: "", tags: ["모델", "착용", "전신"] }];
  const hero = (s.generated.sections as Array<Record<string, unknown>>).find((x) => x.type === "hero")!;
  if (len === "short") { s.productName = "무선 키보드"; hero.headline = "조용한 타건"; hero.subheadline = ""; }
  else if (len === "long") {
    s.productName = "저소음 기계식 무선 키보드 프로 마스터 에디션 (Silent Mechanical Wireless Keyboard Pro Master Edition)";
    hero.headline = "귀는 막지 마세요, 소음은 막고. 하루 종일 쳐도 손목이 편한 저소음 타건감";
    hero.subheadline = "오픈형의 자유로움, ANC 42dB의 조용함을 하나로 담았습니다. 사무실에서도 카페에서도 같은 느낌으로.";
  }
  return buildDetailPageHtml(exportArgsOf(s));
}

const HERO_METRICS = `(() => {
  const h = document.querySelector('[data-hero-v2="A"]'); if (!h) return null;
  const hr = h.getBoundingClientRect();
  const blocks = [...h.querySelectorAll('[data-hero-a-text]')];
  const b = blocks[blocks.length - 1]; const br = b.getBoundingClientRect();
  return { x: hr.left, y: hr.top + scrollY, w: hr.width, h: hr.height, block: br.height, ratio: br.height / hr.height, folded: [...h.querySelectorAll('[data-hero-fold]')].length, clampedHook: !!h.querySelector('[data-hero-hook][style*="line-clamp"]') };
})()`;

export type Cell = { photo: string; len: Len; beforeRatio: number; afterRatio: number; folds: string };

export async function run(outDir: string): Promise<Cell[]> {
  if (!fs.existsSync(PHOTO_DIR) || fs.readdirSync(PHOTO_DIR).length < 5) await generate(PHOTO_DIR);
  EXTRA_ROOTS["/stress/"] = PHOTO_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launch();
  const cells: Cell[] = [];
  const tiles: Array<{ input: Buffer; left: number; top: number }> = [];
  const TW = 390, GAP = 12, LABEL = 28;
  let tileH = 0;
  const shots: Array<{ ph: string; len: Len; before: Buffer; after: Buffer; h: number }> = [];
  for (const len of LENGTHS) {
    const after = sessionHtml(len);
    const before = unfold(after);
    for (const ph of SHEET_PHOTOS) {
      const out: Buffer[] = [];
      const ratios: number[] = [];
      let folds = "";
      for (const html of [before, after]) {
        const ex = await openHtml(browser, swapPhotos(html, ph), TW);
        const m = (await ex.page.evaluate(HERO_METRICS)) as { x: number; y: number; w: number; h: number; ratio: number; folded: number; clampedHook: boolean } | null;
        if (!m) { await ex.close(); throw new Error(`히어로 A를 못 찾음 ${len}/${ph}`); }
        const buf = await ex.page.screenshot({ fullPage: true, clip: { x: 0, y: m.y, width: m.w, height: m.h } });
        await ex.close();
        out.push(buf);
        ratios.push(m.ratio);
        if (html === after) folds = [m.folded ? `접힘 ${m.folded}` : "", m.clampedHook ? "훅 2줄" : ""].filter(Boolean).join("+") || "-";
      }
      const h = (await sharp(out[0]!).metadata()).height!;
      tileH = Math.max(tileH, h);
      shots.push({ ph, len, before: out[0]!, after: out[1]!, h });
      cells.push({ photo: ph, len, beforeRatio: Math.round(ratios[0]! * 100) / 100, afterRatio: Math.round(ratios[1]! * 100) / 100, folds });
    }
  }
  await browser.close();
  // 시트: 행 = 길이 3종, 열 = 사진 6종, 칸마다 전|후 나란히
  const cellW = TW * 2 + GAP, rowH = tileH + LABEL;
  const W = cellW * SHEET_PHOTOS.length + GAP * (SHEET_PHOTOS.length + 1);
  const H = rowH * LENGTHS.length + GAP * (LENGTHS.length + 1);
  LENGTHS.forEach((len, ri) => SHEET_PHOTOS.forEach((ph, ci) => {
    const sh = shots.find((x) => x.len === len && x.ph === ph)!;
    const left = GAP + ci * (cellW + GAP), top = GAP + ri * (rowH + GAP);
    tiles.push({ input: sh.before, left, top: top + LABEL }, { input: sh.after, left: left + TW + GAP, top: top + LABEL });
  }));
  await sharp({ create: { width: W, height: H, channels: 3, background: "#e9e9e6" } }).composite(tiles).jpeg({ quality: 82 }).toFile(path.join(outDir, "sheet.jpg"));
  const md = [
    "# 히어로 A 글 블록 압축 전/후 (450차)",
    "",
    "시트 `sheet.jpg`: 행 = 입력 길이(짧음·보통·김), 열 = 사진 6종(portrait-45 · face-oval · sky-ground · very-dark · noise-shelf · pastel-low), 칸마다 왼쪽 = 전(접기 규칙 없음) · 오른쪽 = 후. 390폭.",
    "글 블록 비율 = 아래 글 블록(스크림 포함) 높이 ÷ 히어로 높이. 제안 예산 ≤ 38%(`HERO_A_BLOCK_BUDGET`).",
    "",
    "| 길이 | 사진 | 전 | 후 | 접힘 |",
    "|---|---|---|---|---|",
    ...cells.map((c) => `| ${c.len} | ${c.photo} | ${(c.beforeRatio * 100).toFixed(0)}% | ${(c.afterRatio * 100).toFixed(0)}% | ${c.folds} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "summary.md"), md);
  return cells;
}

if (/hero-compress-sheet\.ts$/.test(process.argv[1] ?? "")) {
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "review/450-verify/hero-compress";
  void run(out).then((c) => { console.log(c.map((x) => `${x.len}/${x.photo} ${x.beforeRatio}→${x.afterRatio} ${x.folds}`).join("\n")); });
}
