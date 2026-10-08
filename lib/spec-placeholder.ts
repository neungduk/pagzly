// spec_table 값이 근거 없음을 나타내는 안내 문구인지 판단 — 라이브·export 모두 흐린 색으로 표시
const PLACEHOLDER_VALUE_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "판매자 정책을 확인",
  "확인 필요",
];

export function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_VALUE_PATTERNS.some((pattern) => trimmed.includes(pattern));
}

/** "판매자에게 문의해주세요." 처럼 안내 문구만 있는 짧은 FAQ 답변 — 긴 답변 속 안내 문장은 해당 안 됨 */
export function isPlaceholderAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  return trimmed.length <= 30 && isPlaceholderValue(trimmed);
}

/**
 * 안내 문구 행이 2개 이상이면 표에서 빼고 라벨만 한 줄("확인 필요 항목")로 모은다.
 * 행을 숨기지 않고 라벨을 남겨 판매자가 채울 항목을 계속 볼 수 있게 한다.
 */
export function groupPendingSpecRows<T extends { label: string; value: string }>(
  rows: T[],
): { shown: T[]; pendingLabels: string[] } {
  const pending = rows.filter((row) => isPlaceholderValue(row.value));
  if (pending.length < 2 || pending.length === rows.length) {
    return { shown: rows, pendingLabels: [] };
  }
  return {
    shown: rows.filter((row) => !isPlaceholderValue(row.value)),
    pendingLabels: pending.map((row) => row.label.trim()),
  };
}

export const PENDING_SPEC_ROW_LABEL = "확인 필요 항목";

/** "배송기간"/"배송 기간"처럼 띄어쓰기·가운뎃점만 다른 라벨은 한 행 — 값 있는 쪽을 첫 자리에 남긴다 */
export function dedupeSpecRows<T extends { label: string; value: string }>(rows: T[]): T[] {
  const out: T[] = [];
  const at = new Map<string, number>();
  for (const row of rows) {
    const key = row.label.toLowerCase().replace(/[\s·・/,]/g, "");
    const i = at.get(key);
    if (i == null) {
      at.set(key, out.length);
      out.push(row);
    } else if (isPlaceholderValue(out[i]!.value) && !isPlaceholderValue(row.value)) {
      out[i] = row;
    }
  }
  return out;
}

/** 주의사항 본문을 문장 단위 항목으로. 2문장 미만이면 null(문단 그대로). */
export function splitNoticeSentences(body: string): string[] | null {
  const items = body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length >= 2 && items.length <= 8 ? items : null;
}

/** 용량 안내 섹션인데 숫자(용량·옵션 수치)가 하나도 없으면 정보 없는 안내 문구뿐 */
export function isEmptySizeOptions(section: { slot?: string; heading?: string; body?: string }): boolean {
  if (section.slot !== "size_options") return false;
  return !/\d/.test(`${section.heading ?? ""} ${section.body ?? ""}`);
}

/** 333차 — 값이 모두 짧은 스펙은 넓은 화면에서 2열 키:값 그리드로(라이브·export 같은 조건). */
export function isCompactSpecGrid(rows: { value: string }[], pendingCount: number): boolean {
  if (pendingCount > 0 || rows.length < 4 || rows.length > 10 || rows.length % 2 !== 0) return false;
  return rows.every((row) => {
    const v = row.value.trim();
    return v.length > 0 && v.length <= 14 && !isPlaceholderValue(v) && !/\d\s*%/.test(v);
  });
}
