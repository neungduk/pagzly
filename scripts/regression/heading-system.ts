/**
 * 회귀 — 441차 1-1 제목 시스템(DESIGN_V4): 제목 CSS가 섹션 제목 26px·800을 서체 짝 규칙보다 높은 구체도로 지정,
 * 임팩트 카드 제목 굵기 3단(중 20~22 → 800, 소 18~19 → 700, 그 밖 불변), v4 title 26px, export에 제목 CSS 포함. 호출 0.
 */
import { HEADING_SECTION_PX, TYPE_SCALE_V4, headingSystemCss, tierHeadingWeights } from "../../lib/type-treatments";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "제목 시스템 — 섹션 26px·800·구체도·카드 굵기 3단·v4 title 26·export 포함";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const css = headingSystemCss(".pagzly-wrap[data-pz-typefloor]", "export");
  if (!css.includes(`@media (max-width:639px){.pagzly-wrap[data-pz-typefloor]{--pz-t-section:${HEADING_SECTION_PX / 16}rem!important}}`)) fails.push("export 좁은 폭 제목 크기 변수 없음");
  if (!headingSystemCss("[data-pz-typefloor]", "live").includes(`[data-pz-typefloor]{--pz-t-section-b:${HEADING_SECTION_PX / 16}rem!important}`)) fails.push("라이브 좁은 폭 제목 변수(-b) 없음");
  if (/--pz-t-section-w|min-width/.test(css + headingSystemCss("[x]", "live"))) fails.push("넓은 폭 제목 크기까지 덮음");
  if (!/\.pagzly-wrap\[data-pz-typefloor\] section \.pagzly-display-headline\{font-weight:800!important\}/.test(css)) fails.push("제목 굵기 규칙(섹션 구체도) 없음");
  if (TYPE_SCALE_V4.title.size !== HEADING_SECTION_PX) fails.push("v4 title 크기가 섹션 제목과 다름");
  const eq = (label: string, got: string, want: string) => { if (got !== want) fails.push(`${label}: ${got} ≠ ${want}`); };
  eq("중 700→800", tierHeadingWeights('<p style="margin:0;font-size:20px;font-weight:700">a</p>'), '<p style="margin:0;font-size:20px;font-weight:800">a</p>');
  eq("소 600→700", tierHeadingWeights('<p style="font-size:18px;font-weight:600">a</p>'), '<p style="font-size:18px;font-weight:700">a</p>');
  eq("본문 400 불변", tierHeadingWeights('<p style="font-size:20px;font-weight:400">a</p>'), '<p style="font-size:20px;font-weight:400">a</p>');
  eq("큰 숫자 900 불변", tierHeadingWeights('<p style="font-size:22px;font-weight:900">a</p>'), '<p style="font-size:22px;font-weight:900">a</p>');
  const [, f] = corpus()[0] ?? [];
  if (f && !exportHtmlOf(f).includes("section .pagzly-display-headline{font-weight:800!important}")) fails.push("export에 제목 CSS 없음");
  return fails;
}
