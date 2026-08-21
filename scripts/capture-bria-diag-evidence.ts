/**
 * Bria 실패 3건(의류/식품/생활) 근본 원인 진단용 증거 수집.
 * generateBackdropViaBria 내부 로직은 변경하지 않고, 동일 입력으로
 * sourceImageUrl · Replicate request/response JSON만 review/에 저장한다.
 *
 * 실행 (dev 서버 + auth-state.json 필요):
 *   npx tsx scripts/capture-bria-diag-evidence.ts
 *
 * 환경: REPLICATE_API_TOKEN (.env.local), BASE_URL (기본 http://localhost:3001)
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import Replicate from "replicate";
import sharp from "sharp";
import { describeColorTone, extractProductTheme } from "../lib/color-extract";
import { getCategoryTheme } from "../lib/category-theme";
import { formatConceptPromptBlock, generateConceptBrief } from "../lib/concept-brief";
import { resolvePhotographyTemplate } from "../lib/backdrop-prompt-templates";
import {
  analyzeShadowDirection,
  DEFAULT_SHADOW,
  lightingLockPrompt,
  type ShadowAnalysis,
} from "../lib/vision-utils";

const ROOT = path.join(__dirname, "..");
const REVIEW = path.join(ROOT, "review");
const TEST_ASSETS_ROOT = path.join(__dirname, "test-assets");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

const BRIA_VERSION =
  "ba437a62603f1205b253fd7bad0d0b5c326d7857242d11753c0cbcd2c5008602";

/** generateBackdropViaBria candidate-0 와 동일 (photo-enhance.ts 미변경). */
const CANDIDATE_VARIATION_0 =
  "identical color temperature to the lighting lock, more negative space around empty center";

const BACKDROP_PROMPTS: Record<string, string> = {
  "의류/패션":
    "soft neutral fabric-textured studio background, warm editorial lighting, empty product photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "식품/건강기능식품":
    "warm rustic wooden table background, soft natural light, fresh ingredients softly blurred in background, empty food photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
  "생활용품":
    "bright airy home interior background, soft natural light, minimal styling, empty product photography backdrop, maintain natural product shadow direction and intensity from the original photo, realistic studio lighting, no text, no logo, no product",
};

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function sanitizePromptForBria(prompt: string): string {
  return prompt
    .replace(/\bno product\b/gi, "")
    .replace(/\bno packaging\b/gi, "")
    .replace(/\bno bottle\b/gi, "")
    .replace(/\bno text\b/gi, "")
    .replace(/\bno logo\b/gi, "")
    .replace(/\bempty product photography backdrop\b/gi, "")
    .replace(/\bempty dimensional set\b/gi, "")
    .replace(/\bempty backdrop\b/gi, "")
    .replace(/\bempty center(?: for product placement)?\b/gi, "")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
}

function resolveUploadImages(categoryKey: string): string[] {
  const testAssetsDir = path.join(TEST_ASSETS_ROOT, categoryKey);
  const testImages = fs
    .readdirSync(testAssetsDir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => path.join(testAssetsDir, f));
  const loopImages = testImages.filter((f) => /^loop-\d+/i.test(path.basename(f))).sort();
  return (loopImages.length >= 2 ? loopImages : testImages).slice(0, 3);
}

async function captureSourceImageUrl(
  categoryLabel: string,
  productName: string,
  price: string,
  uploadImages: string[],
): Promise<string> {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("auth-state.json 없음 — npx tsx scripts/save-login-state.ts 먼저 실행");
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  let sourceImageUrl: string | null = null;

  await page.route("**/api/generate-backdrop", async (route) => {
    const postData = route.request().postDataJSON() as { imageUrls?: string[] };
    sourceImageUrl = postData.imageUrls?.[0] ?? null;
    await route.abort();
  });

  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: categoryLabel });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", productName);
  await page.fill("#price", price);
  await page.click('button[type="submit"]');

  const deadline = Date.now() + 120000;
  while (!sourceImageUrl && Date.now() < deadline) {
    await page.waitForTimeout(500);
  }

  await browser.close();

  if (!sourceImageUrl) {
    throw new Error("generate-backdrop 요청에서 imageUrls[0]을 캡처하지 못했습니다.");
  }
  return sourceImageUrl;
}

async function buildCandidate0Input(
  category: string,
  productName: string,
  sourceImageUrl: string,
  price: number,
): Promise<Record<string, unknown>> {
  const { brief: conceptBrief } = await generateConceptBrief({
    category,
    productName,
    brandName: null,
    price,
    keyFeatures: null,
    ingredients: null,
    targetCustomer: null,
  });

  let theme = getCategoryTheme(category);
  try {
    const extracted = await extractProductTheme([sourceImageUrl]);
    if (extracted) theme = { ...theme, ...extracted };
  } catch {
    // optional
  }

  const basePrompt = BACKDROP_PROMPTS[category] ?? BACKDROP_PROMPTS["생활용품"];
  let shadow: ShadowAnalysis = { ...DEFAULT_SHADOW };
  try {
    const res = await fetch(sourceImageUrl);
    const sourceBuffer = Buffer.from(await res.arrayBuffer());
    const shadowResult = await analyzeShadowDirection(sourceBuffer);
    shadow = shadowResult.shadow;
  } catch {
    // default shadow
  }

  const photography = resolvePhotographyTemplate(conceptBrief);
  const conceptBlock = conceptBrief ? `, ${formatConceptPromptBlock(conceptBrief)}` : "";
  const lock = lightingLockPrompt(shadow);
  const accentClause =
    shadow.colorTemperature === "warm"
      ? `subtle ${describeColorTone(theme.accent)} accent lighting`
      : "no warm accent gel, no amber bounce, keep white balance locked to the product";
  const fluxStylePrompt = `${basePrompt}${conceptBlock}, ${photography.prompt}, ${lock}, ${accentClause}, soft ${describeColorTone(theme.baseNeutral)} set color without shifting key light`;
  const bgPrompt = sanitizePromptForBria(
    `${fluxStylePrompt}, keep the original product unchanged, replace only the surrounding background, realistic studio set`,
  );
  const candidatePrompt = sanitizePromptForBria(`${bgPrompt}, ${CANDIDATE_VARIATION_0}`);

  return {
    image_url: sourceImageUrl,
    bg_prompt: candidatePrompt,
    seed: 1100,
    fast: true,
    refine_prompt: true,
    original_quality: true,
    force_rmbg: false,
  };
}

async function saveSourceImage(sourceImageUrl: string, outPath: string) {
  const res = await fetch(sourceImageUrl);
  if (!res.ok) throw new Error(`sourceImageUrl 다운로드 실패: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf).png().toBuffer();
  fs.writeFileSync(outPath, png);
}

function redactSecrets<T extends Record<string, unknown>>(obj: T): T {
  const copy = JSON.parse(JSON.stringify(obj)) as T;
  for (const key of Object.keys(copy)) {
    if (/token|secret|authorization|api_key/i.test(key)) {
      (copy as Record<string, unknown>)[key] = "[REDACTED]";
    }
  }
  return copy;
}

const CASES = [
  {
    slug: "fashion",
    categoryKey: "의류-패션",
    category: "의류/패션",
    productName: "린넨 오버핏 셔츠",
    price: 45900,
  },
  {
    slug: "food",
    categoryKey: "식품",
    category: "식품/건강기능식품",
    productName: "단백질 쉐이크 바닐라",
    price: 24900,
  },
  {
    slug: "home",
    categoryKey: "생활용품",
    category: "생활용품",
    productName: "USB 캠핑 랜턴",
    price: 27900,
  },
] as const;

async function main() {
  loadEnvLocal();
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN 필요 (.env.local)");
  }

  fs.mkdirSync(REVIEW, { recursive: true });

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });

  for (const item of CASES) {
    console.log(`\n[bria-diag] ${item.slug} (${item.category})`);

    const uploadImages = resolveUploadImages(item.categoryKey);
    const localSourceFile = uploadImages[0];
    console.log(`  local upload[0]: ${localSourceFile}`);

    const sourceImageUrl = await captureSourceImageUrl(
      item.category,
      item.productName,
      String(item.price),
      uploadImages,
    );
    console.log(`  sourceImageUrl: ${sourceImageUrl}`);

    const sourceOut = path.join(REVIEW, `bria-diag-${item.slug}-source.png`);
    await saveSourceImage(sourceImageUrl, sourceOut);
    console.log(`  saved: ${sourceOut}`);

    const input = await buildCandidate0Input(
      item.category,
      item.productName,
      sourceImageUrl,
      item.price,
    );

    const requestDoc = {
      capturedAt: new Date().toISOString(),
      category: item.category,
      categoryKey: item.categoryKey,
      productName: item.productName,
      localSourceFile: path.relative(ROOT, localSourceFile),
      uploadImagePaths: uploadImages.map((p) => path.relative(ROOT, p)),
      model: "bria/generate-background",
      version: BRIA_VERSION,
      candidateIndex: 0,
      input,
    };

    const requestPath = path.join(REVIEW, `bria-diag-${item.slug}-request.json`);
    fs.writeFileSync(requestPath, JSON.stringify(requestDoc, null, 2), "utf8");
    console.log(`  saved: ${requestPath}`);

    const prediction = await replicate.predictions.create({
      version: BRIA_VERSION,
      input,
    });

    const finished = await replicate.wait(prediction);
    const responsePath = path.join(REVIEW, `bria-diag-${item.slug}-response.json`);
    fs.writeFileSync(
      responsePath,
      JSON.stringify(redactSecrets(finished as unknown as Record<string, unknown>), null, 2),
      "utf8",
    );
    console.log(`  saved: ${responsePath} (status=${finished.status})`);
  }

  console.log("\n[bria-diag] 완료 — review/bria-diag-{fashion|food|home}-*");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
