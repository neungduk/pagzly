/**
 * 회귀 — 419차 3-4. (1) 사진 파이프라인이 /api/generate-backdrop 응답의 theme을 섹션 배경·합성 요청까지 전달하는지(가짜 fetch, 호출 0)
 * (2) 뷰티 히어로: 정사각 원본이 확대되지 않는 1:1 caption-below, 뷰티 아님·flag off는 기존(bleed-bottom) 그대로.
 */
import { runPhotoEnhancementPipeline } from "../../lib/photo-pipeline-client";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { BEAUTY_HERO, beautyHeroVariant } from "../../lib/hero-variants";
import type { DetailSection } from "../../lib/types/generate";

export const name = "뷰티 히어로(1:1·확대 한도)·theme 전달(generateBackdrop → 섹션 배경·합성)";

const SERVER_THEME = { accent: "#AA1122", baseNeutral: "#F0E0D0", deepAccent: "#220011" };

async function traceTheme(category: string) {
  const seen: { sectionTheme?: unknown; enhanceTheme?: unknown } = {};
  const orig = globalThis.fetch;
  const quiet = console.log;
  console.log = () => undefined;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const j = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s });
    if (url === "/api/generate-backdrop") return j(200, { candidateUrls: ["c0"], cost: 0, backdropCost: 0, conceptBriefCost: 0, shadowAnalysis: { promptHint: "x" }, conceptBrief: { theme: "t" }, theme: SERVER_THEME, backdropSkipped: false });
    if (url === "/api/section-backdrops") { seen.sectionTheme = body.theme; return j(200, { ingredientUrl: "si", textureUrl: "st", cost: 0 }); }
    if (url === "/api/enhance-image") { if (!body.flushCostTalliesOnly && !seen.enhanceTheme) seen.enhanceTheme = body.theme; return j(200, { enhancedUrl: `e${Math.random()}`, enhancedPath: "p", cost: 0 }); }
    return j(404, {});
  }) as typeof fetch;
  try {
    await runPhotoEnhancementPipeline({
      uploaded: [{ url: "u0", path: "p0" }, { url: "u1", path: "p1" }], category, productName: "p", brandName: null, price: 1,
      imageRoles: ["detail", "other"], pickBackdrop: async (u) => u[0]!,
    });
  } finally {
    globalThis.fetch = orig;
    console.log = quiet;
  }
  return seen;
}

const heroSections = (): DetailSection[] =>
  [
    { type: "hero", slot: "hero", headline: "촉촉함 한 겹", subheadline: "30mL", imageIndex: 0, badge: "30mL" },
    { type: "caution", slot: "caution", heading: "주의", body: "본문" },
  ] as unknown as DetailSection[];

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // (1) theme 전달
  for (const category of ["화장품/뷰티", "의류/패션"]) {
    const seen = await traceTheme(category);
    if (JSON.stringify(seen.sectionTheme) !== JSON.stringify(SERVER_THEME)) fails.push(`${category}: 섹션 배경 요청에 서버 theme이 안 실림 ${JSON.stringify(seen.sectionTheme)}`);
    const et = seen.enhanceTheme as { accent?: string } | undefined;
    if (et?.accent !== SERVER_THEME.accent) fails.push(`${category}: 합성 요청이 서버 theme(accent)을 안 씀 ${JSON.stringify(et)}`);
  }

  // (2) 뷰티 히어로 변형 규칙
  if (beautyHeroVariant("bleed-bottom", "화장품/뷰티") !== "caption-below") fails.push("뷰티 classic 히어로가 caption-below가 아님");
  if (beautyHeroVariant("bleed-bottom", "화장품/뷰티", false) !== "bleed-bottom") fails.push("flag off인데 히어로가 바뀜");
  for (const c of ["의류/패션", "전자제품", undefined]) if (beautyHeroVariant("bleed-bottom", c) !== "bleed-bottom") fails.push(`뷰티 아닌 ${String(c)} 히어로가 바뀜`);
  for (const v of ["caption-below", "caption-above", "framed", "split", "full-photo"] as const) if (beautyHeroVariant(v, "화장품/뷰티") !== v) fails.push(`${v}를 덮어씀`);
  // 확대 한도: 1:1 컨테이너에서 cover 확대율 = max(a, 1/a) (a = 원본 가로/세로). 정사각 1.0, 3:4·4:3 원본 ≤ maxZoom
  const [rw, rh] = BEAUTY_HERO.photoRatio.split("/").map((x) => Number(x.trim()));
  if (rw !== 1 || rh !== 1) fails.push("뷰티 히어로 비율이 1:1이 아님");
  const zoom = (a: number) => Math.max(a, 1 / a);
  if (zoom(1) !== 1) fails.push("정사각 원본 확대가 1이 아님");
  if (zoom(3 / 4) > BEAUTY_HERO.maxZoom + 1e-9 || zoom(4 / 3) > BEAUTY_HERO.maxZoom + 1e-9) fails.push("3:4·4:3 원본이 확대 한도를 넘음");

  // export HTML: 뷰티는 1:1 + 가운데 기준, 패션 classic은 변형 표식·1:1 없음
  const mk = (category: string) =>
    buildDetailPageHtml({ productName: "p", brandName: "b", category, sections: heroSections(), imageUrls: ["https://x.test/0.png"], theme: getCategoryTheme(category) });
  const beauty = mk("화장품/뷰티");
  if (!/data-hero-variant="caption-below"/.test(beauty) || !/aspect-ratio:1 \/ 1/.test(beauty) || !/object-position:50% 50%/.test(beauty)) fails.push("뷰티 export 히어로가 1:1·가운데 기준이 아님");
  const fashion = mk("의류/패션");
  if (/data-hero-variant="caption-below"/.test(fashion) || /aspect-ratio:1 \/ 1/.test(fashion)) fails.push("패션 export 히어로가 바뀜");
  return fails;
}
