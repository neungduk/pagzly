/**
 * 회귀 — 448차 1 극단 사진 가독성. 대표 픽스처(히어로 A·B·C·D + 정보 포인트 구간) × 극단 사진 5종(흰 컷아웃·고채도 노랑·하늘/바닥·매우 어두움·고주파 노이즈)에서
 * 사진 위 모든 글자가 최악 백분위 대비(큰 글자 3:1·일반 4.5:1) 이상. 전체 17종×6픽스처는 `npx tsx scripts/photo-legibility.ts`(2분).
 */
import { run as measureAll } from "../photo-legibility";

export const name = "극단 사진 가독성 — 히어로 A~D·정보 구간 × 사진 5종, 최악 백분위 대비 기준 이상(위반 0)";

export async function run(): Promise<string[]> {
  const all = await measureAll({ fixtures: ["fx-compare-fashion", "fx-skincare-serum", "fx-tech-keyboard", "fx-tech-vacuum"], photos: ["cutout-white", "sat-yellow", "sky-ground", "very-dark", "noise-shelf"] });
  const fails: string[] = [];
  if (all.length < 100) fails.push(`측정 글자 수가 너무 적음 ${all.length}`);
  for (const f of all.filter((x) => x.ratio < x.need).slice(0, 8)) fails.push(`${f.fixture} · ${f.photo} · ${f.layout}: «${f.text}» ${f.px}px ${f.ratio} < ${f.need}`);
  const layouts = new Set(all.map((f) => f.layout));
  for (const l of ["hero-A", "hero-B", "hero-C", "hero-D"]) if (!layouts.has(l)) fails.push(`레이아웃 ${l} 측정 없음`);
  return fails;
}
