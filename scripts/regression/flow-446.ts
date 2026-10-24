/**
 * 회귀 — 446차 4 후킹 흐름·밀도: ① "한눈에 보기" 칩 폴백(키워드 근거 없는 칩은 번호 배지, 근거 있는 칩·번호 없음(index 미지정)은 기존 아이콘, 말뭉치에서 체크 아이콘 ≤1),
 * ② 긴 평문(SEO 요약) 서식: 180자 초과만 문장 끝에서 줄바꿈(글자 불변)·CSS 서식(v4), ③ 넓은 폭 세로 여백 3단 스냅(모든 카테고리 py ≤16·pt ≤12·pb ≤16 클래스, --pz-pad-* 넓은 값 ≤64). 호출 0·서버 0.
 */
import { glanceIconSvg } from "../../lib/icons";
import { breakSentences, SEO_LONG_TEXT_CHARS } from "../../lib/detail-seo-text";
import { getCategoryRhythm } from "../../lib/design-tokens";
import { getRhythmTokens } from "../../lib/rhythm-tokens";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "후킹 흐름·밀도 — 요약 칩 번호 폴백·긴 평문 서식·넓은 폭 여백 3단";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // ① 아이콘 폴백
  const none = glanceIconSvg("그냥 평범한 문구", "#225544", "#2F9E8F", 2);
  if (!/data-pz-icon="num"/.test(none) || !/>3<\/text>/.test(none)) fails.push(`근거 없는 칩이 번호 배지(3)가 아님: ${none.slice(0, 160)}`);
  if (/data-pz-icon="num"/.test(glanceIconSvg("그냥 평범한 문구", "#225544", "#2F9E8F"))) fails.push("index 없이 번호 배지가 나옴");
  if (/data-pz-icon="num"/.test(glanceIconSvg("30mL 미니", "#225544", "#2F9E8F", 0))) fails.push("근거(용량) 있는 칩이 번호 배지로 바뀜");
  let withStrip = 0;
  for (const [id, file] of corpus()) {
    const html = exportHtmlOf(file);
    const i = html.indexOf("한눈에 보기</p>");
    if (i < 0) continue;
    withStrip += 1;
    const seg = html.slice(i, i + 6000);
    const checks = (seg.match(/data-pz-icon="check"/g) ?? []).length;
    if (checks > 1) fails.push(`${id}: 한눈에 보기 체크 아이콘 ${checks}개(≤1 기대)`);
  }
  if (withStrip < 10) fails.push(`한눈에 보기가 있는 말뭉치 ${withStrip}개뿐`);

  // ② 긴 평문
  const short = "짧은 문장입니다. 두 번째 문장입니다.";
  if (breakSentences(short).includes("<br>")) fails.push("180자 이하에 줄바꿈이 들어감");
  const long = Array.from({ length: 12 }, (_, k) => `이것은 길게 이어지는 설명 문장 번호 ${k + 1} 입니다.`).join(" ");
  if ([...long].length <= SEO_LONG_TEXT_CHARS) fails.push("테스트 입력이 180자 이하");
  const broken = breakSentences(long);
  if ((broken.match(/<br>/g) ?? []).length !== 11) fails.push(`문장 줄바꿈 ${(broken.match(/<br>/g) ?? []).length}개(11 기대)`);
  if (broken.replace(/<br>/g, " ") !== long) fails.push("줄바꿈 외에 글자가 바뀜");
  const any = corpus().map(([, f]) => exportHtmlOf(f)).find((h) => h.includes("pagzly-seo-text"));
  if (!any || !any.includes(".pagzly-seo-text h2{margin:32px 0 12px;font-size:12px")) fails.push("v4 평문 블록 CSS가 없음");

  // ③ 넓은 폭 여백
  for (const cat of ["화장품/뷰티", "의류/패션", "전자제품", "식품/건강기능식품", "생활용품", "반려동물"]) {
    const r = getCategoryRhythm(cat);
    for (const [label, cls] of [["generous", r.generousPadClass], ["trust", r.trustPadClass], ["cta", r.ctaPadClass], ["point", r.pointTextPadClass], ["gallery", r.galleryTitlePadClass]] as const) {
      for (const m of cls.matchAll(/@min-\[640px\]\/pz:(py|pt|pb)-(\d+)/g)) {
        const px = Number(m[2]) * 4;
        if (![0, 32, 48, 64].includes(px) && !(label === "gallery" && m[1] === "pb" && px === 32)) fails.push(`${cat}/${label}: 넓은 폭 ${m[1]}-${m[2]}(${px}px)가 3단 밖`);
      }
    }
    const w = getRhythmTokens(cat, true);
    for (const [k, v] of Object.entries({ padY: w.padY, padTy: w.padTy, padCy: w.padCy })) if (v > 64) fails.push(`${cat}: 넓은 폭 ${k}=${v} > 64`);
  }
  return fails;
}
