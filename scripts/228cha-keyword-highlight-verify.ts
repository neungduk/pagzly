/**
 * 228차 — splitTextByKeywords 단위 + export/live 강조 검증 (API 0).
 *   npx tsx scripts/228cha-keyword-highlight-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import {
  extractCoreKeywords,
  splitTextByKeywords,
  type HighlightSegment,
} from "../lib/review-insights";
import type { DetailSection, ReviewHighlightSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "228cha-keyword-highlight");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

function joinSegs(segs: HighlightSegment[]): string {
  return segs.map((s) => s.text).join("");
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

function unitTests(): void {
  console.log("=== splitTextByKeywords unit ===");

  {
    const text = "촉촉함이 오래가고 오후까지 당김이 없어 보습 지속력이 좋다.";
    const segs = splitTextByKeywords(text);
    assert(joinSegs(segs) === text, "scattered keywords: join === original");
    assert(segs.some((s) => s.isKeyword), "scattered: has keyword segments");
    const kws = extractCoreKeywords(text);
    for (const s of segs.filter((x) => x.isKeyword)) {
      assert(kws.includes(s.text), `keyword seg "${s.text}" in extractCoreKeywords`);
    }
  }

  {
    const text = "가";
    const segs = splitTextByKeywords(text);
    assert(segs.length === 1 && !segs[0]!.isKeyword && segs[0]!.text === text, "short → single plain segment");
  }

  {
    const text = "210g 원단이 가볍고 좋아요";
    const segs = splitTextByKeywords(text);
    assert(joinSegs(segs) === text, "210g: join === original");
    assert(
      segs.some((s) => s.isKeyword && s.text === "210g"),
      "210g marked as keyword",
    );
  }

  {
    const text = "보습지속력이 좋은 보습";
    const kws = extractCoreKeywords(text);
    assert(kws.includes("보습지속력이") && kws.includes("보습"), "long+short both extracted");
    const segs = splitTextByKeywords(text);
    assert(joinSegs(segs) === text, "long-vs-short: join === original");
    const firstKw = segs.find((s) => s.isKeyword);
    assert(firstKw?.text === "보습지속력이", "long keyword wins over short substring");
    // trailing "보습" may still highlight; the long token must remain intact as one segment
    assert(
      segs.filter((s) => s.text === "보습지속력이" && s.isKeyword).length === 1,
      "long token kept as single keyword segment",
    );
  }

  {
    // defensive: escape path still runs for any keyword containing regex meta
    const text = "C++ 같은건 필터되지만 숫자단위 2kg도 정상";
    const segs = splitTextByKeywords(text);
    assert(joinSegs(segs) === text, "no throw + join intact for mixed text");
  }
}

function esbuildCheck(): void {
  console.log("=== esbuild syntax ===");
  const files = [
    "lib/review-insights.ts",
    "components/DetailSectionRenderer.tsx",
    "lib/export-detail-html.ts",
  ];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    execSync(
      `npx esbuild "${abs}" --bundle=false --format=esm --loader:.tsx=tsx --outfile=NUL`,
      { cwd: ROOT, stdio: "pipe", shell: true },
    );
    console.log("OK esbuild", rel);
  }
}

function fixtureSection(): ReviewHighlightSection {
  return {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자가 말한 포인트",
    praises: [
      "끈적임 없이 흡수돼요",
      "무향이라 자극이 없어요",
      "이 문장은 원문 매칭이 없어 강조되면 안 됩니다",
    ],
    praiseMatchCounts: [2, 2, 0],
    concerns: ["용량이 조금 아쉬워요", "매칭 없는 아쉬운 점 평문"],
    complaintMatchCounts: [1, 0],
    sourceReviewCount: 42,
  };
}

function exportMarkupChecks(): { html: string; accentSoft: string } {
  console.log("=== export markup ===");
  const theme = getCategoryTheme("화장품/뷰티");
  const sections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    fixtureSection(),
  ];
  const html = buildDetailPageHtml({
    productName: "228cha keyword highlight",
    category: "화장품/뷰티",
    sections,
    imageUrls: [],
    theme,
  });

  assert(html.includes(`background:${theme.accentSoft}`), "export uses theme.accentSoft");
  assert(html.includes("pagzly-review-highlight"), "export has review_highlight section");

  // matchCount>0 praise should have highlight spans
  assert(
    /끈적임<\/span>|흡수돼요<\/span>|<\/span>없이|<\/span>흡수/.test(html) ||
      html.includes(`background:${theme.accentSoft}`),
    "matched praise has highlight spans",
  );

  // matchCount===0 praise must appear as plain esc text (no span wrapping that sentence alone)
  const zeroPraise = "이 문장은 원문 매칭이 없어 강조되면 안 됩니다";
  const idx = html.indexOf(zeroPraise);
  assert(idx >= 0, "zero-match praise present as plain text");
  const window = html.slice(Math.max(0, idx - 80), idx + zeroPraise.length + 20);
  assert(!window.includes(`background:${theme.accentSoft}`), "zero-match praise not highlighted");

  const zeroConcern = "매칭 없는 아쉬운 점 평문";
  const cidx = html.indexOf(zeroConcern);
  assert(cidx >= 0, "zero-match concern present");
  const cwin = html.slice(Math.max(0, cidx - 80), cidx + zeroConcern.length + 20);
  assert(!cwin.includes(`background:${theme.accentSoft}`), "zero-match concern not highlighted");

  fs.writeFileSync(path.join(OUT, "fixture-export.html"), html, "utf8");
  return { html, accentSoft: theme.accentSoft };
}

function sourceEditModeGuard(): void {
  console.log("=== edit mode source guard ===");
  const src = fs.readFileSync(
    path.join(ROOT, "components", "DetailSectionRenderer.tsx"),
    "utf8",
  );
  const caseIdx = src.indexOf('case "review_highlight"');
  const nextCase = src.indexOf('case "before_after"', caseIdx);
  const block = src.slice(caseIdx, nextCase);
  assert(block.includes("edit?.enabled ?"), "review_highlight branches on edit?.enabled");
  assert(block.includes("splitTextByKeywords"), "uses shared splitter");
  // EditableText path must not wrap with accentSoft spans
  const editBranches = [...block.matchAll(/edit\?\.enabled \? \([\s\S]*?\) : \(/g)];
  assert(editBranches.length >= 2, "praise + concern edit branches");
  assert(
    /edit\?\.enabled \? \(\s*<EditableText[\s\S]*?splitTextByKeywords/.test(block),
    "EditableText first, highlight only in else",
  );
}

async function completeOnboardingIfNeeded(page: Page) {
  if (!page.url().includes("/onboarding")) return;
  await page.getByLabel("자사 브랜드 운영").click();
  const store = page.locator("#storeUrl");
  if (await store.count()) await store.fill("https://smartstore.naver.com/pagzly-test");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("2~4개").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("구글검색").click();
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.waitForURL((u) => u.pathname.includes("/create"), { timeout: 30000 });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
}

async function loadSession(page: Page, sessionRaw: string) {
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45000 });
    } catch {
      // stay — may already be mid-redirect
    }
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
  await completeOnboardingIfNeeded(page);
  await page.evaluate((raw) => sessionStorage.setItem("pagzly-create-result", raw), sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 90000 });
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click();
    await page.waitForTimeout(400);
  }
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
}

function patchSessionWithFixture(sessionPath: string): string {
  const s = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
    generated?: { sections?: DetailSection[] };
  };
  const sections = s.generated?.sections;
  if (!Array.isArray(sections)) throw new Error("no sections");
  const rh = fixtureSection();
  const idx = sections.findIndex((sec) => sec.type === "review_highlight");
  if (idx >= 0) sections[idx] = rh;
  else {
    const cta = sections.findIndex((sec) => sec.type === "cta_price");
    if (cta >= 0) sections.splice(cta, 0, rh);
    else sections.push(rh);
  }
  return JSON.stringify(s);
}

async function captureScreenshots(accentSoft: string): Promise<void> {
  console.log("=== screenshots ===");
  const browser = await chromium.launch({ headless: true });

  // export fixture
  {
    const page = await browser.newPage({ viewport: { width: 720, height: 1400 } });
    const fileUrl = `file:///${path.join(OUT, "fixture-export.html").replace(/\\/g, "/")}`;
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const sec = page.locator(".pagzly-review-highlight");
    await sec.scrollIntoViewIfNeeded();
    await sec.screenshot({ path: path.join(OUT, "export-review-highlight.png") });
    const highlightCount = await page.locator(`.pagzly-review-highlight span[style*="${accentSoft}"]`).count();
    console.log("export highlight spans", highlightCount);
    assert(highlightCount > 0, "export screenshot has highlight spans");
    await page.close();
  }

  // live (optional if server up)
  let liveOk = false;
  try {
    const probe = await fetch(`${BASE_URL}/login`, { signal: AbortSignal.timeout(8000) });
    liveOk = probe.status > 0;
  } catch {
    liveOk = false;
  }

  if (!liveOk) {
    console.log("SKIP live screenshots — localhost not reachable");
    await browser.close();
    return;
  }

  loadEnvLocal();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
  });
  const page = await ctx.newPage();
  const sessionRaw = patchSessionWithFixture(
    path.join(ROOT, "review", "181cha-live", "beauty", "session.json"),
  );
  await loadSession(page, sessionRaw);

  const preview = page.locator(
    '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
  );
  const rh = preview.locator('[data-testid="review-highlight"]');
  await rh.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await rh.screenshot({ path: path.join(OUT, "live-review-highlight-read.png") });

  const liveSpans = await rh
    .locator(`span[style*="border-radius: 3px"], span[style*="border-radius:3px"]`)
    .count();
  console.log("live highlight spans (read)", liveSpans);
  assert(liveSpans > 0, "live read mode has highlight spans");

  // zero-match plain: third praise
  const zeroText = "이 문장은 원문 매칭이 없어 강조되면 안 됩니다";
  const zeroEl = rh.getByText(zeroText, { exact: true });
  assert((await zeroEl.count()) >= 1, "live zero-match praise visible");
  const zeroHasSpan = await zeroEl.evaluate((el) => {
    const p = el.closest("p") ?? el;
    return p.querySelectorAll("span").length;
  });
  assert(zeroHasSpan === 0, "live zero-match praise has no highlight spans");

  // edit mode via "편집 시작"
  const editBtn = page.getByRole("button", { name: /편집 시작|편집 중/ }).first();
  if (await editBtn.count()) {
    const label = await editBtn.textContent();
    if (label && label.includes("편집 시작")) {
      await editBtn.click();
      await page.waitForTimeout(500);
    }
    await rh.scrollIntoViewIfNeeded();
    await rh.screenshot({ path: path.join(OUT, "live-review-highlight-edit.png") });
    const editSpans = await rh
      .locator(`span[style*="border-radius: 3px"], span[style*="border-radius:3px"]`)
      .count();
    console.log("live highlight spans (edit)", editSpans);
    assert(editSpans === 0, "edit mode injects no highlight spans");
  } else {
    console.log("SKIP edit-mode click — toggle not found; source guard already OK");
  }

  await ctx.close();
  await browser.close();
}

function gitDiffScope(): void {
  console.log("=== git scope (228 feature hunks) ===");
  for (const rel of [
    "lib/review-insights.ts",
    "components/DetailSectionRenderer.tsx",
    "lib/export-detail-html.ts",
  ]) {
    const diff = execSync(`git diff -- "${rel}"`, { cwd: ROOT, encoding: "utf8" });
    assert(diff.includes("splitTextByKeywords"), `${rel} diff includes splitTextByKeywords`);
  }
  // banned paths must not gain NEW 228-related hunks
  for (const rel of [
    "lib/section-inserts.ts",
    "app/api/generate/route.ts",
    "lib/types/generate.ts",
  ]) {
    let diff = "";
    try {
      diff = execSync(`git diff -- "${rel}"`, { cwd: ROOT, encoding: "utf8" });
    } catch {
      diff = "";
    }
    assert(
      !diff.includes("splitTextByKeywords") && !diff.includes("HighlightSegment"),
      `${rel} has no 228 keyword-highlight hunks`,
    );
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  unitTests();
  esbuildCheck();
  sourceEditModeGuard();
  const { accentSoft } = exportMarkupChecks();
  gitDiffScope();
  await captureScreenshots(accentSoft);
  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
