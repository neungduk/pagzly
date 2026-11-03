/**
 * 479차 — 짧은 모드 4 픽스처 + 극단 팔레트 4종 × 8 아키타입 × 750.
 *   npx tsx scripts/v5-gallery-465.ts --only=fx-tech-keyboard,...,fx-palette-yellow,... --ph2 --localize-blocked --photos=partial
 *   npx tsx scripts/contrast-render-479.ts
 * 시간 상한 12분. 실패 0(장식·header/footer 제외). 실패 시 첫 5건 + exit 1.
 */
import fs from "node:fs";
import { FIXTURES, runContrastRender478, summarizeFails, type Fail } from "./contrast-render-478";
import { ARCHETYPE_IDS } from "../lib/page-archetype-v5";

export const PALETTE_FIXTURES = [
  "fx-palette-yellow",
  "fx-palette-navy",
  "fx-palette-neon",
  "fx-palette-gray",
] as const;

const LIMIT_MS = 12 * 60 * 1000;

export async function runContrastRender479(): Promise<{ fails: Fail[]; pages: number; ms: number }> {
  const started = Date.now();
  const fixtures = [...FIXTURES, ...PALETTE_FIXTURES];
  const archetypes = [...ARCHETYPE_IDS];
  // 샘플링: 750만, 캡처 없음. 병렬은 Playwright 컨텍스트 직렬 유지(메모리).
  const { fails, totalCheckedPages } = await runContrastRender478({
    short: true,
    capture: false,
    fixtures,
    archetypes,
    outJson: "review/479-contrast-short.json",
  });
  const ms = Date.now() - started;
  if (ms > LIMIT_MS) {
    const over = fails.slice();
    over.push({
      fixture: "_timeout",
      archetype: "_limit",
      width: 750,
      section: "other",
      text: `초과 ${Math.round(ms / 1000)}s > 720s`,
      px: 0,
      ratio: 0,
      need: 1,
      deco: false,
    });
    return { fails: over, pages: totalCheckedPages, ms };
  }
  return { fails, pages: totalCheckedPages, ms };
}

if (/contrast-render-479\.ts$/.test(process.argv[1] ?? "")) {
  void runContrastRender479().then(({ fails, pages, ms }) => {
    const md = summarizeFails(fails).replace("478", "479");
    fs.writeFileSync("review/479-contrast-summary.md", md + `\npages=${pages} ms=${ms}\n`);
    console.log(md);
    console.log(`pages=${pages} ms=${ms} limit=${LIMIT_MS}`);
    if (fails.length) {
      console.log("첫 5건:");
      for (const f of fails.slice(0, 5)) {
        console.log(`- ${f.fixture}/${f.archetype} [${f.section}] «${f.text}» ${f.ratio}<${f.need}`);
      }
    }
    process.exit(fails.length || ms > LIMIT_MS ? 1 : 0);
  });
}
