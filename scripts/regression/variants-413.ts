/**
 * 회귀 — 413차 새 변형. ① mosaic 칸 배치에 빈 칸 0(장수 3~12, 10열 자동 배치 시뮬레이션) ② 사진이 모자라면 폴백
 * ③ framed·split 히어로 export: 글자가 사진 밖·split 미디어쿼리·사진 없으면 classic ④ photo-lead: 집합 불변·한 블록만 이동·고민→해결 짝 유지·확인 영역 불변
 * ⑤ 새 변형은 export에 새 CSS 기능(:has, @container, text-wrap)을 쓰지 않음. 유료 호출 0.
 */
import fs from "node:fs";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { applyDisplayRules } from "../../lib/display-sections";
import { galleryCell, galleryColumns } from "../../lib/gallery-variants";
import { encodeSpec, resolveGalleryVariant, resolveHeroVariant, specOfPack, resolveStylePack, getPackLayout, type SpecAxes } from "../../lib/style-packs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "새 변형(framed·split·mosaic·photo-lead) — 빈 칸 0·폴백·집합 불변·새 CSS 기능 없음";

const ED = specOfPack(resolveStylePack("의류/패션", "editorial"));
const code = (o: Partial<SpecAxes>) => encodeSpec({ ...ED, ...o });

/** CSS grid 자동 배치(행 우선, dense 아님) 시뮬레이션 — 비는 칸 수 */
function holes(n: number): number {
  const cols = galleryColumns("mosaic");
  const occ: boolean[][] = [];
  const row = (r: number) => (occ[r] ??= Array<boolean>(cols).fill(false));
  let cr = 0;
  let cc = 0;
  for (let pos = 0; pos < n; pos++) {
    const cell = galleryCell("mosaic", pos, n);
    const w = cell.span ? cols : (cell.colSpan ?? cols / 2);
    const h = cell.rowSpan ?? 1;
    let placed = false;
    while (!placed) {
      if (cc + w > cols) {
        cr++;
        cc = 0;
      }
      let free = true;
      for (let r = 0; r < h && free; r++) for (let c = 0; c < w; c++) if (row(cr + r)[cc + c]) free = false;
      if (free) placed = true;
      else cc++;
    }
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) row(cr + r)[cc + c] = true;
    cc += w;
  }
  let empty = 0;
  for (const r of occ) if (r) for (const v of r) if (!v) empty++;
  return empty;
}

const html = (sections: DetailSection[], urls: string[], id: string | null) =>
  buildDetailPageHtml({ productName: "티", brandName: "b", category: "의류/패션", sections, imageUrls: urls, theme: getCategoryTheme("의류/패션"), stylePackId: id });
const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://example.com/${i}.jpg`);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (let n = 3; n <= 12; n++) if (holes(n) !== 0) fails.push(`mosaic ${n}장: 빈 칸 ${holes(n)}`);
  const mosaicLayout = getPackLayout(resolveStylePack("의류/패션", code({ gallery: "mosaic" })));
  if (resolveGalleryVariant(mosaicLayout, 2) !== "duo-grid" || resolveGalleryVariant(mosaicLayout, 1) !== "duo-grid") fails.push("mosaic 3장 미만이 duo-grid 폴백이 아님");
  if (resolveGalleryVariant(mosaicLayout, 3) !== "mosaic") fails.push("mosaic 3장이 변형이 아님");
  const gal = (n: number) => ({ type: "gallery", slot: "model_multicut", heading: "g", imageIndexes: Array.from({ length: n }, (_, i) => i) }) as unknown as DetailSection;
  const m5 = html([gal(5)], urls(5), code({ gallery: "mosaic" }));
  if (!m5.includes('data-gallery-variant="mosaic"') || !m5.includes("grid-template-columns:repeat(10,1fr)") || !m5.includes("grid-row:span 2")) fails.push("mosaic export 구조 표식 없음");
  if ((m5.match(/<img /g) ?? []).length !== 5) fails.push("mosaic 사진 수가 5가 아님");
  if (html([gal(2)], urls(2), code({ gallery: "mosaic" })).includes('data-gallery-variant="mosaic"')) fails.push("mosaic 2장인데 변형이 켜짐");

  // 히어로
  const hero = () => ({ type: "hero", headline: "큰 제목", subheadline: "부제", imageIndex: 0 }) as unknown as DetailSection;
  for (const v of ["framed", "split", "full-photo"] as const) {
    const h = html([hero()], urls(1), code({ hero: v }));
    if (!h.includes(`data-hero-variant="${v}"`)) fails.push(`${v}: 히어로 표식 없음`);
    if (/text-shadow/.test(h.split("</section>")[0] ?? "")) fails.push(`${v}: 사진 위 글자 그림자가 남음`);
    if (v === "framed" && !h.includes("data-hero-frame")) fails.push("framed 액자 래퍼 없음");
    if (v === "split" && !h.includes('[data-hero-variant="split"]{display:flex}')) fails.push("split 넓은 폭 CSS 없음");
    if (v === "split" && !h.includes("--pz-fs:max(var(--pz-t-subtitle),1.75rem)!important")) fails.push("split 넓은 폭 제목 크기(부제 크기) 규칙 없음");
    if (v === "split" && html([hero()], urls(1), code({ hero: "caption-below" })).includes('[data-hero-variant="split"]')) fails.push("split CSS가 다른 히어로에도 들어감");
    if (v === "full-photo" && !h.includes("--pz-fs:var(--pz-t-subtitle)!important")) fails.push("full-photo 캡션 제목 크기(부제 크기) 규칙 없음");
    if (v === "full-photo" && !h.includes("aspect-ratio:3 / 4")) fails.push("full-photo 사진 비율(3:4) 없음");
    if (v !== "full-photo" && h.includes('data-hero-variant="full-photo"]')) fails.push("full-photo CSS가 다른 히어로에도 들어감");
    if (resolveHeroVariant(getPackLayout(resolveStylePack("의류/패션", code({ hero: v }))), false) !== "bleed-bottom") fails.push(`${v}: 사진 없음 폴백`);
  }
  // 새 변형이 export에 새 CSS 기능을 들이지 않음(기준: 같은 조건의 에디토리얼 프리셋 export)
  const all = html([hero(), gal(5)], urls(5), code({ hero: "split", gallery: "mosaic", flow: "photo-lead" }));
  const base = html([hero(), gal(5)], urls(5), "editorial");
  for (const bad of [":has(", "@container", "text-wrap"]) if (all.includes(bad) && !base.includes(bad)) fails.push(`새 변형이 export에 ${bad} 를 들임`);

  // photo-lead
  for (const file of ["review/404-live/fashion/session.json", "review/411-live/fashion/session.json", "review/402-live/fashion/session.json"]) {
    if (!fs.existsSync(file)) continue;
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    const g = s.generated ?? s;
    const roles = s.imageRoles ?? g.imageRoles;
    const u = (g.imageUrls ?? s.imageUrls) as string[];
    const opts = { imageHashByUrl: g.imageHashByUrl, roles, origins: g.imageOrigins ?? s.imageOrigins, category: "의류/패션" };
    const base0 = applyDisplayRules(g.sections, u, opts).sections;
    const pl = applyDisplayRules(g.sections, u, { ...opts, flow: "photo-lead" }).sections;
    const key = (x: DetailSection) => JSON.stringify(x);
    if (JSON.stringify(base0.map(key).sort()) !== JSON.stringify(pl.map(key).sort())) fails.push(`${file}: photo-lead가 섹션 집합·문구를 바꿈`);
    // 한 블록만 옮겨졌는지: 처음 달라진 자리의 섹션을 빼면 상대 순서가 같다
    const diffIdx = pl.findIndex((x, i) => key(x) !== key(base0[i]!));
    if (diffIdx >= 0) {
      const mv = pl[diffIdx]!;
      const without = (arr: DetailSection[]) => arr.filter((y) => key(y) !== key(mv)).map(key);
      if (JSON.stringify(without(pl)) !== JSON.stringify(without(base0))) fails.push(`${file}: 둘 이상이 옮겨짐`);
    }
    const slotOf = (x: DetailSection) => String((x as { slot?: string }).slot ?? x.type);
    const MUST = ["size_table", "fabric_composition", "care_info", "faq", "shipping_info", "cta_price"];
    const must = (arr: DetailSection[]) => arr.map(slotOf).filter((x) => MUST.includes(x)).join();
    if (must(base0) !== must(pl)) fails.push(`${file}: 확인 영역 순서가 바뀜`);
    const types = pl.map((x) => x.type);
    const p = types.indexOf("target_persona");
    const c = types.indexOf("checklist");
    if (p >= 0 && c >= 0 && !(c > p && types.slice(p + 1, c).every((t) => ["brand_story", "checklist", "image_text"].includes(t)))) fails.push(`${file}: 고민→해결 짝 사이에 다른 섹션이 끼어듦`);
    if (JSON.stringify(applyDisplayRules(g.sections, u, opts).sections.map(key)) !== JSON.stringify(base0.map(key))) fails.push("기본 순서가 흔들림");
  }
  // 패션 외는 그대로
  const dummy = [{ type: "hero", headline: "h" }, gal(2)] as unknown as DetailSection[];
  if (JSON.stringify(applyDisplayRules(dummy, ["a", "b"], { category: "화장품/뷰티", flow: "photo-lead" }).sections) !== JSON.stringify(applyDisplayRules(dummy, ["a", "b"], { category: "화장품/뷰티" }).sections)) fails.push("패션 외가 photo-lead로 바뀜");
  return fails;
}
