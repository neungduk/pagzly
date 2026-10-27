/**
 * 회귀 — 463차 단조로움 탈피(UP1 뒤): 새 변형 6개(benefits.linelist · story.pullband · spec.cards · steps.vtimeline/bignum/chipflow)와 강조 띠(statement.band)·면 교대.
 * 브라우저·네트워크 없음: 말뭉치를 export 문자열로 뽑아 마크업만 본다. UP1은 `designUp1On()`을 매번 읽으므로 같은 프로세스에서 꺼짐 → 켜짐 순서로 두 번 렌더한다(끝에서 꺼짐으로 복원).
 * UP1 꺼짐 = 462차 끝 출력과 동일함은 개발 중 말뭉치 21개 export + 섹션 단독 export·라이브 SSR 문자열 비교로 확인했고(보고서), 여기서는 (1) 새 계열·변형이 꺼짐 출력에 나오지 않음
 * (2) 새 코드 경로가 `designUp1On()` 뒤에만 있음(소스)을 잠근다. 438차 기준 비교(4a)는 check-v4-off 묶음이 따로 본다.
 */
import fs from "node:fs";
import { DESIGN_V4_UP1_ENABLED, designUp1On, setDesignUp1ForTests } from "../../lib/design-v4";
import { STATEMENT_AT, V4_UP1_VARIANTS, V4_VARIANTS, insertStatementBand, statementCandidates, v4Html, variantFits, variantOrder } from "../../lib/layout-variants";
import { impactPalette } from "../../lib/impact-templates";
import { v4Palette } from "../../lib/palette-v4";
import { contrastRatioToken } from "../../lib/design-tokens";
import { checkText } from "../../lib/numeric-claim-gate";
import { PENDING_SPEC_ROW_LABEL } from "../../lib/spec-placeholder";
import type { DetailSection, ImpactSection, V4Block } from "../../lib/types/generate";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { crossPageSimilarity, pageMetrics, summarize, topSections, signatureOf, type CorpusRow } from "../variety-metrics-463";

export const name = "단조로움 탈피 463 — UP1 꺼짐 불변·새 변형 요건/폴백/극단 입력·금지 CSS·글자 크기·대비·새 문구 없음·결정성·강조 띠 규칙·지표 목표";

const NEW_SIGS = ["benefits.linelist", "story.pullband", "spec.cards", "steps.vtimeline", "steps.bignum", "steps.chipflow", "statement.band"];
const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "white-space:nowrap"];
const MOODS: Array<string | null> = [null, "minimal-luxe", "clinic", "natural", "playful", "street", "warm"];
const unesc = (t: string): string => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach((x) => strings(x, out));
  return out;
}
/** 마크업의 글 노드(svg 제외, 태그 사이 글) */
const textNodes = (html: string): string[] => html.replace(/<svg[\s\S]*?<\/svg>/g, "").split(/<[^>]+>/).map((t) => unesc(t).trim()).filter(Boolean);
const ALLOWED_LABELS = new Set(["STEP", "POINT", "CHECK", "STORY", "SPEC", "DETAIL", "“", "”", PENDING_SPEC_ROW_LABEL]);
const EYEBROW_NO = /^(STEP|POINT|CHECK|STORY|SPEC|DETAIL) \d+$/;
/** 눈썹 글·모티프·구분선·고스트 글자 등 공용 껍데기(wrap)는 새 마크업이 아니므로 금지 패턴 검사에서 뺀다 */
const shell = (h: string): string => h.replace(/<p data-pz-eyebrow[\s\S]*?<\/p>/g, "").replace(/<span aria-hidden="true" data-pz-(?:motif|divider|ghost)[\s\S]*?<\/span>/g, "").replace(/<span style="white-space:nowrap">[^<]*<\/span>/g, "").replace(/<span style="[^"]*white-space:nowrap">[^<]{0,12}(?:<span[^>]*>[^<]{0,6}<\/span>)?<\/span>/g, "");

type Page = { id: string; file: string; html: string };
function renderCorpus(): Page[] {
  return corpus().map(([id, file]) => ({ id, file, html: exportHtmlOf(file) }));
}
const rowsOf = (pages: Page[]): CorpusRow[] => pages.map((p) => ({ id: p.id, m: pageMetrics(p.html) }));

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };

  // ── 소스: 새 코드 경로는 UP1 뒤 ─────────────────────────────────────────
  const src = fs.readFileSync("lib/layout-variants.ts", "utf8");
  ok(/if \(designUp1On\(\) && s\.type === "usage_steps"\)/.test(src), "steps 후보가 UP1 뒤가 아님");
  ok(/const band = designUp1On\(\) \? insertStatementBand\(/.test(src), "강조 띠가 UP1 뒤가 아님");
  ok(/const extra = designUp1On\(\) \? V4_UP1_VARIANTS\[family\]/.test(src), "변형 순서가 UP1 뒤가 아님");
  ok(/if \(designUp1On\(\)\) \{\s*\n\s*const WHITE_TYPES/.test(src), "면 교대 3회차가 UP1 뒤가 아님");
  for (const k of ["benefits.linelist", "story.pullband", "spec.cards", "steps.vtimeline", "steps.bignum", "steps.chipflow"]) ok(new RegExp(`case "${k}": return designUp1On\\(\\)`).test(src), `${k} 요건이 UP1 뒤가 아님`);
  // 라이브·export가 같은 v4Html 한 벌
  ok(/v4Html\(/.test(fs.readFileSync("lib/impact-templates.ts", "utf8")) || /v4Html/.test(fs.readFileSync("lib/export-detail-html.ts", "utf8")), "v4Html 사용처를 찾지 못함");
  const live = fs.readFileSync("components/DetailSectionRenderer.tsx", "utf8");
  const exp = fs.readFileSync("lib/export-detail-html.ts", "utf8");
  ok(!/stepsHtml|statementHtml/.test(live) && !/stepsHtml|statementHtml/.test(exp), "라이브/export가 새 마크업을 따로 만듦(v4Html 경유여야 함)");
  ok(V4_VARIANTS.steps.length === 0 && V4_VARIANTS.statement.length === 0 && V4_VARIANTS.benefits.join() === "bento,numcards,iconstrip,zigzag", "기존 변형 목록이 바뀜");

  // ── UP1 꺼짐 ────────────────────────────────────────────────────────────
  const defaultOn = designUp1On();
  ok(!DESIGN_V4_UP1_ENABLED || defaultOn, "UP1 플래그 상태 불일치");
  setDesignUp1ForTests(false);
  const offPages = renderCorpus();
  for (const p of offPages) for (const sig of topSections(p.html).map(signatureOf)) if (NEW_SIGS.includes(sig)) f.push(`${p.id}: UP1 꺼짐인데 새 변형 ${sig}`);
  ok(variantOrder("benefits", "warm", 3).join() === variantOrder("benefits", "warm", 3).join() && !variantOrder("benefits", "warm", 1).includes("linelist"), "UP1 꺼짐인데 변형 순서에 linelist");
  ok(!variantFits("steps", "vtimeline", { items: [{ title: "가나다" }, { title: "라마바" }] }), "UP1 꺼짐인데 steps가 요건 통과");
  const offSummary = summarize(rowsOf(offPages));

  // ── UP1 켜짐 ────────────────────────────────────────────────────────────
  setDesignUp1ForTests(true);
  try {
    const onPages = renderCorpus();
    const onPages2 = renderCorpus();
    ok(onPages.every((p, i) => p.html === onPages2[i]!.html), "UP1 켜짐 결과가 같은 입력에서 달라짐(결정성)");
    const seen = new Map<string, number>();
    for (const p of onPages) for (const sig of topSections(p.html).map(signatureOf)) if (NEW_SIGS.includes(sig)) seen.set(sig, (seen.get(sig) ?? 0) + 1);
    ok([...seen.keys()].filter((k) => k !== "statement.band").length >= 6, `말뭉치에서 새 변형이 6개 미만: ${[...seen.keys()].join(",")}`);
    ok(["benefits", "story", "spec", "steps"].every((fam) => [...seen.keys()].some((k) => k.startsWith(`${fam}.`))), "새 변형이 3개 계열 미만");

    // 페이지당 같은 변형 ≤2, 강조 띠 ≤1, 바로 앞과 같은 서명 금지(새 변형), 강조 띠 이웃 제한
    for (const p of onPages) {
      const sigs = topSections(p.html).map(signatureOf);
      const counts = new Map<string, number>();
      sigs.forEach((s, i) => {
        if (!NEW_SIGS.includes(s)) return;
        counts.set(s, (counts.get(s) ?? 0) + 1);
        if (sigs[i - 1] === s) f.push(`${p.id}: ${s}가 연속`);
        if (s === "statement.band") for (const nb of [sigs[i - 1], sigs[i + 1]]) if (nb && (nb.startsWith("touch.") || nb.startsWith("breather.") || nb === "cta" || nb.startsWith("statement."))) f.push(`${p.id}: 강조 띠가 ${nb}와 맞닿음`);
      });
      for (const [s, n] of counts) if (n > (s === "statement.band" ? 1 : 2)) f.push(`${p.id}: ${s} ${n}회(상한 초과)`);
    }

    // 새 변형 마크업 검사: 금지 CSS · 글자 크기 · 새 문구 없음
    for (const p of onPages) {
      // 새 글 판정 기준 = 같은 페이지 UP1 꺼짐 출력의 글 노드 + 입력 세션의 문자열(표시 단계가 입력 문장을 다듬는 경우가 있어 꺼짐 출력도 기준에 둔다)
      const input = `${strings(readSession(p.file)).join("\n")}\n${textNodes(offPages.find((o) => o.id === p.id)!.html).join("\n")}`;
      for (const sec of topSections(p.html)) {
        const sig = signatureOf(sec);
        if (!NEW_SIGS.includes(sig)) continue;
        for (const k of FORBIDDEN) if (shell(sec).includes(k)) f.push(`${p.id} ${sig}: 금지 패턴 ${k}`);
        for (const m of sec.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 12) f.push(`${p.id} ${sig}: 12px 미만 글자 ${m[1]}px`);
        if (/width:(\d{4,})px/.test(sec)) f.push(`${p.id} ${sig}: 750 초과 고정 폭`);
        // 길이 20자 넘는 글 노드를 담은 요소는 본문 크기 ≥14px
        for (const m of sec.matchAll(/<(?:p|span)\b[^>]*font-size:(\d+(?:\.\d+)?)px[^>]*>([^<]{21,})</g)) if (Number(m[1]) < 14) f.push(`${p.id} ${sig}: 긴 글이 ${m[1]}px`);
        for (const t of textNodes(sec)) {
          const core = t.replace(/^[·\s]+|[·\s]+$/g, "");
          if (!core || ALLOWED_LABELS.has(core) || EYEBROW_NO.test(core) || /^\d{1,2}$/.test(core) || /^[\d\s,.:%+\-/]+$/.test(core)) continue;
          if (!input.includes(t) && !input.replace(/\s+/g, " ").includes(t.replace(/\s+/g, " "))) f.push(`${p.id} ${sig}: 입력에 없는 글 «${t.slice(0, 30)}»`);
        }
      }
    }

    // 지표 목표(docs/monotony-audit-463.md 표에서 정한 값)
    const on = summarize(rowsOf(onPages));
    ok(on.distinctTotal >= offSummary.distinctTotal + 5, `서명 종류 ${offSummary.distinctTotal}→${on.distinctTotal} (목표 +5 이상)`);
    ok(on.diversity >= offSummary.diversity - 0.005, `서명 다양도 ${offSummary.diversity.toFixed(3)}→${on.diversity.toFixed(3)} (유지 목표)`);
    ok(on.maxRun <= 2, `같은 서명 연속 최대 ${on.maxRun} (목표 ≤2)`);
    ok(on.sameFaceRatio <= offSummary.sameFaceRatio / 2 + 0.002, `이웃 같은 면 ${offSummary.sameFaceRatio.toFixed(3)}→${on.sameFaceRatio.toFixed(3)} (목표 절반 이하)`);
    ok(on.centerRun <= 4, `중앙 정렬 연속 최대 ${on.centerRun} (목표 ≤4)`);
    ok(on.flatZones <= Math.floor(offSummary.flatZones * 0.85), `평탄 구간 ${offSummary.flatZones}→${on.flatZones} (목표 15% 이상 감소)`);
    ok(crossPageSimilarity(rowsOf(onPages)) <= crossPageSimilarity(rowsOf(offPages)) * 0.95, "페이지 간 서명 유사도가 5% 이상 낮아지지 않음");

    // 대비: 새 변형이 쓰는 글자/면 쌍을 팔레트(말뭉치 테마 × 무드)마다 계산
    const themes = corpus().map(([, file]) => exportArgsOf(readSession(file))).map((a) => impactPalette(a.theme, a.category));
    for (const pal of themes) for (const mood of MOODS) {
      const p = v4Palette({ ink: pal.ink, accent: pal.accent, deep: pal.deep }, mood);
      const light = [p.tints[0], p.faces.bgA, p.faces.bgB, p.faces.emphasis, "#FFFFFF"];
      const pairs: Array<[string, string, string]> = [];
      for (const bg of light) { pairs.push(["ink", p.ink, bg]); pairs.push(["sub", p.onFace.bgA.sub, bg]); }
      for (const role of ["bgA", "bgB", "emphasis"] as const) { pairs.push([`${role}.text`, p.onFace[role].text, p.faces[role]]); pairs.push([`${role}.sub`, p.onFace[role].sub, p.faces[role]]); pairs.push([`${role}.strong`, p.onFace[role].strong, p.faces[role]]); }
      pairs.push(["card.ink2", "#2E2E2B", "#FFFFFF"]);
      const mix2 = (a: string) => a; void mix2;
      const dotBg = contrastRatioToken("#FFFFFF", p.deep) >= 4.5 ? p.deep : p.ink;
      pairs.push(["white-on-dot/band", "#FFFFFF", dotBg]);
      for (const [label, fg, bg] of pairs) if (contrastRatioToken(fg, bg) < 4.5) { f.push(`대비 ${label} ${contrastRatioToken(fg, bg).toFixed(2)} < 4.5 (accent ${pal.accent}, mood ${mood})`); break; }
    }

    // 요건 경계와 폴백(요건 미달이면 false → 기존 레이아웃)
    const T = (n: number, len = 10, body?: number) => Array.from({ length: n }, () => ({ title: "가".repeat(len), ...(body ? { body: "나".repeat(body) } : {}) }));
    ok(variantFits("benefits", "linelist", { items: T(3, 36, 70) }) && !variantFits("benefits", "linelist", { items: T(2) }) && !variantFits("benefits", "linelist", { items: T(7) }) && !variantFits("benefits", "linelist", { items: T(3, 37) }) && !variantFits("benefits", "linelist", { items: T(3, 10, 71) }), "linelist 요건 경계");
    ok(variantFits("story", "pullband", { items: [], quote: "가".repeat(8) }) && variantFits("story", "pullband", { items: [], quote: "가".repeat(80) }) && !variantFits("story", "pullband", { items: [], quote: "가".repeat(7) }) && !variantFits("story", "pullband", { items: [], quote: "가".repeat(81) }) && !variantFits("story", "pullband", { items: [] }), "pullband 요건 경계");
    ok(variantFits("spec", "cards", { items: T(2, 20, 48) }) && !variantFits("spec", "cards", { items: T(1, 5, 5) }) && !variantFits("spec", "cards", { items: T(7, 5, 5) }) && !variantFits("spec", "cards", { items: T(2, 21, 5) }) && !variantFits("spec", "cards", { items: T(2, 5, 49) }) && !variantFits("spec", "cards", { items: T(2, 5) }), "cards 요건 경계");
    ok(variantFits("steps", "vtimeline", { items: T(2, 90) }) && !variantFits("steps", "vtimeline", { items: T(1, 5) }) && !variantFits("steps", "vtimeline", { items: T(7, 5) }) && !variantFits("steps", "vtimeline", { items: T(2, 91) }), "vtimeline 요건 경계");
    ok(variantFits("steps", "bignum", { items: T(2, 60) }) && !variantFits("steps", "bignum", { items: T(2, 61) }), "bignum 요건 경계");
    ok(variantFits("steps", "chipflow", { items: T(5, 32) }) && !variantFits("steps", "chipflow", { items: T(6, 5) }) && !variantFits("steps", "chipflow", { items: T(2, 33) }), "chipflow 요건 경계");
    for (const v of Object.values(V4_UP1_VARIANTS).flat()) if (v !== "band") ok(!variantFits("benefits", v, { items: [] }) || v === "linelist", `${v}가 빈 입력을 통과`);

    // 극단 입력 렌더(v4Html 직접): 0·1·12개, 아주 긴 한글, 숫자/영문 혼합 — 금지 패턴·고정 폭 없음, 줄바꿈 허용
    const sample = exportArgsOf(readSession("scripts/fixtures/archetype-compare-beauty.json"));
    const pal = impactPalette(sample.theme, sample.category);
    const long = "아주긴문장".repeat(30);
    const mixed = "SPF50+ PA++++ 1,234,567mg Vitamin-C 99.9% ".repeat(5).trim();
    const extremes: Array<[string, number, string]> = [["0개", 0, "가나다"], ["1개", 1, "가나다"], ["12개", 12, "가나다"], ["긴 한글", 4, long], ["숫자영문", 4, mixed]];
    const mk = (family: V4Block["family"], variant: string, n: number, text: string): ImpactSection => ({
      type: "impact", slot: "impact", kind: "v4", text: family === "statement" ? text : "제목", quote: text, body: text,
      v4: { family, variant, no: 1, face: "bgA", keywords: [], items: Array.from({ length: n }, (_, i) => ({ title: `${text}${i}`, body: text })) },
      ...(family === "spec" ? { stats: Array.from({ length: n }, (_, i) => ({ label: `${text}${i}`, value: text })) } : {}),
    } as ImpactSection);
    for (const [fam, vars] of Object.entries(V4_UP1_VARIANTS) as Array<[V4Block["family"], string[]]>) {
      for (const v of vars) for (const [label, n, text] of extremes) {
        let html = "";
        try { html = v4Html(mk(fam, v, n, text), pal, "alt"); } catch (e) { f.push(`${fam}.${v} ${label}: 렌더 예외 ${(e as Error).message}`); continue; }
        for (const k of FORBIDDEN) if (html.includes(k)) f.push(`${fam}.${v} ${label}: 금지 패턴 ${k}`);
        if (/width:(\d{4,})px/.test(html)) f.push(`${fam}.${v} ${label}: 750 초과 고정 폭`);
        if (n > 0 && text.length > 20 && !/overflow-wrap:anywhere/.test(html)) f.push(`${fam}.${v} ${label}: 긴 글 줄바꿈 허용(overflow-wrap) 없음`);
        if (html !== v4Html(mk(fam, v, n, text), pal, "alt")) f.push(`${fam}.${v} ${label}: 결정성`);
      }
    }

    // 강조 띠 규칙: 수치 검사를 통과한 원문만 · 후보가 없으면 만들지 않음 · 위치 상수
    ok(STATEMENT_AT === 0.55, "강조 띠 위치 상수");
    const args = exportArgsOf(readSession("scripts/fixtures/archetype-compare-beauty.json"));
    const secs = args.sections as unknown as DetailSection[];
    const facts = args.claimFacts!;
    const ctx = { mood: null as string | null, seedKey: "x", imageUrls: [] as string[], facts, height: () => 400 };
    const dummy = (i: number): DetailSection => ({ type: "caution", slot: `c${i}`, heading: `h${i}`, body: `b${i}` } as unknown as DetailSection);
    const base = [secs[0]!, ...Array.from({ length: 10 }, (_, i) => dummy(i))];
    const idx = base.map((_, i) => i);
    const good = { type: "impact", slot: "impact", kind: "story", text: "t", quote: "맑은 수분을 담는 브랜드입니다" } as unknown as DetailSection;
    const withGood = insertStatementBand(base, idx, [good], [], ctx);
    ok(!!withGood && withGood.sections.length === base.length + 1 && withGood.sections.filter((s) => s.type === "impact" && s.kind === "v4" && s.v4?.family === "statement").length === 1, "강조 띠가 1개 삽입되지 않음");
    const bad = { type: "impact", slot: "impact", kind: "story", text: "t", quote: "단 3일 만에 피부 나이 99% 개선됩니다" } as unknown as DetailSection;
    ok(checkText("단 3일 만에 피부 나이 99% 개선됩니다", facts).bad ? insertStatementBand(base, idx, [bad], [], ctx) === null : true, "수치 검사에 걸린 문장으로 띠를 만듦");
    ok(insertStatementBand(base, idx, [], [], ctx) === null, "후보가 없는데 띠를 만듦");
    ok(insertStatementBand(base.slice(0, 5), idx.slice(0, 5), [good], [], ctx) === null, "짧은 페이지에 띠를 만듦");
    ok(statementCandidates([good]).join() === "맑은 수분을 담는 브랜드입니다", "후보 추출");
  } finally {
    setDesignUp1ForTests(defaultOn);
  }
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
