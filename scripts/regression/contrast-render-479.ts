/**
 * 회귀 — 479차 렌더 픽셀 대비.
 * 짧은 4 픽스처 + 극단 팔레트 4종 × 8종 × 750, 실패 0, ≤12분.
 * 갤러리 없으면 스킵.
 */
import fs from "node:fs";
import path from "node:path";
import { runContrastRender479 } from "../contrast-render-479";

export const name = "렌더 대비 479 — 4+팔레트4 × 8 × 750 실패 0(≤12분)";

export async function run(): Promise<string[]> {
  const gallery = path.join(process.cwd(), "review/465-gallery/index.html");
  if (!fs.existsSync(gallery)) return [];
  try {
    const { fails, ms } = await runContrastRender479();
    if (ms > 12 * 60 * 1000) {
      return [`시간 초과 ${Math.round(ms / 1000)}s > 720s`, ...fails.slice(0, 4).map((f) => `${f.fixture}/${f.archetype} «${f.text}»`)];
    }
    if (!fails.length) return [];
    return fails.slice(0, 5).map(
      (f) => `${f.fixture}/${f.archetype} [${f.section}] «${f.text}» ${f.ratio}<${f.need}`,
    );
  } catch (e) {
    return [`contrast-render-479: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`];
  }
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
