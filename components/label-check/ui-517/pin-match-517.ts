/**
 * 517 — 읽은 라벨 텍스트에서 finding 문구 위치 찾기.
 * 공백·줄바꿈 정규화 후 첫 일치만. 추측 위치 금지.
 */

export type PinMatch517 = {
  /** 원문에서의 시작 인덱스(원문 기준) */
  start: number;
  end: number;
  needle: string;
};

/** 공백·줄바꿈을 단일 스페이스로 */
export function normalizeWs517(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * 정규화 문자열 인덱스를 원문 인덱스로 매핑하기 위한 테이블.
 * norm[i] ← raw 쪽 대응 시작 위치
 */
function buildNormMap(raw: string): { norm: string; map: number[] } {
  const map: number[] = [];
  let norm = "";
  let i = 0;
  const n = raw.length;
  while (i < n) {
    if (/\s/.test(raw[i]!)) {
      while (i < n && /\s/.test(raw[i]!)) i += 1;
      if (norm.length > 0 && norm[norm.length - 1] !== " ") {
        map.push(i);
        norm += " ";
      }
      continue;
    }
    map.push(i);
    norm += raw[i];
    i += 1;
  }
  return { norm: norm.trimEnd(), map };
}

/**
 * source에서 needle의 첫 일치(정규화 기준). 없으면 null.
 */
export function findFirstPin517(source: string, needle: string): PinMatch517 | null {
  const n = (needle || "").trim();
  if (!source || !n) return null;
  const { norm, map } = buildNormMap(source);
  const want = normalizeWs517(n);
  if (!want) return null;
  const idx = norm.indexOf(want);
  if (idx < 0) return null;
  const start = map[idx];
  const endIdx = idx + want.length - 1;
  const endRaw = map[endIdx];
  if (start == null || endRaw == null) return null;
  return { start, end: endRaw + 1, needle: n };
}

export type PinSpec517 = {
  id: string;
  no: number;
  needle: string;
  color: string;
};

export type PinHit517 = PinSpec517 & PinMatch517;

/** 여러 핀 — 각각 첫 일치, 겹치면 먼저 등록된 것 우선(그대로 두고 표시는 렌더러 책임) */
export function collectPins517(
  source: string,
  specs: PinSpec517[],
): PinHit517[] {
  const out: PinHit517[] = [];
  for (const s of specs) {
    const m = findFirstPin517(source, s.needle);
    if (m) out.push({ ...s, ...m });
  }
  return out.sort((a, b) => a.start - b.start);
}
