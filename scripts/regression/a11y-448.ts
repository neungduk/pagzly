/**
 * 회귀 — 448차 4·5 접근성·구조 린트. 합성 21종 export·라이브: R19(제목 순서)·R20(대체텍스트)·R22(lang·중복 id·이름 없는 링크/버튼) 위반 0,
 * R21(칩 테두리 3:1)·R23(비율 예약 없는 이미지)은 449차: R21은 조작 칩(색상 선택 라벨 등)만 세고 ≤10, 장식 칩은 info로 제외, R23 ≤2. 순수 함수 단위 검사 포함.
 */
import { a11yStatic, auditCorpus } from "../a11y-lint";
import { CHIP_V4 } from "../../lib/design-tokens-v4";
import { contrastRatioToken, mixHex } from "../../lib/design-tokens";

export const name = "접근성·구조 린트 R19~R23 — 제목 순서·alt·lang·중복 id 0, 칩 테두리·비율 예약은 늘지 않음";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const has = (html: string, mode: "export" | "live", rule: string) => a11yStatic(html, mode).some((i) => i.rule === rule);
  if (!has("<html lang=\"ko\"><body><h1>a</h1><h3>b</h3></body></html>", "export", "R19")) fails.push("h1→h3 건너뜀을 못 잡음");
  if (!has("<html lang=\"ko\"><body><h1>a</h1><h1>b</h1></body></html>", "export", "R19")) fails.push("h1 2개를 못 잡음");
  if (has("<html lang=\"ko\"><body><h1>a</h1><h2>b</h2><h3>c</h3></body></html>", "export", "R19")) fails.push("정상 제목 순서를 위반으로 봄");
  if (!has("<html lang=\"ko\"><body><h1>a</h1><img src=\"x\"/></body></html>", "export", "R20")) fails.push("alt 없는 이미지를 못 잡음");
  if (has("<html lang=\"ko\"><body><h1>a</h1><img src=\"x\" alt=\"\" aria-hidden=\"true\"/></body></html>", "export", "R20")) fails.push("장식 이미지를 위반으로 봄");
  if (!has("<html><body><h1>a</h1></body></html>", "export", "R22")) fails.push("lang 없음을 못 잡음");
  if (!has("<html lang=\"ko\"><body><h1>a</h1><a href=\"#\"></a><div id=\"q\"></div><div id=\"q\"></div></body></html>", "export", "R22")) fails.push("빈 링크·중복 id를 못 잡음");

  // 449차 칩 토큰: 조작 칩 경계 3:1 이상(종이색 위), 선택 상태는 더 진함
  if (contrastRatioToken(CHIP_V4.controlBorder, "#FAF8F3") < 3) fails.push("조작 칩 테두리 토큰이 종이색 위 3:1 미만");
  if (contrastRatioToken(mixHex("#FAF8F3", "#1B1B18", 0.6), "#FAF8F3") < 3) fails.push("선택 칩 테두리 토큰이 3:1 미만");
  if (CHIP_V4.hairlineAlpha >= 0.4) fails.push("장식 칩 머리카락 선 알파가 정보 칩 수준으로 커짐");

  const rows = await auditCorpus();
  const cnt = (rs: Array<{ export: Array<{ rule: string; sev: string }>; live: Array<{ rule: string; sev: string }> }>, rule: string, side: "export" | "live") => rs.reduce((s, r) => s + r[side].filter((i) => i.rule === rule && i.sev !== "info").length, 0);
  for (const rule of ["R19", "R20", "R22"]) {
    if (cnt(rows, rule, "export")) fails.push(`export ${rule} 위반 ${cnt(rows, rule, "export")}건`);
    if (cnt(rows, rule, "live")) fails.push(`라이브 ${rule} 위반 ${cnt(rows, rule, "live")}건`);
  }
  if (cnt(rows, "R21", "export") > 10) fails.push(`R21 조작 칩 테두리 위반 ${cnt(rows, "R21", "export")} > 10`);
  if (cnt(rows, "R23", "export") > 2) fails.push(`R23 비율 예약 없음이 늘었음 ${cnt(rows, "R23", "export")} > 2`);
  return fails;
}
