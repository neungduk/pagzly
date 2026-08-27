/**
 * STEP 9 — Claude structure → DeepSeek copy (no HTML)
 *
 * 상품 3종: 화장품 / 식품 / 생활용품
 *
 * npx tsx scripts/test-copy-step9.ts
 */
import fs from "fs";
import path from "path";
import {
  COPY_SECTION_TYPES,
  detectCopyHallucinations,
  runDetailCopyPipeline,
  validateDetailPageCopy,
  type CopyProductInput,
} from "@/lib/copy-orchestrator";

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

function resolveImage(file: string): string | undefined {
  const candidates = [
    path.join(process.cwd(), "test-assets", "sample-products", file),
    path.join(process.cwd(), "scripts", "test-assets", "sample-products", file),
  ];
  return candidates.find((c) => fs.existsSync(c));
}

const FIXTURES: Array<{
  id: string;
  label: string;
  imageFile: string;
  product: CopyProductInput;
}> = [
  {
    id: "beauty",
    label: "화장품",
    imageFile: "beauty.jpg",
    product: {
      productName: "글로우 세럼 30ml",
      category: "화장품/뷰티",
      brandName: "AURA LAB",
      description: "수분 광채 세럼. 민감 피부용 가벼운 텍스처.",
      keyFeatures: "히알루론산, 나이아신아마이드, 무향료",
      ingredients: "히알루론산, 글리세린, 판테놀",
      certifications: null,
      targetCustomer: "20~30대 여성",
      price: 32000,
    },
  },
  {
    id: "food",
    label: "식품",
    imageFile: "food.jpg",
    product: {
      productName: "프로틴 쉐이크 바닐라 12팩",
      category: "식품/건강기능식품",
      brandName: "FITDAILY",
      description: "간편하게 마시는 고단백 쉐이크. 운동 후 간식.",
      keyFeatures: "단백질 20g, 저당, 휴대용 파우치",
      ingredients: "분리유청단백, 바닐라향",
      certifications: null,
      targetCustomer: "헬스·다이어트 관심층",
      price: 28900,
    },
  },
  {
    id: "home",
    label: "생활용품",
    imageFile: "home.jpg",
    product: {
      productName: "세라믹 보울 세트 2P",
      category: "생활용품",
      brandName: "HOUSEFORM",
      description: "매트 화이트 식기. 전자레인지·식기세척기 가능.",
      keyFeatures: "내열 세라믹, 미니멀 디자인, 2개 세트",
      ingredients: "세라믹",
      certifications: null,
      targetCustomer: "홈카페·자취 생활자",
      price: 19800,
    },
  },
];

function smokeSchema() {
  console.log("\n=== schema smoke ===");
  const ok = validateDetailPageCopy({
    mainHeadline: "테스트 헤드라인",
    subHeadline: "서브",
    problemStatement: "문제",
    solutionStatement: "해결",
    benefit: "혜택",
    feature: "특징",
    featureDescription: "특징 설명",
    socialProofPlaceholder: "[고객 후기 영역 — 실제 후기 연동 예정]",
    faq: [
      { question: "용량은?", answer: "30ml입니다." },
      { question: "무향인가요?", answer: "무향료입니다." },
    ],
    cta: "지금 확인하기",
    sections: [
      { type: "HERO", title: "히어로", body: "본문" },
      { type: "PROBLEM", title: "고민", body: "본문" },
    ],
  });
  assert(ok.mainHeadline.length > 0, "headline");

  let rejected = false;
  try {
    validateDetailPageCopy({
      ...ok,
      sections: [{ type: "MADE_UP", title: "x", body: "y" }],
    });
  } catch {
    rejected = true;
  }
  assert(rejected, "unknown section type rejected");

  const hallu = detectCopyHallucinations(
    {
      ...ok,
      solutionStatement: "임상 실험으로 입증된 치료 효과 100%",
      socialProofPlaceholder: "김OO 님: \"정말 좋아요 별점 5점\"",
    },
    FIXTURES[0]!.product,
  );
  assert(hallu.length > 0, "hallucination detector fires");
  console.log("schema + hallucination checks OK — sections:", COPY_SECTION_TYPES.length);
}

async function main() {
  loadEnvLocal();
  smokeSchema();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\nSKIP E2E — ANTHROPIC_API_KEY 없음");
    process.exit(0);
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log("\nSKIP E2E — DEEPSEEK_API_KEY 없음");
    process.exit(0);
  }

  const outRoot = path.join(
    process.cwd(),
    "scripts",
    "test-output",
    "copy-step9",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  fs.mkdirSync(outRoot, { recursive: true });

  for (const fixture of FIXTURES) {
    console.log(`\n======== ${fixture.label} (${fixture.id}) ========`);
    const image = resolveImage(fixture.imageFile);
    const product: CopyProductInput = {
      ...fixture.product,
      productImageUrls: image ? [image] : [],
    };
    if (image) console.log("image:", image);
    else console.log("image: (none — text-only structure)");

    const result = await runDetailCopyPipeline(product);

    console.log("Claude structure sections:");
    for (const s of result.structure.pageStructure) {
      console.log(`  ${s.order}. [${s.type}] ${s.purpose}`);
    }
    console.log("USPs:", result.structure.usps.join(" | "));

    console.log("\nDeepSeek copy:");
    console.log("  mainHeadline:", result.copy.mainHeadline);
    console.log("  subHeadline:", result.copy.subHeadline);
    console.log("  problem:", result.copy.problemStatement.slice(0, 80));
    console.log("  solution:", result.copy.solutionStatement.slice(0, 80));
    console.log("  benefit:", result.copy.benefit.slice(0, 80));
    console.log("  feature:", result.copy.feature, "/", result.copy.featureDescription.slice(0, 60));
    console.log("  socialProof:", result.copy.socialProofPlaceholder);
    console.log("  cta:", result.copy.cta);
    console.log("  faq:", result.copy.faq.length);
    console.log("  sections:");
    for (const s of result.copy.sections) {
      console.log(`    [${s.type}] ${s.title}`);
    }

    assert(!/<html|<div|<span/i.test(JSON.stringify(result.copy)), "no HTML in copy");

    if (result.deepseek.hallucinationWarnings.length > 0) {
      console.warn("  hallucination warnings:", result.deepseek.hallucinationWarnings);
    } else {
      console.log("  hallucination check: clean");
    }

    console.log(
      `cost: claude=$${result.claude.claudeCostUsd.toFixed(4)} deepseek=$${result.deepseek.deepSeekCostUsd.toFixed(4)} total=$${result.totalCostUsd.toFixed(4)}`,
    );

    fs.writeFileSync(
      path.join(outRoot, `${fixture.id}-structure.json`),
      JSON.stringify(result.structure, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(outRoot, `${fixture.id}-copy.json`),
      JSON.stringify(result.copy, null, 2),
      "utf8",
    );
  }

  console.log("\noutput:", outRoot);
  console.log("\nSTEP 9 PASSED");
}

main().catch((err) => {
  console.error("STEP 9 FAILED:", err);
  process.exit(1);
});
