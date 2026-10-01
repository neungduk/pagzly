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
