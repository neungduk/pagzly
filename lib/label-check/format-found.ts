/**
 * 488 — "찾은 내용" 표시용(판정 로직과 분리). 조각 ≤60자, 경계 절단.
 */
import { normalizeLabelText, softNormalize } from "@/lib/label-check/extract-pdf";

export const FOUND_CONFIRMED_488 = "표기 확인됨";
export const FOUND_SNIPPET_MAX_488 = 60;

const LABEL_RE =
  /(내용량|전성분|제조국|제조번호|사용기한|화장품책임판매업자|책임판매업자|제조업자|사용할\s*때의\s*주의사항|주의사항)/g;

/** 붙은 라벨·라틴/한글 경계를 읽기 쉽게 띄움 */
export function loosenLabelGaps(s: string): string {
  let t = softNormalize(s);
  t = t.replace(/([A-Za-z0-9])([가-힣])/g, "$1 $2");
  t = t.replace(/([가-힣])([A-Za-z])/g, "$1 $2");
  t = t.replace(LABEL_RE, (m, _g: string, offset: number, whole: string) => {
    if (offset <= 0) return m;
    const prev = whole[offset - 1];
    if (/\s|·|,|\/|:/.test(prev)) return m;
    return ` · ${m}`;
  });
  return t.replace(/\s+/g, " ").replace(/\s*·\s*/g, " · ").trim();
}

function findHitIndex(text: string, hit: string): number {
  let i = text.indexOf(hit);
  if (i >= 0) return i;
  const compactHit = normalizeLabelText(hit);
  if (!compactHit) return -1;
  const chars = [...text];
  let built = "";
  let start = -1;
  for (let k = 0; k < chars.length; k++) {
    const ch = chars[k];
    if (/\s/.test(ch)) continue;
    const n = normalizeLabelText(ch);
    if (!n) continue;
    if (start < 0) start = k;
    built += n;
    if (built.includes(compactHit)) return start;
    if (built.length > compactHit.length + 4) {
      built = built.slice(-compactHit.length);
      start = k - built.length + 1;
    }
  }
  return -1;
}

function isBoundary(ch: string | undefined): boolean {
  if (!ch) return true;
  return /[\s·・,./|;:]/.test(ch);
}

/** 최대 길이로 자르되 공백/구분자 경계 우선, 잘린 쪽에 … */
export function clipAtBoundaries(s: string, maxLen: number, trimLeft: boolean, trimRight: boolean): string {
  if (s.length <= maxLen) {
    return `${trimLeft ? "…" : ""}${s}${trimRight ? "…" : ""}`;
  }
  let start = 0;
  let end = s.length;
  if (trimLeft && trimRight) {
    // 중앙 유지: 뒤에서 maxLen 창
    start = Math.max(0, Math.floor((s.length - maxLen) / 2));
    end = start + maxLen;
  } else if (trimLeft) {
    start = s.length - maxLen;
    end = s.length;
  } else {
    start = 0;
    end = maxLen;
  }
  while (start > 0 && start < end && !isBoundary(s[start - 1]) && !isBoundary(s[start])) {
    start += 1;
  }
  while (end < s.length && end > start && !isBoundary(s[end]) && !isBoundary(s[end - 1])) {
    end -= 1;
  }
  if (end - start < Math.min(12, maxLen)) {
    // 경계를 못 찾으면 하드 컷
    if (trimLeft && !trimRight) {
      start = s.length - maxLen;
      end = s.length;
    } else if (!trimLeft && trimRight) {
      start = 0;
      end = maxLen;
    } else {
      start = Math.max(0, Math.floor((s.length - maxLen) / 2));
      end = start + maxLen;
    }
  }
  const piece = s.slice(start, end).trim();
  return `${start > 0 || trimLeft ? "…" : ""}${piece}${end < s.length || trimRight ? "…" : ""}`;
}

/**
 * 매칭 키워드 중심 조각. 판정에 쓰지 않고 표시만.
 */
export function formatFoundSnippet(raw: string, hit: string, maxLen = FOUND_SNIPPET_MAX_488): string {
  if (!raw) return FOUND_CONFIRMED_488;
  const i = findHitIndex(raw, hit);
  const radius = 90;
  const from = i < 0 ? 0 : Math.max(0, i - radius);
  const to = i < 0 ? raw.length : Math.min(raw.length, i + Math.max(hit.length, 2) + radius);
  let chunk = loosenLabelGaps(raw.slice(from, to));
  if (!chunk) chunk = loosenLabelGaps(hit) || hit;

  const hitInChunk = findHitIndex(chunk, hit);
  const leftCut = from > 0;
  const rightCut = to < raw.length;

  if (chunk.length <= maxLen) {
    return `${leftCut ? "…" : ""}${chunk}${rightCut ? "…" : ""}`;
  }

  if (hitInChunk < 0) {
    return clipAtBoundaries(chunk, maxLen, leftCut, rightCut);
  }

  // 히트 중심으로 maxLen 창
  const half = Math.floor(maxLen / 2);
  let a = Math.max(0, hitInChunk - half);
  let b = Math.min(chunk.length, a + maxLen);
  a = Math.max(0, b - maxLen);
  while (a > 0 && !isBoundary(chunk[a - 1]) && !isBoundary(chunk[a])) a += 1;
  while (b < chunk.length && !isBoundary(chunk[b]) && !isBoundary(chunk[b - 1])) b -= 1;
  if (b - a < 12) {
    a = Math.max(0, hitInChunk - half);
    b = Math.min(chunk.length, a + maxLen);
  }
  const piece = chunk.slice(a, b).trim();
  return `${a > 0 || leftCut ? "…" : ""}${piece}${b < chunk.length || rightCut ? "…" : ""}`;
}
