/**
 * 저장된 session.json의 상품 사진에 컨셉 효과를 최대 2개 합성한다.
 * 전체 파이프라인(배경/누끼)은 다시 돌리지 않는다.
 *
 * 실행: npx tsx scripts/apply-concept-effects.ts 뷰티-스킨케어
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import {
  generateConceptEffectGraphic,
  overlayConceptEffectOnProduct,
  resolveConceptEffects,
  CONCEPT_EFFECT_UNIT_COST,
  CONCEPT_EFFECT_MAX,
} from "../lib/concept-effects";
import type { ConceptBrief } from "../lib/concept-brief";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch 실패 ${url} ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function capturePreview(sessionRaw: string, outPath: string) {
  const browser = await chromium.launch();
  const context = fs.existsSync(STORAGE_STATE_PATH)
    ? await browser.newContext({
        storageState: STORAGE_STATE_PATH,
        viewport: { width: 430, height: 900 },
        deviceScaleFactor: 2,
      })
    : await browser.newContext({
        viewport: { width: 430, height: 900 },
        deviceScaleFactor: 2,
      });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((raw) => {
    sessionStorage.setItem("pagzly-create-result", raw);
  }, sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  const preview = page.locator('[data-testid="detail-preview"]');
  await preview.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(800);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await preview.screenshot({ path: outPath });
  await browser.close();
  console.log(`스크린샷: ${outPath}`);
}

function findImageIndexByHeading(
  sections: Array<{ heading?: string; headline?: string; imageIndex?: number }>,
  pattern: RegExp,
): number | undefined {
  const match = sections.find((section) => {
    const text = `${section.heading ?? ""} ${section.headline ?? ""}`;
    return pattern.test(text) && typeof section.imageIndex === "number";
  });
  return match?.imageIndex;
}

function pickAssignments(
  session: {
    generated?: {
      sections?: Array<{
        type: string;
        slot?: string;
        imageIndex?: number;
        heading?: string;
        headline?: string;
      }>;
    };
    imageUrls: string[];
  },
  effectIds: string[],
): Array<{ specIndex: number; imageIndex: number; label: string }> {
  const sections = session.generated?.sections ?? [];
  const hero = sections.find((s) => s.type === "hero")?.imageIndex ?? 0;
  const texture = sections.find((s) => s.slot === "texture_feel")?.imageIndex;
  const ingredient = sections.find((s) => s.slot === "ingredient_highlight")?.imageIndex;
  const material = sections.find((s) => s.slot === "material_feature")?.imageIndex;
  const feature = sections.find((s) => s.slot === "feature_detail")?.imageIndex;
  const fallbackPoint =
    ingredient ?? texture ?? material ?? feature ?? Math.min(1, session.imageUrls.length - 1);

  const used = new Set<number>();
  return effectIds.map((id, specIndex) => {
    let imageIndex = fallbackPoint;
    let label = "copy-match";
    if (id === "moisture") {
      imageIndex =
        findImageIndexByHeading(sections, /수분|촉촉|물방울|보습/) ?? fallbackPoint;
    } else if (id === "cooling" || id === "tech-glow" || id === "warm-light") {
      imageIndex = hero;
      label = "hero";
    } else if (id === "nourishing") {
      imageIndex = texture ?? fallbackPoint;
    }
    if (used.has(imageIndex) && imageIndex !== hero) {
      imageIndex = hero;
      label = "hero";
    }
    used.add(imageIndex);
    return { specIndex, imageIndex, label };
  });
}

async function main() {
  loadEnvLocal();
  const categoryKey = process.argv[2] ?? "뷰티-스킨케어";
  const sessionPath = path.join(ROOT, "review", "iteration", categoryKey, "session.json");
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`세션 없음: ${sessionPath}`);
  }

  const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
    conceptBrief?: ConceptBrief;
    imageUrls: string[];
    generated?: { sections?: Array<{ type: string; slot?: string; imageIndex?: number; heading?: string; headline?: string }> };
  };
  if (!session.conceptBrief) {
    throw new Error("session.json에 conceptBrief가 없습니다.");
  }

  const copyHaystack = (session.generated?.sections ?? [])
    .flatMap((section) => [section.heading, section.headline])
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const effects = resolveConceptEffects(session.conceptBrief, copyHaystack);
  const expected = effects.length * CONCEPT_EFFECT_UNIT_COST;
  console.log(
    `[effects] 카테고리=${categoryKey} 선택=${effects.map((e) => e.id).join(",")} ` +
      `예상=$${expected.toFixed(4)} (최대 ${CONCEPT_EFFECT_MAX}개 × $${CONCEPT_EFFECT_UNIT_COST})`,
  );

  const outDir = path.join(ROOT, "review", "iteration", "effects");
  fs.mkdirSync(outDir, { recursive: true });

  const beforePage = path.join(outDir, `${categoryKey}-before-page.png`);
  await capturePreview(JSON.stringify(session), beforePage);

  const assignments = pickAssignments(
    session,
    effects.map((effect) => effect.id),
  );

  const uniqueSpecs = [...new Set(assignments.map((a) => a.specIndex))];
  const graphics = new Map<number, { buffer: Buffer; cost: number }>();
  let totalCost = 0;
  for (const specIndex of uniqueSpecs) {
    const spec = effects[specIndex];
    const generated = await generateConceptEffectGraphic(spec);
    graphics.set(specIndex, generated);
    totalCost += generated.cost;
    fs.writeFileSync(path.join(outDir, `${categoryKey}-fx-${spec.id}.png`), generated.buffer);
  }

  const nextUrls = [...session.imageUrls];
  for (const assignment of assignments) {
    const spec = effects[assignment.specIndex];
    const graphic = graphics.get(assignment.specIndex);
    if (!graphic) continue;
    const srcUrl = session.imageUrls[assignment.imageIndex];
    if (!srcUrl) continue;
    const beforeBuf = await fetchBuffer(srcUrl);
    fs.writeFileSync(
      path.join(outDir, `${categoryKey}-${spec.id}-${assignment.label}-before.png`),
      beforeBuf,
    );
    const afterBuf = await overlayConceptEffectOnProduct(beforeBuf, graphic.buffer, spec);
    fs.writeFileSync(
      path.join(outDir, `${categoryKey}-${spec.id}-${assignment.label}-after.png`),
      afterBuf,
    );
    nextUrls[assignment.imageIndex] = `data:image/png;base64,${afterBuf.toString("base64")}`;
    console.log(
      `[effects] overlay ${spec.id} → image[${assignment.imageIndex}] (${assignment.label})`,
    );
  }

  const nextSession = { ...session, imageUrls: nextUrls };
  const nextRaw = JSON.stringify(nextSession);
  fs.writeFileSync(path.join(outDir, `${categoryKey}-session-effects.json`), nextRaw, "utf8");
  const afterPage = path.join(outDir, `${categoryKey}-after-page.png`);
  await capturePreview(nextRaw, afterPage);

  console.log(`[cost] concept-effects total=$${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
