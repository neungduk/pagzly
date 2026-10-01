/** 수치 강조용 숫자/단위 분리 — 단위는 숫자보다 작게 그린다. 라이브·export 공용 */

/** 단위 크기(숫자 대비 em) */
export const STAT_UNIT_EM = 0.5;

/** "32명" → { num: "32", unit: "명" }, "1,200mAh" → { num: "1,200", unit: "mAh" }. 숫자+짧은 단위(1~4자)가 아니면 null */
export function splitStatValue(value: string): { num: string; unit: string } | null {
  const m = value.trim().match(/^([+-]?\d[\d,]*(?:\.\d+)?)\s*([^\d\s][^\d]{0,3})$/);
  if (!m) return null;
  return { num: m[1], unit: m[2].trim() };
}

/** 값 전체가 퍼센트 하나일 때만(예: "95%", "약 95% 이상") 0~100 반환 — 제품명·성분명 속 "5%"는 제외 */
export function parseStandalonePercent(value: string): number | null {
  const m = value.trim().match(/^(?:약\s*)?(\d+(?:\.\d+)?)\s*%\s*(?:이상|이하|내외)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}
