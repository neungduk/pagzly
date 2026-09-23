/**
 * 185차 — 성분 링 다이어그램 3/5/8개 스크린샷 + 181 beauty/pet 게이팅 확인
 *   npx tsx scripts/185cha-ingredient-ring-shots.ts
 * 생성 API 호출 없음.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import {
  buildIngredientRingDiagramSvg,
  isIngredientRingCategory,
  prepareIngredientRingLabels,
} from "../lib/ingredient-ring-diagram";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "qa-screenshots");

async function shotHtml(html: string, file: string, w = 440, h = 520) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:24px;background:#FAF8F3;font-family:'Noto Sans KR',system-ui,sans-serif">${html}</body></html>`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(300);
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, file) });
  await browser.close();
}

function sessionIngredients(cat: "beauty" | "pet"): string | null {
  const p = path.join(ROOT, "review", "181cha-live", cat, "session.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as {
    ingredients?: string | null;
    category?: string;
  };
  return raw.ingredients ?? null;
}

async function main() {
  const theme = getCategoryTheme("화장품/뷰티");
  const stroke = theme.deepAccent;
  const ink = "#1B1B18";

  const sets: { n: number; labels: string[]; file: string }[] = [
    {
      n: 3,
      labels: ["L. acidophilus", "L. plantarum", "B. lactis"],
      file: "185cha-ingredient-ring-3.png",
    },
    {
      n: 5,
      labels: [
        "나이아신아마이드",
        "히알루론산",
        "센텔라",
        "판테놀",
        "세라마이드",
      ],
      file: "185cha-ingredient-ring-5.png",
    },
    {
      n: 8,
      labels: [
        "L. acidophilus",
        "L. plantarum",
        "B. lactis",
        "B. bifidum",
        "L. rhamnosus",
        "L. casei",
        "S. thermophilus",
        "L. reuteri",
      ],
      file: "185cha-ingredient-ring-8.png",
    },
  ];

  for (const set of sets) {
    const prepared = prepareIngredientRingLabels(set.labels.join(", "));
    if (!prepared || prepared.length !== set.n) {
      throw new Error(`prepare failed for n=${set.n}: ${JSON.stringify(prepared)}`);
    }
    const svg = buildIngredientRingDiagramSvg(prepared, stroke, ink);
    if (!svg.includes("textPath")) {
      throw new Error(`missing textPath for n=${set.n}`);
    }
    await shotHtml(
      `<p style="font-size:12px;color:#666;margin:0 0 8px">ingredient ring n=${set.n}</p>${svg}`,
      set.file,
    );
    console.log("wrote", set.file);
  }

  const beautyIng = sessionIngredients("beauty");
  const petIng = sessionIngredients("pet");
  const beautyLabels = prepareIngredientRingLabels(beautyIng);
  const petLabels = prepareIngredientRingLabels(petIng);

  const gate = {
    beautyCategory: isIngredientRingCategory("화장품/뷰티"),
    petCategory: isIngredientRingCategory("반려동물"),
    fashionSkipped: !isIngredientRingCategory("의류/패션"),
    beautyLabels,
    petLabels,
    beautyWouldRender: Boolean(beautyLabels),
    petWouldRender: Boolean(petLabels),
  };
  fs.mkdirSync(path.join(ROOT, "review", "185cha-export"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "review", "185cha-export", "ring-gate.json"),
    JSON.stringify(gate, null, 2),
    "utf8",
  );
  console.log("gate", JSON.stringify(gate, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
