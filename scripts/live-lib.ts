/**
 * 445차 — 라이브 캡처 공용: 합성 픽스처 → 개발 미리보기 preset, 라이브 페이지 열기(외부 요청 차단·스크롤 reveal·이슈 배지 숨김).
 */
import { type Browser, type Page } from "playwright";
import { applySectionDisplayBudget } from "../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../lib/comparison-policy";
import { exportArgsOf, readSession } from "./design-corpus";

export const SESSION_KEY = "pagzly-dev-preview-session";

/** 픽스처 → 개발 미리보기 preset(readSessionPreset이 읽는 모양). claimInput은 세션 JSON 자체(export 캡처의 claimFactsOf 입력과 같다) */
export function presetOf(file: string): Record<string, unknown> {
  return presetOfSession(readSession(file));
}
/** 449차 — 세션 객체(퍼징 사례)에서 바로 만든다 */
export function presetOfSession(s: ReturnType<typeof readSession>): Record<string, unknown> {
  const a = exportArgsOf(s);
  // export(buildDetailPageHtml)와 같은 순서·같은 옵션으로 표시 예산을 미리 적용한다. 개발 미리보기는 예산이 기본 꺼짐이고 chartRemoved 옵션도 안 넘겨 결과 페이지·export와 구성이 달라지기 때문
  const sections = applySectionDisplayBudget(a.category, (a.sections ?? []) as never, { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) });
  return {
    sections, category: a.category, brandName: a.brandName ?? "", productName: a.productName ?? "", imageUrls: a.imageUrls, theme: a.theme,
    imageHashByUrl: a.imageHashByUrl, imageRoles: a.imageRoles, imageOrigins: a.imageOrigins, stylePackId: a.stylePackId, imageTags: a.imageTags,
    infoBackdrops: a.infoBackdrops, sceneImages: a.sceneImages, productSizeHint: s.productSizeHint ?? null, claimInput: s,
  };
}

/** 라이브를 W px 화면에 연다. 개발 미리보기 틀(max-w-[430px]·좌우 선)은 750폭 비교를 위해 해제한다(렌더러 루트 폭 = W) */
export async function openLive(browser: Browser, server: string, file: string, W: number): Promise<{ page: Page; errors: string[]; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(`try{window.sessionStorage.setItem(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(JSON.stringify(presetOf(file)))})}catch(e){}; window.__name = (f) => f;`);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, process.env.LIVE_ERR_LEN ? Number(process.env.LIVE_ERR_LEN) : 160)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));
  await page.route("**/*", (r) => (new URL(r.request().url()).origin === new URL(server).origin ? r.continue() : r.abort()));
  await page.goto(`${server}/dev/detail-preview?capture=session`, { waitUntil: "load" });
  await page.locator("[data-pz-typefloor]").first().waitFor({ state: "attached", timeout: 60000 });
  await page.evaluate("document.fonts.ready.then(() => 1)");
  await page.evaluate("Promise.all(Array.from(document.images).map((i) => { i.loading = 'eager'; return i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = () => r(1); }); }))");
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}[data-pagzly-preview]{max-width:none!important;border:0!important;box-shadow:none!important}" });
  // 스크롤로 나타나는 요소(reveal)를 모두 보이게 끝까지 천천히 내렸다가 올린다
  const total = (await page.evaluate("document.documentElement.scrollHeight")) as number;
  for (let y = 0; y < total; y += 500) { await page.evaluate(`window.scrollTo(0, ${y})`); await page.waitForTimeout(90); }
  await page.evaluate("window.scrollTo(0, 0)");
  // 섹션 진입 gsap(scale 0.94→1, ~1s)이 끝나기 전에 재면 폭·높이가 줄어 보인다 — 끝 상태로 고정하고 전환을 기다린다
  await page.addStyleTag({ content: "[data-scroll-reveal]{transform:none!important;opacity:1!important;translate:none!important;scale:none!important}" });
  await page.waitForTimeout(1500);
  await page.evaluate("Promise.all(Array.from(document.images).map((i) => (i.decode ? i.decode().catch(() => 0) : 0)))");
  await page.waitForTimeout(500);
  return { page, errors, close: () => ctx.close() };
}
