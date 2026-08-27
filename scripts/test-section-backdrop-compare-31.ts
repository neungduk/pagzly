/**
 * 32차 — section-backdrop Router ON/OFF 비교
 * A 이후: section-backdrop는 flux-schnell 고정 → ON/OFF 모두 schnell 정상.
 *
 * npx tsx scripts/test-section-backdrop-compare-31.ts
 */
import fs from "fs";
import path from "path";
import { getCategoryTheme } from "@/lib/category-theme";
import { resetAllBudgets } from "@/lib/image-router/budget";
import { isImageRouterEnabled } from "@/lib/image-router/pipeline-bridge";
import { generateSectionBackdropVariants } from "@/lib/photo-enhance";
import { routeTask } from "@/lib/image-router/routing/premium-routing";
import { DEFAULT_SHADOW } from "@/lib/vision-utils";

function loadEnvLocal(force = true) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("[env] .env.local not found");
    return;
  }
  let loaded = 0;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (force || process.env[key] == null || process.env[key] === "") {
      process.env[key] = val;
      loaded += 1;
    }
  }
  console.log(
    `[env] loaded ${loaded} keys from .env.local; GOOGLE_AI_API_KEY=${Boolean(process.env.GOOGLE_AI_API_KEY)} IMAGE_ROUTER_ENABLED=${process.env.IMAGE_ROUTER_ENABLED}`,
  );
}

async function saveDataUrl(url: string | null, filePath: string) {
  if (!url) return;
  if (url.startsWith("data:")) {
    const m = url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!m) return;
    fs.writeFileSync(filePath, Buffer.from(m[2]!, "base64"));
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} ${res.status}`);
  fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
}

const CASES = [
  { id: "beauty", category: "화장품/뷰티", productName: "32차-테스트-글로우세럼" },
  { id: "electronics", category: "전자제품", productName: "32차-테스트-무선이어폰" },
] as const;

async function runMode(
  mode: "router-on" | "router-off",
  outDir: string,
): Promise<
  Array<{
    caseId: string;
    cost: number;
    ingredient: boolean;
    texture: boolean;
    routerEnabled: boolean;
  }>
> {
  process.env.IMAGE_ROUTER_ENABLED = mode === "router-on" ? "true" : "false";
  resetAllBudgets();

  const routeCheck = routeTask("DETAIL_PAGE_GRAPHIC", {});
  console.log(
    `\n=== ${mode} === IMAGE_ROUTER_ENABLED=${process.env.IMAGE_ROUTER_ENABLED} ` +
      `isImageRouterEnabled=${isImageRouterEnabled()} ` +
      `DETAIL_PAGE_GRAPHIC→${routeCheck.providerId} (${routeCheck.reason})`,
  );

  const results: Array<{
    caseId: string;
    cost: number;
    ingredient: boolean;
    texture: boolean;
    routerEnabled: boolean;
  }> = [];

  for (const c of CASES) {
    const theme = getCategoryTheme(c.category);
    const draftToken = `32cha-${mode}-${c.id}-${Date.now()}`;
    console.log(`\n--- ${mode} / ${c.category} ---`);

    const { ingredientUrl, textureUrl, cost } = await generateSectionBackdropVariants(
      DEFAULT_SHADOW,
      undefined,
      c.category,
      { accent: theme.accent, baseNeutral: theme.baseNeutral, deepAccent: theme.deepAccent },
      mode === "router-on" ? { userId: "32cha-test-user", draftToken } : undefined,
    );

    const caseDir = path.join(outDir, mode, c.id);
    fs.mkdirSync(caseDir, { recursive: true });
    await saveDataUrl(ingredientUrl, path.join(caseDir, "ingredient.png"));
    await saveDataUrl(textureUrl, path.join(caseDir, "texture.png"));

    console.log(
      `cost=$${cost.toFixed(4)} ingredient=${Boolean(ingredientUrl)} texture=${Boolean(textureUrl)}`,
    );
    results.push({
      caseId: c.id,
      cost,
      ingredient: Boolean(ingredientUrl),
      texture: Boolean(textureUrl),
      routerEnabled: isImageRouterEnabled(),
    });
  }

  return results;
}

async function main() {
  loadEnvLocal(true);
  process.env.FORCE_REGENERATE = "true";

  const cacheDir = path.join(process.cwd(), ".cache", "section-backdrops");
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log("cleared section-backdrop cache");
  }

  if (!process.env.REPLICATE_API_TOKEN && !process.env.FLUX_API_KEY) {
    throw new Error("REPLICATE_API_TOKEN or FLUX_API_KEY required");
  }

  const outDir = path.join(
    process.cwd(),
    "scripts",
    "test-output",
    "section-backdrop-compare-31",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  fs.mkdirSync(outDir, { recursive: true });

  console.log("=== 32차 section-backdrop compare ===");
  console.log("output:", outDir);

  const off = await runMode("router-off", outDir);
  const on = await runMode("router-on", outDir);

  const summary = {
    note: "32cha: section-backdrop flux-schnell fixed; DETAIL_PAGE_GRAPHIC default → flux (not gemini)",
    routerOffTotalCost: off.reduce((s, r) => s + r.cost, 0),
    routerOnTotalCost: on.reduce((s, r) => s + r.cost, 0),
    cases: CASES.map((c) => ({
      id: c.id,
      off: off.find((r) => r.caseId === c.id),
      on: on.find((r) => r.caseId === c.id),
    })),
  };

  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("\nsummary:", JSON.stringify(summary, null, 2));
  console.log("\nDONE — inspect images in", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
