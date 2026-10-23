/**
 * 445차 1 — 라이브(React/Tailwind) 화면 캡처. 더미 환경값으로 띄운 `next dev`의 개발용 경로 /dev/detail-preview?capture=session 에
 * 합성 픽스처를 sessionStorage로 주입(저장 세션과 같은 모양)하고, 라이브 렌더러 루트([data-pz-typefloor])만 844px 화면 단위로 잘라 찍는다.
 * 서버는 이 스크립트가 띄우지 않는다(비밀값 없이 인라인 더미 값으로 직접 띄운 것을 쓴다):
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npx next dev -p 3100
 *   npx tsx scripts/live-capture.ts --server=http://localhost:3100 [--out=review/445-verify/live] [--widths=390,750] [--only=id,id] [--sheets]
 * 외부 네트워크 요청은 모두 막는다(사진·폰트는 같은 서버의 public/). --sheets가 있으면 export 캡처(eye-capture)와 같은 모양의 시트(3·2장 가로)도 만든다.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { corpus } from "./design-corpus";
import { openLive } from "./live-lib";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const SERVER = arg("server", "http://localhost:3100");
const OUT = arg("out", "review/445-verify/live");
const WIDTHS = arg("widths", "390").split(",").map(Number);
const ONLY = arg("only", "").split(",").filter(Boolean);
const SHEETS = process.argv.includes("--sheets");
const H = 844;

async function main() {
  const browser = await chromium.launch();
  for (const [id, file] of corpus({ only: ONLY })) {
    for (const W of WIDTHS) {
      const { page, errors, close } = await openLive(browser, SERVER, file, W);
      const box = (await page.evaluate(() => {
        const r = document.querySelector("[data-pz-typefloor]")!.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
      })) as { x: number; y: number; w: number; h: number };
      const dir = path.join(OUT, id, `w${W}`);
      fs.mkdirSync(dir, { recursive: true });
      const n = Math.ceil(box.h / H);
      const slices: Buffer[] = [];
      for (let i = 0; i < n; i++) slices.push(await page.screenshot({ clip: { x: box.x, y: box.y + i * H, width: box.w, height: Math.min(H, box.h - i * H) }, fullPage: true }));
      if (SHEETS) {
        const w = Math.round(box.w);
        const per = w <= 500 ? 3 : 2;
        for (let s = 0; s * per < slices.length; s++) {
          const group = slices.slice(s * per, s * per + per);
          await sharp({ create: { width: group.length * w + (group.length - 1) * 8, height: H, channels: 3, background: "#7a7a7a" } })
            .composite(group.map((input, k) => ({ input, left: k * (w + 8), top: 0 })))
            .png()
            .toFile(path.join(dir, `sheet-${String(s + 1).padStart(2, "0")}.png`));
        }
      }
      fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ rootWidth: box.w, rootHeight: Math.round(box.h), screens: n, consoleErrors: [...new Set(errors)].slice(0, 8) }));
      console.log(`${id} w${W}: 루트 ${Math.round(box.w)}×${Math.round(box.h)}px = ${n}화면${errors.length ? ` · 콘솔 오류 ${errors.length}건` : ""}`);
      await close();
    }
  }
  await browser.close();
}
void main();
