/**
 * 회귀 — 467차 다이나믹 부품 라이브러리(lib/dynamics-v5.ts) 단위 안전망. 브라우저·네트워크 없음: 모든 부품을 극단 입력(빈 값·1·12개·150자·긴 영단어·숫자 혼합)으로 불러
 * 금지 CSS/SVG·고정 폭 상한·장식 aria-hidden/pointer-events·넘침 래퍼·결정성·새 글자 없음·외부 주소 없음을 검사한다.
 * 이후 Phase에서 섹션 단위(초점·인접 중복·장식 상한·안전 여백)·말뭉치 지표 검사를 같은 파일에 더한다.
 */
import * as D from "../../lib/dynamics-v5";
import { v4Palette } from "../../lib/palette-v4";

export const name = "다이나믹 467 — 부품 30종 극단 입력(금지 CSS·고정 폭·장식 속성·넘침 래퍼·결정성·새 글자 없음)";

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
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
