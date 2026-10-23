/**
 * 회귀 — 439차 2-7 디자인 린터: 규칙 단위 검사(작은 글·모티프 안전 영역·히어로 제품명·대비·고아 제목·SEO 블록 제외)와
 * 말뭉치 점수 하한(평균 ≥75, 최저 ≥60 — 3회전 후 최저 69), 모티프·히어로·최소 글자·대비(error) 위반 0. 호출 0.
 */
import { lintCorpus, lintPage } from "../design-lint";
import type { DetailSection } from "../../lib/types/generate";

export const name = "디자인 린트 — 규칙 단위(R13~R15·DOM R5 포함)·말뭉치 점수 하한(평균 75·최저 60)·모티프/히어로/글자 크기/대비/아이콘 error 0";

const hero = [{ type: "hero", slot: "hero", headline: "h", imageIndex: 0 }] as unknown as DetailSection[];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rules = (html: string, d: DetailSection[] = hero) => lintPage("t", html, d).issues.map((i) => `${i.rule}:${i.sev}`);
  const ok = `<h1 data-hero-name="40" style="font-size:40px">제품</h1>`;
  if (!rules(`${ok}<p style="font-size:10px">작은 글자</p>`).includes("R6:error")) fails.push("10px 글이 R6 error가 아님");
  if (rules(`${ok}<div class="pagzly-seo-text"><p style="font-size:10px">${"가".repeat(200)}</p></div>`).some((r) => r.startsWith("R6") || r.startsWith("R4"))) fails.push("SEO 요약 블록을 검사함");
  if (!rules(`<p>본문</p>`).includes("R10:error")) fails.push("히어로 제품명 없음이 R10이 아님");
  if (!rules(`${ok}<span data-pz-motif="blob" data-mz="top:-30:60"></span>`).includes("R9:error")) fails.push("안전 영역 밖 모티프가 R9가 아님");
  if (!rules(`${ok}<section style="background:#FFFFFF"><p style="font-size:15px;color:#BBBBBB">흐린 본문 글자입니다</p></section>`).includes("R7:error")) fails.push("대비 미달 본문이 R7이 아님");
  if (rules(`${ok}<section style="background:#FFFFFF"><p style="font-size:15px;color:#333333">진한 본문 글자입니다</p></section>`).includes("R7:error")) fails.push("충분한 대비를 R7로 잡음");
  if (!rules(`${ok}<p style="margin:0;font-size:24px;font-weight:800">하루 종일 촉촉한 미스 트</p>`).includes("R8:warn")) fails.push("고아 제목이 R8이 아님");
  // 440차 6 — 새 규칙 단위: 아이콘 대비(R13)·변형 다양성(R14)·히어로 직후 구매·혜택(R15)·DOM 값 우선(R5)
  if (!rules(`${ok}<section style="background:#FFFFFF"><svg data-pz-icon="check" stroke="#DDDDDD"></svg></section>`).includes("R13:error")) fails.push("흐린 아이콘이 R13이 아님");
  if (rules(`${ok}<section style="background:#FFFFFF"><svg data-pz-icon="check" stroke="#333333"></svg></section>`).includes("R13:error")) fails.push("충분한 아이콘 대비를 R13으로 잡음");
  const v4 = (v: string) => ({ type: "impact", slot: "impact", kind: "v4", text: "", v4: { family: "spec", variant: v, no: 0 } });
  const same = [...hero, v4("grid"), { type: "faq" }, v4("grid"), { type: "faq" }, v4("grid"), { type: "faq" }, v4("line")] as unknown as DetailSection[];
  if (!rules(`<section>${ok}</section><div data-pz-strip></div>`, same).includes("R14:warn")) fails.push("같은 변형 반복이 R14가 아님");
  if (!rules(`<section>${ok}</section><section><p>본문</p></section>`).includes("R15:warn")) fails.push("히어로 직후 가격·요약 없음이 R15가 아님");
  if (rules(`<section>${ok}</section><div data-pz-strip></div>`).includes("R15:warn")) fails.push("가격 띠가 있는데 R15");
  if (!lintPage("t", `<section>${ok}</section><div data-pz-strip></div>`, hero, { screens: 2, bigPerScreen: 1.7, flips: 2 }).issues.some((i) => i.rule === "R5")) fails.push("DOM 큰 글줄 1.7이 R5가 아님");
  // 441차 1-3 — R9 고스트 글자 확장
  if (!rules(`${ok}<section data-pz-impact="v4" data-pz-v4="phototext.overlap" style=""><span data-pz-ghost>02</span></section>`).includes("R9:error")) fails.push("사진 블록 고스트가 R9가 아님");
  if (rules(`${ok}<section data-pz-impact="v4" data-pz-v4="benefits.zigzag" style=""><span data-pz-ghost>02</span></section>`).includes("R9:error")) fails.push("허용 블록 고스트를 R9로 잡음");
  // 441차 1-1 — R16 제목 위계(DOM 값)
  const dom = (o: object) => ({ screens: 2, bigPerScreen: 1, flips: 2, ...o });
  if (!lintPage("t", `<section>${ok}</section><div data-pz-strip></div>`, hero, dom({ headingThin: 1 })).issues.some((i) => i.rule === "R16" && i.sev === "error")) fails.push("얇은 제목이 R16 error가 아님");
  if (!lintPage("t", `<section>${ok}</section><div data-pz-strip></div>`, hero, dom({ headingKinds: 4 })).issues.some((i) => i.rule === "R16")) fails.push("제목 스타일 4종이 R16이 아님");
  if (lintPage("t", `<section>${ok}</section><div data-pz-strip></div>`, hero, dom({ headingKinds: 3, headingThin: 0 })).issues.some((i) => i.rule === "R16")) fails.push("제목 스타일 3종을 R16으로 잡음");
  const results = await lintCorpus();
  if (results.length) {
    const avg = results.reduce((a, r) => a + r.score, 0) / results.length;
    const min = Math.min(...results.map((r) => r.score));
    if (avg < 75) fails.push(`말뭉치 평균 점수 ${avg.toFixed(1)} < 75`);
    if (min < 60) fails.push(`말뭉치 최저 점수 ${min} < 60`);
    for (const r of results) for (const i of r.issues) if (i.sev === "error") fails.push(`${r.id}: ${i.rule} ${i.msg}`);
  }
  return fails;
}
