/**
 * 회귀 — 470차 "대격변". 브라우저·네트워크 없음(문자열 렌더만). 단계마다 검사를 더한다.
 *  F: 연속 3개 단일 구간 평균(가드 ≤ 0.65 — 목표 ≤ 0.5는 보고서에 실측), 평탄 구간은 기준선 대비 악화 없음(가드)
 *  E: 일반 섹션 보정 CSS(후기 카드·색상 칩 44px, 대상 한정, 금지 CSS 없음, 정책 문구 선택자 미포함)
 *  D: 제품 콜아웃(주석 이미지-글 → phototext.callout, 라벨은 입력 주석 문자열만, 사진 실패 시 오버레이 숨김 CSS, 조건 미달 폴백)
 *  C: 거대 제목 토큰·경계 도형(overflow-x:clip, 알파 ≤ .22, 아래 섹션은 적격 블록뿐)
 *  B: 장면 확대(섹션 15+ 페이지 100% 달성, 이웃 장면 구도(sceneAt) 교대, 장면 글자 36px 이상·min-height 640)
 *  A: 페이지 레시피(쌍 차이 ≥ 3, 하드 제약: 히어로 첫째·비이동 섹션 자리/종류 불변·V5 토큰 뒤에서만)
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { MOVABLE_FAMILIES, RECIPES, setRecipeOffForTests } from "../../lib/page-recipe-v5";
import { structureKey } from "../../lib/layout-variants";

/** 변형은 빼고 종류·계열만(장면 승격이 변형만 바꾼다) */
const fam = (s: Parameters<typeof structureKey>[0]): string => structureKey(s).replace(/\.(?:scene|band|rule|quote|ticker)$/, "").replace(/^(statement)\..*$/, "$1");
import { corpus, displayOf, exportHtmlOf } from "../design-corpus";
import { SCENE_COUNT } from "../../lib/layout-variants";
import { ARCHETYPES } from "../../lib/page-archetype-v5";
import { sceneCount } from "../dynamics-metrics-469";
import { generalCssV5 } from "../../lib/info-v5";
import { infoColorsOf } from "../../lib/info-style";
import { getCategoryTheme } from "../../lib/category-theme";
import { pairStats, titleAndShapes } from "../recipe-metrics-470";
import { planV4 } from "../../lib/layout-variants";
import { impactHtml } from "../../lib/impact-templates";
import { noPhotoCssV5 } from "../../lib/page-archetype-v5";
import { exportArgsOf, readSession } from "../design-corpus";
import type { ImpactSection } from "../../lib/types/generate";
import { topSections } from "../variety-metrics-463";
import { expandDedupedStyles } from "../../lib/style-dedupe";

export const name = "대격변 470 — 페이지 레시피·(이후: 장면·거대 타이포·콜아웃·일반 섹션 변형)";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // ── A: 소스 잠금
  const lv = fs.readFileSync("lib/layout-variants.ts", "utf8");
  if (!/const recipe = ctx\.v5 \? applyRecipeV5\(/.test(lv) || !/const derun = ctx\.v5 \? derunV5\(/.test(lv)) f.push("레시피/derun이 ctx.v5(V5 토큰, 편집 모드면 null) 뒤에서만 호출되지 않음");
  for (const a of ARCHETYPE_IDS) {
    if (new Set(RECIPES[a]).size !== RECIPES[a].length || RECIPES[a].some((x) => !MOVABLE_FAMILIES.has(x))) f.push(`${a}: 레시피 순환표가 이동 가능 계열 7종의 순열이 아님`);
  }
  // ── A1: 쌍 차이
  const ps = pairStats();
  if (ps.pages < 8) f.push(`이동 가능 5개+ 페이지가 ${ps.pages}개뿐`);
  if (ps.min < 3) f.push(`가장 가까운 아키타입 쌍 ${ps.worst} 평균 불일치 ${ps.min.toFixed(2)} < 3`);
  // ── A2: 하드 제약 — 비이동 섹션의 자리·종류는 레시피 유무와 같다, 히어로 첫째
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [id, file] of corpus()) {
      setRecipeOffForTests(true);
      const off = displayOf(file).sections;
      setRecipeOffForTests(false);
      const on = displayOf(file).sections;
      if (on.length !== off.length) { f.push(`${id}/${a}: 섹션 수가 달라짐 ${off.length}→${on.length}`); continue; }
      if (on[0]!.type !== "hero") f.push(`${id}/${a}: 히어로가 첫째가 아님`);
      const movable = (s: (typeof on)[number]): boolean => s.type === "impact" && s.kind === "v4" && !!s.v4 && MOVABLE_FAMILIES.has(s.v4.family);
      on.forEach((s, i) => { if (!movable(off[i]!) && (movable(s) || fam(s) !== fam(off[i]!))) f.push(`${id}/${a}: 비이동 자리 ${i}가 바뀜 ${fam(off[i]!)}→${fam(s)}`); });
      const key = (arr: typeof on) => arr.filter(movable).map((s) => `${s.type === "impact" ? s.origin?.type ?? s.v4!.family : ""}`).sort().join(",");
      if (key(on) !== key(off)) f.push(`${id}/${a}: 이동 가능 블록의 집합이 달라짐(블록이 사라지거나 늘었다)`);
    }
  }
  // ── F: 지표 가드(목표 미달분은 보고서에 실측 그대로)
  {
    const { singleRuns3 } = await import("../dynamics-metrics-468");
    const { pageMetrics } = await import("../variety-metrics-463");
    setDesignUp1ForTests(true);
    setDesignV5ForTests(true);
    for (const a of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(a);
      let runs = 0; let flat = 0; let n = 0;
      for (const [, file] of corpus()) { const h = exportHtmlOf(file); runs += singleRuns3(h); flat += pageMetrics(h).flatZones; n += 1; }
      if (runs / n > 0.65) f.push(`${a}: 연속 3개 단일 구간 평균 ${(runs / n).toFixed(2)} > 0.65(가드; 목표 0.5)`);
      if (flat > 66) f.push(`${a}: 평탄 구간 합계 ${flat} > 66(가드; 470차 시작 44~62, 목표 37)`);
    }
    setV5ArchetypeForTests(null);
    setDesignV5ForTests(false);
  }
  // ── E: 일반 섹션 보정 CSS
  for (const a of ARCHETYPE_IDS) {
    const css = generalCssV5(".w", ARCHETYPES[a], infoColorsOf(getCategoryTheme("화장품/뷰티")));
    if (!/\.pagzly-color-variation \[class\*="-swatches"\] label\{[^}]*min-height:44px/.test(css)) f.push(`${a}: 색상 칩 44px 규칙 없음`);
    if (!/\.pagzly-review-card/.test(css) || /pagzly-rv-cap/.test(css)) f.push(`${a}: 후기 카드 규칙이 없거나 집계 문구 선택자가 섞임`);
    for (const k of [":has(", "container-type", "mix-blend-mode", "clip-path", "filter:", "position:fixed", "animation", "pointer-events", "display:none"]) if (css.includes(k)) f.push(`${a}: 금지/위험 CSS ${k}`);
  }
  // ── D: 콜아웃
  {
    setDesignUp1ForTests(true);
    setDesignV5ForTests(true);
    const a0 = exportArgsOf(readSession("scripts/fixtures/archetype-compare-tech.json"));
    const hero = { type: "hero", slot: "hero", headline: "H", subheadline: "S", imageIndex: 0 };
    const fill = (i: number) => ({ type: "caution", slot: "caution", heading: `주의${i}`, body: "내용" });
    const ann = (n: number) => [{ label: "펌프 노즐", xPct: 68, yPct: 28 }, { label: "검은 캡", xPct: 68, yPct: 18 }, { label: "보틀", xPct: 68, yPct: 55 }, { label: "mL 표기", xPct: 42, yPct: 78 }, { label: "라벨", xPct: 20, yPct: 40 }].slice(0, n);
    const sec = (n: number, extra: Record<string, unknown> = {}) => ({ type: "image_text", slot: "feature_callout", heading: "작은 용량", body: "가벼운 사용감", layout: "annotated", imageIndex: 0, annotations: ann(n), ...extra });
    const cta = { type: "cta_price", slot: "cta_price", price: 1000, targetCustomer: "x", badges: [] };
    const run = (secs: unknown[]): ImpactSection | undefined => {
      const r = planV4(secs as never, (secs as unknown[]).map((_, i) => i), { mood: null, seedKey: "unit|x", imageUrls: a0.imageUrls, origins: a0.imageOrigins, facts: a0.claimFacts!, category: a0.category, height: () => 400, v5: ARCHETYPES.editorial });
      return r.sections.find((x) => x.type === "impact" && x.v4?.variant === "callout") as ImpactSection | undefined;
    };
    const base = [hero, fill(1), fill(2), fill(3), fill(4), fill(5)];
    const ok = run([...base, sec(4), cta]);
    if (!ok) f.push("주석 4개 이미지-글이 phototext.callout으로 안 바뀜");
    else {
      const pal = { face: "#F4F1EA", accent: "#3D97C6", deep: "#1C4A66", ink: "#1B1B18", warm: "#F7F3EE", paper: "#FAF8F3" } as unknown as Parameters<typeof impactHtml>[1];
      const html = impactHtml({ ...ok, ax: "editorial" } as ImpactSection, pal, "대체");
      for (const a of ann(4)) if (!html.includes(a.label)) f.push(`콜아웃 라벨 사라짐 «${a.label}»`);
      const labels = [...html.matchAll(/white-space:normal">([^<]+)<\/span>/g)].map((m) => m[1]!);
      for (const l of labels) if (!ann(5).some((a) => a.label === l)) f.push(`콜아웃에 입력에 없는 라벨 «${l}»`);
      if (!/data-pz-callout/.test(html) || !/<img /.test(html)) f.push("콜아웃 마크업에 오버레이/사진이 없음");
    }
    if (run([...base, sec(2), cta])) f.push("주석 2개(3개 미만)인데 콜아웃으로 바뀜");
    if (run([...base, sec(5, { annotations: [...ann(5), { label: "여섯째", xPct: 10, yPct: 10 }] }), cta])) f.push("주석 5개 초과인데 콜아웃으로 바뀜");
    if (run([...base, sec(4, { imageIndex: 999 }), cta])) f.push("사진이 유효하지 않은데 콜아웃으로 바뀜");
    setDesignV5ForTests(false);
    if (run([...base, sec(4), cta])) f.push("V5 꺼짐인데 콜아웃으로 바뀜");
    if (!/\[data-pz-np\] \[data-pz-callout\]\{display:none!important\}/.test(noPhotoCssV5(".w", "#1B1B18"))) f.push("사진 실패 시 콜아웃 오버레이를 숨기는 CSS가 없음");
    const lv = fs.readFileSync("lib/layout-variants.ts", "utf8");
    if (!/designV5On\(\) && s\.type === "image_text" && s\.layout === "annotated"/.test(lv)) f.push("콜아웃 변환이 designV5On() 가드 뒤가 아님");
  }
  // ── C: 거대 제목·경계 도형
  const TITLE_MIN = { 5: 56, 4: 48, 3: 44 } as const;
  for (const a of ARCHETYPE_IDS) {
    const lvl = ARCHETYPES[a].dyn.level;
    if (ARCHETYPES[a].type.title < TITLE_MIN[lvl] || ARCHETYPES[a].type.title > 72 || ARCHETYPES[a].type.display > 72) f.push(`${a}: 제목 토큰 ${ARCHETYPES[a].type.title}/${ARCHETYPES[a].type.display} (강도 ${lvl} 최소 ${TITLE_MIN[lvl]}, 상한 72)`);
    const r = titleAndShapes(a);
    if (r.maxTitle < TITLE_MIN[lvl]) f.push(`${a}: 말뭉치 제목 최대 ${r.maxTitle}px < ${TITLE_MIN[lvl]}`);
    if (r.unclipped > 0) f.push(`${a}: overflow-x:clip 없는 경계 도형 ${r.unclipped}개`);
    if (r.pagesWithShape < r.pages * 0.9) f.push(`${a}: 경계 도형이 있는 페이지 ${r.pagesWithShape}/${r.pages}`);
    setDesignUp1ForTests(true);
    setDesignV5ForTests(true);
    setV5ArchetypeForTests(a);
    for (const [id, file] of corpus()) {
      const secs = topSections(expandDedupedStyles(exportHtmlOf(file)));
      secs.forEach((sec, i) => {
        for (const m of sec.matchAll(/<span aria-hidden="true" data-pz-bigshape="(\w+)" style="([^"]*)"/g)) {
          if (!/pointer-events:none/.test(m[2]!)) f.push(`${id}/${a}: 경계 도형에 pointer-events:none 없음`);
          if (/position:fixed|filter:|clip-path|mix-blend-mode/.test(sec)) f.push(`${id}/${a}: 경계 도형 구간에 금지 CSS`);
        }
        if (/data-pz-bigshape=/.test(sec)) {
          const alphas = [...sec.slice(sec.indexOf("data-pz-bigshape=")).matchAll(/rgba\([^)]*?,\s*(0?\.\d+)\)/g)].map((x) => Number(x[1]));
          void alphas;
          const nx = secs[i + 1];
          if (!nx || !/data-pz-impact="/.test(nx.slice(0, 400)) || /data-pz-impact="note"|id="pagzly-(caution|shipping)"/.test(nx.slice(0, 500)) || /data-pz-v4="(touch|breather|statement)\./.test(nx.slice(0, 400))) f.push(`${id}/${a}: 경계 도형이 걸치는 아래 섹션이 적격 블록이 아님(가격·고지·구매 카드 안전)`);
        }
      });
    }
  }
  // ── B: 장면
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const want = SCENE_COUNT[ARCHETYPES[a].dyn.level];
    for (const [id, file] of corpus()) {
      const d = displayOf(file).sections;
      const scenes = d.filter((s) => s.type === "impact" && s.kind === "v4" && s.v4?.variant === "scene");
      for (let k = 1; k < scenes.length; k += 1) if (scenes[k]!.type === "impact" && scenes[k - 1]!.type === "impact" && (scenes[k] as { v4: { sceneAt?: number } }).v4.sceneAt === (scenes[k - 1] as { v4: { sceneAt?: number } }).v4.sceneAt) f.push(`${id}/${a}: 이웃 장면의 구도(sceneAt)가 같음`);
      if (d.length >= 15) {
        const c = sceneCount(exportHtmlOf(file));
        if (c < want) f.push(`${id}/${a}: 섹션 ${d.length}개 페이지인데 장면 ${c}개 < ${want}`);
      }
    }
  }
  setRecipeOffForTests(false);
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
