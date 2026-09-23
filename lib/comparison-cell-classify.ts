/** comparison_table 셀 값이 "있음/없음"류 불린성 텍스트인지 판정.
 * DetailSectionRenderer.tsx(라이브)·export-detail-html.ts(export) 공용 — 242차 추출. */
export function classifyBoolishCell(value: string): "yes" | "no" | null {
  const t = value.trim().toLowerCase();
  if (!t) return null;
  if (
    /^(o|ㅇ|예|있음|지원|가능|포함|✓|✔|yes|true|y)$/i.test(t) ||
    t === "○" ||
    t === "●"
  ) {
    return "yes";
  }
  if (
    /^(x|ㄴ|아니오|없음|미지원|불가|미포함|✗|✘|no|false|n)$/i.test(t) ||
    t === "×" ||
    t === "✕"
  ) {
    return "no";
  }
  return null;
}
