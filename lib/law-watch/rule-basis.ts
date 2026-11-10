/**
 * 516 — 규칙 JSON(basis/source/law)에서 감시 대상 법령·고시 이름을 모은다.
 * 감시 목록과의 대응 검증용(네트워크 없음).
 */
import fs from "node:fs";
import path from "node:path";

/** 규칙에서 추출하는 정규 이름 */
export const RULE_INSTRUMENTS_516 = [
  "화장품법",
  "화장품법 시행령",
  "화장품법 시행규칙",
  "화장품 사용할 때의 주의사항 및 알레르기 유발성분 표시에 관한 규정",
  "화장품 표시·광고 실증에 관한 규정",
  "기능성화장품 기준 및 시험방법",
  "식약처 화장품 표시·광고 관리 지침",
  "화장품 표시·광고 관리 지침",
] as const;

export type RuleInstrumentHit = {
  name: string;
  files: string[];
};

function walkStrings(v: unknown, out: string[]): void {
  if (typeof v === "string") {
    out.push(v);
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) walkStrings(x, out);
    return;
  }
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (/^(basis|source|law|legal_basis|law_basis|source_primary)$/i.test(k) || k === "basis") {
        walkStrings(val, out);
      } else if (typeof val === "object") {
        walkStrings(val, out);
      }
    }
  }
}

export function collectRuleInstrumentHits516(
  dataDir = path.join(process.cwd(), "review", "data"),
): RuleInstrumentHit[] {
  const files = fs
    .readdirSync(dataDir)
    .filter(
      (f) =>
        f.endsWith(".json") &&
        !f.startsWith("legacy") &&
        f !== "law-watch-516.json" &&
        /kr|allergen|ad-|fix-suggest|rewrite/i.test(f),
    );

  const map = new Map<string, Set<string>>();
  for (const f of files) {
    let json: unknown;
    try {
      json = JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
    } catch {
      continue;
    }
    const strings: string[] = [];
    walkStrings(json, strings);
    const blob = strings.join("\n");
    for (const name of RULE_INSTRUMENTS_516) {
      if (blob.includes(name) || (name === "화장품법" && /화장품법(?!\s*시행)/.test(blob))) {
        // 화장품법은 시행령/시행규칙 문자열에도 포함되므로 별도 처리
        if (name === "화장품법") {
          if (/화장품법(?!\s*시행)/.test(blob)) {
            if (!map.has(name)) map.set(name, new Set());
            map.get(name)!.add(f);
          }
          continue;
        }
        if (!map.has(name)) map.set(name, new Set());
        map.get(name)!.add(f);
      }
    }
  }

  return [...map.entries()].map(([name, set]) => ({
    name,
    files: [...set].sort(),
  }));
}

/** 지침류 정규화 이름 */
export function isGuidelineInstrument516(name: string): boolean {
  return /표시·광고 관리 지침/.test(name);
}
