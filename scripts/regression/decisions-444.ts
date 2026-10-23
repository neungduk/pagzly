/**
 * 회귀 — 444차 2 "443 판단 3건" 확정값: ① 페르소나 문장은 소 17/700(눈 검수 합격, 굵지만 짧은 문장 라벨로 읽힘), ② spec_table 라벨 글자 알파가
 * 합성 말뭉치 모든 accent에서 면 위 4.5:1을 만족하는 가장 약한 값(한 단계 아래 0.05는 어딘가에서 미달), ③ FAQ 카드형은 카드 깊이(hairline+soft)·여백으로 유지. 호출 0.
 */
import { contrastRatioToken, mixHex } from "../../lib/design-tokens";
import { SPEC_LABEL_INK_ALPHA, TYPE_V4, tokenDecl } from "../../lib/design-tokens-v4";
import { faqCardV4, personaTextV4, specLabelCellV4 } from "../../lib/twin-styles-v4";
import { corpus, exportArgsOf, readSession } from "../design-corpus";

export const name = "443 판단 확정 — 페르소나 17/700·spec 라벨 알파 최소값·FAQ 카드 깊이";

const INK = "#1B1B18";
const facesOf = (accent: string) => [mixHex("#FFFFFF", accent, 0.1), mixHex(mixHex("#FFFFFF", accent, 0.07), accent, 0.1)];
const minContrast = (alpha: number): number => {
  let m = 99;
  for (const [, f] of corpus()) for (const face of facesOf(exportArgsOf(readSession(f)).theme.accent)) m = Math.min(m, contrastRatioToken(mixHex(face, INK, alpha), face));
  return m;
};

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const small = TYPE_V4["heading-small"];
  const p = Object.fromEntries(personaTextV4());
  if (p["font-size"] !== `${small.size}px` || p["font-weight"] !== String(small.w)) fails.push("페르소나 문장이 소 17/700이 아님");
  if (minContrast(SPEC_LABEL_INK_ALPHA) < 4.5) fails.push(`라벨 알파 ${SPEC_LABEL_INK_ALPHA}에서 대비 ${minContrast(SPEC_LABEL_INK_ALPHA).toFixed(2)} < 4.5`);
  if (minContrast(SPEC_LABEL_INK_ALPHA - 0.05) >= 4.5) fails.push("라벨 알파를 한 단계 더 낮춰도 4.5:1 → 가장 약한 값이 아님");
  const label = Object.fromEntries(specLabelCellV4("#336699"));
  if (!String(label.color).includes(`${SPEC_LABEL_INK_ALPHA})`)) fails.push(`라벨 글자색이 토큰 알파를 안 읽음: ${label.color}`);
  const faq = Object.fromEntries(faqCardV4());
  const soft = Object.fromEntries(tokenDecl("shadow-soft", "#1B1B18"));
  if (faq["box-shadow"] !== soft["box-shadow"] || !String(faq.border).startsWith("1px solid")) fails.push("FAQ 카드가 hairline+soft 깊이가 아님");
  if (faq.padding !== "24px 20px") fails.push(`FAQ 카드 안쪽 여백 ${faq.padding}`);
  return fails;
}
