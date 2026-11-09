/**
 * 494 — 미국 라벨 영어 텍스트 정규화.
 * 대소문자 무시, 줄바꿈 하이픈 합치기.
 */
export function normalizeUsLabelText(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\u0000/g, " ")
    .replace(/(\w)-\s*[\r\n]+\s*(\w)/g, "$1$2")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/[ \t\u00a0\u3000]+/g, " ")
    .replace(/\r\n/g, "\n")
    .toLowerCase()
    .trim();
}

/** 매칭용: 공백·구두 완화 */
export function compactUsLabelText(s: string): string {
  return normalizeUsLabelText(s).replace(/[^a-z0-9@.+%]/g, "");
}

export function includesUs(text: string, needle: string): boolean {
  if (!needle) return false;
  const n = normalizeUsLabelText(needle);
  if (!n) return false;
  return normalizeUsLabelText(text).includes(n);
}
