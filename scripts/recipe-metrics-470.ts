/**
 * 470차 — 레시피 지표(문자열·섹션 목록만; 브라우저·네트워크 없음).
 *   A1: 이동 가능한 블록이 5개 이상인 페이지에서 아키타입 쌍(28쌍)의 계열 순서 시그니처가 갈리는 자리 수의 쌍 평균(최솟값도 보고)
 *   A2: 하드 제약 — 히어로 첫째, 비이동 섹션(접점·띠·숨 고르기·스펙·FAQ·단계·일반 섹션)의 자리와 종류가 V5 레시피 전후에서 같다(레시피 끈 상태와 비교는 recipeOff 훅)
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests, type ArchetypeId } from "../lib/page-archetype-v5";
import { MOVABLE_FAMILIES, movableSignature } from "../lib/page-recipe-v5";
import { corpus, displayOf } from "./design-corpus";

export function signaturesOf(file: string): Record<ArchetypeId, string[]> {
  const out = {} as Record<ArchetypeId, string[]>;
  for (const a of ARCHETYPE_IDS) { setV5ArchetypeForTests(a); out[a] = movableSignature(displayOf(file).sections); }
  return out;
}
export const diffCount = (a: string[], b: string[]): number => { let d = Math.abs(a.length - b.length); for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) d += 1; return d; };

export function pairStats(): { pages: number; mean: number; min: number; worst: string } {
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const sums = new Map<string, number>();
  let pages = 0;
  for (const [, f] of corpus()) {
    const sg = signaturesOf(f);
    if (Math.min(...ARCHETYPE_IDS.map((a) => sg[a].length)) < 5) continue;
    pages += 1;
    for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) {
      const k = `${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}`;
      sums.set(k, (sums.get(k) ?? 0) + diffCount(sg[ARCHETYPE_IDS[i]!], sg[ARCHETYPE_IDS[j]!]));
    }
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  const means = [...sums.entries()].map(([k, v]) => [k, v / Math.max(1, pages)] as const);
  const worst = means.sort((a, b) => a[1] - b[1])[0]!;
  return { pages, mean: means.reduce((x, y) => x + y[1], 0) / means.length, min: worst[1], worst: worst[0] };
}
void MOVABLE_FAMILIES;

if (require.main === module) { const s = pairStats(); console.log(`이동 가능 5개+ 페이지 ${s.pages}개 · 쌍 평균 불일치 ${s.mean.toFixed(2)} · 최소 쌍 ${s.worst} ${s.min.toFixed(2)} (목표 ≥ 3)`); }

export function pairTable(): string {
  setDesignUp1ForTests(true); setDesignV5ForTests(true);
  const sums = new Map<string, number>(); let pages = 0; const sample: string[] = [];
  for (const [id, f] of corpus()) {
    const sg = signaturesOf(f);
    if (Math.min(...ARCHETYPE_IDS.map((a) => sg[a].length)) < 5) continue;
    pages += 1; if (pages === 1) for (const a of ARCHETYPE_IDS) sample.push(`${id} ${a}: ${sg[a].join(",")}`);
    for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) { const k = `${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}`; sums.set(k, (sums.get(k) ?? 0) + diffCount(sg[ARCHETYPE_IDS[i]!], sg[ARCHETYPE_IDS[j]!])); }
  }
  setV5ArchetypeForTests(null); setDesignV5ForTests(false);
  return [...sums.entries()].map(([k, v]) => `${k} ${(v / pages).toFixed(2)}`).join("\n") + "\n" + sample.join("\n");
}
if (require.main === module && process.argv.includes("--table")) console.log(pairTable());
