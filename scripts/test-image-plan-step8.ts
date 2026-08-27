/**
 * STEP 8 — Claude Orchestrator → imagePlan → ImageRouter
 *
 * 상품 3종(화장품/식품/생활용품):
 *   1) Claude imagePlan (5~10)
 *   2) schema validation
 *   3) ImageRouter 생성 (기본: 상품당 첫 2장, STEP8_FULL=1 이면 전체)
 *
 * 실행:
 *   npx tsx scripts/download-sample-products.ts --only=beauty
 *   npx tsx scripts/download-sample-products.ts --only=food
 *   npx tsx scripts/download-sample-products.ts --only=home
 *   npx tsx scripts/test-image-plan-step8.ts
 *
 * STEP8_PLAN_ONLY=1 — Claude plan만 (ImageRouter 스킵)
 */
import fs from "fs";
import path from "path";
import {
  IMAGE_PLAN_MAX_ITEMS,
  IMAGE_PLAN_MIN_ITEMS,
  IMAGE_PLAN_TASK_TYPES,
  executeImagePlan,
  planImagesWithClaude,
  validateImagePlan,
  type ImagePlanProductInput,
} from "@/lib/image-router/orchestrator";
import { resetAllBudgets } from "@/lib/image-router/budget";

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

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

type Fixture = {
  id: string;
  label: string;
  file: string;
  product: Omit<ImagePlanProductInput, "productImageUrls">;
};

const FIXTURES: Fixture[] = [
  {
    id: "beauty",
    label: "화장품",
    file: "beauty.jpg",
    product: {
      productName: "글로우 세럼 30ml",
      category: "화장품/뷰티",
      brandName: "AURA LAB",
      description: "수분 광채 세럼. 민감 피부용 가벼운 텍스처.",
      keyFeatures: "히알루론산, 나이아신아마이드, 무향료",
      ingredients: "히알루론산, 글리세린, 판테놀",
      targetCustomer: "20~30대 여성",
      price: 32000,
    },
  },
  {
    id: "food",
    label: "식품",
    file: "food.jpg",
    product: {
      productName: "프로틴 쉐이크 바닐라 12팩",
      category: "식품/건강기능식품",
      brandName: "FITDAILY",
      description: "간편하게 마시는 고단백 쉐이크. 운동 후 간식.",
      keyFeatures: "단백질 20g, 저당, 휴대용 파우치",
      ingredients: "분리유청단백, 바닐라향",
      targetCustomer: "헬스·다이어트 관심층",
      price: 28900,
    },
  },
  {
    id: "home",
    label: "생활용품",
    file: "home.jpg",
    product: {
      productName: "세라믹 보울 세트 2P",
      category: "생활용품",
      brandName: "HOUSEFORM",
      description: "매트 화이트 식기. 전자레인지·식기세척기 가능.",
      keyFeatures: "내열 세라믹, 미니멀 디자인, 2개 세트",
      ingredients: "세라믹",
      targetCustomer: "홈카페·자취 생활자",
      price: 19800,
    },
  },
];

function resolveImagePath(file: string): string {
  const candidates = [
    path.join(process.cwd(), "test-assets", "sample-products", file),
    path.join(process.cwd(), "scripts", "test-assets", "sample-products", file),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    `이미지 없음: ${file}\n` +
      `  npx tsx scripts/download-sample-products.ts --only=${file.replace(".jpg", "")}`,
  );
}

function smokeValidateSchema() {
  console.log("\n=== schema smoke ===");
  const ok = validateImagePlan({
    imagePlan: Array.from({ length: 6 }, (_, i) => ({
      order: i + 1,
      taskType: i === 0 ? "HERO_PRODUCT" : "PRODUCT_ONLY",
      purpose: `목적 ${i + 1}`,
      prompt: `prompt ${i + 1}`,
      qualityLevel: i === 0 ? "PREMIUM" : "STANDARD",
      aspectRatio: "1:1",
    })),
  });
  assert(ok.imagePlan.length === 6, "6 items");

  let rejected = false;
  try {
    validateImagePlan({
      imagePlan: [
        {
          order: 1,
          taskType: "MADE_UP_TASK",
          purpose: "x",
          prompt: "y",
          qualityLevel: "STANDARD",
          aspectRatio: "1:1",
        },
      ],
    });
  } catch {
    rejected = true;
  }
  assert(rejected, "unknown taskType rejected");
  console.log("taskType enum lock OK —", IMAGE_PLAN_TASK_TYPES.length, "allowed");
}

async function main() {
  loadEnvLocal();
  process.env.IMAGE_JOB_STORE = "memory";
  resetAllBudgets();

  smokeValidateSchema();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\nSKIP E2E — ANTHROPIC_API_KEY 없음");
    console.log("STEP 8 schema OK, Claude E2E SKIPPED");
    process.exit(0);
  }

  const planOnly = process.env.STEP8_PLAN_ONLY === "1";
  const fullGen = process.env.STEP8_FULL === "1";
  const maxImages = fullGen ? IMAGE_PLAN_MAX_ITEMS : Number(process.env.STEP8_MAX_IMAGES ?? 2);

  const outRoot = path.join(
    process.cwd(),
    "scripts",
    "test-output",
    "image-plan-step8",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  fs.mkdirSync(outRoot, { recursive: true });

  const summaries: Array<{
    id: string;
    label: string;
    planCount: number;
    taskTypes: string[];
    claudeCost: number;
    imageCost: number;
    generated: number;
  }> = [];

  for (const fixture of FIXTURES) {
    console.log(`\n======== ${fixture.label} (${fixture.id}) ========`);
    const imagePath = resolveImagePath(fixture.file);
    console.log("image:", imagePath);

    const product: ImagePlanProductInput = {
      ...fixture.product,
      productImageUrls: [imagePath],
    };

    const { plan, claudeCostUsd, model } = await planImagesWithClaude(product);
    assert(
      plan.imagePlan.length >= IMAGE_PLAN_MIN_ITEMS &&
        plan.imagePlan.length <= IMAGE_PLAN_MAX_ITEMS,
      `plan length in ${IMAGE_PLAN_MIN_ITEMS}–${IMAGE_PLAN_MAX_ITEMS}`,
    );

    console.log(`Claude model=${model} cost=$${claudeCostUsd.toFixed(4)}`);
    console.log(`imagePlan (${plan.imagePlan.length}):`);
    for (const item of plan.imagePlan) {
      console.log(
        `  ${item.order}. [${item.taskType}] ${item.qualityLevel} ${item.aspectRatio} — ${item.purpose}`,
      );
      console.log(`     prompt: ${item.prompt.slice(0, 100)}${item.prompt.length > 100 ? "…" : ""}`);
    }

    const planPath = path.join(outRoot, `${fixture.id}-plan.json`);
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
    console.log("saved:", planPath);

    let imageCost = 0;
    let generated = 0;

    if (!planOnly) {
      const hasImageProvider =
        Boolean(process.env.FLUX_API_KEY || process.env.BFL_API_KEY || process.env.REPLICATE_API_TOKEN) ||
        Boolean(process.env.GOOGLE_AI_API_KEY) ||
        Boolean(process.env.KONTEXT_API_KEY);

      if (!hasImageProvider) {
        console.log("SKIP ImageRouter — no FLUX/Replicate/Gemini/Kontext key");
      } else {
        console.log(`\n→ ImageRouter (max ${maxImages} images)…`);
        const exec = await executeImagePlan({
          plan,
          productImageUrls: [imagePath],
          context: {
            userId: `step8-${fixture.id}`,
            draftToken: `step8-${fixture.id}`,
          },
          maxImages,
          resolution: "768",
          onItemStart: (item, index, total) => {
            console.log(`  [${index + 1}/${total}] ${item.taskType}…`);
          },
          onItemDone: ({ item, result }) => {
            console.log(
              `     → ${result.status} provider=${result.provider} cost=$${result.actualCost.toFixed(4)}`,
            );
            if (result.status !== "succeeded") {
              console.log(`     err: ${result.errorMessage ?? "-"}`);
            }
          },
        });
        imageCost = exec.totalImageCostUsd;
        generated = exec.succeeded;

        const resultsPath = path.join(outRoot, `${fixture.id}-results.json`);
        fs.writeFileSync(
          resultsPath,
          JSON.stringify(
            {
              succeeded: exec.succeeded,
              failed: exec.failed,
              totalImageCostUsd: exec.totalImageCostUsd,
              items: exec.items.map(({ item, result }) => ({
                order: item.order,
                taskType: item.taskType,
                status: result.status,
                provider: result.provider,
                model: result.model,
                actualCost: result.actualCost,
                outputUrls: result.outputUrls,
                errorMessage: result.errorMessage,
              })),
            },
            null,
            2,
          ),
          "utf8",
        );
        console.log("saved:", resultsPath);
      }
    } else {
      console.log("STEP8_PLAN_ONLY=1 — ImageRouter skipped");
    }

    summaries.push({
      id: fixture.id,
      label: fixture.label,
      planCount: plan.imagePlan.length,
      taskTypes: plan.imagePlan.map((i) => i.taskType),
      claudeCost: claudeCostUsd,
      imageCost,
      generated,
    });
  }

  console.log("\n=== STEP 8 SUMMARY ===");
  for (const s of summaries) {
    console.log(
      `${s.label}: ${s.planCount} plans | types=[${s.taskTypes.join(", ")}] | ` +
        `claude=$${s.claudeCost.toFixed(4)} | images=${s.generated} ($${s.imageCost.toFixed(4)})`,
    );
  }
  console.log("output dir:", outRoot);
  console.log("\nSTEP 8 PASSED");
}

main().catch((err) => {
  console.error("STEP 8 FAILED:", err);
  process.exit(1);
});
