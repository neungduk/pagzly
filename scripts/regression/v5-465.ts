/**
 * 회귀 — 465차 디자인 V5 정적 안전망(브라우저·네트워크 없음: 말뭉치 21 × 아키타입 8을 export 문자열로 렌더해 마크업만 본다).
 * V5는 `designV5On()`을 매번 읽으므로 같은 프로세스에서 꺼짐 → 켜짐 순서로 렌더하고 끝에서 복원한다(아키타입은 `setV5ArchetypeForTests`로 강제).
 *  ① 꺼짐: 새 코드 미호출(토큰 null·표식/후처리/새 변형 없음) ② 편집 모드 미적용 ③ 켜짐: 8종 × 21에서 예외 없음·금지 CSS·고정 폭·글자 크기·외부 주소·새 문구·크기 +25%
 *  ④ 8종이 서로 다른 출력(스타일 토큰 집합 거리) ⑤ 대비(종이색 × 팔레트) ⑥ 결정성 ⑦ 새 변형 단위 렌더(극단 입력) ⑧ 사진 없음 ⑨ 규정 문구 노드 동일 ⑩ 스토리보드 곡선 ⑪ 라이브↔export 같은 토큰 함수
 */
import fs from "node:fs";
import { applyDisplayRules } from "../../lib/display-sections";
import { DESIGN_V5_ENABLED, designV5On, setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, CATEGORY_FIT, archetypeCssV5, getArchetypeTokens, pickArchetype, setV5ArchetypeForTests, type ArchetypeId } from "../../lib/page-archetype-v5";
import { planStoryboard } from "../../lib/storyboard-v5";
import { V4_V5_VARIANTS, v4Html, variantFits } from "../../lib/layout-variants";
import { V5_PARTS } from "../../lib/v5-parts";
import { V5_ALLOWED_LABEL_TEXTS } from "../../lib/v5-labels";
import { impactPalette } from "../../lib/impact-templates";
import { v4Palette } from "../../lib/palette-v4";
import { contrastRatioToken } from "../../lib/design-tokens";
import type { DetailSection, ImpactSection, V4Block } from "../../lib/types/generate";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { pageMetrics, signatureOf, summarize, topSections, type CorpusRow } from "../variety-metrics-463";
import { buildDetailPageHtml } from "../../lib/export-detail-html";

export const name = "V5 안전망 465 — 꺼짐 불변·편집 미적용·8종×말뭉치 금지 CSS/글자 크기/새 문구/크기·아키타입 거리·대비·결정성·새 변형 극단 입력·사진 없음·규정 문구·스토리보드";

/** 아키타입 쌍 거리 하한(영향받는 블록의 스타일 서명 튜플 집합 자카드 거리). 측정: 3페이지×28쌍 최소 0.97 — 지표가 포화돼 약한 대리 지표다(속성별 평면 토큰 집합 거리는 0.16~0.30으로 낮았음, 보고서) */
const MIN_ARCH_DISTANCE = 0.8;
const STRICT_FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image"];
const MOODS: Array<string | null> = [null, "minimal-luxe", "clinic", "natural", "playful", "street", "warm"];
const V5_SIGS = new Set(Object.entries(V4_V5_VARIANTS).flatMap(([fam, vs]) => (vs ?? []).map((v) => `${fam}.${v}`)));
const unesc = (t: string): string => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const textNodes = (html: string): string[] => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "").split(/<(?:[^>"']|"[^"]*"|'[^']*')*>/).map((t) => unesc(t).trim()).filter(Boolean); // 따옴표 안의 ">"(onload 식 등)에서 태그를 끊지 않는다
const count = (h: string, tok: string): number => h.split(tok).length - 1;
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    // 467차: 표 행(label·value)은 SEO 텍스트 목록이 "라벨: 값"으로 합쳐 쓴다 — 입력에서 합친 꼴도 입력 문자열로 본다
    if (typeof o.label === "string" && typeof o.value === "string") out.push(`${o.label}: ${o.value}`);
    Object.values(o).forEach((x) => strings(x, out));
  }
  return out;
}
/**
 * 아키타입 거리용 스타일 서명 집합: 아키타입이 실제로 바꾸는 임팩트·v4 블록마다 (반경 집합·테두리·그림자 종류·종이색 사용·루트 여백·장식·구분선·제목 정렬) 튜플 한 개.
 * 두 아키타입의 튜플 집합이 얼마나 겹치는지(자카드)로 "같은 입력인데 다르게 보이는 정도"를 대신 잰다(눈 검수 전의 대리 지표).
 */
export function styleTokens(html: string): Set<string> {
  const t = new Set<string>();
  for (const sec of topSections(html)) {
    const head = sec.slice(0, sec.indexOf(">"));
    if (!/data-pz-ax-done=/.test(head)) continue;
    const radii = [...new Set([...sec.matchAll(/border-radius:([^;"]+)/g)].map((m) => m[1]!.replace(/\s+/g, " ")))].sort().join("/");
    const border = [...new Set([...sec.matchAll(/border:(\d+px (?:solid|dashed))/g)].map((m) => m[1]!))].sort().join("/");
    const shadow = [...new Set([...sec.matchAll(/box-shadow:([^;"]{0,60})/g)].map((m) => (/inset|none/.test(m[1]!) ? m[1]!.slice(0, 4) : /0 0 0 \d/.test(m[1]!) ? "ring" : /^\d+px \d+px 0 /.test(m[1]!) ? "hard" : "blur")))].sort().join("/");
    const paper = [...new Set([...sec.matchAll(/background:(#[0-9a-fA-F]{6})\b/g)].map((m) => m[1]!.toLowerCase()))].filter((c) => ["#faf7f1", "#f3f2ee", "#fffbf6", "#ffffff", "#eef3f8", "#fdfbf8", "#fbfaf6", "#fffdf4"].includes(c)).join("/");
    const pad = /padding:(\d+)px/.exec(head)?.[1] ?? "";
    const decor = [...sec.matchAll(/data-pz-ax-decor="([a-z-]+)"/g)].map((m) => m[1]!)[0] ?? "";
    const div = /data-pz-divider="([a-z0-9]+)"/.exec(sec)?.[1] ?? "";
    const align = /data-pz-eyebrow style="text-align:center/.test(sec) ? "c" : "l";
    t.add([signatureOf(sec), radii, border, shadow, paper, pad, decor, div, align].join("¦"));
  }
  return t;
}
export const jaccardDist = (a: Set<string>, b: Set<string>): number => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const uni = a.size + b.size - inter;
  return uni ? 1 - inter / uni : 0;
};

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };
  const files = corpus();
  if (files.length < 18) return f; // 말뭉치가 없는 환경에서는 건너뜀
  const defaultV5 = designV5On();
  ok(!DESIGN_V5_ENABLED || defaultV5, "V5 플래그 상태 불일치");

  // ── ① 꺼짐: 새 코드 미호출 ────────────────────────────────────────────────────
  setDesignV5ForTests(false);
  setDesignUp1ForTests(true);
  ok(getArchetypeTokens({ category: "화장품/뷰티", mood: null, seedKey: "x" }) === null, "꺼짐인데 아키타입 토큰이 있음");
  const upPages = new Map<string, string>();
  for (const [id, file] of files) {
    const h = exportHtmlOf(file);
    upPages.set(id, h);
    if (/data-pz-ax|data-pz-ax-done|data-pz-ax-decor/.test(h)) f.push(`${id}: V5 꺼짐인데 아키타입 표식`);
    for (const sg of topSections(h).map(signatureOf)) if (V5_SIGS.has(sg)) f.push(`${id}: V5 꺼짐인데 새 변형 ${sg}`);
  }
  const srcLv = fs.readFileSync("lib/layout-variants.ts", "utf8");
  const srcDs = fs.readFileSync("lib/display-sections.ts", "utf8");
  const srcIt = fs.readFileSync("lib/impact-templates.ts", "utf8");
  ok(/const v5tokens = opts\.claimFacts \? getArchetypeTokens\(/.test(srcDs) && /editing: opts\.editing/.test(srcDs), "표시 단계 V5 토큰이 편집 모드를 넘기지 않음");
  ok(/s\.ax && designV5On\(\) && s\.ax in ARCHETYPES/.test(srcIt), "impactHtml 후처리가 V5 켜짐 조건 뒤가 아님");
  ok(/designV5On\(\) && parts \? parts\(/.test(srcLv), "v4Html V5 부품 호출이 V5 켜짐 조건 뒤가 아님");
  ok((srcLv.match(/designV5On\(\) && /g) ?? []).length >= 18, "V5 변형 요건 함수가 V5 켜짐 조건을 쓰지 않음");
  ok(!/v5-parts|page-archetype-v5/.test(fs.readFileSync("components/DetailSectionRenderer.tsx", "utf8").replace(/import \{[^}]*\} from "@\/lib\/page-archetype-v5";/, "")), "라이브 렌더러가 V5 부품을 따로 가져다 씀(같은 함수 한 벌이어야 함)");

  // ── ② 편집 모드 미적용 ────────────────────────────────────────────────────────
  setDesignV5ForTests(true);
  setV5ArchetypeForTests("pop");
  try {
    for (const [id, file] of files.slice(0, 8)) {
      const a = exportArgsOf(readSession(file));
      const edited = applyDisplayRules(a.sections, a.imageUrls ?? [], { editing: true, imageHashByUrl: a.imageHashByUrl, roles: a.imageRoles, origins: a.imageOrigins, category: a.category, claimFacts: a.claimFacts, brandName: a.brandName });
      if ((edited as { v5?: unknown }).v5) f.push(`${id}: 편집 모드에 V5 계획이 있음`);
      if (edited.sections.some((x) => x.type === "impact" && (x.ax || x.kind === "v4"))) f.push(`${id}: 편집 모드에 임팩트/아키타입 블록이 있음`);
    }

    // ── ③ 켜짐: 8종 × 말뭉치 ──────────────────────────────────────────────────
    type Page = { arch: ArchetypeId; id: string; file: string; html: string };
    const pages: Page[] = [];
    const t0 = Date.now();
    for (const arch of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(arch);
      for (const [id, file] of files) {
        try { pages.push({ arch, id, file, html: exportHtmlOf(file) }); } catch (e) { f.push(`${arch}/${id}: 렌더 예외 ${(e as Error).message.slice(0, 80)}`); }
      }
    }
    const inputOf = new Map(files.map(([id, file]) => [id, strings(readSession(file)).join("\n")]));
    const allowedLabels = new Set<string>(V5_ALLOWED_LABEL_TEXTS);
    const seenSig = new Set<string>();
    const seenFamilyArch = new Map<string, Set<string>>();
    for (const pg of pages) {
      const base = upPages.get(pg.id)!;
      const tag = `${pg.arch}/${pg.id}`;
      // 표식: 켜짐이면 임팩트 후처리 표식이 있어야 함
      if (!/data-pz-ax-done="/.test(pg.html)) f.push(`${tag}: 아키타입 후처리 표식 없음`);
      // 금지 CSS: 페이지 전체 개수가 UP1(V5 꺼짐)보다 늘지 않음
      for (const k of STRICT_FORBIDDEN) if (count(pg.html, k) > count(base, k)) f.push(`${tag}: 금지 CSS ${k} 증가`);
      const widthBig = (h: string) => (h.match(/width:\d{4,}px/g) ?? []).length;
      if (widthBig(pg.html) > widthBig(base)) f.push(`${tag}: 750 초과 고정 폭 증가`);
      // 크기 +25%
      // 467차: 다이나믹 레이어(장식·변주)가 들어와 상한을 +25% → +35%로(467차 지시 B-4)
      if (pg.html.length > base.length * 1.35) f.push(`${tag}: export 크기 ${Math.round((pg.html.length / base.length) * 100)}% (UP1 대비 135% 초과)`);
      // 새 변형·장식 구간 검사
      const secs = topSections(pg.html);
      for (const sec of secs) {
        const sg = signatureOf(sec);
        if (V5_SIGS.has(sg)) {
          seenSig.add(sg);
          (seenFamilyArch.get(sg) ?? seenFamilyArch.set(sg, new Set()).get(sg)!).add(pg.arch);
          const shell = sec.replace(/<span aria-hidden="true" data-pz-(?:motif|divider|ghost)[\s\S]*?<\/span>/g, "").replace(/<span style="[^"]*white-space:nowrap">[^<]{0,12}(?:<span[^>]*>[^<]{0,6}<\/span>)?<\/span>/g, "");
          // 접점(touch)의 가격은 짧은 숫자라 줄바꿈 금지(기존 band와 같다)
          for (const k of [...STRICT_FORBIDDEN, ...(sg.startsWith("touch.") ? [] : ["white-space:nowrap"])]) if (shell.includes(k)) f.push(`${tag} ${sg}: 금지 패턴 ${k}`);
          for (const m of sec.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 12) f.push(`${tag} ${sg}: 12px 미만 글자`);
          for (const m of sec.matchAll(/<(?:p|span)\b[^>]*font-size:(\d+(?:\.\d+)?)px[^>]*>([^<]{21,})</g)) if (Number(m[1]) < 14) f.push(`${tag} ${sg}: 긴 글이 ${m[1]}px`);
          const bare = sec.replace(/xmlns="[^"]*"/g, "").replace(/<img [^>]*>/g, "");
          if (/https?:\/\//.test(bare)) f.push(`${tag} ${sg}: 외부 주소`);
        }
      }
      // 장식(후처리가 넣은 것): 외부 주소·큰 크기 없음
      for (const m of pg.html.matchAll(/<span aria-hidden="true" data-pz-ax-decor[^>]*>/g)) if (/https?:/.test(m[0]) || /width:\d{4,}px/.test(m[0])) f.push(`${tag}: 장식에 외부 주소/큰 폭`);
      // 새 문구 없음: 글 노드 ⊆ UP1 페이지 글 ∪ 입력 문자열 ∪ 닫힌 표지/순번
      const known = `${textNodes(base).join("\n")}\n${inputOf.get(pg.id)!}`;
      const knownFlat = known.replace(/\s+/g, " ");
      for (const tn of textNodes(pg.html)) {
        const core = tn.replace(/^[·\s“”‘’"']+|[·\s“”‘’"']+$/g, "");
        if (!core || allowedLabels.has(core) || /^\d{1,2}$/.test(core) || /^[\d\s,.:%+\-/]+$/.test(core) || /^(CHAPTER|POINT|STEP|NO\.|SPEC|NOTE|CHECK|STORY|DETAIL|FAQ|NOTICE) ?\d*$/.test(core)) continue;
        if (!known.includes(core) && !knownFlat.includes(core.replace(/\s+/g, " "))) f.push(`${tag}: 입력에 없는 글 «${core.slice(0, 28)}»`);
      }
    }
    ok(pages.length === ARCHETYPE_IDS.length * files.length, `렌더 페이지 수 ${pages.length}`);
    const sinceSec = Math.round((Date.now() - t0) / 1000);
    ok(sinceSec < 600, `8종 렌더에 ${sinceSec}초`);
    // 새 변형이 말뭉치×8종에서 얼마나 선택됐는지(나머지는 ⑦ 단위 렌더로 확인)
    ok(seenSig.size >= 18, `말뭉치에서 선택된 V5 새 변형 ${seenSig.size}개(18 이상 기대): ${[...seenSig].sort().join(",")}`);

    // ── ④ 아키타입 거리: 같은 페이지 8종 쌍의 스타일 토큰 집합 거리 ─────────────────
    const dists: number[] = [];
    for (const id of ["fx-skincare-serum", "fx-tech-keyboard", "fx-food-snack"]) {
      const sets = ARCHETYPE_IDS.map((a) => ({ a, t: styleTokens(pages.find((p) => p.arch === a && p.id === id)!.html) }));
      for (let i = 0; i < sets.length; i += 1) for (let j = i + 1; j < sets.length; j += 1) {
        const d = jaccardDist(sets[i]!.t, sets[j]!.t);
        if (d < MIN_ARCH_DISTANCE) f.push(`${id}: ${sets[i]!.a}↔${sets[j]!.a} 스타일 거리 ${d.toFixed(2)} < ${MIN_ARCH_DISTANCE}`);
        dists.push(d);
      }
    }

    // ── ⑥ 결정성(일부) ────────────────────────────────────────────────────────
    for (const arch of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(arch);
      const [id, file] = files[arch.length % files.length]!;
      if (exportHtmlOf(file) !== pages.find((p) => p.arch === arch && p.id === id)!.html) f.push(`${arch}/${id}: 같은 입력 두 번 결과가 다름`);
    }

    // ── ⑩ 스토리보드 곡선: 같은 말뭉치의 UP1(V5 꺼짐) 계획보다 나빠지지 않음 ──────────
    const sbTotals = { hi: 0, lo: 0, early: 0, close: 0 };
    const sbBase = { hi: 0, lo: 0, early: 0, close: 0 };
    setV5ArchetypeForTests("editorial");
    for (const [, file] of files) {
      const r = planStoryboard((await import("../design-corpus")).displayOf(file).sections).report;
      sbTotals.hi += r.highRuns; sbTotals.lo += r.lowRuns; sbTotals.early += r.earlyHighShort; sbTotals.close += r.closingHighMissing;
    }
    setDesignV5ForTests(false);
    for (const [, file] of files) {
      const r = planStoryboard((await import("../design-corpus")).displayOf(file).sections).report;
      sbBase.hi += r.highRuns; sbBase.lo += r.lowRuns; sbBase.early += r.earlyHighShort; sbBase.close += r.closingHighMissing;
    }
    setDesignV5ForTests(true);
    ok(sbTotals.lo <= sbBase.lo, `낮음 3연속 ${sbBase.lo}→${sbTotals.lo} (줄어야 함)`);
    ok(sbTotals.close <= sbBase.close, `마무리 직전 높음 없음 ${sbBase.close}→${sbTotals.close}`);
    ok(sbTotals.early <= sbBase.early, `처음 1/3 높음 부족 ${sbBase.early}→${sbTotals.early}`);
    ok(sbTotals.hi <= sbBase.hi + 2, `높음 3연속 ${sbBase.hi}→${sbTotals.hi}`);

    // 지표: 색상군 ≤3(근사)
    const rows: CorpusRow[] = pages.map((p) => ({ id: `${p.arch}/${p.id}`, m: pageMetrics(p.html) }));
    ok(summarize(rows).maxColorGroups <= 3, `색상군 최대 ${summarize(rows).maxColorGroups} (≤3 기대)`);

    // ── ⑨ 규정 문구·구매 카드·고지 노드가 UP1과 같다 ──────────────────────────────
    for (const pg of pages) {
      const pick = (h: string) => topSections(h).filter((x) => ["cta", "id.caution"].includes(signatureOf(x)) || /\bAI\b|인공지능/.test(x.slice(0, 400))).flatMap(textNodes).join("|");
      const a = pick(upPages.get(pg.id)!);
      const b = pick(pg.html);
      if (a !== b) f.push(`${pg.arch}/${pg.id}: 구매 카드·주의·고지 글이 UP1과 다름`);
    }

    // ── ⑧ 사진 없음: 이미지 필드를 비운 입력 ─────────────────────────────────────
    for (const arch of ["luxe", "pop"] as const) {
      setV5ArchetypeForTests(arch);
      for (const [id, file] of files.slice(0, 6)) {
        const a = exportArgsOf(readSession(file));
        try {
          const h = buildDetailPageHtml({ ...a, imageUrls: [] });
          if (/<img [^>]*src=""/.test(h)) f.push(`${arch}/${id}: 사진 없음에서 빈 src`);
        } catch (e) { f.push(`${arch}/${id}: 사진 없음 렌더 예외 ${(e as Error).message.slice(0, 60)}`); }
      }
    }

    // ── ⑤ 대비: 종이색 × 팔레트(말뭉치 테마 × mood) ────────────────────────────────
    const themes = files.map(([, file]) => exportArgsOf(readSession(file))).map((a) => impactPalette(a.theme, a.category));
    for (const arch of ARCHETYPE_IDS) {
      const paper = ARCHETYPES[arch].paper;
      for (const pal of themes) for (const mood of MOODS) {
        const p = v4Palette({ ink: pal.ink, accent: pal.accent, deep: pal.deep }, mood);
        const pairs: Array<[string, string, string]> = [["ink", p.ink, paper], ["text", p.onFace.bgA.text, paper], ["sub", p.onFace.bgA.sub, paper], ["strong", p.onFace.bgA.strong, paper]];
        const bad = pairs.find(([, fg, bg]) => contrastRatioToken(fg, bg) < 4.5);
        if (bad) { f.push(`대비 ${arch} 종이 ${paper} ${bad[0]} ${contrastRatioToken(bad[1], bad[2]).toFixed(2)} < 4.5 (accent ${pal.accent}, mood ${mood})`); break; }
      }
    }

    // ── ⑦ 새 변형 단위 렌더(극단 입력) ────────────────────────────────────────────
    const sample = exportArgsOf(readSession("scripts/fixtures/archetype-compare-beauty.json"));
    const pal = impactPalette(sample.theme, sample.category);
    const long = "아주긴문장".repeat(30);
    const mixed = "SPF50+ PA++++ 1,234,567mg Vitamin-C 99.9% ".repeat(5).trim();
    const oneWord = "가".repeat(120);
    const extremes: Array<[string, number, string]> = [["0개", 0, "가나다"], ["1개", 1, "가나다"], ["12개", 12, "가나다"], ["긴 한글", 4, long], ["숫자영문", 4, mixed], ["긴 단어", 4, oneWord]];
    const photoUrl = "/qa-fixtures/ph/food/1700000000026-compare-before.png";
    for (const arch of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(arch);
      for (const [fam, vars] of Object.entries(V4_V5_VARIANTS) as Array<[V4Block["family"], string[]]>) for (const v of vars) for (const [label, n, text] of extremes) {
        const photo = fam === "phototext" ? [{ url: photoUrl, pos: "50% 45%" }] : [];
        const sec: ImpactSection = {
          type: "impact", slot: "impact", kind: "v4", text: "제목", quote: text, body: text, ax: arch,
          v4: { family: fam, variant: v, no: 1, face: "bgA", keywords: [], price: "29,000원", items: fam === "phototext" ? [{ title: text, body: text, img: photo[0]! }] : Array.from({ length: n }, (_, i) => ({ title: `${text}${i}`, body: text })) },
          ...(fam === "spec" ? { stats: Array.from({ length: n }, (_, i) => ({ label: `${text}${i}`, value: text })) } : {}),
        } as ImpactSection;
        let html = "";
        try { html = v4Html(sec, pal, "alt", V5_PARTS); } catch (e) { f.push(`${arch} ${fam}.${v} ${label}: 렌더 예외 ${(e as Error).message.slice(0, 60)}`); continue; }
        const shell = html.replace(/<span aria-hidden="true" data-pz-(?:motif|divider|ghost)[\s\S]*?<\/span>/g, "").replace(/<span style="[^"]*white-space:nowrap">[^<]{0,12}(?:<span[^>]*>[^<]{0,6}<\/span>)?<\/span>/g, "");
        for (const k of [...STRICT_FORBIDDEN, ...(fam === "touch" ? [] : ["white-space:nowrap"])]) if (shell.includes(k)) f.push(`${arch} ${fam}.${v} ${label}: 금지 패턴 ${k}`);
        if (/width:(\d{4,})px/.test(html)) f.push(`${arch} ${fam}.${v} ${label}: 750 초과 고정 폭`);
        if (n > 0 && text.length > 20 && fam !== "gallery" && !/overflow-wrap:anywhere/.test(html)) f.push(`${arch} ${fam}.${v} ${label}: overflow-wrap 없음`);
        if (html.length > 0 && html !== v4Html(sec, pal, "alt", V5_PARTS)) f.push(`${arch} ${fam}.${v} ${label}: 결정성`);
      }
    }
    // 요건 함수: 정상 입력에서 선택 가능, 빈 입력은 거절(폴백)
    const T = (n: number, len = 10, body?: number) => Array.from({ length: n }, () => ({ title: "가".repeat(len), ...(body ? { body: "나".repeat(body) } : {}) }));
    ok(variantFits("faq", "numlist", { items: T(3, 20, 80) }) && !variantFits("faq", "numlist", { items: T(1, 5, 5) }) && !variantFits("faq", "chat", { items: T(3, 61, 5) }), "faq 요건");
    ok(variantFits("benefits", "rows2", { items: T(4, 10, 20) }) && !variantFits("benefits", "rows2", { items: T(3, 10, 20) }) && variantFits("spec", "big3", { items: T(3, 8, 6) }) && !variantFits("spec", "big3", { items: T(3, 8, 11) }), "rows2/big3 요건");
    setDesignV5ForTests(false);
    ok(!variantFits("faq", "numlist", { items: T(3, 20, 80) }), "V5 꺼짐인데 faq 요건 통과");
    setDesignV5ForTests(true);

    // ── ⑪ 같은 토큰 함수: 라이브·export CSS 선언이 같다 ──────────────────────────────
    for (const arch of ARCHETYPE_IDS) {
      const decl = (css: string) => [...css.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]).join("|");
      if (decl(archetypeCssV5("[x]", "live", ARCHETYPES[arch], "#1B1B18")) !== decl(archetypeCssV5(".y", "export", ARCHETYPES[arch], "#1B1B18"))) f.push(`${arch}: 라이브/export 래퍼 CSS 선언이 다름`);
      const css = archetypeCssV5(".y", "export", ARCHETYPES[arch], "#1B1B18");
      for (const k of STRICT_FORBIDDEN) if (css.includes(k)) f.push(`${arch}: 래퍼 CSS 금지 패턴 ${k}`);
    }
    // 선택 로직: 결정적·카테고리 적합표 안
    for (const [cat, fit] of Object.entries(CATEGORY_FIT)) {
      const a = pickArchetype({ category: cat, mood: null, seedKey: "x|y" });
      ok(a === pickArchetype({ category: cat, mood: null, seedKey: "x|y" }), `${cat}: 선택이 결정적이지 않음`);
      ok(fit.slice(0, 3).includes(a), `${cat}: 적합표 상위 3개 밖(${a})`);
    }
    const usedArch = new Set(files.map(([, file]) => { setV5ArchetypeForTests(null); const a = exportArgsOf(readSession(file)); return pickArchetype({ category: a.category, mood: null, seedKey: `${a.productName}|${a.category}` }); }));
    ok(usedArch.size >= 4, `자동 선택이 말뭉치에서 ${usedArch.size}종뿐`);
  } finally {
    setV5ArchetypeForTests(null);
    setDesignV5ForTests(defaultV5);
    setDesignUp1ForTests(false);
  }
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
