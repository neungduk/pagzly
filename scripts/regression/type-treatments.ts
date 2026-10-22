/**
 * 회귀 — 439차 2-3 타이포 연출: 키워드 강조는 입력 어절만(일치 없으면 강조 없음)·문구 불변, 고스트 글자는 장식 표식,
 * v4 블록 글자 크기 하한(본문 14px·라벨 12px, 장식 제외), 카드 제목 고아 묶기·태그 섞인 글 불변, keep-all 일관. 호출 0.
 */
import { MIN_BODY_PX, MIN_LABEL_PX, ghostHtml, highlightKeyword, keywordCandidates, polishCardTitles, titleBlock } from "../../lib/type-treatments";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "타이포 연출(v4) — 입력 키워드만 강조·문구 불변·고스트 장식·글자 크기 하한·카드 제목 고아";

const strip = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const kws = keywordCandidates({ keyFeatures: "동백 추출물, #휴대, 30mL, (괄호) 제외", productName: "동백 수분 미스트", numbers: ["30"] });
  eq("후보: 입력 키워드·제품명 어절·수치(괄호 제외)", kws.includes("동백 추출물") && kws.includes("휴대") && kws.includes("미스트") && !kws.some((k) => k.includes("괄호")), true);
  const hit = highlightKeyword("동백 추출물로 하루 종일 촉촉", kws, "marker", "#CC3366");
  eq("강조 후 문구 불변", strip(hit.html), "동백 추출물로 하루 종일 촉촉");
  eq("가장 긴 일치 어절 강조", hit.hit, "동백 추출물");
  if (!/font-weight:900/.test(hit.html) || !/linear-gradient\(transparent 60%/.test(hit.html)) fails.push("강조 스타일(굵기 900·하단 40% 하이라이터) 없음");
  const miss = highlightKeyword("가볍게 마무리되는 사용감", kws, "marker", "#CC3366");
  eq("일치 없으면 강조 없음", [miss.hit, /data-pz-kw/.test(miss.html)], [null, false]);
  eq("특수문자 이스케이프", highlightKeyword("<b>휴대</b>", kws, "color", "#000000").html.includes("&lt;b&gt;"), true);
  const g = ghostHtml("01", "#EEEEEE", 88);
  if (!/aria-hidden="true"/.test(g) || !/data-pz-ghost/.test(g) || /text-stroke/.test(g)) fails.push("고스트 글자: 장식 표식·채움 폴백(외곽선 없음) 위반");
  for (const preset of ["enlabel", "number", "pill"] as const) {
    const tb = titleBlock(preset, "POINT", 3, "제목", { ink: "#111111", deep: "#333333", pillBg: "#333333", pillFg: "#FFFFFF" });
    if (!/data-pz-eyebrow/.test(tb) || !tb.includes("POINT")) fails.push(`${preset}: 아이브로우 없음`);
  }
  const card = `<p style="margin:0;font-size:16px;font-weight:700;line-height:1.4">하루 종일 가볍게 쓰는 미스 트</p>`;
  if (!polishCardTitles(card).includes("nowrap")) fails.push("카드 제목 고아 묶기 안 됨");
  eq("카드 제목 문구 불변", strip(polishCardTitles(card)), strip(card));
  const body = `<p style="margin:0;font-size:15px;font-weight:400">본문은 그대로 둡니 다</p>`;
  eq("본문은 그대로", polishCardTitles(body), body);
  // 말뭉치: v4 블록 글자 크기 하한·keep-all
  for (const [id, file] of corpus()) {
    const html = exportHtmlOf(file);
    for (const m of html.matchAll(/<section[^>]*data-pz-impact="v4"[\s\S]*?<\/section>/g)) {
      const sec = m[0].replace(/<span aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, "");
      for (const f of sec.matchAll(/<(p|span)\b([^>]*)style="([^"]*?)font-size:(\d+(?:\.\d+)?)px([^"]*)"[^>]*>([^<]*)/g)) {
        const size = Number(f[4]);
        const text = f[6]!.trim();
        if (!text || /aria-hidden|data-pz-deco/.test(f[2]! + f[3]!)) continue;
        const isLabel = /letter-spacing:0\.(0[4-9]|1)/.test(f[3]! + f[5]!) || /^\d{2}$/.test(text);
        if (size < (isLabel ? MIN_LABEL_PX : MIN_BODY_PX) && !(size >= MIN_LABEL_PX && text.length <= 12)) fails.push(`${id}: 글자 ${size}px «${text.slice(0, 16)}»`);
      }
      for (const p of m[0].matchAll(/<p\b[^>]*style="([^"]*)"[^>]*>[^<]{6,}/g)) if (!/word-break:keep-all/.test(p[1]!)) { fails.push(`${id}: keep-all 없는 문단`); break; }
    }
  }
  return fails;
}
