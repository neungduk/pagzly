/**
 * 506 — 한국 광고 예외 규칙(문장 단위). 확정 금지 — "해당할 수 있어요" 수준.
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import {
  PRODUCT_TYPE_COLOR_MAKEUP_506,
  type LabelCheckInput,
} from "@/lib/label-check/types";

export type AdExceptionRule506 = {
  id: string;
  target_id: string;
  pattern?: string;
  pattern_any?: string[];
  requires_all_in_sentence?: string[];
  requires_any_in_sentence?: string[];
  forbid_in_sentence?: string[];
  product_condition?: string;
  result: "not_applicable" | "exception_possible" | "evidence_required" | "needs_disclaimer" | string;
  text_ko: string;
  source?: string;
};

let cached: AdExceptionRule506[] | null = null;

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadAdExceptionsKr506(): AdExceptionRule506[] {
  if (cached) return cached;
  const raw = fs.readFileSync(dataPath("ad-exceptions-kr_draft_v0.1.json"), "utf8");
  const json = JSON.parse(raw) as { rules?: AdExceptionRule506[] };
  cached = (json.rules || []).filter((r) => r?.id && r?.target_id);
  return cached;
}

export function resetAdExceptionsCache506() {
  cached = null;
}

/** 마침표·느낌표·물음표·줄바꿈 기준 문장 분할(원문 인덱스 유지) */
export function splitSentences506(text: string): Array<{ text: string; start: number }> {
  const out: Array<{ text: string; start: number }> = [];
  const re = /[^.!?\n]+[.!?\n]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const chunk = m[0];
    if (!chunk.trim()) continue;
    out.push({ text: chunk, start: m.index });
  }
  if (!out.length && text.trim()) out.push({ text, start: 0 });
  return out;
}

export function sentenceContainingHit506(text: string, hit: string): string {
  const sentences = splitSentences506(text);
  const nHit = normalizeLabelText(hit);
  for (const s of sentences) {
    if (nHit && normalizeLabelText(s.text).includes(nHit)) return s.text.trim();
    if (hit && s.text.includes(hit)) return s.text.trim();
  }
  // 폴백: hit 주변 120자
  const idx = text.indexOf(hit);
  if (idx < 0) return text.slice(0, 160).trim();
  const a = Math.max(0, idx - 40);
  const b = Math.min(text.length, idx + hit.length + 80);
  return text.slice(a, b).trim();
}

function hasAll(normSentence: string, keys: string[] | undefined): boolean {
  if (!keys?.length) return true;
  return keys.every((k) => {
    const nk = normalizeLabelText(k);
    return nk.length > 0 && normSentence.includes(nk);
  });
}

function hasAny(normSentence: string, keys: string[] | undefined): boolean {
  if (!keys?.length) return true;
  return keys.some((k) => {
    const nk = normalizeLabelText(k);
    return nk.length > 0 && normSentence.includes(nk);
  });
}

function hasNone(normSentence: string, keys: string[] | undefined): boolean {
  if (!keys?.length) return true;
  return keys.every((k) => {
    const nk = normalizeLabelText(k);
    return !nk || !normSentence.includes(nk);
  });
}

function patternMatchesHit(rule: AdExceptionRule506, hit: string, sentenceNorm: string): boolean {
  if (rule.pattern) {
    const np = normalizeLabelText(rule.pattern);
    const nh = normalizeLabelText(hit);
    if (np && (nh.includes(np) || sentenceNorm.includes(np))) return true;
  }
  if (rule.pattern_any?.length) {
    for (const p of rule.pattern_any) {
      const np = normalizeLabelText(p);
      const nh = normalizeLabelText(hit);
      if (np && (nh.includes(np) || sentenceNorm.includes(np))) return true;
    }
  }
  // pattern 없으면 target 규칙 전체 후보
  if (!rule.pattern && !rule.pattern_any?.length) return true;
  return false;
}

function isColorMakeupSelected(input: LabelCheckInput): boolean {
  const types = input.productTypes || [];
  if (types.includes(PRODUCT_TYPE_COLOR_MAKEUP_506)) return true;
  if (types.includes("color")) return true;
  return false;
}

function needsColorProduct(rule: AdExceptionRule506): boolean {
  return Boolean(rule.product_condition && /색조/.test(rule.product_condition));
}

export type ExceptionEval506 = {
  rule: AdExceptionRule506;
  /** 조건 충족 */
  matched: boolean;
  /** 색조 조건인데 유형 미입력 → 낮추지 않고 안내만 */
  pendingProductType?: boolean;
};

export function evaluateExceptionsForHit506(
  targetId: string,
  hit: string,
  sentence: string,
  input: LabelCheckInput,
): ExceptionEval506[] {
  const sn = normalizeLabelText(sentence);
  const out: ExceptionEval506[] = [];
  for (const rule of loadAdExceptionsKr506()) {
    if (rule.target_id !== targetId) continue;
    if (!patternMatchesHit(rule, hit, sn)) continue;
    const condOk =
      hasAll(sn, rule.requires_all_in_sentence) &&
      hasAny(sn, rule.requires_any_in_sentence) &&
      hasNone(sn, rule.forbid_in_sentence);
    if (!condOk) continue;

    if (needsColorProduct(rule) && !isColorMakeupSelected(input)) {
      out.push({ rule, matched: true, pendingProductType: true });
      continue;
    }
    out.push({ rule, matched: true });
  }
  return out;
}

export const EXCEPTION_SOFT_LINE_506 = "예외에 해당할 수 있어요";
export const COLOR_EXCEPTION_HINT_506 = "색조 제품이면 예외에 해당할 수 있어요";
