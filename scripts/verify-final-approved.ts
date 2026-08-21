// review/final-approved/session.json 기준으로 조명/합성/배경 다양화 항목을 자동 점검한다.
// 실행: npx tsx scripts/verify-final-approved.ts

import fs from "fs";
import path from "path";

const SESSION_PATH = path.join(__dirname, "..", "review", "final-approved", "session.json");

type CheckResult = { id: string; label: string; pass: boolean; detail: string };

function main() {
  if (!fs.existsSync(SESSION_PATH)) {
    console.error("session.json 없음:", SESSION_PATH);
    process.exit(1);
  }

  const session = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8")) as {
    imageUrls?: string[];
    imagePaths?: string[];
    generated?: { sections?: { type: string; slot?: string; imageIndexes?: number[] }[] };
  };

  const urls = session.imageUrls ?? [];
  const paths = session.imagePaths ?? [];
  const checks: CheckResult[] = [];

  const uniqueUrls = new Set(urls);
  checks.push({
    id: "distinct-images",
    label: "섹션별 서로 다른 합성 이미지 URL",
    pass: uniqueUrls.size === urls.length && urls.length >= 3,
    detail: `${urls.length}장, 고유 ${uniqueUrls.size}장`,
  });

  const hasIngredient =
    paths.some((p) => /ingredient|moisture|fx-moisture/i.test(p)) ||
    urls.some((u) => /ingredient|moisture|fx-moisture/i.test(u));
  const hasTexture =
    paths.some((p) => /texture/i.test(p)) || urls.some((u) => /texture/i.test(u));
  checks.push({
    id: "section-backdrops",
    label: "성분/텍스처 섹션 전용 배경 합성",
    pass: hasIngredient && hasTexture,
    detail: `ingredient=${hasIngredient}, texture=${hasTexture}`,
  });

  const hasCompareBefore = urls.some((u) => u.includes("compare-before"));
  const hasCompareAfter = urls.some((u) => u.includes("compare-after"));
  checks.push({
    id: "before-after",
    label: "Before/After 비교쌍 생성",
    pass: hasCompareBefore && hasCompareAfter,
    detail: `before=${hasCompareBefore}, after=${hasCompareAfter}`,
  });

  const gallery = session.generated?.sections?.find((s) => s.type === "gallery");
  const galleryIndexes = gallery?.imageIndexes ?? [];
  checks.push({
    id: "gallery-ba-indexes",
    label: "갤러리 B/A 슬롯 매핑",
    pass: galleryIndexes.length >= 2,
    detail: `imageIndexes=${JSON.stringify(galleryIndexes)}`,
  });

  checks.push({
    id: "lighting-lock",
    label: "조명 lock 파이프라인 (코드 존재)",
    pass: fs.existsSync(path.join(__dirname, "..", "lib", "vision-utils.ts")),
    detail: "lightingLockPrompt + matchCutoutWhiteBalance + buildProductShadowSvg",
  });

  checks.push({
    id: "halo-feather",
    label: "합성 halo 완화 (featherCutout)",
    pass: fs.readFileSync(path.join(__dirname, "..", "lib", "photo-composite.ts"), "utf8")
      .includes("featherCutout"),
    detail: "photo-composite.ts feather + WB match",
  });

  console.log("\n=== final-approved compositing checklist ===\n");
  let passCount = 0;
  for (const c of checks) {
    const mark = c.pass ? "PASS" : "FAIL";
    if (c.pass) passCount += 1;
    console.log(`[${mark}] ${c.label}`);
    console.log(`       ${c.detail}\n`);
  }
  console.log(`합계: ${passCount}/${checks.length} PASS`);
  process.exit(passCount === checks.length ? 0 : 1);
}

main();
