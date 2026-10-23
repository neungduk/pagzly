/**
 * 439차 2-7 — 디자인 린터: "디자이너가 만든 수준"이라는 추상적 판단을 렌더 결과(export HTML + 표시 섹션)에서 셀 수 있는 규칙으로 바꾼다.
 * 무료(브라우저·서버·유료 API 없음). 영구 스크립트, 회귀(scripts/regression/design-lint.ts)에 편입.
 *   npx tsx scripts/design-lint.ts [id...]          → review/439-verify/lint-report.md (OUT로 경로 변경)
 *
 * 규칙(심각도: error = 화면을 해치는 것 / warn = 디자이너가 고칠 것 / info = 참고). 임계값 근거는 각 줄 주석.
 *  R1 연속 동일 구조           warn  같은 모양이 이어지면 스크롤이 "복붙"처럼 보인다(v4 변형·임팩트 종류 기준, 원래 섹션은 레이아웃까지)
 *  R2 연속 동일 배경색          info  면 색이 같아도 구조가 다르면 괜찮아서 참고만(3연속부터 warn)
 *  R3 정보 섹션 3연속           warn  표·FAQ·주의가 3개 이어지면 읽기를 포기한다(상위 페이지 실측: 2개 뒤 사진·장식 면)
 *  R4 긴 글 블록               warn  한 문단 180자 초과 — 모바일 390폭 약 9줄, 상위 페이지 문단 최대 6~8줄
 *  R5 큰 글줄/화면             warn  28px 이상 글줄 ÷ 화면(844px) > 1.5 — 428 기준(DOM 지표와 같은 임계)
 *  R6 최소 글자 크기            error 글 12px 미만 / warn 14px 미만 긴 글(20자 초과) — 본문 14·라벨 12 하한. 고지·배송 안내 같은 작은 글(12~13px)은 상위 페이지도 쓰는 크기라 warn
 *                              (v4 글자 하한 CSS[data-pz-typefloor]가 있으면 12px 미만 인라인 값은 12px로 본다)
 *  R7 대비 미달                error 일반 글 4.5:1, 큰 글(24px+ 또는 19px+ 굵게) 3:1 미만 — 같은 요소·조상의 단색 바탕 기준(사진·그라데이션 위는 생략)
 *                              글자 크기가 CSS 클래스·변수라 인라인으로 안 보이면 큰 글 기준(3:1)으로 본다(제목류가 대부분). 흰 글자가 밝은 바탕에서
 *                              1.5:1 미만이면 사진·스크림 위 글(형제 요소라 조상 바탕으로 안 잡힘)로 보고 건너뛴다.
 * 제외: SEO 텍스트 요약(.pagzly-seo-text — 검색용 기계 판독 블록), head·script·style.
 *  R8 고아 제목                warn  제목(18px+ 굵게) 끝 1~2자 어절이 묶이지 않음 — 438 bindTail 대상인데 빠진 것
 *  R9 모티프-글 겹침            error 모티프 좌표가 안전 영역 밖(lib/motifs isSafe)
 *  R10 히어로 요소 누락          error 히어로 제품명(h1) 없음 또는 32px 미만 — 437 사양
 *  R11 명암 반전 수             warn  최상위 구간 바탕 밝음↔어두움 > 6 — 428 기준
 *  R12 사진 대 글 비율           info  사진 있는 구간 비율 < 25% 또는 > 75% — 상위 페이지 30~60%
 *  R13 아이콘 대비(440)          error v4 아이콘(data-pz-icon) 선색과 바탕 3:1 미만 — 비텍스트 그래픽 기준(WCAG 1.4.11)
 *  R14 변형 다양성(440)          warn  v4 블록 4개 이상인 페이지에서 서로 다른 변형 비율 < 60% — 같은 모양 반복(연속이 아니어도)
 *  R15 첫 화면 구매·혜택(440)     warn  히어로 바로 뒤에 가격 띠·한눈에 보기 요약이 없음 — 상위 페이지는 첫 스크롤 안에 가격·혜택을 둔다
 * 440차: R5(큰 글줄/화면)·R11(명암 반전)은 DOM 측정(scripts/design-metrics-dom.ts measureDomPages, 390×844)이 있으면 그 값을 쓴다 —
 * 글자 수 어림(R5)은 DOM 지표보다 낮게 나와(s411 0.2 vs 1.70) 위반을 놓쳤다. DOM 값이 없으면(단위 검사) 이전 어림식.
 * 점수 = 100 − Σ(error 8, warn 3, info 1), 규칙별 감점 상한 24 — 한 규칙이 점수를 독점하지 않게.
 */
import fs from "node:fs";
import type { DetailSection } from "../lib/types/generate";
import { contrastRatioToken } from "../lib/design-tokens";
import { isSafe, readMotifMarks } from "../lib/motifs";
import { estimateSectionHeight } from "../lib/impact-templates";
import { isInfoSection, structureKey } from "../lib/layout-variants";

export type Severity = "error" | "warn" | "info";
export type LintIssue = { rule: string; sev: Severity; msg: string };
export type LintResult = { id: string; score: number; issues: LintIssue[]; stats: Record<string, number> };

const W: Record<Severity, number> = { error: 8, warn: 3, info: 1 };
const RULE_CAP = 24;
const VOID = new Set(["img", "br", "hr", "meta", "link", "input", "source", "wbr", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "stop", "use"]);

const hexOf = (c: string | undefined): string | null => {
  if (!c) return null;
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim()) ?? /^#([0-9a-f]{3})$/i.exec(c.trim());
  if (m) return m[1]!.length === 3 ? `#${m[1]!.split("").map((x) => x + x).join("")}` : `#${m[1]}`;
  const r = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(c.trim());
  if (r && (r[4] === undefined || Number(r[4]) >= 0.98)) return `#${[r[1], r[2], r[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("")}`;
  return null;
};
const styleOf = (attrs: string): Record<string, string> => {
  const m = /style="([^"]*)"/.exec(attrs);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const decl of m[1]!.split(";")) {
    const i = decl.indexOf(":");
    if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return out;
};
/** 배경 값에서 단색(헥스)만 — 그라데이션·이미지·반투명은 null(대비 생략) */
const solidBg = (st: Record<string, string>): string | null | undefined => {
  const v = st["background"] ?? st["background-color"];
  if (v === undefined) return undefined;
  if (/gradient|url\(/.test(v)) return null;
  return hexOf(v.split(/\s+/)[0]);
};

type Frame = { tag: string; bg: string | null | undefined; color?: string; size?: number; weight?: number; hidden: boolean; photo: boolean };

/** 글 조각마다 (글자, 글자색, 바탕색, 크기, 굵기, 장식 여부)를 뽑는다 — 인라인 스타일만 쓰는 v4·임팩트 마크업 기준 근사 */
export function textRuns(html: string): Array<{ text: string; color: string | null; bg: string | null; size: number; weight: number; hidden: boolean; titleish: boolean; raw: string; sizeKnown: boolean }> {
  const out: Array<{ text: string; color: string | null; bg: string | null; size: number; weight: number; hidden: boolean; titleish: boolean; raw: string; sizeKnown: boolean }> = [];
  const stack: Frame[] = [{ tag: "root", bg: "#ffffff", hidden: false, photo: false }];
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g;
  let svgDepth = 0;
  for (const m of html.matchAll(re)) {
    if (m[5] !== undefined) {
      const text = m[5].replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
      if (!text || svgDepth > 0) continue;
      const top = stack[stack.length - 1]!;
      if (top.tag === "style" || top.tag === "script" || top.tag === "title") continue;
      let bg: string | null = null;
      for (let i = stack.length - 1; i >= 0; i -= 1) { const b = stack[i]!.bg; if (b !== undefined) { bg = stack[i]!.photo ? null : b; break; } if (stack[i]!.photo) { bg = null; break; } }
      const color = [...stack].reverse().find((f) => f.color)?.color ?? null;
      const sizeKnown = [...stack].reverse().find((f) => f.size)?.size;
      const size = sizeKnown ?? 16;
      const weight = [...stack].reverse().find((f) => f.weight)?.weight ?? 400;
      out.push({ text, color: hexOf(color ?? undefined), bg, size, weight, hidden: stack.some((f) => f.hidden), titleish: stack.some((f) => f.tag === "h1"), raw: "", sizeKnown: sizeKnown !== undefined });
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2]!.toLowerCase();
    if (tag === "svg") { if (closing) svgDepth = Math.max(0, svgDepth - 1); else if (m[4] !== "/") svgDepth += 1; continue; }
    if (svgDepth > 0) continue;
    if (closing) {
      for (let i = stack.length - 1; i > 0; i -= 1) if (stack[i]!.tag === tag) { stack.length = i; break; }
      continue;
    }
    if (VOID.has(tag) || m[4] === "/") continue;
    const attrs = m[3] ?? "";
    const st = styleOf(attrs);
    stack.push({
      tag,
      bg: solidBg(st),
      color: st["color"],
      size: st["font-size"] && /^\d+(\.\d+)?px$/.test(st["font-size"]) ? parseFloat(st["font-size"]) : undefined,
      weight: st["font-weight"] && /^\d+$/.test(st["font-weight"]) ? Number(st["font-weight"]) : undefined,
      hidden: /aria-hidden="true"|data-pz-deco|data-pz-ghost|data-hl="ghost"|pagzly-seo-text/.test(attrs) || st["display"] === "none",
      photo: /data-hero-photo|data-hero-v2="A"/.test(attrs),
    });
  }
  return out;
}

/** 최상위 구간(section) 바탕 — 단색이면 헥스, 사진·그라데이션·알 수 없음은 표식 */
function topFaces(html: string): string[] {
  const faces: string[] = [];
  let depth = 0;
  for (const m of html.matchAll(/<(\/?)section\b([^>]*)>/g)) {
    if (m[1] === "/") { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) {
      const st = styleOf(m[2] ?? "");
      const bg = st["background"] ?? st["background-color"];
      faces.push(bg === undefined ? "?" : /url\(/.test(bg) ? "photo" : /gradient/.test(bg) ? `grad:${(bg.match(/#[0-9A-Fa-f]{6}/) ?? ["?"])[0]}` : hexOf(bg.split(/\s+/)[0]) ?? "?");
    }
    depth += 1;
  }
  return faces;
}
const isDark = (hex: string) => contrastRatioToken("#FFFFFF", hex) > contrastRatioToken("#1B1B18", hex);

/** v4 아이콘 svg마다 (아이콘 id, 선색, 바탕색) — textRuns와 같은 조상 바탕 규칙(사진·그라데이션 위는 null) */
export function iconRuns(html: string): Array<{ id: string; stroke: string | null; bg: string | null }> {
  const out: Array<{ id: string; stroke: string | null; bg: string | null }> = [];
  const stack: Array<{ tag: string; bg: string | null | undefined; photo: boolean }> = [{ tag: "root", bg: "#ffffff", photo: false }];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g)) {
    const closing = m[1] === "/";
    const tag = m[2]!.toLowerCase();
    const attrs = m[3] ?? "";
    if (tag === "svg" && !closing && /data-pz-icon="([^"]+)"/.test(attrs)) {
      let bg: string | null = null;
      for (let i = stack.length - 1; i >= 0; i -= 1) { const f = stack[i]!; if (f.photo) break; if (f.bg !== undefined) { bg = f.bg; break; } }
      // 듀오톤 틴트 원은 장식이라 바탕으로 보지 않는다(선이 형태를 전부 담음)
      out.push({ id: /data-pz-icon="([^"]+)"/.exec(attrs)![1]!, stroke: hexOf(/stroke="([^"]+)"/.exec(attrs)?.[1]), bg });
      continue;
    }
    if (closing) { for (let i = stack.length - 1; i > 0; i -= 1) if (stack[i]!.tag === tag) { stack.length = i; break; } continue; }
    if (VOID.has(tag) || m[4] === "/" || tag === "svg") continue;
    stack.push({ tag, bg: solidBg(styleOf(attrs)), photo: /data-hero-photo|data-hero-v2="A"/.test(attrs) });
  }
  return out;
}

export type LintDom = { screens: number; bigPerScreen: number; flips: number };

export function lintPage(id: string, html: string, display: DetailSection[], dom?: LintDom): LintResult {
  const issues: LintIssue[] = [];
  const add = (rule: string, sev: Severity, msg: string) => issues.push({ rule, sev, msg });
  // R1 연속 동일 구조
  const keys = display.map(structureKey);
  keys.forEach((k, i) => { if (i > 0 && k === keys[i - 1] && !/^(image_text\.compact|gallery|ai_disclosure)$/.test(k)) add("R1", "warn", `연속 동일 구조 ${k} @${i}`); });
  // R3 정보 3연속
  let run = 0;
  display.forEach((s, i) => { run = isInfoSection(s) ? run + 1 : 0; if (run === 3) add("R3", "warn", `정보 섹션 3연속 @${i}`); });
  // R2·R11 면
  const faces = topFaces(html).filter((f) => f !== "?");
  let same = 1, flips = 0, prevTone = "";
  faces.forEach((f, i) => {
    if (i > 0 && f === faces[i - 1] && f !== "photo") { same += 1; if (same === 2) add("R2", "info", `같은 바탕 ${f} 연속 @${i}`); if (same === 3) add("R2", "warn", `같은 바탕 ${f} 3연속 @${i}`); } else same = 1;
    const hex = f.startsWith("grad:") ? f.slice(5) : f;
    if (/^#/.test(hex)) { const tone = isDark(hex) ? "dark" : "light"; if (prevTone && tone !== prevTone) flips += 1; prevTone = tone; }
  });
  if (dom) flips = dom.flips;
  if (flips > 6) add("R11", "warn", `명암 반전 ${flips}회(>6)`);
  // 글 조각 기반 규칙
  const runs = textRuns(html.replace(/<head>[\s\S]*?<\/head>/, ""));
  const floor = /data-pz-typefloor/.test(html);
  let bigLines = 0;
  for (const r of runs) {
    if (r.hidden) continue;
    const len = [...r.text].length;
    // R4
    if (len > 180) add("R4", "warn", `긴 글 ${len}자 «${r.text.slice(0, 18)}…»`);
    // R6
    const sz = floor ? Math.max(12, r.size) : r.size;
    if (sz < 12 && len >= 2) add("R6", "error", `글자 ${r.size}px «${r.text.slice(0, 14)}»`);
    else if (sz < 14 && len > 20) add("R6", "warn", `긴 글 ${r.size}px «${r.text.slice(0, 14)}»`);
    // R7
    if (r.color && r.bg) {
      const large = !r.sizeKnown || r.size >= 24 || (r.size >= 19 && r.weight >= 700);
      const c = contrastRatioToken(r.color, r.bg);
      const overlay = c < 1.5 && contrastRatioToken(r.color, "#FFFFFF") < 1.5;
      if (!overlay && c < (large ? 3 : 4.5)) add("R7", "error", `대비 ${c.toFixed(2)} ${r.color}/${r.bg} «${r.text.slice(0, 14)}»`);
    }
    // R5 (390폭 본문 342px 가정, 한 글자 ≈ 0.95em)
    if (r.size >= 28) bigLines += Math.max(1, Math.ceil((len * r.size * 0.95) / 342));
  }
  const totalH = display.reduce((a, s) => a + estimateSectionHeight(s), 0);
  const screens = dom ? dom.screens : Math.max(1, totalH / 844);
  const bigPer = dom ? dom.bigPerScreen : bigLines / screens;
  if (bigPer > 1.5) add("R5", "warn", `큰 글줄/화면 ${bigPer.toFixed(2)}(>1.5)`);
  // R8 고아 제목: 18px+ 굵은 p/h1의 순수 글(태그 없음) 끝 1~2자 어절
  for (const m of html.matchAll(/<(h1|p)\b[^>]*?font-size:(\d+(?:\.\d+)?)px;font-weight:(\d+)[^>]*>([^<]+)<\/(h1|p)>/g)) {
    const isTitle = m[1] === "h1" || (Number(m[2]) >= 18 && Number(m[3]) >= 700);
    if (isTitle && /\S\s+\S+\s+\S{1,2}$/.test(m[4]!.trim()) && [...m[4]!].length > 4) add("R8", "warn", `고아 제목 «${m[4]!.trim().slice(-12)}»`);
  }
  // R9 모티프
  for (const k of readMotifMarks(html)) if (!isSafe({ offset: k.offset, h: k.h })) add("R9", "error", `모티프 ${k.id} 안전 영역 밖`);
  // R10 히어로
  const h1 = /<h1[^>]*data-hero-name="(\d+)"/.exec(html);
  if (display[0]?.type === "hero" && (!h1 || Number(h1[1]) < 32)) add("R10", "error", h1 ? `히어로 제품명 ${h1[1]}px` : "히어로 제품명 없음");
  // R13 아이콘 대비: 아이콘 svg의 선색과 그 svg를 품은 가장 가까운 단색 바탕(textRuns와 같은 스택 규칙)
  for (const ic of iconRuns(html.replace(/<head>[\s\S]*?<\/head>/, ""))) {
    if (ic.stroke && ic.bg && contrastRatioToken(ic.stroke, ic.bg) < 3) add("R13", "error", `아이콘 ${ic.id} 대비 ${contrastRatioToken(ic.stroke, ic.bg).toFixed(2)} ${ic.stroke}/${ic.bg}`);
  }
  // R14 변형 다양성
  const v4keys = keys.filter((k) => /^(benefits|concern|story|spec|phototext)\./.test(k));
  if (v4keys.length >= 4 && new Set(v4keys).size / v4keys.length < 0.6) add("R14", "warn", `v4 변형 ${new Set(v4keys).size}종/${v4keys.length}블록`);
  // R15 히어로 직후 구매·혜택(가격 띠·한눈에 보기 요약)
  const heroEnd = html.search(/<\/section>/);
  if (display[0]?.type === "hero" && heroEnd > 0 && !/data-pz-strip|한눈에 보기|data-summary=/.test(html.slice(heroEnd, heroEnd + 12000))) add("R15", "warn", "히어로 직후 가격 띠·한눈에 보기 없음");
  // R12 사진 비율
  const photoSecs = display.filter((s) => JSON.stringify(s).match(/"(imageIndex|imageUrl|images|url)"/)).length;
  const ratio = photoSecs / Math.max(1, display.length);
  if (ratio < 0.25 || ratio > 0.75) add("R12", "info", `사진 구간 비율 ${(ratio * 100).toFixed(0)}%`);
  // 점수
  const byRule = new Map<string, number>();
  for (const i of issues) byRule.set(i.rule, Math.min(RULE_CAP, (byRule.get(i.rule) ?? 0) + W[i.sev]));
  const score = Math.max(0, 100 - [...byRule.values()].reduce((a, b) => a + b, 0));
  return { id, score, issues, stats: { screens: +screens.toFixed(1), bigPerScreen: +bigPer.toFixed(2), flips, photoRatio: +ratio.toFixed(2), sections: display.length } };
}

/** opts.dom(기본 켬): R5·R11을 DOM 측정값으로. 브라우저(playwright)를 띄운다 — 단위 검사는 lintPage를 직접 부른다 */
export async function lintCorpus(only: string[] = [], opts: { dom?: boolean } = {}): Promise<LintResult[]> {
  const { corpus, exportHtmlOf, displayOf } = await import("./design-corpus");
  const pages = corpus({ only }).map(([id, file]) => ({ id, html: exportHtmlOf(file), display: displayOf(file).sections }));
  const dom = opts.dom === false || !pages.length ? null : await (await import("./design-metrics-dom")).measureDomPages(pages.map((p) => [p.id, p.html]));
  return pages.map((p) => lintPage(p.id, p.html, p.display, dom?.get(p.id)));
}

export function reportMd(results: LintResult[], title = "디자인 린트"): string {
  const rules = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15"];
  const head = `| 세션 | 점수 | ${rules.join(" | ")} | 화면 | 큰글줄/화면 | 반전 |\n|---|---|${rules.map(() => "---").join("|")}|---|---|---|`;
  const rows = results.map((r) => `| ${r.id} | **${r.score}** | ${rules.map((k) => r.issues.filter((i) => i.rule === k).length || "").join(" | ")} | ${r.stats.screens} | ${r.stats.bigPerScreen} | ${r.stats.flips} |`);
  const avg = results.reduce((a, r) => a + r.score, 0) / Math.max(1, results.length);
  const detail = results.filter((r) => r.issues.length).map((r) => `- **${r.id}** (${r.score}): ${r.issues.slice(0, 12).map((i) => `${i.rule}[${i.sev}] ${i.msg}`).join(" / ")}${r.issues.length > 12 ? ` …외 ${r.issues.length - 12}` : ""}`);
  return `## ${title}\n\n평균 점수 ${avg.toFixed(1)} · 최저 ${Math.min(...results.map((r) => r.score))}\n\n${head}\n${rows.join("\n")}\n\n### 위반 목록\n${detail.join("\n") || "(없음)"}\n`;
}

async function main() {
  const results = await lintCorpus(process.argv.slice(2));
  const md = reportMd(results);
  console.log(md);
  if (process.env.OUT !== "-") fs.writeFileSync(process.env.OUT ?? "review/439-verify/lint-report.md", `# 439차 디자인 린트 보고\n\n${md}`);
}

if (process.argv[1] && /design-lint/.test(process.argv[1]) && !/regression/.test(process.argv[1])) void main();
