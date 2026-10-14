/**
 * 회귀 — 패션 사이즈 도식 행 매칭(402차). 사이즈별 행("S"·"M"·"L")이 영어 별칭 부분 일치로
 * 어깨·가슴·소매·총장에 붙으면 도식 위에 긴 문자열이 겹쳐 그려진다. 항목별 행은 그대로 맞아야 한다.
 */
import { matchSizeDiagramRows } from "../../lib/fashion-size-diagram";

export const name = "사이즈 도식 행 매칭";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const perSize = matchSizeDiagramRows([
    { label: "S", value: "총장 68 · 어깨너비 50 · 가슴단면 54 · 소매길이 21" },
    { label: "M", value: "총장 70 · 어깨너비 52 · 가슴단면 56 · 소매길이 22" },
    { label: "L", value: "총장 72 · 어깨너비 54 · 가슴단면 58 · 소매길이 23" },
  ]);
  if (perSize.length !== 0) fails.push(`사이즈별 행이 도식 항목에 붙음: ${JSON.stringify(perSize)}`);
  const perMeasure = matchSizeDiagramRows([
    { label: "총장", value: "70cm" },
    { label: "어깨너비", value: "52cm" },
    { label: "가슴단면", value: "56cm" },
    { label: "소매길이", value: "22cm" },
  ]).map((m) => m.key);
  if (JSON.stringify(perMeasure) !== JSON.stringify(["shoulder", "chest", "length", "sleeve"])) {
    fails.push(`항목별 행 매칭이 바뀜: ${perMeasure.join("·")}`);
  }
  return fails;
}
