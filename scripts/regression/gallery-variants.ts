/**
 * 회귀 — 409차 갤러리 변형(export). 변형이 칸 모양만 바꾸고 사진을 더하거나 빼지 않으며, 사진이 모자라면 classic. 유료 호출 0.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { galleryCell } from "../../lib/gallery-variants";
import type { DetailSection } from "../../lib/types/generate";

export const name = "갤러리 변형(export): 모노=1열 원본 비율, 에디토리얼=첫 장 크게+2열, 사진 부족 시 classic";

const gallery = (n: number) =>
  ({ type: "gallery", slot: "model_multicut", heading: "서로 다른 체형", imageIndexes: Array.from({ length: n }, (_, i) => i) }) as unknown as DetailSection;
const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://example.com/${i}.jpg`);
const html = (pack: string | null, n: number, category = "의류/패션") =>
  buildDetailPageHtml({ productName: "티", brandName: "b", category, sections: [gallery(n)], imageUrls: urls(n), theme: getCategoryTheme(category), stylePackId: pack });
const imgs = (h: string) => (h.match(/<img /g) ?? []).length;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const classic = html("classic", 5);
  if (classic.includes('data-gallery-variant="')) fails.push("classic에 갤러리 변형 표식");
  const mono = html("mono-minimal", 5);
  const edi = html("editorial", 5);
  if (!mono.includes('data-gallery-variant="lookbook-stack"') || !mono.includes("grid-template-columns:repeat(1,1fr)")) fails.push("mono 1열 스택 아님");
  if (!mono.includes("height:auto")) fails.push("mono 사진이 원본 비율(height:auto)이 아님");
  if (!edi.includes('data-gallery-variant="lead-plus-two"') || !edi.includes("grid-column:1/-1")) fails.push("editorial 첫 장 전폭 아님");
  if (!edi.includes("aspect-ratio:2 / 3")) fails.push("editorial 나머지 칸 2:3 아님");
  for (const [n, h] of [["classic", classic], ["mono", mono], ["editorial", edi]] as const) if (imgs(h) !== 5) fails.push(`${n}: 사진 수가 5가 아님(${imgs(h)})`);
  // 폴백: lead-plus-two는 3장 미만 → classic, 1장 → classic
  if (html("editorial", 2).includes('data-gallery-variant="')) fails.push("editorial 2장인데 변형이 켜짐");
  if (html("mono-minimal", 1).includes('data-gallery-variant="')) fails.push("mono 1장인데 변형이 켜짐");
  // 412차 — 장수 3~8 어디서도 2열 격자에 빈 칸이 없어야 한다: 전폭이 아닌 칸 수가 짝수
  for (let n = 3; n <= 8; n++) {
    const cells = Array.from({ length: n }, (_, pos) => galleryCell("lead-plus-two", pos, n));
    const half = cells.filter((c) => !c.span).length;
    if (half % 2 !== 0) fails.push(`editorial ${n}장: 2열 칸이 홀수(${half}) — 마지막 행에 빈 칸`);
  }
  // count를 안 주면 이전 동작 그대로
  if (galleryCell("lead-plus-two", 3).span) fails.push("count 없이 호출해도 마지막 장이 전폭이 됨");
  // 패션 외는 그대로
  if (html("editorial", 5, "화장품/뷰티") !== html(null, 5, "화장품/뷰티")) fails.push("패션 외 갤러리가 팩 때문에 바뀜");
  return fails;
}
