/**
 * 회귀 — 439차 2-7 디자인 린터: 규칙 단위 검사(작은 글·모티프 안전 영역·히어로 제품명·대비·고아 제목·SEO 블록 제외)와
 * 말뭉치 점수 하한(평균 ≥75, 최저 ≥60 — 3회전 후 최저 69), 모티프·히어로·최소 글자·대비(error) 위반 0. 호출 0.
 */
import { lintCorpus, lintPage } from "../design-lint";
import type { DetailSection } from "../../lib/types/generate";

export const name = "디자인 린트 — 규칙 단위·말뭉치 점수 하한(평균 75·최저 60)·모티프/히어로/글자 크기/대비 error 0";

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
