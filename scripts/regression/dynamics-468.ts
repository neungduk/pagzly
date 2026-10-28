/**
 * 회귀 — 468차 "진짜 다이나믹". 브라우저·네트워크 없음(문자열 렌더만). Phase마다 같은 파일에 검사를 더한다.
 *  Phase 2: 읽히는 제목 스케일(fitTitlePx 단계 선택·320폭 안전·긴 입력 줄바꿈·결정성)
 *  Phase 1: 배너 아키타입화(V5 켜짐 한정, 연속 배너 값 다름, 밝은 면 성격은 전면 스크림 없음, 꺼짐·편집 모드 미적용, 배너 글자 대비 상수)
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, FIT_AVAIL_PX, emWidth, fitTitlePx, setV5ArchetypeForTests, typographyV5 } from "../../lib/page-archetype-v5";
import { BANNER_SPLIT_BAND_BG, BANNER_STYLE } from "../../lib/design-tokens-v4";
import { corpus, exportHtmlOf } from "../design-corpus";
import { topSections } from "../variety-metrics-463";
import { expandDedupedStyles } from "../../lib/style-dedupe";
import { ratio } from "../contrast-audit-466";
import { planBannersV5 } from "../../lib/banner-v5";
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
