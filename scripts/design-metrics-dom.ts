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

async function main() {
  const { corpus, exportHtmlOf } = await import("./design-corpus");
  const want = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // tsx가 함수 이름 보조 함수(__name)를 넣어 브라우저 쪽에서 없다고 나는 것을 막는다
  await page.addInitScript({ content: "window.__name = (f) => f;" });
  await page.route("**/*", (r) => (r.request().resourceType() === "document" ? r.continue() : r.abort()));
  const rows: string[] = ["id\t화면수\t큰글줄/화면\t면 전환\t명암 반전\t판정"];
  let bad = 0;
  for (const [id, file] of corpus({ only: want })) {
    await page.setContent(exportHtmlOf(file), { waitUntil: "domcontentloaded" });
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
      return { screens: H / 844, big, all, flips };
    });
    const per = m.big / m.screens;
    const ok = per <= BIG_LINES_PER_SCREEN_MAX && m.flips <= FLIPS_MAX;
    if (!ok) bad += 1;
    rows.push([id, m.screens.toFixed(1), per.toFixed(2), m.all, m.flips, ok ? "통과" : "위반"].join("\t"));
  }
  await b.close();
  console.log(rows.join("\n"));
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, rows.join("\n") + "\n");
  process.exit(bad ? 1 : 0);
}

void main();
