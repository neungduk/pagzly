/**
 * 회귀 — 440차 5 변형 선택 감사: 말뭉치(저장 6 + 합성 18)에서 모든 변형이 1회 이상(요건 기준, 억지 배치 없음),
 * 같은 입력 → 같은 계획(결정성), 같은 아키타입이라도 제품(시드)이 다르면 변형 순서가 달라진다. 호출 0.
 */
import { V4_VARIANTS, structureKey, variantOrder } from "../../lib/layout-variants";
import { corpus, displayOf } from "../design-corpus";

export const name = "변형 감사 — 모든 변형 말뭉치 1회 이상·결정성·제품별 변주";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const files = corpus();
  if (files.length < 18) return fails; // 말뭉치가 없는 환경(픽스처 없음)에서는 건너뜀
  const used = new Map<string, number>();
  for (const [, f] of files) for (const s of displayOf(f).sections) { const k = structureKey(s); used.set(k, (used.get(k) ?? 0) + 1); }
  for (const [fam, vs] of Object.entries(V4_VARIANTS)) for (const v of vs) if (!used.get(`${fam}.${v}`)) fails.push(`변형 ${fam}.${v} 말뭉치 0회`);
  // 결정성: 같은 파일 두 번 → 같은 구조 순서
  const [, f0] = files.find(([id]) => id === "fx-makeup-tint") ?? files[0]!;
  const a = displayOf(f0).sections.map(structureKey).join(",");
  const b = displayOf(f0).sections.map(structureKey).join(",");
  if (a !== b) fails.push("같은 입력인데 계획이 다름");
  // 같은 mood라도 시드가 다르면 선호 순서가 달라진다(전 계열에서 최소 1개 시드 쌍)
  for (const fam of ["benefits", "concern", "story", "spec", "phototext"] as const) {
    const orders = new Set([0, 1, 2, 3, 4, 5, 6].map((seed) => variantOrder(fam, "playful", seed).join(",")));
    if (orders.size < 2) fails.push(`${fam}: 시드가 달라도 선호 순서가 같음`);
  }
  // 같은 아키타입(뷰티 스킨케어 계열) 서로 다른 제품 둘 → v4 구조 순서가 다름
  const pick = (id: string) => files.find(([x]) => x === id)?.[1];
  const p1 = pick("fx-skincare-serum");
  const p2 = pick("fx-inner-collagen");
  if (p1 && p2) {
    const k = (f: string) => displayOf(f).sections.map(structureKey).filter((x) => /^(benefits|concern|story|spec|phototext)\./.test(x)).join(",");
    if (k(p1) === k(p2)) fails.push("다른 제품인데 v4 변형 순서가 완전히 같음");
  }
  return fails;
}
