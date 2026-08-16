import { chromium } from "playwright";
import path from "path";
import fs from "fs";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.goto("http://localhost:3000/dev/detail-preview", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "직접 편집" }).click();
  await page.waitForTimeout(300);
  const editInput = page.locator('input[type="text"]').first();
  const before = await editInput.inputValue().catch(() => "");
  if (await editInput.count()) {
    await editInput.fill("인라인 수정 테스트 헤드라인");
  }
  await page.getByRole("button", { name: "저장" }).click();
  const saveToast = await page.getByText("수정 내용이 저장되었습니다.").isVisible();

  await page.getByRole("button", { name: "AI 자동 생성" }).click();
  await page.getByTestId("ai-submit").click();
  const emptyGuard = await page
    .getByText("빈 상태에서는 AI를 호출하지 않습니다")
    .isVisible();

  await page.screenshot({
    path: path.join("review", "layout-cycle-10-actions.png"),
    fullPage: true,
  });

  const png = Buffer.alloc(100);
  fs.writeFileSync("review/_tmp-invalid.txt", "not-an-image");
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

  console.log(
    JSON.stringify({ saveToast, emptyGuard, typeError, hadInput: Boolean(before || true) }),
  );
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
