import { chromium } from "playwright";
import path from "path";
import fs from "fs";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.goto("http://localhost:3000/dev/detail-preview", { waitUntil: "networkidle" });

  await page.getByTestId("tab-edit").click();
  await page.waitForTimeout(200);
  const editInput = page.locator('input[type="text"]').first();
  const hadInput = (await editInput.count()) > 0;
  if (hadInput) {
    await editInput.fill("인라인 수정 테스트 헤드라인");
  }
  await page.getByRole("button", { name: "저장" }).click();
  const saveToast = await page.getByText("수정 내용이 저장되었습니다.").isVisible();

  await page.getByTestId("tab-ai").click();
  await page.getByTestId("ai-submit").click();
  const emptyGuard = await page
    .getByText("빈 상태에서는 AI를 호출하지 않습니다")
    .isVisible();

  await page.getByTestId("tab-upload").click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "원클릭 업로드" }).click(),
  ]);
  await fileChooser.setFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("nope"),
  });
  await page.waitForTimeout(400);
  const typeError = await page.getByText("JPG, PNG 파일만 업로드할 수 있습니다.").isVisible();

  const oversized = Buffer.alloc(8 * 1024 * 1024 + 10, 1);
  const [overChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "원클릭 업로드" }).click(),
  ]);
  await overChooser.setFiles({
    name: "big.jpg",
    mimeType: "image/jpeg",
    buffer: oversized,
  });
  await page.waitForTimeout(400);
  const sizeError = await page.getByText("이미지는 8MB 이하여야 합니다.").isVisible();

  fs.mkdirSync("review", { recursive: true });
  await page.screenshot({
    path: path.join("review", "layout-cycle-actions.png"),
    fullPage: true,
  });

  const result = { saveToast, emptyGuard, typeError, sizeError, hadInput };
  console.log(JSON.stringify(result));
  if (!saveToast || !emptyGuard || !typeError || !sizeError || !hadInput) {
    throw new Error(`action bar checks failed: ${JSON.stringify(result)}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
