/**
 * 회귀 — 467차 다이나믹 부품 라이브러리(lib/dynamics-v5.ts) 단위 안전망. 브라우저·네트워크 없음: 모든 부품을 극단 입력(빈 값·1·12개·150자·긴 영단어·숫자 혼합)으로 불러
 * 금지 CSS/SVG·고정 폭 상한·장식 aria-hidden/pointer-events·넘침 래퍼·결정성·새 글자 없음·외부 주소 없음을 검사한다.
 * 이후 Phase에서 섹션 단위(초점·인접 중복·장식 상한·안전 여백)·말뭉치 지표 검사를 같은 파일에 더한다.
 */
import * as D from "../../lib/dynamics-v5";
import fs from "node:fs";
import { v4Palette } from "../../lib/palette-v4";
import { designV5On, setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { DYN_CAPS } from "../../lib/dynamics-layer-v5";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { planV4 } from "../../lib/layout-variants";
import { signatureOf, topSections } from "../variety-metrics-463";
import { expandDedupedStyles } from "../../lib/style-dedupe";

export const name = "다이나믹 467 — 부품 30종 극단 입력 + 레이어(꺼짐 미호출·장식 속성·상한·안전 구간·새 글자 없음)";

const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "filter:", "backdrop-filter", "textPath", "foreignObject", "<filter", "position:fixed", "animation:", "@keyframes", "<use ", "<symbol"];
const unesc = (t: string): string => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const textNodes = (html: string): string[] => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<svg[\s\S]*?<\/svg>/g, (m) => [...m.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((x) => `<i>${x[1]}</i>`).join("")).split(/<(?:[^>"']|"[^"]*"|'[^']*')*>/).map((t) => unesc(t).trim()).filter(Boolean);

/** 반드시 호출부가 overflow:hidden 래퍼(clip) 안에 두어야 하는 부품(자체 래퍼 없음) */
// (gaugeRing의 rotate는 자기 SVG 안 회전 — 폭이 그대로라 넘치지 않는다. tape는 호출부 카드의 clip 안)
const CALLER_CLIPS = new Set(["tiltCard", "sticker", "ribbon", "stampBadge", "overlapSeam", "tape", "gaugeRing"]);
/** HTML이 아니라 CSS background 값을 돌려주는 부품 */
const CSS_ONLY = new Set(["dotGrid", "stripeField", "gridPaper"]);

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const p = v4Palette({ accent: "#2E8F81", deep: "#216F64" }, null);
  const long = "아주긴문장".repeat(30);
  const word = "SUPERCALIFRAGILISTICEXPIALIDOCIOUS12345678901234567890";
  const mix = "SPF50+ 1,234mg 99.9%";
  const words = ["", "가", long, word, mix];
  const img = (u: string) => ({ url: u, pos: "50% 45%" });
  const photos = [0, 1, 3, 5, 12].map((n) => Array.from({ length: n }, (_, i) => img(`/qa-fixtures/ph/beauty/x${i}.png`)));
  const calls: Array<[string, () => string[]]> = [
    ["bigWord", () => words.map((w) => D.bigWord(w, p, { size: 999 }))],
    ["numeralStack", () => words.map((w) => D.numeralStack("01", w, p, { size: 500 }))],
    ["statBlock", () => words.map((w) => D.statBlock(w, w, p, { size: 999 }))],
    ["overlapStack", () => [D.overlapStack("<div>사진</div>", "<p>카드</p>", p, { lift: 999 }), D.overlapStack("", "<p>카드</p>", p)]],
    ["layeredCard", () => [D.layeredCard("<p>안</p>", p), D.layeredCard("", p), D.layeredCard("<p>안</p>", p, { layers: 1 })]],
    ["shadowPlate", () => (["hard", "soft", "float"] as const).map((k) => D.shadowPlate("<p>안</p>", p, k))],
    ["floatingObject", () => [D.floatingObject("<div>사진</div>", p), D.floatingObject("", p)]],
    ["tiltCard", () => [D.tiltCard("<p>안</p>", p, { deg: 99 }), D.tiltCard("", p)]],
    ["tape", () => [D.tape(p), D.tape(p, { side: "right" })]],
    ["sticker", () => words.flatMap((w) => [D.sticker(w, p), D.sticker(w, p, { shape: "star" })])],
    ["ribbon", () => words.map((w) => D.ribbon(w, p))],
    ["stampBadge", () => words.map((w) => D.stampBadge(w, p))],
    ["slantSeam", () => [D.slantSeam("#fff", "#000"), D.slantSeam("#fff", "#000", 999)]],
    ["waveSeam", () => [D.waveSeam("#fff", "#000")]],
    ["scallopSeam", () => [D.scallopSeam("#fff", "#000")]],
    ["zigzagSeam", () => [D.zigzagSeam("#fff", "#000")]],
    ["stepSeam", () => [D.stepSeam("#fff", "#000")]],
    ["overlapSeam", () => [D.overlapSeam("<p>안</p>", 999), D.overlapSeam("")]],
    ["highlighter", () => words.map((w) => D.highlighter(w, p))],
    ["scribbleCircle", () => words.map((w) => D.scribbleCircle(w, p, { seed: 3 }))],
    ["squiggleUnderline", () => words.map((w) => D.squiggleUnderline(w, p))],
    ["arrowCallout", () => words.flatMap((w) => [D.arrowCallout(w, p), D.arrowCallout(w, p, { dir: "down-right" })])],
    ["mosaic", () => photos.map((l) => D.mosaic(l, p, "대체"))],
    ["polaroidStack", () => photos.map((l) => D.polaroidStack(l, p, "대체"))],
    ["stepPath", () => [0, 1, 2, 6, 12].map((n) => D.stepPath(n, p))],
    ["gaugeRing", () => [-5, 0, 50, 100, 101, NaN].map((n) => D.gaugeRing(n, p))],
    ["tickerBand", () => [[], ["가"], [long, word, mix, "가", "나"]].map((w) => D.tickerBand(w, p))],
    ["dotGrid", () => [D.dotGrid(p)]],
    ["stripeField", () => [D.stripeField(p)]],
    ["gridPaper", () => [D.gridPaper(p)]],
  ];
  const called = new Set<string>();
  const input = [long, word, mix, "가", "01", "02", "03", "04", "05", "06", "대체", "사진", "카드", "안", "12", "50", "100"].join("\n");
  for (const [part, fn] of calls) {
    called.add(part);
    let outs: string[] = [];
    try { outs = fn(); } catch (e) { f.push(`${part}: 예외 ${(e as Error).message.slice(0, 80)}`); continue; }
    if (JSON.stringify(outs) !== JSON.stringify(fn())) f.push(`${part}: 결정성`);
    outs.forEach((html, k) => {
      if (!html) return;
      for (const t of FORBIDDEN) if (html.includes(t)) f.push(`${part}#${k}: 금지 패턴 ${t}`);
      if (/width:\s*(\d{4,})px|width:\s*([89]\d{2})px/.test(html.replace(/viewBox="[^"]*"/g, ""))) f.push(`${part}#${k}: 750 초과 고정 폭`);
      if (/https?:\/\//.test(html.replace(/xmlns="[^"]*"/g, ""))) f.push(`${part}#${k}: 외부 주소`);
      // 장식: aria-hidden + pointer-events:none
      for (const m of html.matchAll(/<span[^>]*data-pz-dyn-deco[^>]*>/g)) {
        if (!/aria-hidden="true"/.test(m[0]) || !/pointer-events:none/.test(m[0])) f.push(`${part}#${k}: 장식에 aria-hidden/pointer-events:none 없음`);
      }
      // 기울임·음수 마진은 clip 래퍼 안(자체 래퍼가 없는 부품은 호출부 몫)
      if ((/rotate\(/.test(html) || /margin:-\d/.test(html)) && !CALLER_CLIPS.has(part) && !html.includes("data-pz-dyn-clip") && !/overflow:hidden/.test(html)) f.push(`${part}#${k}: 기울임/음수 마진인데 overflow:hidden 래퍼 없음`);
      if (CSS_ONLY.has(part)) return;
      // 새 글자 없음: 글 노드 ⊆ 입력 ∪ 번호/기호
      for (const tn of textNodes(html)) {
        const core = tn.replace(/<\/?i>/g, "");
        if (!core || /^[\d\s,.:%+\-/]+$/.test(core)) continue;
        if (!input.includes(core) && !input.includes(core.slice(0, 14)) && !words.some((w) => w && w.trim().includes(core))) f.push(`${part}#${k}: 입력에 없는 글 «${core.slice(0, 20)}»`);
      }
    });
  }
  for (const part of D.DYN_PARTS) if (!called.has(part)) f.push(`${part}: 단위 호출이 없음`);
  if (D.DYN_PARTS.length < 20) f.push(`부품 ${D.DYN_PARTS.length}개 < 20`);
  // 빈 입력은 장식만 남기지 않는다
  for (const [n, h] of [["bigWord", D.bigWord("", p)], ["sticker", D.sticker("", p)], ["ribbon", D.ribbon("", p)], ["tickerBand", D.tickerBand([], p)], ["highlighter", D.highlighter("", p)]] as const) if (h) f.push(`${n}: 빈 입력인데 출력이 있음`);

  // ── 레이어(말뭉치 21 × 아키타입 8) ───────────────────────────────────────────
  const files = corpus();
  if (files.length < 18) return f;
  const srcDs = fs.readFileSync("lib/display-sections.ts", "utf8");
  const srcIt = fs.readFileSync("lib/impact-templates.ts", "utf8");
  if (!/v5tokens \? planDynamicsV5\(/.test(srcDs)) f.push("다이나믹 계획이 V5 토큰(편집 모드면 null) 뒤에서만 호출되지 않음");
  if (!/s\.dyn && s\.ax && designV5On\(\)/.test(srcIt)) f.push("다이나믹 적용이 V5 켜짐·계획 존재 조건 뒤가 아님");
  const defaultV5 = designV5On();
  setDesignUp1ForTests(true);
  try {
    // 일반 섹션 다시 그리기(stats·gallery·story) — 변환 조건과 원문 보존
    setDesignV5ForTests(true);
    {
      const a0 = exportArgsOf(readSession("scripts/fixtures/archetype-compare-tech.json")); // 이 픽스처의 수치는 숫자 게이트(claimFacts)를 통과한다
      const hero = { type: "hero", slot: "hero", headline: "H", subheadline: "S", imageIndex: 0 };
      const fill = (i: number) => ({ type: "caution", slot: "caution", heading: `주의${i}`, body: "내용" });
      const num = (extra: Record<string, unknown> = {}) => ({ label: "용량", value: "30mL", style: "number", basis: "measured", ...extra });
      const stat = (ms: Array<Record<string, unknown>>) => ({ type: "stat_infographic", slot: "stat_infographic", heading: "숫자로 보는 미스트", metrics: ms });
      const cta = { type: "cta_price", slot: "cta_price", price: 1000, targetCustomer: "x", badges: [] };
      const ok2 = [num(), num({ label: "담은 성분", value: "4가지" })]; // (이 픽스처에서 숫자 게이트를 통과하는 두 수치)
      const gal = (n: number) => ({ type: "gallery", slot: "gallery", heading: "갤러리", imageIndexes: Array.from({ length: n }, (_, i) => i + 1) });
      const textOnly = (extra: Record<string, unknown> = {}) => ({ type: "image_text", slot: "feature_callout", heading: "끈적임 없는 결", body: "가벼운 사용감으로 메이크업 위에도 사용할 수 있습니다. 산뜻하게 마무리됩니다. 휴대하기 좋은 크기입니다.", imageIndex: 0, imagePosition: "left", layout: "text_only", ...extra });
      const run = (secs: unknown[], arch: "editorial" | "catalog"): string[] => planV4(secs as never, (secs as unknown[]).map((_, i) => i), { mood: null, seedKey: "unit|x", imageUrls: a0.imageUrls, origins: a0.imageOrigins, facts: a0.claimFacts!, category: a0.category, height: () => 400, v5: ARCHETYPES[arch] }).placed.map((x) => `${x.family}.${x.variant}`);
      const base = [hero, fill(1), fill(2), fill(3), fill(4), fill(5)];
      const has = (secs: unknown[], fam: string): boolean => run([...base, ...secs, cta], "catalog").some((x) => x.startsWith(`${fam}.`));
      if (!has([stat(ok2)], "stats")) f.push("숫자 카드(style number·측정)가 stats 블록으로 안 바뀜");
      if (has([stat(ok2.map((m) => ({ ...m, style: "bar", percent: 40 })))], "stats")) f.push("막대(bar) 수치가 stats로 바뀜(디스클레이머·각주 보존 위반)");
      if (has([stat(ok2.map((m) => ({ ...m, sourceNote: "OO시험연구원" })))], "stats")) f.push("출처 각주가 있는 수치가 stats로 바뀜");
      if (has([stat(ok2.map((m) => ({ ...m, basis: "self_assessed" })))], "stats")) f.push("자체 평가 수치가 stats로 바뀜");
      if (has([stat([num()])], "stats")) f.push("수치 1개짜리가 stats로 바뀜");
      if (has([stat([num(), num({ label: "권장 분사 거리", value: "15cm" })])], "stats")) f.push("숫자 게이트를 통과하지 못한 수치(15cm)가 stats로 바뀜");
      if (!has([gal(3)], "gallery")) f.push("사진 3장 갤러리가 gallery 블록으로 안 바뀜");
      if (has([gal(1)], "gallery")) f.push("사진 1장 갤러리가 gallery로 바뀜");
      if (!has([textOnly()], "story")) f.push("본문 있는 text_only가 story 블록으로 안 바뀜");
      if (has([textOnly({ emphasis: "가벼운 사용감" })], "story") || has([textOnly({ callout: "말풍선" })], "story")) f.push("강조 구절/말풍선이 있는 text_only가 story로 바뀜");
      if (has([textOnly({ body: "짧은 글" })], "story")) f.push("본문이 짧은 text_only가 story로 바뀜");
      // 원문 보존: 값이 그대로 렌더에 나온다
      const secs = [...base, stat(ok2), cta];
      const plan = planV4(secs as never, secs.map((_, i) => i), { mood: null, seedKey: "unit|x", imageUrls: a0.imageUrls, origins: a0.imageOrigins, facts: a0.claimFacts!, category: a0.category, height: () => 400, v5: ARCHETYPES.catalog });
      const st = plan.sections.find((x) => x.type === "impact" && x.kind === "v4" && x.v4?.family === "stats");
      if (st && st.type === "impact") { const vals = (st.v4?.items ?? []).map((i) => i.body); if (JSON.stringify(vals) !== JSON.stringify(["30mL", "4가지"])) f.push(`stats 값이 입력과 다름: ${vals.join(",")}`); if (st.origin?.type !== "stat_infographic") f.push("stats가 원 섹션 종류(origin)를 남기지 않음"); }
    }
    // 꺼짐: 다이나믹 표식이 없다
    setDesignV5ForTests(false);
    for (const [id, file] of files.slice(0, 6)) if (/data-pz-dyn/.test(exportHtmlOf(file))) f.push(`${id}: V5 꺼짐인데 다이나믹 표식`);
    setDesignV5ForTests(true);
    // 장식을 두면 안 되는 구간(가격·접점·띠·히어로·구매 카드·고지·주의)
    const FORBIDDEN_SIG = /^(touch|statement|breather)\.|^cta$|^id\.caution$|^id\.ai|ai-disclosure|^illustration-banner$/;
    for (const arch of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(arch);
      const cap = DYN_CAPS[ARCHETYPES[arch].dyn.level];
      for (const [id, file] of files) {
        const html = expandDedupedStyles(exportHtmlOf(file));
        const secs = topSections(html);
        let seams = 0; let stickers = 0; let tapes = 0;
        secs.forEach((sec, i) => {
          const sg = signatureOf(sec);
          if (!sec.includes("data-pz-dyn")) return;
          if (FORBIDDEN_SIG.test(sg)) f.push(`${arch}/${id}: 장식 금지 구간(${sg})에 다이나믹 표식`);
          if (/data-pz-seam/.test(sec)) { seams += 1; const nx = secs[i + 1]; const pv = secs[i - 1]; if ((nx && /^cta$/.test(signatureOf(nx))) || (pv && /^cta$/.test(signatureOf(pv))) || i < 1) f.push(`${arch}/${id}: 이음새가 구매 카드/히어로 옆 (${i})`); }
          if (/margin-top:\s*-\d+px;z-index:2/.test(sec.slice(0, sec.indexOf(">") + 1) + sec.slice(0, 600)) ) seams += 0;
          stickers += (sec.match(/data-pz="sticker"|data-pz-dyn="sticker"/g) ?? []).length;
          tapes += (sec.match(/border-left:2px dotted/g) ?? []).length;
          for (const m of sec.matchAll(/<span[^>]*data-pz-dyn-deco[^>]*>/g)) if (!/aria-hidden="true"/.test(m[0]) || !/pointer-events:none/.test(m[0])) f.push(`${arch}/${id} ${sg}: 장식 속성`);
        });
        if (seams > cap.seams) f.push(`${arch}/${id}: 이음새 ${seams} > 상한 ${cap.seams}`);
        if (stickers > cap.stickers) f.push(`${arch}/${id}: 스티커 ${stickers} > 상한 ${cap.stickers}`);
        if (tapes > cap.tapes) f.push(`${arch}/${id}: 테이프 ${tapes} > 상한 ${cap.tapes}`);
        // 인접 중복: 같은 서명 두 섹션이 연달아 같은 장치(이음새)를 쓰지 않는다
        for (let i = 1; i < secs.length; i += 1) if (/data-pz-seam="(\w+)"/.test(secs[i]!) && /data-pz-seam/.test(secs[i - 1]!) && signatureOf(secs[i]!) === signatureOf(secs[i - 1]!)) f.push(`${arch}/${id}: 같은 서명 섹션이 연속으로 이음새`);
        // 새 글자: 큰 배경 글자는 순번이거나 같은 페이지 입력에 있는 단어
        const input = JSON.stringify(readSession(file));
        const visible = textNodes(html.replace(/<span aria-hidden="true" data-pz-dyn-deco[\s\S]*?<\/span>(?=<\/section>|<span aria-hidden="true" data-pz-dyn-deco)/g, "")).join("\n");
        for (const m of sec2(html)) if (!/^\d{2}$/.test(m) && !input.includes(m) && !visible.includes(m)) f.push(`${arch}/${id}: 배경 글자 «${m}»가 입력·페이지 글에 없음`);
      }
    }
  } finally {
    setV5ArchetypeForTests(null);
    setDesignV5ForTests(defaultV5);
    setDesignUp1ForTests(false);
  }
  return f;
}

/** 큰 배경 글자(font-size ≥ 72px aria-hidden 장식)의 글 */
function sec2(html: string): string[] {
  return [...html.matchAll(/<span aria-hidden="true" data-pz-dyn-deco style="[^"]*font-size:(\d+)px[^"]*">([^<]+)<\/span>/g)].filter((m) => Number(m[1]) >= 72).map((m) => unescapeHtml(m[2]!));
}
const unescapeHtml = (t: string): string => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
