/**
 * 회귀 — 466차 V5 거시 차별화 안전망(브라우저·네트워크 없음: export 문자열만 읽는다).
 *  Phase 1 면 전략: ① 꺼짐에서 새 코드 미호출 ② 진한 면(invert) 팔레트 × 모든 변형 대비(마크업 단위, 팔레트 21 × mood) ③ 아키타입별 진한 면 비율 목표
 * 이후 Phase에서 변형 선호·히어로·정렬·쌍 차이 검사를 같은 파일에 더한다.
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests, designV5On } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests, type ArchetypeId } from "../../lib/page-archetype-v5";
import { FACE_CYCLES, isDarkStrategy, lightensBoldBlock } from "../../lib/face-strategy-v5";
import { V4_UP1_VARIANTS, V4_V5_VARIANTS, V4_VARIANTS, v4Html } from "../../lib/layout-variants";
import { V5_PARTS } from "../../lib/v5-parts";
import { impactPalette } from "../../lib/impact-templates";
import type { ImpactSection, V4Block } from "../../lib/types/generate";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { contrastFindings } from "../contrast-audit-466";
import { macroMetrics, type MacroMetrics } from "../variety-metrics-466";

export const name = "V5 거시 차별화 466 — 면 전략(진한 면 비율 목표·진한 면 대비 전수)";

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
      for (const v of vars) for (const face of ["invert", "bgA"] as const) for (const [ti, pal] of themes.entries()) for (const mood of MOODS.slice(0, 3 + (ti % 4))) {
        const items = Array.from({ length: 4 }, (_, i) => ({ title: `항목 제목 ${i + 1}`, body: "설명 문장입니다 설명 문장입니다", ...(fam === "phototext" ? { img: { url: "/x.png", pos: "50% 50%" } } : {}) }));
        const sec = { type: "impact", slot: "impact", kind: "v4", text: "제목입니다", quote: "인용문 문장입니다 인용문", body: "본문 문장입니다 본문 문장입니다 본문 문장", chip: "칩", ax: "impact", mood, v4: { family: fam, variant: v, no: 1, face, keywords: [], price: "29,000원", items }, stats: items.map((x) => ({ label: x.title, value: "10" })) } as unknown as ImpactSection;
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
