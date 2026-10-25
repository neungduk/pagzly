/**
 * 449차 3 — 라이브 퍼징. 퍼징 사례(시드 448, 기본 200개)를 더미 환경 `next dev`의 /dev/detail-preview?capture=session 에 sessionStorage로 주입해
 * 라이브 렌더러(React/Tailwind) 결과를 320·360·390·750폭에서 검사한다: 예외(페이지 오류·콘솔 error)·가로 넘침·잘린 글자·빈 섹션 껍데기·R7(글자 대비, 픽셀 기준, 390폭).
 * 서버는 이 스크립트가 띄우지 않는다:
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npx next dev -p 3100
 *   npx tsx scripts/fuzz-live.ts --server=http://localhost:3100 [--n=200] [--widths=320,360,390,750] [--workers=4] [--out=review/449-verify/fuzz-live.md] [--json=경로] [--only=fz003]
 * export 결과(scripts/fuzz-check.ts --json)와 같은 종류 표로 비교한다(--export-json=경로).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, type Browser } from "playwright";
import { baseFixtures, fuzzCases, type FuzzCase } from "./fuzz-sessions";
import { presetOfSession, SESSION_KEY } from "./live-lib";
import { PROBE, lum, ratioOf, type TextProbe } from "./photo-legibility";

export type LiveViolation = { kind: string; id: string; detail: string };
export const LIVE_KINDS = ["예외", "가로 넘침", "잘린 글자", "빈 섹션 껍데기", "R7 대비"] as const;

const DOM = `(() => {
  const root = document.querySelector('[data-pz-typefloor]') || document.body;
  const over = Math.max(root.scrollWidth - root.clientWidth, Math.round(root.getBoundingClientRect().right) - document.documentElement.clientWidth);
  const clipped = [];
  for (const e of root.querySelectorAll('*')) {
    const cs = getComputedStyle(e);
    if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && (e.textContent || '').trim().length > 1 && cs.textOverflow !== 'ellipsis' && cs.display !== '-webkit-box' && (cs.webkitLineClamp === 'none' || !cs.webkitLineClamp) && !e.querySelector('img,svg,video') && !e.closest('[aria-hidden="true"]') && cs.position !== 'absolute') clipped.push((e.textContent || '').trim().slice(0, 20));
  }
  const empties = [];
  for (const w of root.querySelectorAll('[data-section-index]')) {
    const t = (w.textContent || '').trim(); const media = w.querySelector('img,svg,video,[style*="background-image"]');
    const sec = w.querySelector('section') || w; if (sec.hasAttribute('data-info')) continue;
    const heads = w.querySelectorAll('h1,h2,h3'); const ht = [...heads].map((h) => (h.textContent || '').trim()).join('');
    if (w.getBoundingClientRect().height > 8 && !t && !media) empties.push('내용 0');
    else if (heads.length && !media && t.replace(/\\s/g, '') === ht.replace(/\\s/g, '') && w.getBoundingClientRect().height > 60 && !sec.querySelector('[data-pz-impact]') && !w.querySelector('[data-pz-impact]')) empties.push('제목만:' + ht.slice(0, 14));
  }
  return { over, clipped: clipped.slice(0, 4), empties, textLen: (document.body.innerText || '').trim().length };
})()`;

export async function openCase(browser: Browser, server: string, c: FuzzCase, W: number): Promise<{ page: import("playwright").Page; errors: string[]; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(`try{window.sessionStorage.setItem(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(JSON.stringify(presetOfSession(c.session)))})}catch(e){}; window.__name = (f) => f;`);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|favicon|hydrated but some attributes|hydration/i.test(m.text())) errors.push(m.text().slice(0, 700)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 140)}`));
  await page.route("**/*", (r) => (new URL(r.request().url()).origin === new URL(server).origin ? r.continue() : r.abort()));
  await page.goto(`${server}/dev/detail-preview?capture=session`, { waitUntil: "load" });
  await page.locator("[data-pz-typefloor]").first().waitFor({ state: "attached", timeout: 60000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}[data-pagzly-preview]{max-width:none!important;border:0!important;box-shadow:none!important}[data-scroll-reveal]{transform:none!important;opacity:1!important;translate:none!important;scale:none!important}" });
  await page.evaluate("Promise.all(Array.from(document.images).map((i) => { i.loading = 'eager'; return i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = () => r(1); }); }))");
  await page.waitForTimeout(350);
  return { page, errors, close: () => ctx.close() };
}

export async function checkLive(browser: Browser, server: string, c: FuzzCase, widths: number[]): Promise<LiveViolation[]> {
  const v: LiveViolation[] = [];
  const add = (kind: string, detail: string) => v.push({ kind, id: c.id, detail });
  for (const W of widths) {
    let L: Awaited<ReturnType<typeof openCase>> | null = null;
    try {
      L = await openCase(browser, server, c, W);
      const r = (await L.page.evaluate(DOM)) as { over: number; clipped: string[]; empties: string[]; textLen: number };
      if (r.over > 0) add("가로 넘침", `${W}px +${r.over}`);
      if (r.clipped.length) add("잘린 글자", `${W}px «${r.clipped.join("», «")}»`);
      for (const e of r.empties) add("빈 섹션 껍데기", `${W}px ${e}`);
      for (const e of L.errors.slice(0, 2)) add("예외", `${W}px ${e}`);
      if (W === 390) {
        const res = await contrastPage(L.page);
        const bad = res.length; const sample = res[0] ? `«${res[0].text}» ${res[0].px}px ${res[0].ratio.toFixed(2)}<${res[0].need}` : "";
        if (bad) add("R7 대비", `${W}px ${bad}곳 ${sample}`);
      }
    } catch (e) {
      add("예외", `${W}px 열기 실패: ${e instanceof Error ? e.message.slice(0, 100) : String(e)}`);
    } finally { await L?.close(); }
  }
  return v;
}

/** 페이지(라이브 렌더러 루트 또는 export 문서)의 모든 글자를 픽셀 기준 대비로 검사 — 글자를 투명하게 한 재캡처로 글자 상자 뒤 실제 배경(5·95백분위) */
type Bad = { text: string; px: number; ratio: number; need: number; src?: string };

/**
 * 452차 1 — 측정 안정화: 글꼴 로드·이미지 decode 완료를 기다리고, 문서 높이와 글자 상자 표본이 두 프레임 연속 같아질 때까지 기다린다(최대 ~3초).
 * 위반이 나오면 안정화를 한 번 더 한 뒤 재측정하고, **두 번 다 위반인 것만** 판정한다(레이아웃 이동으로 인한 간헐 오탐 제거).
 */
export async function settle(page: import("playwright").Page): Promise<number> {
  return (await page.evaluate(`(async () => {
    try { await document.fonts.ready; } catch (e) {}
    const cap = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 1200))]);\n    await cap(Promise.all(Array.from(document.images).map((i) => (i.decode ? i.decode().catch(() => 0) : 0))));\n    await cap(document.fonts.ready.catch(() => 0));
    const sig = () => { const els = Array.from(document.querySelectorAll('h1,h2,h3,p,span,li,td,th')).filter((_, k) => k % 7 === 0).slice(0, 160); return document.documentElement.scrollHeight + ':' + els.map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.top + scrollY) + ',' + Math.round(r.left); }).join(';'); };
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    let prev = sig(); let same = 0; let n = 0;
    while (same < 2 && n < 30) { await frame(); await new Promise((r) => setTimeout(r, 60)); const cur = sig(); if (cur === prev) same += 1; else { same = 0; prev = cur; } n += 1; }
    return n;
  })()`)) as number;
}

export async function contrastPage(page: import("playwright").Page): Promise<Bad[]> {
  await settle(page);
  const first = await contrastPageOnce(page);
  if (!first.length) return first;
  await settle(page);
  const second = await contrastPageOnce(page);
  return first.filter((a) => second.some((b) => b.text === a.text && b.px === a.px));
}

async function contrastPageOnce(page: import("playwright").Page): Promise<Bad[]> {
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(100);
  const all = (await page.evaluate(ALL_TEXT)) as TextProbe[];
  const hideTag = await page.addStyleTag({ content: "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}svg text,svg tspan{fill:transparent!important;stroke:none!important}" });
  // 451차 — 글자 숨김 뒤 레이아웃이 달라질 수 있어(지연 이미지·폰트) 상자 좌표를 숨긴 상태에서 다시 읽는다(같은 순서·같은 글자일 때만 교체). 스크린샷 직전에 한 번 더 안정화
  const vp = page.viewportSize()!;
  const full = await page.evaluate("Math.ceil(document.documentElement.scrollHeight)") as number;
  await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(full, vp.height), 16000) });
  await page.waitForTimeout(250);
  const again = (await page.evaluate(ALL_TEXT)) as TextProbe[];
  if (again.length === all.length && again.every((q, i) => q.text === all[i]!.text)) again.forEach((q, i) => { const o = all[i]!; o.x = q.x; o.y = q.y; o.w = q.w; o.h = q.h; });
  const buf = await page.screenshot({ fullPage: true });
  await page.setViewportSize(vp);
  await hideTag.evaluate((e) => e.remove());
  const im = sharp(buf);
  const meta = await im.metadata();
  const raw = await im.ensureAlpha().raw().toBuffer();
  const bad: Array<{ text: string; px: number; ratio: number; need: number; src?: string }> = [];
  for (const p of all) {
    const x0 = Math.max(0, Math.floor(p.x)), y0 = Math.max(0, Math.floor(p.y)), x1 = Math.min(meta.width!, Math.ceil(p.x + p.w)), y1 = Math.min(meta.height!, Math.ceil(p.y + p.h));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const ls: number[] = []; let sr = 0, sg = 0, sb = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * meta.width! + x) * 4; ls.push(lum(raw[i]!, raw[i + 1]!, raw[i + 2]!)); sr += raw[i]!; sg += raw[i + 1]!; sb += raw[i + 2]!; }
    ls.sort((a, b) => a - b);
    const n = ls.length, a = p.fg[3];
    const mix = (cc: number, avg: number) => cc * a + avg * (1 - a);
    const fl = a >= 0.999 ? lum(p.fg[0], p.fg[1], p.fg[2]) : lum(mix(p.fg[0], sr / n), mix(p.fg[1], sg / n), mix(p.fg[2], sb / n));
    const med = ls[Math.floor(n * 0.5)]!;
    const need = p.px >= 24 || (p.px >= 18.66 && p.weight >= 700) ? 3 : 4.5;
    // 글자 상자 가장자리(필·막대 모서리)가 오탐을 만들어 작은 글자는 90·10, 큰 글자는 75·25백분위(큰 글자는 상자가 글줄보다 훨씬 커서 가장자리 비중이 큼)
    const hi = need === 3 ? 0.75 : 0.9;
    const ratio = ratioOf(fl, fl >= med ? ls[Math.min(n - 1, Math.floor(n * hi))]! : ls[Math.floor(n * (1 - hi))]!);
    if (ratio < need) bad.push({ text: p.text, px: p.px, ratio, need, src: `${p.layout}#fg=${p.fg.map((v) => Math.round(v * 100) / 100).join(',')}#bg=${med.toFixed(3)}` });
  }
  return bad.sort((a, b) => a.ratio - b.ratio);
}

/** 페이지의 모든 보이는 글자(사진 여부와 무관) */
const ALL_TEXT = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const out = []; const w = document.createTreeWalker(document.querySelector('[data-pz-typefloor]') || document.body, NodeFilter.SHOW_TEXT); const seen = new Set();
  while (w.nextNode()) { const n = w.currentNode; const text = (n.textContent || '').trim(); if (!text) continue; const e = n.parentElement; if (!e || seen.has(e) || ['SCRIPT','STYLE','NOSCRIPT'].includes(e.tagName) || e.closest('nextjs-portal,[data-pagzly-bar],nav')) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0 || e.closest('[aria-hidden="true"]') || e.closest('[data-hero-fold]')) continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') ? e.getBoundingClientRect() : r.getBoundingClientRect(); if (b.width < 4 || b.height < 4) continue; let clippedOut = false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const ac = getComputedStyle(a); if (ac.overflowX !== 'visible' || ac.overflowY !== 'visible') { const ar = a.getBoundingClientRect(); if (b.top >= ar.bottom - 1 || b.bottom <= ar.top + 1 || b.left >= ar.right - 1 || b.right <= ar.left + 1) { clippedOut = true; break; } } } if (clippedOut) continue; seen.add(e);
    const m = rgba(e instanceof SVGElement ? (cs.fill && cs.fill !== 'none' ? cs.fill : cs.color) : cs.color);
    out.push({ x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height, text: text.slice(0, 20), fg: [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])], px: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400, layout: (e.getAttribute('class') || '').slice(0, 60) + '|' + (e.getAttribute('style') || '').match(/(?:color|opacity)[^;]*/g)?.join(';').slice(0, 70) + '|' + e.tagName + '>' + (e.parentElement ? e.parentElement.tagName + '.' + (e.parentElement.getAttribute('class') || '').slice(0, 30) : '') }); }
  return out;
})()`;

export async function runLive(opts: { server: string; n: number; widths: number[]; workers: number; only?: string[]; subset?: number; base?: boolean }): Promise<{ cases: FuzzCase[]; violations: LiveViolation[] }> {
  const all = opts.base ? baseFixtures().map(([id, f]) => ({ id: `base-${id.slice(3)}`, base: id, ops: ["원본"], session: JSON.parse(fs.readFileSync(f, "utf8")) as FuzzCase["session"] })) : fuzzCases(opts.n);
  const cases = opts.only?.length ? all.filter((c) => opts.only!.some((o) => c.id.startsWith(o))) : opts.subset ? all.slice(0, opts.subset) : all;
  const browser = await chromium.launch();
  const violations: LiveViolation[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: opts.workers }, async () => { for (;;) { const i = next++; if (i >= cases.length) return; violations.push(...(await checkLive(browser, opts.server, cases[i]!, opts.widths))); } }));
  await browser.close();
  return { cases, violations: violations.sort((a, b) => a.id.localeCompare(b.id)) };
}

export function liveReport(cases: FuzzCase[], vs: LiveViolation[], exportVs?: Array<{ kind: string; id: string }>): string {
  const exp = (k: string) => (exportVs ?? []).filter((x) => x.kind === k);
  const map: Record<string, string> = { "예외": "예외", "가로 넘침": "가로 넘침", "잘린 글자": "잘린 글자", "빈 섹션 껍데기": "빈 섹션 껍데기", "R7 대비": "린트 error" };
  const lines = ["# 라이브 퍼징 보고 (449차)", "", `사례 ${cases.length}개(시드 448) · 라이브 위반 ${vs.length}건 · 위반 사례 ${new Set(vs.map((x) => x.id)).size}개`, "", "| 종류 | 라이브 건수 | 라이브 사례 | export 건수(참고) | export 사례 |", "|---|---|---|---|---|"];
  for (const k of LIVE_KINDS) { const xs = vs.filter((x) => x.kind === k); const ex = exportVs ? exp(map[k]!) : []; lines.push(`| ${k} | ${xs.length} | ${new Set(xs.map((x) => x.id)).size} | ${exportVs ? ex.length : "-"} | ${exportVs ? new Set(ex.map((x) => x.id)).size : "-"} |`); }
  lines.push("", "## 종류별 대표 재현(최대 3개)");
  for (const k of LIVE_KINDS) {
    const xs = vs.filter((x) => x.kind === k); if (!xs.length) continue;
    lines.push(`### ${k}`); const seen = new Set<string>();
    for (const x of xs) { if (seen.size >= 3) break; if (seen.has(x.id)) continue; seen.add(x.id); lines.push(`- \`${x.id}\` (${cases.find((c) => c.id === x.id)!.ops.join(" + ")}): ${x.detail}`); }
  }
  return lines.join("\n") + "\n";
}

if (/fuzz-live\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void runLive({ server: arg("server", "http://localhost:3100"), n: Number(arg("n", "200")), widths: arg("widths", "320,360,390,750").split(",").map(Number), workers: Number(arg("workers", "4")), subset: Number(arg("subset", "0")) || undefined, only: arg("only", "").split(",").filter(Boolean), base: process.argv.includes("--base") }).then(({ cases, violations }) => {
    const out = arg("out", "review/449-verify/fuzz-live.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const exportVs = arg("export-json", "") ? (JSON.parse(fs.readFileSync(arg("export-json", ""), "utf8")) as Array<{ kind: string; id: string }>) : undefined;
    const md = liveReport(cases, violations, exportVs);
    fs.writeFileSync(out, md);
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(violations));
    console.log(md);
    const blank = new Set(cases.filter((c) => c.ops.includes("제품명 공백")).map((c) => c.id));
    process.exit(violations.some((v) => (v.kind === "가로 넘침" || v.kind === "잘린 글자" || v.kind === "빈 섹션 껍데기") && !blank.has(v.id)) ? 1 : 0);
  });
}
