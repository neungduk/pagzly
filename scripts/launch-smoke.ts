/**
 * 429차 — 배포 URL 스모크(로그인·결제·계정 생성·유료 호출 없음).
 *   npx tsx scripts/launch-smoke.ts http://localhost:3000        (로컬 개발 서버)
 *   npx tsx scripts/launch-smoke.ts https://<프리뷰 또는 운영 주소>
 * 점검: ① 공개 페이지 6종 200 + 콘솔·페이지 오류 0 ② 보호 API가 비로그인에서 401/403 ③ GET/POST를 잘못 쓴 요청이 안전하게 거절(2xx·5xx 아님)
 *       ④ 보안 헤더 ⑤ robots·sitemap. 모든 요청은 빈 본문 `{}` 또는 GET이라 비용이 들지 않는다(인증 단계에서 거절되는 것을 확인하는 점검).
 * 종료 코드: 실패가 하나라도 있으면 1.
 */
import { chromium } from "playwright";

const base = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.log("사용법: npx tsx scripts/launch-smoke.ts <주소(https://…)>");
  process.exit(2);
}

const PAGES = ["/", "/login", "/signup", "/terms", "/privacy", "/forgot-password"];
/** 로그인이 필요한 POST API — 비로그인 + 빈 본문이면 인증 단계에서 401/403이어야 한다(유료 호출 전 단계) */
const PROTECTED_POST = [
  "autofill-draft", "canvas-ai-image", "enhance-image", "generate", "generate-backdrop", "generate-lifestyle-shots", "generate-social", "info-backdrops",
  "lifestyle-composite", "patch-page", "patch-section", "protect-product-images", "scene-images", "section-backdrops", "billing/purchase-pack", "billing/subscribe", "generations",
].map((p) => `/api/${p}`);
/** 비로그인 GET이 401/403이어야 하는 API */
const PROTECTED_GET = ["/api/billing/me", "/api/billing/renew"];

const rows: Array<{ ok: boolean; label: string; detail: string }> = [];
const add = (ok: boolean, label: string, detail = "") => rows.push({ ok, label, detail });
const status = async (path: string, init?: RequestInit) => {
  try {
    const r = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...init });
    return r;
  } catch (e) {
    return null as unknown as Response;
  }
};

(async () => {
  // ① 공개 페이지
  const browser = await chromium.launch();
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 100)); });
    page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 100)));
    const resp = await page.goto(base + path, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => null);
    add(resp?.status() === 200 && errors.length === 0, `페이지 ${path}`, `${resp?.status() ?? "연결 실패"}${errors.length ? ` · 콘솔 오류 ${errors.length}: ${errors[0]}` : ""}`);
    await ctx.close();
  }
  await browser.close();

  // ② 보호 API(비로그인)
  for (const path of PROTECTED_POST) {
    const r = await status(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    add(!!r && (r.status === 401 || r.status === 403), `POST ${path} 비로그인`, String(r?.status ?? "연결 실패"));
  }
  for (const path of PROTECTED_GET) {
    const r = await status(path);
    add(!!r && (r.status === 401 || r.status === 403), `GET ${path} 비로그인`, String(r?.status ?? "연결 실패"));
  }
  const patch = await status("/api/products/00000000-0000-0000-0000-000000000000", { method: "PATCH", headers: { "content-type": "application/json" }, body: "{}" });
  add(!!patch && (patch.status === 401 || patch.status === 403), "PATCH /api/products/{id} 비로그인", String(patch?.status ?? "연결 실패"));

  // ③ 잘못된 메서드 — 2xx·5xx가 아니어야 한다
  for (const path of [...PROTECTED_POST, "/api/support-chat"]) {
    const r = await status(path); // GET
    add(!!r && r.status >= 400 && r.status < 500, `GET ${path} (POST 전용)`, String(r?.status ?? "연결 실패"));
  }
  // 무인증 공개 API는 잘못된 입력에서 400(또는 제한 429)이어야 하고 200이 아니다(빈 본문 → 외부 호출 없음)
  const chat = await status("/api/support-chat", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  add(!!chat && [400, 429, 503].includes(chat.status), "POST /api/support-chat 빈 본문", String(chat?.status ?? "연결 실패"));
  const proxy = await status("/api/proxy-image");
  add(!!proxy && proxy.status === 400, "GET /api/proxy-image 주소 없음", String(proxy?.status ?? "연결 실패"));
  const proxyEvil = await status("/api/proxy-image?url=" + encodeURIComponent("http://169.254.169.254/latest/meta-data/"));
  add(!!proxyEvil && proxyEvil.status >= 400 && proxyEvil.status < 500, "GET /api/proxy-image 내부 주소 거절", String(proxyEvil?.status ?? "연결 실패"));

  // ④ 보안 헤더(홈)
  const home = await status("/");
  const h = (n: string) => home?.headers.get(n) ?? "";
  add(h("x-content-type-options").toLowerCase() === "nosniff", "헤더 X-Content-Type-Options: nosniff", h("x-content-type-options") || "없음");
  add(!!h("referrer-policy"), "헤더 Referrer-Policy", h("referrer-policy") || "없음");
  add(!!h("x-frame-options") || /frame-ancestors/.test(h("content-security-policy")), "헤더 X-Frame-Options 또는 CSP frame-ancestors", h("x-frame-options") || h("content-security-policy") || "없음");
  add(!h("x-powered-by"), "헤더 X-Powered-By 숨김", h("x-powered-by") || "숨김");

  // ⑤ robots·sitemap
  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const r = await status(path);
    add(r?.status === 200, `GET ${path}`, String(r?.status ?? "연결 실패"));
  }

  const failed = rows.filter((r) => !r.ok);
  for (const r of rows) console.log(`${r.ok ? "통과" : "실패"}  ${r.label}${r.detail ? `  —  ${r.detail}` : ""}`);
  console.log(`\n${rows.length - failed.length}/${rows.length} 통과${failed.length ? ` · 실패 ${failed.length}건` : ""}  (${base})`);
  process.exit(failed.length ? 1 : 0);
})();
