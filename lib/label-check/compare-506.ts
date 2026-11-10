/**
 * 506 — 재점검 비교(서버 무상태, 클라 priorKeys).
 */
import type { Finding } from "@/lib/label-check/types";

export function findingCompareKey506(f: Finding): string {
  const key = (f.checkKey || "").trim() || `lbl:${f.label}`;
  return `${key}||${f.label}`;
}

export function issueKeysFromFindings506(findings: Finding[]): string[] {
  return findings
    .filter((f) => f.status !== "pass")
    .map(findingCompareKey506);
}

/** priorKeys 길이·형식 검증. 실패 시 null */
export function validatePriorKeys506(raw: unknown): string[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  if (raw.length > 200) return null;
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") return null;
    const s = x.trim();
    if (!s || s.length > 240) return null;
    if (!s.includes("||")) return null;
    out.push(s);
  }
  return out;
}

export function compareIssueKeys506(
  prior: string[],
  current: string[],
): { resolved: string[]; remaining: string[]; added: string[] } {
  const priorSet = new Set(prior);
  const curSet = new Set(current);
  const resolved: string[] = [];
  const remaining: string[] = [];
  const added: string[] = [];
  for (const k of priorSet) {
    if (curSet.has(k)) remaining.push(k);
    else resolved.push(k);
  }
  for (const k of curSet) {
    if (!priorSet.has(k)) added.push(k);
  }
  return { resolved, remaining, added };
}
