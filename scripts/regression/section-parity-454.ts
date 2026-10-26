/**
 * 회귀 — 454차 3 섹션 패리티 정확 판정. ① 합성 픽스처 전부에서 계획·라이브·export 최상위 일치, ② 파서 단위(중첩·래퍼·스크립트 안 태그 무시),
 * ③ 음성: 최상위 섹션 하나를 지운 export를 넣으면 불일치로 잡는다, ④ 이전 근사 판정(전체 <section> 수)이 아니라 직계만 센다. 호출 0·브라우저 0.
 */
import fs from "node:fs";
import { exportSectionCounts, parityOk } from "../section-parity";
import { parityRow } from "../section-parity-table";

export const name = "섹션 패리티 정확 판정 — 합성 픽스처 일치·직계/중첩 분리·섹션 하나 지운 입력은 불일치";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };

  // ② 파서 단위
  const html = `<html><body><div class="pagzly-wrap"><header>h</header><style>.a>section{}</style><script>var s="<section>";</script><section id="a"><div><section>inner</section></div></section><div><p>w</p></div><section data-pz-v4="breather.motif"></section><footer>f</footer></div><section>outside</section></body></html>`;
  const c = exportSectionCounts(html);
  ok(c.top.length === 2, `직계 섹션 2개여야 함: ${c.top.length}`);
  ok(c.nested === 2, `중첩(안쪽·컨테이너 밖) 2개여야 함: ${c.nested}`);
  ok(c.wrappers.header === 1 && c.wrappers.div === 1 && c.wrappers.footer === 1 && c.wrappers.style === 1 && c.wrappers.script === 1, `래퍼 분류: ${JSON.stringify(c.wrappers)}`);
  ok(c.top[0]!.kind === "#a" && c.top[1]!.kind === "v4:breather.motif", `섹션 종류 지문: ${c.top.map((t) => t.kind)}`);
  ok(parityOk(5, 5, 5) && !parityOk(5, 5, 6) && !parityOk(5, 4, 5) && !parityOk(5, 5, 4), "parityOk 기본");
  ok(parityOk(5, 5, 6, 1) && !parityOk(5, 5, 7, 1) && !parityOk(5, 5, 6, 0), "분리로 설명되는 차이만 허용");

  // ① 합성 픽스처 전부
  const fx = fs.readdirSync("scripts/fixtures").filter((f) => f.startsWith("archetype-") && f.endsWith(".json")).sort();
  for (const f of fx) {
    const r = await parityRow(`fx-${f}`, `scripts/fixtures/${f}`);
    ok(r.ok, `${f}: 패리티 불일치 계획 ${r.plan}·라이브 ${r.live}·export 최상위 ${r.top}`);
    ok(r.nested >= 1, `${f}: 내부 중첩 섹션을 못 셈(검색용 평문 블록)`);
  }
  ok(fx.length >= 20, `합성 픽스처 ${fx.length}개`);

  // ③ 음성: 마지막 최상위 섹션(CTA)을 div로 바꿔 섹션 하나가 없어진 export
  const { exportHtmlOf } = await import("../design-corpus");
  const file = "scripts/fixtures/archetype-tier-rich-fashion-6p.json";
  const good = exportHtmlOf(file);
  const start = good.indexOf('<section class="pagzly-cta"');
  ok(start > 0, "CTA 섹션을 못 찾음(음성 테스트 입력)");
  const end = good.indexOf("</section>", start);
  const broken = `${good.slice(0, start)}<div class="pagzly-cta"${good.slice(start + '<section class="pagzly-cta"'.length, end)}</div>${good.slice(end + "</section>".length)}`;
  const base = await parityRow("neg", file, good);
  const neg = await parityRow("neg", file, broken);
  ok(base.ok && !neg.ok && neg.top === base.top - 1, `섹션을 지운 입력을 못 잡음: 정상 ${base.top}/${base.ok} → 변조 ${neg.top}/${neg.ok}`);
  // ④ 이전 근사(전체 <section> 수)는 안쪽 중첩까지 세어 직계 수와 nested만큼 어긋난다(PC 오탐: 계획 29·export 34)
  ok((broken.match(/<section[\s>]/g) ?? []).length >= neg.top + neg.nested && neg.nested > 0, "전체 <section> 수는 직계보다 내부 중첩만큼 많다");
  return fails;
}
