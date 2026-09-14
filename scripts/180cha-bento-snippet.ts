import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { buildSpecBentoGridHtml } from "../lib/spec-bento-grid";
import { getCategoryTheme } from "../lib/category-theme";
import { RADIUS } from "../lib/design-tokens";

async function main() {
  const out = path.join(__dirname, "..", "review", "180cha-pixel");
  const shot = path.join(__dirname, "..", "review", "qa-screenshots");
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(shot, { recursive: true });

  const theme = getCategoryTheme("화장품/뷰티");
  const facts = [
    { label: "용량", value: "50ml" },
    { label: "제형", value: "에센스" },
    { label: "피부", value: "민감" },
  ];
  const afterHtml = buildSpecBentoGridHtml(facts, theme);
  if (!afterHtml.includes(`border-radius:${RADIUS.lg}px`)) {
    throw new Error(`expected border-radius:${RADIUS.lg}px`);
  }
  const beforeHtml = afterHtml.replaceAll(
    `border-radius:${RADIUS.lg}px`,
    "border-radius:14px",
  );

  const wrap = (inner: string) =>
    `<!doctype html><html><body style="margin:0;background:#E8E4DC;padding:32px">${inner}</body></html>`;

  fs.writeFileSync(path.join(out, "bento-before-snippet.html"), wrap(beforeHtml));
  fs.writeFileSync(path.join(out, "bento-after-snippet.html"), wrap(afterHtml));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 520, height: 320 } });
  await page.setContent(wrap(beforeHtml), { waitUntil: "load" });
  await page.screenshot({
    path: path.join(shot, "180cha-bento-before.png"),
  });
  await page.setContent(wrap(afterHtml), { waitUntil: "load" });
  await page.screenshot({
    path: path.join(shot, "180cha-bento-after.png"),
  });
  await browser.close();
  console.log("[180] bento snippets ok RADIUS.lg=", RADIUS.lg);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
