/**
 * 상세페이지 업그레이드 로컬 검증 — 외부 AI API 호출 없음 ($0).
 *
 * 실행:
 *   npx tsx scripts/verify-detail-upgrade.ts
 *   npx tsx scripts/verify-detail-upgrade.ts --session review/final-approved/session.json
 *   npx tsx scripts/verify-detail-upgrade.ts --tsc
 *
 * 산출:
 *   review/upgrade-sim/output.html
 *   review/upgrade-sim/report.md
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { assignDistinctSectionImages } from "../lib/assign-section-images";
import { getCategoryTheme } from "../lib/category-theme";
import { enrichSectionsWithProductMetadata } from "../lib/enrich-product-sections";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { scoreDetailPageStructure } from "../lib/detail-page-score";
import { scoreDetailPageExport } from "../lib/detail-export-score";
import { extractTrustChips } from "../lib/extract-trust-chips";
import { countLifestyleShotsToGenerate, getLifestyleShotConfig } from "../lib/lifestyle-shot-config";
import { computeStudioCompositeLimit } from "../lib/lifestyle-shot-planner";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "review", "upgrade-sim");

const FIXTURE_IMAGE_URLS = [
  "/iteration-fixtures/01.jpg",
  "/iteration-fixtures/02.jpg",
  "/iteration-fixtures/03.jpg",
  "/iteration-fixtures/04.jpg",
];

/** Page Maker §10 모듈 커버리지 검증용 풀 픽스처 */
const BUILTIN_SECTIONS: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "속건조, 오늘부터 덜 신경 쓰세요",
    subheadline: "히알루론 수분 크림",
    imageIndex: 0,
    badge: "무향",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "브랜드가 지키는 한 가지",
    body: "복잡한 루틴이 아니라, 매일 쓸 수 있는 수분 레이어를 목표로 만들었습니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "핵심 포인트",
    items: ["가벼운 젤", "속당김 케어", "무향", "데일리"],
  },
  {
    type: "target_persona",
    slot: "target_persona",
    heading: "이런 분께",
    personas: ["속건조가 고민인 분", "무향을 선호하는 분", "메이크업 전 케어"],
  },
  {
    type: "image_text",
    slot: "feature_callout",
    layout: "callout",
    callout: "수분 레이어",
    heading: "POINT",
    body: "메이크업 전에도 부담 없이 레이어링할 수 있는 가벼운 제형입니다.",
    imageIndex: 1,
    imagePosition: "left",
  },
  {
    type: "image_text",
    slot: "ingredient_highlight",
    heading: "히알루론산",
    body: "겉만 번들거리지 않고 속당김을 케어하는 데일리 수분 레이어입니다.",
    imageIndex: 2,
    imagePosition: "right",
  },
  {
    type: "highlight_box",
    slot: "highlight_box",
    heading: "3가지 강점",
    cards: [
      { title: "수분", body: "히알루론산으로 속당김 케어" },
      { title: "가벼움", body: "끈적임 없는 젤 제형" },
      { title: "무향", body: "향료 없이 데일리 사용" },
    ],
  },
  {
    type: "step_card",
    slot: "step_card",
    heading: "사용법",
    steps: [
      { title: "세안", body: "세안 후 피부결을 정리합니다.", imageIndex: 2 },
      { title: "도포", body: "볼·이마에 소량 올립니다.", imageIndex: 3 },
    ],
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "실제 사용 장면",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "stat_infographic",
    slot: "stat_infographic",
    heading: "핵심 수치",
    metrics: [
      { label: "수분감", value: "가벼운 젤", style: "number" },
      { label: "무향", value: "100%", percent: 100, style: "bar", basis: "self_assessed" },
    ],
    barAccent: "emphasis",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "상품 정보",
    rows: [{ label: "용량", value: "50ml" }],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      { question: "민감성 피부도 사용 가능한가요?", answer: "개인차가 있으니 패치 테스트 후 사용해 주세요." },
      { question: "메이크업 전에 쓸 수 있나요?", answer: "얇게 레이어링하면 메이크업 전 사용에 적합합니다." },
    ],
  },
  {
    type: "caution",
    slot: "caution",
    heading: "주의사항",
    body: "눈 주위를 피하고, 이상 반응 시 사용을 중단해 주세요.",
  },
  {
    type: "image_text",
    slot: "customer_scenario",
    heading: "아침 루틴",
    body: "출근 전 3분, 속당김 없이 메이크업을 시작하세요.",
    imageIndex: 3,
    imagePosition: "left",
  },
  {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송·교환 안내",
    rows: [
      { label: "배송비", value: "구매 금액·지역에 따라 달라질 수 있습니다" },
      { label: "배송기간", value: "판매자 확인 필요" },
      { label: "교환·환불", value: "판매자 정책을 확인해주세요" },
    ],
  },
  {
    type: "ai_disclosure",
    slot: "ai_disclosure",
    heading: "AI 생성 고지",
    body: "이 상세페이지의 텍스트·이미지 일부는 AI가 생성·보정했습니다.",
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 29900,
    badges: ["무향", "당일발송", "KC 인증"],
  },
];

type SessionShape = {
  productName?: string;
  brandName?: string | null;
  category?: string;
  price?: number;
  ingredients?: string | null;
  certifications?: string | null;
  imageUrls?: string[];
  imagePaths?: string[];
  sections?: DetailSection[];
  generated?: { sections?: DetailSection[] };
};

function parseArgs(): { sessionPath?: string; runTsc: boolean } {
  const args = process.argv.slice(2);
  let sessionPath: string | undefined;
  let runTsc = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--session" && args[i + 1]) {
      sessionPath = args[i + 1]!;
      i += 1;
    } else if (args[i] === "--tsc") {
      runTsc = true;
    }
  }
  return { sessionPath, runTsc };
}

function loadSession(filePath: string): SessionShape {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as SessionShape;
}

function countSpecRows(sections: DetailSection[]): number {
  return sections
    .filter((s) => s.type === "spec_table")
    .reduce((n, s) => n + (s.type === "spec_table" ? s.rows.length : 0), 0);
}

function main() {
  const { sessionPath, runTsc } = parseArgs();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const lines: string[] = [
    "# 상세페이지 업그레이드 로컬 검증",
    "",
    `시각: ${new Date().toISOString()}`,
    "",
    "**외부 AI API 호출: 없음 ($0)**",
    "",
  ];

  if (runTsc) {
    try {
      execSync("npx tsc --noEmit", { cwd: ROOT, stdio: "pipe" });
      lines.push("- [x] `tsc --noEmit` 통과");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lines.push("- [ ] `tsc --noEmit` 실패", "", "```", msg.slice(0, 2000), "```");
    }
    lines.push("");
  }

  const session = sessionPath ? loadSession(path.resolve(ROOT, sessionPath)) : null;
  const category = session?.category ?? "화장품/뷰티";
  const productName = session?.productName ?? "히알루론 수분 크림";
  const brandName = session?.brandName ?? "테스트 브랜드";
  const price = session?.price ?? 29900;
  const imageUrls =
    session?.imageUrls?.length ? session.imageUrls : FIXTURE_IMAGE_URLS;
  const imagePaths =
    session?.imagePaths ??
    imageUrls.map((_, i) => `fixture/${i}.jpg`);
  const baseSections =
    session?.generated?.sections ??
    session?.sections ??
    BUILTIN_SECTIONS;

  lines.push(`- 데이터: ${sessionPath ?? "내장 픽스처"}`);
  lines.push(`- 카테고리: ${category}`);
  lines.push(`- 이미지: ${imageUrls.length}장`);
  lines.push("");

  const lifestyleCfg = getLifestyleShotConfig();
  const lifestyleCount = countLifestyleShotsToGenerate(imageUrls.length, lifestyleCfg);
  const studioLimit = computeStudioCompositeLimit(imageUrls.length);

  lines.push("## 파이프라인 설정 (비용 없이 숫자만 확인)", "");
  lines.push(`- 스튜디오 합성 장수: ${studioLimit}/${imageUrls.length}`);
  lines.push(`- 일상샷 생성 장수(설정): ${lifestyleCount} (TEST_MODE면 실제 0장)`);
  lines.push(`- 일상샷 품질: ${lifestyleCfg.qualityLevel}, max=${lifestyleCfg.maxCount}`);
  lines.push("");

  let sections = enrichSectionsWithProductMetadata(baseSections, {
    category,
    brandName,
    certifications: session?.certifications ?? "KC 인증",
    ingredients: session?.ingredients ?? "히알루론산, 판테놀",
    price,
  });

  sections = assignDistinctSectionImages(sections, imageUrls.length, {
    category,
    imagePaths,
    imageRoles: imagePaths.map((p) =>
      p.includes("lifestyle-ai") ? "lifestyle" : "detail",
    ),
  });

  const specRows = countSpecRows(sections);
  const html = buildDetailPageHtml({
    productName,
    brandName,
    price,
    category,
    sections,
    imageUrls,
    theme: getCategoryTheme(category),
    description: "로컬 검증용 설명",
    features: ["수분", "무향"],
    certifications: session?.certifications ?? null,
  });
  const pageScore = scoreDetailPageStructure(sections, category);
  const exportScore = scoreDetailPageExport(html, sections);
  const trustChips = extractTrustChips(sections);

  const htmlPath = path.join(OUT_DIR, "output.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  lines.push("## 렌더·후처리 검증", "");
  lines.push(`- [x] 섹션 수: ${sections.length}`);
  lines.push(`- [x] INFO(spec_table) 행 합계: ${specRows}`);
  lines.push(`- [x] 신뢰 스트립 칩: ${trustChips.length}개 (${trustChips.join(", ")})`);
  lines.push(`- [x] HTML export: \`${path.relative(ROOT, htmlPath)}\` (${html.length.toLocaleString()} bytes)`);
  lines.push(`- [x] JSON-LD 포함: ${html.includes("application/ld+json") ? "yes" : "no"}`);
  lines.push(`- [x] SEO 텍스트 블록: ${html.includes("pagzly-seo-text") ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Page Maker 구조 점수 (로컬 루브릭)", "");
  lines.push(`- **${pageScore.percent}%** (${pageScore.score}/${pageScore.maxScore})`);
  for (const item of pageScore.items) {
    lines.push(`- ${item.passed ? "[x]" : "[ ]"} ${item.label} (w${item.weight})`);
  }
  lines.push("");
  if (pageScore.percent >= 90) {
    lines.push("> **90% 이상** — Page Maker/마켓플레이스 모듈 커버리지 목표 도달 (로컬 구조 평가).");
  } else {
    lines.push(`> 90% 미달 — 부족 항목을 템플릿·후처리·프롬프트로 보강 필요.`);
  }
  lines.push("");
  lines.push("## HTML Export 품질 점수", "");
  lines.push(`- **${exportScore.percent}%** (${exportScore.score}/${exportScore.maxScore})`);
  for (const item of exportScore.items) {
    lines.push(`- ${item.passed ? "[x]" : "[ ]"} ${item.label} (w${item.weight})`);
  }
  lines.push("");
  const combined = Math.round((pageScore.percent + exportScore.percent) / 2);
  lines.push(`### 종합 (구조+export 평균): **${combined}%**`);
  lines.push("");

  lines.push("## 무료 반복 워크플로 (권장)", "");
  lines.push("1. 코드 수정 후 `npx tsx scripts/verify-detail-upgrade.ts --tsc`");
  lines.push("2. `npm run dev` → `/dev/detail-preview` UI 확인");
  lines.push("3. `npx tsx scripts/qa-visual-check.ts` (저장된 session.json 스크린샷)");
  lines.push("4. 실제 합성·일상샷 품질은 가끔 `TEST_MODE=false`로만 확인");
  lines.push("");

  const reportPath = path.join(OUT_DIR, "report.md");
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  console.log(lines.join("\n"));
  console.log(`\n→ ${reportPath}`);
}

main();
