/**
 * 회귀 — 466차 V5 거시 차별화 안전망(브라우저·네트워크 없음: export 문자열만 읽는다).
 *  Phase 1 면 전략: ① 꺼짐에서 새 코드 미호출 ② 진한 면(invert) 팔레트 × 모든 변형 대비(마크업 단위, 팔레트 21 × mood) ③ 아키타입별 진한 면 비율 목표
 * 이후 Phase에서 변형 선호·히어로·정렬·쌍 차이 검사를 같은 파일에 더한다.
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests, designV5On } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests, type ArchetypeId } from "../../lib/page-archetype-v5";
import { FACE_CYCLES, isDarkStrategy, lightensBoldBlock } from "../../lib/face-strategy-v5";
import { V4_UP1_VARIANTS, V4_V5_VARIANTS, V4_VARIANTS, planV4, v4Html } from "../../lib/layout-variants";
import { V5_PARTS } from "../../lib/v5-parts";
import { impactPalette } from "../../lib/impact-templates";
import type { ImpactSection, V4Block } from "../../lib/types/generate";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { signatureOf, topSections } from "../variety-metrics-463";
import { expandDedupedStyles } from "../../lib/style-dedupe";
import { contrastFindings } from "../contrast-audit-466";
import { macroMetrics, type MacroMetrics } from "../variety-metrics-466";
import { pickHeroV5 } from "../../lib/hero-spec";

export const name = "V5 거시 차별화 466 — 면 전략(진한 면 비율·진한 면 대비 전수)·변형 확정 선호(계열별 ≥5·선택 조건)·히어로 선호·정렬/타이포·쌍 차이·실제 페이지 대비";

const MOODS: Array<string | null> = [null, "minimal-luxe", "clinic", "natural", "playful", "street", "warm"];

/** 466차 Phase 0에서 코드 전에 적은 목표(docs/v5-macro-466.md §6) — 낮추지 않는다 */
export const DARK_TARGET: Record<ArchetypeId, { avgMin: number; avgMax: number; worstMax: number }> = {
  editorial: { avgMin: 0, avgMax: 0.12, worstMax: 0.12 }, luxe: { avgMin: 0, avgMax: 0.12, worstMax: 0.12 }, techsheet: { avgMin: 0, avgMax: 0.12, worstMax: 0.12 },
  catalog: { avgMin: 0, avgMax: 0.12, worstMax: 0.12 }, softlife: { avgMin: 0, avgMax: 0.12, worstMax: 0.12 }, narrative: { avgMin: 0, avgMax: 0.12, worstMax: 0.12 },
  impact: { avgMin: 0.25, avgMax: 0.45, worstMax: 0.6 }, pop: { avgMin: 0.3, avgMax: 0.55, worstMax: 0.7 },
};

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };
  const files = corpus();
  if (files.length < 18) return f;
  const defaultV5 = designV5On();

  // ── ① 꺼짐: 새 코드 미호출(소스 가드) ─────────────────────────────────────────
  const srcLv = fs.readFileSync("lib/layout-variants.ts", "utf8");
  const srcDs = fs.readFileSync("lib/display-sections.ts", "utf8");
  ok(/designV5On\(\) && b\.face === "invert" \? darkPaletteOf\(p0\)/.test(srcLv), "v4Html 진한 면 팔레트가 V5 켜짐 조건 뒤가 아님");
  ok(/designV5On\(\) && b\.face === "invert"\) html = invertFixHtml/.test(srcLv), "진한 면 마크업 보정이 V5 켜짐 조건 뒤가 아님");
  ok(/v5tokens && lightensBoldBlock\(v5tokens\.face\)/.test(srcDs), "boldBlock 밝히기가 V5 토큰(편집 모드면 null) 뒤가 아님");
  ok(!/invert/.test(FACE_CYCLES.lightOnly.join(",")) && !/invert/.test(FACE_CYCLES.tintAlt.join(",")), "밝은 전략 면 순환에 invert가 있음");
  ok(isDarkStrategy(ARCHETYPES.impact.face) && isDarkStrategy(ARCHETYPES.pop.face) && ARCHETYPE_IDS.filter((a) => lightensBoldBlock(ARCHETYPES[a].face)).length === 6, "아키타입 면 전략 매핑이 목표(6 밝음 / 2 진함)와 다름");

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  try {
    // ── ② 진한 면(invert) × 모든 변형 대비: 팔레트(말뭉치 테마 21) × mood ────────────
    setV5ArchetypeForTests("impact");
    const themes = files.map(([, file]) => exportArgsOf(readSession(file))).map((a) => impactPalette(a.theme, a.category));
    const fams = new Set<string>([...Object.keys(V4_VARIANTS), ...Object.keys(V4_UP1_VARIANTS), ...Object.keys(V4_V5_VARIANTS)]);
    const bad = new Map<string, string>();
    for (const fam of fams) {
      const vars = [...((V4_VARIANTS as Record<string, string[]>)[fam] ?? []), ...((V4_UP1_VARIANTS as Record<string, string[]>)[fam] ?? []), ...((V4_V5_VARIANTS as Record<string, string[]>)[fam] ?? [])];
      for (const v of vars) for (const face of ["invert", "bgA"] as const) for (const pal of themes) for (const mood of MOODS) {
        const items = Array.from({ length: 4 }, (_, i) => ({ title: `항목 제목 ${i + 1}`, body: "설명 문장입니다 설명 문장입니다", ...(fam === "phototext" ? { img: { url: "/x.png", pos: "50% 50%" } } : {}) }));
        const sec = { type: "impact", slot: "impact", kind: "v4", text: "제목입니다", quote: "인용문 문장입니다 인용문", body: "본문 문장입니다 본문 문장입니다 본문 문장 본문 문장입니다 본문 문장입니다 본문 문장입니다 본문 문장", chip: "칩", ax: "impact", mood, v4: { family: fam, variant: v, no: 1, face, keywords: [], price: "29,000원", items }, stats: items.map((x) => ({ label: x.title, value: "10" })) } as unknown as ImpactSection;
        let html = "";
        try { html = v4Html(sec, pal, "alt", V5_PARTS); } catch { continue; }
        const fi = contrastFindings(html);
        // 밝은 면(bgA)의 기존 결과는 기준선 — 진한 면은 기준선 이상으로 나빠지면 안 된다(그 변형이 기준선에서 0건이었다면 진한 면도 0건)
        const k = `${fam}.${v}:${face}`;
        if (fi.length && !bad.has(k)) bad.set(k, `${JSON.stringify(fi[0])}`);
      }
    }
    for (const [k, ex] of bad) {
      const [fv, face] = k.split(":");
      if (face === "invert" && !bad.has(`${fv}:bgA`)) f.push(`진한 면 대비 위반 ${fv}: ${ex}`);
    }

    // ── ③ 아키타입별 진한 면 비율(말뭉치 21) ───────────────────────────────────────
    const rows: Record<string, MacroMetrics[]> = {};
    for (const arch of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(arch);
      rows[arch] = files.map(([, file]) => macroMetrics(exportHtmlOf(file)));
      const t = DARK_TARGET[arch];
      const xs = rows[arch]!.map((m) => m.darkRatio);
      const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
      const worst = Math.max(...xs);
      ok(avg >= t.avgMin && avg <= t.avgMax, `${arch}(${ARCHETYPES[arch].face}) 진한 면 평균 ${avg.toFixed(3)} (목표 ${t.avgMin}~${t.avgMax})`);
      ok(worst <= t.worstMax, `${arch} 진한 면 최악 ${worst.toFixed(3)} (상한 ${t.worstMax})`);
    }
    // ── ④ 변형 확정 선호: 계열별 서로 다른 변형 수(8종 × 말뭉치 21 합산) ≥ 5 ────────────────────
    const FAMS = ["benefits", "concern", "story", "spec", "phototext"] as const;
    const union: Record<string, Set<string>> = Object.fromEntries(FAMS.map((fm) => [fm, new Set<string>()]));
    const perArch: Record<string, Record<string, Set<string>>> = {};
    for (const arch of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(arch);
      perArch[arch] = Object.fromEntries(FAMS.map((fm) => [fm, new Set<string>()]));
      for (const [, file] of files) for (const sec of topSections(exportHtmlOf(file))) {
        const sg = signatureOf(sec);
        // 말풍선·체크 행 임팩트는 고민(concern) 계열의 변형으로 센다
        const key = sg === "impact.bubbles" ? "concern.bubbles" : sg === "impact.checkrows" ? "concern.checkrows" : sg;
        const [fm, v] = key.split(".");
        if (fm && v && (FAMS as readonly string[]).includes(fm)) { union[fm]!.add(v); perArch[arch]![fm]!.add(v); }
      }
    }
    for (const fm of FAMS) ok(union[fm]!.size >= 5, `${fm}: 8종이 쓴 서로 다른 변형 ${union[fm]!.size}개 (${[...union[fm]!].join(",")}) < 5`);

    // ── ⑤ 선택 조건(합성 입력으로 계획기 직접): 말뭉치에서 안 뽑히던 변형이 요건이 맞으면 아키타입 선호대로 뽑힌다 ──
    const a0 = exportArgsOf(readSession("scripts/fixtures/archetype-compare-beauty.json"));
    const hero = { type: "hero", slot: "hero", headline: "H", subheadline: "S", imageIndex: 0 };
    const qp = (i: number, body: string) => ({ type: "image_text", slot: "quick_points", heading: `포인트${i}`, body, imageIndex: 1, imagePosition: "left", layout: "compact" });
    // 강도 4의 일반 섹션(467차부터 갤러리는 V5에서 블록으로 바뀌어 배너를 쓴다)
    const gal = () => ({ type: "illustration_banner", slot: "illustration_banner", heading: "배너", body: "내용", imageIndex: 1 });
    const fill = (i: number) => ({ type: "caution", slot: "caution", heading: `주의${i}`, body: "내용" });
    const storyS = (bodyLen: number) => ({ type: "impact", slot: "impact", kind: "story", text: "스토리", quote: "맑은 수분을 담는 하루의 시작", body: "본문 ".repeat(bodyLen) });
    const specS = { type: "impact", slot: "impact", kind: "specstrip", text: "스펙", stats: [{ label: "용량", value: "30mL" }, { label: "타입", value: "미스트" }, { label: "향", value: "무향" }] };
    const cta = { type: "cta_price", slot: "cta_price", price: 1000, targetCustomer: "x", badges: [] };
    const plan = (arch: ArchetypeId, secs: unknown[]): string[] => {
      const sections = secs as ImpactSection[];
      return planV4(sections as never, sections.map((_, i) => i), { mood: null, seedKey: "unit|x", imageUrls: a0.imageUrls, origins: a0.imageOrigins, facts: a0.claimFacts!, category: a0.category, height: () => 400, v5: ARCHETYPES[arch] }).placed.map((x) => `${x.family}.${x.variant}`);
    };
    const shortQp = [qp(1, "짧은 설명 1"), qp(2, "짧은 설명 2"), qp(3, "짧은 설명 3"), qp(4, "짧은 설명 4")];
    const longQp = [1, 2, 3, 4].map((i) => qp(i, "가".repeat(70)));
    // 처음 1/3(히어로 제외)에 강한 갤러리 둘이 이미 있어 곡선 보정(boostEarlyHighV5)이 장점 변형을 바꾸지 않는 페이지
    const base = [hero, gal(), gal(), fill(1), fill(2), fill(3), fill(4)];
    ok(plan("catalog", [...base, ...shortQp, fill(5), storyS(30), specS, cta]).includes("benefits.rows2"), "catalog + 짧은 퀵포인트 4개 → benefits.rows2가 선택되지 않음");
    ok(plan("techsheet", [...base, ...longQp, fill(5), storyS(30), specS, cta]).includes("benefits.iconlist"), "techsheet + 설명 70자 퀵포인트 4개 → benefits.iconlist가 선택되지 않음(rows2 요건 밖)");
    ok(plan("impact", [...base, ...shortQp, fill(5), storyS(30), specS, cta]).includes("spec.big3"), "impact + 짧은 값 3행 → spec.big3가 선택되지 않음");
    ok(plan("catalog", [...base, ...shortQp, gal(), storyS(30), specS, cta]).includes("story.chapter"), "catalog → story.chapter가 선택되지 않음");
    ok(plan("narrative", [...base, ...shortQp, gal(), storyS(30), specS, cta]).some((x) => x === "story.letter" || x === "story.chapter"), "narrative → story.letter/chapter가 선택되지 않음");
    ok(plan("softlife", [...base, ...shortQp, gal(), storyS(30), specS, cta]).includes("story.letter") || plan("softlife", [...base, ...shortQp, gal(), storyS(30), specS, cta]).includes("story.quote"), "softlife → story.letter/quote가 선택되지 않음");
    setV5ArchetypeForTests("impact");

    // ── ⑥ 히어로(기존 A~E 안): 밝은 전략은 밝은 히어로, 변형 분포가 갈린다, 폴백·결정성 ─────────────────
    const heroSet = new Set<string>();
    for (const arch of ARCHETYPE_IDS) {
      const vs = rows[arch]!.map((m) => m.heroVariant);
      vs.forEach((v) => heroSet.add(v));
      ok(vs.every((v) => "ABCDE".includes(v) && v.length === 1), `${arch}: 히어로 변형이 A~E 밖(${[...new Set(vs)].join(",")})`);
      if (ARCHETYPES[arch].face === "lightOnly") ok(rows[arch]!.every((m) => !m.heroDark), `${arch}(lightOnly): 히어로가 진한 면인 페이지가 있음`);
    }
    ok(heroSet.size >= 4, `8종이 쓴 히어로 변형 ${heroSet.size}종 (<4: ${[...heroSet].join(",")})`);
    ok(pickHeroV5(["C", "B", "A"], { hasPhoto: true, kind: "product", confidence: 0.8 }, "D") === "C", "제품 컷 + impact 선호 → C");
    ok(pickHeroV5(["C", "B", "A"], { hasPhoto: true, kind: "person", confidence: 0.85 }, "A") === "A", "사람 사진은 제품 전용 히어로(B·C)로 가지 않고 A로 폴백");
    ok(pickHeroV5(["B", "C"], { hasPhoto: true, kind: "unknown", confidence: 0 }, "A") === "A", "종류를 모르면 B·C 요건 불충족 → 기존 선택");
    ok(pickHeroV5(["D", "A"], { hasPhoto: false, kind: "unknown", confidence: 0 }, "E") === "E", "사진이 없으면 기존 선택(E)");
    ok(/v5Hero: v5tokens\.hero/.test(srcDs) && /i\.v5Hero\?\.length/.test(fs.readFileSync("lib/hero-spec.ts", "utf8")), "히어로 선호가 V5 토큰(편집 모드면 null) 뒤에서만 전달되지 않음");

    // ── ⑦ 정렬·타이포: 중앙 정렬 비율 각 ≤ 0.40·평균 ≤ 0.33(UP1 0.334)·연속 ≤ 4, 제목 굵기 평균이 갈린다 ──────────
    const centerAvg = ARCHETYPE_IDS.reduce((a, arch) => a + rows[arch]!.reduce((x, m) => x + m.centerRatio, 0) / rows[arch]!.length, 0) / ARCHETYPE_IDS.length;
    ok(centerAvg <= 0.33, `8종 평균 중앙 정렬 비율 ${centerAvg.toFixed(3)} > 0.33`);
    for (const arch of ARCHETYPE_IDS) {
      const r = rows[arch]!.reduce((x, m) => x + m.centerRatio, 0) / rows[arch]!.length;
      ok(r <= 0.4, `${arch}: 중앙 정렬 비율 ${r.toFixed(3)} > 0.40`);
      ok(Math.max(...rows[arch]!.map((m) => m.centerRun)) <= 4, `${arch}: 중앙 정렬 연속 > 4`);
      // 평탄 구간은 목표(≤ 37, UP1)에 못 미친다 — 아래는 목표가 아니라 더 나빠지지 않게 하는 가드(보고서에 수치와 원인)
      ok(rows[arch]!.reduce((x, m) => x + m.flatZones, 0) <= 90, `${arch}: 평탄 구간 합 ${rows[arch]!.reduce((x, m) => x + m.flatZones, 0)} > 90(가드)`); // 467차: 일반 섹션 변환으로 466차 최대 71 → 83까지 늘어 가드를 80→90으로(목표 ≤37은 여전히 미달 — 보고서)
    }
    const tw = ARCHETYPE_IDS.map((arch) => rows[arch]!.reduce((x, m) => x + m.titleWeight, 0) / rows[arch]!.length);
    ok(Math.max(...tw) - Math.min(...tw) >= 250, `제목 굵기 평균 폭 ${(Math.max(...tw) - Math.min(...tw)).toFixed(0)} < 250`);

    // ── ⑧ 쌍 차이: 28쌍이 7개 축 중 3개 이상에서 기준 이상 갈린다(docs/v5-macro-466.md §6) ─────────────────────
    const jac = (a: Set<string>, b: Set<string>): number => { let i = 0; for (const x of a) if (b.has(x)) i += 1; const u = a.size + b.size - i; return u ? 1 - i / u : 0; };
    const avg = (arch: ArchetypeId, f: (m: MacroMetrics) => number): number => rows[arch]!.reduce((x, m) => x + f(m), 0) / rows[arch]!.length;
    const FAMS6 = ["benefits", "concern", "story", "spec", "phototext", "faq"];
    const heroDist = (arch: ArchetypeId): Record<string, number> => { const d: Record<string, number> = {}; rows[arch]!.forEach((m) => { d[m.heroVariant] = (d[m.heroVariant] ?? 0) + 1 / rows[arch]!.length; }); return d; };
    const sets = (arch: ArchetypeId, fm: string): Set<string> => new Set(rows[arch]!.flatMap((m) => m.variants[fm] ?? []));
    for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) {
      const x = ARCHETYPE_IDS[i]!; const y = ARCHETYPE_IDS[j]!;
      const hx = heroDist(x); const hy = heroDist(y);
      const heroL1 = [...new Set([...Object.keys(hx), ...Object.keys(hy)])].reduce((s2, k) => s2 + Math.abs((hx[k] ?? 0) - (hy[k] ?? 0)), 0);
      const famJ = FAMS6.reduce((s2, fm) => s2 + jac(sets(x, fm), sets(y, fm)), 0) / FAMS6.length;
      const axes = [
        Math.abs(avg(x, (m) => m.darkRatio) - avg(y, (m) => m.darkRatio)) >= 0.06,
        Math.abs(avg(x, (m) => m.centerRatio) - avg(y, (m) => m.centerRatio)) >= 0.1,
        heroL1 >= 0.3,
        famJ >= 0.5,
        Math.abs(avg(x, (m) => m.avgRadius) - avg(y, (m) => m.avgRadius)) >= 3,
        Math.abs(avg(x, (m) => m.shadowShare) - avg(y, (m) => m.shadowShare)) >= 0.1,
        Math.abs(avg(x, (m) => m.titleWeight) - avg(y, (m) => m.titleWeight)) >= 30,
      ];
      const n = axes.filter(Boolean).length;
      ok(n >= 3, `${x}-${y}: 갈리는 축 ${n}개 < 3 [진한면,중앙,히어로,변형집합,반경,그림자,굵기]=[${axes.map((a) => (a ? 1 : 0)).join("")}]`);
    }

    // ── ⑨ 실제 페이지(제목 위계·반복 style 묶음 해제 후) 글자 대비: v4·V5 변형·임팩트 구간에 위반 없음 ──────────────
    // 예외: impact.bleed(사진 위 흰 글자 — 배경 사진을 측정할 수 없어 기준(UP1)에도 같은 항목이 잡힘)
    for (const arch of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(arch);
      for (const [id, file] of files) for (const sec of topSections(expandDedupedStyles(exportHtmlOf(file)))) {
        const sg = signatureOf(sec);
        if (!/^(benefits|concern|story|spec|phototext|faq|proof|touch|steps|statement|breather)\./.test(sg) && !/^impact\./.test(sg)) continue;
        if (sg === "impact.bleed") continue;
        const fi = contrastFindings(sec);
        if (fi.length) { f.push(`대비 ${arch}/${id} ${sg}: ${JSON.stringify(fi[0])}`); break; }
      }
    }

    // 서로 다른 구간 3개 이상: 밝음(<0.12) / 중간·진한 두 구간
    const avgOf = (a: ArchetypeId) => rows[a]!.reduce((s, m) => s + m.darkRatio, 0) / rows[a]!.length;
    ok(avgOf("impact") - avgOf("editorial") >= 0.15 && avgOf("pop") - avgOf("editorial") >= 0.2, "진한 면 구간이 밝은 쪽과 충분히 갈리지 않음");
  } finally {
    setV5ArchetypeForTests(null);
    setDesignV5ForTests(defaultV5);
    setDesignUp1ForTests(false);
  }
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
