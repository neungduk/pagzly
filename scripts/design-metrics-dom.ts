/**
 * 439차 1-(c) — 428 디자인 지표의 정식 측정(DOM 기반). 438차 대조에서 이미지 처리 지표(scripts/_428-metrics.ts)는
 * 사진·질감을 "큰 글자 줄"로 잘못 세는 노이즈가 커서 참고용으로 내리고, 이 스크립트를 기준으로 쓴다.
 *   npx tsx scripts/design-metrics-dom.ts [id...]      (dev 서버 불필요 — export HTML을 브라우저에 직접 올려 390폭으로 잰다)
 *   OUT=경로.tsv 로 결과 저장. 기준 위반이 있으면 종료 코드 1.
 *
 * 지표(390×844 한 화면 기준)
 *  - 큰 글줄/화면: 글자 크기 ≥28px인 글 줄 수 ÷ 화면 수. 기준 ≤1.5 — 큰 제목이 화면마다 둘 이상이면 "모든 게 강조"가 되어 위계가 사라진다.
 *  - 면 전환: 최상위 구간(section)의 바탕색이 바로 앞 구간과 다른 횟수(사진 면은 건너뜀). 참고값.
 *  - 명암 반전: 밝은 면 ↔ 어두운 면(상대 휘도 0.18 기준)으로 바뀐 횟수. 기준 ≤6 — 반전이 잦으면 눈이 쉬지 못하고 조각난 느낌이 난다.
 * 라이브와 export는 마크업이 같아(패리티 0) export로 잰 값이 라이브와 같다. 사진은 기다리지 않는다(크기는 aspect-ratio로 고정).
 */
import fs from "node:fs";
import { chromium } from "playwright";

export const BIG_LINES_PER_SCREEN_MAX = 1.5;
export const FLIPS_MAX = 6;

export type DomMetrics = { screens: number; big: number; bigPerScreen: number; all: number; flips: number; padOff: number; padJumps: number; gapBig: number; gapUneven: number; gapBigPairs?: string[]; headingThin: number; headingKinds: number; headingKindList: string; headingInversions: number };

/**
 * 440차 6 — 측정 함수 분리(린터 R5·R11이 같은 값을 쓴다). 페이지마다 export HTML을 390×844에 올려 잰다. 사진·폰트 등 외부 요청은 막는다.
 */
export async function measureDomPages(pages: Array<[string, string]>): Promise<Map<string, DomMetrics>> {
  const out = new Map<string, DomMetrics>();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // tsx가 함수 이름 보조 함수(__name)를 넣어 브라우저 쪽에서 없다고 나는 것을 막는다
  await page.addInitScript({ content: "window.__name = (f) => f;" });
  await page.route("**/*", (r) => (r.request().resourceType() === "document" ? r.continue() : r.abort()));
  for (const [id, html] of pages) {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate("window.__name = (f) => f");
    const m = await page.evaluate(() => {
      const H = document.documentElement.scrollHeight;
      let big = 0;
      document.querySelectorAll("body *").forEach((n) => {
        const e = n as HTMLElement;
        if (!Array.from(e.childNodes).some((c) => c.nodeType === 3 && (c.textContent ?? "").trim())) return;
        const cs = getComputedStyle(e);
        const fs = parseFloat(cs.fontSize);
        if (fs < 28 || cs.visibility === "hidden" || cs.display === "none") return;
        const lh = parseFloat(cs.lineHeight) || fs * 1.2;
        const h = e.getBoundingClientRect().height;
        if (h > 0) big += Math.max(1, Math.round(h / lh));
      });
      const lum = (c: string) => {
        const v = c.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
        const [r, g, bb] = v.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * bb!;
      };
      // 최상위 구간: 다른 section 안에 들어 있지 않은 section
      const tops = Array.from(document.querySelectorAll("section")).filter((s) => !s.parentElement?.closest("section"));
      const faces: string[] = [];
      for (const w of tops) {
        const wr = w.getBoundingClientRect();
        if (wr.height < 40) continue;
        let face = "";
        for (const n of [w, ...Array.from(w.querySelectorAll("*"))] as HTMLElement[]) {
          const r = n.getBoundingClientRect();
          if (r.width < wr.width * 0.9 || r.height < wr.height * 0.5) continue;
          if (n.tagName === "IMG") { face = "photo"; break; }
          const c = getComputedStyle(n);
          if (c.backgroundColor !== "rgba(0, 0, 0, 0)") { face = c.backgroundColor; break; }
          if (c.backgroundImage.startsWith("linear-gradient") || c.backgroundImage.startsWith("radial-gradient")) { const first = c.backgroundImage.match(/rgba?\([^)]*\)/)?.[0]; if (first) { face = first; break; } }
        }
        faces.push(face || "rgb(255, 255, 255)");
      }
      let prev = "", prevTone = "", all = 0, flips = 0;
      for (const c of faces) {
        if (c === "photo") continue;
        const tone = lum(c) < 0.18 ? "dark" : "light";
        if (prev && c !== prev) all += 1;
        if (prevTone && tone !== prevTone) flips += 1;
        prev = c;
        prevTone = tone;
      }
      // 441차 R16 — 섹션 제목 위계: 한글 포함·숫자 위주 아님·18~40px 글(큰 숫자·가격 제외). 섹션 첫 제목보다 2px 넘게 큰 뒤 제목은 위계 역전
      const kinds = new Set<string>();
      let headingThin = 0, headingInversions = 0;
      for (const s of tops) {
        if (s.classList.contains("pagzly-hero") || s.querySelector(".pagzly-hero")) continue;
        const hs = (Array.from(s.querySelectorAll("h2,h3,p")) as HTMLElement[]).filter((e) => {
          const t = (e.textContent ?? "").trim();
          if (!t || t.length > 40 || e.closest('[aria-hidden="true"],[data-pz-deco],[data-hl]')) return false;
          const fs0 = parseFloat(getComputedStyle(e).fontSize);
          return fs0 >= 18 && fs0 <= 40 && /[가-힣]/.test(t) && (t.match(/[0-9₩,.%]/g) ?? []).length < t.length / 2;
        });
        const first = hs.find((e) => /^H[23]$/.test(e.tagName)) ?? hs[0];
        for (const h of hs) {
          const cs = getComputedStyle(h);
          const fsz = parseFloat(cs.fontSize);
          const w = Number(cs.fontWeight);
          if (w < 600) headingThin += 1;
          // 인용·큰 문구(story 계열 display 900)는 제목 체계 밖이라 종류에서 뺀다
          if (!h.closest('[data-pz-v4^="story"]')) kinds.add(`${w}/${fsz >= 26 ? "L" : fsz >= 20 ? "M" : "S"}`);
          if (first && h !== first && fsz > parseFloat(getComputedStyle(first).fontSize) + 2 && !h.closest('[data-pz-v4^="story"]')) headingInversions += 1;
        }
      }
      // 441차 R17 — 세로 리듬: v4·임팩트 섹션 위·아래 여백이 3단(32·48·64, 사진 풀블리드 0)을 벗어난 수, 이웃 섹션 여백이 2배 넘게 급변한 수
      const TIERS = [0, 32, 48, 64];
      // 443차 R17 셋째 조건 — 한 화면 안 요소 간격 불균형(스크린샷 없이 DOM 측정). 이웃 섹션 사이 빈 간격 = 앞 섹션 아래 여백 + 뒤 섹션 위 여백(두 여백은 겹치지 않고 더해진다).
      //  · gapBig: 면 색이 같은 이웃(경계로 구분되지 않아 빈 칸처럼 보이는 쌍) 사이 빈 간격이 96px 초과 — 여백 스케일의 가장 큰 두 단(64+32)까지는 구획으로 읽히고, 그보다 크면(예: 배송 안내 64 + AI 안내 48 = 112) 빈 칸으로 읽힌다
      //  · gapUneven: 같은 화면(844px) 구간 안에 (양쪽 여백이 모두 8px 초과인 — 가장자리까지 닿는 사진·배너와 맞닿은 쪽은 제외) 간격이 둘 이상이고 가장 큰 것이 가장 작은 것의 2배 초과 — 441차 급변(padJumps)과 같은 2배 기준
      const faceOf = (w: Element): string => {
        const wr = w.getBoundingClientRect();
        for (const n of [w, ...Array.from(w.querySelectorAll("*"))] as HTMLElement[]) {
          const r = n.getBoundingClientRect();
          if (r.width < wr.width * 0.9 || r.height < wr.height * 0.5) continue;
          if (n.tagName === "IMG") return "photo";
          const c = getComputedStyle(n);
          if (c.backgroundColor !== "rgba(0, 0, 0, 0)") return c.backgroundColor;
          if (c.backgroundImage.startsWith("linear-gradient") || c.backgroundImage.startsWith("radial-gradient")) { const first = c.backgroundImage.match(/rgba?\([^)]*\)/)?.[0]; if (first) return first; }
        }
        return "rgb(255, 255, 255)";
      };
      let gapBig = 0;
      const gapBigPairs: string[] = [];
      const nameOf = (e: Element) => (e.getAttribute("data-pz-v4") ?? e.getAttribute("data-pz-impact") ?? e.className ?? "").toString().split(" ")[0] || e.tagName.toLowerCase();
      const gapsByScreen = new Map<number, number[]>();
      let prevRow: { pb: number; face: string; name: string } | null = null;
      for (const s of tops) {
        if (s.classList.contains("pagzly-hero") || s.querySelector(".pagzly-hero") || s.getBoundingClientRect().height < 40) { prevRow = null; continue; }
        const cs0 = getComputedStyle(s);
        const row = { pt: Math.round(parseFloat(cs0.paddingTop)), pb: Math.round(parseFloat(cs0.paddingBottom)), face: faceOf(s), name: nameOf(s) };
        if (prevRow) {
          const gap = prevRow.pb + row.pt;
          if (row.face === prevRow.face && row.face !== "photo" && gap > 96) { gapBig += 1; gapBigPairs.push(`${prevRow.name}(${prevRow.pb}) → ${row.name}(${row.pt}) = ${gap} [${row.face}]`); }
          // 한쪽이 가장자리까지 닿는 사진·배너(여백 8px 이하)와 붙은 쪽은 빈 간격이 아니라 맞닿음이라 불균형 비교에서 뺀다(444차)
          if (prevRow.pb > 8 && row.pt > 8) {
            const k = Math.floor((s.getBoundingClientRect().top + window.scrollY) / 844);
            gapsByScreen.set(k, [...(gapsByScreen.get(k) ?? []), gap]);
          }
        }
        prevRow = row;
      }
      let gapUneven = 0;
      for (const g of gapsByScreen.values()) if (g.length >= 2 && Math.max(...g) / Math.min(...g) > 2) gapUneven += 1;
      let padOff = 0, padJumps = 0, prevPad = -1;
      for (const s of tops) {
        if (s.classList.contains("pagzly-hero") || s.querySelector(".pagzly-hero")) { prevPad = -1; continue; }
        const cs = getComputedStyle(s);
        const pt = Math.round(parseFloat(cs.paddingTop)), pb = Math.round(parseFloat(cs.paddingBottom));
        // 8px 이하는 사진 테두리용 가장자리 값(0단)으로 본다
        // 442차 — 이전 섹션(표·FAQ·주의·구매 카드 등)까지 전부 검사(441차는 임팩트·v4만)
        for (const v of [pt, pb]) if (v > 8 && !TIERS.some((t) => Math.abs(t - v) <= 1)) padOff += 1;
        // 8px 이하(사진이 면에 붙는 가장자리)는 급변으로 보지 않는다
        if (prevPad > 8 && pt > 8 && Math.max(prevPad, pt) / Math.min(prevPad, pt) > 2) padJumps += 1;
        prevPad = pb;
      }
      return { screens: H / 844, big, all, flips, padOff, padJumps, gapBig, gapUneven, gapBigPairs, headingThin, headingKinds: kinds.size, headingKindList: [...kinds].sort().join(","), headingInversions };
    });
    out.set(id, { ...m, bigPerScreen: m.big / m.screens });
  }
  await b.close();
  return out;
}

async function main() {
  const { corpus, exportHtmlOf } = await import("./design-corpus");
  const want = process.argv.slice(2);
  const files = corpus({ only: want });
  const metrics = await measureDomPages(files.map(([id, file]) => [id, exportHtmlOf(file)]));
  const rows: string[] = ["id\t화면수\t큰글줄/화면\t면 전환\t명암 반전\t판정"];
  let bad = 0;
  for (const [id] of files) {
    const m = metrics.get(id)!;
    const ok = m.bigPerScreen <= BIG_LINES_PER_SCREEN_MAX && m.flips <= FLIPS_MAX;
    if (!ok) bad += 1;
    rows.push([id, m.screens.toFixed(1), m.bigPerScreen.toFixed(2), m.all, m.flips, ok ? "통과" : "위반"].join("\t"));
  }
  console.log(rows.join("\n"));
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, rows.join("\n") + "\n");
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && /design-metrics-dom/.test(process.argv[1])) void main();
