/**
 * 회귀 — 469차 "남은 평평한 덩어리". 브라우저·네트워크 없음(문자열 렌더만). Phase마다 같은 파일에 검사를 더한다.
 *  Phase 1: 정보 구간(data-info) 아키타입화 — 토큰·덮어쓰기 CSS·팔레트 전수 대비·진한 정보 구간 0·V5 꺼짐 미호출
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { infoCssV5 } from "../../lib/info-v5";
import { infoColorsOf } from "../../lib/info-style";
import { scrimAlpha } from "../../lib/info-backdrop";
import { getCategoryTheme } from "../../lib/category-theme";
import { contrastRatioToken, mixHex } from "../../lib/design-tokens";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { darkInfoZones } from "../dynamics-metrics-469";

export const name = "다이나믹 469 — 정보 구간 아키타입화·(이후 Phase: 일반 섹션 구조·본문 글자·장면)";

const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "filter:", "backdrop-filter", "position:fixed", "animation"];

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // ── Phase 1: 토큰·소스 잠금
  for (const a of ARCHETYPE_IDS) {
    const t = ARCHETYPES[a];
    const dark = t.face === "blockAlt" || t.face === "colorCollide";
    if (dark !== (t.infoBackdrop === "scrim-deep")) f.push(`${a}: infoBackdrop ${t.infoBackdrop} (진한 성격만 scrim-deep)`);
  }
  for (const p of ["lib/export-detail-html.ts", "components/DetailSectionRenderer.tsx"]) {
    const s = fs.readFileSync(p, "utf8");
    if (!/\(display(?:Res)?\.v5 \? archetypeCssV5\([^)]*\) \+ infoCssV5\(/.test(s)) f.push(`${p}: infoCssV5가 V5 토큰(편집 모드면 null) 뒤에서만 나가지 않음`);
  }
  // ── 팔레트 전수(카테고리 테마 6 + 말뭉치 테마): 글자 대비 4.5:1
  const themes = ["화장품/뷰티", "패션/의류", "식품", "전자/가전", "생활/리빙", "반려동물"].map((c) => getCategoryTheme(c));
  for (const [, file] of corpus()) themes.push(exportArgsOf(readSession(file)).theme);
  for (const [i, th] of themes.entries()) {
    const c = infoColorsOf(th);
    const tint = mixHex("#FFFFFF", c.soft, 0.55);
    const a = scrimAlpha(tint, c.ink, "#000000", 5.5);
    const worst = contrastRatioToken(c.ink, mixHex("#000000", tint, Math.min(0.96, Math.max(0.72, a))));
    if (worst < 4.5) f.push(`테마#${i}: 밝은 스크림 최악(검은 사진) 잉크 대비 ${worst.toFixed(2)} < 4.5`);
    if (contrastRatioToken(c.deep, "#FFFFFF") < 4.5) f.push(`테마#${i}: 카드 위 진한 색 글자 대비 < 4.5`);
    if (contrastRatioToken("#FFFFFF", c.deep) < 4.5) f.push(`테마#${i}: 강조 카드(흰 글자/진한 면) 대비 < 4.5`);
    if (contrastRatioToken(c.ink, "#FFFFFF") < 4.5) f.push(`테마#${i}: 카드 위 잉크 대비 < 4.5`);
    if (contrastRatioToken(c.deep, c.base) < 4.5 && contrastRatioToken(c.deep, "#FFFFFF") >= 4.5) { /* statnum: 진한 글자/기본 면 — 아래에서 별도 확인 */ }
    for (const a2 of ARCHETYPE_IDS) {
      const css = infoCssV5(".w", ARCHETYPES[a2], c, { points: "https://example.invalid/x.png" });
      if (ARCHETYPES[a2].infoBackdrop === "scrim-deep" && css !== "") f.push(`${a2}: scrim-deep인데 덮어쓰기 CSS가 나감`);
      for (const k of FORBIDDEN) if (css.includes(k)) f.push(`${a2}: 금지 CSS ${k}`);
      if (/url\("(?!https:)/.test(css)) f.push(`${a2}: https 아닌 url`);
      if (ARCHETYPES[a2].infoBackdrop !== "scrim-deep" && !/\[data-info="points"\]\{background:linear-gradient/.test(css)) f.push(`${a2}: 사진이 있는데 스크림 배경 규칙 없음`);
      const none = infoCssV5(".w", ARCHETYPES[a2], c, undefined);
      if (ARCHETYPES[a2].infoBackdrop !== "scrim-deep" && /url\(/.test(none)) f.push(`${a2}: 사진이 없는데 url`);
    }
  }
  // statnum: 잉크 글자가 기본 면·소프트 면 위에서 읽히는지(stat 소프트 면 포함)
  for (const [i, th] of themes.entries()) { const c = infoColorsOf(th); for (const [n, bg] of [["기본", c.base], ["소프트", c.soft]] as const) if (contrastRatioToken(c.ink, bg) < 4.5) f.push(`테마#${i}: 잉크/${n} 면 대비 ${contrastRatioToken(c.ink, bg).toFixed(2)} < 4.5`); }
  // ── 말뭉치: 밝은 성격은 진한 정보 구간 0
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    let sum = 0;
    for (const [id, file] of corpus()) {
      const h = exportHtmlOf(file);
      const n = darkInfoZones(h);
      sum += n;
      if (ARCHETYPES[a].infoBackdrop !== "scrim-deep" && n > 0) f.push(`${id}/${a}: 밝은 성격인데 진한 정보 구간 ${n}개`);
    }
    if (ARCHETYPES[a].infoBackdrop === "scrim-deep" && sum === 0) f.push(`${a}: 진한 성격인데 진한 정보 구간이 하나도 없음`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
