/**
 * 회귀 — 470차 "대격변". 브라우저·네트워크 없음(문자열 렌더만). 단계마다 검사를 더한다.
 *  A: 페이지 레시피(쌍 차이 ≥ 3, 하드 제약: 히어로 첫째·비이동 섹션 자리/종류 불변·V5 토큰 뒤에서만)
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { MOVABLE_FAMILIES, RECIPES, setRecipeOffForTests } from "../../lib/page-recipe-v5";
import { structureKey } from "../../lib/layout-variants";

/** 변형은 빼고 종류·계열만(장면 승격이 변형만 바꾼다) */
const fam = (s: Parameters<typeof structureKey>[0]): string => structureKey(s).replace(/\.(?:scene|band|rule|quote|ticker)$/, "").replace(/^(statement)\..*$/, "$1");
import { corpus, displayOf } from "../design-corpus";
import { pairStats } from "../recipe-metrics-470";

export const name = "대격변 470 — 페이지 레시피·(이후: 장면·거대 타이포·콜아웃·일반 섹션 변형)";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // ── A: 소스 잠금
  const lv = fs.readFileSync("lib/layout-variants.ts", "utf8");
  if (!/const recipe = ctx\.v5 \? applyRecipeV5\(/.test(lv) || !/const derun = ctx\.v5 \? derunV5\(/.test(lv)) f.push("레시피/derun이 ctx.v5(V5 토큰, 편집 모드면 null) 뒤에서만 호출되지 않음");
  for (const a of ARCHETYPE_IDS) {
    if (new Set(RECIPES[a]).size !== RECIPES[a].length || RECIPES[a].some((x) => !MOVABLE_FAMILIES.has(x))) f.push(`${a}: 레시피 순환표가 이동 가능 계열 7종의 순열이 아님`);
  }
  // ── A1: 쌍 차이
  const ps = pairStats();
  if (ps.pages < 8) f.push(`이동 가능 5개+ 페이지가 ${ps.pages}개뿐`);
  if (ps.min < 3) f.push(`가장 가까운 아키타입 쌍 ${ps.worst} 평균 불일치 ${ps.min.toFixed(2)} < 3`);
  // ── A2: 하드 제약 — 비이동 섹션의 자리·종류는 레시피 유무와 같다, 히어로 첫째
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [id, file] of corpus()) {
      setRecipeOffForTests(true);
      const off = displayOf(file).sections;
      setRecipeOffForTests(false);
      const on = displayOf(file).sections;
      if (on.length !== off.length) { f.push(`${id}/${a}: 섹션 수가 달라짐 ${off.length}→${on.length}`); continue; }
      if (on[0]!.type !== "hero") f.push(`${id}/${a}: 히어로가 첫째가 아님`);
      const movable = (s: (typeof on)[number]): boolean => s.type === "impact" && s.kind === "v4" && !!s.v4 && MOVABLE_FAMILIES.has(s.v4.family);
      on.forEach((s, i) => { if (!movable(off[i]!) && (movable(s) || fam(s) !== fam(off[i]!))) f.push(`${id}/${a}: 비이동 자리 ${i}가 바뀜 ${fam(off[i]!)}→${fam(s)}`); });
      const key = (arr: typeof on) => arr.filter(movable).map((s) => `${s.type === "impact" ? s.origin?.type ?? s.v4!.family : ""}`).sort().join(",");
      if (key(on) !== key(off)) f.push(`${id}/${a}: 이동 가능 블록의 집합이 달라짐(블록이 사라지거나 늘었다)`);
    }
  }
  setRecipeOffForTests(false);
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
