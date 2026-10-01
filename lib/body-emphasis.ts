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
  return {
    before: text.slice(0, m.index),
    strong: m[0],
    after: text.slice(m.index + m[0].length),
  };
}
