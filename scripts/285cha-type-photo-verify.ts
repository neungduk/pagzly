/**
 * 285차 — 폰트 위계(표 라벨·섹션 라벨) + 사진 크롭 교대(POINT 정사각→4:5) 검증. 무료(과금 API 호출 없음).
 * 6카테고리 mock(히어로 + 정사각 슬롯 POINT 3개 + 한글 라벨 스펙표)과 279차 저장 결과를
 * 라이브(/dev/detail-preview?capture=session)와 export HTML(buildDetailPageHtml)에 렌더해
 *   1) POINT 이미지 실제 가로:세로 비율 (01·03 = 1:1, 02 = 4:5 기대 / annotated·블리드는 슬롯 비율)
 *   2) 스펙표 행 라벨 font-size·letter-spacing·font-family, 섹션 라벨 font-size
 *   3) 281차 회귀(line-clamp/ellipsis 잘림, 음절 단위 줄바꿈) — 390 모바일 + 300 좁은 칼럼
 * 를 기록하고 전체 스크린샷을 남긴다.
 *   npm run dev (별도) → LABEL=before|after npx tsx scripts/285cha-type-photo-verify.ts
 */
import { chromium, type Browser } from "playwright";
import fs from "fs";
import path from "path";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";
import { getCategoryTheme, type CategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const LABEL = process.env.LABEL ?? "after";
const OUT = path.join(ROOT, "review", `285cha-${LABEL}`);
const SESSION = path.join(ROOT, "review", "279cha-live", "session.json");

type Payload = {
  key: string;
  sections: DetailSection[];
  category: string;
  brandName: string;
  productName: string;
  imageUrls: string[];
  conceptIcons?: unknown;
  theme?: CategoryTheme;
  price?: number;
};

const FIXTURE_DIR: Record<string, string> = {
  "화장품/뷰티": "cosmetics",
  "의류/패션": "fashion",
  "식품/건강기능식품": "food",
  전자제품: "electronics",
  생활용품: "living",
  반려동물: "pet",
};

const MOCK_COPY: Record<string, { product: string; points: [string, string][]; rows: [string, string][] }> = {
  "화장품/뷰티": {
    product: "수분 진정 세럼",
    points: [["가볍게 스며드는 제형", "끈적임 없이 빠르게 흡수돼요."], ["순한 성분 설계", "입력된 전성분 기준으로 구성했어요."], ["데일리 루틴에 맞게", "아침·저녁 모두 사용할 수 있어요."]],
    rows: [["용량", "50ml"], ["제조국", "대한민국"], ["사용기한", "제조일로부터 24개월"]],
  },
  "의류/패션": {
    product: "오버핏 코튼 셔츠",
    points: [["여유 있는 핏", "어깨선이 자연스럽게 떨어져요."], ["탄탄한 원단", "면 100% 원단을 사용했어요."], ["디테일 봉제", "마감이 깔끔한 이중 박음질이에요."]],
    rows: [["소재", "면 100%"], ["세탁방법", "단독 손세탁"], ["제조국", "대한민국"]],
  },
  "식품/건강기능식품": {
    product: "통곡물 그래놀라",
    points: [["바삭한 식감", "오븐에 구워 식감을 살렸어요."], ["원재료 그대로", "입력된 원재료 기준으로 표기했어요."], ["간편한 한 끼", "우유나 요거트에 곁들여 보세요."]],
    rows: [["내용량", "500g"], ["원산지", "국산"], ["보관방법", "직사광선을 피해 보관"]],
  },
  전자제품: {
    product: "무선 핸디 청소기",
    points: [["가벼운 무게", "한 손으로 들기 편한 설계예요."], ["분리형 먼지통", "버튼 하나로 비울 수 있어요."], ["충전 거치대", "세워서 보관·충전해요."]],
    rows: [["무게", "1.2kg"], ["소비전력", "120W"], ["충전시간", "약 3시간"]],
  },
  생활용품: {
    product: "모듈 수납함 3단",
    points: [["공간 맞춤 모듈", "단을 쌓아 높이를 조절해요."], ["튼튼한 소재", "PP 소재로 가볍고 단단해요."], ["손잡이 홈", "꺼내고 넣기 편해요."]],
    rows: [["크기", "30×40×25cm"], ["소재", "PP"], ["제조국", "대한민국"]],
  },
  반려동물: {
    product: "덴탈 껌 간식",
    points: [["씹는 재미", "홈이 있는 형태로 오래 씹어요."], ["원료 표기", "입력된 원재료 기준으로 표기했어요."], ["소포장", "하루 하나씩 급여하기 좋아요."]],
    rows: [["내용량", "210g"], ["급여대상", "전연령"], ["원산지", "국산"]],
  },
};

function buildMock(category: string): Payload {
  const dir = FIXTURE_DIR[category];
  const copy = MOCK_COPY[category];
  const imageUrls = [1, 2, 3, 4].map((n) => `/qa-fixtures/${dir}/0${n}.${dir === "cosmetics" ? "jpg" : "png"}`);
  const slots = ["feature_detail", "material_detail", "design_detail"];
  const sections: DetailSection[] = [
    { type: "hero", slot: "hero", headline: copy.product, subheadline: "285차 검증용", imageIndex: 0 },
    ...copy.points.map(
      ([heading, body], i) =>
        ({
          type: "image_text",
          slot: slots[i],
          heading,
          body,
          imageIndex: (i % 3) + 1,
          imagePosition: "left",
        }) as DetailSection,
    ),
    { type: "spec_table", slot: "spec_table", heading: "제품 정보", rows: copy.rows.map(([label, value]) => ({ label, value })) } as DetailSection,
  ];
  return { key: `mock-${dir}`, sections, category, brandName: "PAGZLY QA", productName: copy.product, imageUrls };
}

function loadSession(): Payload {
  const session = JSON.parse(fs.readFileSync(SESSION, "utf8"));
  const g = session.generated ?? session;
  return {
    key: "session279",
    sections: g.sections,
    category: session.category ?? "화장품/뷰티",
    brandName: session.brandName ?? "",
    productName: session.productName ?? "",
    imageUrls: (g.imageUrls ?? session.imageUrls) as string[],
    conceptIcons: g.conceptIcons,
    theme: (g.theme ?? session.theme) as CategoryTheme,
    price: session.price,
  };
}

const MEASURE = `
(() => {
  const root = document.querySelector("[data-pagzly-preview]") || document.body;
  const imgs = Array.from(root.querySelectorAll("section img"))
    .map((img) => {
      const r = img.getBoundingClientRect();
      const sec = img.closest("section");
      const badge = sec && Array.from(sec.querySelectorAll("span")).find((s) => /^POINT \\d\\d$/.test((s.textContent || "").trim()));
      return { point: badge ? badge.textContent.trim() : null, w: Math.round(r.width), h: Math.round(r.height), ratio: r.height ? +(r.width / r.height).toFixed(3) : 0 };
    })
    .filter((x) => x.point && x.w > 120);
  const th = Array.from(root.querySelectorAll("table tbody tr")).map((tr) => tr.querySelector("th,td")).filter(Boolean);
  const label = th[0] ? getComputedStyle(th[0]) : null;
  const kicker = Array.from(root.querySelectorAll("p")).find((p) => (p.textContent || "").trim() === "INFO");
  const kcs = kicker ? getComputedStyle(kicker) : null;
  return {
    points: imgs,
    specLabel: label ? { fontSize: label.fontSize, letterSpacing: label.letterSpacing, fontFamily: label.fontFamily.split(",")[0], textTransform: label.textTransform } : null,
    infoKicker: kcs ? { fontSize: kcs.fontSize, letterSpacing: kcs.letterSpacing } : null,
  };
})()
`;

const PROBE = fs
  .readFileSync(path.join(ROOT, "scripts", "281cha-text-fit-verify.ts"), "utf8")
  .split("const PROBE = `")[1]
  .split("`;\n")[0]
  .replace(/\r/g, "");

async function scrollThrough(page: import("playwright").Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
}

async function waitImages(page: import("playwright").Page) {
  await scrollThrough(page);
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((img) => (img.loading = "eager"));
    await Promise.race([
      Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })))),
      new Promise((r) => setTimeout(r, 20_000)),
    ]);
  });
  await page.evaluate(() => document.fonts.ready);
}

async function live(browser: Browser, p: Payload, vw: number, col: number) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.evaluate((x) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(x)), p);
  await page.goto(`${BASE}/dev/detail-preview?capture=session`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForSelector("[data-pagzly-preview] section", { timeout: 120_000 });
  if (col) await page.addStyleTag({ content: `[data-pagzly-preview]{max-width:${col}px !important}` });
  await waitImages(page);
  await page.waitForTimeout(1200);
  const m = await page.evaluate(MEASURE);
  const probe = (await page.evaluate(PROBE)) as { clamped: unknown[]; breaks: unknown[] };
  const shot = path.join(OUT, `live-${p.key}-${col || vw}.png`);
  await page.locator("[data-pagzly-preview]").first().screenshot({ path: shot });
  await ctx.close();
  return { measure: m, clamped: probe.clamped.length, breaks: probe.breaks, shot: path.relative(ROOT, shot) };
}

async function exportHtml(browser: Browser, p: Payload, vw: number) {
  const html = buildDetailPageHtml({
    productName: p.productName,
    brandName: p.brandName,
    category: p.category,
    sections: p.sections,
    imageUrls: p.imageUrls.map((u) => (u.startsWith("/") ? `${BASE}${u}` : u)),
    theme: p.theme ?? getCategoryTheme(p.category),
    price: p.price,
  });
  const file = path.join(OUT, `export-${p.key}.html`);
  fs.writeFileSync(file, html);
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`file:///${file.replace(/\\/g, "/")}`, { waitUntil: "load", timeout: 120_000 });
  await waitImages(page);
  await page.waitForTimeout(800);
  const m = await page.evaluate(MEASURE);
  const probe = (await page.evaluate(PROBE)) as { clamped: unknown[]; breaks: unknown[] };
  const shot = path.join(OUT, `export-${p.key}-${vw}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  await ctx.close();
  return { measure: m, clamped: probe.clamped.length, breaks: probe.breaks, shot: path.relative(ROOT, shot) };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const payloads = [...Object.keys(FIXTURE_DIR).map(buildMock), loadSession()];
  const browser = await chromium.launch();
  const report: Record<string, unknown> = { label: LABEL };
  for (const p of payloads) {
    const l390 = await live(browser, p, 390, 0);
    const l300 = await live(browser, p, 1024, 300);
    const ex = await exportHtml(browser, p, 390);
    report[p.key] = { live390: l390, live300: l300, export390: ex };
    const fmt = (r: typeof l390) =>
      `${r.measure.points.map((x: { point: string; ratio: number }) => `${x.point.slice(-2)}=${x.ratio}`).join(" ")} label=${r.measure.specLabel ? `${r.measure.specLabel.fontSize}/${r.measure.specLabel.letterSpacing}` : "-"} INFO=${r.measure.infoKicker?.fontSize ?? "-"} clamp=${r.clamped} breaks=${r.breaks.length}`;
    console.log(`[285] ${LABEL} ${p.key} live390: ${fmt(l390)}`);
    console.log(`[285] ${LABEL} ${p.key} live300: ${fmt(l300)}`);
    console.log(`[285] ${LABEL} ${p.key} export390: ${fmt(ex)}`);
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
