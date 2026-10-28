/**
 * 회귀 — 471차 첫 화면 대격변. 브라우저·네트워크 없음(문자열 렌더만). 단계마다 검사를 더한다.
 *  A: 첫 화면 구간 레시피(가격 줄·한눈에 보기·탭 칩·히어로 비율·장식 숫자 위치): 표·CSS 안전·시그니처 쌍 차이 ≥ 3·가격/탭 칩 보존
 *  B: 장식 숫자 겹침 `overlapRatioV5`(제목 겹침 ≤ 20%·잘림 0)·잘림 위험 0
 *  D: 히어로 사진 하한(0 위반)
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { GHOST_MIN_BAND, HERO_STACK, ghostBoxV5, heroStackCssV5, overlapRatioV5, resolveGhostV5 } from "../../lib/hero-stack-v5";
import { pickHeroV5 } from "../../lib/hero-spec";
import { corpus, exportHtmlOf } from "../design-corpus";
import { INTERLUDE_MAX } from "../../lib/layout-variants";
import { ghostStats, scenePairsWithoutInterlude, heroFloorViolations, heroSig, sigDiff } from "../hero-metrics-471";

export const name = "첫 화면 471 — 구간 레시피·장식 숫자 겹침·히어로 사진 하한";

const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "filter:", "backdrop-filter", "position:fixed", "animation", "visibility:hidden", "display:none"];

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // ── A: 표
  const strips = new Set(ARCHETYPE_IDS.map((a) => HERO_STACK[a].strip));
  const navs = new Set(ARCHETYPE_IDS.map((a) => HERO_STACK[a].nav));
  if (strips.size !== 8 || navs.size !== 8) f.push(`가격 줄 ${strips.size}종·탭 칩 ${navs.size}종 — 8종이 모두 달라야 함`);
  for (const a of ARCHETYPE_IDS) {
    if (["tr"].includes(HERO_STACK[a].ghost as string)) f.push(`${a}: 우상단 고정 금지`);
    const css = heroStackCssV5(".w", a, "#1B1B18");
    for (const k of FORBIDDEN) if (css.includes(k)) f.push(`${a}: 금지/숨김 CSS ${k}`);
    if (!/data-pz-hs="strip"/.test(css) || !/data-pz-hs="glance"/.test(css) || !/data-pz-hs="nav"/.test(css) || !/data-pz-hs="ratio"/.test(css)) f.push(`${a}: 규칙 표식 누락`);
    if (!/nav\.pagzly-anchor-nav:not\(\[data-pz-hs="nav"\]\) a\{[^}]*min-height:44px/.test(css)) f.push(`${a}: 탭 칩 터치 대상 44px 규칙 없음`);
    for (const m of css.matchAll(/font-size:(\d+)px/g)) if (Number(m[1]) < 12) f.push(`${a}: 글자 ${m[1]}px < 12`);
    if (/width:\s*(\d{4,})px/.test(css)) f.push(`${a}: 750 초과 고정 폭`);
    // 가격 줄·한눈에 보기·탭 칩 규칙은 모양만 — 위치 이동(position:absolute/fixed)·order 없음
    if (/position:(?:absolute|fixed)|(?:^|[;{ ])order:/.test(css)) f.push(`${a}: 첫 화면 규칙이 위치/순서를 바꿈`);
  }
  {
    const pa = fs.readFileSync("lib/page-archetype-v5.ts", "utf8");
    if (!/rules\.push\(heroStackCssV5\(scope, t\.id, ink\)\)/.test(pa)) f.push("heroStackCssV5가 archetypeCssV5(V5 전용) 밖에서 호출됨");
  }
  // ── D: 히어로 변형 하한(E → D)
  if (pickHeroV5(["E", "D"], { hasPhoto: true, kind: "product", confidence: 0.9 }, "E") !== "D") f.push("E 히어로가 사진이 있는데 대체되지 않음");
  if (pickHeroV5(["E", "D"], { hasPhoto: false, kind: "unknown", confidence: 0 }, "E") !== "E") f.push("사진이 없을 때는 기존 선택(E) 유지여야 함");
  // ── B: 장식 숫자 겹침(단위)
  const PADS: Array<[number, number]> = [[28, 56], [32, 64], [40, 64], [40, 88], [48, 96], [56, 104], [64, 110], [88, 110], [16, 20], [30, 30]];
  for (const a of ARCHETYPE_IDS) for (const [pt, pb] of PADS) for (const W of [320, 390, 750]) for (const ts of [26, 44, 56]) {
    const res = resolveGhostV5(HERO_STACK[a].ghost, pt, pb);
    if (!res) { if (pt >= GHOST_MIN_BAND || pb >= GHOST_MIN_BAND) f.push(`${a}: 띠 ${pt}/${pb}인데 놓을 자리가 없다고 함`); continue; }
    const g = ghostBoxV5(res.pos, res.band, "01", W, 600, ARCHETYPES[a].dyn.level);
    const o = overlapRatioV5(g, { W, H: 600, padTop: pt, padBottom: pb, titleSize: ts, titleLines: 2 });
    if (o.titleOverlap > 0.2 || o.contentOverlap > 0.2) f.push(`${a} pad ${pt}/${pb} W${W} 제목${ts}: 겹침 제목 ${o.titleOverlap.toFixed(2)}·내용 ${o.contentOverlap.toFixed(2)} > 0.2`);
    const edge = res.pos === "le" || res.pos === "re";
    if (o.cutRatio > (edge ? 0.5 : 0)) f.push(`${a} pad ${pt}/${pb} W${W}: 잘림 ${o.cutRatio.toFixed(2)}`);
  }
  // 겹침 함수 자체 점검: 제목 한가운데에 놓은 상자는 겹침이 크다고 나와야 한다
  {
    const o = overlapRatioV5({ x: 24, y: 40, w: 200, h: 80, size: 80 }, { W: 390, H: 600, padTop: 40, padBottom: 60, titleSize: 44, titleLines: 2 });
    if (o.titleOverlap < 0.2) f.push("overlapRatioV5가 제목 위에 놓인 상자의 겹침을 못 잡음");
    const out = overlapRatioV5({ x: -50, y: 6, w: 100, h: 60, size: 60 }, { W: 390, H: 600, padTop: 80, padBottom: 80, titleSize: 44, titleLines: 1 });
    if (out.cutRatio < 0.4) f.push("overlapRatioV5가 바깥으로 나간 비율을 못 잡음");
  }
  // ── 말뭉치
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const sigs: Record<string, ReturnType<typeof heroSig>[]> = {};
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    sigs[a] = [];
    for (const [id, file] of corpus()) {
      const h = exportHtmlOf(file);
      sigs[a]!.push(heroSig(h));
      if (heroFloorViolations(h) > 0) f.push(`${id}/${a}: 히어로 사진 하한 위반`);
      const g = ghostStats(h);
      if (g.risky > 0 || g.topRight > 0) f.push(`${id}/${a}: 장식 숫자 잘림 위험 ${g.risky}·우상단 ${g.topRight}`);
      // ── C: 끼워 넣은 구분 띠 — 글 없음·페이지당 ≤ INTERLUDE_MAX·장면 쌍 사이 짧은 구간 있음
      const bands = [...h.matchAll(/<section[^>]*data-pz-v4="breather\.rule"[^>]*>[\s\S]*?<\/section>/g)].map((m) => m[0]);
      if (bands.length > INTERLUDE_MAX) f.push(`${id}/${a}: 구분 띠 ${bands.length} > ${INTERLUDE_MAX}`);
      for (const b of bands) if (/>[^<>\s][^<>]*</.test(b.replace(/<style[\s\S]*?<\/style>/g, ""))) f.push(`${id}/${a}: 구분 띠에 글자가 있음`);
      if (scenePairsWithoutInterlude(h).missing > 0) f.push(`${id}/${a}: 장면 쌍 사이에 짧은 구간 없음`);
      // 보존: 가격 줄 3요소·탭 칩 앵커 링크가 마크업에 그대로 있다
      if (/data-pz-strip>/.test(h)) {
        if (!/data-pz-strip-price>/.test(h)) f.push(`${id}/${a}: 가격 줄의 가격 요소 없음`);
        if ((h.match(/<nav class="pagzly-anchor-nav"[\s\S]*?<\/nav>/)?.[0].match(/href="#pagzly-/g) ?? []).length === 0) f.push(`${id}/${a}: 탭 칩 앵커 링크 없음`);
      }
    }
  }
  const files = corpus();
  for (let p = 0; p < files.length; p += 1) for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) {
    const d = sigDiff(sigs[ARCHETYPE_IDS[i]!]![p]!, sigs[ARCHETYPE_IDS[j]!]![p]!);
    if (d < 3) f.push(`${files[p]![0]} ${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}: 첫 화면 시그니처 차이 ${d} < 3`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
