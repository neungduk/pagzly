// 저장된 로그인 세션으로 /create 폼을 자동으로 채워 제출하고,
// /create/result 페이지 전체를 스크린샷으로 저장한다.
//
// 실행: npx tsx scripts/capture-detail-page.ts <시도번호> [카테고리키] [상품명] [가격]
// 예:   npx tsx scripts/capture-detail-page.ts 1 화장품-뷰티
//       npx tsx scripts/capture-detail-page.ts 2 의류-패션 "오버핏 울 블렌드 코트" 129000
// 카테고리키 생략 시 화장품-뷰티. 상품명/가격 생략 시 CATEGORY_MAP 기본값 사용.
// 사진은 scripts/test-assets/<카테고리키>/ 폴더에서 읽는다 (CATEGORY_MAP 참고).
//
// ⚠️ 셀렉터(#productName 등)는 CreateProductForm.tsx의 실제 구조와
// 맞아야 합니다. 폼 구조가 바뀌면 이 스크립트도 같이 고쳐야 해요.

import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUTPUT_DIR = path.join(__dirname, "..", "review");
const TEST_ASSETS_ROOT = path.join(__dirname, "test-assets");

// 폴더명(윈도우 경로에 "/"를 쓸 수 없어 하이픈으로 대체) → 실제 select
// option 라벨(CreateProductForm.tsx CATEGORIES와 동일해야 함), 기본 가격.
const CATEGORY_MAP: Record<string, { label: string; price: string }> = {
  "화장품-뷰티": { label: "화장품/뷰티", price: "29900" },
  "의류-패션": { label: "의류/패션", price: "39900" },
  "식품": { label: "식품/건강기능식품", price: "19900" },
  "전자제품": { label: "전자제품", price: "89000" },
  "생활용품": { label: "생활용품", price: "24900" },
};

async function main() {
  const attemptNumber = process.argv[2] ?? "1";
  const categoryKey = process.argv[3] ?? "화장품-뷰티";
  const customProductName = process.argv[4];
  const customPrice = process.argv[5];
  const category = CATEGORY_MAP[categoryKey];

  if (!category) {
    throw new Error(
      `알 수 없는 카테고리키: ${categoryKey}. 사용 가능: ${Object.keys(CATEGORY_MAP).join(", ")}`,
    );
  }

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error(
      `로그인 세션이 없습니다. 먼저 실행하세요: npx tsx scripts/save-login-state.ts`,
    );
  }

  const testAssetsDir = path.join(TEST_ASSETS_ROOT, categoryKey);
  const testImages = fs.existsSync(testAssetsDir)
    ? fs
        .readdirSync(testAssetsDir)
        .filter((f) => /\.(jpe?g|png)$/i.test(f))
        .map((f) => path.join(testAssetsDir, f))
    : [];

  if (testImages.length === 0) {
    throw new Error(
      `scripts/test-assets/${categoryKey}/ 폴더에 테스트용 상품 사진(jpg/png)을 1장 이상 넣어주세요.`,
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/create`);

  // 카테고리 (페이지 첫 번째 select — 실제 구조와 다르면 조정 필요)
  await page.locator("select").first().selectOption({ label: category.label });

  // 사진 업로드
  await page.setInputFiles('input[type="file"]', testImages.slice(0, 5));

  // 상품 기본 정보
  await page.fill("#productName", customProductName ?? `테스트 상품 ${categoryKey} ${attemptNumber}`);
  await page.fill("#price", customPrice ?? category.price);

  // 제출
  await page.click('button[type="submit"]');
  // 화질 보정(clarity-upscaler)/flux-fill-dev 배경 생성 단계가 추가되면서
  // 파이프라인 총 소요 시간이 늘어나(2~3분대) 기존 180s로는 종종 타임아웃이
  // 나서 여유를 뒀다.
  await page.waitForURL(`${BASE_URL}/create/result`, { timeout: 240000 });
  await page.waitForTimeout(2000);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const outPath = path.join(OUTPUT_DIR, `attempt-${categoryKey}-${attemptNumber}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`저장됨: ${outPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
