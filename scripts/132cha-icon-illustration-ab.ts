/**
 * 132차 — flux-schnell 아이콘·배너 before/after 생성 (DeepSeek 0회)
 * ICON_MODEL을 강제 flux-schnell로 고정 (env의 qwen-image 무시).
 *
 *   npx tsx scripts/132cha-icon-illustration-ab.ts before
 *   npx tsx scripts/132cha-icon-illustration-ab.ts after
 */
import fs from "fs";
import path from "path";
import { generateConceptIcons } from "../lib/concept-icons";
import { generateIllustrationBanner } from "../lib/concept-illustration";
import type { ConceptBrief } from "../lib/concept-brief";
import { getCategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
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

const BRIEFS: Record<string, ConceptBrief> = {
  "화장품/뷰티": {
    theme: "수분/물방울",
    motif_keywords: ["물방울", "청량감", "촉촉함", "은은한 빛"],
    mood: "시원하고 맑은",
    backdrop_hint:
      "soft side lighting, fine water droplets on a soft surface, no glass container, no product",
    copy_tone: "촉촉하고 산뜻한 수분 케어 톤.",
    decor_prompt:
      "soft side lighting, fine water droplets on a surface, no text, no product",
    icon_style: "minimal water droplet and sparkle badge icon, soft circular frame",
  },
  "전자제품": {
    theme: "테크 미니멀",
    motif_keywords: ["기하학", "쿨 그레이", "정밀함", "반사광"],
    mood: "깔끔하고 신뢰감 있는",
    backdrop_hint: "cool gray gradient studio, subtle geometric shapes, no product",
    copy_tone: "스펙·숫자는 입력값만.",
    decor_prompt: "thin light lines and soft reflection arcs, no text, no product",
    icon_style: "geometric tech badge icon, soft circular frame",
  },
};

const LABELS = {
  checklist: ["수분 레이어"],
  usage: ["세안 후 도포"],
  spec: ["용량"],
  stat: ["수분감"],
};

function dataUrlToPng(dataUrl: string, filePath: string) {
  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
}

async function runPhase(phase: "before" | "after") {
  loadEnvLocal();
  // 132차: seedream/qwen 호출 금지 — 환경에 ICON_MODEL=qwen-image가 있어도 강제
  process.env.ICON_MODEL = "flux-schnell";
  process.env.TEST_MODE = "true";

  fs.mkdirSync(OUT, { recursive: true });
  const logLines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    logLines.push(s);
  };

  log(`[132] phase=${phase} ICON_MODEL=${process.env.ICON_MODEL} TEST_MODE=${process.env.TEST_MODE}`);

  let totalCost = 0;
  for (const category of Object.keys(BRIEFS) as (keyof typeof BRIEFS)[]) {
    const brief = BRIEFS[category]!;
    const theme = getCategoryTheme(category);
    const slug = category === "화장품/뷰티" ? "cosmetics" : "electronics";
    log(`[132] === ${category} (${slug}) ===`);

    const icons = await generateConceptIcons(
      brief,
      theme,
      LABELS.checklist,
      LABELS.usage,
      LABELS.spec,
      LABELS.stat,
    );
    totalCost += icons.cost;
    const iconEntries: [string, string | undefined][] = [
      ["checklist", icons.icons.checklist?.[0]],
      ["usage", icons.icons.usageSteps?.[0]],
      ["spec", icons.icons.specTable?.[0]],
      ["stat", icons.icons.statInfographic?.[0]],
    ];
    for (const [name, url] of iconEntries) {
      if (!url) {
        log(`[132] WARN missing icon ${slug}/${name}`);
        continue;
      }
      const fp = path.join(OUT, `132cha-${phase}-${slug}-icon-${name}.png`);
      dataUrlToPng(url, fp);
      log(`[132] wrote ${path.basename(fp)}`);
    }

    const banner = await generateIllustrationBanner(brief, theme);
    totalCost += banner.cost;
    if (banner.dataUrl) {
      const fp = path.join(OUT, `132cha-${phase}-${slug}-banner.png`);
      dataUrlToPng(banner.dataUrl, fp);
      log(`[132] wrote ${path.basename(fp)}`);
    } else {
      log(`[132] WARN missing banner ${slug}`);
    }
  }

  log(`[132] phase=${phase} totalCost≈$${totalCost.toFixed(4)}`);
  fs.writeFileSync(
    path.join(OUT, `132cha-${phase}-run-log.txt`),
    logLines.join("\n") + "\n",
    "utf8",
  );
}

const phase = process.argv[2];
if (phase !== "before" && phase !== "after") {
  console.error("Usage: npx tsx scripts/132cha-icon-illustration-ab.ts before|after");
  process.exit(1);
}

runPhase(phase).catch((e) => {
  console.error(e);
  process.exit(1);
});
