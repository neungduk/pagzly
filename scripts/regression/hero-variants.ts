/**
 * 회귀 — 409차 히어로 캡션 변형(export). 사진 위 글자·그라데이션이 없고, 사진이 없으면 classic. 유료 호출 0.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import type { DetailSection } from "../../lib/types/generate";

export const name = "히어로 캡션 변형(export): 글자가 사진 밖, 사진 없으면 classic";

const SECTIONS = [{ type: "hero", headline: "가볍게 입는 데일리 티", subheadline: "부드러운 면", badge: "면 100%", imageIndex: 0 }] as unknown as DetailSection[];
const html = (pack: string | null, urls: string[]) =>
  buildDetailPageHtml({ productName: "티", brandName: "모아웨어", category: "의류/패션", sections: SECTIONS, imageUrls: urls, theme: getCategoryTheme("의류/패션"), stylePackId: pack });

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const urls = ["https://example.com/a.jpg"];
  const classic = html("classic", urls);
  if (classic.includes("data-hero-variant")) fails.push("classic에 히어로 변형 표식이 있음");
  if (!classic.includes("linear-gradient(0deg")) fails.push("classic 히어로 그라데이션이 사라짐");
  const mono = html("mono-minimal", urls);
  const edi = html("editorial", urls);
  for (const [n, h, v] of [["mono", mono, "caption-above"], ["editorial", edi, "caption-below"]] as const) {
    if (!h.includes(`data-hero-variant="${v}"`)) fails.push(`${n} 히어로 변형 표식 없음`);
    const hero = h.slice(h.indexOf('class="hero pagzly-hero"'), h.indexOf("</section>", h.indexOf('class="hero pagzly-hero"')));
    if (hero.includes("linear-gradient")) fails.push(`${n} 히어로에 그라데이션이 있음`);
    if (hero.includes("text-shadow")) fails.push(`${n} 히어로 글자에 그림자(사진 위 글자 흔적)`);
    const imgAt = hero.indexOf("<img");
    const hAt = hero.indexOf("<h1");
    if (v === "caption-above" && !(hAt < imgAt)) fails.push("caption-above인데 제목이 사진보다 뒤");
    if (v === "caption-below" && !(imgAt < hAt)) fails.push("caption-below인데 제목이 사진보다 앞");
    for (const t of ["가볍게 입는 데일리 티", "부드러운 면", "면 100%", "모아웨어"]) if (!hero.includes(t)) fails.push(`${n} 히어로에서 문구 "${t}" 사라짐`);
  }
  // 사진이 없으면 classic 방식
  const none = html("editorial", []);
  if (none.includes("data-hero-variant")) fails.push("히어로 사진 없음인데 변형이 켜짐");
  return fails;
}
