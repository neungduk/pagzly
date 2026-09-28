/**
 * 255차 — 라이브 미리보기 ↔ export 불일치 5건 검증 (API 0, 신규 생성 0).
 *   npm run dev  (localhost:3000)
 *   npx tsx scripts/255cha-parity-verify.ts before   # 수정 전 export 캡처
 *   npx tsx scripts/255cha-parity-verify.ts after    # 수정 후 export 캡처 + 단언
 *
 * 라이브: /dev/detail-preview?capture=255-* / 128-* (430px 컨테이너)
 * export: 같은 픽스처를 buildDetailPageHtml()에 넣고 430px 뷰포트로 렌더
 */
import fs from "fs";
import path from "path";
import { chromium, type Locator, type Page } from "playwright";
import {
  capture128ChartThenCircleSections,
  capture128CircleThenChartSections,
  capture128NonAdjacentSections,
  capture255ClampSections,
  capture255SelfAssessedSections,
  capture255TextOnlySections,
  capture255TrustEvidenceSections,
  parityMeta,
} from "../app/dev/detail-preview/parity-fixtures";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "255cha-parity-fix");
const BASE = "http://localhost:3000";
const WIDTH = 430;
const phase = process.argv[2] === "after" ? "after" : "before";

const IMAGE_URLS = [
  "/iteration-fixtures/01.jpg",
  "/iteration-fixtures/02.jpg",
  "/iteration-fixtures/03.jpg",
  "/iteration-fixtures/04.jpg",
];

const results: { item: string; check: string; pass: boolean; detail?: string }[] = [];
function check(item: string, name: string, pass: boolean, detail?: string) {
  results.push({ item, check: name, pass, detail });
  console.log(`${pass ? "OK  " : "FAIL"} [${item}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function exportHtml(sections: DetailSection[]): string {
  const html = buildDetailPageHtml({
    productName: parityMeta.productName,
    brandName: parityMeta.brandName,
    category: parityMeta.category,
    sections,
    imageUrls: IMAGE_URLS,
    theme: getCategoryTheme(parityMeta.category),
  });
  return html.replace("<head>", `<head><base href="${BASE}/">`);
}

async function openLive(page: Page, capture: string) {
  await page.goto(`${BASE}/dev/detail-preview?capture=${capture}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForSelector("[data-pagzly-preview] section", { timeout: 60_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" });
  await settle(page);
}

async function openExport(page: Page, name: string, sections: DetailSection[]) {
  const file = path.join(OUT, `${name}-${phase}.html`);
  fs.writeFileSync(file, exportHtml(sections), "utf8");
  await page.goto(`file:///${file.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await settle(page);
}

async function settle(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

async function shot(loc: Locator, file: string) {
  await loc.scrollIntoViewIfNeeded();
  await loc.page().waitForTimeout(150);
  await loc.screenshot({ path: path.join(OUT, file) });
}

type ClampProbe = {
  tag: string;
  kind: "heading" | "body";
  display: string;
  clamp: string;
  lines: number;
  truncated: boolean;
};

/** 긴 헤딩/본문 접두어를 가진 텍스트 요소의 실제 clamp 상태 (문서 순서) */
async function probeClamp(page: Page, scope: string): Promise<ClampProbe[]> {
  return page.evaluate((scopeSel) => {
    const H = "아침에 바른 수분감이";
    const B = "건조한 사무실 공기";
    const root = document.querySelector(scopeSel) ?? document.body;
    const out: ClampProbe[] = [];
    root.querySelectorAll<HTMLElement>("h1,h2,h3,p").forEach((el) => {
      const t = (el.textContent ?? "").trim();
      const kind = t.startsWith(H) ? "heading" : t.startsWith(B) ? "body" : null;
      if (!kind) return;
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      const display = cs.display;
      const clamp = cs.getPropertyValue("-webkit-line-clamp") || "none";
      const lines = Math.round(el.getBoundingClientRect().height / lh);
      // clamp·nowrap을 풀었을 때의 자연 줄 수와 비교해 "실제로 잘렸는지" 판정
      const prev = el.getAttribute("style") ?? "";
      el.style.setProperty("-webkit-line-clamp", "none", "important");
      el.style.setProperty("display", "block", "important");
      el.style.setProperty("white-space", "normal", "important");
      el.style.setProperty("overflow", "visible", "important");
      const natural = Math.round(el.getBoundingClientRect().height / lh);
      el.setAttribute("style", prev);
      out.push({
        tag: el.tagName.toLowerCase(),
        kind,
        display,
        clamp,
        lines,
        truncated: natural > lines,
      });
    });
    return out;
  }, scope);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  // tsx(esbuild keepNames)가 evaluate 콜백에 __name()을 끼워 넣는 경우 대비
  await ctx.addInitScript("window.__name = (f) => f;");
  const live = await ctx.newPage();
  const exp = await ctx.newPage();

  // ── 항목 1 — line-clamp ─────────────────────────────────────────────
  await openLive(live, "255-clamp");
  await openExport(exp, "1-clamp", capture255ClampSections);
  const liveClamp = await probeClamp(live, "[data-pagzly-preview]");
  const expClamp = await probeClamp(exp, ".pagzly-wrap");
  fs.writeFileSync(
    path.join(OUT, `1-clamp-probe-${phase}.json`),
    JSON.stringify({ live: liveClamp, export: expClamp }, null, 2),
    "utf8",
  );
  if (phase === "before") {
    const { screenshotFullPageSafe } = await import("./lib/neutralize-sticky");
    await screenshotFullPageSafe(live, { path: path.join(OUT, "1-live.png") });
  }
  {
    const { screenshotFullPageSafe } = await import("./lib/neutralize-sticky");
    await screenshotFullPageSafe(exp, { path: path.join(OUT, `1-${phase}.png`) });
  }
  const liveTrunc = liveClamp.map((p) => `${p.kind}:${p.lines}${p.truncated ? "…" : ""}`);
  const expTrunc = expClamp.map((p) => `${p.kind}:${p.lines}${p.truncated ? "…" : ""}`);
  console.log("live  :", liveTrunc.join(" | "));
  console.log("export:", expTrunc.join(" | "));
  if (phase === "after") {
    check(
      "1",
      "probe element count equal",
      liveClamp.length === expClamp.length,
      `live ${liveClamp.length} / export ${expClamp.length}`,
    );
    const n = Math.min(liveClamp.length, expClamp.length);
    for (let i = 0; i < n; i += 1) {
      const a = liveClamp[i]!;
      const b = expClamp[i]!;
      check(
        "1",
        `#${i} ${a.kind} clamp parity`,
        a.truncated === b.truncated && (!a.truncated || a.lines === b.lines),
        `live ${a.tag} lines=${a.lines} trunc=${a.truncated} clamp=${a.clamp} display=${a.display} / export ${b.tag} lines=${b.lines} trunc=${b.truncated} clamp=${b.clamp}`,
      );
    }
  }

  // ── 항목 2 — text_only ─────────────────────────────────────────────
  await openLive(live, "255-text-only");
  await openExport(exp, "2-text-only", capture255TextOnlySections);
  const liveText = live.locator("[data-pagzly-preview] section", {
    hasText: "매일 손이 가는 튜브 패키지",
  }).last();
  const expText = exp.locator(".pagzly-wrap > section", { hasText: "매일 손이 가는 튜브 패키지" }).last();
  if (phase === "before") await shot(liveText, "2-live.png");
  await shot(expText, `2-${phase}.png`);
  const expTextInfo = await expText.evaluate((el) => ({
    imgs: el.querySelectorAll("img").length,
    negMargin: el.innerHTML.includes("margin-top:-28px"),
    pointBadge: /POINT \d+/.test(el.textContent ?? ""),
    boxShadow: [...el.querySelectorAll<HTMLElement>("*")].some(
      (n) => getComputedStyle(n).boxShadow !== "none",
    ),
  }));
  const liveTextInfo = await liveText.evaluate((el) => ({
    imgs: el.querySelectorAll("img").length,
  }));
  console.log("text_only live", liveTextInfo, "export", expTextInfo);
  if (phase === "after") {
    check("2", "export text_only has no <img>", expTextInfo.imgs === 0 && liveTextInfo.imgs === 0);
    check("2", "export text_only no -28px card / POINT badge / shadow",
      !expTextInfo.negMargin && !expTextInfo.pointBadge && !expTextInfo.boxShadow);
  }

  // ── 항목 3 — seller_trust_evidence ─────────────────────────────────
  await openLive(live, "255-trust-evidence");
  await openExport(exp, "3-trust", capture255TrustEvidenceSections);
  const liveTrust = live.locator("[data-pagzly-preview] section", { hasText: "3주 연속" }).first();
  const liveTrust2 = live.locator("[data-pagzly-preview] section", { hasText: "재구매율" }).first();
  const expTrust = exp.locator(".pagzly-wrap > section", { hasText: "3주 연속" }).first();
  const expTrust2 = exp.locator(".pagzly-wrap > section", { hasText: "재구매율" }).first();
  if (phase === "before") {
    await shot(liveTrust, "3-live.png");
    await shot(liveTrust2, "3-live-with-heading.png");
  }
  await shot(expTrust, `3-${phase}.png`);
  await shot(expTrust2, `3-${phase}-with-heading.png`);
  const trustInfo = async (loc: Locator) =>
    loc.evaluate((el) => ({
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
      pointPill: /POINT\s*0\d|0\d\s*\/|^\s*0[1-4]\s*$/m.test(el.textContent ?? "")
        || [...el.querySelectorAll("span,div")].some((n) => /^0[1-4]$/.test((n.textContent ?? "").trim())),
      headings: el.querySelectorAll("h2,h3").length,
      titleFont: (() => {
        const cand = [...el.querySelectorAll<HTMLElement>("p,h3")].find((n) =>
          /3주 연속|재구매율/.test(n.textContent ?? ""),
        );
        return cand ? getComputedStyle(cand).fontSize : "";
      })(),
    }));
  const lt1 = await trustInfo(liveTrust);
  const et1 = await trustInfo(expTrust);
  const lt2 = await trustInfo(liveTrust2);
  const et2 = await trustInfo(expTrust2);
  console.log("trust live", lt1, lt2);
  console.log("trust export", et1, et2);
  if (phase === "after") {
    check("3", "no heading block when heading empty", lt1.headings === 0 && et1.headings === 0,
      `live h=${lt1.headings} export h=${et1.headings}`);
    check("3", "heading shown when present", lt2.headings >= 1 && et2.headings >= 1);
    check("3", "no point-number pill on trust cards", !et1.pointPill && !et2.pointPill);
    check("3", "same visible text (no heading case)", lt1.text === et1.text, `live="${lt1.text}" export="${et1.text}"`);
    check("3", "quote-size title (≥24px)", parseFloat(et1.titleFont) >= 24, `export ${et1.titleFont} / live ${lt1.titleFont}`);
  }

  // ── 항목 4 — self_assessed 폴백 ───────────────────────────────────
  await openLive(live, "255-self-assessed");
  await openExport(exp, "4-self-assessed", capture255SelfAssessedSections);
  const NOTE = "자체 평가 기준 (개인차가 있을 수 있어요)";
  const liveChart = live.locator("[data-pagzly-preview] section", { hasText: "일반 제품과 무엇이 다른가요" }).first();
  const expChart = exp.locator(".pagzly-wrap > section", { hasText: "일반 제품과 무엇이 다른가요" }).first();
  if (phase === "before") await shot(liveChart, "4-live.png");
  await shot(expChart, `4-${phase}.png`);
  const liveHasNote = (await liveChart.textContent())?.includes(NOTE) ?? false;
  const expHasNote = (await expChart.textContent())?.includes(NOTE) ?? false;
  console.log("self_assessed note live", liveHasNote, "export", expHasNote);
  if (phase === "after") {
    check("4", "live shows disclaimer", liveHasNote);
    check("4", "export shows disclaimer", expHasNote);
  }

  // ── 항목 5 — circle + comparison_chart combo ──────────────────────
  const combos: [string, string, DetailSection[], boolean][] = [
    ["128-circle-then-chart", "5-circle-then-chart", capture128CircleThenChartSections, true],
    ["128-chart-then-circle", "5-chart-then-circle", capture128ChartThenCircleSections, true],
    ["128-non-adjacent", "5-non-adjacent", capture128NonAdjacentSections, false],
  ];
  for (const [capture, name, sections, expectMerge] of combos) {
    await openLive(live, capture);
    await openExport(exp, name, sections);
    const liveCount = await live.locator("[data-testid='circle-comparison-combo']").count();
    const expCombo = exp.locator(".pagzly-wrap > section", { hasText: "일반 제품과 무엇이 다른가요" }).first();
    const expHasCircle = await expCombo.evaluate((el) => el.textContent?.includes("히알루론산") ?? false);
    const liveSections = await live.locator("[data-pagzly-preview] section").count();
    const expSections = await exp.locator(".pagzly-wrap > section").count();
    const liveTarget = liveCount > 0
      ? live.locator("[data-testid='circle-comparison-combo']").first()
      : live.locator("[data-pagzly-preview] section", { hasText: "일반 제품과 무엇이 다른가요" }).first();
    if (phase === "before") await shot(liveTarget, `${name}-live.png`);
    // 병합 안 된 export는 원형 섹션까지 보이도록 두 섹션을 감싸는 영역으로 캡처
    const expBox = await exp.evaluate(() => {
      const secs = [...document.querySelectorAll<HTMLElement>(".pagzly-wrap > section")];
      const hit = secs.filter((s) => /히알루론산|일반 제품과 무엇이 다른가요/.test(s.textContent ?? ""));
      if (hit.length === 0) return null;
      const top = Math.min(...hit.map((s) => s.getBoundingClientRect().top + window.scrollY));
      const bottom = Math.max(...hit.map((s) => s.getBoundingClientRect().bottom + window.scrollY));
      return { top, bottom };
    });
    if (expBox) {
      await exp.evaluate((y) => window.scrollTo(0, y), expBox.top);
      await exp.waitForTimeout(150);
      const { screenshotFullPageSafe } = await import("./lib/neutralize-sticky");
      const tmp = path.join(OUT, `_tmp-${name}.png`);
      await screenshotFullPageSafe(exp, { path: tmp });
      const sharp = (await import("sharp")).default;
      const meta = await sharp(tmp).metadata();
      const height = Math.min(Math.ceil(expBox.bottom - expBox.top), (meta.height ?? 0) - Math.floor(expBox.top));
      await sharp(tmp)
        .extract({ left: 0, top: Math.floor(expBox.top), width: WIDTH, height })
        .toFile(path.join(OUT, `${name}-${phase}.png`));
      fs.unlinkSync(tmp);
    }
    console.log(
      `${name}: live combos=${liveCount} liveSections=${liveSections} exportSections=${expSections} exportChartHasCircle=${expHasCircle}`,
    );
    if (phase === "after") {
      check("5", `${name} live merge=${expectMerge}`, (liveCount > 0) === expectMerge);
      check("5", `${name} export merge=${expectMerge}`, expHasCircle === expectMerge);
    }
  }

  await browser.close();
  fs.writeFileSync(
    path.join(OUT, `results-${phase}.json`),
    JSON.stringify(results, null, 2),
    "utf8",
  );
  const failed = results.filter((r) => !r.pass);
  console.log("API generate: 0");
  if (phase === "after") {
    console.log(failed.length === 0 ? "ALL PASS" : `${failed.length} FAIL`);
    if (failed.length > 0) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
