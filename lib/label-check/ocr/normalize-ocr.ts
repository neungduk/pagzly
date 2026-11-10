/**
 * 508 — OCR 전처리(순수). 용량·단위·숫자 혼동 보정.
 */

export type NetContentHit508 = {
  value: number;
  unit: string;
  raw: string;
};

export type OcrNormalizeResult508 = {
  text: string;
  /** 보정 표시용: "100 ml ← 1OO ml" */
  corrections: string[];
  netContents: NetContentHit508[];
  /** 서로 다른 용량이 2개 이상이면 true */
  netContentConflict: boolean;
};

const FULLWIDTH =
  /[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF0C\uFF0E\uFF0F\uFF1A\u3000]/g;

function toHalfWidth(s: string): string {
  return s.replace(FULLWIDTH, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0xff10 && code <= 0xff19) return String.fromCharCode(code - 0xff10 + 0x30);
    if (code >= 0xff21 && code <= 0xff3a) return String.fromCharCode(code - 0xff21 + 0x41);
    if (code >= 0xff41 && code <= 0xff5a) return String.fromCharCode(code - 0xff41 + 0x61);
    if (ch === "\u3000") return " ";
    if (ch === "\uff0c") return ",";
    if (ch === "\uff0e") return ".";
    if (ch === "\uff0f") return "/";
    if (ch === "\uff1a") return ":";
    return ch;
  });
}

function normalizeUnits(s: string, corrections: string[]): string {
  const pairs: Array<[RegExp, string]> = [
    [/㎖/g, "ml"],
    [/\bmL\b/g, "ml"],
    [/\bML\b/g, "ml"],
    [/ｍｌ/g, "ml"],
    [/\bm\s+l\b/gi, "ml"],
    [/㎏/g, "kg"],
    [/\bKg\b/g, "kg"],
    [/\bKG\b/g, "kg"],
    [/ℓ/g, "l"],
    [/(?<=\d)\s*L\b/g, "l"],
    [/ｇ/g, "g"],
    [/(?<=\d)\s*G\b/g, "g"],
    [/\bfl\.?\s*oz\.?\b/gi, "fl oz"],
    [/\bFL\s*OZ\b/g, "fl oz"],
    [/\boz\.\b/gi, "oz"],
  ];
  let out = s;
  for (const [re, to] of pairs) {
    out = out.replace(re, (m) => {
      if (m !== to) corrections.push(`${to} ← ${m}`);
      return to;
    });
  }
  return out;
}

/** 숫자·단위와 붙어 있을 때만 O→0, l/I→1 */
function fixDigitConfusions(s: string, corrections: string[]): string {
  let out = s;
  // 1OO ml / 10Oml / O5g — 숫자가 최소 1개 있고, 앞이 영문자가 아닌 "숫자+O 덩어리"만 보정.
  // (영문 단어 Glycol·Linalool·Alcohol 의 "ol"을 "0l"로 바꾸지 않는다.)
  out = out.replace(
    /(?<![A-Za-z])(?=[\dOo]*\d)([\dOo]+)(\s*(?:ml|mg|kg|g|l|oz|fl oz)\b)/gi,
    (m, num, u) => {
      const fixedNum = String(num).replace(/[Oo]/g, "0");
      const fixed = `${fixedNum}${u}`;
      if (fixed !== m) corrections.push(`${fixed.trim()} ← ${m.trim()}`);
      return fixed;
    },
  );
  out = out.replace(/(\d+)[O](?=\d)/g, (m, a) => {
    const fixed = `${a}0`;
    corrections.push(`${fixed} ← ${m}`);
    return fixed;
  });
  // 1l ml already odd; 숫자 옆 l/I → 1 (예: 1l00 → 조심, 여기선 단위 앞만)
  out = out.replace(/(\d)[lI](?=\d)/g, (m, d) => {
    const fixed = `${d}1`;
    corrections.push(`${fixed} ← ${m}`);
    return fixed;
  });
  out = out.replace(/(\d)[lI](\s*(?:ml|mg|kg|g|l|oz|fl oz)\b)/gi, (m, d, u) => {
    const fixed = `${d}1${u}`;
    corrections.push(`${fixed.trim()} ← ${m.trim()}`);
    return fixed;
  });
  return out;
}

/** 줄바꿈으로 갈라진 숫자 + 단위 재결합 */
function rejoinBrokenUnits(s: string): string {
  return s.replace(/(\d+(?:\.\d+)?)\s*\n\s*(ml|mg|kg|g|l|oz|fl oz)\b/gi, "$1 $2");
}

export function extractNetContent508(text: string): NetContentHit508[] {
  const hits: NetContentHit508[] = [];
  const re =
    /(?:내용량|용량|중량|net\s*wt\.?|net\s*contents?)?[^\n\d]{0,12}(\d+(?:\.\d+)?)\s*(fl oz|ml|mg|kg|g|l|oz)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    hits.push({
      value: Number(m[1]),
      unit: (m[2] || "").toLowerCase(),
      raw: m[0].trim(),
    });
  }
  return hits;
}

/** 단위를 같은 종류의 기본 단위로 환산(부피→ml, 질량→g). oz 단독은 질량으로 본다. */
function toBase510(h: NetContentHit508): { dim: "vol" | "mass"; v: number } | null {
  const v = h.value;
  switch (h.unit) {
    case "ml": return { dim: "vol", v };
    case "l": return { dim: "vol", v: v * 1000 };
    case "fl oz": return { dim: "vol", v: v * 29.5735 };
    case "g": return { dim: "mass", v };
    case "kg": return { dim: "mass", v: v * 1000 };
    case "mg": return { dim: "mass", v: v / 1000 };
    case "oz": return { dim: "mass", v: v * 28.3495 };
    default: return null;
  }
}

/** 같은 종류(부피/질량) 안에서 환산값이 5% 넘게 다르면 충돌. 3.38 fl oz ≈ 100 ml 은 충돌 아님. */
export function hasNetContentConflict510(hits: NetContentHit508[]): boolean {
  for (const dim of ["vol", "mass"] as const) {
    const vals = hits
      .map(toBase510)
      .filter((b): b is { dim: "vol" | "mass"; v: number } => !!b && b.dim === dim && b.v > 0)
      .map((b) => b.v);
    if (vals.length < 2) continue;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max / min > 1.05) return true;
  }
  return false;
}

export function normalizeOcrText508(raw: string): OcrNormalizeResult508 {
  const corrections: string[] = [];
  let text = toHalfWidth(raw || "");
  text = rejoinBrokenUnits(text);
  text = normalizeUnits(text, corrections);
  text = fixDigitConfusions(text, corrections);
  const netContents = extractNetContent508(text);
  const netContentConflict = hasNetContentConflict510(netContents);
  return {
    text,
    corrections: [...new Set(corrections)].slice(0, 20),
    netContents,
    netContentConflict,
  };
}

export const NET_CONTENT_CONFLICT_LABEL_508 = "용량이 서로 다르게 읽혔어요";
export const NET_CONTENT_CONFLICT_SUGGEST_508 =
  "사진에서 읽은 용량 숫자가 서로 달라요. 원본과 숫자를 확인해 주세요.";
