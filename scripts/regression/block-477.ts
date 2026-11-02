/**
 * 477차 — 블록 요소 수·라벨 정렬 어휘·스크림 대비.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import {
  BLOCK_CHROME_V5,
  chromeVocabSpread,
  countVisualExtras,
  scrimTextContrastOk,
} from "../../lib/block-chrome-v5";
import { PHOTO_BLOCK_V5, renderPhotoBlock } from "../../lib/photo-block-v5";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "블록 477 — 요소 수·라벨·대비";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const spread = chromeVocabSpread();
  if (spread.places < 3) f.push(`라벨 위치 종류 ${spread.places} < 3`);
  if (spread.marks < 3) f.push(`표식 종류 ${spread.marks} < 3`);
  if (!scrimTextContrastOk()) f.push("스크림 위 흰 글 대비 < 4.5");

  for (const id of ARCHETYPE_IDS) {
    const v = BLOCK_CHROME_V5[id];
    if (!v.labelKey) f.push(`${id}: labelKey 없음`);
    if (!PHOTO_BLOCK_V5[id]) f.push(`${id}: PHOTO_BLOCK 없음`);
  }

  // 샘플 사진 블록 extras ≤ 5
  const samplePal = {
    ink: "#111111",
    deep: "#222222",
    accent: "#C45",
    tints: ["#f5f5f5", "#eee"] as [string, string],
    onFace: {
      light: { text: "#111", strong: "#111", sub: "#555" },
      tint: { text: "#111", strong: "#111", sub: "#555" },
      dark: { text: "#fff", strong: "#fff", sub: "rgba(255,255,255,.8)" },
      accent: { text: "#fff", strong: "#fff", sub: "rgba(255,255,255,.8)" },
    },
  };
  // minimal palette shape for render — cast via any-safe fields used by photo-block
  const p = samplePal as unknown as import("../../lib/palette-v4").V4Palette;
  let sum = 0;
  let n = 0;
  let max = 0;
  for (const id of ARCHETYPE_IDS) {
    const html = renderPhotoBlock(
      PHOTO_BLOCK_V5[id],
      [{ url: "/x.svg", pos: "50% 40%" }],
      "alt",
      `<p>제목</p>`,
      `<p>보조</p>`,
      p,
      id,
    );
    const c = countVisualExtras(html);
    sum += c;
    n += 1;
    if (c > max) max = c;
    if (c > 5) f.push(`${id} photo-block extras ${c} > 5`);
  }
  const avg = n ? sum / n : 0;
  if (avg > 3.5) f.push(`사진 블록 extras 평균 ${avg.toFixed(2)} > 3.5 (목표 ≤3, 여유 0.5)`);

  // export 경로에 data-pz-pb 또는 data-pz-zoom 또는 data-pz-specdiag 중 ≥1 (V5 on)
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  setV5ArchetypeForTests("impact");
  const html = exportHtmlOf(corpus().find(([id]) => id === "fx-skincare-serum")?.[1] ?? corpus()[0]![1]);
  if (!/data-pz-pb=|data-pz-zoom=|data-pz-specdiag=|data-pz-bchrome=/.test(html)) {
    f.push("V5 export에 477 블록 표식(pb/zoom/specdiag/bchrome) 없음");
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) {
  run().then((fails) => {
    console.log(fails.length ? fails.join("\n") : "ok");
    process.exit(fails.length ? 1 : 0);
  });
}
