/**
 * 444차 — 눈 검수 캡처 공용: export HTML을 서버 없이 Playwright route로 연다(페이지·/qa-fixtures·/fonts는 저장소 파일, Google Fonts CSS는 로컬 Noto Sans KR로 대체, 그 밖은 차단).
 * 폰트는 `node scripts/build-detail-fonts.mjs`가 만든 public/fonts(gitignore)를 쓴다.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

export const ORIGIN = "http://pz.local";
const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".woff2": "font/woff2", ".woff": "font/woff", ".css": "text/css", ".svg": "image/svg+xml" };

export function fontCss(): string {
  if (!fs.existsSync("public/fonts/noto-sans-kr.css")) {
    console.log("경고: public/fonts 없음 → 시스템 폴백 글꼴(글자 폭 판단 보수적으로)");
    return "";
  }
  return fs.readFileSync("public/fonts/noto-sans-kr.css", "utf8").replace(/url\(\.\/noto-sans-kr\//g, `url(${ORIGIN}/fonts/noto-sans-kr/`);
}

/** 448차 — 저장소 밖(public 아님) 폴더를 URL 접두어로 제공(합성 사진 세트 등). 예: EXTRA_ROOTS["/stress/"] = "review/448-verify/photos" */
export const EXTRA_ROOTS: Record<string, string> = {};

export const launch = (): Promise<Browser> => chromium.launch();

/** html을 W폭 화면으로 열고 폰트·사진 로드를 기다린 페이지를 돌려준다 */
export async function openHtml(browser: Browser, html: string, W: number, css = fontCss(), allowNet = false): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin === ORIGIN) {
      if (u.pathname === "/") return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
      const extra = Object.keys(EXTRA_ROOTS).find((k) => u.pathname.startsWith(k));
      const p = extra ? path.join(EXTRA_ROOTS[extra]!, decodeURIComponent(u.pathname.slice(extra.length))) : path.join("public", decodeURIComponent(u.pathname));
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return route.fulfill({ status: 200, contentType: MIME[path.extname(p)] ?? "application/octet-stream", body: fs.readFileSync(p) });
      return route.fulfill({ status: 404, body: "" });
    }
    if (/fonts\.googleapis\.com/.test(u.host) && css) return route.fulfill({ status: 200, contentType: "text/css", body: css });
    // 447차: PC 검증은 저장 세션의 실제 사진 주소를 불러온다(allowNet). 기본(클라우드·합성)은 모든 외부 요청 차단
    return allowNet ? route.continue() : route.abort();
  });
  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
  await page.evaluate("document.fonts.ready.then(() => 1)");
  // loading="lazy" 사진은 화면 밖이면 캡처 때 안 불러와져 빈 칸으로 찍힌다 → 모두 즉시 로드로 바꾸고 끝날 때까지 기다린다
  await page.evaluate("Promise.all(Array.from(document.images).map((i) => { i.loading = 'eager'; return i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = () => r(1); }); }))");
  await page.evaluate("Promise.all(Array.from(document.images).map((i) => (i.decode ? i.decode().catch(() => 0) : 0)))"); // decoding=async 사진은 화면 밖이면 디코드 전에 찍힐 수 있다
  await page.waitForTimeout(150);
  return { page, close: () => ctx.close() };
}
