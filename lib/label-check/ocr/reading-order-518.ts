/**
 * 518 — 타일 안 읽기 순서: 같은 줄(y 겹침 50%+) → x 오름차순.
 * 줄 사이 x 간격이 타일 폭 12% 이상이면 다른 덩어리(2단)로 분리.
 * 회전(세로) 글자는 범위 밖.
 */
import type { OcrLine508, OcrWord508 } from "@/lib/label-check/ocr/provider";

export type WordBox518 = {
  text: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type OrderedLine518 = {
  text: string;
  confidence: number;
  words: WordBox518[];
  y: number;
  /** 덩어리(단) 인덱스 — 왼쪽부터 */
  column: number;
};

function overlapRatioY(a: WordBox518, b: WordBox518): number {
  const a1 = a.y;
  const a2 = a.y + Math.max(1, a.h);
  const b1 = b.y;
  const b2 = b.y + Math.max(1, b.h);
  const inter = Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
  const shorter = Math.min(a2 - a1, b2 - b1);
  return shorter > 0 ? inter / shorter : 0;
}

/** 같은 줄 후보로 묶기(첫 단어 기준 y 겹침 50%) */
function clusterLines(words: WordBox518[]): WordBox518[][] {
  const sorted = [...words].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: WordBox518[][] = [];
  for (const w of sorted) {
    let placed = false;
    for (const line of lines) {
      const seed = line[0]!;
      if (overlapRatioY(seed, w) >= 0.5) {
        line.push(w);
        placed = true;
        break;
      }
    }
    if (!placed) lines.push([w]);
  }
  return lines;
}

/**
 * 한 타일 단어를 줄·단으로 정렬.
 * 같은 줄에서 인접 단어 x 간격이 tileWidth*0.12 이상이면 새 덩어리.
 */
export function orderWordsToLines518(
  words: WordBox518[],
  tileWidth: number,
): OrderedLine518[] {
  if (!words.length) return [];
  const gapMin = Math.max(8, tileWidth * 0.12);
  const rawLines = clusterLines(words);
  const out: OrderedLine518[] = [];

  for (const lineWords of rawLines) {
    const byX = [...lineWords].sort((a, b) => a.x - b.x);
    let col = 0;
    let chunk: WordBox518[] = [];
    let prevRight = -Infinity;

    const flush = () => {
      if (!chunk.length) return;
      const text = chunk.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
      const conf = chunk.reduce((s, w) => s + w.confidence, 0) / chunk.length;
      out.push({
        text,
        confidence: conf,
        words: chunk,
        y: chunk[0]!.y,
        column: col,
      });
      chunk = [];
    };

    for (const w of byX) {
      if (chunk.length && w.x - prevRight >= gapMin) {
        flush();
        col += 1;
      }
      chunk.push(w);
      prevRight = w.x + Math.max(1, w.w);
    }
    flush();
  }

  // 단(column) 우선 → 같은 단 안 y
  out.sort((a, b) => a.column - b.column || a.y - b.y);
  return out;
}

/** 비정상 글자 비율: 특수문자·낱자 과다 */
export function isAbnormalCharRatio518(text: string): boolean {
  const t = text.replace(/\s+/g, "");
  if (t.length < 20) return false;
  const hangul = (t.match(/[\uAC00-\uD7A3]/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  const special = (t.match(/[^\uAC00-\uD7A3A-Za-z0-9]/g) || []).length;
  const ratio = (hangul + latin) / t.length;
  if (ratio < 0.35) return true;
  if (special / t.length > 0.45) return true;
  return false;
}

/** 쇼핑몰 상세페이지 UI 단서 */
const DETAIL_UI_HINTS_518 = [
  "장바구니",
  "리뷰",
  "배송",
  "결제",
  "구매하기",
  "찜하기",
  "쿠폰",
  "옵션 선택",
  "판매가",
  "할인가",
];

export function looksLikeDetailPage518(text: string): boolean {
  let hits = 0;
  for (const h of DETAIL_UI_HINTS_518) {
    if (text.includes(h)) hits += 1;
  }
  return hits >= 2;
}

export function formatOcrQualityLabel518(avg: number): string {
  if (avg >= 0.85) return `읽기 품질: 좋음(평균 ${avg.toFixed(2)})`;
  if (avg >= 0.7) return `읽기 품질: 보통(평균 ${avg.toFixed(2)})`;
  if (avg >= 0.5) return `읽기 품질: 낮음(평균 ${avg.toFixed(2)})`;
  return `읽기 품질: 매우 낮음(평균 ${avg.toFixed(2)})`;
}

export function word508ToBox518(w: OcrWord508): WordBox518 | null {
  if (typeof w.x !== "number" || typeof w.y !== "number") return null;
  return {
    text: w.text,
    confidence: w.confidence,
    x: w.x,
    y: w.y,
    w: w.w ?? Math.max(1, w.boxHeightPx || 1),
    h: Math.max(1, w.boxHeightPx || 12),
  };
}

/** OcrWord508 → 읽기 순서 줄(OcrLine508) */
export function reorderTileLinesFromWords518(
  words: OcrWord508[],
  tileWidth: number,
): OcrLine508[] {
  const boxes = words
    .map(word508ToBox518)
    .filter((b): b is WordBox518 => Boolean(b));
  if (!boxes.length) {
    return words.length
      ? [
          {
            text: words.map((w) => w.text).join(" "),
            confidence:
              words.reduce((s, w) => s + w.confidence, 0) / Math.max(1, words.length),
            words,
          },
        ]
      : [];
  }
  const ordered = orderWordsToLines518(boxes, tileWidth);
  return ordered.map((ol) => ({
    text: ol.text,
    confidence: ol.confidence,
    words: ol.words.map((b) => ({
      text: b.text,
      confidence: b.confidence,
      boxHeightPx: b.h,
      x: b.x,
      w: b.w,
      y: b.y,
    })),
    y: ol.y,
  }));
}
