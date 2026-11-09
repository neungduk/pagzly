/**
 * 500 — 미국 광고 표현 스캔(초안 JSON).
 * 항목 제목 단위 확인 필요 1건, 찾은 표현 최대 3개. 단정 표현 쓰지 않음.
 */
import fs from "node:fs";
import path from "node:path";
import { formatFoundSnippet } from "@/lib/label-check/format-found";
import { includesUsWord, normalizeUsLabelText } from "@/lib/label-check/normalize-us";
import type { Finding } from "@/lib/label-check/types";

export type UsAdPhraseItem = {
  id: string;
  category: string;
  title_ko: string;
  patterns: string[];
  condition: string;
  needs_evidence: boolean;
  severity: string;
  fix_ko?: string;
  fix_example_en?: string;
};

type UsAdFile = {
  items: UsAdPhraseItem[];
};

const EVIDENCE_LINE_500 =
  "근거 자료(인체적용시험 등)가 필요한 표현일 수 있어요";

let cached: UsAdPhraseItem[] | null = null;

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadUsAdPhrases500(): UsAdPhraseItem[] {
  if (cached) return cached;
  const raw = fs.readFileSync(dataPath("us-ad-phrases_draft_v0.1.json"), "utf8");
  const parsed = JSON.parse(raw) as UsAdFile;
  cached = (parsed.items || []).filter(
    (i) => i?.title_ko && Array.isArray(i.patterns) && i.patterns.length,
  );
  return cached;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Ingredients … 다음 헤더 전까지 마스킹(성분명 Growth factor 등 오탐 완화) */
export function buildUsAdScanText(text: string): string {
  const t = normalizeUsLabelText(text);
  const m = t.match(/\bingredients\b\s*:?/);
  if (!m || m.index == null) return t;
  const start = m.index;
  const after = t.slice(start + m[0].length);
  const endKeys = [
    "directions",
    "warnings",
    "warning",
    "caution",
    "net wt",
    "net weight",
    "distributed by",
    "manufactured",
    "made in",
    "drug facts",
    "uses",
    "other information",
  ];
  let cut = after.length;
  for (const k of endKeys) {
    const idx = after.search(new RegExp(`\\b${escapeRegExp(k)}\\b`));
    if (idx >= 0 && idx < cut) cut = idx;
  }
  const end = start + m[0].length + cut;
  return t.slice(0, start) + " ".repeat(Math.max(0, end - start)) + t.slice(end);
}

/**
 * 단일 토큰: 497 단어경계+굴절.
 * 길이≥8 접두(예: regenerat→regeneration)만 추가 허용 — treat(5)·prevent(7)는 제외.
 */
export function usAdPatternHits(scanText: string, pattern: string): boolean {
  const n = normalizeUsLabelText(pattern);
  if (!n) return false;
  if (n.includes(" ") || n.includes("-")) {
    return scanText.includes(n);
  }
  if (includesUsWord(scanText, n)) return true;
  if (n.length >= 8) {
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(n)}[a-z]{1,16}(?![a-z0-9])`, "i");
    return re.test(scanText);
  }
  return false;
}

function collectHits(scanText: string, patterns: string[]): string[] {
  const sorted = [...patterns].sort((a, b) => b.length - a.length);
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const pat of sorted) {
    if (!usAdPatternHits(scanText, pat)) continue;
    const key = normalizeUsLabelText(pat);
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(pat);
    if (hits.length >= 3) break;
  }
  return hits;
}

export function scanUsAdPhrases500(text: string): Finding[] {
  const items = loadUsAdPhrases500();
  const scan = buildUsAdScanText(text);
  const findings: Finding[] = [];

  for (const item of items) {
    const hits = collectHits(scan, item.patterns);
    if (!hits.length) continue;

    const snippets = hits.map((h) => formatFoundSnippet(text, h));
    const found = snippets.join(" · ");
    const evidence = Boolean(item.needs_evidence);

    findings.push({
      category: item.category,
      label: item.title_ko,
      status: "attention",
      found,
      suggest: evidence ? EVIDENCE_LINE_500 : "오인 우려 표현인지 확인하세요.",
      checkType: "code",
      fixSuggestion: evidence
        ? EVIDENCE_LINE_500
        : item.fix_ko?.trim() || undefined,
      fixExample: evidence ? undefined : item.fix_example_en?.trim() || undefined,
      fixKind: evidence ? "evidence" : "soften",
    });
  }

  return findings;
}
