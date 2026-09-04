/**
 * 116차 — runDetailCopyPipeline 실호출 샘플 (텍스트만, 이미지 생성 없음)
 * 실행: npx tsx scripts/116cha-copy-pipeline-sample.ts
 */
import fs from "node:fs";
import path from "node:path";
import { runDetailCopyPipeline } from "../lib/copy-orchestrator/pipeline";
import { detectGenericCliches } from "../lib/copy-orchestrator/validate-copy";
import type { CopyProductInput, DetailPageCopy } from "../lib/copy-orchestrator/types";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

/** 개선 전 전형적 AI 상투 카피 (구 프롬프트가 자주 내던 패턴 재현용 픽스처) */
const BEFORE_FIXTURE: DetailPageCopy = {
  mainHeadline: "당신을 위한 완벽한 선택",
  subHeadline: "이제 고민은 그만, 새로운 시작이 여기 있습니다",
  problemStatement: "건조하고 칙칙한 피부 때문에 고민이셨나요?",
  solutionStatement: "드림글로우가 당신의 피부를 위한 특별한 솔루션을 선사합니다.",
  benefit: "놀라운 보습과 완벽한 마무리",
  feature: "카멜리아 에센스",
  featureDescription: "최고의 성분으로 완성한 미스트",
  socialProofPlaceholder: "[고객 후기 영역 — 실제 후기 연동 예정]",
  faq: [
    { question: "용량은요?", answer: "35mL입니다." },
    { question: "언제 쓰나요?", answer: "화장 위에도 사용하세요." },
  ],
  cta: "지금 바로 만나보세요",
  sections: [
    { type: "HERO", title: "완벽한 선택", body: "당신을 위한 미스트" },
    { type: "CTA", title: "시작", body: "오늘부터 달라집니다" },
  ],
  headline: "당신을 위한 완벽한 선택",
};

const PRODUCTS: CopyProductInput[] = [
  {
    productName: "글로위스트 드림글로우 카멜리아 에센스 미스트",
    category: "화장품/뷰티",
    brandName: "glowiest",
    description: "카멜리아 에센스를 담은 가벼운 미스트. 화장 위에도 산뜻하게.",
    keyFeatures: "카멜리아 추출물, 35mL, 가벼운 분사감, 화장 위 사용",
    ingredients: "카멜리아 추출물",
    certifications: null,
    targetCustomer: "20~30대 여성",
    price: 32000,
    productImageUrls: [],
  },
  {
    productName: "라이트 워터 히알루론 세럼",
    category: "화장품/뷰티",
    brandName: "PageLab Lab",
    description: "히알루론산 보습 세럼. 끈적임 적은 워터리 텍스처.",
    keyFeatures: "히알루론산, 워터리 텍스처, 아침·저녁 사용",
    ingredients: "히알루론산",
    certifications: null,
    targetCustomer: "수분 부족한 피부",
    price: 28000,
    productImageUrls: [],
  },
];

function fmtCopy(c: DetailPageCopy): string {
  return [
    `- mainHeadline (${[...c.mainHeadline].length}자): ${c.mainHeadline}`,
    `- subHeadline: ${c.subHeadline}`,
    `- cta: ${c.cta}`,
    `- benefit: ${c.benefit}`,
    `- feature: ${c.feature}`,
    `- featureDescription: ${c.featureDescription}`,
  ].join("\n");
}

async function main() {
  loadEnvLocal();
  // 텍스트 파이프라인만 — 이미지 TEST_MODE와 무관하지만 환경은 유지
  console.log(`[116] TEST_MODE=${process.env.TEST_MODE ?? "(unset)"}`);

  const lines: string[] = [
    "# 116차 — 카피 톤·리듬 샘플 (개선 전/후)",
    "",
    `생성: ${new Date().toISOString()}`,
    "",
    "## 개선 전 (구 프롬프트 전형 상투 픽스처)",
    "",
    "실제 구버전 API 출력은 보존되지 않아, 구 프롬프트가 유도하던 **전형적 클리셰 패턴**을 픽스처로 둡니다.",
    "",
    fmtCopy(BEFORE_FIXTURE),
    "",
    `클리셰 감지: ${detectGenericCliches(BEFORE_FIXTURE).join(" | ") || "(없음)"}`,
    "",
    "---",
    "",
  ];

  let totalCost = 0;

  for (const product of PRODUCTS) {
    console.log(`[116] pipeline: ${product.productName}`);
    const result = await runDetailCopyPipeline(product);
    totalCost += result.totalCostUsd;
    const cliches = detectGenericCliches(result.copy);
    const headlineLen = [...result.copy.mainHeadline].length;

    lines.push(`## 개선 후 — ${product.productName}`);
    lines.push("");
    lines.push(`copyTone: ${result.structure.copyTone}`);
    lines.push(`USP: ${result.structure.usps.join(" / ")}`);
    lines.push("");
    lines.push(fmtCopy(result.copy));
    lines.push("");
    lines.push(
      `mainHeadline 글자 수: ${headlineLen} (목표 ~25자)`,
    );
    lines.push(
      `클리셰 감지: ${cliches.join(" | ") || "(없음)"}`,
    );
    lines.push(
      `hallucinationWarnings: ${result.deepseek.hallucinationWarnings.join(" | ") || "(없음)"}`,
    );
    lines.push(
      `비용: Claude $${result.claude.claudeCostUsd.toFixed(4)} + DeepSeek $${result.deepseek.deepSeekCostUsd.toFixed(4)} = $${result.totalCostUsd.toFixed(4)}`,
    );
    lines.push("");
    lines.push("### sections (요약)");
    for (const s of result.copy.sections.slice(0, 6)) {
      lines.push(`- [${s.type}] ${s.title} — ${s.body.slice(0, 80)}${s.body.length > 80 ? "…" : ""}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push(`## 비용 합계`);
  lines.push("");
  lines.push(`**$${totalCost.toFixed(4)}** (상품 ${PRODUCTS.length}건, Claude 구조 + DeepSeek 카피)`);
  lines.push("");
  lines.push("## 육안 비교 요약");
  lines.push("");
  lines.push("| | 개선 전 픽스처 | 개선 후 |");
  lines.push("|--|--|--|");
  lines.push("| 헤드라인 | 상투·길거나 추상 | 위 샘플 mainHeadline 참조 |");
  lines.push("| 클리셰 | 다수 감지 | 샘플별 감지란 참조 |");
  lines.push("| copyTone | (없음/모호) | 구체 앵커 문자열 |");

  const out = path.join(process.cwd(), "review", "116cha-copy-samples.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`[116] wrote ${out}`);
  console.log(`[116] totalCost=$${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
