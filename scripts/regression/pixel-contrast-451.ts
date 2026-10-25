/**
 * 회귀 — 451차 4 export 전수 픽셀 대비. 합성 21종 × 390·750폭에서 모든 글자 요소의 실제 렌더 대비(요소 글자를 숨겨 다시 캡처한 배경 백분위, scripts/contrast-sources.ts)를
 * 재서 위반이 허용 목록(측정 오탐으로 분류한 것)을 뺀 뒤 0이다. 허용 목록은 근거와 함께 아래 ALLOW에 둔다.
 */
import { collectExport } from "../contrast-sources";

export const name = "export 전수 픽셀 대비 — 합성 21종 × 390·750 모든 글자 요소 위반 0(허용 목록 외)";

/** 측정 오탐으로 분류한 것(눈으로 확인한 정상 표시). 항목을 늘리려면 근거를 적는다 */
export const ALLOW: Array<{ re: RegExp; why: string }> = [
  { re: /^(\d+)$/, why: "흰 글자 숫자 알약(통계 숫자 40px): 알약 면이 어두운데 글자 상자 가장자리 배경 백분위가 밝게 잡힘" },
];

export async function run(): Promise<string[]> {
  const hits = await collectExport([390, 750]);
  return hits
    .filter((h) => !ALLOW.some((a) => a.re.test(h.text) && h.px >= 24))
    .map((h) => `${h.fixture} ${h.width}px «${h.text}» ${h.px}px ${h.ratio.toFixed(2)}<${h.need} ${h.src.slice(0, 60)}`)
    .slice(0, 12);
}
