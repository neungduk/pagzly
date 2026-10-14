/**
 * 399차 — 생성 결과 1건 자동 점검 (영구 도구, 무료: 생성 API·Replicate 호출 없음).
 *
 *   npm run dev (별도 창)
 *   npx tsx scripts/audit-session.ts <session.json> <출력 폴더> [--skip-parity] [--base http://localhost:3000]
 *
 * session.json: 결과 페이지 sessionStorage("pagzly-create-result") 저장본(181cha·live-one이 남기는 것)
 *               또는 { sections, category, ... } 형태 모두 받는다.
 * 하는 일
 *   1) 고정 규칙: 하이라이트 카드 title 길이(6자 내외)·단어/단위 중간 잘림, 핵심 포인트·요약 칩 아이콘(수치만 있는 항목은 체크),
 *      같은 소스 사진 사용 횟수(데이터·화면), 같은 문장 3회 이상 반복
 *   2) 하이드레이션 경고(미리보기 경로, 편집 모드 포함)
 *   3) 타입 패리티(scripts/286cha-type-parity-verify.ts를 이 세션만 돌림) — illustration_banner 4행 외 차이 0
 *   4) 390·750 전체 캡처 + 첫 3화면 캡처
 *   5) audit.json + audit.md(한국어 통과/실패 표)
 * 종료 코드: 실패가 하나라도 있으면 1.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";
import sharp from "sharp";
import type { DetailSection } from "../lib/types/generate";
import { pickChecklistIcons, pickSummaryIcon, type SummaryIconId } from "../lib/summary-line-icons";
import { extractTrustChips } from "../lib/extract-trust-chips";

type Status = "통과" | "실패" | "주의" | "건너뜀";
type Check = { id: string; name: string; status: Status; detail: string; items?: unknown[] };

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--base"));
const SESSION_PATH = positional[0];
const OUT_DIR = positional[1];
const BASE = opt("--base") ?? "http://localhost:3000";
const ROOT = path.join(__dirname, "..");

if (!SESSION_PATH || !OUT_DIR) {
  console.error("사용법: npx tsx scripts/audit-session.ts <session.json> <출력 폴더> [--skip-parity] [--base URL]");
  process.exit(2);
}

/* ---------- 세션 읽기 ---------- */

type Payload = {
  sections: DetailSection[];
  category: string;
  brandName: string;
  productName: string;
  imageUrls: string[];
  theme?: unknown;
  imageRoles?: unknown;
  imageOrigins?: unknown;
  conceptIcons?: unknown;
  price?: number;
  keyFeatures?: string;
};

export function loadPayload(file: string): Payload {
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  const g = s.generated ?? s;
  return {
    sections: g.sections,
    category: s.category ?? g.category ?? "",
    brandName: s.brandName ?? g.brandName ?? "",
    productName: s.productName ?? g.productName ?? "",
    imageUrls: (g.imageUrls ?? s.imageUrls ?? []) as string[],
    theme: g.theme ?? s.theme ?? undefined,
    imageRoles: s.imageRoles ?? g.imageRoles,
    imageOrigins: g.imageOrigins ?? s.imageOrigins,
    conceptIcons: g.conceptIcons,
    price: typeof s.price === "number" ? s.price : Number(s.price) || undefined,
    keyFeatures: s.keyFeatures ?? undefined,
  };
}

/* ---------- 1) 고정 규칙 (순수 함수) ---------- */

const TITLE_SOFT_MAX = 8; // 프롬프트는 "6자 내외" — 공백 제외 8자까지는 내외로 본다
const UNIT_TOKEN = /^(\d+(?:\.\d+)?)([a-zA-Z]+)$/;
const KNOWN_UNITS = new Set(["g", "kg", "mg", "mcg", "ml", "l", "cm", "mm", "m", "km", "w", "kw", "v", "mah", "db", "hz", "khz", "gb", "tb", "h", "ea"]);

/** 카드 title의 마지막 어절이 같은 카드 body(또는 다른 카드 텍스트) 속 더 긴 어절의 앞부분이면 중간에서 잘린 것 */
export function findTruncatedTitle(title: string, context: string): string | null {
  const tokens = title.trim().split(/\s+/);
  const last = tokens[tokens.length - 1] ?? "";
  if (last.length < 1) return null;
  const ctxTokens = context.split(/[\s,·/()]+/).filter(Boolean);
  // 한글 어절은 뒤에 조사·어미가 붙는 게 정상("케어" → "케어합니다")이라 판단하지 않는다.
  // 영문·숫자로 끝난 어절이 영문·숫자로 더 이어질 때만 잘림("AN" → "ANC", "480m" → "480mg")
  const longer = /[A-Za-z0-9]$/.test(last)
    ? ctxTokens.find((t) => t.length > last.length && t.startsWith(last) && /[A-Za-z0-9]/.test(t[last.length]!))
    : undefined;
  if (longer && !ctxTokens.includes(last)) return `"${last}" ← "${longer}"`;
  const unit = last.match(UNIT_TOKEN);
  if (unit && !KNOWN_UNITS.has(unit[2]!.toLowerCase())) return `"${last}" — 알 수 없는 단위(잘림 의심)`;
  return null;
}

/** 숫자·기호·단위만 있는 항목("2개", "100%", "3종") — 근거 키워드가 없으니 체크여야 한다 */
export function isNumericOnly(text: string): boolean {
  return /^[\s\d.,%+×x~\-]*(개|종|입|매|팩|세트|ea|%)?[\s\d.,%+×x~\-]*$/i.test(text.trim()) && /\d/.test(text);
}

function collectImageUses(sections: DetailSection[]): Map<number, number> {
  const uses = new Map<number, number>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        if (k === "imageIndex" && typeof x === "number") uses.set(x, (uses.get(x) ?? 0) + 1);
        else if (k === "imageIndexes" && Array.isArray(x)) for (const n of new Set(x)) if (typeof n === "number") uses.set(n, (uses.get(n) ?? 0) + 1);
        else walk(x);
      }
    }
  };
  walk(sections);
  return uses;
}

export function staticChecks(p: Payload): Check[] {
  const checks: Check[] = [];

  // 하이라이트 카드 title
  const hl = p.sections.filter((s) => s.type === "highlight_box" && s.slot !== "seller_trust_evidence") as Array<
    DetailSection & { cards?: Array<{ title?: string; body?: string }> }
  >;
  const longTitles: string[] = [];
  const cut: string[] = [];
  for (const sec of hl) {
    const cards = sec.cards ?? [];
    const all = cards.map((c) => `${c.title ?? ""} ${c.body ?? ""}`).join(" ");
    for (const c of cards) {
      const t = (c.title ?? "").trim();
      if (!t) continue;
      if (t.replace(/\s/g, "").length > TITLE_SOFT_MAX) longTitles.push(t);
      const tr = findTruncatedTitle(t, `${c.body ?? ""} ${all.replace(t, "")}`);
      if (tr) cut.push(`${t} — ${tr}`);
    }
  }
  checks.push({
    id: "hl-title-cut",
    name: "하이라이트 카드 제목이 단어·단위 중간에서 잘리지 않음",
    status: hl.length === 0 ? "건너뜀" : cut.length ? "실패" : "통과",
    detail: hl.length === 0 ? "하이라이트 섹션 없음" : cut.length ? cut.join(" / ") : "잘린 제목 없음",
  });
  checks.push({
    id: "hl-title-len",
    name: `하이라이트 카드 제목 길이(6자 내외, 공백 제외 ${TITLE_SOFT_MAX}자 이하)`,
    status: hl.length === 0 ? "건너뜀" : longTitles.length ? "주의" : "통과",
    detail: longTitles.length ? longTitles.join(" / ") : "모두 범위 안",
  });

  // 핵심 포인트 아이콘
  const clRows: Array<{ item: string; icon: SummaryIconId }> = [];
  for (const sec of p.sections) {
    if (sec.type !== "checklist") continue;
    const items = ((sec as { items?: string[] }).items ?? []).filter((x) => String(x).trim());
    const icons = pickChecklistIcons(items);
    items.forEach((item, i) => clRows.push({ item: String(item).slice(0, 40), icon: icons[i]! }));
  }
  const clBad = clRows.filter((r) => isNumericOnly(r.item) && r.icon !== "check");
  checks.push({
    id: "cl-icons",
    name: "핵심 포인트 아이콘: 수치만 있는 항목은 체크",
    status: clRows.length === 0 ? "건너뜀" : clBad.length ? "실패" : "통과",
    detail: clRows.length === 0 ? "핵심 포인트 없음" : clRows.map((r) => `${r.item} → ${r.icon}`).join(" | "),
    items: clRows,
  });

  // 요약 칩 아이콘
  const chips = extractTrustChips(p.sections, { keyFeatures: p.keyFeatures });
  const chipRows = chips.map((c) => ({ chip: c, icon: pickSummaryIcon(c) }));
  const chipBad = chipRows.filter((r) => isNumericOnly(r.chip) && r.icon !== "check");
  checks.push({
    id: "chip-icons",
    name: "요약 칩 아이콘: 수치만 있는 칩은 체크",
    status: chipRows.length === 0 ? "건너뜀" : chipBad.length ? "실패" : "통과",
    detail: chipRows.length === 0 ? "요약 칩 없음" : chipRows.map((r) => `${r.chip} → ${r.icon}`).join(" | "),
    items: chipRows,
  });

  // 같은 소스 사진(데이터 단계 — 표시 규칙 적용 전)
  const uses = [...collectImageUses(p.sections)].filter(([, n]) => n > 2);
  checks.push({
    id: "image-repeat-data",
    name: "같은 사진 번호를 3곳 이상에 배정하지 않음(데이터, 표시 규칙 전)",
    status: uses.length ? "주의" : "통과",
    detail: uses.length ? uses.map(([i, n]) => `사진 ${i + 1}번 ${n}회`).join(", ") + " — 화면 점검(image-repeat-page)에서 표시 규칙이 막았는지 확인" : "없음",
  });
  return checks;
}

/* ---------- 2·4) 브라우저 점검 ---------- */

const HYD = /hydrat|did not match|server rendered|Text content does not match/i;

async function openPreview(browser: Browser, p: Payload, width: number, edit = false) {
  const ctx = await browser.newContext({ viewport: { width: width >= 640 ? 1280 : width, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = { hyd: 0, err: 0 };
  page.on("console", (m) => {
    const t = m.text();
    if (HYD.test(t)) logs.hyd += 1;
    else if (m.type() === "error" && !/favicon|Failed to load resource/i.test(t)) logs.err += 1;
  });
  page.on("pageerror", (e) => (HYD.test(e.message) ? (logs.hyd += 1) : (logs.err += 1)));
  await page.addInitScript({ content: "window.__name = (f) => f;" });
  await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.evaluate((x) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(x)), p);
  await page.goto(`${BASE}/dev/detail-preview?capture=session&budget=1`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForSelector("[data-section-index]", { timeout: 120_000 });
  if (edit) {
    const btn = page.getByRole("button", { name: "편집 시작" }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(800);
    }
  } else {
    await page.addStyleTag({ content: `html{scrollbar-width:none}::-webkit-scrollbar{display:none}[data-pagzly-preview]{box-sizing:border-box;width:${width}px!important;max-width:${width}px!important;border:0!important}nextjs-portal{display:none!important}` });
  }
  return { ctx, page, logs };
}

async function scrollThrough(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll("img")];
    imgs.forEach((i) => (i.loading = "eager"));
    await Promise.race([
      Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; })))),
      new Promise((r) => setTimeout(r, 20_000)),
    ]);
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

const PAGE_PROBE = `(() => {
  const root = document.querySelector("[data-pagzly-preview]");
  const srcCount = {};
  for (const img of root.querySelectorAll("img")) {
    const r = img.getBoundingClientRect();
    if (r.width < 120 || r.height < 120) continue; // 원형 썸네일·아이콘 제외
    const key = (img.currentSrc || img.src || "").split("?")[0];
    if (!key) continue;
    srcCount[key] = (srcCount[key] || 0) + 1;
  }
  const sentences = {};
  for (const el of root.querySelectorAll("p, li, span")) {
    if (el.querySelector("p, li")) continue;
    const t = (el.textContent || "").replace(/\\s+/g, " ").trim();
    for (const s of t.split(/(?<=[.!?。])\\s+|\\n/)) {
      const k = s.replace(/[\\s.!?。,·]/g, "");
      if (k.length < 15) continue;
      sentences[k] = sentences[k] || { text: s.slice(0, 60), n: 0 };
      sentences[k].n += 1;
    }
  }
  return { srcCount, sentences: Object.values(sentences).filter((x) => x.n >= 3) };
})()`;

/* ---------- 2-1) 제목 줄 수 패리티 (401차) ---------- */

/** h1·h2 제목별 줄 수와 마지막 줄 글자 수 — 글자 단위로 줄 top을 잰다 */
const LINE_PROBE = `(() => {
  const root = document.querySelector("[data-pagzly-preview]") ?? document.querySelector(".pagzly-wrap") ?? document.body;
  const out = [];
  for (const h of root.querySelectorAll("h1,h2")) {
    if (h.closest(".pagzly-seo-text")) continue;
    const text = (h.textContent || "").replace(/\\s+/g, " ").trim();
    if (!text || h.getBoundingClientRect().width < 1) continue;
    const chars = [];
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      for (let i = 0; i < n.textContent.length; i++) {
        if (!n.textContent[i].trim()) continue;
        const rr = document.createRange(); rr.setStart(n, i); rr.setEnd(n, i + 1);
        const rc = rr.getClientRects()[0];
        if (rc && rc.width > 0) chars.push(Math.round(rc.top));
      }
    }
    const tops = [...new Set(chars)].sort((a, b) => a - b);
    const lines = [];
    for (const t of tops) if (!lines.length || t - lines[lines.length - 1] > 6) lines.push(t);
    const lastChars = lines.length ? chars.filter((t) => t >= lines[lines.length - 1] - 6).length : 0;
    out.push({ text: text.slice(0, 40), lines: lines.length, lastChars, width: Math.round(h.getBoundingClientRect().width) });
  }
  return out;
})()`;

type LineRow = { text: string; lines: number; lastChars: number; width: number };

/** 라이브·export 같은 제목의 줄 수 비교. 다르면 실패, 한 글자만 남은 줄(고아 글자)은 주의 */
export function compareLines(width: number, live: LineRow[], exp: LineRow[]): { mismatch: string[]; orphan: string[] } {
  const mismatch: string[] = [];
  const orphan: string[] = [];
  for (const l of live) {
    const e = exp.find((x) => x.text === l.text);
    if (e && e.lines !== l.lines) mismatch.push(`${width}폭 "${l.text}" 라이브 ${l.lines}줄(폭 ${l.width}px) ↔ export ${e.lines}줄(폭 ${e.width}px)`);
    if (l.lines > 1 && l.lastChars <= 1) orphan.push(`${width}폭 라이브 "${l.text}" 마지막 줄 한 글자`);
    if (e && e.lines > 1 && e.lastChars <= 1) orphan.push(`${width}폭 export "${e.text}" 마지막 줄 한 글자`);
  }
  return { mismatch, orphan };
}

async function exportLines(browser: Browser, p: Payload, width: number, file: string): Promise<LineRow[]> {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("file:///" + path.resolve(file).split(path.sep).join("/"), { waitUntil: "load", timeout: 120_000 });
  await scrollThrough(page);
  await page.evaluate(() => document.fonts.ready);
  const rows = (await page.evaluate(LINE_PROBE)) as LineRow[];
  await ctx.close();
  return rows;
}

async function writeExportHtml(p: Payload, file: string) {
  const { buildDetailPageHtml } = await import("../lib/export-detail-html");
  const { getCategoryTheme } = await import("../lib/category-theme");
  const abs = (u: string) => (u.startsWith("/") ? `${BASE}${u}` : u);
  const theme = p.theme ? { ...getCategoryTheme(p.category), ...(p.theme as object) } : getCategoryTheme(p.category);
  const html = buildDetailPageHtml({
    productName: p.productName,
    brandName: p.brandName,
    category: p.category,
    sections: p.sections,
    imageUrls: p.imageUrls.map(abs),
    theme: theme as Parameters<typeof buildDetailPageHtml>[0]["theme"],
    price: p.price,
    keyFeatures: p.keyFeatures,
    imageRoles: p.imageRoles as Parameters<typeof buildDetailPageHtml>[0]["imageRoles"],
    imageOrigins: p.imageOrigins as Parameters<typeof buildDetailPageHtml>[0]["imageOrigins"],
  });
  fs.writeFileSync(file, html);
}

/* ---------- 3) 타입 패리티 ---------- */

function runParity(sessionPath: string, label: string): Check {
  const r = spawnSync("npx", ["tsx", "scripts/286cha-type-parity-verify.ts"], {
    cwd: ROOT,
    env: { ...process.env, SESSION: path.resolve(sessionPath), LABEL: label, ONLY: "session279" },
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 20 * 60_000,
  });
  const lines = (r.stdout ?? "").split(/\r?\n/).filter((l) => l.includes(" diff="));
  if (r.status !== 0 || lines.length === 0) {
    return { id: "type-parity", name: "라이브↔export 타입 패리티", status: "실패", detail: `패리티 스크립트 실패(종료 코드 ${r.status}). ${(r.stderr ?? "").slice(0, 200)}` };
  }
  const bad = lines.filter((l) => !/diff=0\b/.test(l) && !/diff=-/.test(l) && !/illustration_banner/.test(l));
  const banner = lines.filter((l) => /illustration_banner/.test(l) && !/diff=0\b/.test(l));
  return {
    id: "type-parity",
    name: "라이브↔export 타입 패리티(illustration_banner 제외 차이 0)",
    status: bad.length ? "실패" : "통과",
    detail: `${lines.length}행 측정, 차이 ${bad.length}행(illustration_banner ${banner.length}행 별도). 상세: review/286cha-parity-${label}/`,
    items: bad,
  };
}

/* ---------- 실행 ---------- */

async function main() {
  fs.mkdirSync(OUT_DIR!, { recursive: true });
  const p = loadPayload(SESSION_PATH!);
  const checks = staticChecks(p);

  const browser = await chromium.launch();
  let hydTotal = 0;
  let errTotal = 0;
  const pageRepeat: string[] = [];
  let pageUses: string[] = [];
  const sentenceRepeat: string[] = [];
  const lineMismatch: string[] = [];
  const lineOrphan: string[] = [];
  const exportFile = path.join(OUT_DIR!, "export.html");
  await writeExportHtml(p, exportFile);
  for (const width of [390, 750]) {
    const { ctx, page, logs } = await openPreview(browser, p, width);
    await scrollThrough(page);
    await page.evaluate(() => document.fonts.ready);
    const liveLines = (await page.evaluate(LINE_PROBE)) as LineRow[];
    const cmp = compareLines(width, liveLines, await exportLines(browser, p, width, exportFile));
    lineMismatch.push(...cmp.mismatch);
    lineOrphan.push(...cmp.orphan);
    const probe = (await page.evaluate(PAGE_PROBE)) as { srcCount: Record<string, number>; sentences: Array<{ text: string; n: number }> };
    if (width === 390) {
      const urls = p.imageUrls.map((u) => u.split("?")[0]);
      const label = (src: string) => {
        const idx = urls.findIndex((u) => src.endsWith(u) || u.endsWith(src) || src.includes(path.basename(u)));
        return idx >= 0 ? `사진 ${idx + 1}번` : "사진(번호 불명)";
      };
      pageUses = Object.entries(probe.srcCount).map(([src, n]) => `${label(src)} ${n}회`);
      for (const [src, n] of Object.entries(probe.srcCount)) {
        if (n <= 2) continue;
        const idx = urls.findIndex((u) => src.endsWith(u) || u.endsWith(src) || src.includes(path.basename(u)));
        pageRepeat.push(`${idx >= 0 ? `사진 ${idx + 1}번` : "사진(번호 불명)"} ${n}회`);
      }
      for (const s of probe.sentences) sentenceRepeat.push(`"${s.text}" ${s.n}회`);
    }
    const root = page.locator("[data-pagzly-preview]");
    await root.screenshot({ path: path.join(OUT_DIR!, `full-${width}.png`) });
    // 첫 3화면 = 화면 높이 844 그대로 찍은 전체 캡처의 위쪽 844 × 3.
    // 뷰포트를 늘려 찍으면 화면 높이에 맞추는 히어로까지 같이 늘어나 실제와 달라진다.
    const full = path.join(OUT_DIR!, `full-${width}.png`);
    const meta = await sharp(full).metadata();
    await sharp(full)
      .extract({ left: 0, top: 0, width: meta.width!, height: Math.min(844 * 3, meta.height!) })
      .toFile(path.join(OUT_DIR!, `first3-${width}.png`));
    hydTotal += logs.hyd;
    errTotal += logs.err;
    await ctx.close();
  }
  {
    const { ctx, page, logs } = await openPreview(browser, p, 1280, true);
    await page.waitForTimeout(1000);
    hydTotal += logs.hyd;
    errTotal += logs.err;
    await ctx.close();
  }
  await browser.close();

  checks.push({
    id: "title-lines",
    name: "제목 줄 수 라이브↔export 같음(h1·h2, 390·750)",
    status: lineMismatch.length ? "실패" : "통과",
    detail: lineMismatch.length ? lineMismatch.join(" / ") : "모든 제목 줄 수 같음",
  });
  checks.push({
    id: "title-orphan",
    name: "제목 마지막 줄에 한 글자만 남지 않음",
    status: lineOrphan.length ? "주의" : "통과",
    detail: lineOrphan.length ? lineOrphan.join(" / ") : "고아 글자 없음",
  });
  checks.push({
    id: "image-repeat-page",
    name: "화면에서 같은 사진이 2회를 넘지 않음",
    status: pageRepeat.length ? "실패" : "통과",
    detail: pageRepeat.length ? pageRepeat.join(", ") : "모든 사진 2회 이하(120px 미만 썸네일 제외)",
    items: pageUses,
  });
  checks.push({
    id: "sentence-repeat",
    name: "같은 문장(15자 이상)이 본문에 3회 이상 반복되지 않음",
    status: sentenceRepeat.length ? "실패" : "통과",
    detail: sentenceRepeat.length ? sentenceRepeat.join(" / ") : "반복 없음",
  });
  checks.push({
    id: "hydration",
    name: "하이드레이션 경고 0(미리보기 390·750 + 편집 모드)",
    status: hydTotal ? "실패" : "통과",
    detail: `하이드레이션 ${hydTotal}건, 기타 콘솔 오류 ${errTotal}건`,
  });

  if (flag("--skip-parity")) {
    checks.push({ id: "type-parity", name: "라이브↔export 타입 패리티", status: "건너뜀", detail: "--skip-parity" });
  } else {
    checks.push(runParity(SESSION_PATH!, `audit-${path.basename(path.dirname(path.resolve(OUT_DIR!)))}-${path.basename(path.resolve(OUT_DIR!))}`));
  }

  const failed = checks.filter((c) => c.status === "실패").length;
  const summary = {
    session: SESSION_PATH,
    category: p.category,
    productName: p.productName,
    auditedAt: new Date().toISOString(),
    failed,
    checks,
    captures: ["full-390.png", "full-750.png", "first3-390.png", "first3-750.png"],
  };
  fs.writeFileSync(path.join(OUT_DIR!, "audit.json"), JSON.stringify(summary, null, 2));
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const md = [
    `# 생성 결과 점검 — ${p.productName || "(상품명 없음)"} (${p.category})`,
    "",
    `- 세션: \`${SESSION_PATH}\``,
    `- 결과: **${failed === 0 ? "통과" : `실패 ${failed}건`}**`,
    `- 캡처: full-390.png · full-750.png · first3-390.png · first3-750.png`,
    "",
    "| 점검 | 결과 | 내용 |",
    "|---|---|---|",
    ...checks.map((c) => `| ${esc(c.name)} | ${c.status} | ${esc(c.detail).slice(0, 400)} |`),
    "",
    "- 주의: 사람이 눈으로 확인할 항목(차단은 아님). 건너뜀: 해당 섹션이 없거나 옵션으로 끔.",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR!, "audit.md"), md + "\n");
  console.log(md);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/audit-session.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
