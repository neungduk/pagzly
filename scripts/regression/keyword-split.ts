/** 회귀 — 하이라이트 카드 키워드 분리(396차): 영문 약어가 중간에서 끊기지 않는다. 고정 입력, 유료 호출 0 */
import { parseMegaKeywordHeading, parseUniformCardKeywords } from "../../lib/detail-visual-enhancements";

export const name = "키워드 분리(LDAC·AAC 등)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const cases: Array<[string, string | null, string]> = [
    ["LDAC·AAC", "LDAC·AAC", ""],
    ["AURA LAB", "AURA", "LAB"],
    ["S/M/L 사이즈", "S/M/L", "사이즈"],
    ["210g/yd", null, "210g/yd"],
    ["코튼 100%", "코튼", "100%"],
    ["수축 2%↓", "수축", "2%↓"],
    ["단당 80kg", "단당", "80kg"],
    ["급여 전", null, "급여 전"],
  ];
  for (const [title, kw, rest] of cases) {
    const r = parseMegaKeywordHeading(title);
    if (r.keyword !== kw || r.remainder !== rest) {
      fails.push(`"${title}" → ${JSON.stringify(r)} (기대 keyword=${JSON.stringify(kw)}, remainder=${JSON.stringify(rest)})`);
    }
  }
  // 한글이 붙은 영문 어절은 약어만 떼지 않는다
  const glued = parseMegaKeywordHeading("ANC노이즈 차단");
  if (glued.keyword === "ANC") fails.push(`"ANC노이즈 차단" → 약어만 떼어냄 ${JSON.stringify(glued)}`);
  const uniform = parseUniformCardKeywords(["하이브리드 AN", "오픈형 이어훅", "LDAC·AAC"]);
  if (uniform[2]?.keyword !== "LDAC·AAC" || uniform[2]?.remainder !== "") {
    fails.push(`카드 묶음 "LDAC·AAC" → ${JSON.stringify(uniform[2])}`);
  }
  return fails;
}
