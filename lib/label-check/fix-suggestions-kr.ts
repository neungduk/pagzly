/**
 * 496 — 한국 수정 제안 초안 로드·finding 부착.
 * 규칙/광고 JSON은 수정하지 않음.
 */
import fs from "node:fs";
import path from "node:path";
import { isAdFindingCategory504 } from "@/lib/label-check/ad-phrases";
import type { Finding, FixKind } from "@/lib/label-check/types";
export { fixKindHeading496 } from "@/lib/label-check/fix-kind-label";

export type KrFixSuggestion = {
  fix_kind: FixKind;
  fix_ko: string;
  fix_example?: string;
};

type FileShape = {
  suggestions: Record<string, KrFixSuggestion>;
};

let cached: Record<string, KrFixSuggestion> | null = null;
let labelToIdCache: Map<string, string> | null = null;

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadKrFixSuggestions496(): Record<string, KrFixSuggestion> {
  if (cached) return cached;
  const raw = fs.readFileSync(dataPath("fix-suggestions-kr_draft_v0.1.json"), "utf8");
  const parsed = JSON.parse(raw) as FileShape;
  cached = parsed.suggestions || {};
  return cached;
}

/** 화면 라벨(title) → 제안 id. AD 제목이 KR-ADV와 겹치면 AD 우선. */
export function buildKrLabelToFixIdMap(): Map<string, string> {
  if (labelToIdCache) return labelToIdCache;
  const map = new Map<string, string>();

  const kr = JSON.parse(fs.readFileSync(dataPath("kr_label_rules_draft_v0.1.json"), "utf8")) as {
    rules: Array<{ id: string; title: string }>;
  };
  for (const r of kr.rules || []) {
    if (r.title) map.set(r.title, r.id);
  }

  // 504: v0.2 제목→id(항목 fix_ko가 우선이므로 맵은 보조용)
  const ad = JSON.parse(fs.readFileSync(dataPath("ad-phrases-kr_draft_v0.2.json"), "utf8")) as {
    items: Array<{ id: string; title: string }>;
  };
  for (const i of ad.items || []) {
    if (i.title) map.set(i.title, i.id);
  }

  labelToIdCache = map;
  return map;
}

/** 커버리지: 규칙표(비 PEND) + ad-phrases id 가 제안에 있는지 */
export function krFixSuggestionCoverage496(): { missing: string[]; extra: string[]; required: string[] } {
  const sug = loadKrFixSuggestions496();
  const keys = Object.keys(sug);

  const kr = JSON.parse(fs.readFileSync(dataPath("kr_label_rules_draft_v0.1.json"), "utf8")) as {
    rules: Array<{ id: string }>;
  };
  // 504: 광고는 항목 fix_ko 사용 → 커버리지에서 MFDS 제외. KR 규칙 + (참고) v0.1 AD-* 잔여만.
  const required = (kr.rules || []).map((r) => r.id).filter((id) => !id.startsWith("KR-PEND-"));
  const missing = required.filter((id) => !keys.includes(id));
  const extra = keys.filter((id) => !required.includes(id) && !id.startsWith("KR-PEND-") && !id.startsWith("AD-") && !id.startsWith("MFDS-"));
  return { missing, extra, required };
}

/**
 * fix_ko 있는 항목만 제안 필드 채움. 없으면 제안 필드 제거(빈 영역 금지).
 */
export function applyKrFixSuggestions496(findings: Finding[]): Finding[] {
  const sug = loadKrFixSuggestions496();
  const byLabel = buildKrLabelToFixIdMap();

  return findings.map((f) => {
    // 504: 광고·별표4 보강이 채운 fix_ko만 유지(임의 잔여 제안은 제거)
    if (
      f.fixSuggestion?.trim() &&
      (isAdFindingCategory504(f.category) || f.category === "표시사항" || f.category === "주의사항")
    ) {
      return f;
    }
    const id = byLabel.get(f.label);
    const s = id ? sug[id] : undefined;
    if (!s || !String(s.fix_ko || "").trim()) {
      return {
        ...f,
        fixSuggestion: undefined,
        fixExample: undefined,
        fixKind: undefined,
      };
    }
    const example = String(s.fix_example || "").trim();
    return {
      ...f,
      fixSuggestion: s.fix_ko.trim(),
      fixExample: example || undefined,
      fixKind: s.fix_kind,
    };
  });
}
