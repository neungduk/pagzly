/**
 * 510 — 예외가 적용될 수 없는 명백한 의약품·질병 효능 문구 → 고칠 것(possible).
 * review/data JSON은 수정하지 않고 코드에서만 승격·보충한다.
 */
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import { formatFoundSnippet } from "@/lib/label-check/format-found";
import { normalizeUsLabelText } from "@/lib/label-check/normalize-us";
import type { Finding } from "@/lib/label-check/types";

const DISEASE_KR_510 = ["아토피", "여드름", "건선", "습진", "무좀", "피부염"];

/** 문장/히트가 명백한 의약품 효능인지(예외 soft와 무관한 하드) */
export function isHardKrMedicalClaim510(text: string): boolean {
  const n = normalizeLabelText(text);
  if (!n) return false;
  if (/치료에효과|치료합니다|치료할|치료함/.test(n)) return true;
  if (/완치|치유/.test(n)) return true;
  if (/영구적으로/.test(n)) return true;
  if (/완전제거/.test(n)) return true;
  if (/피부재생|피부를?재생/.test(n)) return true;
  if (/재생시켜|재생효과|재생케어|재생크림/.test(n)) return true;
  for (const d of DISEASE_KR_510) {
    const dn = normalizeLabelText(d);
    if (!dn || !n.includes(dn)) continue;
    if (/치료|예방|완치|치유/.test(n)) return true;
  }
  return false;
}

const HARD_KR_GAP_PATTERNS_510: Array<{ re: RegExp; label: string; sample: string }> = [
  { re: /치료에\s*효과/g, label: "질병 진단·치료·예방 등 의학적 효능 표현", sample: "치료에 효과" },
  { re: /완치/g, label: "질병 진단·치료·예방 등 의학적 효능 표현", sample: "완치" },
  { re: /완전\s*제거(됨)?/g, label: "피부 관련 의학적 표현(튼살·디톡스·흉터·가려움·홍조 등)", sample: "완전 제거" },
  { re: /영구적으로/g, label: "피부 관련 의학적 표현(튼살·디톡스·흉터·가려움·홍조 등)", sample: "영구적으로" },
];

/**
 * JSON 패턴에 없어 누락된 하드 문구를 보충(이미 유사 finding이 있으면 생략).
 */
export function scanHardKrMedicalGaps510(text: string, existing: Finding[]): Finding[] {
  const out: Finding[] = [];
  const blob = existing.map((f) => normalizeLabelText(`${f.found} ${f.label}`)).join("|");
  for (const p of HARD_KR_GAP_PATTERNS_510) {
    p.re.lastIndex = 0;
    const m = text.match(p.re);
    if (!m?.[0]) continue;
    const hit = m[0];
    const nh = normalizeLabelText(hit);
    if (blob.includes(nh)) continue;
    if (existing.some((f) => normalizeLabelText(f.found || "").includes(nh))) continue;
    out.push({
      category: "광고·금지",
      label: p.label,
      status: "possible",
      found: formatFoundSnippet(text, hit),
      suggest: "치료·완치·완전 제거 등 의약품 효능을 암시하는 표현은 삭제하세요.",
      checkType: "code",
      fixSuggestion: "치료·완치·완전 제거 등 의약품 효능을 암시하는 표현은 삭제하세요.",
      fixKind: "soften",
      checkKey: "HARD-KR-510",
    });
  }
  return out;
}

/** 일반 화장품 허용·기능성 심사 표현 — 하드 승격 금지(회귀용) */
export function isSoftCosmeticClaim510(text: string): boolean {
  const n = normalizeLabelText(text);
  if (/보습|윤기|피부결개선|피부\s*결\s*개선/.test(n) && !isHardKrMedicalClaim510(n)) {
    return true;
  }
  if (/주름개선|주름\s*개선/.test(n) && !/치료|완치|완전제거|영구/.test(n)) return true;
  return false;
}

export function isHardUsMedicalClaim510(text: string): boolean {
  const n = normalizeUsLabelText(text);
  if (!n) return false;
  if (/\bcures?\b/.test(n)) return true;
  if (/\bheals?\b/.test(n)) return true;
  if (/\btreatment of\b/.test(n)) return true;
  if (/\btreats?\b/.test(n) && /\b(acne|disease|eczema|psoriasis|rosacea|dermatitis)\b/.test(n)) {
    return true;
  }
  if (/clinically\s+proven\s+to\s+cure/.test(n)) return true;
  if (/\bfda\s+approved\b/.test(n)) return true;
  // permanently — 포장 sealed 제외
  if (/\bpermanently\b/.test(n) && !/\bpermanently\s+(sealed|closed|attached|affixed)\b/.test(n)) {
    return true;
  }
  return false;
}

export function scanHardUsMedicalGaps510(text: string, existing: Finding[]): Finding[] {
  const n = normalizeUsLabelText(text);
  const out: Finding[] = [];
  const has = (re: RegExp) => existing.some((f) => re.test(normalizeUsLabelText(f.found || "")));

  if (/\bfda\s+approved\b/.test(n) && !has(/\bfda\s+approved\b/)) {
    const hit = text.match(/FDA\s+approved/i)?.[0] || "FDA approved";
    out.push({
      category: "disease",
      label: "의약품 오인 우려 표현(FDA approved)",
      status: "possible",
      found: formatFoundSnippet(text, hit),
      suggest: "화장품에는 FDA approved 표기를 쓰지 마세요. 해당 표현은 삭제하세요.",
      checkType: "code",
      fixSuggestion: "화장품에는 FDA approved 표기를 쓰지 마세요. 해당 표현은 삭제하세요.",
      fixKind: "soften",
      checkKey: "HARD-US-510-FDA",
    });
  }

  if (
    /\bpermanently\b/.test(n) &&
    !/\bpermanently\s+(sealed|closed|attached|affixed)\b/.test(n) &&
    !existing.some((f) => /permanent/i.test(f.found || ""))
  ) {
    const hit = text.match(/permanently\w*/i)?.[0] || "permanently";
    out.push({
      category: "cosmetic_concern_drug",
      label: "주름·색소 예방·교정 주장",
      status: "possible",
      found: formatFoundSnippet(text, hit),
      suggest: "영구·permanent 효능 표현은 완화하세요.",
      checkType: "code",
      fixSuggestion: "영구·permanent 효능 표현은 완화하세요.",
      fixKind: "soften",
      checkKey: "HARD-US-510-PERM",
    });
  }

  return out;
}
