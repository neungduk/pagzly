/**
 * 482 B — 키비주얼: 말풍선∩제품박스=0, 대비≥4.5, 마크업≤4KB, 아키타입 레시피 결정적, V5 off 미삽입.
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { contrastRatioToken } from "../../lib/design-tokens";
import {
  RECIPE_BY_ARCHETYPE_482,
  calloutOverlapsProduct482,
  collectCalloutTexts482,
  isKeyvisualSource482,
  keyvisualHtml482,
  keyvisualMarkupBytes482,
  layoutCallouts482,
  planKeyvisual482,
  shortCalloutText482,
} from "../../lib/keyvisual-482";
import { paletteFromTheme482 } from "../../lib/palette-from-product-482";
import { exportHtmlOf } from "../design-corpus";

export const name = "키비주얼 482 — 겹침·대비·용량·결정성";

const LIVE = "scripts/fixtures/live-481.json";
const PAL = paletteFromTheme482({ accent: "#AA933F", deepAccent: "#806E2F", baseNeutral: "#D0C7A8" });

export async function run(): Promise<string[]> {
  const f: string[] = [];

  if (shortCalloutText482("열세글자가넘는문구입니다요") !== null) f.push("12자 초과 말줄임 금지 깨짐");
  if (shortCalloutText482("카멜리아") !== "카멜리아") f.push("짧은 문구 통과 실패");

  if (isKeyvisualSource482({ photoKind: "person" })) f.push("손/인물 컷을 키비주얼로 받음");
  if (!isKeyvisualSource482({ photoKind: "product", role: "hero" })) f.push("제품 hero 거절");

  const texts = collectCalloutTexts482(["카멜리아 추출", "히알루론산", "산뜻한 마무리", "아주아주긴문구는여기금지됨"], 4);
  const laid = layoutCallouts482(texts);
  for (const c of laid) {
    if (calloutOverlapsProduct482(c)) f.push(`말풍선 겹침: ${c.text} @${c.cx},${c.cy}`);
  }

  for (const a of ARCHETYPE_IDS) {
    const p1 = planKeyvisual482({
      archetype: a,
      imageUrl: "https://example.com/p.png",
      palette: PAL,
      slot: "hero",
      calloutSources: texts,
      photoKind: "product",
      role: "hero",
      bigNumber: "1만",
    });
    const p2 = planKeyvisual482({
      archetype: a,
      imageUrl: "https://example.com/p.png",
      palette: PAL,
      slot: "hero",
      calloutSources: texts,
      photoKind: "product",
      role: "hero",
      bigNumber: "1만",
    });
    if (!p1 || !p2) {
      f.push(`${a}: plan null`);
      continue;
    }
    if (p1.recipe !== RECIPE_BY_ARCHETYPE_482[a]) f.push(`${a}: recipe ${p1.recipe}`);
    if (JSON.stringify(p1) !== JSON.stringify(p2)) f.push(`${a}: 비결정적`);
    const html = keyvisualHtml482(p1);
    const bytes = keyvisualMarkupBytes482(html);
    if (bytes > 4096) f.push(`${a}: markup ${bytes} > 4KB`);
    for (const c of p1.callouts) {
      // 말풍선 배경·글자 대비(합성 함수와 동일 규칙 근사)
      const bg = PAL.secondary;
      const ink = contrastRatioToken("#1B1B18", bg) >= 4.5 ? "#1B1B18" : "#FAF8F3";
      if (contrastRatioToken(ink, bg) < 4.5) f.push(`${a}: 말풍선 대비 <4.5`);
      if (calloutOverlapsProduct482(c)) f.push(`${a}: plan 겹침 ${c.text}`);
    }
  }

  if (!fs.existsSync(LIVE)) {
    f.push(`픽스처 없음 ${LIVE}`);
    return f;
  }

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  setV5ArchetypeForTests("editorial");
  const on = exportHtmlOf(LIVE);
  // 제품 hero면 키비주얼 삽입 기대(live-481)
  if (!/data-pz-kv482=/.test(on) && !/data-hero-v2="KV"/.test(on)) {
    // photoKind가 person이면 폴백 허용 — 다만 editorial 제품컷이면 보통 있음
    // 히어로 v2 계획이 없으면 스킵
    if (/data-hero-v2=/.test(on)) f.push("V5 on·히어로 있는데 키비주얼 없음");
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  const off = exportHtmlOf(LIVE);
  if (/data-pz-kv482=/.test(off) || /data-hero-v2="KV"/.test(off)) f.push("V5 off에 키비주얼 잔존");

  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 40).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
