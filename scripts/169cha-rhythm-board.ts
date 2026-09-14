/**
 * 169차 Track A — A/B/D/E 섹션 배경 전/후 나란히 보드 (유료 API 0).
 * before = 166 커밋 시점 알파·각도, after = 현재 getSectionBackground.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { getSectionBackground, hexToRgba } from "../lib/design-tokens";
import type { CategoryTheme } from "../lib/category-theme";
import type { SectionColorPattern } from "../lib/design-tokens";

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "review", "169cha-rhythm");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

function legacyBackground(
  theme: CategoryTheme,
  pattern: SectionColorPattern,
  category?: string,
): string {
  const fashionMinimal = category === "의류/패션";
  const accentSoftA = fashionMinimal ? 0.21 : 0.42;
  const accentB = fashionMinimal ? 0.05 : 0.1;
  const accentSoftB = fashionMinimal ? 0.275 : 0.55;
  const accentSoftD = fashionMinimal ? 0.39 : 0.78;
  const accentD = fashionMinimal ? 0.07 : 0.14;
  const accentE = fashionMinimal ? 0.04 : 0.12;
  const deepAccentE = fashionMinimal ? 0.035 : 0.1;
  if (pattern === "A") {
    return `linear-gradient(168deg, ${theme.baseNeutral} 0%, ${hexToRgba(theme.accentSoft, accentSoftA)} 100%)`;
  }
  if (pattern === "B") {
    return `linear-gradient(168deg, ${hexToRgba(theme.accent, accentB)} 0%, ${hexToRgba(theme.accentSoft, accentSoftB)} 52%, ${theme.baseNeutral} 100%)`;
  }
  if (pattern === "D") {
    return `linear-gradient(175deg, ${hexToRgba(theme.accentSoft, accentSoftD)} 0%, ${hexToRgba(theme.accent, accentD)} 45%, ${theme.baseNeutral} 100%)`;
  }
  return `linear-gradient(180deg, ${theme.baseNeutral} 0%, ${hexToRgba(theme.accent, accentE)} 42%, ${hexToRgba(theme.deepAccent, deepAccentE)} 100%)`;
}

const PATTERNS: SectionColorPattern[] = ["A", "B", "D", "E"];

const CASES: { label: string; category: string; formKey: string }[] = [
  { label: "뷰티(비패션)", category: "화장품/뷰티", formKey: "화장품/뷰티" },
  { label: "식품", category: "식품", formKey: "식품/건강기능식품" },
  { label: "생활", category: "생활/리빙", formKey: "생활용품" },
  { label: "패션(미니멀)", category: "패션/의류", formKey: "의류/패션" },
  { label: "전자", category: "전자/가전", formKey: "전자제품" },
  { label: "펫", category: "반려동물", formKey: "반려동물" },
];

function strip(bg: string) {
  return bg.replace(/"/g, "'");
}

function buildHtml(): string {
  const blocks = CASES.map((c) => {
    const theme = getCategoryTheme(c.formKey);
    const fashionKey = c.formKey === "의류/패션" ? "의류/패션" : c.formKey;
    const rows = PATTERNS.map((p) => {
      const before = legacyBackground(theme, p, fashionKey);
      const after = getSectionBackground(theme, p, fashionKey);
      return `<div class="pair">
        <div class="cell" style="background:${strip(before)}"><span>BEFORE ${p}</span></div>
        <div class="cell" style="background:${strip(after)}"><span>AFTER ${p}</span></div>
      </div>`;
    }).join("");
    const sequence = ["A", "B", "D", "E", "A", "B", "D"]
      .map((p, i) => {
        const pat = p as SectionColorPattern;
        const before = legacyBackground(theme, pat, fashionKey);
        const after = getSectionBackground(theme, pat, fashionKey);
        return `<div class="seq-row">
          <div class="seq" style="background:${strip(before)}">${i + 1} ${p}</div>
          <div class="seq" style="background:${strip(after)}">${i + 1} ${p}</div>
        </div>`;
      })
      .join("");
    return `<section>
      <h2>${c.label} · accent ${theme.accent} / base ${theme.baseNeutral} / deep ${theme.deepAccent}</h2>
      <div class="grid">${rows}</div>
      <h3>연속 7섹션 리듬 (좌=전 / 우=후)</h3>
      <div class="sequence">${sequence}</div>
    </section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"/>
<title>169cha section rhythm before/after</title>
<style>
  body{font-family:ui-sans-serif,system-ui;margin:24px;background:#f7f7f5;color:#1b1b18}
  h1{font-size:22px;margin:0 0 8px}
  h2{font-size:16px;margin:28px 0 12px}
  h3{font-size:13px;margin:16px 0 8px;opacity:.75}
  .meta{font-size:13px;opacity:.7;margin-bottom:20px}
  .grid{display:grid;gap:8px}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .cell{min-height:72px;border-radius:8px;display:flex;align-items:flex-end;padding:10px;font-size:12px;font-weight:600}
  .sequence{display:flex;flex-direction:column;gap:6px}
  .seq-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .seq{min-height:48px;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:12px;font-weight:600}
</style></head><body>
<h1>169차 — 섹션 배경 리듬 대비 (전/후)</h1>
<p class="meta">유료 API 0 · 3색 토큰만 · 패턴 C 미포함 · 좌=166 시점 / 우=169 조정</p>
${blocks}
</body></html>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  const htmlPath = path.join(OUT_DIR, "rhythm-board.html");
  fs.writeFileSync(htmlPath, buildHtml(), "utf8");

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  const shotPath = path.join(SHOT, "169cha-rhythm-before-after.png");
  await page.screenshot({ path: shotPath, fullPage: true });
  // 뷰티 연속 리듬만 크롭용 상단
  const beautyShot = path.join(SHOT, "169cha-rhythm-beauty-sequence.png");
  await page.screenshot({ path: beautyShot, fullPage: false });
  await browser.close();
  console.log("[169] wrote", htmlPath);
  console.log("[169] shot", shotPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
