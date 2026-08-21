/**
 * 화장품 확장 1종류 생성 + 스크린샷.
 * 실행: npx tsx scripts/capture-beauty-type.ts 세럼
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review", "iteration", "화장품-확장");
const ASSETS_ROOT = path.join(__dirname, "test-assets", "화장품-확장");

const TYPES: Record<
  string,
  { productName: string; price: string; wholesale: string }
> = {
  세럼: {
    productName: "히알루론 세럼",
    price: "28900",
    wholesale:
      "원본 상품명: 히알루론산 세럼 / 핵심 스펙: 30ml, 무향, 워터리 제형 / 포인트: 속건조 케어, 산뜻한 마무리",
  },
  크림: {
    productName: "무향 크림 모이스처라이저",
    price: "32900",
    wholesale:
      "원본 상품명: 히알루론 수분 크림 / 핵심 스펙: 50ml, 무향, 젤 제형 / 포인트: 속건조 케어, 산뜻한 마무리",
  },
  미스트: {
    productName: "쿨링 페이셜 미스트",
    price: "24900",
    wholesale:
      "원본 상품명: 민트 쿨링 미스트 / 핵심 스펙: 100ml, 무향, 스프레이 / 포인트: 즉각 쿨링, 산뜻한 수분",
  },
  클렌저: {
    productName: "약산성 폼 클렌저",
    price: "18900",
    wholesale:
      "원본 상품명: 약산성 폼 클렌저 / 핵심 스펙: 150ml, 무향, 부드러운 거품 / 포인트: 부드러운 세안, 당김 적음",
  },
  마스크팩: {
    productName: "나이트 슬리핑 마스크",
    price: "27900",
    wholesale:
      "원본 상품명: 나이트 슬리핑 마스크 / 핵심 스펙: 80ml, 무향, 크림 제형 / 포인트: 밤사이 보습, 부드러운 도포",
  },
};

async function main() {
  const typeKey = process.argv[2] ?? "세럼";
  const spec = TYPES[typeKey];
  if (!spec) {
    throw new Error(`알 수 없는 종류: ${typeKey}. 사용: ${Object.keys(TYPES).join(", ")}`);
  }
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("로그인 세션 없음. npx tsx scripts/save-login-state.ts");
  }

  const assetsDir = path.join(ASSETS_ROOT, typeKey);
  const uploadImages = fs
    .readdirSync(assetsDir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .map((f) => path.join(assetsDir, f))
    .slice(0, 3);
  if (uploadImages.length === 0) {
    throw new Error(`사진 없음: ${assetsDir}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/create`);
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"]', uploadImages);
  await page.fill("#productName", spec.productName);
  await page.fill("#price", spec.price);
  await page.fill("#wholesaleUrl", spec.wholesale);

  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 480000 });
  await page.waitForTimeout(2000);

  const session = await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"));
  if (session) {
    fs.writeFileSync(path.join(OUTPUT_DIR, `${typeKey}-session.json`), session, "utf8");
  }

  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(800);
  const cyclePath = path.join(OUTPUT_DIR, `cycle-01-${typeKey}.png`);
  await preview.screenshot({ path: cyclePath });
  console.log(`세션: ${path.join(OUTPUT_DIR, `${typeKey}-session.json`)}`);
  console.log(`스크린샷: ${cyclePath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
