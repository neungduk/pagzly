/**
 * 493 — 광고 표현 패턴 스캔(협회 해설서 초안 JSON).
 * 단어 일치만으로 위반을 단정하지 않음 → status는 attention(확인 필요)만.
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import { formatFoundSnippet } from "@/lib/label-check/format-found";
import type { Finding, LabelCheckInput } from "@/lib/label-check/types";

export type AdPhraseItem = {
  id: string;
  category: string;
  title: string;
  patterns: string[];
  condition: "always" | "non_functional" | string;
  needs_evidence: boolean;
  severity: string;
};

type AdPhraseFile = {
  meta?: { matching_notes?: string[] };
  items: AdPhraseItem[];
};

const EVIDENCE_LINE =
  "근거 자료(인체적용시험 등)가 필요한 표현일 수 있어요";

/**
 * 경계 검사가 필요한 모호 패턴만(데이터 matching_notes·오탐 시험 기준).
 * 기미·치료·아토피 등은 라벨에서 붙여 쓰이므로 부분일치 허용.
 */
const BOUNDARY_PATTERNS = new Set(
  ["無", "100%", "1위", "no.1", "natural", "organic", "vegan", "detox"].map((p) =>
    normalizeLabelText(p),
  ),
);

let cached: AdPhraseItem[] | null = null;
let regionMaskOk = true;

export function adPhraseRegionMaskOk(): boolean {
  return regionMaskOk;
}

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadAdPhrases493(): AdPhraseItem[] {
  if (cached) return cached;
  const raw = fs.readFileSync(dataPath("ad-phrases-kr_draft_v0.1.json"), "utf8");
  const parsed = JSON.parse(raw) as AdPhraseFile;
  cached = (parsed.items || []).filter((i) => i?.title && Array.isArray(i.patterns));
  return cached;
}

/** 정규화 문자열에서 구간 [start,end) 찾기 */
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

/**
 * 전성분·주의사항 영역을 #으로 가린 정규화 텍스트.
 * 영역 시작 키를 못 찾으면 원문 정규화본을 그대로 쓰고 regionMaskOk=false.
 */
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
    // 전성분 라벨 없음 → 마스킹 불가(스캔은 유지, 한계는 notes)
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
  // 한글·영숫자·% 연속이면 경계 아님
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
    // 100%: 앞에 숫자·점이 이어지면(예: 99.100%) 스킵. 성분 영역은 마스킹으로 제외.
    if (p === normalizeLabelText("100%") && before && /[0-9.]/.test(before)) {
      from = idx + 1;
      continue;
    }
    if (isBoundaryChar(before) && isBoundaryChar(after)) return true;
    from = idx + 1;
  }
  return false;
}

function collectHits(scanNorm: string, patterns: string[]): string[] {
  // 긴 패턴 우선 → 중복 짧은 히트 감소
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
  return hits;
}

/**
 * KR-ADV 히트가 ad-phrases의 **동일·하위 패턴**이면 중복.
 * 더 긴 ad 패턴이 짧은 히트를 포함한다고 덮지 않음(예: '피부장벽' ≠ '피부장벽 기능을 회복').
 */
export function isHitCoveredByAdPhrases493(hit: string): boolean {
  const n = normalizeLabelText(hit);
  if (!n) return false;
  for (const item of loadAdPhrases493()) {
    for (const p of item.patterns) {
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
    if (item.condition === "non_functional" && input.functional) {
      // 기능성 체크 시 non_functional 항목은 이번 차수에서 생략(notes 기록)
      continue;
    }
    const hits = collectHits(scanNorm, item.patterns);
    if (!hits.length) continue;

    const snippets = hits.map((h) => formatFoundSnippet(text, h));
    const found = snippets.join(" · ");
    const suggest = item.needs_evidence ? EVIDENCE_LINE : "오인 우려 표현인지 확인하세요.";

    findings.push({
      category: item.category,
      label: item.title,
      status: "attention",
      found,
      suggest,
      checkType: "code",
    });
  }

  return findings;
}
