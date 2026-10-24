/**
 * 446차 5 — 합성 픽스처에 사진 위 STEP 칩이 나오는 step_card 부여. 패션 픽스처는 착용컷이라 칩이 사진 밖(오프이미지 라벨)으로 빠져 사진 위 칩(10~11px)을 한 번도 못 봤다.
 * 문구는 새로 만들지 않고 기존 픽스처(compare-fashion)의 step_card를 그대로 복사해 `tier-rich-tech-6p`의 usage_steps 바로 뒤에 넣는다(사진 번호만 0·1·2).
 *   npx tsx scripts/gen-fixture-steps.ts [--check]
 */
import fs from "node:fs";
import type { DetailSection } from "../lib/types/generate";

const SRC = "scripts/fixtures/archetype-compare-fashion.json";
const TARGETS = ["scripts/fixtures/archetype-tier-rich-tech-6p.json"];
const format = (raw: string, v: unknown): string => JSON.stringify(v, null, raw.startsWith("{\n") ? 2 : undefined) + (raw.endsWith("\n") ? "\n" : "");

function main() {
  const check = process.argv.includes("--check");
  const srcRaw = fs.readFileSync(SRC, "utf8");
  const src = (JSON.parse(srcRaw) as { generated: { sections: DetailSection[] } }).generated.sections.find((s) => s.type === "step_card");
  if (!src || src.type !== "step_card") throw new Error("원본 step_card 없음");
  let changed = 0;
  for (const file of TARGETS) {
    const raw = fs.readFileSync(file, "utf8");
    const d = JSON.parse(raw) as { generated: { sections: DetailSection[] } };
    if (format(raw, d) !== raw) throw new Error(`${file}: 다시 쓰면 모양이 달라짐`);
    const rest = d.generated.sections.filter((s) => s.type !== "step_card");
    const copy = { ...src, steps: src.steps.map((s, i) => ({ ...s, imageIndex: i })) } as DetailSection;
    const at = rest.findIndex((s) => s.type === "usage_steps");
    const next = [...rest.slice(0, at + 1), copy, ...rest.slice(at + 1)];
    const out = { ...d, generated: { ...d.generated, sections: next } };
    if (format(raw, out) === raw) continue;
    changed += 1;
    console.log(`${file}: step_card 부여 @${at + 1}/${next.length}`);
    if (!check) fs.writeFileSync(file, format(raw, out));
  }
  console.log(changed ? `${check ? "바꿀 것" : "바꿈"} ${changed}건` : "변경 없음");
  if (check && changed) process.exit(1);
}
if (process.argv[1] && /gen-fixture-steps/.test(process.argv[1])) main();
