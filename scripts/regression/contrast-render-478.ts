/**
 * 회귀 — 478차 렌더 픽셀 대비(짧은 모드: 4 픽스처 × 8종 × 750만).
 * 갤러리(`review/465-gallery`)가 있으면 검사기 실행, 실패 0(장식 제외). 없으면 스킵.
 */
import fs from "node:fs";
import path from "node:path";
import { runContrastRender478 } from "../contrast-render-478";

export const name = "렌더 대비 478 — 4×8×750 실패 0(data-pz-deco 제외)";

export async function run(): Promise<string[]> {
  const gallery = path.join(process.cwd(), "review/465-gallery/index.html");
  if (!fs.existsSync(gallery)) {
    return []; // 갤러리 없는 CI/환경은 스킵
  }
  try {
    const { fails } = await runContrastRender478({
      short: true,
      capture: false,
      outJson: "review/478-contrast-short.json",
    });
    if (!fails.length) return [];
    return fails.slice(0, 5).map(
      (f) => `${f.fixture}/${f.archetype} [${f.section}] «${f.text}» ${f.ratio}<${f.need}`,
    );
  } catch (e) {
    return [`contrast-render-478: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`];
  }
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
