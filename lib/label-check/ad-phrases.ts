/**
 * 504 — 광고 표현 스캔(식약처 지침 기반 ad-phrases-kr_draft_v0.2).
 * 단어 일치만으로 단정하지 않음 → status는 attention(확인 필요)만.
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import { formatFoundSnippet } from "@/lib/label-check/format-found";
import type { Finding, FixKind, LabelCheckInput } from "@/lib/label-check/types";

export type AdPhraseItem = {
  id: string;
  kind?: string;
  category?: string;
  title: string;
  patterns: string[];
  regex_patterns?: string[];
  condition: "always" | "non_functional" | string;
  needs_evidence: boolean;
  severity: string;
  fix_ko?: string;
  fix_kind?: FixKind | string;
  exception_note?: string;
  law_basis?: string;
};

type AdPhraseFile = {
  meta?: {
    matching_notes?: string[];
    notes?: string[];
    evidence_requirements?: {
      points_ko?: string[];
      source?: string;
    };
  };
  items: AdPhraseItem[];
};

let cachedFile: AdPhraseFile | null = null;

/** ReDoS 완화: 정규식 적용 전 스캔 문자열 상한 */
export const AD_REGEX_SCAN_MAX_CHARS_504 = 80_000;

const EVIDENCE_LINE =
  "근거 자료(인체적용시험 등)가 필요한 표현일 수 있어요";
const FUNCTIONAL_SCOPE_LINE =
  "기능성화장품 심사·보고 범위 내인지 확인하세요.";

/**
 * 짧은 영문·기호 패턴 — 단어 경계 검사(497·504).
 */
const BOUNDARY_PATTERNS = new Set(
  [
    "無",
    "100%",
    "1위",
    "no.1",
    "natural",
    "organic",
    "vegan",
    "detox",
    "free",
    "spf",
    "프리",
  ].map((p) => normalizeLabelText(p)),
);

let cached: AdPhraseItem[] | null = null;
let regionMaskOk = true;
const compiledRegex = new Map<string, RegExp | null>();

export function adPhraseRegionMaskOk(): boolean {
  return regionMaskOk;
}

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

function loadAdPhraseFile504(): AdPhraseFile {
  if (cachedFile) return cachedFile;
  const raw = fs.readFileSync(dataPath("ad-phrases-kr_draft_v0.2.json"), "utf8");
  cachedFile = JSON.parse(raw) as AdPhraseFile;
  return cachedFile;
}

export function loadAdPhrases493(): AdPhraseItem[] {
  if (cached) return cached;
  const parsed = loadAdPhraseFile504();
  cached = (parsed.items || []).filter(
    (i) =>
      i?.title &&
      (Array.isArray(i.patterns) || Array.isArray(i.regex_patterns)),
  );
  return cached;
}

/**
 * 505 — 실증 체크포인트(상위 N줄). 법적 충족 판정 금지, 안내만.
 */
export function loadEvidenceCheckpoints505(limit = 3): string[] {
  const points = loadAdPhraseFile504().meta?.evidence_requirements?.points_ko || [];
  return points.filter((p) => typeof p === "string" && p.trim()).slice(0, limit);
}

/** 테스트용 캐시 리셋 */
export function resetAdPhrasesCache504(): void {
  cached = null;
  cachedFile = null;
  compiledRegex.clear();
}

export function categoryFromAdKind504(kind: string | undefined, fallback?: string): string {
  if (fallback && !kind) return fallback;
  switch (kind) {
    case "prohibited":
      return "광고·금지";
    case "prohibited_unless_functional_or_evidenced":
      return "광고·기능성·실증";
    case "prohibited_unless_evidenced":
      return "광고·실증";
    case "evidence_required":
      return "광고·실증";
    default:
      return "광고 표현";
  }
}

export function isAdFindingCategory504(category: string): boolean {
  return category.startsWith("광고");
}

function findNormRegion(
  norm: string,
  startKeys: string[],
  endKeys: string[],
): { start: number; end: number } | null {
  let start = -1;
  let startKeyLen = 0;
  for (const k of startKeys) {
    const nk = normalizeLabelText(k);
    if (!nk) continue;
    const idx = norm.indexOf(nk);
    if (idx >= 0 && (start < 0 || idx < start)) {
      start = idx;
      startKeyLen = nk.length;
    }
  }
  if (start < 0) return null;
  let end = norm.length;
  for (const k of endKeys) {
    const nk = normalizeLabelText(k);
    if (!nk) continue;
    const idx = norm.indexOf(nk, start + startKeyLen);
    if (idx >= 0 && idx < end) end = idx;
  }
  return { start, end };
}

function maskRange(norm: string, start: number, end: number): string {
  if (start < 0 || end <= start) return norm;
  return norm.slice(0, start) + "#".repeat(end - start) + norm.slice(end);
}

export function buildAdScanNorm(text: string): string {
  const norm = normalizeLabelText(text);
  regionMaskOk = true;
  let scan = norm;

  const ing = findNormRegion(
    scan,
    ["전성분", "ingredients"],
    [
      "사용할때의주의사항",
      "주의사항",
      "내용량",
      "제조번호",
      "사용기한",
      "개봉후",
      "가격",
      "바코드",
      "화장품책임판매업자",
      "책임판매업자",
      "제조국",
      "제조업자",
      "사용방법",
    ],
  );
  if (ing) {
    scan = maskRange(scan, ing.start, ing.end);
  } else {
    regionMaskOk = false;
  }

  const caution = findNormRegion(
    scan,
    ["사용할때의주의사항", "주의사항"],
    [
      "전성분",
      "ingredients",
      "내용량",
      "제조번호",
      "사용기한",
      "개봉후",
      "가격",
      "바코드",
      "화장품책임판매업자",
      "책임판매업자",
      "제조국",
      "사용방법",
      "화장품의명칭",
    ],
  );
  if (caution) {
    scan = maskRange(scan, caution.start, caution.end);
  }

  return scan;
}

function isBoundaryChar(ch: string | undefined): boolean {
  if (!ch) return true;
  return !/[0-9a-zA-Z가-힣%]/.test(ch);
}

function patternHitsInScan(scanNorm: string, pattern: string): boolean {
  const p = normalizeLabelText(pattern);
  if (!p) return false;
  let from = 0;
  while (from <= scanNorm.length) {
    const idx = scanNorm.indexOf(p, from);
    if (idx < 0) return false;
    if (!BOUNDARY_PATTERNS.has(p)) return true;
    const before = idx > 0 ? scanNorm[idx - 1] : undefined;
    const after = idx + p.length < scanNorm.length ? scanNorm[idx + p.length] : undefined;
    if (p === normalizeLabelText("100%") && before && /[0-9.]/.test(before)) {
      from = idx + 1;
      continue;
    }
    if (isBoundaryChar(before) && isBoundaryChar(after)) return true;
    from = idx + 1;
  }
  return false;
}

function getCompiledRegex(src: string): RegExp | null {
  if (compiledRegex.has(src)) return compiledRegex.get(src)!;
  try {
    // 단순성: 길이·역참조 과다 시 거부
    if (src.length > 120 || /\(.*\+.*\)[+*]|\(\?[^)]{40,}/.test(src)) {
      compiledRegex.set(src, null);
      return null;
    }
    const re = new RegExp(src, "iu");
    compiledRegex.set(src, re);
    return re;
  } catch {
    compiledRegex.set(src, null);
    return null;
  }
}

function regexHitsInScan(scanNorm: string, pattern: string): string | null {
  const re = getCompiledRegex(pattern);
  if (!re) return null;
  const slice =
    scanNorm.length > AD_REGEX_SCAN_MAX_CHARS_504
      ? scanNorm.slice(0, AD_REGEX_SCAN_MAX_CHARS_504)
      : scanNorm;
  const m = slice.match(re);
  return m?.[0] ?? null;
}

function collectHits(
  scanNorm: string,
  patterns: string[],
  regexPatterns: string[],
): string[] {
  const sorted = [...patterns].sort((a, b) => b.length - a.length);
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const pat of sorted) {
    if (!patternHitsInScan(scanNorm, pat)) continue;
    const key = normalizeLabelText(pat);
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(pat);
    if (hits.length >= 3) break;
  }
  if (hits.length < 3) {
    for (const rp of regexPatterns) {
      const h = regexHitsInScan(scanNorm, rp);
      if (!h) continue;
      const key = normalizeLabelText(h);
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(h);
      if (hits.length >= 3) break;
    }
  }
  return hits;
}

export function isHitCoveredByAdPhrases493(hit: string): boolean {
  const n = normalizeLabelText(hit);
  if (!n) return false;
  for (const item of loadAdPhrases493()) {
    for (const p of item.patterns || []) {
      const pn = normalizeLabelText(p);
      if (!pn) continue;
      if (n === pn || n.includes(pn)) return true;
    }
  }
  return false;
}

export function scanAdPhrases493(text: string, input: LabelCheckInput): Finding[] {
  const items = loadAdPhrases493();
  const scanNorm = buildAdScanNorm(text);
  const findings: Finding[] = [];

  for (const item of items) {
    const loweredFunctional =
      item.condition === "non_functional" && input.functional;
    // functional 체크 시 non_functional: 생략하지 않고 안내로 낮춤(504 notes)
    const hits = collectHits(scanNorm, item.patterns || [], item.regex_patterns || []);
    if (!hits.length) continue;

    const snippets = hits.map((h) => formatFoundSnippet(text, h));
    const found = snippets.join(" · ");
    const fixKo = String(item.fix_ko || "").trim();
    const fixKind = (item.fix_kind as FixKind | undefined) || undefined;
    let suggest = fixKo
      ? fixKo
      : item.needs_evidence
        ? EVIDENCE_LINE
        : "오인 우려 표현인지 확인하세요.";
    if (loweredFunctional) {
      suggest = FUNCTIONAL_SCOPE_LINE;
    }

    findings.push({
      category: categoryFromAdKind504(item.kind, item.category),
      label: item.title,
      status: "attention",
      found,
      suggest,
      checkType: "code",
      fixSuggestion: loweredFunctional ? FUNCTIONAL_SCOPE_LINE : fixKo || undefined,
      fixKind: loweredFunctional ? "evidence" : fixKind,
      exceptionNote: item.exception_note?.trim() || undefined,
    });
  }

  return findings;
}
