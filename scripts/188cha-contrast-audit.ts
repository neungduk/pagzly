/**
 * 188차 — WCAG AA 대비 감사. contrastRatioToken 재사용(신규 계산 로직 없음).
 *   npx tsx scripts/188cha-contrast-audit.ts
 *
 * 대상(렌더러/export에서 accent·deepAccent를 솔리드 배경으로 흰 텍스트를 얹는 자리):
 * - 패턴 C inkDeep/inkAccent + BRAND.paper (본문급 → 4.5)
 * - theme.accent + paper (아이콘 원형 배지 UI → 3.0)
 * - theme.deepAccent + paper (POINT/STEP/callout/CTA 배지/브랜드 키워드/export CTA·pulse → 3.0)
 */
import fs from "fs";
import path from "path";
import { getCategoryTheme } from "../lib/category-theme";
import {
  BRAND,
  contrastRatioToken,
  ensureReadableOnPaper,
  extendTheme,
  mixHex,
  solidAccentOnPaper,
  solidDeepOnPaper,
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

type ComboKind = "body" | "ui";

type ComboDef = {
  id: string;
  label: string;
  kind: ComboKind;
  /** theme → { fg, bg } — 렌더 경로와 동일한 보정 함수 적용 */
  colors: (theme: ReturnType<typeof getCategoryTheme>) => { fg: string; bg: string };
};

const COMBOS: ComboDef[] = [
  {
    id: "patternC_inkDeep_paper",
    label: "패턴C inkDeep + paper (하드 블록 본문)",
    kind: "body",
    colors: (t) => ({
      fg: BRAND.paper,
      bg: ensureReadableOnPaper(mixHex(t.deepAccent, BRAND.ink, 0.6), 4.5),
    }),
  },
  {
    id: "patternC_inkAccent_paper",
    label: "패턴C inkAccent + paper (하드 블록 본문)",
    kind: "body",
    colors: (t) => ({
      fg: BRAND.paper,
      bg: ensureReadableOnPaper(mixHex(t.accent, BRAND.ink, 0.42), 4.5),
    }),
  },
  {
    id: "accent_paper_icon",
    label: "accent + paper (아이콘 원형 UI)",
    kind: "ui",
    colors: (t) => ({ fg: BRAND.paper, bg: solidAccentOnPaper(t) }),
  },
  {
    id: "deep_paper_badge",
    label: "deepAccent + paper (POINT/STEP/callout/CTA배지)",
    kind: "ui",
    colors: (t) => ({ fg: BRAND.paper, bg: solidDeepOnPaper(t) }),
  },
  {
    id: "deep_paper_brandStory",
    label: "deepAccent + paper (브랜드 키워드 대형)",
    kind: "ui",
    colors: (t) => ({ fg: BRAND.paper, bg: solidDeepOnPaper(t) }),
  },
  {
    id: "deep_paper_exportCta",
    label: "deepAccent + paper (export CTA 솔리드)",
    kind: "ui",
    colors: (t) => ({ fg: BRAND.paper, bg: solidDeepOnPaper(t) }),
  },
  {
    id: "deep_paper_pulseCard",
    label: "deepAccent + paper (pulse 강조 카드)",
    kind: "ui",
    colors: (t) => ({ fg: BRAND.paper, bg: solidDeepOnPaper(t) }),
  },
];

function threshold(kind: ComboKind): number {
  return kind === "body" ? 4.5 : 3.0;
}

function themeForVariant(
  category: string,
  variant: (typeof VARIANTS)[number],
): ReturnType<typeof getCategoryTheme> {
  const base = getCategoryTheme(category);
  if (variant === "base") return base;
  const ext: ExtendedTheme = extendTheme(base);
  return ext[variant];
}

type Row = {
  category: string;
  variant: string;
  comboId: string;
  comboLabel: string;
  kind: ComboKind;
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  pass: boolean;
};

function main() {
  const rows: Row[] = [];
  for (const category of CATEGORIES) {
    for (const variant of VARIANTS) {
      const theme = themeForVariant(category, variant);
      for (const combo of COMBOS) {
        const { fg, bg } = combo.colors(theme);
        const ratio = contrastRatioToken(fg, bg);
        const min = threshold(combo.kind);
        rows.push({
          category,
          variant,
          comboId: combo.id,
          comboLabel: combo.label,
          kind: combo.kind,
          fg,
          bg,
          ratio,
          min,
          pass: ratio >= min,
        });
      }
    }
  }

  const fail = rows.filter((r) => !r.pass);
  const total = rows.length;

  console.log("=== 188cha WCAG contrast audit ===");
  console.log(`total=${total} pass=${total - fail.length} fail=${fail.length}`);
  console.log("");
  console.log(
    [
      "category",
      "variant",
      "combo",
      "kind",
      "bg",
      "fg",
      "ratio",
      "min",
      "pass",
    ].join("\t"),
  );
  for (const r of rows) {
    console.log(
      [
        r.category,
        r.variant,
        r.comboId,
        r.kind,
        r.bg,
        r.fg,
        r.ratio.toFixed(2),
        r.min.toFixed(1),
        r.pass ? "OK" : "FAIL",
      ].join("\t"),
    );
  }

  if (fail.length > 0) {
    console.log("\n--- FAIL detail ---");
    for (const r of fail) {
      console.log(
        `${r.category}/${r.variant} ${r.comboId}: ${r.ratio.toFixed(2)} < ${r.min} (bg=${r.bg})`,
      );
    }
  }

  const outDir = path.join(ROOT, "review", "188cha-export");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "contrast-audit.json"),
    JSON.stringify(
      {
        total,
        pass: total - fail.length,
        fail: fail.length,
        fails: fail,
        rows,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nwrote review/188cha-export/contrast-audit.json`);
}

main();
