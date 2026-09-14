import { getCategoryPatternBackground } from "../lib/design-tokens";

const p = getCategoryPatternBackground("생활용품") ?? "";
const living = getCategoryPatternBackground("생활용품") ?? "";
const beauty = getCategoryPatternBackground("화장품/뷰티") ?? "";
for (const [name, v] of [
  ["living", living],
  ["beauty", beauty],
] as const) {
  const rawQuoteInData = /svg\+xml,[^']*"/.test(v);
  const hasEncodedXmlns = v.includes("%22http");
  console.log(
    JSON.stringify({
      name,
      hasEncodedXmlns,
      rawQuoteInData,
      head: v.slice(0, 96),
    }),
  );
  if (rawQuoteInData) process.exitCode = 1;
}
