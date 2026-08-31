import { countSlotSections, getSlotTemplate } from "../lib/section-templates";

const cats = [
  "화장품/뷰티",
  "의류/패션",
  "식품/건강기능식품",
  "전자제품",
  "반려동물",
  "생활용품",
] as const;

const longExpected: Record<string, number> = {
  "화장품/뷰티": 23,
  "의류/패션": 23,
  "식품/건강기능식품": 23,
  "전자제품": 22,
  "반려동물": 23,
  "생활용품": 22,
};

let ok = true;
for (const c of cats) {
  const short = countSlotSections(c, "short");
  const long = countSlotSections(c, "long");
  const slots = getSlotTemplate(c, "short").map((s) => s.slot);
  const shortOk = short === 10;
  if (!shortOk) ok = false;
  console.log(`${c}: short=${short} ${shortOk ? "OK" : "FAIL"} [${slots.join(" → ")}]`);
  console.log(`${c}: long=${long} (template rows: ${getSlotTemplate(c, "long").length})`);
}

if (!ok) process.exit(1);
console.log("All categories short=10");
