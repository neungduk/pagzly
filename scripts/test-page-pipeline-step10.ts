/**
 * STEP 10 — Unified page generation E2E (one product)
 *
 * npx tsx scripts/test-page-pipeline-step10.ts
 *
 * Env knobs:
 *   PAGE_PIPELINE_MAX_IMAGES=1   (default 1 for cost)
 *   PAGE_PIPELINE_BUDGET_USD=1.5
 *   PAGE_PIPELINE_PRODUCT=beauty|food|home
 */
import fs from "fs";
import path from "path";
import {
  PAGE_GENERATION_PROGRESS,
  runPageGenerationPipeline,
  type PageGenerationJob,
} from "@/lib/page-pipeline";

function loadEnvLocal() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1]!.trim();
      const val = m[2]!.trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

function resolveImage(file: string): string {
  const candidates = [
    path.join(process.cwd(), "test-assets", "sample-products", file),
    path.join(process.cwd(), "scripts", "test-assets", "sample-products", file),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    throw new Error(
      `이미지 없음: ${file}\n  npx tsx scripts/download-sample-products.ts --only=${file.replace(".jpg", "")}`,
    );
  }
  return found;
}

const PRODUCTS = {
  beauty: {
    id: "beauty",
    file: "beauty.jpg",
    productName: "글로우 세럼 30ml",
    category: "화장품/뷰티",
    brandName: "AURA LAB",
    description: "수분 광채 세럼. 민감 피부용 가벼운 텍스처.",
    keyFeatures: "히알루론산, 나이아신아마이드, 무향료",
    ingredients: "히알루론산, 글리세린, 판테놀",
    targetCustomer: "20~30대 여성",
    price: 32000,
  },
  food: {
    id: "food",
    file: "food.jpg",
    productName: "프로틴 쉐이크 바닐라 12팩",
    category: "식품/건강기능식품",
    brandName: "FITDAILY",
    description: "간편하게 마시는 고단백 쉐이크. 운동 후 간식.",
    keyFeatures: "단백질 20g, 저당, 휴대용 파우치",
    ingredients: "분리유청단백, 바닐라향",
    targetCustomer: "헬스·다이어트 관심층",
    price: 28900,
  },
  home: {
    id: "home",
    file: "home.jpg",
    productName: "세라믹 보울 세트 2P",
    category: "생활용품",
    brandName: "HOUSEFORM",
    description: "매트 화이트 식기. 전자레인지·식기세척기 가능.",
    keyFeatures: "내열 세라믹, 미니멀 디자인, 2개 세트",
    ingredients: "세라믹",
    targetCustomer: "홈카페·자취 생활자",
    price: 19800,
  },
} as const;

async function main() {
  loadEnvLocal();

  const key = (process.env.PAGE_PIPELINE_PRODUCT ?? "beauty") as keyof typeof PRODUCTS;
  const fixture = PRODUCTS[key] ?? PRODUCTS.beauty;
  const imagePath = resolveImage(fixture.file);
  const maxImages = Number(process.env.PAGE_PIPELINE_MAX_IMAGES ?? 1);
  const budgetUsd = Number(process.env.PAGE_PIPELINE_BUDGET_USD ?? 1.5);

  console.log("=== STEP 10 E2E page pipeline ===");
  console.log("product:", fixture.productName, `(${fixture.id})`);
  console.log("image:", imagePath);
  console.log("maxImages:", maxImages, "budgetUsd:", budgetUsd);
  console.log("progress map:", PAGE_GENERATION_PROGRESS);

  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY missing");

  const outRoot = path.join(
    process.cwd(),
    "scripts",
    "test-output",
    "page-pipeline-step10",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );

  const statusLog: Array<{ status: string; progress: number; spent: number }> = [];

  const job: PageGenerationJob = await runPageGenerationPipeline({
    product: {
      productName: fixture.productName,
      category: fixture.category,
      brandName: fixture.brandName,
      description: fixture.description,
      keyFeatures: fixture.keyFeatures,
      ingredients: fixture.ingredients,
      targetCustomer: fixture.targetCustomer,
      price: fixture.price,
      productImageUrls: [imagePath],
    },
    maxImages,
    budgetUsd,
    outputDir: outRoot,
    onStatusChange: (j) => {
      statusLog.push({ status: j.status, progress: j.progress, spent: j.spentUsd });
      console.log(`  → ${j.status} ${j.progress}% (spent $${j.spentUsd.toFixed(4)})`);
    },
  });

  console.log("\n======== REPORT ========");
  console.log("job status:", job.status);
  if (job.status !== "COMPLETED" || !job.pageData) {
    console.error("error:", job.errorMessage);
    console.error("warnings:", job.warnings);
    process.exit(1);
  }

  const meta = job.pageData.metadata;
  const bd = meta.costBreakdown;

  console.log("전체 생성 시간:", `${(meta.totalGenerationTimeMs / 1000).toFixed(1)}s`);
  console.log("생성된 이미지 수:", meta.totalImageCount);
  console.log("재생성 횟수:", meta.totalRetryCount);
  console.log("사용 모델:", meta.modelsUsed.join(", "));
  console.log("이미지 providers:", meta.imageProvidersUsed.join(", ") || "(none)");
  console.log("각 모델별 비용:");
  console.log(`  Claude structure: $${bd.claudeStructureUsd.toFixed(4)}`);
  console.log(`  Claude imagePlan: $${bd.claudeImagePlanUsd.toFixed(4)}`);
  console.log(`  DeepSeek copy:    $${bd.deepSeekCopyUsd.toFixed(4)}`);
  console.log(`  Images:           $${bd.imagesUsd.toFixed(4)}`);
  console.log(`  Regenerate:       $${bd.regenerateUsd.toFixed(4)}`);
  console.log("총 AI 원가:", `$${meta.totalAiCostUsd.toFixed(4)}`);
  console.log("qualityScores:", meta.qualityScores.map((s) => s.toFixed(3)).join(", ") || "(n/a)");
  console.log("최종 상세페이지 URL:", job.renderedHtmlUrl);
  console.log("HTML path:", job.renderedHtmlPath);
  console.log("오류 여부:", job.errorMessage ? `YES — ${job.errorMessage}` : "없음");
  if (meta.warnings.length) {
    console.log("warnings:");
    for (const w of meta.warnings) console.log("  -", w);
  }
  console.log("status trail:", statusLog.map((s) => s.status).join(" → "));
  console.log("\nSTEP 10 PASSED");
}

main().catch((err) => {
  console.error("STEP 10 FAILED:", err);
  process.exit(1);
});
