/**
 * 회귀 — 410차 마감: 모서리 0 규칙(라이브·export 선택자), 앵커 밑줄 탭(export 구조), 표 라벨 규칙, classic 불변. 유료 호출 0.
 * 실제 computed radius 전수 목록은 scripts/_410cha-radius.ts(브라우저)로 확인한다 — review/410-audit/radius-census-*.tsv.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { packStructureCss } from "../../lib/pack-css";
import { getPackLayout, resolveStylePack } from "../../lib/style-packs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "마감: 모서리 0 규칙·앵커 탭·표 라벨(classic 불변)";

const SECTIONS = [
  { type: "hero", headline: "가볍게 입는 데일리 티", subheadline: "부드러운 면", imageIndex: 0 },
  { type: "checklist", slot: "checklist", heading: "기본 티, 아쉬웠던 세 가지", items: ["a 항목입니다", "b 항목입니다", "c 항목입니다"] },
  { type: "caution", slot: "care_info", heading: "세탁과 보관", body: "찬물 단독 손세탁. 표백제 사용 금지." },
  { type: "faq", slot: "faq", heading: "자주 묻는 질문", items: [{ question: "q?", answer: "a" }] },
] as unknown as DetailSection[];
const html = (pack: string | null) =>
  buildDetailPageHtml({ productName: "티", brandName: "모아웨어", category: "의류/패션", sections: SECTIONS, imageUrls: ["https://example.com/a.jpg"], theme: getCategoryTheme("의류/패션"), stylePackId: pack });
const nav = (h: string) => /<nav class="pagzly-anchor-nav"[\s\S]*?<\/nav>/.exec(h)?.[0] ?? "";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const id of ["mono-minimal", "editorial"]) {
    const layout = getPackLayout(resolveStylePack("의류/패션", id));
    const ex = packStructureCss(layout, ".pagzly-wrap", "export");
    const lv = packStructureCss(layout, "[data-pz-pack]", "live");
    if (!ex.includes('[style*="border-radius"]:not([style*="border-radius:9999px"])')) fails.push(`${id}: export 모서리 규칙이 8·12·16px 상자를 못 잡음`);
    if (!ex.includes('[style*="border-radius:999px"][style*="padding"]')) fails.push(`${id}: export 알약(padding) 규칙 없음`);
    if (!lv.includes(".inline-block.rounded-full") || lv.includes(":not(img)")) fails.push(`${id}: 라이브 규칙이 배지/사진을 못 잡음`);
    if (!ex.includes("tr>th:first-child{font-weight:600!important") || !lv.includes("tr>td:first-child{font-weight:600!important")) fails.push(`${id}: 표 라벨 규칙 없음`);
    if (id === "mono-minimal" && (!ex.includes("counter-reset:pz-n") || !ex.includes("decimal-leading-zero"))) fails.push("mono 소제목 순번 라벨(CSS counter) 규칙 없음");
    if (id === "editorial" && ex.includes("counter-reset")) fails.push("editorial에 순번 라벨이 있음");
    if (id === "mono-minimal" && !ex.includes("line-height:1.7!important")) fails.push("mono 본문 줄 높이 1.7 규칙 없음");
    if (id === "editorial" && !ex.includes("line-height:1.8!important")) fails.push("editorial 본문 줄 높이 1.8 규칙 없음");
    if (!ex.includes("[data-gallery-variant] img{max-height:1125px")) fails.push(`${id}: 긴 컷 상한(넓은 칸) 규칙 없음`);
    const h = html(id);
    const n = nav(h);
    if (!n) fails.push(`${id}: export에 앵커 내비 없음`);
    else if (n.includes("border-radius:999px") || /<a [^>]*background:/.test(n)) fails.push(`${id}: 앵커가 알약 모양(밑줄 탭이어야 함)`);
    else if (!n.includes("border-right:1px solid")) fails.push(`${id}: 앵커 탭 구분선 없음`);
  }
  const c = html("classic");
  if (!nav(c).includes("border-radius:999px")) fails.push("classic 앵커 알약이 바뀜");
  if (packStructureCss(getPackLayout(resolveStylePack("의류/패션", "classic")), ".pagzly-wrap", "export") !== "") fails.push("classic 구조 CSS가 비어 있지 않음");
  return fails;
}
