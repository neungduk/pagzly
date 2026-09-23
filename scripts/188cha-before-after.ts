import { getCategoryTheme } from "../lib/category-theme";
import {
  BRAND,
  contrastRatioToken,
  ensureReadableOnPaper,
  extendTheme,
  mixHex,
  solidAccentOnPaper,
  solidDeepOnPaper,
} from "../lib/design-tokens";

const rows: Array<{
  cat: string;
  v: "base" | "warm" | "cool" | "bold";
  kind: string;
  min: number;
  raw: (t: ReturnType<typeof getCategoryTheme>) => string;
  fixed: (t: ReturnType<typeof getCategoryTheme>) => string;
}> = [
  {
    cat: "식품/건강기능식품",
    v: "base",
    kind: "accent",
    min: 3,
    raw: (t) => t.accent,
    fixed: (t) => solidAccentOnPaper(t),
  },
  {
    cat: "식품/건강기능식품",
    v: "warm",
    kind: "accent",
    min: 3,
    raw: (t) => t.accent,
    fixed: (t) => solidAccentOnPaper(t),
  },
  {
    cat: "식품/건강기능식품",
    v: "cool",
    kind: "inkAccent",
    min: 4.5,
    raw: (t) => mixHex(t.accent, BRAND.ink, 0.42),
    fixed: (t) => ensureReadableOnPaper(mixHex(t.accent, BRAND.ink, 0.42), 4.5),
  },
  {
    cat: "식품/건강기능식품",
    v: "cool",
    kind: "accent",
    min: 3,
    raw: (t) => t.accent,
    fixed: (t) => solidAccentOnPaper(t),
  },
  {
    cat: "식품/건강기능식품",
    v: "cool",
    kind: "deep",
    min: 3,
    raw: (t) => t.deepAccent,
    fixed: (t) => solidDeepOnPaper(t),
  },
  {
    cat: "반려동물",
    v: "bold",
    kind: "accent",
    min: 3,
    raw: (t) => t.accent,
    fixed: (t) => solidAccentOnPaper(t),
  },
];

for (const row of rows) {
  const base = getCategoryTheme(row.cat);
  const t = row.v === "base" ? base : extendTheme(base)[row.v];
  const before = contrastRatioToken(BRAND.paper, row.raw(t));
  const afterBg = row.fixed(t);
  const after = contrastRatioToken(BRAND.paper, afterBg);
  console.log(
    `${row.cat}/${row.v} ${row.kind}: ${before.toFixed(2)} → ${after.toFixed(2)} (min ${row.min}) ${row.raw(t)} → ${afterBg}`,
  );
}
