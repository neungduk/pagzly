const fs = require("fs");
const path = require("path");
const f = path.join(__dirname, "_run-inline-qa.ts");
let s = fs.readFileSync(f, "utf8");

const loadImagesFn = `
function loadPixabayImages(): string[] {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const files = fs
    .readdirSync(ASSET_DIR)
    .filter((name) => /^pixabay-.*\\.(jpe?g|png)$/i.test(name))
    .map((name) => path.join(ASSET_DIR, name))
    .sort();
  if (files.length < 7) {
    throw new Error(\`Need 7+ pixabay images in \${ASSET_DIR}, found \${files.length}. Run crawl-pixabay.mts first.\`);
  }
  return files.slice(0, NEED);
}
`;

if (!s.includes("function loadPixabayImages")) {
  s = s.replace("async function fillIfExists", loadImagesFn + "\nasync function fillIfExists");
}

s = s.replace(
  /const apiKey = process\.env\.PEXELS_API_KEY;[\s\S]*?console\.log\(`\[1\/4\] 준비된[\s\S]*?\);/,
  `console.log("[1/4] Pixabay images from disk");
  const images = loadPixabayImages();
  console.log(\`[1/4] prepared images \${images.length}\`);`,
);

s = s.replace(
  'await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });',
  'await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });',
);

s = s.replace('await page.fill("#productName", "?', 'await page.fill("#productName", "DUMMY_REPLACE');
// easier: replace whole block from productName to wholesaleUrl

const productBlock = `  await page.fill("#productName", "글로우밤 수분 크림");
  await fillIfExists(page, "#brandName", "루미에르 랩");
  await page.fill("#price", "25000");
  await fillIfExists(page, "#targetCustomer", "20~40대 민감성·건성 피부");
  await fillIfExists(
    page,
    "#keyFeatures",
    "수분감 있는 텍스처, 산뜻한 마무리, 민감성 피부 사용 가능, 속당김 케어, 무향 포뮬러",
  );
  await fillIfExists(
    page,
    "#ingredients",
    "히알루론산, 세라마이드, 판테놀, 알로에베라잎추출물, 글리세린",
  );
  await fillIfExists(page, "#certifications", "피부 자극 테스트 완료, 동물실험 없음");
  await fillIfExists(
    page,
    "#wholesaleUrl",
    "원본: GlowBalm Moisture Cream 50ml / 워터리 크림, 무향, 민감성 피부 / 사용법: 세안 후 적당량을 얼굴에 펴 바름",
  );`;

s = s.replace(
  /await page\.fill\("#productName"[\s\S]*?await fillIfExists\(\s*page,\s*"#wholesaleUrl"[\s\S]*?\);/,
  productBlock,
);

s = s.replace(
  'await preview.screenshot({ path: path.join(OUT_DIR, "02-detail-preview.png") });',
  `const SCREENSHOT_PATH = path.join(ROOT, "review", "qa-screenshots", "cosmetics-pixabay-test-full.png");
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true });
  await preview.screenshot({ path: SCREENSHOT_PATH });`,
);

s = s.replace('path.join(OUT_DIR, "01-draft.png")', 'path.join(OUT_DIR, "draft.png")');

// extend console capture
s = s.replace(
  `page.on("console", (msg) => {
    const t = msg.text();
    if (/\\[cost\\]|\\[images\\]|\\[qa\\]|\\[concept-illustration\\]|\\[enhance\\]|\\[section-backdrop\\]|error/i.test(t)) {
      console.log(\`[browser] \${t.slice(0, 240)}\`);
    }
  });`,
  `const consoleLog: { type: string; text: string }[] = [];
  const apiErrors: string[] = [];
  const runStartedAt = Date.now();
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") consoleLog.push({ type, text: msg.text() });
    const t = msg.text();
    if (/\\[cost\\]|\\[images\\]|\\[qa\\]|\\[concept-illustration\\]|\\[enhance\\]|\\[section-backdrop\\]|error/i.test(t)) {
      console.log(\`[browser] \${t.slice(0, 300)}\`);
    }
  });
  page.on("pageerror", (err) => consoleLog.push({ type: "pageerror", text: err.message }));`,
);

s = s.replace(
  `page.on("response", async (response) => {
    const u = response.url();
    if (!u.includes("/api/generate") && !u.includes("/api/enhance")) return;
    if (response.status() >= 400) {
      const body = await response.text().catch(() => "");
      console.error(\`[api \${response.status()}] \${u} ??\${body.slice(0, 400)}\`);
    }
  });`,
  `page.on("response", async (response) => {
    const u = response.url();
    if (!u.includes("/api/")) return;
    if (response.status() >= 400) {
      const body = await response.text().catch(() => "");
      const line = \`[api \${response.status()}] \${u} — \${body.slice(0, 500)}\`;
      apiErrors.push(line);
      console.error(line);
    }
  });`,
);

const reportHook = `
  const REPORT_PATH = path.join(ROOT, "review", "cosmetics-pixabay-test-report.md");
  const sourcesPath = path.join(OUT_DIR, "pixabay-sources.json");
  const sourcesList = fs.existsSync(sourcesPath) ? JSON.parse(fs.readFileSync(sourcesPath, "utf8")) : [];
  let costJson = "null";
  let productId = "n/a";
  let sections = 0;
  let imageUrls = 0;
  if (session) {
    try {
      const parsed = JSON.parse(session) as {
        imageUrls?: string[];
        generated?: { sections?: unknown[]; productId?: string; photoCostBreakdown?: unknown; cost?: unknown };
      };
      productId = parsed.generated?.productId ?? "n/a";
      sections = parsed.generated?.sections?.length ?? 0;
      imageUrls = parsed.imageUrls?.length ?? 0;
      costJson = JSON.stringify(parsed.generated?.photoCostBreakdown ?? parsed.generated?.cost ?? null, null, 2);
    } catch {}
  }
  const runtimeSec = Math.round((Date.now() - runStartedAt) / 1000);
  const report = [
    "# Cosmetics Pixabay full pipeline QA",
    "",
    \`Generated: \${new Date().toISOString()}\`,
    \`BASE_URL: \${BASE_URL}\`,
    "TEST_MODE: false (dev process env)",
    \`Runtime: \${runtimeSec}s\`,
    \`productId: \${productId}\`,
    "",
    "## Dummy product input",
    "",
    "- **productName:** 글로우밤 수분 크림",
    "- **brandName:** 루미에르 랩",
    "- **category:** 화장품/뷰티",
    "- **price:** 25000",
    "- **targetCustomer:** 20~40대 민감성·건성 피부",
    "- **keyFeatures:** 수분감 있는 텍스처, 산뜻한 마무리, 민감성 피부 사용 가능, 속당김 케어, 무향 포뮬러",
    "- **ingredients:** 히알루론산, 세라마이드, 판테놀, 알로에베라잎추출물, 글리세린",
    "- **certifications:** 피부 자극 테스트 완료, 동물실험 없음",
    "- **wholesaleUrl:** 원본: GlowBalm Moisture Cream 50ml / 워터리 크림, 무향, 민감성 피부 / 사용법: 세안 후 적당량을 얼굴에 펴 바름",
    "",
    "## Pixabay page URLs",
    "",
    ...(Array.isArray(sourcesList) ? sourcesList.map((x: { pageUrl?: string }, i: number) => \`\${i + 1}. \${x.pageUrl ?? ""}\`) : ["(see pixabay-sources.json)"]),
    "",
    "## Screenshot",
    "",
    "- \`review/qa-screenshots/cosmetics-pixabay-test-full.png\`",
    "",
    "## Quality observations",
    "",
    "- Review hero composition and whether generated lifestyle shots match cream/jar product uploads.",
    "- Check section spacing, headline copy tone, and backdrop diversity vs 48cha wow bar.",
    "- Compare draft.png vs final detail-preview for regressions.",
    "",
    "## Generation cost",
    "",
    "\`\`\`json",
    costJson,
    "\`\`\`",
    "",
    "## Console errors/warnings",
    "",
    ...(consoleLog.length ? consoleLog.map((e) => \`- [\${e.type}] \${e.text.slice(0, 500)}\`) : ["- None"]),
    "",
    "## API errors",
    "",
    ...(apiErrors.length ? apiErrors.map((e) => \`- \${e}\`) : ["- None"]),
    "",
    \`sections: \${sections}, imageUrls: \${imageUrls}\`,
    "",
  ].join("\\n");
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  console.log(\`[report] \${REPORT_PATH} runtime=\${runtimeSec}s\`);
`;

s = s.replace(
  'console.log(`[4/4] ?',
  reportHook + '\n  console.log(`[4/4] ?',
);

// Remove loadEnvLocal overwriting TEST_MODE if any - actually script loads env from file which sets TEST_MODE true - only affects server not script

// Remove pexels api check block remnants
s = s.replace(/if \(!apiKey\) throw new Error[\s\S]*?;\n\n/, "");

fs.writeFileSync(f, s, "utf8");
console.log("patched2");
