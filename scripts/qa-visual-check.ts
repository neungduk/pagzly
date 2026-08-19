// 카테고리별 저장 session.json으로 Playwright 시각 QA — 스크린샷·이미지 중복·콘솔 에러.
// 실행: npx tsx scripts/qa-visual-check.ts
// (dev 서버 BASE_URL 필요, 기본 http://localhost:3001)

import { chromium } from "playwright";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "review", "qa-screenshots");
const REPORT_PATH = path.join(ROOT, "review", "qa-report.md");
const SESSION_KEY = "pagzly-create-result";

type CategoryCase = {
  key: string;
  label: string;
  sessionPath: string;
};

const CASES: CategoryCase[] = [
  {
    key: "cosmetics",
    label: "화장품/뷰티",
    sessionPath: path.join(ROOT, "review", "final-approved", "session.json"),
  },
  {
    key: "electronics",
    label: "전자기기",
    sessionPath: path.join(ROOT, "review", "iteration", "전자기기", "session.json"),
  },
  {
    key: "living",
    label: "리빙/생활",
    sessionPath: path.join(ROOT, "review", "iteration", "리빙-소품", "session.json"),
  },
];

async function hashRemoteImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return crypto.createHash("md5").update(buf).digest("hex");
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const reportLines: string[] = [
    "# Playwright 시각 QA 리포트",
    "",
    `생성: ${new Date().toISOString()}`,
    `BASE_URL: ${BASE_URL}`,
    "",
  ];

  let totalErrors = 0;

  for (const testCase of CASES) {
    reportLines.push(`## ${testCase.label} (\`${testCase.key}\`)`, "");

    if (!fs.existsSync(testCase.sessionPath)) {
      reportLines.push(`- **상태:** SKIP — session 없음 (\`${testCase.sessionPath}\`)`, "");
      continue;
    }

    const sessionRaw = fs.readFileSync(testCase.sessionPath, "utf8");
    const session = JSON.parse(sessionRaw) as { imageUrls?: string[]; productName?: string };
    const consoleErrors: string[] = [];
    const failedImages: string[] = [];

    const page = await browser.newPage({
      viewport: { width: 430, height: 900 },
      deviceScaleFactor: 2,
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
    page.on("response", (res) => {
      if (res.request().resourceType() === "image" && res.status() >= 400) {
        failedImages.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ([key, raw]) => {
        sessionStorage.setItem(key, raw);
      },
      [SESSION_KEY, sessionRaw] as const,
    );
    await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });

    const preview = page.locator('[data-testid="detail-preview"]');
    await preview.waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(1200);
    await freezeDetailScrollReveal(page);
    await page.waitForTimeout(300);

    const screenshotPath = path.join(OUTPUT_DIR, `${testCase.key}-full.png`);
    await preview.screenshot({ path: screenshotPath });

    const imgSrcs = await page.locator('[data-testid="detail-preview"] img[src]').evaluateAll(
      (nodes) => nodes.map((n) => (n as HTMLImageElement).src).filter(Boolean),
    );

    const hashMap = new Map<string, string[]>();
    for (const src of imgSrcs) {
      let hash: string | null = null;
      if (src.startsWith("data:")) {
        const b64 = src.split(",")[1] ?? "";
        hash = crypto.createHash("md5").update(b64).digest("hex");
      } else {
        hash = await hashRemoteImage(src);
      }
      if (!hash) continue;
      const list = hashMap.get(hash) ?? [];
      list.push(src.slice(0, 80));
      hashMap.set(hash, list);
    }

    const duplicates = [...hashMap.entries()].filter(([, urls]) => urls.length > 1);
    const sectionUrls = session.imageUrls ?? [];
    const sectionHashes = new Set<string>();
    for (const url of sectionUrls) {
      const h = await hashRemoteImage(url);
      if (h) sectionHashes.add(h);
    }
    const sectionUnique = sectionHashes.size;
    const sectionDistinctOk =
      sectionUrls.length <= 1 || sectionUnique === sectionUrls.length;

    const caseErrors = consoleErrors.length + failedImages.length;
    totalErrors += caseErrors;

    reportLines.push(
      `- **스크린샷:** \`review/qa-screenshots/${testCase.key}-full.png\``,
      `- **렌더 img 태그:** ${imgSrcs.length}개`,
      `- **섹션 imageUrls 고유 해시:** ${sectionUnique}/${sectionUrls.length} → ${sectionDistinctOk ? "PASS" : "FAIL"}`,
      `- **DOM img 해시 중복:** ${duplicates.length === 0 ? "없음 (PASS)" : `${duplicates.length}건 (WARN)`}`,
    );

    if (duplicates.length > 0) {
      for (const [hash, urls] of duplicates.slice(0, 3)) {
        reportLines.push(`  - hash \`${hash.slice(0, 8)}…\` ×${urls.length}`);
      }
    }

    reportLines.push(
      `- **콘솔 에러:** ${consoleErrors.length === 0 ? "없음 (PASS)" : consoleErrors.slice(0, 5).join("; ")}`,
      `- **이미지 로드 실패:** ${failedImages.length === 0 ? "없음 (PASS)" : failedImages.slice(0, 5).join("; ")}`,
      `- **종합:** ${caseErrors === 0 && sectionDistinctOk ? "PASS" : "WARN/FAIL"}`,
      "",
    );

    await page.close();
  }

  reportLines.push("---", "", `**전체 콘솔/이미지 에러:** ${totalErrors}건`, "");

  fs.writeFileSync(REPORT_PATH, reportLines.join("\n"), "utf8");
  console.log(`리포트 저장: ${REPORT_PATH}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
