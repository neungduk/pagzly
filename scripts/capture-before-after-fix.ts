/**
 * 조명/합성/배경 다양화 강제 재생성 + 이전 result.png 와 나란히 비교.
 *
 * 사전 조건:
 * - `.env.local`: TEST_MODE=false (풀 파이프라인)
 * - dev 서버가 위 env 로 실행 중 (재시작 필요)
 * - scripts/auth-state.json 로그인 세션
 *
 * 실행:
 *   FORCE_REGENERATE=true BACKDROP_CANDIDATES=3 npx tsx scripts/capture-before-after-fix.ts
 *
 * 산출물:
 *   review/before-after-fix/before-result.png  (기존 final-approved/result.png 복사)
 *   review/before-after-fix/after-result.png   (새 생성)
 *   review/before-after-fix/compare-side-by-side.png
 *   review/before-after-fix/session-after.json
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const BEFORE_SRC = path.join(__dirname, "..", "review", "final-approved", "result.png");
const OUTPUT_DIR = path.join(__dirname, "..", "review", "before-after-fix");
const ASSETS_DIR = path.join(__dirname, "test-assets", "화장품-확장", "세럼");

async function buildSideBySide(beforePath: string, afterPath: string, outPath: string) {
  const before = sharp(beforePath);
  const after = sharp(afterPath);
  const [bMeta, aMeta] = await Promise.all([before.metadata(), after.metadata()]);
  const width = Math.max(bMeta.width ?? 430, aMeta.width ?? 430);
  const height = Math.max(bMeta.height ?? 800, aMeta.height ?? 800);
  const gap = 16;
  const canvasW = width * 2 + gap;

  const [bBuf, aBuf] = await Promise.all([
    before.resize({ width, height, fit: "contain", background: "#faf8f3" }).png().toBuffer(),
    after.resize({ width, height, fit: "contain", background: "#faf8f3" }).png().toBuffer(),
  ]);

  await sharp({
    create: {
      width: canvasW,
      height: height + 48,
      channels: 4,
      background: "#faf8f3",
    },
  })
    .composite([
      { input: bBuf, left: 0, top: 24 },
      { input: aBuf, left: width + gap, top: 24 },
    ])
    .png()
    .toFile(outPath);
}

async function main() {
  if (process.env.FORCE_REGENERATE !== "true") {
    console.warn(
      "⚠️  FORCE_REGENERATE=true 가 설정되지 않았습니다. 서버 .env.local 도 확인하세요.",
    );
  }

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("로그인 세션 없음. npx tsx scripts/save-login-state.ts");
  }
  if (!fs.existsSync(BEFORE_SRC)) {
    throw new Error(`이전 결과 없음: ${BEFORE_SRC}`);
  }

  const uploadImages = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .map((f) => path.join(ASSETS_DIR, f))
    .slice(0, 2);
  if (uploadImages.length === 0) {
    throw new Error(`사진 없음: ${ASSETS_DIR}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const beforeOut = path.join(OUTPUT_DIR, "before-result.png");
  fs.copyFileSync(BEFORE_SRC, beforeOut);
  console.log(`Before 복사: ${beforeOut}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", "히알루론 세럼");
  await page.fill("#price", "28900");
  await page.fill(
    "#wholesaleUrl",
    "원본 상품명: 히알루론산 세럼 / 핵심 스펙: 30ml, 무향, 워터리 제형 / 포인트: 속건조 케어, 산뜻한 마무리",
  );

  console.log("파이프라인 제출 — 서버 로그에서 [replicate] CALL / [prompt] 확인");
  await page.click('button[type="submit"]');

  const picker = page.locator('[data-testid="backdrop-picker"]');
  await picker.waitFor({ state: "visible", timeout: 420000 });
  await page.locator('[data-testid="backdrop-candidate-1"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="backdrop-confirm"]').click();

  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 480000 });
  await page.waitForTimeout(2000);

  const session = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (session) {
    fs.writeFileSync(path.join(OUTPUT_DIR, "session-after.json"), session, "utf8");
  }

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate(() => {
    document.querySelectorAll("[data-scroll-reveal]").forEach((el) => {
      const node = el as HTMLElement;
      node.style.opacity = "1";
      node.style.transform = "none";
    });
  });
  await page.waitForTimeout(800);

  const afterOut = path.join(OUTPUT_DIR, "after-result.png");
  await preview.screenshot({ path: afterOut });
  console.log(`After 저장: ${afterOut}`);

  const compareOut = path.join(OUTPUT_DIR, "compare-side-by-side.png");
  await buildSideBySide(beforeOut, afterOut, compareOut);
  console.log(`비교 저장: ${compareOut}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
