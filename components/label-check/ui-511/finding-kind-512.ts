import type { Finding } from "@/lib/label-check/types";

export type FindingKind512 = "missing" | "wording" | "measure" | "other";

const MISSING_MARKERS = ["찾지 못", "없음", "부족", "구분할 수 없", "읽지 못"] as const;

function hasMissingMarker(found: string): boolean {
  return MISSING_MARKERS.some((m) => found.includes(m));
}

function looksLikeMeasure(found: string): boolean {
  if (/pt/i.test(found) || found.includes("크기")) return true;
  // 숫자 나열: "4, 5" / "3, 6.75, 8.25"
  if (/\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?){1,}/.test(found)) return true;
  return false;
}

function isAdKey(checkKey?: string): boolean {
  if (!checkKey) return false;
  return checkKey.startsWith("MFDS-") || checkKey.startsWith("USAD-");
}

/**
 * 512 — 결과 카드 표시 종류. lib 판정 로직은 건드리지 않고 문자열·evidence만 본다.
 */
export function classifyFinding512(f: Finding): FindingKind512 {
  const found = (f.found || "").trim();
  const hasEvidence = Boolean(f.evidence?.length);

  if (hasMissingMarker(found) && !hasEvidence) {
    return "missing";
  }
  if (hasEvidence || (isAdKey(f.checkKey) && found.length > 0 && !hasMissingMarker(found))) {
    return "wording";
  }
  if (found && looksLikeMeasure(found)) {
    return "measure";
  }
  return "other";
}

/** 측정 문구에서 기준(예: 5pt) 추출. 없으면 null */
export function extractMeasureBaseline512(found: string): string | null {
  const m = found.match(/(\d+(?:\.\d+)?\s*pt)/i);
  return m ? m[1]!.replace(/\s+/g, "") : null;
}

export function collectFixExamples512(f: Finding): string[] {
  const out: string[] = [];
  for (const t of f.fix?.templates || []) {
    if (t.trim()) out.push(t.trim());
  }
  for (const a of f.fix?.alternatives || []) {
    if (a.text?.trim()) out.push(a.text.trim());
  }
  return out;
}

/** 하나 마나 한 기본 안내 — UI에 쓰지 않음 */
export function isVagueSuggest512(text: string | undefined | null): boolean {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (t === "해당 항목을 확인하세요." || t === "해당 항목을 확인해 주세요.") return true;
  if (t.includes("해당 항목을 확인")) return true;
  return false;
}
