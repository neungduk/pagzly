/**
 * 회귀 — 456차 사진 실패 퍼징. 시드 고정(448) 퍼징 사례 앞 30개를 사진 전부 실패 / 일부 실패(짝수번째 요청만 실패)로 export 렌더해
 * 보이는 대체 글자 0 · 빈 틀·붕괴 0 · 가로 넘침 0을 확인한다(390px). 호출 0 · 서버 0.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { exportArgsOf } from "../design-corpus";
import { launch, openHtml } from "../eye-lib";
import { fuzzCases } from "../fuzz-sessions";
import { MEASURE } from "../broken-photo-eye";

export const name = "사진 실패 퍼징(456차) — 시드 고정 30사례 × 전부·일부 실패, 대체 글자·빈 틀·넘침 0";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const browser = await launch();
  try {
    for (const c of fuzzCases(200).slice(0, 30)) {
      let html = "";
      try { html = buildDetailPageHtml(exportArgsOf(c.session)); } catch (e) { fails.push(`${c.id}: export 예외 ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`); continue; }
      for (const mode of [true, "half"] as const) {
        const ex = await openHtml(browser, html, 390, undefined, false, mode);
        const m = (await ex.page.evaluate(MEASURE)) as { visibleAlt: string[]; holes: string[]; overflow: number };
        await ex.close();
        const tag = `${c.id} ${mode === true ? "전부" : "일부"}`;
        if (m.visibleAlt.length) fails.push(`${tag}: 보이는 대체 글자 ${m.visibleAlt.slice(0, 2).join("|")}`);
        if (m.holes.length) fails.push(`${tag}: 빈 틀 ${m.holes.slice(0, 1).join("")}`);
        if (m.overflow > 0) fails.push(`${tag}: 가로 넘침 ${m.overflow}px`);
      }
    }
  } finally {
    await browser.close();
  }
  return fails;
}
