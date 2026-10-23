/**
 * 444차 1 — 섹션 단독 눈 검수 캡처: 말뭉치 페이지에서 표시 예산·비교 정책으로 빠지는 섹션(FAQ·비교표·신뢰 근거 카드 등)과 바뀐 섹션을
 * 섹션 하나만 담은 export HTML로 열어 그 <section>만 캡처한다. 픽스처별 타일을 가로로 붙여 섹션 종류마다 한 장(<out>/<종류>-w<폭>.png).
 *   npx tsx scripts/eye-sections.ts [--out=review/444-verify/sections] [--widths=390,750] [--types=faq,spec_table]
 * 합성 입력(말뭉치에 없는 섹션)은 SYNTH에 있다 — 검사 전용 문구이며 서비스 문구가 아니다.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { corpus, exportArgsOf, readSession } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const OUT = arg("out", "review/444-verify/sections");
const WIDTHS = arg("widths", "390,750").split(",").map(Number);
const TYPES = arg("types", "").split(",").filter(Boolean);
const MAX_TILES = 3;

type Sec = Record<string, unknown>;
export const SYNTH: Sec[] = [
  { type: "comparison_table", slot: "comparison_table", heading: "숫자 비교 검사", columns: ["기존", "우리"], rows: [{ label: "무게", values: ["120g", "95g"] }, { label: "소음", values: ["42dB", "38dB"] }, { label: "배터리", values: ["8시간", "12시간"] }] },
  { type: "comparison_table", slot: "comparison_table", heading: "글 비교 검사", columns: ["기존", "우리"], rows: [{ label: "소재", values: ["합성섬유", "순면"] }, { label: "지원", values: ["미지원", "지원"] }, { label: "보증", values: ["6개월", "12개월"] }] },
  { type: "highlight_box", slot: "seller_trust_evidence", heading: "신뢰 근거 검사", cards: [{ title: "검사 카드 A", body: "검사 본문 A입니다." }, { title: "검사 카드 B", body: "검사 본문 B입니다." }, { title: "검사 카드 C", body: "검사 본문 C입니다." }] },
];

async function main() {
  const browser = await launch();
  fs.mkdirSync(OUT, { recursive: true });
  const byType = new Map<string, Array<{ label: string; html: string }>>();
  const add = (type: string, label: string, html: string) => byType.set(type, [...(byType.get(type) ?? []), { label, html }]);
  for (const [id, file] of corpus()) {
    const a = exportArgsOf(readSession(file));
    for (const sec of (a.sections ?? []) as unknown as Sec[]) {
      const t = String(sec.type);
      if (t === "hero" || t === "cta_price") continue;
      if ((byType.get(t)?.length ?? 0) >= MAX_TILES) continue;
      if (!TYPES.length || TYPES.includes(t)) add(t, id, buildDetailPageHtml({ ...a, sections: [sec] as never }));
    }
  }
  const first = exportArgsOf(readSession(corpus().find(([id]) => id === "fx-tech-keyboard")![1]));
  for (const s of SYNTH) if (!TYPES.length || TYPES.includes(String(s.type))) add(`${s.type}-synth-${(s.heading as string).replace(/\s/g, "").slice(0, 2)}`, "synth", buildDetailPageHtml({ ...first, claimFacts: undefined, sections: [s] as never }));
  for (const [type, tiles] of byType) {
    for (const W of WIDTHS) {
      const shots: Buffer[] = [];
      for (const t of tiles) {
        const { page, close } = await openHtml(browser, t.html, W);
        await page.addStyleTag({ content: ".pagzly-anchor-nav,.pagzly-wrap>header{display:none!important}" }); // 단독 섹션이 고정 내비에 가려지지 않게
        const el = page.locator("section").first();
        shots.push(await el.screenshot());
        await close();
      }
      const metas = await Promise.all(shots.map((b) => sharp(b).metadata()));
      const gap = 10;
      const height = Math.max(...metas.map((m) => m.height ?? 0));
      const width = shots.length * W + (shots.length - 1) * gap;
      await sharp({ create: { width, height, channels: 3, background: "#7a7a7a" } })
        .composite(shots.map((input, i) => ({ input, left: i * (W + gap), top: 0 })))
        .png()
        .toFile(path.join(OUT, `${type}-w${W}.png`));
      console.log(`${type} w${W}: ${tiles.map((t) => t.label).join(", ")}`);
    }
  }
  await browser.close();
}
void main();
