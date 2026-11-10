/**
 * 508 — 타일 겹침 구간 중복 줄 제거.
 */
import type { OcrLine508, OcrTileResult508 } from "@/lib/label-check/ocr/provider";

function normLine(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * 같은 텍스트 + y 근접(기본 40px)이면 중복으로 보고 뒤쪽을 버린다.
 * 타일 간 y는 tileOffsetY[i]를 더해 전역 좌표로 비교.
 */
export function dedupeOverlappingLines508(
  tiles: OcrTileResult508[],
  tileOffsetY: number[],
  yNearPx = 40,
): OcrLine508[] {
  const out: OcrLine508[] = [];
  for (let t = 0; t < tiles.length; t++) {
    const tile = tiles[t]!;
    const off = tileOffsetY[t] ?? 0;
    for (const line of tile.lines) {
      const y = (line.y ?? 0) + off;
      const key = normLine(line.text);
      if (!key) continue;
      const dup = out.some((prev) => {
        const py = prev.y ?? 0;
        return normLine(prev.text) === key && Math.abs(py - y) <= yNearPx;
      });
      if (!dup) out.push({ ...line, y });
    }
  }
  return out;
}

export function averageConfidence508(lines: OcrLine508[]): number {
  if (!lines.length) return 0;
  let s = 0;
  for (const l of lines) s += l.confidence || 0;
  return s / lines.length;
}

export function joinLinesText508(lines: OcrLine508[]): string {
  return lines.map((l) => l.text.trim()).filter(Boolean).join("\n");
}
