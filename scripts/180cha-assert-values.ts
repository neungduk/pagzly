import fs from "fs";
import path from "path";
import { RADIUS, ELEVATION, hexToRgba, getTextPanelSurface } from "../lib/design-tokens";
import { getCategoryTheme } from "../lib/category-theme";

const checks: string[] = [];
function ok(c: boolean, m: string) {
  if (!c) throw new Error(`FAIL ${m}`);
  checks.push(`OK ${m}`);
}

ok(RADIUS.hairline === 2, "hairline");
ok(RADIUS.sm === 6, "sm");
ok(RADIUS.md === 12, "md");
ok(RADIUS.lg === 16, "lg");
ok(RADIUS.pill === 999, "pill");
ok(!("circle" in RADIUS), "no circle");
ok(!("bento" in RADIUS), "no bento");
ok(!("card" in RADIUS), "no card");

ok(
  ELEVATION.imageLift("#2F4858") === `0 20px 56px ${hexToRgba("#2F4858", 0.14)}`,
  "imageLift=export",
);
ok(
  ELEVATION.imageSoft("#2F4858") === `0 16px 48px ${hexToRgba("#2F4858", 0.12)}`,
  "imageSoft=export",
);
ok(ELEVATION.ctaSticky === "0 -8px 24px rgba(27,27,24,.15)", "ctaSticky=export");
ok(
  ELEVATION.twCtaSticky === "shadow-[0_-8px_24px_rgba(27,27,24,0.15)]",
  "twCtaSticky matches export",
);
ok(
  getTextPanelSurface(getCategoryTheme("화장품/뷰티")).boxShadow.startsWith("0 12px 40px"),
  "textPanel untouched",
);

const out = path.join(__dirname, "..", "review", "180cha-value-assert.json");
fs.writeFileSync(out, JSON.stringify({ checks }, null, 2));
console.log(JSON.stringify({ checks }, null, 2));
