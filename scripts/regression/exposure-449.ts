/**
 * 회귀 — 449차 1 가독성↔사진 노출 균형. ① 히어로 A(2)·정보 포인트·배너 노출 하한(가림 면적비·휘도 보존율, scripts/photo-exposure.ts의 한계값),
 * ② 448차보다 나아졌는지(히어로 A 가림 ≤0.45·보존 ≥0.65(450차 상향)), ③ 확장 말뭉치(사람 사진 히어로 A·흰 배경 컷아웃 히어로 B·정보 구간)의 대비 하한 위반 0(사진 5종),
 * ④ 흰 배경 컷아웃은 multiply 없이 카드 프레임.
 */
import { limitFailures, runExposure } from "../photo-exposure";
import { run as measureLegibility } from "../photo-legibility";
import { htmlFor } from "../stress-variants";

export const name = "사진 노출 균형 — 히어로 A 가림·보존 하한·정보/배너 하한·확장 말뭉치 대비 0·흰 배경 컷아웃 카드(multiply 없음)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rows = await runExposure(["fx-compare-fashion", "fx-skincare-serum", "fx-tech-keyboard+person", "fx-skincare-serum+whitebg"]);
  fails.push(...limitFailures(rows));
  const heroA = rows.filter((r) => r.layout === "hero-A");
  if (!heroA.length) fails.push("히어로 A 영역을 못 찾음");
  for (const r of heroA) { if (r.cover > 0.45) fails.push(`${r.fixture} 히어로 A 가림 ${r.cover.toFixed(2)} > 0.45`); if (r.keep < 0.65) fails.push(`${r.fixture} 히어로 A 보존 ${r.keep.toFixed(2)} < 0.65`); }
  if (!rows.some((r) => r.layout.startsWith("info-points"))) fails.push("정보 포인트 사진 구간을 못 찾음");
  const wb = htmlFor("fx-skincare-serum+whitebg");
  if (/mix-blend-mode/.test(wb)) fails.push("흰 배경 컷아웃 히어로에 mix-blend-mode가 남음");
  if (!wb.includes('data-hero-frame="card"')) fails.push("흰 배경 컷아웃 카드 프레임이 없음");
  const leg = await measureLegibility({ fixtures: ["fx-tech-keyboard+person", "fx-skincare-serum+whitebg", "fx-hairbody-shampoo"], photos: ["cutout-white", "sat-yellow", "sky-ground", "very-dark", "noise-shelf"] });
  for (const f of leg.filter((x) => x.ratio < x.need).slice(0, 6)) fails.push(`${f.fixture} · ${f.photo} · ${f.layout}: «${f.text}» ${f.px}px ${f.ratio} < ${f.need}`);
  return fails;
}
