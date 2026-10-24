/**
 * 448차 3 — PNG 다운로드 경로 대조. 앱이 결과 화면에서 쓰는 모듈(lib/capture-detail-png.ts: prepareCaptureRoot → captureDetailToPngBlobs, html-to-image 기반)을
 * 개발 미리보기 페이지(/dev/detail-preview?capture=session, 더미 환경 next dev)에서 그대로 호출하고, 같은 폭(640 CSS px = CAPTURE_DESIGN_WIDTH_PX)에서 찍은
 * 브라우저 화면(요소 스크린샷)과 구간별로 비교한다: 평균 색 차이(0~255)·구조 상관(회색조 상관계수)·구간 시트.
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npx next dev -p 3100
 *   npx tsx scripts/png-compare.ts --server=http://localhost:3100 [--out=review/448-verify/png] [--only=id,id] [--target=860]
 * 외부 네트워크·유료 호출 없음(openLive가 서버 밖 요청을 모두 막는다).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { corpus } from "./design-corpus";
import { openLive } from "./live-lib";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const SERVER = arg("server", "http://localhost:3100");
const OUT = arg("out", "review/448-verify/png");
const ONLY = arg("only", "fx-skincare-serum,fx-tech-keyboard,fx-fashion-dress-floral,fx-food-snack,fx-living-storage").split(",").filter(Boolean);
const TARGET = Number(arg("target", "860"));
const DESIGN_W = 640;
const BAND = 420; // 출력 기준 구간 높이(px)

type Band = { y: number; mean: number; corr: number };

async function gray(buf: Buffer, w: number, h: number): Promise<Float32Array> {
  const raw = await sharp(buf).resize(w, h, { fit: "fill" }).greyscale().raw().toBuffer();
  return Float32Array.from(raw);
}
function corr(a: Float32Array, b: Float32Array): number {
  let ma = 0, mb = 0;
  for (let i = 0; i < a.length; i += 1) { ma += a[i]!; mb += b[i]!; }
  ma /= a.length; mb /= b.length;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i += 1) { const x = a[i]! - ma, y = b[i]! - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa === 0 || sbb === 0 ? (saa === sbb ? 1 : 0) : sab / Math.sqrt(saa * sbb);
}

export async function compareImages(app: Buffer, shot: Buffer, target: number): Promise<{ bands: Band[]; mean: number; appH: number; shotH: number }> {
  const am = await sharp(app).metadata();
  const sm = await sharp(shot).metadata();
  const shotScaled = await sharp(shot).resize({ width: target }).png().toBuffer();
  const ssm = await sharp(shotScaled).metadata();
  const H = Math.min(am.height!, ssm.height!);
  const bands: Band[] = [];
  for (let y = 0; y < H; y += BAND) {
    const h = Math.min(BAND, H - y);
    const a = await sharp(app).extract({ left: 0, top: y, width: target, height: h }).png().toBuffer();
    const b = await sharp(shotScaled).extract({ left: 0, top: y, width: target, height: h }).png().toBuffer();
    const ra = await sharp(a).resize(target / 4 | 0, Math.max(1, h / 4 | 0), { fit: "fill" }).removeAlpha().raw().toBuffer();
    const rb = await sharp(b).resize(target / 4 | 0, Math.max(1, h / 4 | 0), { fit: "fill" }).removeAlpha().raw().toBuffer();
    let s = 0;
    for (let i = 0; i < ra.length; i += 1) s += Math.abs(ra[i]! - rb[i]!);
    bands.push({ y, mean: s / ra.length, corr: corr(await gray(a, target / 4 | 0, Math.max(1, h / 4 | 0)), await gray(b, target / 4 | 0, Math.max(1, h / 4 | 0))) });
  }
  return { bands, mean: bands.reduce((s, b) => s + b.mean, 0) / Math.max(1, bands.length), appH: am.height!, shotH: sm.height! };
}

async function main() {
  const files = new Map(corpus({ only: ONLY }));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const lines = ["# PNG 다운로드 경로 대조 (448차)", "", `앱 모듈(captureDetailToPngBlobs, 출력 폭 ${TARGET}px, 화면 ${DESIGN_W}px 기준) vs 같은 폭 브라우저 요소 스크린샷. 구간 ${BAND}px 단위: 평균 색 차이(0~255, 작을수록 같음) · 구조 상관(1에 가까울수록 같음).`, "", "| 픽스처 | PNG 장수 | PNG 크기 | 평균 색 차이 | 최악 구간(y: 차이 / 상관) | 상관 < 0.9 구간 수 |", "|---|---|---|---|---|---|"];
  for (const [id, file] of files) {
    const live = await openLive(browser, SERVER, file, DESIGN_W);
    try {
      const shot = await live.page.locator("[data-pz-typefloor]").first().screenshot();
      const ok = await live.page.evaluate("typeof window.__pzCapture === 'object'");
      if (!ok) throw new Error("__pzCapture 없음(개발 미리보기 페이지가 아님)");
      const parts = (await live.page.evaluate(`(async () => {
        const root = document.querySelector('[data-pz-typefloor]');
        window.__pzCapture.freezeScrollRevealAnimations(root);
        await new Promise((r) => setTimeout(r, 80));
        const restore = await window.__pzCapture.prepareCaptureRoot(root);
        try {
          const blobs = await window.__pzCapture.captureDetailToPngBlobs(root, ${TARGET}, 14000);
          return await Promise.all(blobs.map((b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(b); })));
        } finally { restore(); window.__pzCapture.unfreezeScrollRevealAnimations(root); }
      })()`)) as string[];
      const bufs = parts.map((d) => Buffer.from(d.split(",")[1]!, "base64"));
      const metas = await Promise.all(bufs.map((b) => sharp(b).metadata()));
      const totalH = metas.reduce((s, m) => s + m.height!, 0);
      let y = 0;
      const stacked = await sharp({ create: { width: TARGET, height: totalH, channels: 3, background: "#FAF8F3" } }).composite(await Promise.all(bufs.map(async (b, i) => { const top = y; y += metas[i]!.height!; return { input: await sharp(b).removeAlpha().png().toBuffer(), left: 0, top }; }))).png().toBuffer();
      fs.writeFileSync(path.join(OUT, `${id}-app.png`), await sharp(stacked).resize({ width: 430 }).png().toBuffer());
      const r = await compareImages(stacked, shot, TARGET);
      const worst = [...r.bands].sort((a, b) => b.mean - a.mean).slice(0, 3);
      const lowCorr = r.bands.filter((b) => b.corr < 0.9);
      lines.push(`| ${id} | ${parts.length} | ${TARGET}×${totalH} (화면 ${DESIGN_W}×${r.shotH}) | ${r.mean.toFixed(1)} | ${worst.map((b) => `${b.y}: ${b.mean.toFixed(1)} / ${b.corr.toFixed(2)}`).join(" · ")} | ${lowCorr.length}/${r.bands.length} |`);
      // 시트: 가장 다른 구간 3개를 앱 PNG | 화면 | 차이로
      const shotScaled = await sharp(shot).resize({ width: TARGET }).png().toBuffer();
      const tiles: Array<{ input: Buffer; left: number; top: number }> = [];
      let row = 0;
      for (const w of worst) {
        const h = Math.min(BAND, totalH - w.y);
        const a = await sharp(stacked).extract({ left: 0, top: w.y, width: TARGET, height: h }).resize({ width: 300 }).png().toBuffer();
        const b = await sharp(shotScaled).extract({ left: 0, top: w.y, width: TARGET, height: Math.min(h, (await sharp(shotScaled).metadata()).height! - w.y) }).resize({ width: 300 }).png().toBuffer();
        tiles.push({ input: a, left: 0, top: row }, { input: b, left: 306, top: row });
        row += Math.round((h * 300) / TARGET) + 8;
      }
      await sharp({ create: { width: 612, height: Math.max(8, row), channels: 3, background: "#777777" } }).composite(tiles).png().toFile(path.join(OUT, `${id}-worst.png`));
    } catch (e) {
      lines.push(`| ${id} | - | - | - | 실패: ${e instanceof Error ? e.message.slice(0, 120) : String(e)} | - |`);
    } finally {
      await live.close();
    }
  }
  await browser.close();
  lines.push("", "구간 시트(`*-worst.png`)는 왼쪽 = 앱 PNG, 오른쪽 = 브라우저 화면(같은 폭으로 맞춤)의 차이가 큰 구간 3개.");
  fs.writeFileSync(path.join(OUT, "report.md"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  const bad = lines.filter((l) => l.startsWith("| fx-") && (/실패/.test(l) || Number(l.split("|")[4]!.trim()) > 6));
  process.exit(bad.length ? 1 : 0);
}
if (/png-compare\.ts$/.test(process.argv[1] ?? "")) void main();
