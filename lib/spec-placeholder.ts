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
