/**
 * 265차 — certificate_evidence(판매자 업로드 인증·허가 서류) 삽입·export 검증 (API 0).
 *   npx tsx scripts/265cha-certificate-evidence-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import {
  BEFORE_AFTER_COMPLIANCE_NOTE,
  CERTIFICATE_EVIDENCE_COMPLIANCE_NOTE,
} from "../lib/before-after-eligibility";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { insertBeforeAfterSection, insertCertificateEvidenceSection } from "../lib/section-inserts";
import type { DetailSection, ReviewHighlightSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "265cha-certificate-evidence");

const ALL_CATEGORIES = ["의류/패션", "화장품/뷰티", "식품/건강기능식품", "전자제품", "생활용품", "반려동물"] as const;

/** 네 모서리에 마커가 있는 서류 모양 SVG — object-contain이면 네 마커가 모두 보여야 함 */
export function certSvgDataUrl(title: string, w: number, h: number): string {
  const corner = (x: number, y: number, label: string, anchor: string) =>
    `<text x="${x}" y="${y}" font-size="28" font-family="sans-serif" font-weight="700" fill="#b3261e" text-anchor="${anchor}">${label}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="#fffdf6"/>
<rect x="14" y="14" width="${w - 28}" height="${h - 28}" fill="none" stroke="#1b1b18" stroke-width="6"/>
<text x="${w / 2}" y="${h * 0.3}" font-size="36" font-family="sans-serif" font-weight="700" fill="#1b1b18" text-anchor="middle">${title}</text>
<text x="${w / 2}" y="${h * 0.3 + 50}" font-size="20" font-family="sans-serif" fill="#555" text-anchor="middle">${w}×${h} 샘플 서류</text>
${corner(34, 58, "TL", "start")}${corner(w - 34, 58, "TR", "end")}${corner(34, h - 34, "BL", "start")}${corner(w - 34, h - 34, "BR", "end")}
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export const SAMPLE_CERTS = [
  { imageUrl: certSvgDataUrl("배합사료제조업 등록증", 600, 800), caption: "배합사료제조업 등록증" },
  { imageUrl: certSvgDataUrl("KC Certificate", 800, 560), caption: "KC 안전인증서" },
  { imageUrl: certSvgDataUrl("시험성적서", 600, 1000), caption: null },
];

function baseSections(): DetailSection[] {
  return [
    { type: "hero", slot: "hero", headline: "히어로", subheadline: "서브", imageIndex: 0 } as DetailSection,
    { type: "image_text", slot: "feature_detail", heading: "기능", body: "본문", imageIndex: 0, imagePosition: "left" } as DetailSection,
    { type: "cta_price", slot: "cta_price", price: 10000, badges: [] } as DetailSection,
  ];
}

function withReviewHighlight(sections: DetailSection[]): DetailSection[] {
  const rh: ReviewHighlightSection = { type: "review_highlight", slot: "review_highlight", heading: "후기 요약", praises: ["좋아요"] };
  const cta = sections.findIndex((s) => s.type === "cta_price");
  return [...sections.slice(0, cta), rh, ...sections.slice(cta)];
}

const types = (s: DetailSection[]) => s.map((x) => x.type).join(" → ");

function main(): number {
  fs.mkdirSync(OUT, { recursive: true });
  let failed = 0;
  const check = (ok: boolean, name: string, detail?: unknown) => {
    console.log(ok ? "OK  " : "FAIL", name, detail !== undefined ? `— ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : "");
    if (!ok) failed += 1;
  };

  console.log("=== insertCertificateEvidenceSection ===");
  for (const cat of ALL_CATEGORIES) {
    // 카테고리 인자가 없는 함수 — 배제 로직이 없음을 카테고리별 before_after 조합과 함께 확인
    const withBa = insertBeforeAfterSection(baseSections(), [{ beforeUrl: "https://b", afterUrl: "https://a" }], cat);
    const out = insertCertificateEvidenceSection(withBa, SAMPLE_CERTS);
    const ce = out.find((s) => s.type === "certificate_evidence");
    check(ce?.type === "certificate_evidence" && ce.certificates.length === 3, `${cat}: 삽입됨 (3장)`, types(out));
  }

  const many = Array.from({ length: 6 }, (_, i) => ({ imageUrl: `https://c${i}`, caption: `서류 ${i + 1}` }));
  const capped = insertCertificateEvidenceSection(baseSections(), many).find((s) => s.type === "certificate_evidence");
  check(capped?.type === "certificate_evidence" && capped.certificates.length === 4, "6장 입력 → 4장으로 잘림",
    capped?.type === "certificate_evidence" ? capped.certificates.map((c) => c.caption) : null);

  const filtered = insertCertificateEvidenceSection(baseSections(), [
    { imageUrl: "", caption: "빈 URL" },
    { imageUrl: "   ", caption: "공백 URL" },
    { imageUrl: "https://ok", caption: "정상" },
  ]).find((s) => s.type === "certificate_evidence");
  check(filtered?.type === "certificate_evidence" && filtered.certificates.length === 1 && filtered.certificates[0]!.caption === "정상",
    "빈 imageUrl 걸러냄");

  const withBaRh = insertBeforeAfterSection(withReviewHighlight(baseSections()), [{ beforeUrl: "https://b", afterUrl: "https://a" }], "전자제품");
  const outBa = insertCertificateEvidenceSection(withBaRh, SAMPLE_CERTS);
  const ceIdx = outBa.findIndex((s) => s.type === "certificate_evidence");
  const baIdx = outBa.findIndex((s) => s.type === "before_after");
  check(ceIdx >= 0 && ceIdx === baIdx - 1, "before_after가 있으면 바로 앞", types(outBa));

  const outRh = insertCertificateEvidenceSection(withReviewHighlight(baseSections()), SAMPLE_CERTS);
  const rhIdx = outRh.findIndex((s) => s.type === "review_highlight");
  check(outRh.findIndex((s) => s.type === "certificate_evidence") === rhIdx + 1, "before_after 없으면 review_highlight 바로 뒤", types(outRh));

  const outCta = insertCertificateEvidenceSection(baseSections(), SAMPLE_CERTS);
  const ctaIdx = outCta.findIndex((s) => s.type === "cta_price");
  check(outCta.findIndex((s) => s.type === "certificate_evidence") === ctaIdx - 1, "둘 다 없으면 cta_price 직전", types(outCta));

  const withAi: DetailSection[] = [
    ...baseSections().slice(0, 2),
    { type: "ai_disclosure", slot: "ai_disclosure", heading: "AI", body: "고지" } as DetailSection,
    baseSections()[2]!,
  ];
  const outAi = insertCertificateEvidenceSection(withAi, SAMPLE_CERTS);
  check(outAi.findIndex((s) => s.type === "certificate_evidence") === outAi.findIndex((s) => s.type === "ai_disclosure") - 1,
    "ai_disclosure가 있으면 그 직전", types(outAi));

  for (const [label, input] of [["빈 배열", []], ["null", null], ["undefined", undefined], ["URL 전부 빈 값", [{ imageUrl: " " }]]] as const) {
    const out = insertCertificateEvidenceSection(baseSections(), input as never);
    check(!out.some((s) => s.type === "certificate_evidence") && out.length === 3, `이미지 없음(${label}) → 섹션 미생성`);
  }

  const twice = insertCertificateEvidenceSection(outCta, SAMPLE_CERTS);
  check(twice.filter((s) => s.type === "certificate_evidence").length === 1, "중복 삽입 안 함");

  const ceSection = outCta.find((s) => s.type === "certificate_evidence");
  check(ceSection?.type === "certificate_evidence" && ceSection.heading === "보유 인증·허가 서류", "고정 헤딩");

  console.log("=== 라우트 호출 순서 (before_after → certificate_evidence) ===");
  {
    const pairs = [{ beforeUrl: "https://b", afterUrl: "https://a" }];
    const routeOrder = insertCertificateEvidenceSection(insertBeforeAfterSection(withReviewHighlight(baseSections()), pairs, "전자제품"), SAMPLE_CERTS);
    check(/review_highlight → certificate_evidence → before_after/.test(types(routeOrder)),
      "라우트 순서: 후기 → 인증 서류 → 전후 사진", types(routeOrder));
    const reversed = insertBeforeAfterSection(insertCertificateEvidenceSection(withReviewHighlight(baseSections()), SAMPLE_CERTS), pairs, "전자제품");
    console.log("     (참고) 인증 서류를 먼저 넣으면:", types(reversed));
    const routeSrc = fs.readFileSync(path.join(ROOT, "app", "api", "generate", "route.ts"), "utf8");
    const baCall = routeSrc.indexOf("savedCopy.sections = insertBeforeAfterSection(");
    const ceCall = routeSrc.indexOf("savedCopy.sections = insertCertificateEvidenceSection(");
    check(baCall > 0 && ceCall > baCall, "route.ts에서 insertCertificateEvidenceSection이 insertBeforeAfterSection 뒤에 호출됨");
  }

  console.log("=== before_after(227차) 회귀 — 인증 서류가 없을 때 ===");
  {
    const pairs = [{ beforeUrl: "https://b", afterUrl: "https://a" }];
    const base = insertBeforeAfterSection(withReviewHighlight(baseSections()), pairs, "전자제품");
    const after = insertCertificateEvidenceSection(base, null);
    check(types(base) === types(after), "인증 서류 입력 없으면 before_after 순서 불변", types(after));
  }

  console.log("=== export HTML ===");
  {
    const sections = insertCertificateEvidenceSection(withReviewHighlight(baseSections()), SAMPLE_CERTS);
    for (const cat of ["반려동물", "전자제품"] as const) {
      const html = buildDetailPageHtml({
        productName: "테스트",
        category: cat,
        sections,
        imageUrls: ["https://placehold.co/400x400/png"],
        theme: getCategoryTheme(cat),
      });
      // 앵커 내비·SEO 텍스트에도 헤딩 문자열이 있으므로 섹션 <h2> 기준으로 찾는다
      const start = html.indexOf(">보유 인증·허가 서류</h2>");
      const secHtml = html.slice(html.lastIndexOf("<section", start), html.indexOf("</section>", start) + 10);
      check(start > 0, `${cat}: 섹션 헤딩 존재`);
      check((secHtml.match(/object-fit:contain/g) ?? []).length === 3 && (secHtml.match(/aspect-ratio:3\/4/g) ?? []).length === 3,
        `${cat}: 이미지 3장 모두 object-fit:contain + 3/4`);
      check(secHtml.includes("배합사료제조업 등록증") && secHtml.includes("KC 안전인증서"), `${cat}: 캡션 2개 노출`);
      check((secHtml.match(/<p style="margin:8px 0 0;text-align:center/g) ?? []).length === 2, `${cat}: 캡션 없는 3번째는 캡션 <p> 없음`);
      check(secHtml.includes(CERTIFICATE_EVIDENCE_COMPLIANCE_NOTE) && !secHtml.includes(BEFORE_AFTER_COMPLIANCE_NOTE), `${cat}: 고정 고지 문구`);
      check(!/인증됨|검증됨|검증 ?완료|✓|✔|&#10003;|&#10004;|verified|<svg/i.test(secHtml.replace(CERTIFICATE_EVIDENCE_COMPLIANCE_NOTE, "")),
        `${cat}: "인증됨/검증완료"·체크마크·아이콘 없음`);
      check(!/BEFORE|AFTER/.test(secHtml), `${cat}: BEFORE/AFTER 배지 없음`);
      fs.writeFileSync(path.join(OUT, `export-${cat === "반려동물" ? "pet" : "electronics"}.html`), html, "utf8");
    }
  }

  console.log("=== CreateProductForm 배선 ===");
  {
    const src = fs.readFileSync(path.join(ROOT, "components", "CreateProductForm.tsx"), "utf8");
    const block = src.slice(src.indexOf("보유 인증·허가 서류 (선택)") - 400, src.indexOf("보유 인증·허가 서류 (선택)"));
    check(src.includes("certificateEvidenceInputs.length < 4"), "UI 최대 4장");
    check(src.includes('uploadAuxFile(c.file as File, "certificate-evidence")') && /beforeAfterPairs,\s*certificateEvidence,/.test(src), "업로드·payload 배선");
    check(!block.includes("isBeforeAfterEligibleCategory(category) ? (\n              <div>\n                <label className={labelClass}>보유 인증"),
      "카테고리 게이트 없음(항상 노출)");
    check(!/isBeforeAfterEligibleCategory/.test(fs.readFileSync(path.join(ROOT, "lib", "section-inserts.ts"), "utf8").split("insertCertificateEvidenceSection")[1] ?? ""),
      "서버 함수에 카테고리 배제 없음");
  }

  console.log(failed === 0 ? "\nSYNC PASS" : `\nSYNC FAILED: ${failed}`);
  return failed;
}

async function screenshot(): Promise<number> {
  let failed = 0;
  const browser = await chromium.launch({ headless: true });
  for (const width of [430, 800]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`file:///${path.join(OUT, "export-pet.html").replace(/\\/g, "/")}`, { waitUntil: "load" });
    const sec = page.locator(".pagzly-wrap > section", { hasText: "보유 인증·허가 서류" }).first();
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const imgs = await sec.evaluate((el) =>
      [...el.querySelectorAll("img")].map((img) => {
        const r = img.getBoundingClientRect();
        return { fit: getComputedStyle(img).objectFit, ratio: +(r.width / r.height).toFixed(3), loaded: img.complete && img.naturalWidth > 0 };
      }),
    );
    const ok = imgs.length === 3 && imgs.every((i) => i.fit === "contain" && Math.abs(i.ratio - 0.75) < 0.01 && i.loaded);
    console.log(ok ? "OK  " : "FAIL", `export ${width}px: 3장 contain·3:4·로드됨`, JSON.stringify(imgs));
    if (!ok) failed += 1;
    await sec.screenshot({ path: path.join(OUT, `export-pet-${width}.png`), animations: "disabled" });
    await page.close();
  }
  await browser.close();
  return failed;
}

async function run() {
  let failed = main();
  try {
    failed += await screenshot();
  } catch (e) {
    console.log("FAIL screenshot", e);
    failed += 1;
  }
  console.log("API generate: 0");
  if (failed > 0) {
    console.log(`${failed} FAIL`);
    process.exit(1);
  }
  console.log("ALL PASS");
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
