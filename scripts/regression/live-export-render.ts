/**
 * 회귀 — 라이브(DetailSectionRenderer 서버 렌더)와 export(buildDetailPageHtml)를 같은 고정 입력으로 그려 비교한다.
 * dev 서버·브라우저 없이 돈다. 유료 호출 0.
 *   - 앵커 내비: 히어로가 있으면 히어로 제목 뒤·첫 본문 제목 앞(396차), 히어로가 없으면 첫 섹션 앞. 라이브·export 각 1개
 *   - 핵심 포인트 아이콘 순서가 라이브·export 모두 pickChecklistIcons 결과와 같다
 *     (상품 사진이 있으면 핵심 포인트가 사진 둘레 주석 도식으로 바뀌어 아이콘이 없다 — 그래서 사진 없는 입력으로 따로 그린다)
 *   - 하이라이트 키워드 "LDAC·AAC"가 한 덩어리로 그려진다
 */
import * as React from "react";
import type { DetailSection } from "../../lib/types/generate";

export const name = "라이브↔export 렌더(내비 위치·아이콘 순서·키워드)";

const HERO = "히어로제목회귀";
const CL_HEAD = "핵심포인트회귀";
const CL_ITEMS = ["배터리 이어버드 9시간", "2개 구성", "총장 72cm", "1년 품질 보증"];

function page(withHero: boolean): DetailSection[] {
  const body = [
    { type: "checklist", slot: "checklist", heading: CL_HEAD, items: CL_ITEMS },
    {
      type: "highlight_box",
      slot: "highlight_box",
      heading: "하이라이트회귀",
      cards: [
        { title: "하이브리드 ANC", body: "하이브리드 ANC 42dB" },
        { title: "오픈형 이어훅", body: "장시간 착용" },
        { title: "LDAC·AAC", body: "LDAC·AAC 듀얼 코덱" },
      ],
    },
    { type: "faq", slot: "faq", heading: "자주 묻는 질문", items: [{ question: "충전은 얼마나 걸리나요?", answer: "약 2시간입니다." }] },
    { type: "spec_table", slot: "spec_table", heading: "제품 정보", rows: [{ label: "제조국", value: "대한민국" }] },
  ];
  const hero = { type: "hero", slot: "hero", headline: HERO, subheadline: "부제", imageIndex: 0 };
  return (withHero ? [hero, ...body] : body) as unknown as DetailSection[];
}

async function render(sections: DetailSection[], imageUrls: string[]) {
  (globalThis as unknown as { React: typeof React }).React = React;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: DetailSectionRenderer } = await import("../../components/DetailSectionRenderer");
  const { buildDetailPageHtml } = await import("../../lib/export-detail-html");
  const { getCategoryTheme } = await import("../../lib/category-theme");
  const theme = getCategoryTheme("전자제품");
  const live = renderToStaticMarkup(
    React.createElement(DetailSectionRenderer as never, { sections, imageUrls, category: "전자제품", theme, productName: "회귀상품" } as never),
  );
  const full = buildDetailPageHtml({ productName: "회귀상품", category: "전자제품", sections, imageUrls, theme });
  const exp = full.slice(full.indexOf("<body"));
  return { live, exp };
}

const NAV = 'aria-label="섹션 이동"';
const count = (s: string, sub: string) => s.split(sub).length - 1;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const { pickChecklistIcons, summaryIconSvg } = await import("../../lib/summary-line-icons");
  const iconInner = (id: Parameters<typeof summaryIconSvg>[0]) => {
    const svg = summaryIconSvg(id, "#000", 10);
    return svg.slice(svg.indexOf('aria-hidden="true">') + 'aria-hidden="true">'.length, svg.lastIndexOf("</svg>"));
  };
  const expectedIcons = pickChecklistIcons(CL_ITEMS);

  for (const withHero of [true, false]) {
    const { live, exp } = await render(page(withHero), ["/qa-fixtures/electronics/02.png"]);
    const grid = await render(page(withHero), []);
    for (const [tag, html, gridHtml] of [["라이브", live, grid.live], ["export", exp, grid.exp]] as const) {
      const label = `${tag}${withHero ? "" : "(히어로 없음)"}`;
      const navCount = count(html, NAV);
      if (navCount !== 1) {
        fails.push(`${label}: 앵커 내비 ${navCount}개(기대 1)`);
        continue;
      }
      const nav = html.indexOf(NAV);
      const firstBody = html.indexOf(CL_HEAD);
      if (withHero) {
        const hero = html.indexOf(HERO);
        if (!(hero >= 0 && hero < nav)) fails.push(`${label}: 내비가 히어로보다 먼저 나옴`);
        if (!(firstBody > nav)) fails.push(`${label}: 내비가 첫 본문 제목 뒤에 나옴`);
      } else if (!(nav < firstBody)) {
        fails.push(`${label}: 히어로가 없는데 내비가 맨 앞이 아님`);
      }
      // 핵심 포인트 아이콘 순서(사진 없는 입력)
      let at = gridHtml.indexOf(CL_HEAD);
      for (const id of expectedIcons) {
        const next = gridHtml.indexOf(iconInner(id), at + 1);
        if (next < 0) {
          fails.push(`${label}: 핵심 포인트 아이콘 순서 어긋남 — ${id} 못 찾음(기대 ${expectedIcons.join("·")})`);
          break;
        }
        at = next;
      }
      if (!/>\s*LDAC·AAC\s*</.test(html)) fails.push(`${label}: "LDAC·AAC" 키워드가 한 덩어리로 안 그려짐`);
    }
  }
  if (JSON.stringify(expectedIcons) !== JSON.stringify(["bolt", "check", "ruler", "shield"])) {
    fails.push(`고정 입력 아이콘 기대값이 바뀜: ${expectedIcons.join("·")}`);
  }
  return fails;
}
