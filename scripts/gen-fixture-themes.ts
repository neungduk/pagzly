/**
 * 445차 4 — 합성 픽스처 대표색 부여. 444차 관찰: 합성 픽스처 9종이 같은 대표색(#20547E 기본값)을 써서 히어로 포화 면이 같은 파란색(#1D79C4)으로 겹쳤다.
 * 실제 입력에서는 대표색이 사진 지배색(color-extract)에서 나오므로 픽스처마다 달라야 한다 → 해당 픽스처에 색상(hue)을 하나씩 부여하고
 * 실제 파이프라인과 같은 함수(buildThemeFromHueWithNeutral)로 theme 전체를 파생한다. 규칙 코드(heroFaceColor)는 바꾸지 않는다.
 *   npx tsx scripts/gen-fixture-themes.ts [--check]   (--check: 바꿀 것이 있으면 종료 코드 1)
 */
import fs from "node:fs";
import path from "node:path";
import { STUDIO_NEUTRAL_SAMPLE, buildThemeFromHueWithNeutral } from "../lib/color-extract";

/**
 * 픽스처 → 색상(도). 기존 픽스처가 쓰는 색상(0·20·28·119·172·222·266·344)과 겹치지 않게 비어 있는 곳에서 고른다.
 * 45~135도(노랑~초록)는 피한다: 이 색상대의 밝은 대표색은 가격 기호·POINT 칩 등 기존 색 규칙에서 린트 R7 대비가 4.5:1 아래(3.0~4.3)로 나온다(보고서 별도 발견).
 */
export const FIXTURE_HUES: Record<string, number> = {
  "archetype-compare-fashion": 245,
  "archetype-compare-tech": 196,
  "archetype-tier-normal-living-3p": 160,
  "archetype-tier-normal-pet-3p": 240,
  "archetype-tier-rich-fashion-6p": 300,
  "archetype-tier-rich-tech-6p": 145,
  "archetype-tier-sparse-beauty-1p": 318,
  "archetype-tier-sparse-food-1p": 205,
  "archetype-tier-sparse-tech-1p-noprice": 285,
};

const DIR = "scripts/fixtures";

/** 파일의 원래 모양(들여쓰기 2칸 / 한 줄)을 그대로 쓴다 — 바꾼 줄만 diff에 남도록 */
const format = (raw: string, v: unknown): string => JSON.stringify(v, null, raw.startsWith("{\n") ? 2 : undefined) + (raw.endsWith("\n") ? "\n" : "");

function main() {
  const check = process.argv.includes("--check");
  let changed = 0;
  for (const [name, hue] of Object.entries(FIXTURE_HUES)) {
    const file = path.join(DIR, `${name}.json`);
    const raw = fs.readFileSync(file, "utf8");
    const d = JSON.parse(raw) as { theme?: Record<string, unknown>; generated?: { theme?: Record<string, unknown> } };
    if (format(raw, d) !== raw) throw new Error(`${name}: 다시 쓰면 모양이 달라짐(저장 형식 확인)`);
    const derived = buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE);
    // 결과 페이지가 읽는 generated.theme과 세션 최상위 theme 두 곳이 같은 값이어야 한다
    const next = { ...d, theme: { ...(d.theme ?? {}), ...derived }, ...(d.generated ? { generated: { ...d.generated, theme: { ...(d.generated.theme ?? {}), ...derived } } } : {}) };
    if (format(raw, next) === raw) continue;
    changed += 1;
    console.log(`${name}: ${String(d.theme?.accent)} → ${derived.accent} (hue ${hue})`);
    if (!check) fs.writeFileSync(file, format(raw, next));
  }
  console.log(changed ? `${check ? "바꿀 것" : "바꿈"} ${changed}건` : "변경 없음");
  if (check && changed) process.exit(1);
}
if (process.argv[1] && /gen-fixture-themes/.test(process.argv[1])) main();
