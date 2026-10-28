/**
 * 회귀 — 468차 "진짜 다이나믹". 브라우저·네트워크 없음(문자열 렌더만). Phase마다 같은 파일에 검사를 더한다.
 *  Phase 3: 구도 부품 7종(극단 입력·금지 CSS·풀블리드 음수 마진 ≤24·고정 폭·결정성·새 글자 없음)과 새 변형(입력 요건 폴백)
 *  Phase 6: 구도 계획(단일 컬럼 비율·연속 3개 단일 구간 가드, 들여 쓰기는 V5 토큰 뒤에서만)
 *  Phase 5: 일반 섹션 래퍼 다이나믹(강도 4·5 시트 모서리·그림자, export/라이브 선택자, 표식 없는 구매 카드·고지는 제외)
 *  Phase 4: 빈 사진 틀(V5 폴백 상한·줄무늬 대비·사진 없음/일부/전부 × 8종)
 *  Phase 2: 읽히는 제목 스케일(fitTitlePx 단계 선택·320폭 안전·긴 입력 줄바꿈·결정성)
 *  Phase 1: 배너 아키타입화(V5 켜짐 한정, 연속 배너 값 다름, 밝은 면 성격은 전면 스크림 없음, 꺼짐·편집 모드 미적용, 배너 글자 대비 상수)
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, FIT_AVAIL_PX, NO_PHOTO_MAX_PX, archetypeCssV5, emWidth, fitTitlePx, noPhotoCssV5, setV5ArchetypeForTests, typographyV5 } from "../../lib/page-archetype-v5";
import { BANNER_SPLIT_BAND_BG, BANNER_STYLE } from "../../lib/design-tokens-v4";
import { corpus, exportHtmlOf, exportHtmlPhotos, type PhotosMode } from "../design-corpus";
import { compShares, frameStats, singleRuns3 } from "../dynamics-metrics-468";
import { topSections } from "../variety-metrics-463";
import { expandDedupedStyles } from "../../lib/style-dedupe";
import { ratio } from "../contrast-audit-466";
import { planBannersV5 } from "../../lib/banner-v5";
import * as C from "../../lib/compose-v5";
import { v4Palette } from "../../lib/palette-v4";
import type { DetailSection } from "../../lib/types/generate";

export const name = "다이나믹 468 — 배너 아키타입화·(이후 Phase: 제목 스케일·구도·빈 틀·일반 섹션)";

const bannersOf = (html: string): string[] => topSections(expandDedupedStyles(html)).filter((s) => /pagzly-illustration-banner/.test(s.slice(0, s.indexOf(">") + 1)));
/** 배너 마크업이 어느 값인지: 전면 스크림=사진 위 전면 그라데이션 덮개, 분리 띠=16:9 사진 칸 뒤 띠, 나머지=카드만 */
function kindOf(b: string): "full-scrim" | "split" | "card-only" {
  if (/position:absolute;inset:0;background:linear-gradient/.test(b)) return "full-scrim";
  if (/aspect-ratio:16\/9;overflow:hidden">/.test(b)) return "split";
  return "card-only";
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // ── 소스 잠금: 새 코드는 V5 토큰 뒤에서만, 기본값 불변
  if (BANNER_STYLE !== "full-scrim") f.push(`BANNER_STYLE 기본값이 바뀜: ${BANNER_STYLE}`);
  const ds = fs.readFileSync("lib/display-sections.ts", "utf8");
  if (!/v5tokens \? planBannersV5\(/.test(ds)) f.push("planBannersV5 호출이 v5tokens 가드 뒤가 아님");
  for (const p of ["lib/export-detail-html.ts", "components/DetailSectionRenderer.tsx"]) {
    const s = fs.readFileSync(p, "utf8");
    if (!/DESIGN_V4_ENABLED \? \(section\.v5Banner \?\? bannerStyleNow\(\)\) : "full-scrim"/.test(s)) f.push(`${p}: 배너 값 주입 형태가 다름`);
  }
  // ── 토큰: 번갈아 쓰는 두 값이 서로 다름, 전면 스크림은 임팩트·팝만
  for (const a of ARCHETYPE_IDS) {
    const b = ARCHETYPES[a].banner;
    if (b[0] === b[1]) f.push(`${a}: 배너 두 값이 같음(${b[0]})`);
    const dark = ARCHETYPES[a].face === "blockAlt" || ARCHETYPES[a].face === "colorCollide";
    if (!dark && b.includes("full-scrim")) f.push(`${a}: 밝은 면 성격인데 전면 스크림을 씀`);
    if (dark && b[0] !== "full-scrim") f.push(`${a}: 진한 성격의 첫 배너가 전면 스크림이 아님`);
  }
  // ── 대비: 배너 글자(흰색·#FAF8F3)가 얹히는 어두운 면은 팔레트와 무관한 상수 — 최악(밝은 사진 위 .9 카드, .96 띠)에서도 4.5:1
  const worstCard = Math.round(27 * 0.9 + 255 * 0.1);
  const cardRatio = ratio([250, 248, 243], [worstCard, worstCard, worstCard - 2]);
  const bandA = Number(/,\s*([\d.]+)\)/.exec(BANNER_SPLIT_BAND_BG)?.[1] ?? "1");
  const bandBg = Math.round(27 * bandA + 255 * (1 - bandA));
  const bandRatio = ratio([250, 248, 243], [bandBg, bandBg, bandBg]);
  if (cardRatio < 4.5) f.push(`배너 카드 글자 대비 ${cardRatio.toFixed(2)} < 4.5`);
  if (bandRatio < 4.5) f.push(`분리 띠 글자 대비 ${bandRatio.toFixed(2)} < 4.5`);
  // ── Phase 2: 제목 스케일
  const titles = ["", "가", "세안 후 당김", "세 가지 수분 케어", "맑게, 촉촉하게", "건조함과 당김이 느껴질 때", "아주긴문장".repeat(30), "SUPERCALIFRAGILISTICEXPIALIDOCIOUS12345678901234567890", "SPF50+ 1,234mg 99.9%"];
  for (const a of ARCHETYPE_IDS) {
    const t = ARCHETYPES[a];
    if (t.type.title <= 26 || t.type.display <= 30) f.push(`${a}: 디스플레이 크기가 기존 크기(26/30) 이하`);
    for (const x of titles) {
      for (const [base, floor, lines] of [[t.type.title, 26, 3], [t.type.display, 30, 5]] as const) {
        const px = fitTitlePx(x, base, floor, lines);
        if (px < floor || px > base) f.push(`${a}: fitTitlePx 범위 밖 ${px} (${floor}~${base}) "${x.slice(0, 10)}"`);
        if (px > floor) {
          const word = Math.max(...x.split(/\s+/).map(emWidth));
          if (word * px > FIT_AVAIL_PX) f.push(`${a}: 320폭에서 한 어절이 넘침 ${px}px "${x.slice(0, 10)}"`);
          if (emWidth(x) * px * 1.05 > FIT_AVAIL_PX * lines) f.push(`${a}: 줄 수 초과 ${px}px "${x.slice(0, 10)}"`);
        }
        if (fitTitlePx(x, base, floor, lines) !== px) f.push(`${a}: fitTitlePx 비결정`);
      }
      const h = typographyV5(`<section><p data-pz-title style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#111;word-break:keep-all">${x}</p></section>`, t);
      const size = Number(/font-size:(\d+)px/.exec(h)?.[1] ?? 0);
      if (x && size < 26) f.push(`${a}: 제목이 기존보다 작아짐 ${size}`);
      if (x && Math.max(...x.split(/\s+/).map(emWidth)) * size > FIT_AVAIL_PX && !/overflow-wrap:anywhere/.test(h)) f.push(`${a}: 넘칠 수 있는 긴 어절인데 overflow-wrap 없음 "${x.slice(0, 10)}"`);
      if (!x && h.includes("font-size:26px") === false && !/<p[^>]*><\/p>/.test(h)) f.push(`${a}: 빈 제목 처리`);
    }
    // 제목이 아닌 22px 요소는 기존 배율 규칙 유지, 두 번 곱해지지 않음
    const once = typographyV5(`<p style="font-size:22px;font-weight:900;letter-spacing:-0.02em">노트</p>`, t);
    const want = Math.round(22 * t.type.scale);
    if (!once.includes(`font-size:${want}px`)) f.push(`${a}: 22px 요소 배율 ${want} 아님`);
  }
  // ── Phase 3: 구도 부품
  {
    const p = v4Palette({ accent: "#2E8F81", deep: "#216F64" }, null);
    const long = "아주긴문장".repeat(30);
    const word = "SUPERCALIFRAGILISTICEXPIALIDOCIOUS12345678901234567890";
    const FORB = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "filter:", "backdrop-filter", "textPath", "foreignObject", "position:fixed", "animation", "<filter"];
    const im = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `/qa-fixtures/ph/beauty/x${i}.png`, pos: "50% 45%" }));
    const cards = (n: number, t: string) => Array.from({ length: n }, (_, i) => `<div><p>${t}${i}</p></div>`);
    const parts: Array<[string, () => string[]]> = [
      ["bleedPhoto", () => (["left", "right"] as const).flatMap((side) => [long, word, "가"].map((t) => C.bleedPhoto(im(1)[0]!, t, `<p>${t}</p>`, p, { side })))],
      ["splitAsym", () => [true, false].flatMap((flip) => [long, word, ""].map((t) => C.splitAsym(im(1)[0]!, t, `<p>${t}</p>`, p, { flip })))],
      ["staggerGrid", () => [0, 1, 2, 3, 12].map((n) => C.staggerGrid(cards(n, long)))],
      ["pullOut", () => (["left", "right"] as const).flatMap((side) => [long, word, "가", "SPF50+ 99.9%"].map((t) => C.pullOut(t, p, { size: 40, side, ink: "#111111", mark: "\u201C" })))],
      ["offsetStack", () => [0, 1, 2, 12].map((n) => C.offsetStack(cards(n, word)))],
      ["heroNumber", () => [true, false].map((flip) => C.heroNumber("<p>01</p>", `<p>${long}</p>`, { flip }))],
      ["layerDeck", () => [0, 1, 2, 3, 12].map((n) => C.layerDeck(im(n), long, p))],
    ];
    for (const [part, fn] of parts) {
      let outs: string[] = [];
      try { outs = fn(); } catch (e) { f.push(`${part}: 예외 ${(e as Error).message.slice(0, 80)}`); continue; }
      if (JSON.stringify(outs) !== JSON.stringify(fn())) f.push(`${part}: 결정성`);
      outs.forEach((h, k) => {
        if (!h) return;
        for (const t of FORB) if (h.includes(t)) f.push(`${part}#${k}: 금지 패턴 ${t}`);
        if (/width:\s*(\d{4,})px|width:\s*([89]\d{2})px/.test(h)) f.push(`${part}#${k}: 750 초과 고정 폭`);
        if (/https?:\/\//.test(h)) f.push(`${part}#${k}: 외부 주소`);
        for (const m of h.matchAll(/margin(?:-left|-right)?:\s*([^;"]+)/g)) for (const v of m[1]!.split(/\s+/)) { const n = /^-(\d+)px$/.exec(v); if (n && Number(n[1]) > C.BLEED && part !== "bleedPhoto" && part !== "splitAsym" && part !== "heroNumber") f.push(`${part}#${k}: 음수 마진 ${v} > ${C.BLEED}`); }
        for (const m of h.matchAll(/margin:([^;"]*)/g)) { const v = m[1]!.trim().split(/\s+/); const [, r = "0", , l = r] = v; for (const side of [r, l]) { const n = /^-(\d+)px$/.exec(side); if (n && Number(n[1]) > C.BLEED) f.push(`${part}#${k}: 가로 음수 마진 ${side} > ${C.BLEED}`); } }
        // 가로 음수 마진/기울임이 있는 부품은 섹션 패딩 안 또는 overflow:hidden 래퍼
        if ((/rotate\(/.test(h)) && !/overflow:hidden/.test(h)) f.push(`${part}#${k}: 기울임인데 overflow:hidden 래퍼 없음`);
        // 넘침 방지: flex 자식은 min-width:0
        for (const m of h.matchAll(/<div style="[^"]*flex:\d[^"]*"/g)) if (!/min-width:0/.test(m[0])) f.push(`${part}#${k}: flex 칸에 min-width:0 없음`);
        // 새 글자 없음: 글 노드는 입력(long/word/가/SPF50+ 99.9%/카드 글)과 장식 따옴표뿐
        const txt = h.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "\n").split("\n").map((x) => x.trim()).filter(Boolean);
        for (const x of txt) if (x !== "\u201C" && !(long + word + "가SPF50+ 99.9%").includes(x) && !/^(?:(?:아주긴문장)+|SUPERCALIFRAGILISTICEXPIALIDOCIOUS12345678901234567890|가|SPF50\+ 99\.9%|01)\d*$/.test(x)) f.push(`${part}#${k}: 입력에 없는 글 «${x.slice(0, 20)}»`);
      });
    }
    if (C.layerDeck(im(1), "x", p) !== "" || C.layerDeck([], "x", p) !== "") f.push("layerDeck: 사진 2장 미만인데 출력");
  }
  // 새 변형 입력 요건·소스 잠금(V5 켜짐에서만 후보)
  {
    const lv = fs.readFileSync("lib/layout-variants.ts", "utf8");
    for (const v of ["phototext.bleed", "phototext.split", "benefits.stagger", "concern.offset", "story.pullout", "gallery.deck"]) {
      const m = new RegExp(`case "${v.replace(".", "\\.")}"[^\\n]*`).exec(lv);
      if (!m || !/designV5On\(\)/.test(m[0])) f.push(`variantFits ${v}: designV5On() 가드 없음`);
    }
    const pa = fs.readFileSync("lib/page-archetype-v5.ts", "utf8");
    if (!/export function fitTitlePx/.test(pa)) f.push("fitTitlePx 없음");
  }
  // ── Phase 6: 구도 계획기
  {
    const dl = fs.readFileSync("lib/dynamics-layer-v5.ts", "utf8");
    if (!/get\(i\)\.indent = side/.test(dl)) f.push("들여 쓰기 계획이 planDynamicsV5 안에 없음");
    setDesignUp1ForTests(true);
    setDesignV5ForTests(true);
    const cf = corpus();
    for (const a of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(a);
      const hs = cf.map(([, file]) => exportHtmlOf(file));
      const cs = hs.map(compShares);
      const single = cs.reduce((x, c) => x + c.single, 0) / cs.length;
      const ba = cs.reduce((x, c) => x + c.bleedOrAsym, 0) / cs.length;
      const ov = cs.reduce((x, c) => x + c.overlap, 0) / cs.length;
      const runs = hs.reduce((x, h) => x + singleRuns3(h), 0) / hs.length;
      if (single > 0.55) f.push(`${a}: 단일 컬럼 비율 ${single.toFixed(2)} > 0.55`);
      if (ba < 0.3) f.push(`${a}: 풀블리드+비대칭 ${ba.toFixed(2)} < 0.30`);
      if (ov < 0.15) f.push(`${a}: 겹침 ${ov.toFixed(2)} < 0.15(가드; 목표 0.25는 보고서에 수치)`);
      if (runs > 1.5) f.push(`${a}: 연속 3개 단일 구간 평균 ${runs.toFixed(2)} > 1.5(기준선 3.05~12.9)`);
      if (JSON.stringify(hs[0]) !== JSON.stringify(exportHtmlOf(cf[0]![1]))) f.push(`${a}: 구도 계획 비결정`);
    }
    setV5ArchetypeForTests(null);
    setDesignV5ForTests(false);
  }
  // ── Phase 5: 일반 섹션 래퍼 다이나믹
  for (const a of ARCHETYPE_IDS) {
    for (const mode of ["export", "live"] as const) {
      const css = archetypeCssV5(".w", mode, ARCHETYPES[a], "#1B1B18");
      for (const st of [4, 5]) {
        const sel = mode === "export" ? `.w section[data-pz-ax$=".${st}"]{position:relative;z-index:1;` : `.w [data-pz-ax$=".${st}"] > section{position:relative;z-index:1;`;
        if (!css.includes(sel)) f.push(`${a}/${mode}: 강도 ${st} 시트 규칙 없음`);
      }
      if (/data-pz-info|pagzly-cta|data-info="buy"/.test(css)) f.push(`${a}/${mode}: 구매 카드/고지 선택자가 래퍼 규칙에 섞임`);
      for (const t of [":has(", "container-type", "mix-blend-mode", "clip-path", "filter:", "position:fixed", "animation"]) if (css.includes(t)) f.push(`${a}/${mode}: 금지 CSS ${t}`);
    }
  }
  // ── Phase 4: 빈 사진 틀
  if (NO_PHOTO_MAX_PX > 320) f.push(`빈 틀 상한 ${NO_PHOTO_MAX_PX} > 320`);
  const css = noPhotoCssV5(".pagzly-wrap", "#1B1B18");
  if (!/\[data-pz-np\]\[data-pz-np\]\{max-height:\d+px!important/.test(css)) f.push("V5 폴백 CSS 형태가 다름");
  // 줄무늬 대비: 어두운 선(α.16)과 밝은 선(α.22)이 밝은 면·어두운 면에서 면과 1.25:1 이상
  const mix = (fg: number[], a: number, bg: number[]): number[] => bg.map((b, i) => Math.round(fg[i]! * a + b * (1 - a)));
  for (const bg of [[250, 247, 241], [255, 255, 255], [27, 27, 24], [33, 111, 100]]) {
    const dark = ratio(mix([27, 27, 24], 0.16, bg) as [number, number, number], bg as [number, number, number]);
    const light = ratio(mix([255, 255, 255], 0.22, bg) as [number, number, number], bg as [number, number, number]);
    if (Math.max(dark, light) < 1.25) f.push(`줄무늬 대비 부족 ${Math.max(dark, light).toFixed(2)} on ${bg.join(",")}`);
  }
  {
    const psrc = fs.readFileSync("lib/page-archetype-v5.ts", "utf8");
    if (!/rules\.push\(noPhotoCssV5\(scope, ink\)\)/.test(psrc)) f.push("noPhotoCssV5가 archetypeCssV5(V5 전용) 밖에서 호출됨");
  }
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const pfiles = corpus();
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const mode of ["all", "partial", "none"] as PhotosMode[]) {
      for (const [id, file] of pfiles) {
        let h: string;
        try { h = exportHtmlPhotos(file, mode); } catch (e) { f.push(`${id}/${a}/${mode}: 렌더 예외 ${(e as Error).message.slice(0, 60)}`); continue; }
        if (!h.includes(`[data-pz-np][data-pz-np]{max-height:${NO_PHOTO_MAX_PX}px!important`)) f.push(`${id}/${a}/${mode}: V5 폴백 CSS 없음`);
        const st = frameStats(h);
        if (st.max > 320) f.push(`${id}/${a}/${mode}: 빈 틀 최대 ${Math.round(st.max)}px > 320`);
        if (mode === "none" && st.count > 0) f.push(`${id}/${a}/none: 사진이 없는데 사진 틀 ${st.count}개`);
        if (st.count > 0 && st.kindRatio < 0.5) f.push(`${id}/${a}/${mode}: 틀 종류 비율 ${st.kindRatio.toFixed(2)}`);
      }
    }
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  // ── 말뭉치: 꺼짐 = 기본 전면 스크림, 켜짐 = 아키타입별
  setDesignUp1ForTests(true);
  const files = corpus();
  setDesignV5ForTests(false);
  for (const [id, file] of files) {
    for (const b of bannersOf(exportHtmlOf(file))) if (kindOf(b) !== "full-scrim") f.push(`${id}: V5 꺼짐인데 배너가 전면 스크림이 아님(${kindOf(b)})`);
  }
  setDesignV5ForTests(true);
  let multi = 0;
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [id, file] of files) {
      const bs = bannersOf(exportHtmlOf(file)).map(kindOf);
      const want = [ARCHETYPES[a].banner[0], ARCHETYPES[a].banner[1]];
      bs.forEach((k, i) => { if (k !== want[i % 2]) f.push(`${id}/${a}: ${i + 1}번째 배너 ${k} ≠ 토큰 ${want[i % 2]}`); });
      if (bs.length >= 2) multi += 1;
      for (let i = 1; i < bs.length; i += 1) if (bs[i] === bs[i - 1]) f.push(`${id}/${a}: 연속 배너 값이 같음(${bs[i]})`);
    }
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  // 말뭉치에 배너가 둘 이상인 페이지가 없을 수 있어(multi=0) 계획 함수를 직접 검사한다
  void multi;
  for (const a of ARCHETYPE_IDS) {
    const secs = [1, 2, 3, 4].map((n) => ({ type: "illustration_banner", slot: `b${n}`, heading: `제목${n}` }) as DetailSection);
    const out = planBannersV5(secs, ARCHETYPES[a]).map((x) => (x as { v5Banner?: string }).v5Banner);
    for (let i = 1; i < out.length; i += 1) if (out[i] === out[i - 1] || !out[i]) f.push(`${a}: planBannersV5 연속 값 같음/누락 ${out.join(",")}`);
    const mixed = planBannersV5([{ type: "illustration_banner", slot: "x" } as DetailSection, { type: "faq_section", slot: "y" } as unknown as DetailSection, { type: "illustration_banner", slot: "z" } as DetailSection], ARCHETYPES[a]);
    if ((mixed[1] as { v5Banner?: string }).v5Banner !== undefined || (mixed[2] as { v5Banner?: string }).v5Banner === (mixed[0] as { v5Banner?: string }).v5Banner) f.push(`${a}: 다른 종류 섹션 건너뛰기/번갈아 쓰기 실패`);
  }
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
