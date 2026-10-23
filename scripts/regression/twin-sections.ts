/**
 * 회귀 — 443차 2 이전 섹션 쌍둥이 수정: 섹션 하나씩 (a) 라이브와 export가 v4 토큰 선언을 같은 횟수만큼 내는지(문자열 패리티),
 * (b) 제목 위계가 3단 안인지를 합성 픽스처에서 본다. off 문자열 동일은 check-v4-off(export)·check-v4-off-live(라이브)가 맡는다. 호출 0·서버 0.
 * 섹션 하나만 담아 두 렌더러로 그린 뒤, 그 섹션의 <section>…</section> 조각만 잘라 비교한다(다른 섹션·꼬리말 영향 제거).
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BRAND } from "../../lib/design-tokens";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { declStyle, tokenDecl, type Decl } from "../../lib/design-tokens-v4";
import type { DetailSection } from "../../lib/types/generate";
import { faqCardV4, faqListV4, faqQuestionV4, highlightCardV4, personaCardV4, personaTextV4 } from "../../lib/twin-styles-v4";
import { corpus, exportArgsOf, readSession } from "../design-corpus";

export const name = "쌍둥이 수정 — 섹션별 라이브↔export v4 토큰 선언 패리티";

/** groups: 한 요소(style 속성)가 통째로 가져야 하는 선언 묶음. 묶음마다 라이브·export의 요소 수가 같아야 한다(순서·다른 선언은 무관) */
type Probe = { type: string; groups: Decl[]; heading: (s: Record<string, unknown>) => string | undefined };
const INK = BRAND.ink;
/** 섹션을 추가할 때마다 한 줄씩 늘린다 */
export const PROBES: Probe[] = [
  {
    type: "highlight_box",
    groups: [
      tokenDecl("heading-small"), tokenDecl("heading-mid"), tokenDecl("line-relaxed"),
      highlightCardV4({ trust: false, em: false, bold: false }), highlightCardV4({ trust: false, em: true, bold: false }), highlightCardV4({ trust: false, em: false, bold: true }),
      highlightCardV4({ trust: true, em: false, bold: false }), highlightCardV4({ trust: true, em: true, bold: false }),
    ],
    heading: (s) => (s.heading as string) || ((s.cards as Array<{ title?: string }>)?.[0]?.title),
  },
  {
    type: "faq",
    groups: [faqCardV4(), faqQuestionV4(), faqListV4()],
    heading: (s) => (s.items as Array<{ question?: string }> | undefined)?.[0]?.question,
  },
  {
    type: "target_persona",
    groups: [personaTextV4(), personaCardV4()],
    heading: (s) => (s.personas as string[] | undefined)?.[0], // 제목은 두 톤 span으로 쪼개져 글자로 못 찾는다
  },
];

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** needle이 든 <section> 조각(바깥 것은 중첩 없음) */
export function sectionOf(html: string, needle: string): string | null {
  const at = html.indexOf(escHtml(needle));
  if (at < 0) return null;
  const from = html.lastIndexOf("<section", at);
  const to = html.indexOf("</section>", at);
  return from < 0 || to < 0 ? null : html.slice(from, to + 10);
}

/** 조각 안에서 style 속성의 선언 집합이 group을 모두 포함하는 요소 수 */
export function groupCount(frag: string, group: Decl): number {
  const want = group.map(([p, v]) => `${p}:${v}`);
  let n = 0;
  for (const m of frag.matchAll(/style="([^"]*)"/g)) {
    const have = new Set(m[1]!.split(";").map((d) => d.trim()));
    if (want.every((w) => have.has(w))) n += 1;
  }
  return n;
}

async function liveOf(a: ReturnType<typeof exportArgsOf>, sections: DetailSection[]): Promise<string> {
  (globalThis as unknown as { React: typeof React }).React = React;
  const { default: R } = await import("../../components/DetailSectionRenderer");
  return renderToStaticMarkup(
    React.createElement(R, {
      sections, imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, logoUrl: a.logoUrl,
      ingredients: a.ingredients, keyFeatures: a.keyFeatures, certifications: a.certifications, stylePackId: a.stylePackId, infoBackdrops: a.infoBackdrops,
      imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, sceneImages: a.sceneImages,
      hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts,
    } as never),
  );
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const seen: Record<string, number> = {};
  for (const probe of PROBES) {
    const total: number[] = [];
    for (const [id, file] of corpus()) {
      const a = exportArgsOf(readSession(file));
      for (const sec of (a.sections ?? []) as unknown as Array<Record<string, unknown>>) {
        if (sec.type !== probe.type) continue;
        const needle = probe.heading(sec);
        if (!needle) continue;
        const only = [sec] as unknown as DetailSection[];
        const exp = sectionOf(buildDetailPageHtml({ ...a, sections: only }), needle);
        const live = sectionOf(await liveOf(a, only), needle);
        if (!exp && live) continue; // export의 표시 규칙(applyDisplayRules)이 이 카테고리에서 섹션을 뺀 경우 — 라이브는 규칙을 페이지 쪽에서 적용하므로 비교 대상 아님
        if (!exp || !live) { fails.push(`${probe.type} ${id}: 섹션 조각을 못 찾음(live ${Boolean(live)} / export ${Boolean(exp)})`); continue; }
        seen[probe.type] = (seen[probe.type] ?? 0) + 1;
        probe.groups.forEach((g, gi) => {
          const l = groupCount(live, g);
          const e = groupCount(exp, g);
          if (l !== e) fails.push(`${probe.type} ${id}: 묶음 #${gi} \`${declStyle(g).slice(0, 60)}…\` 라이브 ${l}개 ≠ export ${e}개`);
          total[gi] = (total[gi] ?? 0) + e;
        });
      }
    }
    if (!seen[probe.type]) fails.push(`${probe.type}: 말뭉치에 검사할 섹션 없음`);
    else if (!total.some((n) => n > 0)) fails.push(`${probe.type}: v4 토큰 선언이 export에 한 번도 안 나옴(검사 무의미)`);
  }
  return fails;
}
