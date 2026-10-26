/**
 * 회귀 — 455차 사진 로드 실패 마감(v4). ① 합성 픽스처를 모든 사진 요청이 실패하는 브라우저에서 export로 열어 보이는 깨진 <img>(대체 글자) 0 · 빈 큰 틀(흰 구멍)·붕괴한 틀 0 · 가로 넘침 0,
 * ② 정상 로드(사진 있음)에서는 틀 표시 속성(data-pz-np)이 붙지 않고 사진 개수·보이는 사진이 같다, ③ 문서에 한 줄 스크립트·틀 CSS가 있고 export 금지 기법이 없다,
 * ④ 라이브 렌더(정적)에도 같은 틀 CSS가 있다. 호출 0 · 서버 0(Playwright는 저장소 파일만 연다).
 */
import { launch, openHtml } from "../eye-lib";
import { MEASURE } from "../broken-photo-eye";
import { NO_PHOTO_ATTR, NO_PHOTO_EXPORT_SCRIPT, noPhotoCss } from "../../lib/photo-fallback";

export const name = "사진 로드 실패 마감(455차) — 대체 글자 0·빈 틀 0·붕괴 0, 정상 로드는 불변, 라이브 쌍둥이";

const IDS = ["fx-skincare-serum", "fx-living-storage", "fx-makeup-tint", "fx-fashion-dress-floral", "fx-tech-keyboard", "fx-tier-sparse-beauty-1p", "fx-compare-fashion"];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };
  const { corpus, exportHtmlOf, exportArgsOf, readSession } = await import("../design-corpus");
  const files = corpus({ only: IDS });
  ok(files.length === IDS.length, `합성 픽스처 ${IDS.length}개 필요(${files.length})`);

  // ③ 정적
  const css = noPhotoCss(".pagzly-wrap", "#1F3A5F");
  ok(css.includes(`[${NO_PHOTO_ATTR}]`) && css.includes("!important") && !/clip-path|mask|mix-blend|:has\(|text-wrap|container/.test(css), "틀 CSS는 속성 선택자·!important, 금지 기법 없음");
  ok(!/clip-path|mask|mix-blend|:has\(|text-wrap|-webkit-text-stroke/.test(NO_PHOTO_EXPORT_SCRIPT), "스크립트에 금지 기법 없음");

  const browser = await launch();
  try {
    for (const [id, file] of files) {
      const html = exportHtmlOf(file);
      ok(html.includes(NO_PHOTO_EXPORT_SCRIPT) && html.includes(`[${NO_PHOTO_ATTR}]{background-image`), `${id}: 문서에 한 줄 스크립트·틀 CSS`);
      ok(new Set(html.match(new RegExp(`\\[${NO_PHOTO_ATTR}\\]\\{`, "g"))).size === 1 && html.split(NO_PHOTO_EXPORT_SCRIPT).length === 2, `${id}: 스크립트·CSS는 한 번씩`);
      for (const W of [390, 750]) {
        // ① 모든 사진 실패
        const bad = await openHtml(browser, html, W, undefined, false, true);
        const m = (await bad.page.evaluate(MEASURE)) as { visibleAlt: string[]; holes: string[]; overflow: number };
        ok(m.visibleAlt.length === 0, `${id} w${W}: 보이는 대체 글자 ${m.visibleAlt.join("|")}`);
        ok(m.holes.length === 0, `${id} w${W}: 빈 틀 ${m.holes.slice(0, 2).join(" / ")}`);
        ok(m.overflow === 0, `${id} w${W}: 가로 넘침 ${m.overflow}px`);
        const marked = (await bad.page.evaluate(`document.querySelectorAll('[${NO_PHOTO_ATTR}]').length`)) as number;
        ok(marked > 0 || id === "fx-tier-sparse-beauty-1p", `${id} w${W}: 실패 상태에서 틀 표시 0개`);
        await bad.close();
        // ② 정상 로드(합성 픽스처의 사진은 저장소 파일)
        const good = await openHtml(browser, html, W);
        const g = (await good.page.evaluate(`({ np: document.querySelectorAll('[${NO_PHOTO_ATTR}]').length, broken: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length })`)) as { np: number; broken: number };
        ok(g.np === 0, `${id} w${W}: 정상 로드인데 틀 표시 ${g.np}개`);
        await good.close();
      }
    }
  } finally {
    await browser.close();
  }

  // ④ 라이브(정적 마크업) — 같은 CSS가 들어간다
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: DetailSectionRenderer } = await import("../../components/DetailSectionRenderer");
  const a = exportArgsOf(readSession(files[0]![1]));
  const live = renderToStaticMarkup(React.createElement(DetailSectionRenderer, { sections: a.sections, imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, stylePackId: a.stylePackId }));
  ok(live.includes(`[data-pz-typefloor] [${NO_PHOTO_ATTR}]{background-image`), "라이브 마크업에 틀 CSS");
  return fails;
}
