/**
 * 291차 — 본문 안 핵심 구절 굵게(라이브·export 공용).
 * 1순위: 생성 카피의 emphasis — 본문에 글자 그대로 있을 때만(새 주장 추가 불가).
 * 2순위: 본문 속 "수치+단위" 구절(앞 단어 1개 포함). 둘 다 없으면 강조 없음.
 */

const EMPHASIS_MIN = 2;
const EMPHASIS_MAX = 28;

const NUMERIC_PHRASE =
  /(?:[가-힣A-Za-z]+\s)?\d+(?:[.,]\d+)?\s?(?:%|㎖|ml|mL|ML|kg|mg|g|L|시간|분|초|개월|일|년|개|가지|회|매|cm|mm|도|℃|단계|배|병|포|정|캡슐)/;

export type BodyEmphasisSplit = { before: string; strong: string; after: string };

/** 강조 구절 아래 40%만 포인트색으로 칠하는 형광펜 밑줄 (라이브·export 동일 값) */
export function emphasisMarkerGradient(accentHex: string): string {
  const hex = accentHex.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `linear-gradient(transparent 60%, rgba(${r}, ${g}, ${b}, 0.22) 60%)`;
}

export function splitBodyEmphasis(
  body: string | null | undefined,
  emphasis?: string | null,
): BodyEmphasisSplit | null {
  const text = body ?? "";
  if (!text.trim()) return null;
  const phrase = (emphasis ?? "").trim();
  if (phrase.length >= EMPHASIS_MIN && phrase.length <= EMPHASIS_MAX) {
    const at = text.indexOf(phrase);
    if (at >= 0) {
      return { before: text.slice(0, at), strong: phrase, after: text.slice(at + phrase.length) };
    }
  }
  const m = NUMERIC_PHRASE.exec(text);
  if (!m || m.index == null) return null;
  let start = m.index;
  let strong = m[0];
  // "켜고 8시간"·"물에 3분"처럼 앞 단어가 어미·조사로 끝나면 수치만 강조
  const lead = strong.match(/^([가-힣A-Za-z]+)\s/);
  if (lead && /[고며서면게는은을를에로와과도의]$/.test(lead[1]!)) {
    start += lead[0].length;
    strong = strong.slice(lead[0].length);
  }
  return {
    before: text.slice(0, start),
    strong,
    after: text.slice(start + strong.length),
  };
}
