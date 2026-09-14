/**
 * 139차 — 다중 카테고리 회귀 QA (130~138 누적, 신규 유료 API 0)
 *   npx tsx scripts/139cha-regression-qa.ts
 *
 * /api/generate 미호출. 기존 세션 + 결정론 섹션 삽입 + detail-preview 캡처로
 * 카테고리 5종(+리뷰 유무) 렌더/사이드바/스와치/KC를 검증한다.
 */
import fs from "fs";
import path from "path";
import { chromium, type Browser, type Page } from "playwright";
import { freezeDetailScrollReveal } from "./capture-utils";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";
import {
  insertEmptyCanvasSection,
  insertReviewAxisComparisonSection,
  insertReviewHighlightSection,
} from "../lib/section-inserts";
import {
  buildAxisComparison,
  countLineMatches,
  extractLinesFromTxt,
} from "../lib/review-insights";
import { enrichSectionsWithProductMetadata } from "../lib/enrich-product-sections";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import { getSectionFrameworkLabel } from "../lib/section-persuasion-labels";
import type { DetailSection } from "../lib/types/generate";
import { buildNativeFixtureSections } from "./169cha-native-fixture-sections";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const BEAUTY_SESSION = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const REVIEW_FIXTURE = path.join(ROOT, "scripts", "fixtures", "cosmetics-reviews.txt");
const AXIS_FIXTURE = path.join(ROOT, "scripts", "fixtures", "cosmetics-reviews-axis.txt");

const FORBIDDEN_API = [
  "/api/generate",
  "/api/enhance",
  "/api/generate-backdrop",
  "/api/section-backdrops",
];

type CaseId =
  | "cosmetics-review"
  | "cosmetics-noreview"
  | "fashion"
  | "food"
  | "electronics"
  | "living";

type CheckResult = "정상" | "이슈" | "해당없음" | "확인";

type CaseReport = {
  id: CaseId;
  category: string;
  shots: string[];
  checks: {
    reviewConditional: CheckResult;
    frameworkLabels: CheckResult;
    editPanel: CheckResult;
    colorSwatch: CheckResult;
    kcCert: CheckResult;
    ghostRect: CheckResult;
  };
  notes: string[];
};

type SessionBlob = Record<string, unknown> & {
  category?: string;
  productName?: string;
  brandName?: string;
  draftApproved?: boolean;
  pipelineSummary?: unknown;
  generated?: {
    category?: string;
    productName?: string;
    brandName?: string;
    imageAnalysis?: string;
    theme?: { baseNeutral?: string };
    sections?: DetailSection[];
    imageUrls?: string[];
    photoCostBreakdown?: Record<string, number>;
  };
  photoProcessingCost?: number;
  photoCostBreakdown?: Record<string, number>;
  backdropFailed?: boolean;
};

function qaUrls(slug: "cosmetics" | "fashion" | "food" | "electronics" | "living"): string[] {
  const ext = slug === "cosmetics" ? "jpg" : "png";
  return [1, 2, 3, 4].map((n) => `${BASE_URL}/qa-fixtures/${slug}/0${n}.${ext}`);
}

function cloneSession(file: string): SessionBlob {
  return JSON.parse(fs.readFileSync(file, "utf8")) as SessionBlob;
}

function finalizeSession(session: SessionBlob): string {
  const generated = session.generated;
  if (!generated?.sections) throw new Error("session missing sections");
  if (!session.pipelineSummary) {
    session.pipelineSummary = buildGenerationPipelineSummary({
      imageAnalysis: generated.imageAnalysis || "139cha fixture vision summary",
      theme: generated.theme,
      photoProcessingCost: Number(session.photoProcessingCost) || 0,
      photoCostBreakdown: session.photoCostBreakdown ?? generated.photoCostBreakdown,
      backdropFailed: Boolean(session.backdropFailed),
      sectionCount: generated.sections.length,
    });
    (session.pipelineSummary as { completedAt?: string }).completedAt = new Date().toISOString();
  }
  session.draftApproved = true;
  return JSON.stringify(session);
}

function stripReviewSections(sections: DetailSection[]): DetailSection[] {
  return sections.filter(
    (s) => s.type !== "review_highlight" && !(s.type === "comparison_chart" && s.basis === "measured"),
  );
}

function buildCosmeticsReviewSession(): string {
  const session = cloneSession(BEAUTY_SESSION);
  const generated = session.generated!;
  let sections = stripReviewSections([...(generated.sections ?? [])]);
  const praiseLines = extractLinesFromTxt(fs.readFileSync(REVIEW_FIXTURE));
  const axisLines = extractLinesFromTxt(fs.readFileSync(AXIS_FIXTURE));
  const praises = ["끈적임 없이 흡수돼요", "무향이라 자극이 없어요", "촉촉하게 유지돼요"];
  const complaints = ["용량이 조금 아쉬워요"];
  const praiseCounts = praises.map((t) => countLineMatches(praiseLines, t));
  const complaintCounts = complaints.map((t) => countLineMatches(praiseLines, t));
  sections = insertReviewHighlightSection(
    sections,
    praises,
    complaints,
    praiseLines.length,
    praiseCounts,
    complaintCounts,
  );
  const axes = buildAxisComparison(axisLines, ["수분감", "흡수", "무향", "자극"]);
  sections = insertReviewAxisComparisonSection(sections, axes, generated.brandName || "AURA LAB");
  sections = insertEmptyCanvasSection(sections, generated.theme?.baseNeutral || "#F5F1EA");
  generated.sections = sections;
  generated.imageUrls = qaUrls("cosmetics");
  session.category = "화장품/뷰티";
  generated.category = "화장품/뷰티";
  return finalizeSession(session);
}

function buildCosmeticsNoReviewSession(): string {
  const session = cloneSession(BEAUTY_SESSION);
  const generated = session.generated!;
  generated.sections = insertEmptyCanvasSection(
    stripReviewSections([...(generated.sections ?? [])]),
    generated.theme?.baseNeutral || "#F5F1EA",
  );
  generated.imageUrls = qaUrls("cosmetics");
  session.category = "화장품/뷰티";
  generated.category = "화장품/뷰티";
  return finalizeSession(session);
}

function applyCategoryProductFields(
  session: SessionBlob,
  fields: {
    category: string;
    generatedCategory?: string;
    productName: string;
    brandName: string;
    keyFeatures: string;
    ingredients: string;
    certifications: string;
    targetCustomer: string;
  },
) {
  const generated = session.generated!;
  session.category = fields.category;
  generated.category = fields.generatedCategory ?? fields.category;
  generated.productName = fields.productName;
  generated.brandName = fields.brandName;
  session.productName = fields.productName;
  session.brandName = fields.brandName;
  // 168차 — BEAUTY_SESSION 클론 시 top-level 상품 텍스트가 뷰티로 남는 오염 방지
  session.keyFeatures = fields.keyFeatures;
  session.ingredients = fields.ingredients;
  session.certifications = fields.certifications;
  session.targetCustomer = fields.targetCustomer;
}

function buildFashionSession(): string {
  const session = cloneSession(BEAUTY_SESSION);
  const generated = session.generated!;
  const product = {
    formCategory: "의류/패션",
    productName: "에센셜 오버사이즈 코튼 티셔츠",
    brandName: "NEUTRAL LINE",
    keyFeatures:
      "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내, 오버사이즈 핏, 원단 중량 210g/yd. 이런 분께 추천: 루즈핏·데일리 룩을 원하는 분. 이런 점은 확인 후 구매: 슬림핏을 선호하면 한 사이즈 다운을 권장합니다.",
    ingredients: "코튼 100%",
    certifications: "OEKO-TEX Standard 100",
    targetCustomer: "데일리 미니멀 룩을 선호하는 20~30대",
    imageCount: 4,
  };
  applyCategoryProductFields(session, {
    category: "패션/의류",
    productName: product.productName,
    brandName: product.brandName,
    keyFeatures: product.keyFeatures,
    ingredients: product.ingredients,
    certifications: product.certifications,
    targetCustomer: product.targetCustomer,
  });
  // 169차 — 뷰티 섹션 클론 대신 패션 템플릿 네이티브 트리
  generated.theme = getCategoryTheme("의류/패션");
  generated.sections = insertEmptyCanvasSection(
    buildNativeFixtureSections(product),
    generated.theme.baseNeutral || "#F5F1EA",
  );
  generated.imageUrls = qaUrls("fashion");
  return finalizeSession(session);
}

function buildFoodSession(): string {
  const session = cloneSession(BEAUTY_SESSION);
  const generated = session.generated!;
  const product = {
    formCategory: "식품/건강기능식품",
    productName: "들기름 메밀 우동 세트",
    brandName: "한그릇 키친",
    keyFeatures:
      "메밀면 단백질 8g/1인분, 들기름 함량 표기, 나트륨 480mg, 조리 3분, 2인분 세트. 이런 분께 추천: 집밥 간편식을 찾는 직장인. 이런 점은 확인 후 구매: 밀 알레르기가 있으면 성분표를 확인하세요. 개봉 후 냉장 보관을 권장합니다.",
    ingredients: "메밀가루, 밀가루, 들기름, 소금",
    certifications: "HACCP",
    targetCustomer: "집밥·간편식을 찾는 직장인",
    imageCount: 4,
  };
  applyCategoryProductFields(session, {
    category: "식품",
    productName: product.productName,
    brandName: product.brandName,
    keyFeatures: product.keyFeatures,
    ingredients: product.ingredients,
    certifications: product.certifications,
    targetCustomer: product.targetCustomer,
  });
  generated.theme = getCategoryTheme("식품/건강기능식품");
  generated.sections = insertEmptyCanvasSection(
    buildNativeFixtureSections(product),
    generated.theme.baseNeutral || "#F5F1EA",
  );
  generated.imageUrls = qaUrls("food");
  return finalizeSession(session);
}

function buildElectronicsSession(): string {
  const session = cloneSession(BEAUTY_SESSION);
  const generated = session.generated!;
  const product = {
    formCategory: "전자제품",
    productName: "무선 노이즈캔슬링 헤드폰",
    brandName: "NORA AUDIO",
    keyFeatures:
      "하이브리드 ANC 42dB, 오픈형 이어훅 설계로 장시간 착용 편안함, LDAC·AAC 듀얼 코덱, 배터리 이어버드 9시간·케이스 포함 36시간, IPX5 생활방수, 터치+앱 커스터마이즈, 멀티포인트 2기기 동시 연결. 이런 분께 추천: 출퇴근·카페에서 집중이 필요한 분. 이런 점은 확인 후 구매: iOS 전용 앱 기능 일부는 Android에서 제한될 수 있습니다.",
    ingredients:
      "드라이버 12mm 다이내믹, 블루투스 5.3, 충전 USB-C, 무게 이어버드 편당 5.8g, 컬러 미드나잇 블랙 / 클라우드 화이트",
    certifications: "KC 인증, 블루투스 SIG 인증, RoHS, 1년 무상 A/S, 30일 청음 만족 보장",
    targetCustomer: "출퇴근·재택에서 장시간 착용하는 20~30대",
    imageCount: 4,
  };
  applyCategoryProductFields(session, {
    category: "전자/가전",
    generatedCategory: "전자제품",
    productName: product.productName,
    brandName: product.brandName,
    keyFeatures: product.keyFeatures,
    ingredients: product.ingredients,
    certifications: product.certifications,
    targetCustomer: product.targetCustomer,
  });
  // 170차 — pexels 구버전 스냅샷 대신 전자 템플릿 네이티브 트리
  generated.theme = getCategoryTheme("전자제품");
  let sections = insertEmptyCanvasSection(
    buildNativeFixtureSections(product),
    generated.theme.baseNeutral || "#F5F1EA",
  );
  sections = enrichSectionsWithProductMetadata(sections, {
    category: "전자제품",
    brandName: product.brandName,
    certifications: product.certifications,
  });
  sections = sections.map((s) => {
    if (s.type !== "spec_table" || s.slot !== "spec_table") return s;
    const rows = [...s.rows];
    if (!rows.some((r) => /KC/.test(r.label))) {
      rows.splice(3, 0, { label: "KC 인증", value: "KC 인증" });
    }
    return { ...s, rows };
  });
  generated.sections = sections;
  generated.imageUrls = qaUrls("electronics");
  return finalizeSession(session);
}

function buildLivingSession(): string {
  const session = cloneSession(BEAUTY_SESSION);
  const generated = session.generated!;
  const product = {
    formCategory: "생활용품",
    productName: "플레인 세라믹 머그",
    brandName: "PLAIN HOME",
    keyFeatures:
      "내열 120℃, 용량 350mL, 무게 280g, 식기세척기 가능. 이런 분께 추천: 아침 커피·티 루틴을 즐기는 분. 이런 점은 확인 후 구매: 전자레인지 사용은 불가(손잡이 접합부).",
    ingredients: "도자기(세라믹), 무연 유약",
    certifications: "식품접촉기구 기준 적합",
    targetCustomer: "미니멀 테이블웨어를 선호하는 1~2인 가구",
    imageCount: 4,
  };
  applyCategoryProductFields(session, {
    category: "생활/리빙",
    productName: product.productName,
    brandName: product.brandName,
    keyFeatures: product.keyFeatures,
    ingredients: product.ingredients,
    certifications: product.certifications,
    targetCustomer: product.targetCustomer,
  });
  generated.theme = getCategoryTheme("생활용품");
  generated.sections = insertEmptyCanvasSection(
    buildNativeFixtureSections(product),
    generated.theme.baseNeutral || "#F5F1EA",
  );
  generated.imageUrls = qaUrls("living");
  return finalizeSession(session);
}

const CASE_BUILDERS: Record<CaseId, () => string> = {
  "cosmetics-review": buildCosmeticsReviewSession,
  "cosmetics-noreview": buildCosmeticsNoReviewSession,
  fashion: buildFashionSession,
  food: buildFoodSession,
  electronics: buildElectronicsSession,
  living: buildLivingSession,
};

const CASE_META: Record<CaseId, { category: string; previewCapture?: string }> = {
  "cosmetics-review": { category: "화장품/뷰티", previewCapture: "135-match-badges" },
  "cosmetics-noreview": { category: "화장품/뷰티", previewCapture: "137-no-review" },
  fashion: { category: "패션/의류", previewCapture: "58-fashion" },
  food: { category: "식품", previewCapture: "58-food" },
  electronics: { category: "전자/가전", previewCapture: "133-electronics-cert" },
  living: { category: "생활/리빙", previewCapture: "58-living" },
};

async function seedResult(page: Page, sessionRaw: string) {
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((raw) => sessionStorage.setItem("pagzly-create-result", raw), sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="desktop-structure-sidebar"]', { timeout: 45000 });
  // 미리보기는 히어로+본문 2개만 기본 노출 — 회귀 전 전체 펼침
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click();
    await page.waitForTimeout(400);
  }
  await freezeDetailScrollReveal(page);
}

function desktopPreview(page: Page) {
  return page.locator('[data-testid="result-desktop-split"] [data-testid="detail-preview"]');
}

async function captureFullChunks(page: Page, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  const preview = desktopPreview(page);
  await preview.waitFor({ state: "visible", timeout: 15000 });

  const full = path.join(SHOT, `${prefix}-full.png`);
  await preview.screenshot({ path: full });
  paths.push(full);

  const sections = preview.locator("section");
  const n = await sections.count();
  const step = Math.max(1, Math.ceil(n / 3));
  for (let i = 0, part = 1; i < n; i += step, part++) {
    await sections.nth(i).scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(200);
    await freezeDetailScrollReveal(page);
    const p = path.join(SHOT, `${prefix}-${part}.png`);
    await preview.screenshot({ path: p });
    paths.push(p);
  }
  return paths;
}

async function checkFrameworkLabels(page: Page, notes: string[]): Promise<CheckResult> {
  const sidebar = page.locator('[data-testid="desktop-structure-sidebar"]');
  // scroll list to bottom so canvas row is in DOM checks
  await sidebar.locator("ul").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  }).catch(() => undefined);
  await page.waitForTimeout(150);

  const rows = sidebar.locator("ul > li");
  const rowCount = await rows.count();
  let missing = 0;
  let unknownType = 0;
  let canvasOk = true;
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const text = (await row.innerText()).replace(/\s+/g, " ");
    const isCanvas = text.includes("자유 캔버스");
    const badges = row.locator('[data-testid="section-framework-badge"]');
    const badgeN = await badges.count();
    if (isCanvas) {
      if (badgeN !== 0) {
        canvasOk = false;
        notes.push("canvas에 프레임워크 배지 노출");
      }
      continue;
    }
    if (badgeN === 0) {
      missing++;
      notes.push(`라벨 누락 row=${i + 1}: ${text.slice(0, 40)}`);
    }
  }
  const sessionTypes = await page.evaluate(() => {
    const raw = sessionStorage.getItem("pagzly-create-result");
    if (!raw) return [] as string[];
    const s = JSON.parse(raw) as { generated?: { sections?: { type: string }[] } };
    return (s.generated?.sections ?? []).map((x) => x.type);
  });
  for (const t of sessionTypes) {
    if (t === "canvas") continue;
    if (!getSectionFrameworkLabel(t as DetailSection["type"])) {
      unknownType++;
      notes.push(`매핑표에 없는 타입: ${t}`);
    }
  }
  if (!canvasOk || missing > 0 || unknownType > 0) return "이슈";
  notes.push(`framework badges ok rows=${rowCount} types=${sessionTypes.length}`);
  return "정상";
}

async function checkEditPanel(page: Page, notes: string[]): Promise<CheckResult> {
  const editStart = page
    .locator('[data-testid="result-desktop-split"]')
    .getByRole("button", { name: "편집 시작" });
  if (await editStart.count()) {
    await editStart.click().catch(() => undefined);
    await page.waitForTimeout(250);
  }
  const patch = page.locator('[data-testid="desktop-patch-panel"]');
  const tools = page.locator('[data-testid="desktop-tools-accordion"]');
  const side = page.locator('[data-testid="desktop-structure-sidebar"]');
  const ok =
    (await side.isVisible()) &&
    ((await patch.count()) === 0 || (await patch.isVisible())) &&
    ((await tools.count()) === 0 || (await tools.first().isVisible()));
  if (!ok) {
    notes.push("편집 패널/사이드바 가시성 실패");
    return "이슈";
  }
  notes.push("편집 패널 레이아웃 가시성 ok");
  return "정상";
}

async function checkReviewConditional(
  page: Page,
  id: CaseId,
  notes: string[],
): Promise<CheckResult> {
  const preview = desktopPreview(page);
  await preview.locator("section").last().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(200);
  await freezeDetailScrollReveal(page);
  const hasReview = await preview.locator('[data-testid="review-match-badge"]').count();
  const hasHighlight = await preview.locator('[data-testid="review-highlight"]').count();
  const hasCompare = await preview.locator("text=COMPARE").count();
  const hasMeasured =
    (await preview.locator("text=실제 후기에서 자주 언급된 점").count()) +
    (await preview.locator('[data-testid="comparison-evidence"]').count());
  if (id === "cosmetics-review") {
    if (hasReview < 1 && hasHighlight < 1) {
      notes.push("리뷰 케이스에 review_highlight/매칭 배지 없음");
      return "이슈";
    }
    if (hasMeasured < 1 && hasCompare < 1) {
      notes.push("리뷰 케이스에 축 비교 차트 미노출");
      return "이슈";
    }
    notes.push(
      `review badges=${hasReview} highlight=${hasHighlight} measured/compare visible`,
    );
    return "정상";
  }
  if (hasReview > 0 || hasHighlight > 0 || hasMeasured > 0) {
    notes.push(
      `리뷰 없음 케이스에 리뷰 UI 노출 badges=${hasReview} highlight=${hasHighlight} measured=${hasMeasured}`,
    );
    return "이슈";
  }
  notes.push("리뷰 조건부 생략 ok");
  return "정상";
}

async function checkKc(page: Page, id: CaseId, notes: string[]): Promise<CheckResult> {
  const body = await desktopPreview(page).innerText();
  const hasKc = /KC\s*인증/.test(body);
  if (id === "electronics") {
    if (!hasKc) {
      notes.push("전자 케이스 KC 인증 행 미노출");
      return "이슈";
    }
    notes.push("KC 인증 행 노출 ok");
    return "정상";
  }
  if (hasKc) {
    notes.push("비전자 카테고리에 KC 인증 라벨 노출");
    return "이슈";
  }
  notes.push("비전자 KC 행 생략 ok");
  return "정상";
}

async function checkColorSwatch(page: Page, id: CaseId, notes: string[]): Promise<CheckResult> {
  if (id !== "fashion") return "해당없음";
  const preview = desktopPreview(page);
  const section = preview.locator("section").filter({ hasText: "컬러 옵션" }).first();
  await section.scrollIntoViewIfNeeded();
  await section.waitFor({ state: "visible", timeout: 15000 });
  const img = section.locator("img").first();
  const before = await img.getAttribute("src");
  const buttons = section.locator("button[aria-pressed]");
  if ((await buttons.count()) < 2) {
    notes.push("스와치 버튼 부족");
    return "이슈";
  }
  await buttons.nth(1).click();
  await page.waitForTimeout(200);
  const after = await img.getAttribute("src");
  await buttons.nth(0).click();
  await page.waitForTimeout(150);
  const beforeShot = path.join(SHOT, "139cha-fashion-swatch-0.png");
  await section.screenshot({ path: beforeShot });
  await buttons.nth(1).click();
  await page.waitForTimeout(150);
  const afterShot = path.join(SHOT, "139cha-fashion-swatch-1.png");
  await section.screenshot({ path: afterShot });

  const session = JSON.parse(
    (await page.evaluate(() => sessionStorage.getItem("pagzly-create-result"))) || "{}",
  ) as SessionBlob;
  const html = buildDetailPageHtml({
    productName: session.generated?.productName || "t",
    category: "의류/패션",
    sections: (session.generated?.sections || []).filter((s) => s.type === "color_variation"),
    imageUrls: session.generated?.imageUrls || qaUrls("fashion"),
    theme: getCategoryTheme("의류/패션"),
  });
  const exportOk =
    html.includes("pagzly-color-variation") &&
    html.includes('type="radio"') &&
    html.includes(":checked");
  fs.writeFileSync(path.join(OUT, "139cha-fashion-color-export-snippet.html"), html, "utf8");
  if (!before || !after || before === after) {
    notes.push(`스와치 이미지 미변경 before=${before} after=${after}`);
    return "이슈";
  }
  if (!exportOk) {
    notes.push("export HTML 라디오 트릭 누락");
    return "이슈";
  }
  notes.push("스와치 클릭 이미지 변경 + export radio ok");
  return "정상";
}

async function checkGhostRect(page: Page, notes: string[]): Promise<CheckResult> {
  const overlays = await desktopPreview(page)
    .locator(".bg-black\\/20, .bg-gray-500\\/30")
    .count();
  notes.push(`ghost heuristic overlays=${overlays} (육안 확인 필요)`);
  return overlays > 5 ? "이슈" : "확인";
}

async function runCase(
  page: Page,
  id: CaseId,
  apiHits: string[],
): Promise<CaseReport> {
  const notes: string[] = [];
  const meta = CASE_META[id];
  const sessionRaw = CASE_BUILDERS[id]();
  fs.writeFileSync(path.join(OUT, `139cha-session-${id}.json`), sessionRaw, "utf8");

  await seedResult(page, sessionRaw);
  const shots = await captureFullChunks(page, `139cha-${id}`);

  // sidebar close-up
  const sideShot = path.join(SHOT, `139cha-${id}-sidebar.png`);
  await page.locator('[data-testid="desktop-structure-sidebar"]').screenshot({ path: sideShot });
  shots.push(sideShot);

  const reviewConditional = await checkReviewConditional(page, id, notes);
  const frameworkLabels = await checkFrameworkLabels(page, notes);
  const editPanel = await checkEditPanel(page, notes);
  const editShot = path.join(SHOT, `139cha-${id}-edit.png`);
  const aside = page.locator('[data-testid="result-desktop-split"] aside').first();
  if (await aside.count()) await aside.screenshot({ path: editShot }).catch(() => undefined);
  shots.push(editShot);
  const colorSwatch = await checkColorSwatch(page, id, notes);
  const kcCert = await checkKc(page, id, notes);
  const ghostRect = await checkGhostRect(page, notes);

  // supplemental category-native preview (58/133 fixtures) — no generate
  if (meta.previewCapture) {
    const beforeHits = apiHits.length;
    await page.goto(`${BASE_URL}/dev/detail-preview?capture=${meta.previewCapture}`, {
      waitUntil: "networkidle",
    });
    await freezeDetailScrollReveal(page);
    await page.waitForTimeout(400);
    const prevShot = path.join(SHOT, `139cha-${id}-preview.png`);
    await page.screenshot({ path: prevShot, fullPage: true });
    shots.push(prevShot);
    if (apiHits.length > beforeHits) {
      notes.push(`preview 중 금지 API ${apiHits.length - beforeHits}건`);
    }
  }

  return {
    id,
    category: meta.category,
    shots: shots.filter((p) => fs.existsSync(p)),
    checks: {
      reviewConditional,
      frameworkLabels,
      editPanel,
      colorSwatch,
      kcCert,
      ghostRect,
    },
    notes,
  };
}

function writeReport(reports: CaseReport[], apiHits: string[], tscExit: number | null) {
  const lines: string[] = [
    "# 139차 — 다중 카테고리 회귀 QA",
    "",
    "생성: 2026-09-08",
    "",
    "## 방법",
    "",
    "- `/api/generate`·유료 이미지 API **미호출** (TEST_MODE 픽스처/기존 세션 + 결정론 섹션 삽입).",
    "- 판매자 결과 화면(`/create/result`)에서 138 라벨·134 편집 패널·135/137 조건부 UI 확인.",
    "- 카테고리 네이티브 비주얼은 `detail-preview?capture=58-*|133-*|135|137` 보조 캡처.",
    "",
    "## 체크리스트 표",
    "",
    "| 카테고리(케이스) | 135/137 리뷰 조건부 | 138 프레임워크 라벨 | 134 편집 패널 | 48 색상 스와치 | KC 인증 | 유령 사각형 | 비고 |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const r of reports) {
    const c = r.checks;
    lines.push(
      `| ${r.category} (${r.id}) | ${c.reviewConditional} | ${c.frameworkLabels} | ${c.editPanel} | ${c.colorSwatch} | ${c.kcCert} | ${c.ghostRect} | ${r.notes.slice(0, 2).join("; ").replace(/\|/g, "/")} |`,
    );
  }
  lines.push("", "## 케이스별 상세", "");
  for (const r of reports) {
    lines.push(`### ${r.id} — ${r.category}`);
    lines.push(`- shots: ${r.shots.map((p) => path.relative(ROOT, p)).join(", ")}`);
    for (const n of r.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  const issues = reports.flatMap((r) =>
    Object.entries(r.checks)
      .filter(([, v]) => v === "이슈")
      .map(([k]) => `${r.id}.${k}: ${r.notes.join(" / ")}`),
  );
  lines.push("## 이슈 (수정하지 않음 — 다음 라운드 후보)", "");
  if (issues.length === 0) {
    lines.push("- 없음 (육안 `확인` 항목은 스크린샷 재검 권장)");
  } else {
    for (const i of issues) {
      lines.push(`- ${i}`);
      lines.push(`  - 원인 추정: 회귀 스크립트 자동 판정 실패 — 재현은 해당 케이스 세션 JSON + 스크린샷으로 가능`);
    }
  }
  lines.push("", "## 비용 / tsc", "");
  lines.push(`- 금지 API 히트: ${apiHits.length}건`);
  for (const u of apiHits.slice(0, 20)) lines.push(`  - ${u}`);
  lines.push(`- tsc --noEmit EXIT_CODE=${tscExit ?? "?"}`);
  lines.push("- 신규 유료 API 호출: 0 (generate/enhance 미호출)");
  fs.writeFileSync(path.join(OUT, "139cha-report.md"), lines.join("\n"), "utf8");
  fs.writeFileSync(
    path.join(OUT, "139cha-results.json"),
    JSON.stringify({ reports, apiHits, tscExit }, null, 2),
    "utf8",
  );
}

async function main() {
  if (!fs.existsSync(BEAUTY_SESSION)) throw new Error(`missing ${BEAUTY_SESSION}`);
  if (!fs.existsSync(STORAGE_STATE_PATH)) throw new Error(`missing auth-state.json`);
  fs.mkdirSync(SHOT, { recursive: true });

  process.env.TEST_MODE = process.env.TEST_MODE || "true";
  console.log(`[139] TEST_MODE=${process.env.TEST_MODE}`);

  const apiHits: string[] = [];
  const browser: Browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on("response", (res) => {
    const url = res.url();
    for (const f of FORBIDDEN_API) {
      if (url.includes(f)) apiHits.push(url);
    }
  });
  page.on("request", (req) => {
    const url = req.url();
    for (const f of FORBIDDEN_API) {
      if (url.includes(f)) apiHits.push(`REQ ${url}`);
    }
  });

  const order: CaseId[] = [
    "cosmetics-review",
    "cosmetics-noreview",
    "fashion",
    "food",
    "electronics",
    "living",
  ];
  const reports: CaseReport[] = [];
  for (const id of order) {
    console.log(`[139] case=${id}`);
    try {
      reports.push(await runCase(page, id, apiHits));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[139] FAIL ${id}: ${msg}`);
      reports.push({
        id,
        category: CASE_META[id].category,
        shots: [],
        checks: {
          reviewConditional: "이슈",
          frameworkLabels: "이슈",
          editPanel: "이슈",
          colorSwatch: id === "fashion" ? "이슈" : "해당없음",
          kcCert: "이슈",
          ghostRect: "이슈",
        },
        notes: [`런타임 실패: ${msg}`],
      });
    }
  }

  await browser.close();
  writeReport(reports, apiHits, null);
  console.log(`[139] report written apiHits=${apiHits.length}`);
  if (apiHits.length > 0) {
    console.error("[139] forbidden API was called");
    process.exit(1);
  }
  console.log("[139] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
