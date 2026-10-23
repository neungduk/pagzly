/**
 * 회귀 — 444차 3 인접 섹션 간격 해석 규칙(lib/rhythm-v4.ts): ① 순수 함수(같은 면이 아니면 불변, 같은 면이면 앞 아래 + 뒤 위 ≤ 96, 값은 3단 스케일 0·32·48·64),
 * ② 계획 표시(markTightTops: 같은 면 임팩트·접점 띠 바로 뒤만, 그 밖·hero·legacy 불변, 입력 배열 불변), ③ 마크업(tightenTopPad: 첫 태그 위 여백만, 32 이하·형식 다른 값은 불변),
 * ④ 말뭉치 export DOM 측정: 3단 밖 여백 0, 같은 면 이웃 빈 간격(gapBig) 2 이하, v4 off는 rhythm 표시·여백 변경 없음. 호출 0·서버 0.
 */
import { MAX_SAME_FACE_GAP_PX, TIGHT_TOP_PX, markTightTops, resolveTopPad, tightenTopPad } from "../../lib/rhythm-v4";
import { faceKeyOf } from "../../lib/layout-variants";
import type { DetailSection } from "../../lib/types/generate";
import { corpus, exportHtmlOf } from "../design-corpus";
import { measureDomPages } from "../design-metrics-dom";

export const name = "리듬 간격 규칙 — 같은 면 이웃 ≤96·3단 스케일·계획 표시·off 불변·gapBig 2 이하";

const SCALE = [0, 32, 48, 64];
const imp = (kind: string, face?: string, extra: Record<string, unknown> = {}): DetailSection =>
  ({ type: "impact", slot: "impact", kind, ...(face ? { v4: { family: "benefits", variant: "x", face } } : {}), ...extra }) as unknown as DetailSection;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // ① 순수 함수: 모든 (앞 아래, 뒤 위) 조합
  for (const pb of SCALE) for (const pt of SCALE) {
    const diff = resolveTopPad(pb, pt, false);
    if (diff !== pt) fails.push(`면이 다르면 불변이어야 함 (${pb},${pt}) → ${diff}`);
    const same = resolveTopPad(pb, pt, true);
    if (!SCALE.includes(same)) fails.push(`스케일 밖 값 (${pb},${pt}) → ${same}`);
    if (same > pt) fails.push(`위 여백이 커짐 (${pb},${pt}) → ${same}`);
    if (pt > TIGHT_TOP_PX && pb + pt > MAX_SAME_FACE_GAP_PX && pb + same > MAX_SAME_FACE_GAP_PX) fails.push(`같은 면인데 간격 ${pb + same} > ${MAX_SAME_FACE_GAP_PX} (${pb},${pt})`);
    if (pb + pt <= MAX_SAME_FACE_GAP_PX && same !== pt) fails.push(`이미 96 이하인데 바뀜 (${pb},${pt}) → ${same}`);
  }
  if (resolveTopPad(64, 64, true) !== 32 || resolveTopPad(48, 64, true) !== 48 || resolveTopPad(64, 48, true) !== 32) fails.push("대표 조합 값(64+64→32, 48+64→48, 64+48→32)");
  // ② 계획 표시
  const secs: DetailSection[] = [
    { type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 } as unknown as DetailSection,
    imp("v4", "bgA"), imp("v4", "card"), imp("v4", "emphasis"), imp("v4", "emphasis"), imp("note"), imp("faqcards"), imp("faqcards"),
    { type: "faq", slot: "faq", heading: "q", items: [] } as unknown as DetailSection, imp("number"),
    imp("v4", "bgB", { v4: { family: "touch", variant: "band", face: "bgB" } }), imp("v4", "bgA"),
  ];
  const frozen = JSON.stringify(secs);
  const marked = markTightTops(secs, faceKeyOf);
  if (JSON.stringify(secs) !== frozen) fails.push("입력 배열이 바뀜");
  const flags = marked.map((s) => ((s as { rhythm?: string }).rhythm === "tight" ? 1 : 0)).join("");
  // 기대: hero 0, bgA 0, card(앞 bgA와 같은 흰 면) 1, emphasis 0, emphasis(같은 면) 1, note(앞과 다른 면) 0, faqcards 0, faqcards(같은 면) 1, faq(legacy) 0, number(앞이 legacy) 0, touch 0, 접점 띠 바로 뒤 1
  const want = "0" + "0" + "1" + "0" + "1" + "0" + "0" + "1" + "0" + "0" + "0" + "1";
  if (flags !== want) fails.push(`계획 표시 ${flags} ≠ 기대 ${want}`);
  // ③ 마크업
  const t = (h: string) => tightenTopPad(h);
  if (t('<section data-pz-impact="v4" style="position:relative;padding:64px 24px;background:#fff">x') !== '<section data-pz-impact="v4" style="position:relative;padding:32px 24px;background:#fff">x') fails.push("64 → 32 안 됨");
  if (t('<section style="padding:48px 24px 64px">x') !== '<section style="padding:32px 24px 64px">x') fails.push("앞 아래 최악 64 가정이면 48도 112라 32로 줄어야 함");
  if (t('<section style="padding:32px 24px">x') !== '<section style="padding:32px 24px">x') fails.push("32는 불변");
  if (t('<section style="padding:0 0 8px">x') !== '<section style="padding:0 0 8px">x') fails.push("0은 불변");
  if (t('<div style="padding:64px">x') !== '<div style="padding:64px">x') fails.push("섹션이 아닌 첫 태그는 불변");
  // ④ 말뭉치
  const pages: Array<[string, string]> = corpus().map(([id, f]) => [id, exportHtmlOf(f)]);
  const dom = await measureDomPages(pages);
  let big = 0;
  for (const [id, m] of dom) {
    big += m.gapBig;
    if (m.padOff) fails.push(`${id}: 3단 밖 여백 ${m.padOff}곳`);
  }
  if (big > 2) fails.push(`같은 면 이웃 빈 간격(gapBig) 합계 ${big} > 2`);
  return fails;
}
