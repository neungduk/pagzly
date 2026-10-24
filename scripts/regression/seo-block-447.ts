/**
 * 회귀 — 447차 2-d 페이지 끝 검색용 글 블록 축소. ① 항상 보임(details·summary·hidden·display:none 없음), ② "상세 정보" 목록 ≤ SEO_DETAIL_MAX_V4,
 * ③ v4 CSS: 글 12px 이상·줄 간격·좁은 여백·넓은 폭 2단, ④ 글색 대비 4.5:1(흰·웜 크림 위), ⑤ 블록이 말뭉치 전부에 있고 라이브 상호작용 속성 없음.
 */
import { SEO_DETAIL_MAX_V4 } from "../../lib/detail-seo-text";
import { contrastRatioToken } from "../../lib/design-tokens";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "검색용 글 블록 축소 — 항상 보임·상세 정보 ≤40줄·12px·글색 4.5:1·2단";

const over = (fg: [number, number, number], a: number, bg: string): string => { const n = parseInt(bg.slice(1), 16); const m = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return `#${fg.map((c, i) => Math.round(c * a + m[i]! * (1 - a)).toString(16).padStart(2, "0")).join("")}`; };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };
  ok(SEO_DETAIL_MAX_V4 <= 40 && SEO_DETAIL_MAX_V4 >= 20, "상한 값 범위");
  for (const bg of ["#FFFFFF", "#FAF9F5", "#F6F1EA"]) {
    ok(contrastRatioToken(over([27, 27, 24], 0.62, bg), bg) >= 4.5, `본문 글색 .62가 ${bg} 위에서 4.5:1 미만`);
    ok(contrastRatioToken(over([27, 27, 24], 0.65, bg), bg) >= 4.5, `제목 글색 .65가 ${bg} 위에서 4.5:1 미만`);
  }
  let maxLis = 0;
  for (const [id, f] of corpus().filter(([i]) => i.startsWith("fx-"))) {
    const h = exportHtmlOf(f);
    const m = h.match(/<article class="pagzly-seo-text"[\s\S]*?<\/article>/);
    ok(!!m, `${id}: 블록 없음`);
    if (!m) continue;
    ok(!/<details|<summary|hidden|display:\s*none|onclick/.test(m[0]), `${id}: 항상 보임이어야 함`);
    const detail = m[0].match(/<h2>상세 정보<\/h2><ul>([\s\S]*?)<\/ul>/);
    const n = detail ? (detail[1]!.match(/<li>/g) ?? []).length : 0;
    maxLis = Math.max(maxLis, n);
    ok(n <= SEO_DETAIL_MAX_V4, `${id}: 상세 정보 ${n}줄`);
  }
  const css = exportHtmlOf(corpus().filter(([i]) => i.startsWith("fx-"))[0]![1]);
  ok(css.includes(".pagzly-seo-text{max-width:576px;margin:0 auto;padding:32px 24px 40px;border-top:0;font-size:12px;line-height:1.55}"), "v4 압축 CSS");
  ok(css.includes(".pagzly-seo-text ul{columns:2;column-gap:32px}"), "넓은 폭 2단");
  ok(maxLis > 0, "상세 정보 목록이 있음");
  return fails;
}
