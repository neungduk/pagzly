/**
 * 회귀 — 472차 첫 화면 시각 시그니처·상품 색 계열. 브라우저·네트워크 없음(문자열 렌더).
 *  V1: 쌍마다 시각 시그니처 7칸 중 ≥4 차이
 *  V2: 같은 상품 8아키타입 bg hue bin ≥5
 *  보존: 가격 줄·탭 칩·히어로 하한·장식 숫자 위험 0·금지 CSS
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { HERO_STACK, heroStackCssV5, visualSigDiff } from "../../lib/hero-stack-v5";
import { corpus, exportHtmlOf } from "../design-corpus";
import { heroFloorViolations, ghostStats, recipeVsigDiff, uniqueBgBins, visualSig } from "../hero-metrics-472";

export const name = "첫 화면 472 — 시각 시그니처·상품 색 계열";

const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "filter:", "backdrop-filter", "position:fixed", "animation", "visibility:hidden", "display:none"];

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // 레시피 표: 8종 쌍 recipe 기준 ≥4, strip/nav/frame 다양
  const frames = new Set(ARCHETYPE_IDS.map((a) => HERO_STACK[a].frame));
  if (frames.size < 5) f.push(`사진 틀 ${frames.size}종 — 최소 5종`);
  for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) {
    const d = recipeVsigDiff(ARCHETYPE_IDS[i]!, ARCHETYPE_IDS[j]!);
    if (d < 4) f.push(`레시피 ${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}: 시각 시그니처 ${d} < 4`);
  }
  for (const a of ARCHETYPE_IDS) {
    const css = heroStackCssV5(".w", a, "#4A7AB5");
    for (const k of FORBIDDEN) if (css.includes(k)) f.push(`${a}: 금지 CSS ${k}`);
    if (!/data-pz-hs="strip"/.test(css) || !/data-pz-hs="glance"/.test(css) || !/data-pz-hs="nav"/.test(css)) f.push(`${a}: 규칙 표식 누락`);
    if (!/data-pz-vsig=/.test(css)) f.push(`${a}: 시각 시그니처 표식 누락`);
    if (/position:(?:absolute|fixed)|(?:^|[;{ ])order:/.test(css)) f.push(`${a}: 첫 화면 규칙이 위치/순서를 바꿈`);
  }
  {
    const pa = fs.readFileSync("lib/page-archetype-v5.ts", "utf8");
    if (!/heroStackCssV5\(scope, t\.id/.test(pa)) f.push("heroStackCssV5가 archetypeCssV5 밖에서 호출됨");
    // catalog/softlife/pop/impact 히어로 선호가 더 이상 전부 B가 아님
    if (!/catalog:[\s\S]*?hero:\s*\["D"/.test(pa)) f.push("catalog 히어로 선호가 D 우선이 아님");
    if (!/impact:[\s\S]*?hero:\s*\["A"/.test(pa)) f.push("impact 히어로 선호가 A 우선이 아님");
  }
  // 말뭉치
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const byPage: Record<string, ReturnType<typeof visualSig>[]> = {};
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [id, file] of corpus()) {
      const h = exportHtmlOf(file);
      const sig = visualSig(h, a);
      (byPage[id] ??= []).push(sig);
      if (heroFloorViolations(h) > 0) f.push(`${id}/${a}: 히어로 사진 하한 위반`);
      const g = ghostStats(h);
      if (g.risky > 0 || g.topRight > 0) f.push(`${id}/${a}: 장식 숫자 잘림 ${g.risky}·우상단 ${g.topRight}`);
      if (!/data-pz-vsig=/.test(h)) f.push(`${id}/${a}: data-pz-vsig 없음`);
      if (/data-pz-strip>/.test(h)) {
        if (!/data-pz-strip-price>/.test(h)) f.push(`${id}/${a}: 가격 요소 없음`);
        if ((h.match(/<nav class="pagzly-anchor-nav"[\s\S]*?<\/nav>/)?.[0].match(/href="#pagzly-/g) ?? []).length === 0) f.push(`${id}/${a}: 탭 칩 앵커 없음`);
      }
    }
  }
  for (const [id, sigs] of Object.entries(byPage)) {
    if (sigs.length !== 8) continue;
    for (let i = 0; i < 8; i += 1) for (let j = i + 1; j < 8; j += 1) {
      const d = visualSigDiff(sigs[i]!, sigs[j]!);
      if (d < 4) f.push(`${id} ${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}: 시각 시그니처 ${d} < 4 (bg=${sigs[i]!.bg}/${sigs[j]!.bg} fr=${sigs[i]!.frame}/${sigs[j]!.frame})`);
    }
    const bins = uniqueBgBins(sigs);
    if (bins < 5) f.push(`${id}: 히어로 색 계열 ${bins} < 5`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
