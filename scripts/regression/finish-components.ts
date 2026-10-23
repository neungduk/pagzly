/**
 * 회귀 — 441차 1-4 경계·깊이·숫자 컴포넌트(DESIGN_V4): 구분선 6종 마크업(금지 기법 없음·섹션 위 24px 안·면 색 불변), mood 기본 2종,
 * 깊이 토큰 2단계 + none·hairline, v4 마크업에 남은 그림자 하드코딩 0, 숫자 컴포넌트(숫자+단위 분리·글 값 축소·원문 불변), 말뭉치에 6종 모두. 호출 0.
 */
import fs from "node:fs";
import { DIVIDER_KINDS, dividerFor, dividerHtml } from "../../lib/dividers";
import { depthShadow, hairline } from "../../lib/palette-v4";
import { numberStatHtml } from "../../lib/type-treatments";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "마감 컴포넌트 — 구분선 6종·깊이 토큰·숫자 컴포넌트·그림자 하드코딩 0";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const k of DIVIDER_KINDS) {
    const h = dividerHtml(k, "#1B1B18");
    if (/clip-path|mask|mix-blend|:has\(|text-wrap/.test(h)) fails.push(`${k}: export 금지 기법`);
    const top = Number(/top:(\d+)px/.exec(h)?.[1] ?? 0);
    const hh = Number(/height:(\d+)px/.exec(h)?.[1] ?? 0);
    if (top + hh > 28) fails.push(`${k}: 섹션 위 여백 밖(top ${top} + h ${hh})`);
    if (/background:#|background-color/.test(h)) fails.push(`${k}: 면 색을 칠함`);
  }
  if (dividerFor("playful", 0) === dividerFor("playful", 1)) fails.push("mood 기본 2종이 번갈지 않음");
  if (depthShadow("none", "#1B1B18") !== "none" || !/0 6px 16px/.test(depthShadow("soft", "#1B1B18")) || !/0 12px 28px/.test(depthShadow("float", "#1B1B18"))) fails.push("깊이 토큰 값");
  if (hairline("#1B1B18") !== "1px solid rgba(27, 27, 24, 0.1)") fails.push("hairline 값");
  const lv = fs.readFileSync("lib/layout-variants.ts", "utf8");
  if (/box-shadow:0 \d/.test(lv)) fails.push("v4 마크업에 그림자 하드코딩이 남음");
  const strip = (v: string) => numberStatHtml(v, "#111", 26).replace(/<[^>]+>/g, "");
  if (strip("30mL") !== "30mL" || strip("하이브리드 ANC 42dB") !== "하이브리드 ANC 42dB") fails.push("숫자 컴포넌트가 원문을 바꿈");
  if (!/font-size:13px;font-weight:800[^>]*>mL/.test(numberStatHtml("30mL", "#111", 26))) fails.push("단위가 작게 분리되지 않음");
  if (!/font-size:19px/.test(numberStatHtml("하이브리드 ANC 42dB", "#111", 26))) fails.push("글 값이 한 단계 작지 않음");
  const used = new Set<string>();
  for (const [, f] of corpus()) for (const m of exportHtmlOf(f).matchAll(/data-pz-divider="(\w+)"/g)) used.add(m[1]!);
  if (corpus().length >= 18) for (const k of DIVIDER_KINDS) if (!used.has(k)) fails.push(`구분선 ${k} 말뭉치 0회`);
  return fails;
}
