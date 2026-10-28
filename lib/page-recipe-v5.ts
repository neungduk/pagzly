/**
 * 470차 V5 — 아키타입별 페이지 레시피. 블록 모양·색은 달라도 스크롤 골격(소개→특징→정보→후기)이 같아 "같은 틀에 색만 바꾼 것"으로 보였다.
 * 레시피는 계열(family) 순환표다: 이동 가능한 v4 블록을 아키타입 순환표 순서로 다시 늘어놓는다(같은 계열이 이어지지 않게). 새 글자 없음 — 블록을 옮길 뿐이다.
 *
 * 하드 제약(코드 상수):
 *  - 이동 대상은 `MOVABLE_FAMILIES` 계열의 v4 블록뿐. 접점(touch)·띠(statement)·숨 고르기(breather)·스펙·FAQ·단계·기존 임팩트·일반 섹션·히어로·구매 카드·고지는 **제자리**다.
 *  - 이동 대상 자리(index)는 그대로 두고 그 자리를 차지한 블록만 바꾼다 → 접점(TOUCH_AT)·고지·구매 카드·히어로 위치가 변하지 않는다.
 *  - 앞쪽 `PINNED_LEAD`개 자리(한눈에 보기 혜택)는 옮기지 않는다 — 첫 3화면 규칙. 고민(hook) 블록은 레시피 순서를 따른다(필수 고지·히어로 위치와 무관).
 * `ctx.v5`(V5 켜짐·편집 모드 아님) 뒤에서만 호출된다.
 */
import type { DetailSection } from "@/lib/types/generate";
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import { intrinsicStrength } from "@/lib/storyboard-v5";

export const MOVABLE_FAMILIES = new Set(["benefits", "concern", "story", "phototext", "proof", "stats", "gallery"]);
export const PINNED_LEAD = 1;

/** 순환표는 코퍼스 21페이지에서 28쌍의 쌍 평균 불일치가 최대가 되도록 탐색한 값(결정적 상수; 탐색 스크립트는 커밋하지 않음) */
export const RECIPES: Record<ArchetypeId, string[]> = {
  editorial: ["story","stats","proof","concern","phototext","benefits","gallery"],
  catalog: ["gallery","story","phototext","proof","benefits","concern","stats"],
  softlife: ["phototext","proof","concern","story","benefits","gallery","stats"],
  impact: ["stats","story","concern","phototext","proof","gallery","benefits"],
  techsheet: ["proof","gallery","benefits","stats","story","concern","phototext"],
  narrative: ["story","phototext","stats","benefits","gallery","proof","concern"],
  luxe: ["stats","benefits","phototext","gallery","concern","proof","story"],
  pop: ["gallery","concern","story","phototext","stats","benefits","proof"],
};

/** 아키타입별 장면 위치(페이지 높이 비율) — 리듬 시퀀스: 큰 장면(L)이 오는 자리. 개수는 강도(5→3·4→2·3→1)가 정한다 */
export const SCENE_AT_BY_ARCHETYPE: Record<ArchetypeId, number[]> = {
  editorial: [0.45], catalog: [0.3, 0.7], softlife: [0.25, 0.65], impact: [0.22, 0.5, 0.85],
  techsheet: [0.4], narrative: [0.3, 0.72], luxe: [0.5], pop: [0.28, 0.55, 0.88],
};

const famOf = (s: DetailSection): string | null => (s.type === "impact" && s.kind === "v4" && s.v4 && MOVABLE_FAMILIES.has(s.v4.family) ? s.v4.family : null);

/** 이동 가능한 자리의 계열 시퀀스(시그니처 계산용) */
export function movableSignature(sections: DetailSection[]): string[] {
  return sections.map(famOf).filter((x): x is string => !!x);
}

/** 시험용: 레시피를 끄고(469차 순서) 기준선을 잰다 */
let recipeOff = false;
export function setRecipeOffForTests(off: boolean): void { recipeOff = off; }

export function applyRecipeV5(sections: DetailSection[], idx: number[], id: ArchetypeId): { sections: DetailSection[]; sourceIndexes: number[] } {
  if (recipeOff) return { sections, sourceIndexes: idx };
  const slots = sections.map((s, i) => (famOf(s) ? i : -1)).filter((i) => i >= 0);
  const free = slots.slice(PINNED_LEAD);
  if (free.length < 3) return { sections, sourceIndexes: idx };
  const pool = free.map((i) => i);
  const recipe = RECIPES[id];
  const out = [...sections];
  const outIdx = [...idx];
  let prev = famOf(sections[slots[PINNED_LEAD - 1] ?? slots[0]!]!) ?? "";
  const high = (x: DetailSection | undefined): boolean => !!x && intrinsicStrength(x) >= 4;
  const movableAt = new Set(slots);
  free.forEach((slot, k) => {
    const want = recipe[k % recipe.length]!;
    // 강도 4 이상 블록이 세 개 이어지지 않게(곡선 규칙): 앞 두 자리(이미 확정) 또는 앞 한 자리 + 뒤 고정 섹션과 합쳐 3연속이 되는 후보는 건너뛴다
    const ok = (p: number): boolean => {
      const c = sections[p]!;
      if (!high(c)) return true;
      const a = out[slot - 1]; const b = out[slot - 2]; const n1 = movableAt.has(slot + 1) ? undefined : sections[slot + 1];
      return !((high(a) && high(b)) || (high(a) && high(n1)));
    };
    let pick = pool.findIndex((p) => famOf(sections[p]!) === want && want !== prev && ok(p));
    if (pick < 0) pick = pool.findIndex((p) => famOf(sections[p]!) !== prev && ok(p));
    if (pick < 0) pick = pool.findIndex((p) => ok(p));
    if (pick < 0) pick = 0;
    const from = pool.splice(pick, 1)[0]!;
    out[slot] = sections[from]!;
    outIdx[slot] = idx[from]!;
    prev = famOf(sections[from]!) ?? "";
  });
  return { sections: out, sourceIndexes: outIdx };
}

/** 강도 4 이상이 세 개 이어지는 자리 수 */
function highRuns(secs: DetailSection[]): number {
  const h = secs.map((x) => intrinsicStrength(x) >= 4);
  let n = 0;
  for (let i = 0; i + 2 < h.length; i += 1) if (h[i] && h[i + 1] && h[i + 2]) n += 1;
  return n;
}

/**
 * 레시피·장면 승격이 끝난 최종 순서에서 "높음 3연속"을 줄인다(곡선 규칙). 이동 가능한 블록끼리만, 장면(variant scene)은 옮기지 않고, 한 번 바꿀 때마다 3연속 수가 줄어드는 교환만 한다(최대 12회).
 * 결정적: 앞쪽 3연속부터, 교환 후보는 뒤쪽부터가 아니라 앞에서부터 처음 맞는 것.
 */
export function derunV5(sections: DetailSection[], idx: number[]): { sections: DetailSection[]; sourceIndexes: number[] } {
  let S = [...sections];
  let I = [...idx];
  const isScene = (x: DetailSection): boolean => x.type === "impact" && x.v4?.variant === "scene";
  const free = (i: number): boolean => !!famOf(S[i]!) && !isScene(S[i]!) && i > 0;
  for (let guard = 0; guard < 12; guard += 1) {
    const cur = highRuns(S);
    if (cur === 0) break;
    let done = false;
    for (let i = 0; i < S.length && !done; i += 1) {
      if (!free(i) || intrinsicStrength(S[i]!) < 4) continue;
      for (let j = 0; j < S.length && !done; j += 1) {
        if (j === i || !free(j) || intrinsicStrength(S[j]!) >= 4) continue;
        const T = [...S]; [T[i], T[j]] = [T[j]!, T[i]!];
        if (highRuns(T) < cur) {
          const U = [...I]; [U[i], U[j]] = [U[j]!, U[i]!];
          S = T; I = U; done = true;
        }
      }
    }
    if (!done) break;
  }
  return { sections: S, sourceIndexes: I };
}
