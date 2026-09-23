/**
 * 189차 — 텍스트 색 방향 WCAG 감사 (accent/deepAccent가 fg, paper가 bg).
 * 188차 bg+paper 방향과 직교. contrastRatioToken / ensureReadableOnPaper 재사용.
 *   npx tsx scripts/189cha-contrast-audit.ts
 */
import fs from "fs";
import path from "path";
import { getCategoryTheme } from "../lib/category-theme";
import {
  BRAND,
  contrastRatioToken,
  ensureReadableOnPaper,
  extendTheme,
  type ExtendedTheme,
} from "../lib/design-tokens";

const ROOT = path.join(__dirname, "..");
const CATEGORIES = [
  "의류/패션",
  "화장품/뷰티",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
] as const;
const VARIANTS = ["base", "warm", "cool", "bold"] as const;

/**
 * grep으로 확인한 텍스트-색 자리(밝은 배경 위). 어두운 배경 반전(inverted/boldBlock/paper fg)은 제외.
 * siteCount = 대표 자리 수(감사는 토큰×카테고리×변형; 자리는 문서용).
 */
const TEXT_ROLES = [
  {
    id: "deep_text_body",
    token: "deepAccent" as const,
    min: 4.5,
    label: "deepAccent 본문/라벨/캡션 (sectionLabel, STORY, NOTICE, FAQ A., …)",
    sitesApprox: 28,
  },
  {
    id: "deep_text_large",
    token: "deepAccent" as const,
    min: 3.0,
    label: "deepAccent 대형 제목 (sectionTitle, compactTitle, price 외 키워드)",
    sitesApprox: 8,
  },
  {
    id: "accent_text_body",
    token: "accent" as const,
    min: 4.5,
    label: "accent 본문/보조 (체크 아이콘, Q., STEP, footnote sup, …)",
    sitesApprox: 12,
  },
  {
    id: "accent_text_large",
    token: "accent" as const,
    min: 3.0,
    label: "accent 대형 (CTA 가격 등)",
    sitesApprox: 2,
  },
] as const;

type Row = {
  category: string;
  variant: string;
  roleId: string;
  token: string;
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  pass: boolean;
  passRaw: boolean;
  fixedFg: string;
  fixedRatio: number;
};

function themeFor(category: string, variant: (typeof VARIANTS)[number]) {
  const base = getCategoryTheme(category);
  if (variant === "base") return base;
  const ext: ExtendedTheme = extendTheme(base);
  return ext[variant];
}

function main() {
  const rows: Row[] = [];
  for (const category of CATEGORIES) {
    for (const variant of VARIANTS) {
      const theme = themeFor(category, variant);
      for (const role of TEXT_ROLES) {
        const fg = role.token === "deepAccent" ? theme.deepAccent : theme.accent;
        const bg = BRAND.paper;
        const ratio = contrastRatioToken(fg, bg);
        // 배선 후 경로: readableText* (= ensureReadableOnPaper)
        const fixedFg =
          role.token === "deepAccent"
            ? ensureReadableOnPaper(fg, role.min)
            : ensureReadableOnPaper(fg, role.min);
        const fixedRatio = contrastRatioToken(fixedFg, bg);
        // pass = 배선 적용 후 기준 (코드가 readableText*를 쓰므로 after 기준)
        const passAfter = fixedRatio >= role.min;
        rows.push({
          category,
          variant,
          roleId: role.id,
          token: role.token,
          fg,
          bg,
          ratio,
          min: role.min,
          pass: passAfter,
          fixedFg,
          fixedRatio,
          passRaw: ratio >= role.min,
        });
      }
    }
  }

  const failRaw = rows.filter((r) => !r.passRaw);
  const failAfter = rows.filter((r) => !r.pass);
  console.log("=== 189cha text-on-paper contrast audit ===");
  console.log(
    `roles=${TEXT_ROLES.length} × cats=${CATEGORIES.length} × variants=${VARIANTS.length} = total=${rows.length}`,
  );
  console.log(`raw_fail=${failRaw.length} after_readableText_fail=${failAfter.length}`);
  console.log("\n--- role catalog (grep sites, light bg only) ---");
  for (const r of TEXT_ROLES) {
    console.log(`  ${r.id}: ~${r.sitesApprox} sites · min=${r.min} · ${r.label}`);
  }
  console.log("\ncategory\tvariant\trole\ttoken\traw\tafter\tmin\trawPass\tafterPass");
  for (const r of rows) {
    console.log(
      [
        r.category,
        r.variant,
        r.roleId,
        r.token,
        r.ratio.toFixed(2),
        r.fixedRatio.toFixed(2),
        r.min.toFixed(1),
        r.passRaw ? "OK" : "FAIL",
        r.pass ? "OK" : "FAIL",
      ].join("\t"),
    );
  }
  if (failRaw.length) {
    console.log("\n--- RAW FAIL → readableText (before→after) ---");
    for (const r of failRaw) {
      console.log(
        `${r.category}/${r.variant} ${r.roleId}: ${r.ratio.toFixed(2)}→${r.fixedRatio.toFixed(2)} (${r.fg}→${r.fixedFg})`,
      );
    }
  }

  const outDir = path.join(ROOT, "review", "189cha-export");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "contrast-audit-text.json"),
    JSON.stringify(
      {
        total: rows.length,
        rawFail: failRaw.length,
        afterFail: failAfter.length,
        roles: TEXT_ROLES,
        failsRaw: failRaw,
        rows,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log("\nwrote review/189cha-export/contrast-audit-text.json");
  if (failAfter.length) process.exitCode = 1;
}

main();
